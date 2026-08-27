import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const pat = Deno.env.get('GITHUB_PAT');
  const repo = Deno.env.get('GITHUB_REPO');
  const workflow = Deno.env.get('GITHUB_WORKFLOW_FILE') ?? 'render-videos.yml';

  if (!pat || !repo) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT or GITHUB_REPO missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const h = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const out: any = { repo, workflow, deleted: [], skipped: [], errors: [] };

  // Paginer tous les runs du workflow
  let page = 1;
  const perPage = 100;
  let totalChecked = 0;

  while (true) {
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=${perPage}&page=${page}`,
      { headers: h },
    );
    if (!runsRes.ok) {
      out.errors.push({ step: 'list', page, status: runsRes.status, body: await runsRes.text() });
      break;
    }
    const j = await runsRes.json();
    const runs = j.workflow_runs ?? [];
    if (runs.length === 0) break;

    for (const run of runs) {
      totalChecked += 1;
      // On supprime les runs échoués ou bloqués en attente (billing, etc.)
      const deletable =
        run.conclusion === 'failure' ||
        run.status === 'queued' ||
        run.status === 'waiting' ||
        run.status === 'pending' ||
        run.status === 'requested';

      if (!deletable) {
        out.skipped.push({ id: run.id, status: run.status, conclusion: run.conclusion });
        continue;
      }

      const delRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${run.id}`, {
        method: 'DELETE',
        headers: h,
      });
      if (delRes.status === 204) {
        out.deleted.push({ id: run.id, status: run.status, conclusion: run.conclusion });
      } else {
        out.errors.push({
          step: 'delete',
          id: run.id,
          status: delRes.status,
          body: await delRes.text(),
        });
      }
    }

    if (runs.length < perPage) break;
    page += 1;
  }

  out.total_checked = totalChecked;

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
