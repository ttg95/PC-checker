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

create table if not exists public.master_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint master_emails_lowercase check (email = lower(email))
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
  display_name text not null default 'Untitled scan',
  machine_name text not null,
  scan_timestamp timestamptz not null,
  summary jsonb not null,
  report_type text not null default 'json',
  file_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'confirmed_clean', 'confirmed_cheating')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  stripe_event_id text primary key,
  stripe_session_id text not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_count integer not null check (token_count > 0),
  amount_total integer not null check (amount_total >= 0),
  currency text not null,
  created_at timestamptz not null default now()
);

alter table public.scan_reports
  add column if not exists display_name text not null default 'Untitled scan',
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null,
  add column if not exists hidden_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scan_reports_review_status_check'
      and conrelid = 'public.scan_reports'::regclass
  ) then
    alter table public.scan_reports
      add constraint scan_reports_review_status_check
      check (review_status in ('pending', 'confirmed_clean', 'confirmed_cheating'));
  end if;
end $$;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('theme', '{"theme":"cyan"}'::jsonb)
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values ('nav_order', '{"order":["dashboard","registry","events","apphistory","services","usb","dma","filesystem","systeminfo","tasks","processes","reports","accounts","master","admin"]}'::jsonb)
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values (
  'trigger_config',
  '{
    "rules": [
      {"id":"rule-unsigned-driver-recent","name":"Recently Installed Unsigned Driver","description":"Kernel driver installed within 7 days without valid digital signature","condition":"driver AND unsigned AND installedWithin(7)","riskLevel":"high","enabled":true,"weight":80},
      {"id":"rule-unsigned-service-recent","name":"Recently Installed Unsigned Service","description":"Service installed within 7 days without valid digital signature","condition":"service AND unsigned AND installedWithin(7)","riskLevel":"high","enabled":true,"weight":75},
      {"id":"rule-sign-media-unsigned","name":"SIGN.MEDIA Check - Unsigned Executable in MuiCache","description":"MuiCache entry found without valid digital signature (SIGN.MEDIA check)","condition":"registry.muiCache AND unsigned","riskLevel":"high","enabled":true,"weight":70},
      {"id":"rule-cheat-provider-name","name":"Known Cheat Provider Name Detected","description":"File or registry entry matches known cheat provider names (Phantom Overlay, EngineOwning, AC Diamond, Cobalt, etc.)","condition":"name MATCHES cheatProviders","riskLevel":"high","enabled":true,"weight":85},
      {"id":"rule-defender-exclusion-suspicious","name":"Suspicious Defender Exclusion","description":"Windows Defender exclusion added for suspicious paths (AppData, Temp, Downloads)","condition":"defender.exclusion AND suspiciousPath","riskLevel":"high","enabled":true,"weight":65},
      {"id":"rule-dma-device-unknown","name":"Unknown PCIe/USB DMA Device","description":"Unknown DMA capture device or USB descriptor failure on PCIe/USB bus","condition":"dma.unknown OR dma.descriptorFailure","riskLevel":"high","enabled":true,"weight":75},
      {"id":"rule-startup-persistence-new","name":"New Startup Persistence Entry","description":"New entry in auto-start registry locations within 7 days","condition":"registry.startup AND createdWithin(7)","riskLevel":"medium","enabled":true,"weight":55},
      {"id":"rule-dll-openwith","name":"DLL OpenWithList Entry","description":"Executable registered in .dll OpenWithList - may indicate DLL injection tool","condition":"registry.dllOpenWith","riskLevel":"medium","enabled":true,"weight":50},
      {"id":"rule-disallow-run","name":"DisallowRun Policy Detected","description":"Programs blocked via DisallowRun policy - may hide tools from Task Manager","condition":"registry.disallowRun","riskLevel":"medium","enabled":true,"weight":45},
      {"id":"rule-usb-device-history","name":"USB Device Connection/Deletion","description":"USB devices connected or deleted - check for DMA hardware or USB drives","condition":"event.usbConnect OR event.usbDelete","riskLevel":"medium","enabled":true,"weight":40},
      {"id":"rule-journal-delete","name":"USN Journal Activity Deleted","description":"Application event ID 3079 indicates USN readjournal was deleted","condition":"event.journalDelete","riskLevel":"medium","enabled":true,"weight":50},
      {"id":"rule-prefetch-suspicious","name":"Suspicious Prefetch Entry","description":"Prefetch file for suspicious executable (injector, loader, unsigned)","condition":"prefetch AND suspiciousName","riskLevel":"medium","enabled":true,"weight":45},
      {"id":"rule-hwid-spoof","name":"Potential HWID Spoof","description":"System product name or BIOS info may indicate HWID spoofing","condition":"hwid.spoofed","riskLevel":"medium","enabled":true,"weight":50},
      {"id":"rule-winrar-suspicious","name":"Suspicious WinRAR History","description":"WinRAR archive history contains suspicious filenames (cheat, hack, aim, etc.)","condition":"winrar.suspiciousName","riskLevel":"medium","enabled":true,"weight":40},
      {"id":"rule-nvidia-suspicious-program","name":"Suspicious NVIDIA Program Setting","description":"Unknown .exe found in NVIDIA Control Panel program settings","condition":"nvidia.suspiciousProgram","riskLevel":"medium","enabled":true,"weight":40},
      {"id":"rule-multiple-user-accounts","name":"Multiple User Accounts","description":"Multiple user accounts on system - may indicate alternate accounts","condition":"users.count > 1","riskLevel":"low","enabled":true,"weight":20},
      {"id":"rule-encrypted-drive","name":"Encrypted Volume Detected","description":"CIPHER /E attribute found on volume - may hide evidence","condition":"cipher.encrypted","riskLevel":"low","enabled":true,"weight":20},
      {"id":"rule-manual-restore-point","name":"Manually Created Restore Point","description":"System restore point was manually created - may be used to rollback after cheating","condition":"restorePoint.manual","riskLevel":"low","enabled":true,"weight":15},
      {"id":"rule-prefetch-in-temp","name":"Executable Run from Temp/AppData","description":"Executable run from non-standard path (Temp, AppData, Downloads)","condition":"path MATCHES nonStandardPaths","riskLevel":"medium","enabled":true,"weight":35},
      {"id":"rule-process-unsigned","name":"Unsigned Running Process","description":"Currently running process without valid digital signature","condition":"process AND unsigned","riskLevel":"low","enabled":true,"weight":30}
    ],
    "cheatProviders": ["shadow","phantom overlay","phantom","engineowning","ac diamond","cobalt","lone''s","atomic","aimex","clutch","kratos","ducks","ring-1","ring1","dma","injector","loader","cheat engine","cheatengine"],
    "nonStandardPaths": ["\\\\AppData\\\\","\\\\Temp\\\\","\\\\Downloads\\\\","\\\\Public\\\\","\\\\tmp\\\\"]
  }'::jsonb
)
on conflict (key) do nothing;

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
  normalized_email text;
  account_is_master boolean;
