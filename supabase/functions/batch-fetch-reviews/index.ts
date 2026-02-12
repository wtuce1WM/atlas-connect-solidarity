const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "npm:@supabase/supabase-js@2";

interface ReviewText {
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  relative_time: string | null;
  language: string | null;
}

// Extract lat/lng from a Google Maps URL
function extractCoordsFromGoogleUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } catch (_) { /* ignore */ }
  return null;
}

async function fetchGoogleForBusiness(name: string, city: string, googleMapsUrl: string | null, apiKey: string): Promise<{ rating: number | null; count: number | null; reviews: ReviewText[] }> {
  try {
    const coords = extractCoordsFromGoogleUrl(googleMapsUrl);
    const queries = [
      `${name} ${city}`,
      `${name.replace(/\s+by\s+.*/i, '').trim()} ${city}`,
    ];

    for (const q of queries) {
      const requestBody: Record<string, any> = { textQuery: q };
      
      if (coords) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: 500.0,
          },
        };
      }

      const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.rating,places.userRatingCount,places.displayName',
        },
        body: JSON.stringify(requestBody),
      });
      const searchData = await searchRes.json();

      if (searchData.places && searchData.places.length > 0) {
        const place = searchData.places[0];
        const rating = place.rating ?? null;
        const count = place.userRatingCount ?? null;
        const reviewTexts: ReviewText[] = [];

        if (place.id) {
          try {
            const detailRes = await fetch(`https://places.googleapis.com/v1/places/${place.id}`, {
              method: 'GET',
              headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'reviews',
              },
            });
            const detailData = await detailRes.json();
            if (detailData.reviews) {
              for (const r of detailData.reviews.slice(0, 3)) {
                reviewTexts.push({
                  source: 'google',
                  author_name: r.authorAttribution?.displayName || null,
                  rating: r.rating ?? null,
                  text: r.text?.text || null,
                  relative_time: r.relativePublishTimeDescription || null,
                  language: r.text?.languageCode || null,
                });
              }
            }
          } catch (_) { /* ignore detail errors */ }
        }

        return { rating, count, reviews: reviewTexts };
      }
    }
  } catch (_) { /* ignore */ }
  return { rating: null, count: null, reviews: [] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, limit = 20 } = await req.json().catch(() => ({}));

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GOOGLE_MAPS_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count: total } = await supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('google_maps_url.not.is.null,tripadvisor_review_url.not.is.null,restaurant_guru_url.not.is.null');

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, city, google_maps_url')
      .eq('is_active', true)
      .or('google_maps_url.not.is.null,tripadvisor_review_url.not.is.null,restaurant_guru_url.not.is.null')
      .order('name')
      .range(offset, offset + limit - 1);

    if (error || !businesses) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch businesses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Batch: offset=${offset}, limit=${limit}, got ${businesses.length} businesses (total=${total})`);

    const results: { name: string; status: string; google_rating?: number | null; reviews?: number }[] = [];

    for (let i = 0; i < businesses.length; i += 3) {
      const chunk = businesses.slice(i, i + 3);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (biz) => {
          const g = await fetchGoogleForBusiness(biz.name, biz.city, biz.google_maps_url, apiKey);

          const updateData: Record<string, any> = {};
          if (g.rating != null) updateData.google_rating = g.rating;
          if (g.count != null) updateData.google_review_count = g.count;
          if (Object.keys(updateData).length > 0) {
            await supabase.from('businesses').update(updateData).eq('id', biz.id);
          }

          if (g.reviews.length > 0) {
            await supabase.from('reviews').delete().eq('business_id', biz.id);
            const rows = g.reviews.filter(r => r.text).map(r => ({
              business_id: biz.id, source: r.source, author_name: r.author_name,
              rating: r.rating, text: r.text, relative_time: r.relative_time, language: r.language,
            }));
            if (rows.length > 0) await supabase.from('reviews').insert(rows);
          }

          return { name: biz.name, status: 'ok', google_rating: g.rating, reviews: g.reviews.length };
        })
      );

      for (const r of chunkResults) {
        results.push(r.status === 'fulfilled' ? r.value : { name: '?', status: 'error' });
      }
    }

    const succeeded = results.filter(r => r.status === 'ok').length;
    const nextOffset = offset + limit;
    const hasMore = nextOffset < (total || 0);

    console.log(`Done: ${succeeded}/${businesses.length} OK. hasMore=${hasMore}`);

    return new Response(
      JSON.stringify({ success: true, total, offset, limit, succeeded, failed: businesses.length - succeeded, hasMore, nextOffset: hasMore ? nextOffset : null, details: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
