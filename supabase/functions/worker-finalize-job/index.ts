import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { sendAndLog } from '../_shared/email-send-log.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const workerSecret = Deno.env.get('WORKER_SECRET');
  const provided = req.headers.get('x-worker-secret');
  if (!workerSecret || provided !== workerSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { job_id, status, output_url, error_message, duration_sec } = body || {};

  if (!job_id || !['done', 'error', 'rendering'].includes(status)) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, serviceRole);

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (output_url) patch.output_url = output_url;
  if (error_message) patch.error_message = error_message;
  if (duration_sec != null && Number.isFinite(Number(duration_sec))) patch.duration_sec = Number(duration_sec);

  const { data: updated, error } = await supabase
    .from('video_jobs')
    .update(patch)
    .eq('id', job_id)
    .select('id, title, prompt, duration_sec, output_url, notify_email, notify_email_to, business_id')
    .maybeSingle();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Confirmation email when the video is ready
  if (status === 'done' && updated?.notify_email && updated?.notify_email_to) {
    try {
      let businessName = '';
      if (updated.business_id) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', updated.business_id)
          .maybeSingle();
        businessName = biz?.name ?? '';
      }
      await sendAndLog(
        () =>
          sendTemplateEmail('video-ready', updated.notify_email_to, {
            templateData: {
              businessName,
              videoTitle: updated.title || (updated.prompt ?? '').slice(0, 80),
              durationSec: updated.duration_sec ?? null,
              studioUrl: 'https://oneworldmorocco.com/studio-video',
              videoUrl: updated.output_url ?? '',
            },
            idempotencyKey: `video-ready-${updated.id}`,
          }),
        'video-ready',
        updated.notify_email_to,
      );
    } catch (e) {
      console.error('video-ready email failed:', (e as Error).message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