begin
  select count(*) into profile_count from public.profiles;
  created_by_master := coalesce((new.raw_app_meta_data ->> 'created_by_master')::boolean, false);
  initial_credits := greatest(coalesce((new.raw_app_meta_data ->> 'initial_credits')::integer, 0), 0);
  normalized_email := lower(coalesce(new.email, ''));

  select (
    profile_count = 0
    or exists (select 1 from public.master_emails where email = normalized_email)
  ) into account_is_master;

  insert into public.profiles (id, email, role, credits, created_at)
  values (
    new.id,
    normalized_email,
    case when account_is_master then 'master'::public.account_role else 'standard'::public.account_role end,
    case when account_is_master then null else initial_credits end,
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        credits = case
          when excluded.role = 'master'::public.account_role then null
          when created_by_master then initial_credits
          else public.profiles.credits
        end;

  return new;
end;
$$;

create or replace function public.sync_current_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  profile_count integer;
  account_is_master boolean;
  current_profile public.profiles;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if current_email = '' then
    select lower(email)
    into current_email
    from auth.users
    where id = current_user_id;
  end if;

  select count(*) into profile_count from public.profiles;
  select (
    profile_count = 0
    or exists (select 1 from public.master_emails where email = current_email)
  ) into account_is_master;

  insert into public.profiles (id, email, role, credits, created_at)
  values (
    current_user_id,
    current_email,
    case when account_is_master then 'master'::public.account_role else 'standard'::public.account_role end,
    case when account_is_master then null else 0 end,
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        credits = case
          when excluded.role = 'master'::public.account_role then null
          when public.profiles.credits is null then 0
          else public.profiles.credits
        end
  returning * into current_profile;

  return current_profile;
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

create or replace function public.add_scan_credits(target_profile_id uuid, token_count integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_token_count integer := greatest(coalesce(token_count, 0), 0);
  updated_profile public.profiles;
begin
  if safe_token_count <= 0 then
    raise exception 'Token count must be greater than zero.';
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + safe_token_count
  where id = target_profile_id
    and credits is not null
  returning * into updated_profile;

  if not found then
    raise exception 'Could not add credits to this account.';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.record_scan_token_payment(
  stripe_event_id text,
  stripe_session_id text,
  target_profile_id uuid,
  token_count integer,
  amount_total integer,
  currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_token_count integer := greatest(coalesce(token_count, 0), 0);
  updated_profile public.profiles;
begin
  if safe_token_count <= 0 then
    raise exception 'Token count must be greater than zero.';
  end if;

  insert into public.payment_events (
    stripe_event_id,
    stripe_session_id,
    profile_id,
    token_count,
    amount_total,
    currency
  )
  values (
    stripe_event_id,
    stripe_session_id,
    target_profile_id,
    safe_token_count,
    greatest(coalesce(amount_total, 0), 0),
    lower(coalesce(currency, 'aud'))
  );

  update public.profiles
  set credits = coalesce(credits, 0) + safe_token_count
  where id = target_profile_id
    and credits is not null
  returning * into updated_profile;

  if not found then
    raise exception 'Could not add credits to this account.';
  end if;

  return jsonb_build_object('ok', true, 'credits', updated_profile.credits);
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;

create or replace function public.set_app_appearance(selected_theme text, glow_enabled boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master(auth.uid()) then
    raise exception 'Only the master account can update app settings.';
  end if;

  if selected_theme not in ('cyan', 'emerald', 'violet', 'amber', 'rose', 'blue', 'lime', 'orange', 'fuchsia', 'white', 'red', 'teal', 'sky', 'indigo', 'pink', 'zinc') then
    raise exception 'Invalid app theme.';
  end if;

  insert into public.app_settings (key, value, updated_by, updated_at)
  values ('theme', jsonb_build_object('theme', selected_theme, 'glowBorders', coalesce(glow_enabled, false)), auth.uid(), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'theme', selected_theme, 'glowBorders', coalesce(glow_enabled, false));
end;
$$;

create or replace function public.set_app_theme(selected_theme text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.set_app_appearance(selected_theme, false);
end;
$$;

create or replace function public.set_nav_order(selected_order text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_ids text[] := array[
    'dashboard',
    'registry',
    'events',
    'apphistory',
    'services',
    'usb',
    'dma',
    'filesystem',
    'systeminfo',
    'tasks',
    'processes',
    'reports',
    'accounts',
    'master',
    'admin'
  ];
begin
  if not public.is_master(auth.uid()) then
    raise exception 'Only the master account can update tab order.';
  end if;

  if selected_order is null or array_length(selected_order, 1) is null then
    raise exception 'Tab order cannot be empty.';
  end if;

  if exists (
    select 1
    from unnest(selected_order) item
    where item <> all(allowed_ids)
  ) then
    raise exception 'Invalid tab id in order.';
  end if;

  insert into public.app_settings (key, value, updated_by, updated_at)
  values ('nav_order', jsonb_build_object('order', selected_order), auth.uid(), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'order', selected_order);
end;
$$;

create or replace function public.set_trigger_config(selected_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master(auth.uid()) then
    raise exception 'Only the master account can update trigger settings.';
  end if;

  if selected_config is null or jsonb_typeof(selected_config) <> 'object' then
    raise exception 'Trigger settings must be a JSON object.';
  end if;

  if jsonb_typeof(selected_config -> 'rules') <> 'array' then
    raise exception 'Trigger settings must include a rules array.';
  end if;

  if jsonb_typeof(selected_config -> 'cheatProviders') <> 'array' then
    raise exception 'Trigger settings must include a cheatProviders array.';
  end if;

  if jsonb_typeof(selected_config -> 'nonStandardPaths') <> 'array' then
    raise exception 'Trigger settings must include a nonStandardPaths array.';
  end if;

  insert into public.app_settings (key, value, updated_by, updated_at)
  values ('trigger_config', selected_config, auth.uid(), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.consume_scan_credit() to authenticated;
grant execute on function public.add_scan_credits(uuid, integer) to service_role;
grant execute on function public.record_scan_token_payment(text, text, uuid, integer, integer, text) to service_role;
grant execute on function public.sync_current_user_profile() to authenticated;
grant execute on function public.set_app_theme(text) to authenticated;
grant execute on function public.set_app_appearance(text, boolean) to authenticated;
grant execute on function public.set_nav_order(text[]) to authenticated;
grant execute on function public.set_trigger_config(jsonb) to authenticated;
grant select on public.app_settings to anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.master_emails enable row level security;
alter table public.account_exclusions enable row level security;
alter table public.scan_reports enable row level security;
alter table public.payment_events enable row level security;
alter table public.app_settings enable row level security;

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

revoke all on public.master_emails from anon, authenticated;

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select"
on public.app_settings for select
to anon, authenticated
using (true);

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

drop policy if exists "exclusions_master_update" on public.account_exclusions;
create policy "exclusions_master_update"
on public.account_exclusions for update
to authenticated
using (public.is_master(auth.uid()))
with check (public.is_master(auth.uid()));

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

drop policy if exists "reports_master_update_review" on public.scan_reports;
create policy "reports_master_update_review"
on public.scan_reports for update
to authenticated
using (public.is_master(auth.uid()))
with check (public.is_master(auth.uid()));

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

-- Make your own account unlimited.
-- Run this before or after signup, then log out/in:
-- insert into public.master_emails (email)
-- values ('your-email@example.com')
-- on conflict (email) do nothing;
--
-- If the account already exists and you want to repair it immediately:
-- update public.profiles
-- set role = 'master', credits = null
-- where email = 'your-email@example.com';
--
-- Add credits to a normal account until purchases exist:
-- update public.profiles
-- set credits = credits + 10
-- where email = 'customer@example.com';
