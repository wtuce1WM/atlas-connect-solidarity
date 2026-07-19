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
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: h });
    out.repo_status = r.status;
    if (r.ok) {
      const j = await r.json();
      out.default_branch = j.default_branch;
      out.full_name = j.full_name;
    } else {
      out.repo_body = await r.text();
    }
    const wf = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, { headers: h });
    out.workflows_status = wf.status;
    if (wf.ok) {
      const j = await wf.json();
      out.workflows = (j.workflows ?? []).map((w: any) => ({ name: w.name, path: w.path, state: w.state }));
    }
    const runs = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=5`, { headers: h });
    out.runs_status = runs.status;
    if (runs.ok) {
      const j = await runs.json();
      out.recent_runs = (j.workflow_runs ?? []).map((r: any) => ({
        id: r.id, status: r.status, conclusion: r.conclusion, created_at: r.created_at, event: r.event, head_sha: r.head_sha,
      }));
      // Fetch logs of most recent completed run instead
      const completed = j.workflow_runs?.find((r: any) => r.status === 'completed');
      if (completed) {
        const jobs2 = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${completed.id}/jobs`, { headers: h });
        if (jobs2.ok) {
          const jj2 = await jobs2.json();
          const firstJob2 = jj2.jobs?.[0];
          if (firstJob2) {
            const logs2 = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${firstJob2.id}/logs`, { headers: h, redirect: 'follow' });
            out.completed_logs_status = logs2.status;
            if (logs2.ok) {
              const txt = await logs2.text();
              out.completed_job_logs_tail = txt.split('\n').slice(-100).join('\n');
            }
          }
        }
      }
      // Also fetch render-job.mjs content from repo
      const contentRes = await fetch(`https://api.github.com/repos/${repo}/contents/remotion/scripts/render-job.mjs?ref=main`, { headers: h });
      out.render_job_file_status = contentRes.status;
      if (contentRes.ok) {
        const cj = await contentRes.json();
        out.render_job_sha = cj.sha;
        out.render_job_size = cj.size;
      }
      if (latest) {
        const jobs = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${latest.id}/jobs`, { headers: h });
        if (jobs.ok) {
          const jj = await jobs.json();
          out.latest_run_jobs = (jj.jobs ?? []).map((jb: any) => ({
            id: jb.id, name: jb.name, status: jb.status, conclusion: jb.conclusion,
            steps: (jb.steps ?? []).map((s: any) => ({ name: s.name, conclusion: s.conclusion, number: s.number })),
          }));
          const firstJob = jj.jobs?.[0];
          if (firstJob) {
            const logs = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${firstJob.id}/logs`, { headers: h, redirect: 'follow' });
            if (logs.ok) {
              const txt = await logs.text();
              out.latest_job_logs_tail = txt.split('\n').slice(-80).join('\n');
            } else {
              out.latest_job_logs_status = logs.status;
            }
          }
        }
      }
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
