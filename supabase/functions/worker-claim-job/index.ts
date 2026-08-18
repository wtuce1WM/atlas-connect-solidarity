import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'studio-videos';

/** Slug ASCII sûr pour un nom de fichier. */
function slugify(input: string, max = 40): string {
  return String(input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** Origine du rendu, lisible : d'où la vidéo a été créée. */
function sourceOf(templateId: string): string {
  const t = templateId || '';
  if (t.startsWith('feed-template')) return 'feed';
  if (t.startsWith('business-promo')) return 'promo';
  if (t.startsWith('storyboard')) return 'montage';
  if (t === 'business-showcase') return 'showcase';
  if (t === 'explainer-affiliates') return 'explainer';
  if (t === 'corporate-vertical') return 'corporate';
  return slugify(t || 'studio', 24) || 'studio';
}

/** vertical | landscape, déduit du template puis des props. */
function formatOf(templateId: string, props: Record<string, unknown>): string {
  const t = templateId || '';
  if (t.endsWith('-landscape')) return 'landscape';
  const f = String((props?.format as string) || '');
  if (f === 'landscape' || f === '16:9') return 'landscape';
  return 'vertical';
}

/**
 * Nom de fichier informatif :
 * 1wm_<source>_<etablissement>_<titre>_<format>_<YYYYMMDD-HHMM>_<id8>.mp4
 * Le suffixe id8 garantit l'unicité dans le bucket.
 */
function buildFileName(job: Record<string, any>, businessSlug: string | null): string {
  const props = (job.template_props && Object.keys(job.template_props).length > 0
    ? job.template_props
    : job.scenario_json) || {};
  const template = String(job.template_id || 'business-showcase');
  const biz = slugify(businessSlug || props.slug || props.name || '', 40);
  const title = slugify(job.title || '', 40);
  const d = new Date(job.created_at || Date.now());
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  const parts = ['1wm', sourceOf(template), biz, title !== biz ? title : '', formatOf(template, props), stamp, String(job.id).slice(0, 8)];
  // Rendu à canal alpha : sortie WebM VP9 (H.264/MP4 n'a pas de canal alpha).
  const ext = props?.encode?.transparent === true ? 'webm' : 'mp4';
  return `${parts.filter(Boolean).join('_')}.${ext}`;
}


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

  // Mode "peek" (?peek=1) : ne réclame RIEN, renvoie juste s'il y a du travail.
  // Utilisé par le workflow GitHub pour sortir avant les installs coûteuses.
  if (new URL(req.url).searchParams.get('peek') === '1') {
    const staleBefore = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const [pendingRes, staleRes] = await Promise.all([
      supabase.from('video_jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('video_jobs').select('id', { count: 'exact', head: true })
        .eq('status', 'rendering').lt('updated_at', staleBefore),
    ]);
    const pending = (pendingRes.count ?? 0) + (staleRes.count ?? 0);
    return new Response(JSON.stringify({ pending, has_work: pending > 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

    // Nom de fichier informatif (origine + établissement + format + date).
    let businessSlug: string | null = null;
    if (job.business_id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('slug, name')
        .eq('id', job.business_id)
        .maybeSingle();
      businessSlug = biz?.slug || biz?.name || null;
    }
    const storagePath = buildFileName(job, businessSlug);

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
