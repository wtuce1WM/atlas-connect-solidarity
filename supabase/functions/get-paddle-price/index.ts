import { gatewayFetch, corsHeaders, json, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { priceId, environment } = await req.json();
    if (!priceId || !['sandbox', 'live'].includes(environment)) return json({ error: 'Invalid request' }, 400);
    const res = await gatewayFetch(environment as PaddleEnv, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();
    if (!data.data?.length) return json({ error: 'Price not found' }, 404);
    return json({ paddleId: data.data[0].id });
  } catch (e) {
    console.error(e);
    return json({ error: 'Internal error' }, 500);
  }
});
