const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReviewResult {
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_rating?: number | null;
  restaurant_guru_review_count?: number | null;
}

// Extract coordinates from Google Maps URL
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Pattern: @31.6254736,-8.0030928
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

// Google Places API (New)
async function fetchGoogleReviews(businessName: string, city: string, googleMapsUrl: string | null): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    // Use Text Search (New) API directly — returns rating in one call
    const simplifiedName = businessName.replace(/\s+by\s+.*/i, '').trim();
    const queries = [
      `${businessName} ${city}`,
      `${simplifiedName} ${city}`,
    ];

    for (const q of queries) {
      console.log(`Google Text Search (New): "${q}"`);
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.displayName',
        },
        body: JSON.stringify({ textQuery: q }),
      });
      const data = await res.json();
      console.log(`Google response:`, JSON.stringify(data).substring(0, 500));

      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        console.log(`Found: "${place.displayName?.text}" - rating=${place.rating}, count=${place.userRatingCount}`);
        return {
          rating: place.rating ?? null,
          count: place.userRatingCount ?? null,
        };
      }
    }

    console.log(`No Google Place found for: ${businessName} ${city}`);
  } catch (e) {
    console.error('Google Places API error:', e);
  }
  return { rating: null, count: null };
}

// Firecrawl scraping for TripAdvisor
async function fetchTripAdvisorReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    console.log(`Scraping TripAdvisor: ${url}`);
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
          prompt: 'Extract the overall rating (out of 5, as a decimal like 4.5) and total number of reviews from this TripAdvisor page.',
          schema: {
            type: 'object',
            properties: {
              rating: { type: 'number', description: 'Overall rating out of 5' },
              review_count: { type: 'number', description: 'Total number of reviews' },
            },
          },
        },
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    console.log('TripAdvisor Firecrawl response:', JSON.stringify(data).substring(0, 500));

    const extracted = data?.data?.extract;
    if (extracted) {
      return {
        rating: extracted.rating ? parseFloat(String(extracted.rating)) : null,
        count: extracted.review_count ? parseInt(String(extracted.review_count)) : null,
      };
    }
  } catch (e) {
    console.error('Firecrawl TripAdvisor error:', e);
  }
  return { rating: null, count: null };
}

// Firecrawl scraping for Restaurant Guru
async function fetchRestaurantGuruReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  // Only process actual restaurant guru URLs
  if (!url.includes('restaurantguru.com')) {
    console.log(`Skipping non-Restaurant Guru URL: ${url}`);
    return { rating: null, count: null };
  }

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    console.log(`Scraping Restaurant Guru: ${url}`);
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
          prompt: 'Extract the overall rating (normalize to out of 5 if needed) and total number of reviews from this Restaurant Guru page.',
          schema: {
            type: 'object',
            properties: {
              rating: { type: 'number', description: 'Overall rating out of 5' },
              review_count: { type: 'number', description: 'Total number of reviews' },
            },
          },
        },
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    console.log('Restaurant Guru Firecrawl response:', JSON.stringify(data).substring(0, 500));

    const extracted = data?.data?.extract;
    if (extracted) {
      return {
        rating: extracted.rating ? parseFloat(String(extracted.rating)) : null,
        count: extracted.review_count ? parseInt(String(extracted.review_count)) : null,
      };
    }
  } catch (e) {
    console.error('Firecrawl Restaurant Guru error:', e);
  }
  return { rating: null, count: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('name, city, google_maps_url, google_reviews_url, tripadvisor_review_url, restaurant_guru_url')
      .eq('id', business_id)
      .single();

    if (fetchError || !business) {
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching reviews for: "${business.name}" in ${business.city}`);
    console.log(`URLs: maps=${business.google_maps_url ? 'yes' : 'no'}, tripadvisor=${business.tripadvisor_review_url ? 'yes' : 'no'}, guru=${business.restaurant_guru_url ? 'yes' : 'no'}`);

    const results: ReviewResult = {};
    const promises: Promise<void>[] = [];

    promises.push(
      fetchGoogleReviews(business.name, business.city, business.google_maps_url).then(r => {
        results.google_rating = r.rating;
        results.google_review_count = r.count;
      })
    );

    if (business.tripadvisor_review_url) {
      promises.push(
        fetchTripAdvisorReviews(business.tripadvisor_review_url).then(r => {
          results.tripadvisor_rating = r.rating;
          results.tripadvisor_review_count = r.count;
        })
      );
    }

    if (business.restaurant_guru_url) {
      promises.push(
        fetchRestaurantGuruReviews(business.restaurant_guru_url).then(r => {
          results.restaurant_guru_rating = r.rating;
          results.restaurant_guru_review_count = r.count;
        })
      );
    }

    await Promise.all(promises);

    console.log('Results:', JSON.stringify(results));

    const updateData: Record<string, any> = {};
    if (results.google_rating != null) updateData.google_rating = results.google_rating;
    if (results.google_review_count != null) updateData.google_review_count = results.google_review_count;
    if (results.tripadvisor_rating != null) updateData.tripadvisor_rating = results.tripadvisor_rating;
    if (results.tripadvisor_review_count != null) updateData.tripadvisor_review_count = results.tripadvisor_review_count;
    if (results.restaurant_guru_rating != null) updateData.restaurant_guru_rating = results.restaurant_guru_rating;
    if (results.restaurant_guru_review_count != null) updateData.restaurant_guru_review_count = results.restaurant_guru_review_count;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', business_id);

      if (updateError) {
        console.error('Error updating business:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update business', details: updateError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results, updated: Object.keys(updateData) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-reviews:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
