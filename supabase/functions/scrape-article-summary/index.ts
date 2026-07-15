const corsHeaders = {
import { assertStaff } from "../_shared/auth-helpers.ts";
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { url, businessName } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping article summary:', formattedUrl);

    const jsonPrompt = businessName
      ? `Extract a concise summary (max 3 sentences, in the same language as the article) specifically about "${businessName}" from this article. Also extract the article title and the publication date (format YYYY-MM-DD if possible).`
      : `Extract a concise summary (max 3 sentences, in the same language as the article) of this article. Also extract the article title and the publication date (format YYYY-MM-DD if possible).`;

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['extract', 'screenshot'],
        extract: {
          prompt: jsonPrompt,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              publishedDate: { type: 'string', description: 'Publication date in YYYY-MM-DD format or as found' },
            },
            required: ['title', 'summary'],
          },
        },
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const strip = (s: string) => s.replace(/[_*`#~\[\]]/g, '').replace(/\s{2,}/g, ' ').trim();
    const extract = data.data?.extract || data.extract || {};
    const title = strip(extract.title || data.data?.metadata?.title || data.metadata?.title || '');
    const summary = strip(extract.summary || '');
    const publishedDate = extract.publishedDate || data.data?.metadata?.publishedDate || '';
    const screenshot = data.data?.screenshot || data.screenshot || '';

    return new Response(
      JSON.stringify({
        success: true,
        title,
        summary,
        publishedDate,
        screenshot,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping article:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
