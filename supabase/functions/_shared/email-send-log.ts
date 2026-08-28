// Journal d'envois email (table applicative `email_send_log`).
//
// La livraison, les relances, la suppression et le désabonnement sont gérés par
// Lovable ; ce journal ne sert qu'à conserver l'historique applicatif qui
// existait avant la bascule (statuts 'sent' / 'suppressed' / 'failed').
import { createClient } from 'npm:@supabase/supabase-js@2'

type LogStatus = 'sent' | 'suppressed' | 'failed'

let cached: ReturnType<typeof createClient> | null = null

function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )
  }
  return cached
}

export async function logEmailSend(
  templateName: string,
  recipientEmail: string,
  status: LogStatus,
  errorMessage?: string | null,
): Promise<void> {
  const { error } = await admin().from('email_send_log').insert({
    template_name: templateName,
    recipient_email: recipientEmail.toLowerCase(),
    status,
    error_message: errorMessage ?? null,
    message_id: null,
    metadata: null,
  })
  if (error) {
    console.error('email_send_log insert failed:', { code: error.code, message: error.message })
  }
}

/**
 * Envoie via le helper managé et écrit la ligne de journal correspondante.
 * Retourne `true` si l'email a été accepté, `false` si le destinataire est
 * supprimé côté Lovable (bounce / plainte / désabonnement).
 */
export async function sendAndLog(
  send: () => Promise<{ sent: boolean; reason?: string }>,
  templateName: string,
  recipientEmail: string,
): Promise<boolean> {
  try {
    const result = await send()
    if (result.sent) {
      await logEmailSend(templateName, recipientEmail, 'sent')
      return true
    }
    await logEmailSend(templateName, recipientEmail, 'suppressed', result.reason ?? 'recipient_suppressed')
    return false
  } catch (e) {
    await logEmailSend(templateName, recipientEmail, 'failed', e instanceof Error ? e.message : String(e))
    throw e
  }
}
