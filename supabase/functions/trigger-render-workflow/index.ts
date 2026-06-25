import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const pat = Deno.env.get('GITHUB_PAT');
    const repo = Deno.env.get('GITHUB_REPO');
    const workflow = Deno.env.get('GITHUB_WORKFLOW_FILE') ?? 'render-videos.yml';
    if (!pat || !repo) {
      return new Response(JSON.stringify({ error: 'Missing GITHUB_PAT or GITHUB_REPO' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('GitHub dispatch failed', res.status, text);
      return new Response(JSON.stringify({ error: 'GitHub dispatch failed', status: res.status, body: text }), {
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
