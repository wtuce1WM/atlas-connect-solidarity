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

// Google Places API - Find Place then get details
async function fetchGoogleReviews(businessName: string, city: string, googleMapsUrl: string | null): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    // Try to extract place_id from Google Maps URL first
    let placeId: string | null = null;
    
    if (googleMapsUrl) {
      // Try place_id pattern
      const placeIdMatch = googleMapsUrl.match(/place_id[=:]([A-Za-z0-9_-]+)/);
      if (placeIdMatch) {
        placeId = placeIdMatch[1];
      }
    }

    // If no place_id found, search by name + city
    if (!placeId) {
      const query = encodeURIComponent(`${businessName} ${city}`);
      const findRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id&key=${apiKey}`
      );
      const findData = await findRes.json();
      if (findData.candidates && findData.candidates.length > 0) {
        placeId = findData.candidates[0].place_id;
      }
    }

    if (!placeId) {
      console.log(`No Google Place found for: ${businessName} ${city}`);
      return { rating: null, count: null };
    }

    // Get place details
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${apiKey}`
    );
    const detailsData = await detailsRes.json();

    if (detailsData.result) {
      return {
        rating: detailsData.result.rating ?? null,
        count: detailsData.result.user_ratings_total ?? null,
      };
    }
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
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', prompt: 'Extract the overall rating (out of 5) and total number of reviews from this TripAdvisor page. Return as JSON with fields: rating (number), review_count (number).' }],
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    const jsonData = data?.data?.json || data?.json;

    if (jsonData) {
      return {
        rating: jsonData.rating ? parseFloat(jsonData.rating) : null,
        count: jsonData.review_count ? parseInt(jsonData.review_count) : null,
      };
    }
  } catch (e) {
    console.error('Firecrawl TripAdvisor error:', e);
  }
  return { rating: null, count: null };
}

// Firecrawl scraping for Restaurant Guru
async function fetchRestaurantGuruReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', prompt: 'Extract the overall rating (out of 5 or out of 10, normalize to out of 5) and total number of reviews from this Restaurant Guru page. Return as JSON with fields: rating (number out of 5), review_count (number).' }],
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    const jsonData = data?.data?.json || data?.json;

    if (jsonData) {
      return {
        rating: jsonData.rating ? parseFloat(jsonData.rating) : null,
        count: jsonData.review_count ? parseInt(jsonData.review_count) : null,
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

    // Create Supabase client with service role for writing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business data
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

    const results: ReviewResult = {};

    // Fetch reviews in parallel
    const promises: Promise<void>[] = [];

    // Google - always try (uses name + city search)
    promises.push(
      fetchGoogleReviews(business.name, business.city, business.google_maps_url).then(r => {
        results.google_rating = r.rating;
        results.google_review_count = r.count;
      })
    );

    // TripAdvisor - only if URL provided
    if (business.tripadvisor_review_url) {
      promises.push(
        fetchTripAdvisorReviews(business.tripadvisor_review_url).then(r => {
          results.tripadvisor_rating = r.rating;
          results.tripadvisor_review_count = r.count;
        })
      );
    }

    // Restaurant Guru - only if URL provided
    if (business.restaurant_guru_url) {
      promises.push(
        fetchRestaurantGuruReviews(business.restaurant_guru_url).then(r => {
          results.restaurant_guru_rating = r.rating;
          results.restaurant_guru_review_count = r.count;
        })
      );
    }

    await Promise.all(promises);

    // Build update object (only non-null values)
    const updateData: Record<string, any> = {};
    if (results.google_rating != null) updateData.google_rating = results.google_rating;
    if (results.google_review_count != null) updateData.google_review_count = results.google_review_count;
    if (results.tripadvisor_rating != null) updateData.tripadvisor_rating = results.tripadvisor_rating;
    if (results.tripadvisor_review_count != null) updateData.tripadvisor_review_count = results.tripadvisor_review_count;
    if (results.restaurant_guru_rating != null) updateData.restaurant_guru_rating = results.restaurant_guru_rating;
    if (results.restaurant_guru_review_count != null) updateData.restaurant_guru_review_count = results.restaurant_guru_review_count;

    // Update business if we got any data
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
