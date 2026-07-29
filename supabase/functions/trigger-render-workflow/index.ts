import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertStaff } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Accept internal DB trigger: header Lovable-Context: trigger + a valid pending job_id.
  // Otherwise: staff-only.
  const isInternalTrigger = (req.headers.get('Lovable-Context') || '').toLowerCase() === 'trigger';
  let internalAllowed = false;
  if (isInternalTrigger) {
    try {
      const body = await req.clone().json().catch(() => ({}));
      const jobId = typeof body?.job_id === 'string' ? body.job_id : null;
      if (jobId) {
        const supa = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
        );
        const { data } = await supa.from('video_jobs').select('id,status').eq('id', jobId).maybeSingle();
        if (data && (data.status === 'pending' || data.status === 'rendering')) internalAllowed = true;
      }
    } catch (_) { /* fallthrough to staff check */ }
  }
  if (!internalAllowed) {
    const auth = await assertStaff(req, corsHeaders);
    if (auth instanceof Response) return auth;
  }



  try {
    const pat = Deno.env.get('GITHUB_PAT');
    const repo = Deno.env.get('GITHUB_REPO');
    const workflow = Deno.env.get('GITHUB_WORKFLOW_FILE') ?? 'render-videos.yml';
    if (!pat || !repo) {
      return new Response(JSON.stringify({ error: 'Missing GITHUB_PAT or GITHUB_REPO' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghHeaders = {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    // 1) Get repo info to detect default branch + confirm PAT access
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders });
    if (!repoRes.ok) {
      const body = await repoRes.text();
      console.error('GitHub repo access failed', repoRes.status, body);
      return new Response(JSON.stringify({ error: 'Repo access failed', status: repoRes.status, body, repo }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const repoInfo = await repoRes.json();
    const ref = repoInfo.default_branch ?? 'main';

    // 2) Dispatch workflow
    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({ ref }),
    });

    const text = await res.text();
    if (!res.ok) {
      // List workflows to help debug
      const listRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, { headers: ghHeaders });
      const listBody = await listRes.text();
      console.error('GitHub dispatch failed', res.status, text, 'ref=', ref, 'workflow=', workflow, 'workflows=', listBody);
      return new Response(JSON.stringify({ error: 'GitHub dispatch failed', status: res.status, body: text, ref, workflow, workflows_list_status: listRes.status, workflows: listBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
