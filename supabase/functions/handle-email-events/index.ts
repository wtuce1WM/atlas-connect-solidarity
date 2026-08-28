import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Historique applicatif uniquement (notification) : la suppression réelle est
// appliquée côté plateforme au moment de l'envoi.
async function record(
  reason: Reason,
  recipient: string,
  messageId: string | null,
  eventId: string,
) {
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('suppressed_emails upsert failed', {
      event_id: eventId,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to write suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'system',
    recipient_email: email,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.warn('email_send_log insert failed', {
      event_id: eventId,
      code: logError.code,
      message: logError.message,
    })
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record('bounce', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
    'email.complaint': async (event) => {
      await record('complaint', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
    'email.unsubscribed': async (event) => {
      await record('unsubscribe', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
  },
})

Deno.serve((req) => handler(req))
