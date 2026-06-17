import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCAN_TOKEN_UNIT_AMOUNT_AUD = 3000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const successUrl = Deno.env.get('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = Deno.env.get('STRIPE_CHECKOUT_CANCEL_URL');

    if (!supabaseUrl || !anonKey || !stripeSecretKey || !successUrl || !cancelUrl) {
      throw new Error('Payment function environment is missing required keys.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Invalid user session.' }, 401);
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id,email,credits')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Account profile was not found.' }, 404);
    }
    if (profile.credits === null) {
      return json({ error: 'Master accounts already have unlimited scan credits.' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const tokenCount = Math.max(1, Math.min(100, Math.floor(Number(body.tokenCount || 1))));

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: profile.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: tokenCount,
          price_data: {
            currency: 'aud',
            unit_amount: SCAN_TOKEN_UNIT_AMOUNT_AUD,
            product_data: {
              name: 'PC Checker scan token',
              description: 'One scan token for PC Checker',
            },
          },
        },
      ],
      metadata: {
        profile_id: profile.id,
        token_count: String(tokenCount),
      },
    });

    return json({ url: session.url }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected payment error.' }, 500);
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
