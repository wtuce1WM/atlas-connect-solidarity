// Désinscription email via lien tokenisé (page /unsubscribe).
// GET  ?token=<token>  -> validation du token
// POST { token }       -> confirmation de la désinscription
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function loadToken(token: string) {
  const { data, error } = await supabase
    .from('email_unsubscribe_tokens')
    .select('id, email, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('token lookup failed', { code: error.code, message: error.message })
    return { fatal: true } as const
  }
  return { fatal: false, row: data } as const
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    let token: string | null = null

    if (req.method === 'GET') {
      token = new URL(req.url).searchParams.get('token')
    } else if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      token = typeof body?.token === 'string' ? body.token : null
    } else {
      return json({ error: 'method_not_allowed' }, 405)
    }

    if (!token) return json({ valid: false, reason: 'missing_token' }, 400)

    const lookup = await loadToken(token)
    if (lookup.fatal) return json({ error: 'lookup_failed' }, 500)
    if (!lookup.row) return json({ valid: false, reason: 'invalid_token' }, 404)

    const { id, email, used_at } = lookup.row
    const normalized = String(email).toLowerCase()

    if (req.method === 'GET') {
      if (used_at) return json({ valid: false, reason: 'already_unsubscribed' })
      return json({ valid: true })
    }

    if (used_at) return json({ success: false, reason: 'already_unsubscribed' })

    const { error: suppressError } = await supabase
      .from('suppressed_emails')
      .upsert({ email: normalized, reason: 'unsubscribe', metadata: null }, { onConflict: 'email' })

    if (suppressError) {
      console.error('suppression upsert failed', {
        code: suppressError.code,
        message: suppressError.message,
      })
      return json({ error: 'suppression_failed' }, 500)
    }

    const { error: markError } = await supabase
      .from('email_unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id)

    if (markError) {
      console.warn('token mark failed', { code: markError.code, message: markError.message })
    }

    return json({ success: true })
  } catch (e) {
    console.error('handle-email-unsubscribe error', e instanceof Error ? e.message : String(e))
    return json({ error: 'unexpected_error' }, 500)
  }
})
