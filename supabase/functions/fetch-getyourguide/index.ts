const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { url } = await req.json();
  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`Scraping GetYourGuide: ${url}`);

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
          prompt: `This is a GetYourGuide search results page showing activities from a single supplier/operator. 
Extract ALL activities listed on the page. For each activity, extract:
- The rating (out of 5, as a decimal like 4.9)
- The number of reviews (as an integer)

Then compute:
1. The total number of reviews across ALL activities (sum of all review counts)
2. The weighted average rating: sum(rating * review_count) / total_reviews, rounded to 2 decimal places

Return ONLY the aggregated totals.`,
          schema: {
            type: 'object',
            properties: {
              rating: { type: 'number', description: 'Weighted average rating out of 5, rounded to 2 decimals' },
              review_count: { type: 'number', description: 'Total number of reviews across all activities' },
              activity_count: { type: 'number', description: 'Number of activities found on the page' },
            },
          },
        },
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data).substring(0, 1000));

    const extract = data?.data?.extract;
    if (extract?.rating != null && extract?.review_count != null) {
      console.log(`Result: rating=${extract.rating}/5, reviews=${extract.review_count}, activities=${extract.activity_count || '?'}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
