// Demande d'affiliation publique : notification interne + accusé de réception
// au demandeur, via le helper d'envoi managé.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { sendAndLog } from '../_shared/email-send-log.ts'

const INTERNAL_RECIPIENT = 'jf@oneworldmorocco.com'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const prev = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (prev.length >= RATE_MAX) {
    hits.set(ip, prev)
    return true
  }
  prev.push(now)
  hits.set(ip, prev)
  return false
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (rateLimited(ip)) {
      return json({ error: 'Trop de demandes envoyées, merci de réessayer plus tard.' }, 429)
    }

    const body = await req.json().catch(() => null)
    const email = str(body?.email, 320).toLowerCase()
    if (!email || !isEmail(email)) return json({ error: 'Email invalide.' }, 400)

    const data = {
      businessName: str(body?.businessName),
      firstName: str(body?.firstName, 200),
      lastName: str(body?.lastName, 200),
      phone: str(body?.phone, 50),
      email,
      city: str(body?.city, 200),
      website: str(body?.website),
      multipleListings: str(body?.multipleListings, 50),
      contentReady: str(body?.contentReady, 50),
      message: str(body?.message, 5000),
    }

    const stamp = Date.now()

    // 1. Notification interne
    await sendAndLog(
      () =>
        sendTemplateEmail('affiliate-request', INTERNAL_RECIPIENT, {
          templateData: data,
          idempotencyKey: `affiliate-req-${email}-${stamp}`,
        }),
      'affiliate-request',
      INTERNAL_RECIPIENT,
    ).catch((e) => {
      console.error('affiliate-request send failed:', e instanceof Error ? e.message : e)
      return false
    })

    // 2. Accusé de réception au demandeur
    await sendAndLog(
      () =>
        sendTemplateEmail('affiliate-request-received', email, {
          templateData: {
            businessName: data.businessName,
            firstName: data.firstName,
            city: data.city,
          },
          idempotencyKey: `affiliate-req-ack-${email}-${stamp}`,
        }),
      'affiliate-request-received',
      email,
    ).catch((e) => {
      console.error('affiliate-request-received send failed:', e instanceof Error ? e.message : e)
      return false
    })

    return json({ success: true })
  } catch (error) {
    console.error('send-affiliate-request-emails error:', error instanceof Error ? error.message : error)
    return json({ error: 'Erreur lors de la demande.' }, 400)
  }
})
