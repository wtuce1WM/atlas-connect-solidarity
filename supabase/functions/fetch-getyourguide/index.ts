const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ActivityData {
  rating: number;
  review_count: number;
}

interface PageExtract {
  activities: ActivityData[];
  total_results_on_page: number;
}

async function scrapePage(apiKey: string, baseUrl: string, page: number): Promise<PageExtract | null> {
  const separator = baseUrl.includes('?') ? '&' : '?';
  const url = page === 1 ? baseUrl : `${baseUrl}${separator}page=${page}`;
  
  console.log(`Scraping page ${page}: ${url}`);

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
        prompt: `This is a GetYourGuide search results page showing activities/tours. 
Extract EVERY activity card visible on this page. For each activity, get:
- The rating (decimal like 4.9, out of 5)
- The number of reviews/ratings (integer, e.g. "17,062 reviews" → 17062)

Return ALL activities found as an array. If no activities are found, return an empty array.
Important: Make sure to capture ALL activities on this page, not just a few.`,
        schema: {
          type: 'object',
          properties: {
            activities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rating: { type: 'number', description: 'Rating out of 5' },
                  review_count: { type: 'number', description: 'Number of reviews as integer' },
                },
              },
              description: 'All activities found on this page',
            },
            total_results_on_page: { type: 'number', description: 'Number of activity cards visible on this page' },
          },
        },
      },
      waitFor: 8000,
    }),
  });

  const data = await response.json();
  const extract = data?.data?.extract;
  
  if (!extract?.activities || !Array.isArray(extract.activities)) {
    console.log(`Page ${page}: no activities found`);
    return null;
  }

  // Filter valid activities (must have both rating and review_count > 0)
  const validActivities = extract.activities.filter(
    (a: ActivityData) => a.rating != null && a.rating > 0 && a.review_count != null && a.review_count > 0
  );

  console.log(`Page ${page}: found ${validActivities.length} valid activities (raw: ${extract.activities.length})`);
  
  return {
    activities: validActivities,
    total_results_on_page: extract.total_results_on_page || validActivities.length,
  };
}

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
    console.log(`Fetching GetYourGuide reviews: ${url}`);

    const allActivities: ActivityData[] = [];
    const maxPages = 10; // Safety limit
    
    for (let page = 1; page <= maxPages; page++) {
      const result = await scrapePage(apiKey, url, page);
      
      if (!result || result.activities.length === 0) {
        console.log(`Stopping at page ${page}: no more activities`);
        break;
      }

      allActivities.push(...result.activities);
      console.log(`Running total: ${allActivities.length} activities`);

      // If fewer than ~10 activities on a page, likely the last page
      if (result.activities.length < 8) {
        console.log(`Page ${page} had only ${result.activities.length} activities, likely last page`);
        break;
      }
    }

    if (allActivities.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No activities found on the page' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Compute weighted average
    const totalReviews = allActivities.reduce((sum, a) => sum + a.review_count, 0);
    const weightedSum = allActivities.reduce((sum, a) => sum + a.rating * a.review_count, 0);
    const weightedAvg = Math.round((weightedSum / totalReviews) * 100) / 100;

    console.log(`FINAL: ${allActivities.length} activities, ${totalReviews} total reviews, weighted avg ${weightedAvg}/5`);

    // Log top activities for debugging
    const sorted = [...allActivities].sort((a, b) => b.review_count - a.review_count);
    sorted.slice(0, 5).forEach((a, i) => {
      console.log(`  Top ${i + 1}: ${a.rating}/5 (${a.review_count} reviews)`);
    });

    const extract = {
      rating: weightedAvg,
      review_count: totalReviews,
      activity_count: allActivities.length,
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: { extract } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
