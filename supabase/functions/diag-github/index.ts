import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const pat = Deno.env.get('GITHUB_PAT');
  const repo = Deno.env.get('GITHUB_REPO');
  const workflow = Deno.env.get('GITHUB_WORKFLOW_FILE') ?? 'render-videos.yml';

  const out: any = { repo, workflow, pat_present: !!pat, pat_len: pat?.length ?? 0 };

  if (pat && repo) {
    const h = {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const runsRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=3`, { headers: h });
    out.runs_status = runsRes.status;
    if (runsRes.ok) {
      const j = await runsRes.json();
      const latest = j.workflow_runs?.[0];
      if (latest) {
        out.run = {
          id: latest.id, status: latest.status, conclusion: latest.conclusion,
          run_attempt: latest.run_attempt, created_at: latest.created_at,
        };
        const jobsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${latest.id}/jobs`, { headers: h });
        out.jobs_status = jobsRes.status;
        if (jobsRes.ok) {
          const jj = await jobsRes.json();
          out.jobs = jj.jobs;
          const jobId = jj.jobs?.[0]?.id;
          if (jobId) {
            const ann = await fetch(`https://api.github.com/repos/${repo}/check-runs/${jobId}/annotations`, { headers: h });
            out.annotations_status = ann.status;
            out.annotations = ann.ok ? await ann.json() : await ann.text();
            const logs = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${jobId}/logs`, { headers: h, redirect: 'follow' });
            out.logs_status = logs.status;
            if (logs.ok) {
              const txt = await logs.text();
              out.logs_tail = txt.split('\n').slice(-120).join('\n');
            } else {
              out.logs_body = (await logs.text()).slice(0, 500);
            }
          }
        }
      }
    } else {
      out.runs_body = await runsRes.text();
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
