create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_role') then
    create type public.account_role as enum ('master', 'standard');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.account_role not null default 'standard',
  credits integer,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.account_exclusions (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  machine_name text not null,
  scan_timestamp timestamptz not null,
  summary jsonb not null,
  report_type text not null default 'json',
  file_path text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_master(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and role = 'master'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_count integer;
  created_by_master boolean;
  initial_credits integer;
begin
  select count(*) into profile_count from public.profiles;
  created_by_master := coalesce((new.raw_app_meta_data ->> 'created_by_master')::boolean, false);
  initial_credits := greatest(coalesce((new.raw_app_meta_data ->> 'initial_credits')::integer, 0), 0);

  if profile_count > 0 and not created_by_master then
    raise exception 'Only the first account can self-register. Sign in as master to create more accounts.';
  end if;

  insert into public.profiles (id, email, role, credits, created_at)
  values (
    new.id,
    coalesce(new.email, ''),
    case when profile_count = 0 then 'master'::public.account_role else 'standard'::public.account_role end,
    case when profile_count = 0 then null else initial_credits end,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.consume_scan_credit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_credits integer;
  remaining_credits integer;
begin
  select credits into current_credits
  from public.profiles
  where id = auth.uid();

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Create or sign in to an account before scanning.');
  end if;

  if current_credits is null then
    return jsonb_build_object('ok', true, 'credits', null);
  end if;

  if current_credits <= 0 then
    return jsonb_build_object('ok', false, 'message', 'This account has no scan credits remaining.');
  end if;

  update public.profiles
  set credits = credits - 1
  where id = auth.uid() and credits > 0
  returning credits into remaining_credits;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'This account has no scan credits remaining.');
  end if;

  return jsonb_build_object('ok', true, 'credits', remaining_credits);
end;
$$;

grant execute on function public.consume_scan_credit() to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.account_exclusions enable row level security;
alter table public.scan_reports enable row level security;

drop policy if exists "profiles_select_self_or_master" on public.profiles;
create policy "profiles_select_self_or_master"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_master(auth.uid()));

drop policy if exists "profiles_master_update" on public.profiles;
create policy "profiles_master_update"
on public.profiles for update
to authenticated
using (public.is_master(auth.uid()))
with check (public.is_master(auth.uid()));

drop policy if exists "exclusions_select_authenticated" on public.account_exclusions;
create policy "exclusions_select_authenticated"
on public.account_exclusions for select
to authenticated
using (true);

drop policy if exists "exclusions_master_insert" on public.account_exclusions;
create policy "exclusions_master_insert"
on public.account_exclusions for insert
to authenticated
with check (public.is_master(auth.uid()) and created_by = auth.uid());

drop policy if exists "exclusions_master_delete" on public.account_exclusions;
create policy "exclusions_master_delete"
on public.account_exclusions for delete
to authenticated
using (public.is_master(auth.uid()));

drop policy if exists "reports_select_owner_or_master" on public.scan_reports;
create policy "reports_select_owner_or_master"
on public.scan_reports for select
to authenticated
using (owner_id = auth.uid() or public.is_master(auth.uid()));

drop policy if exists "reports_insert_owner" on public.scan_reports;
create policy "reports_insert_owner"
on public.scan_reports for insert
to authenticated
with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('scan-reports', 'scan-reports', false)
on conflict (id) do nothing;

drop policy if exists "scan_reports_storage_select" on storage.objects;
create policy "scan_reports_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'scan-reports'
  and (
    owner = auth.uid()
    or public.is_master(auth.uid())
  )
);

drop policy if exists "scan_reports_storage_insert" on storage.objects;
create policy "scan_reports_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'scan-reports'
  and owner = auth.uid()
);
