import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TA_BASE = 'https://api.content.tripadvisor.com/api/v1';

interface TAReview {
  id: number;
  lang: string;
  title: string;
  text: string;
  rating: number;
  published_date: string;
  user?: { username: string };
}

interface TAPhoto {
  id: number;
  images: {
    original?: { url: string };
    large?: { url: string };
    medium?: { url: string };
  };
}

async function taFetch(path: string, apiKey: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${TA_BASE}${path}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'fr');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  console.log(`TripAdvisor API: ${path}`);
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`TripAdvisor API error ${res.status}: ${text}`);
    return null;
  }
  return await res.json();
}

// Search for a location by name + coordinates
async function searchLocation(name: string, city: string, lat: number | null, lng: number | null, apiKey: string): Promise<{ locationId: string; name: string } | null> {
  const searchQuery = `${name} ${city}`;
  const params: Record<string, string> = { searchQuery };
  if (lat && lng) {
    params.latLong = `${lat},${lng}`;
  }

  const data = await taFetch('/location/search', apiKey, params);
  if (!data?.data?.length) {
    console.log(`No TripAdvisor location found for: ${searchQuery}`);
    return null;
  }

  // Filter out geo results (cities, countries, regions) — we only want businesses
  const validTypes = new Set(['restaurant', 'hotel', 'attraction', 'geoName']);
  const candidates = data.data.filter((loc: any) => {
    const cat = loc.address_obj?.category || '';
    // Exclude pure geographic entries (cities, countries, etc.)
    if (cat === 'geographic' || cat === 'geo') return false;
    return true;
  });

  if (!candidates.length) {
    console.log(`No non-geo TripAdvisor location found for: ${searchQuery}`);
    return null;
  }

  const loc = candidates[0];
  console.log(`Found TripAdvisor location: "${loc.name}" (ID: ${loc.location_id}, category: ${loc.address_obj?.category || 'unknown'})`);
  return { locationId: loc.location_id, name: loc.name };
}

// Get location details (rating, review count)
async function getLocationDetails(locationId: string, apiKey: string): Promise<{ rating: number | null; reviewCount: number | null; webUrl: string | null; writeReviewUrl: string | null }> {
  const data = await taFetch(`/location/${locationId}/details`, apiKey);
  if (!data) return { rating: null, reviewCount: null, webUrl: null, writeReviewUrl: null };

  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    reviewCount: data.num_reviews ? parseInt(data.num_reviews) : null,
    webUrl: data.web_url || null,
    writeReviewUrl: data.write_review || null,
  };
}

// Get reviews (up to 5 most recent)
async function getLocationReviews(locationId: string, apiKey: string): Promise<TAReview[]> {
  const data = await taFetch(`/location/${locationId}/reviews`, apiKey);
  if (!data?.data) return [];
  return data.data;
}

// Get photos (up to 5)
async function getLocationPhotos(locationId: string, apiKey: string): Promise<string[]> {
  const data = await taFetch(`/location/${locationId}/photos`, apiKey);
  if (!data?.data) return [];

  return data.data
    .map((p: TAPhoto) => p.images?.original?.url || p.images?.large?.url || p.images?.medium?.url)
    .filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get('TRIPADVISOR_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'TRIPADVISOR_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { business_id, skip_photos } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business info
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('name, city, latitude, longitude, tripadvisor_location_id, tripadvisor_review_url, images')
      .eq('id', business_id)
      .single();

    if (fetchError || !business) {
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`TripAdvisor sync for: "${business.name}" in ${business.city}`);

    // Step 1: Resolve location_id (use cached or search)
    let locationId = business.tripadvisor_location_id;

    if (!locationId) {
      const result = await searchLocation(
        business.name,
        business.city || '',
        business.latitude,
        business.longitude,
        apiKey
      );
      if (!result) {
        return new Response(
          JSON.stringify({ success: false, error: 'No TripAdvisor location found', searched: `${business.name} ${business.city}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      locationId = result.locationId;

      // Cache the location_id for future use
      await supabase.from('businesses').update({ tripadvisor_location_id: locationId }).eq('id', business_id);
      console.log(`Cached tripadvisor_location_id: ${locationId}`);
    } else {
      console.log(`Using cached tripadvisor_location_id: ${locationId}`);
    }

    // Step 2: Fetch details + reviews + photos in parallel
    const [details, reviews, photos] = await Promise.all([
      getLocationDetails(locationId, apiKey),
      getLocationReviews(locationId, apiKey),
      skip_photos ? Promise.resolve([]) : getLocationPhotos(locationId, apiKey),
    ]);

    // Step 3: Update business ratings
    const updateData: Record<string, any> = {};
    if (details.rating != null) updateData.tripadvisor_rating = details.rating;
    if (details.reviewCount != null) updateData.tripadvisor_review_count = details.reviewCount;
    if (details.webUrl) updateData.tripadvisor_url = details.webUrl;
    if (details.writeReviewUrl) updateData.tripadvisor_review_url = details.writeReviewUrl;

    // Step 4: Append new photos to existing images (NEVER overwrite)
    let newPhotosCount = 0;
    if (photos.length > 0) {
      const existingImages: string[] = business.images || [];
      // Only add photos not already in the images array
      const newPhotos = photos.filter((url: string) => !existingImages.includes(url));
      if (newPhotos.length > 0) {
        updateData.images = [...existingImages, ...newPhotos];
        newPhotosCount = newPhotos.length;
        console.log(`Appending ${newPhotosCount} new TripAdvisor photos (existing: ${existingImages.length})`);
      } else {
        console.log('All TripAdvisor photos already exist in images array');
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase.from('businesses').update(updateData).eq('id', business_id);
      if (updateError) console.error('Error updating business:', updateError);
    }

    // Step 5: Save review texts (deduplicate)
    let newReviewsCount = 0;
    if (reviews.length > 0) {
      const reviewRows = reviews
        .filter((r: TAReview) => r.text)
        .map((r: TAReview) => ({
          business_id,
          source: 'tripadvisor',
          author_name: r.user?.username || null,
          rating: r.rating ?? null,
          text: r.text,
          relative_time: r.published_date || null,
          language: r.lang || null,
        }));

      if (reviewRows.length > 0) {
        const { data: existing } = await supabase
          .from('reviews')
          .select('author_name, source')
          .eq('business_id', business_id)
          .eq('source', 'tripadvisor');

        const existingKeys = new Set(
          (existing || []).map((e: any) => `${e.source}::${e.author_name}`)
        );
        const toInsert = reviewRows.filter(r => !existingKeys.has(`tripadvisor::${r.author_name}`));

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase.from('reviews').insert(toInsert);
          if (insertError) console.error('Error inserting reviews:', insertError);
          else {
            newReviewsCount = toInsert.length;
            console.log(`Saved ${newReviewsCount} new TripAdvisor reviews`);
          }
        } else {
          console.log('All TripAdvisor reviews already exist');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        location_id: locationId,
        rating: details.rating,
        review_count: details.reviewCount,
        new_reviews: newReviewsCount,
        new_photos: newPhotosCount,
        total_photos_fetched: photos.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tripadvisor-sync:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
