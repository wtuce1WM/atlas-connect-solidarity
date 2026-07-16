import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ActivityMetrics {
  url: string;
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

function normalizeActivityUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url.replace(/\?.*$/, '').replace(/#.*$/, '').replace(/\/+$/, '');
  }
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

function extractActivityUrlsFromListing(markdown: string): string[] {
  const regex = /\((https:\/\/www\.getyourguide\.com\/[^)\s]*-t\d+[^)\s]*)\)/gi;
  const urls = new Set<string>();

  for (const match of markdown.matchAll(regex)) {
    const raw = match[1];
    if (!raw) continue;
    urls.add(normalizeActivityUrl(raw));
  }

  return Array.from(urls);
}

function extractMetricsFromActivityMarkdown(markdown: string): { rating: number; review_count: number } | null {
  // Typical pattern in GYG markdown:
  // "4.9 out of 5 stars"
  // "[17,154 reviews](...)"
  const ratingMatch = markdown.match(/(\d(?:[.,]\d)?)\s*out of 5 stars/i);
  const countMatch =
    markdown.match(/\[(\d[\d\s,\.]*)\s+(?:reviews?|avis)\]/i) ??
    markdown.match(/(\d[\d\s,\.]*)\s+(?:reviews?|avis)/i);

  if (!ratingMatch?.[1] || !countMatch?.[1]) return null;

  const rating = parseDecimal(ratingMatch[1]);
  const review_count = parseInteger(countMatch[1]);

  if (rating == null || review_count == null || rating <= 0 || rating > 5 || review_count <= 0) {
    return null;
  }

  return { rating, review_count };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) break;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
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

    console.log(`Fetching GetYourGuide listing: ${url}`);
    const listingMarkdown = await firecrawlMarkdown(apiKey, url, 2500);
    const activityUrls = extractActivityUrlsFromListing(listingMarkdown);

    if (activityUrls.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No activity URLs found on listing page' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${activityUrls.length} activity URLs`);

    const activityResults = await mapWithConcurrency(activityUrls, 6, async (activityUrl) => {
      try {
        const markdown = await firecrawlMarkdown(apiKey, activityUrl, 1200);
        const metrics = extractMetricsFromActivityMarkdown(markdown);
        if (!metrics) return null;

        return {
          url: activityUrl,
          rating: metrics.rating,
          review_count: metrics.review_count,
        } satisfies ActivityMetrics;
      } catch (err) {
        console.log(`Failed activity scrape: ${activityUrl} - ${String(err).slice(0, 120)}`);
        return null;
      }
    });

    const activities = activityResults.filter((a): a is ActivityMetrics => !!a);

    if (activities.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No valid ratings found on activity pages' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalReviews = activities.reduce((sum, a) => sum + a.review_count, 0);
    const weightedSum = activities.reduce((sum, a) => sum + a.rating * a.review_count, 0);
    const weightedAvg = Math.round((weightedSum / totalReviews) * 100) / 100;

    console.log(`FINAL: ${activities.length}/${activityUrls.length} activities parsed, ${totalReviews} total reviews, weighted avg ${weightedAvg}/5`);

    const extract = {
      rating: weightedAvg,
      review_count: totalReviews,
      activity_count: activities.length,
      activity_total_found: activityUrls.length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        extract,
        data: {
          extract,
          data: { extract }, // backward compatibility with older UI parsing
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
