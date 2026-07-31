import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'studio-videos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const workerSecret = Deno.env.get('WORKER_SECRET');
  const provided = req.headers.get('x-worker-secret');
  if (!workerSecret || provided !== workerSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, serviceRole);

  try {
    let { data: candidate, error: selErr } = await supabase
      .from('video_jobs')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (selErr) throw selErr;

    // Reclaim stale jobs: a runner that was killed (timeout/OOM) leaves the job
    // stuck in "rendering" forever. After 25 min, put it back in the queue.
    if (!candidate) {
      const staleBefore = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      const { data: stale } = await supabase
        .from('video_jobs')
        .select('id')
        .eq('status', 'rendering')
        .lt('updated_at', staleBefore)
        .order('updated_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (stale) {
        await supabase
          .from('video_jobs')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', stale.id);
        candidate = stale;
      }
    }

    if (!candidate) {

      return new Response(JSON.stringify({ job: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: job, error: lockErr } = await supabase
      .from('video_jobs')
      .update({ status: 'rendering', updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (lockErr) throw lockErr;
    if (!job) {
      return new Response(JSON.stringify({ job: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Signed upload URL (valid ~1h) for the worker to PUT the mp4 directly.
    const storagePath = `${job.id}.mp4`;
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (signErr) throw signErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return new Response(JSON.stringify({
      job,
      upload: {
        signedUrl: signed.signedUrl,
        token: signed.token,
        path: storagePath,
        publicUrl: pub.publicUrl,
        bucket: BUCKET,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('worker-claim-job error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
