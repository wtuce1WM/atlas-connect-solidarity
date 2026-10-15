// Envoi / renvoi d'un devis par email (staff/admin). Destinataire = email du
// compte affilié, sinon email prospect. Chaque tentative est horodatée.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    })
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

    const { data: u } = await userClient.auth.getUser()
    const uid = u?.user?.id
    if (!uid) return json({ error: 'Non authentifié' }, 401)
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', uid)
    if (!roles?.some((r) => r.role === 'admin' || r.role === 'staff')) return json({ error: 'Accès refusé' }, 403)

    const body = await req.json().catch(() => null)
    const quoteId = typeof body?.quote_id === 'string' ? body.quote_id : ''
    if (!/^[0-9a-f-]{36}$/i.test(quoteId)) return json({ error: 'quote_id invalide' }, 400)

    const { data: q } = await admin.from('quotes').select('*').eq('id', quoteId).maybeSingle()
    if (!q) return json({ error: 'Devis introuvable' }, 404)
    if (!['draft', 'sent'].includes(q.status)) return json({ error: 'Ce devis ne peut plus être envoyé' }, 400)

    let recipient: string | null = q.prospect_email
    let name: string | null = q.prospect_name
    if (q.affiliate_id) {
      const { data: a } = await admin.from('affiliates').select('name, contact_email').eq('id', q.affiliate_id).maybeSingle()
      recipient = a?.contact_email ?? recipient
      name = a?.name ?? name
    }
    recipient = recipient?.trim().toLowerCase() ?? null
    if (!recipient) return json({ error: 'Aucun email destinataire' }, 400)

    // Numéro attribué au passage en "envoyé" : on change d'abord le statut si brouillon.
    if (q.status === 'draft') {
      const { error } = await userClient.rpc('set_quote_status', { p_quote_id: quoteId, p_status: 'sent', p_refusal_reason: null })
      if (error) return json({ error: error.message }, 400)
    }
    const { data: fresh } = await admin.from('quotes').select('*').eq('id', quoteId).single()
    const { data: items } = await admin.from('quote_items')
      .select('label, quantity, unit_price_ht, total_ttc').eq('quote_id', quoteId).order('sort_order')

    let status: 'sent' | 'suppressed' | 'failed' = 'sent'
    let errMsg: string | null = null
    try {
      const r = await sendTemplateEmail('quote-sent', recipient, {
        templateData: {
          number: fresh.number, recipientName: name, currency: fresh.currency,
          subtotalHt: fresh.subtotal_ht, totalVat: fresh.total_vat, totalTtc: fresh.total_ttc,
          expiresAt: fresh.expires_at, items: items ?? [],
        },
        idempotencyKey: `quote-sent-${quoteId}-${Date.now()}`,
        replyTo: 'info@oneworldmorocco.com',
      })
      if (!r.sent) { status = 'suppressed'; errMsg = r.reason }
    } catch (e) {
      status = 'failed'; errMsg = e instanceof Error ? e.message : String(e)
    }
    await admin.from('quote_email_sends').insert({ quote_id: quoteId, recipient_email: recipient, status, error_message: errMsg, sent_by: uid })
    await admin.from('email_send_log').insert({ template_name: 'quote-sent', recipient_email: recipient, status, error_message: errMsg })

    if (status === 'failed') return json({ error: "Échec de l'envoi", recipient }, 502)
    return json({ status, recipient })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erreur interne' }, 500)
  }
})
