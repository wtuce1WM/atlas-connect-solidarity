const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ActivityData {
  title?: string;
  rating: number;
  review_count: number;
}

interface PageExtract {
  activities: ActivityData[];
  total_results_on_page: number;
}

function parseRating(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseReviewCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildPageUrl(baseUrl: string, page: number): string {
  try {
    const parsed = new URL(baseUrl);
    if (page > 1) {
      parsed.searchParams.set('page', String(page));
    } else {
      parsed.searchParams.delete('page');
    }
    return parsed.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return page === 1 ? baseUrl : `${baseUrl}${separator}page=${page}`;
  }
}

async function scrapePage(apiKey: string, baseUrl: string, page: number): Promise<PageExtract | null> {
  const url = buildPageUrl(baseUrl, page);
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
Extract EVERY activity card visible on this page.
For each activity, extract:
- title
- rating (decimal like 4.9, out of 5)
- review_count (integer, e.g. "17,062 reviews" -> 17062)
Return all activities in an array. If no activities exist on this page, return an empty array.`,
        schema: {
          type: 'object',
          properties: {
            activities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Activity title' },
                  rating: { type: 'number', description: 'Rating out of 5' },
                  review_count: { type: 'number', description: 'Number of reviews as integer' },
                },
              },
            },
            total_results_on_page: { type: 'number' },
          },
        },
      },
      waitFor: 3500,
    }),
  });

  const raw = await response.json();
  const extract = raw?.data?.extract ?? raw?.extract;

  if (!extract?.activities || !Array.isArray(extract.activities)) {
    console.log(`Page ${page}: no extract.activities`);
    return null;
  }

  const validActivities = extract.activities
    .map((a: Record<string, unknown>) => {
      const rating = parseRating(a?.rating);
      const review_count = parseReviewCount(a?.review_count);
      const title = typeof a?.title === 'string' ? a.title : undefined;
      return { title, rating, review_count };
    })
    .filter((a) => a.rating != null && a.rating > 0 && a.review_count != null && a.review_count > 0)
    .map((a) => ({ title: a.title, rating: a.rating as number, review_count: a.review_count as number }));

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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { url } = await req.json();
  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log(`Fetching GetYourGuide reviews: ${url}`);

    const firstPage = await scrapePage(apiKey, url, 1);

    if (!firstPage || firstPage.activities.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No activities found on supplier page' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let allActivitiesRaw: ActivityData[] = [...firstPage.activities];
    const firstPageReviews = firstPage.activities.reduce((sum, a) => sum + a.review_count, 0);

    // Fallback pagination only if first page clearly incomplete/too low
    if (firstPage.activities.length < 12 || firstPageReviews < 1000) {
      const fallbackPages = await Promise.all([2, 3].map((page) => scrapePage(apiKey, url, page)));
      allActivitiesRaw = [
        ...allActivitiesRaw,
        ...fallbackPages.filter((r): r is PageExtract => !!r).flatMap((r) => r.activities),
      ];
    }

    if (allActivitiesRaw.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No activities found after pagination' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dédoublonnage basique par titre (quand disponible) pour éviter comptage double inter-pages
    const deduped = new Map<string, ActivityData>();
    allActivitiesRaw.forEach((activity, index) => {
      const key = activity.title?.trim().toLowerCase() || `${activity.rating}-${activity.review_count}-${index}`;
      if (!deduped.has(key)) {
        deduped.set(key, activity);
      }
    });

    const allActivities = Array.from(deduped.values());
    const totalReviews = allActivities.reduce((sum, a) => sum + a.review_count, 0);
    const weightedSum = allActivities.reduce((sum, a) => sum + a.rating * a.review_count, 0);
    const weightedAvg = Math.round((weightedSum / totalReviews) * 100) / 100;

    console.log(`FINAL: ${allActivities.length} activities, ${totalReviews} total reviews, weighted avg ${weightedAvg}/5`);

    const extract = {
      rating: weightedAvg,
      review_count: totalReviews,
      activity_count: allActivities.length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        extract,
        data: {
          extract,
          data: { extract },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
