import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  v = v.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  return v;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function firstImage(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function isValidSubstack(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.substack.com');
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let target = url.searchParams.get('url') || '';
    if (!target && (req.method === 'POST')) {
      const body = await req.json().catch(() => ({}));
      target = body?.url || '';
    }
    if (!target || !isValidSubstack(target)) {
      return new Response(JSON.stringify({ error: 'Invalid Substack URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const feedUrl = target.replace(/\/+$/, '') + '/feed';
    const resp = await fetch(feedUrl, { headers: { 'User-Agent': 'OneWorldMorocco-Feed/1.0' } });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Substack returned ${resp.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const xml = await resp.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const items = itemMatches.slice(0, 10).map((it) => {
      const title = pick(it, 'title') || '';
      const link = pick(it, 'link') || '';
      const pubDate = pick(it, 'pubDate') || '';
      const description = pick(it, 'description') || '';
      const content = pick(it, 'content:encoded') || description;
      const enclosure = it.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] || null;
      const image = enclosure || firstImage(content);
      const excerpt = stripHtml(description).slice(0, 240);
      return { title, link, pubDate, excerpt, image };
    });
    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
