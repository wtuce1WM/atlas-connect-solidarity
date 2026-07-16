import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TourMetrics {
  rating: number;
  review_count: number;
}

function parseDecimal(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

async function firecrawlMarkdown(apiKey: string, url: string, waitFor = 2000): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: false,
      waitFor,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed [${response.status}]: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return data?.data?.markdown ?? data?.markdown ?? '';
}

/**
 * Extract tour ratings from a TourRadar operator listing page markdown.
 * Patterns found in the markdown:
 * - Rating: [5.0\\ or [4.8\\  followed by (N avis)] or (N reviews)]
 * - We look for patterns like: [RATING\\ ... (COUNT avis|reviews)]
 */
function extractTourMetricsFromListing(markdown: string): TourMetrics[] {
  const metrics: TourMetrics[] = [];

  // Pattern: [RATING\\ followed eventually by (COUNT avis)] or (COUNT reviews)]
  // The markdown has entries like: [5.0\\\n\\\n(3 avis)](url#reviews)
  // Simplified regex to catch rating + review count pairs
  const ratingBlocks = markdown.matchAll(/\[(\d(?:[.,]\d)?)\s*\\[\s\\]*\((\d[\d\s.,]*)\s+(?:avis|reviews?)\)\]/gi);

  for (const match of ratingBlocks) {
    const rating = parseDecimal(match[1]);
    const count = parseInteger(match[2]);
    if (rating != null && count != null && rating > 0 && rating <= 5 && count > 0) {
      metrics.push({ rating, review_count: count });
    }
  }

  return metrics;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const staffCheck = await assertStaff(req, corsHeaders);
  if (staffCheck instanceof Response) return staffCheck;

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching TourRadar listing: ${url}`);
    const listingMarkdown = await firecrawlMarkdown(apiKey, url, 3000);
    
    console.log(`Markdown length: ${listingMarkdown.length}`);

    const tours = extractTourMetricsFromListing(listingMarkdown);

    if (tours.length === 0) {
      // Fallback: try a broader pattern
      // Sometimes the markdown format varies, try alternative parsing
      const altPattern = /(\d(?:[.,]\d)?)\s*(?:étoiles?|stars?)?\s*(?:sur\s*5\s*)?\\\s*\\\s*\((\d[\d\s.,]*)\s+(?:avis|reviews?)\)/gi;
      for (const match of listingMarkdown.matchAll(altPattern)) {
        const rating = parseDecimal(match[1]);
        const count = parseInteger(match[2]);
        if (rating != null && count != null && rating > 0 && rating <= 5 && count > 0) {
          tours.push({ rating, review_count: count });
        }
      }
    }

    if (tours.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No tour ratings found on the page',
        debug_markdown_preview: listingMarkdown.slice(0, 500),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalReviews = tours.reduce((sum, t) => sum + t.review_count, 0);
    const weightedSum = tours.reduce((sum, t) => sum + t.rating * t.review_count, 0);
    const weightedAvg = Math.round((weightedSum / totalReviews) * 100) / 100;

    console.log(`FINAL: ${tours.length} tours parsed, ${totalReviews} total reviews, weighted avg ${weightedAvg}/5`);

    const extract = {
      rating: weightedAvg,
      review_count: totalReviews,
      tour_count: tours.length,
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
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
