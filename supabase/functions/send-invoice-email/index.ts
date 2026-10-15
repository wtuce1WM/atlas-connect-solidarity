// Envoi / renvoi d'une facture par email (staff/admin). Destinataire = email du
// compte affilié, sinon email prospect.
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
    const invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id : ''
    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: 'invoice_id invalide' }, 400)

    const { data: inv } = await admin.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
    if (!inv) return json({ error: 'Facture introuvable' }, 404)

    let recipient: string | null = inv.prospect_email
    let name: string | null = inv.prospect_name
    if (inv.affiliate_id) {
      const { data: a } = await admin.from('affiliates').select('name, contact_email').eq('id', inv.affiliate_id).maybeSingle()
      recipient = a?.contact_email ?? recipient
      name = a?.name ?? name
    }
    recipient = recipient?.trim().toLowerCase() ?? null
    if (!recipient) return json({ error: 'Aucun email destinataire' }, 400)

    const { data: items } = await admin.from('invoice_items')
      .select('label, quantity, line_total_ttc, vat_rate, vat_exempt').eq('invoice_id', invoiceId).order('sort_order')

    const r = await sendTemplateEmail('invoice-sent', recipient, {
      templateData: {
        number: inv.number, recipientName: name, currency: inv.currency,
        date: new Date(inv.created_at).toLocaleDateString('fr-FR'),
        totalHt: inv.total_ht, totalVat: inv.total_vat, totalTtc: inv.total_ttc,
        paid: inv.status === 'paid', items: items ?? [],
      },
      idempotencyKey: `invoice-sent-${invoiceId}-${Date.now()}`,
      replyTo: 'info@oneworldmorocco.com',
    })
    if (!r.sent) return json({ status: 'suppressed', recipient })
    return json({ status: 'sent', recipient })
  } catch (e) {
    console.error(e)
    return json({ error: "Échec de l'envoi" }, 500)
  }
})
