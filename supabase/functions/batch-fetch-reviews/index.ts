const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

interface ReviewText {
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  relative_time: string | null;
  language: string | null;
  published_at: string | null;
}

// Extract exact place coordinates (!3d lat !4d lng) or fallback to @lat,lng
function extractExactCoordsFromGoogleUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    const latMatch = url.match(/!3d(-?\d+\.?\d*)/);
    const lngMatch = url.match(/!4d(-?\d+\.?\d*)/);
    if (latMatch && lngMatch) {
      const lat = parseFloat(latMatch[1]);
      const lng = parseFloat(lngMatch[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } catch (_) { /* ignore */ }
  return null;
}

// Extract place name from URL path
function extractPlaceNameFromGoogleUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/place\/([^/@]+)/);
    if (match) return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch (_) { /* ignore */ }
  return null;
}

// Fetch reviews from a Place ID
async function fetchReviewsFromPlaceId(placeId: string, apiKey: string): Promise<ReviewText[]> {
  const reviewTexts: ReviewText[] = [];
  try {
    const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews.rating,reviews.text,reviews.authorAttribution,reviews.relativePublishTimeDescription,reviews.publishTime' },
    });
    const detailData = await detailRes.json();
    if (detailData.reviews) {
      for (const r of detailData.reviews.slice(0, 5)) {
        reviewTexts.push({
          source: 'google',
          author_name: r.authorAttribution?.displayName || null,
          rating: r.rating ?? null,
          text: r.text?.text || null,
          relative_time: r.relativePublishTimeDescription || null,
          language: r.text?.languageCode || null,
          published_at: r.publishTime || null,
        });
      }
    }
  } catch (_) { /* ignore */ }
  return reviewTexts;
}

// Search Google Places
async function searchGooglePlace(query: string, coords: { lat: number; lng: number } | null, radius: number, apiKey: string): Promise<{ id: string; rating: number | null; count: number | null } | null> {
  const requestBody: Record<string, any> = { textQuery: query };
  if (coords) {
    requestBody.locationBias = {
      circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius },
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
    return { id: place.id, rating: place.rating ?? null, count: place.userRatingCount ?? null };
  }
  return null;
}

// Main: URL place name + exact coords (50m) → DB name + exact coords (100m) → fallback (500m)
async function fetchGoogleForBusiness(name: string, city: string | null, googleMapsUrl: string | null, apiKey: string): Promise<{ rating: number | null; count: number | null; reviews: ReviewText[] }> {
  const exactCoords = extractExactCoordsFromGoogleUrl(googleMapsUrl);
  const urlPlaceName = extractPlaceNameFromGoogleUrl(googleMapsUrl);
  const cityQuerySuffix = city ? ` ${city}` : '';

  if (urlPlaceName && exactCoords) {
    const place = await searchGooglePlace(`${urlPlaceName}${cityQuerySuffix}`, exactCoords, 50.0, apiKey);
    if (place) {
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      return { rating: place.rating, count: place.count, reviews };
    }
  }

  if (exactCoords) {
    const place = await searchGooglePlace(`${name}${cityQuerySuffix}`, exactCoords, 100.0, apiKey);
    if (place) {
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      return { rating: place.rating, count: place.count, reviews };
    }
  }

  const queries = [`${name}${cityQuerySuffix}`, `${name.replace(/\s+by\s+.*/i, '').trim()}${cityQuerySuffix}`];
  for (const q of queries) {
    const place = await searchGooglePlace(q, exactCoords, 500.0, apiKey);
    if (place) {
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      return { rating: place.rating, count: place.count, reviews };
    }
  }

  return { rating: null, count: null, reviews: [] };
}

// Translate an array of review texts to a target language using Lovable AI
async function translateReviews(texts: string[], targetLang: 'fr' | 'en', lovableApiKey: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const langLabel = targetLang === 'fr' ? 'français' : 'anglais';
  const textsBlock = texts.map((t, i) => `[${i}] ${t}`).join('\n---\n');

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Tu es un traducteur professionnel. Traduis chaque avis client en ${langLabel}. Conserve le ton et le style. Renvoie UNIQUEMENT un JSON array de strings dans le même ordre. Exemple: ["traduction 1", "traduction 2"]`,
          },
          { role: 'user', content: textsBlock },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Translation API error (${targetLang}):`, response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.error(`Translation error (${targetLang}):`, e);
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { offset = 0, limit = 20 } = await req.json().catch(() => ({}));

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GOOGLE_MAPS_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    const results: { name: string; status: string; google_rating?: number | null; reviews?: number; translated?: number }[] = [];

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

          let insertedCount = 0;
          let translatedCount = 0;

          if (g.reviews.length > 0) {
            const newRows = g.reviews.filter(r => r.text).map(r => ({
              business_id: biz.id, source: r.source, author_name: r.author_name,
              rating: r.rating, text: r.text, relative_time: r.relative_time, language: r.language,
              published_at: r.published_at,
            }));
            // Deduplicate: only insert reviews not already in DB (by author_name + source)
            if (newRows.length > 0) {
              const { data: existing } = await supabase.from('reviews')
                .select('author_name, source')
                .eq('business_id', biz.id);
              const existingKeys = new Set(
                (existing || []).map(e => `${e.source}::${e.author_name}`)
              );
              const toInsert = newRows.filter(r => !existingKeys.has(`${r.source}::${r.author_name}`));
              if (toInsert.length > 0) {
                await supabase.from('reviews').insert(toInsert);
                insertedCount = toInsert.length;
              }
            }
          }

          // Translate reviews missing text_fr or text_en
          if (lovableApiKey) {
            const { data: untranslated } = await supabase
              .from('reviews')
              .select('id, text, language')
              .eq('business_id', biz.id)
              .not('text', 'is', null)
              .or('text_fr.is.null,text_en.is.null');

            if (untranslated && untranslated.length > 0) {
              const texts = untranslated.map(r => r.text!);

              // Determine which languages need translation
              const needsFr = untranslated.some(r => !(r as any).text_fr);
              const needsEn = untranslated.some(r => !(r as any).text_en);

              const [frTranslations, enTranslations] = await Promise.all([
                needsFr ? translateReviews(texts, 'fr', lovableApiKey) : [],
                needsEn ? translateReviews(texts, 'en', lovableApiKey) : [],
              ]);

              for (let j = 0; j < untranslated.length; j++) {
                const review = untranslated[j];
                const lang = (review.language || '').toLowerCase();
                const updateFields: Record<string, string> = {};

                // For text_fr: if original is already French, use original text
                if (lang === 'fr' || lang.startsWith('fr')) {
                  updateFields.text_fr = review.text!;
                } else if (frTranslations[j]) {
                  updateFields.text_fr = frTranslations[j];
                }

                // For text_en: if original is already English, use original text
                if (lang === 'en' || lang.startsWith('en')) {
                  updateFields.text_en = review.text!;
                } else if (enTranslations[j]) {
                  updateFields.text_en = enTranslations[j];
                }

                if (Object.keys(updateFields).length > 0) {
                  await supabase.from('reviews').update(updateFields).eq('id', review.id);
                  translatedCount++;
                }
              }
            }
          }

          return { name: biz.name, status: 'ok', google_rating: g.rating, reviews: g.reviews.length, translated: translatedCount };
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
