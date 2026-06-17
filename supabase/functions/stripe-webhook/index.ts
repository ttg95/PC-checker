import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe webhook environment is missing required keys.');
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return json({ error: 'Missing Stripe signature.' }, 400);
    }

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    if (event.type !== 'checkout.session.completed') {
      return json({ received: true }, 200);
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') {
      return json({ received: true, ignored: 'payment_not_paid' }, 200);
    }

    const profileId = session.metadata?.profile_id;
    const tokenCount = Math.max(0, Math.floor(Number(session.metadata?.token_count || 0)));
    if (!profileId || tokenCount <= 0) {
      return json({ error: 'Checkout session metadata is missing token details.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: paymentResult, error: paymentError } = await adminClient.rpc('record_scan_token_payment', {
      stripe_event_id: event.id,
      stripe_session_id: session.id,
      target_profile_id: profileId,
      token_count: tokenCount,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? 'aud',
    });

    if (paymentError) {
      throw paymentError;
    }

    return json({ received: true, credited: tokenCount, result: paymentResult }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected webhook error.' }, 400);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
