// Formulaire de contact public : valide, limite le débit, puis envoie l'email
// interne via le helper d'envoi managé.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { sendAndLog } from '../_shared/email-send-log.ts'

const RECIPIENT = 'info@oneworldmorocco.com'
const TEMPLATE = 'contact-form'

// Limitation de débit simple par IP (fenêtre glissante en mémoire).
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
      return json({ error: 'Trop de messages envoyés, merci de réessayer plus tard.' }, 429)
    }

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || name.length > 200) return json({ error: 'Nom invalide.' }, 400)
    if (!email || email.length > 320 || !isEmail(email)) return json({ error: 'Email invalide.' }, 400)
    if (!message || message.length > 5000) return json({ error: 'Message invalide.' }, 400)

    const idempotencyKey =
      typeof body?.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim().slice(0, 200)
        : `contact-${email.toLowerCase()}-${Date.now()}`

    const sent = await sendAndLog(
      () =>
        sendTemplateEmail(TEMPLATE, RECIPIENT, {
          templateData: { name, email, message },
          idempotencyKey,
          replyTo: email,
        }),
      TEMPLATE,
      RECIPIENT,
    )

    return json({ success: true, sent })
  } catch (error) {
    console.error('send-contact-message error:', error instanceof Error ? error.message : error)
    return json({ error: "Erreur lors de l'envoi du message." }, 400)
  }
})
