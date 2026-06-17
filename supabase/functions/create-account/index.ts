import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Supabase function environment is missing required keys.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerData.user) {
      return json({ error: 'Invalid user session.' }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single();

    if (profileError || callerProfile?.role !== 'master') {
      return json({ error: 'Only the master account can create users.' }, 403);
    }

    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const initialCredits = Math.max(0, Math.floor(Number(body.initialCredits || 0)));

    if (!email.includes('@')) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(existingProfile.id, {
        password,
        email_confirm: true,
      });

      if (updateAuthError) {
        return json({ error: updateAuthError.message }, 400);
      }

      const { data: repairedAccount, error: repairError } = await adminClient
        .from('profiles')
        .update({
          role: 'standard',
          credits: initialCredits,
        })
        .eq('id', existingProfile.id)
        .select('*')
        .single();

      if (repairError) {
        return json({ error: repairError.message }, 500);
      }

      return json({ account: repairedAccount, repaired: true }, 200);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        created_by_master: true,
        initial_credits: initialCredits,
      },
    });

    if (createError || !created.user) {
      return json({ error: createError?.message || 'Could not create user.' }, 400);
    }

    const { data: account, error: accountError } = await adminClient
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        role: 'standard',
        credits: initialCredits,
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (accountError) {
      return json({ error: accountError.message }, 500);
    }

    return json({ account }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
