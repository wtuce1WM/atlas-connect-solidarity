import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const staffCheck = await assertStaff(req, corsHeaders);
  if (staffCheck instanceof Response) return staffCheck;

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { url } = await req.json();

  try {
    console.log(`Scraping Trustpilot: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          prompt: 'Extract the overall rating (out of 5, as a decimal like 4.5) and total number of reviews from this Trustpilot page.',
          schema: {
            type: 'object',
            properties: {
              rating: { type: 'number', description: 'Overall rating out of 5' },
              review_count: { type: 'number', description: 'Total number of reviews' },
            },
          },
        },
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data).substring(0, 1000));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
