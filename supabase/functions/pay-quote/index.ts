// Lien de paiement public d'un devis : crée une transaction Paddle au montant TTC
// du devis (lu en base, jamais depuis le navigateur) et renvoie son id.
import { gatewayFetch, corsHeaders, json, type PaddleEnv } from '../_shared/paddle.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => null)
    const quoteId = typeof body?.quote_id === 'string' ? body.quote_id : ''
    const env = body?.environment as PaddleEnv
    if (!/^[0-9a-f-]{36}$/i.test(quoteId) || !['sandbox', 'live'].includes(env)) return json({ error: 'Requête invalide' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: q } = await admin.from('quotes')
      .select('id, number, status, currency, total_ttc, paid_at, prospect_email, affiliate_id').eq('id', quoteId).maybeSingle()
    if (!q) return json({ error: 'Devis introuvable' }, 404)
    if (q.paid_at) return json({ error: 'Ce devis est déjà réglé', paid: true }, 400)
    if (!['sent', 'accepted'].includes(q.status)) return json({ error: "Ce devis n'est pas payable" }, 400)
    if (q.currency === 'MAD') return json({ error: 'Paiement en ligne indisponible en MAD' }, 400)
    const amount = Math.round(Number(q.total_ttc) * 100)
    if (amount < 70) return json({ error: 'Montant trop faible' }, 400)

    const res = await gatewayFetch(env, '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          quantity: 1,
          price: {
            name: `Devis ${q.number}`,
            description: `Devis ${q.number} — One World Morocco`,
            tax_mode: 'internal',
            unit_price: { amount: String(amount), currency_code: q.currency },
            product: { name: `Devis ${q.number}`, tax_category: 'standard' },
          },
        }],
        custom_data: { quoteId: q.id },
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.data?.id) {
      console.error('paddle transaction error', JSON.stringify(data))
      return json({ error: 'Impossible de préparer le paiement' }, 502)
    }
    return json({ transactionId: data.data.id, number: q.number, total: q.total_ttc, currency: q.currency })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erreur interne' }, 500)
  }
})
