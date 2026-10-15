// Customer portal (cancel / payment method / invoices) and plan switch effective at next renewal.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, gatewayFetch, corsHeaders, json, type PaddleEnv } from '../_shared/paddle.ts';

const ALLOWED_PRICES = ['partner_monthly', 'partner_yearly'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { action, environment, priceId } = await req.json();
    if (!['sandbox', 'live'].includes(environment)) return json({ error: 'Invalid environment' }, 400);
    const env = environment as PaddleEnv;

    const { data: sub } = await admin.from('subscriptions').select('*')
      .eq('user_id', user.id).eq('environment', env)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!sub) return json({ error: 'No subscription' }, 404);

    if (action === 'portal') {
      const session = await getPaddleClient(env).customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
      return json({ url: session.urls.general.overview });
    }

    if (action === 'change_plan') {
      if (!ALLOWED_PRICES.includes(priceId) || priceId === sub.price_id) return json({ error: 'Invalid plan' }, 400);
      const priceRes = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
      const paddlePriceId = (await priceRes.json()).data?.[0]?.id;
      if (!paddlePriceId) return json({ error: 'Price not found' }, 404);
      // No immediate charge; new plan billed in full from the next renewal date.
      const res = await gatewayFetch(env, `/subscriptions/${sub.paddle_subscription_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ items: [{ price_id: paddlePriceId, quantity: 1 }], proration_billing_mode: 'full_next_billing_period' }),
      });
      if (!res.ok) { console.error(await res.text()); return json({ error: 'Change failed' }, 400); }
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'Internal error' }, 500);
  }
});
