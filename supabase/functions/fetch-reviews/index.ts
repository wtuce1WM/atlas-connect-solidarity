const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "npm:@supabase/supabase-js@2";

interface ReviewResult {
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_rating?: number | null;
  restaurant_guru_review_count?: number | null;
  getyourguide_rating?: number | null;
  getyourguide_review_count?: number | null;
  viator_rating?: number | null;
  viator_review_count?: number | null;
}

interface ReviewText {
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  relative_time: string | null;
  language: string | null;
}

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

function extractPlaceNameFromGoogleUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/place\/([^\/@]+)/);
    if (match) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  } catch (_) { /* ignore */ }
  return null;
}

async function fetchReviewsFromPlaceId(placeId: string, apiKey: string): Promise<ReviewText[]> {
  const reviewTexts: ReviewText[] = [];
  try {
    const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
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
  } catch (_) { /* ignore */ }
  return reviewTexts;
}

async function searchGooglePlace(query: string, coords: { lat: number; lng: number } | null, radius: number, apiKey: string, useRestriction = false): Promise<{ id: string; rating: number | null; count: number | null; displayName: string } | null> {
  const requestBody: Record<string, any> = { textQuery: query };
  if (coords) {
    if (useRestriction) {
      const delta = radius / 111000;
      requestBody.locationRestriction = {
        rectangle: {
          low: { latitude: coords.lat - delta, longitude: coords.lng - delta },
          high: { latitude: coords.lat + delta, longitude: coords.lng + delta },
        },
      };
    } else {
      requestBody.locationBias = {
        circle: {
          center: { latitude: coords.lat, longitude: coords.lng },
          radius,
        },
      };
    }
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
    return {
      id: place.id,
      rating: place.rating ?? null,
      count: place.userRatingCount ?? null,
      displayName: place.displayName?.text || '?',
    };
  }
  return null;
}

async function fetchGoogleReviews(businessName: string, city: string, googleMapsUrl: string | null): Promise<{ rating: number | null; count: number | null; reviews: ReviewText[] }> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return { rating: null, count: null, reviews: [] };
  }

  const exactCoords = extractExactCoordsFromGoogleUrl(googleMapsUrl);
  const urlPlaceName = extractPlaceNameFromGoogleUrl(googleMapsUrl);

  if (urlPlaceName && exactCoords) {
    console.log(`Strategy 1: URL place name "${urlPlaceName} ${city}" with restriction @${exactCoords.lat},${exactCoords.lng} (200m)`);
    const place = await searchGooglePlace(`${urlPlaceName} ${city}`, exactCoords, 200.0, apiKey, true);
    if (place) {
      console.log(`Found: "${place.displayName}" - rating=${place.rating}, count=${place.count}`);
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      if (reviews.length > 0) console.log(`Got ${reviews.length} Google review texts`);
      return { rating: place.rating, count: place.count, reviews };
    }
    console.log('Strategy 1 failed, trying strategy 2');
  }

  if (exactCoords) {
    console.log(`Strategy 2: DB name "${businessName}" with exact coords @${exactCoords.lat},${exactCoords.lng} (100m radius)`);
    const place = await searchGooglePlace(`${businessName} ${city}`, exactCoords, 100.0, apiKey);
    if (place) {
      console.log(`Found: "${place.displayName}" - rating=${place.rating}, count=${place.count}`);
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      if (reviews.length > 0) console.log(`Got ${reviews.length} Google review texts`);
      return { rating: place.rating, count: place.count, reviews };
    }
    console.log('Strategy 2 failed, trying strategy 3');
  }

  const simplifiedName = businessName.replace(/\s+by\s+.*/i, '').trim();
  const queries = [
    `${businessName} ${city}`,
    `${simplifiedName} ${city}`,
  ];

  for (const q of queries) {
    console.log(`Strategy 3 [Fallback]: "${q}"`);
    const place = await searchGooglePlace(q, exactCoords, 500.0, apiKey);
    if (place) {
      console.log(`[Fallback] Found: "${place.displayName}" - rating=${place.rating}, count=${place.count}`);
      const reviews = await fetchReviewsFromPlaceId(place.id, apiKey);
      if (reviews.length > 0) console.log(`[Fallback] Got ${reviews.length} Google review texts`);
      return { rating: place.rating, count: place.count, reviews };
    }
  }

  console.log(`No Google Place found for: ${businessName} ${city}`);
  return { rating: null, count: null, reviews: [] };
}

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

async function fetchRestaurantGuruReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  if (!url.includes('restaurantguru.com')) {
    return { rating: null, count: null };
  }

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
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

// Firecrawl scraping for GetYourGuide
async function fetchGetYourGuideReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { rating: null, count: null };
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
          prompt: 'Extract the overall rating (out of 5, as a decimal like 4.5) and total number of reviews from this GetYourGuide activity page.',
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
    console.log('GetYourGuide Firecrawl response:', JSON.stringify(data).substring(0, 500));

    const extracted = data?.data?.extract;
    if (extracted) {
      return {
        rating: extracted.rating ? parseFloat(String(extracted.rating)) : null,
        count: extracted.review_count ? parseInt(String(extracted.review_count)) : null,
      };
    }
  } catch (e) {
    console.error('Firecrawl GetYourGuide error:', e);
  }
  return { rating: null, count: null };
}

// Firecrawl scraping for Viator
async function fetchViatorReviews(url: string): Promise<{ rating: number | null; count: number | null }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { rating: null, count: null };
  }

  try {
    console.log(`Scraping Viator: ${url}`);
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
          prompt: 'Extract the overall rating (out of 5, as a decimal like 4.5) and total number of reviews from this Viator activity page.',
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
    console.log('Viator Firecrawl response:', JSON.stringify(data).substring(0, 500));

    const extracted = data?.data?.extract;
    if (extracted) {
      return {
        rating: extracted.rating ? parseFloat(String(extracted.rating)) : null,
        count: extracted.review_count ? parseInt(String(extracted.review_count)) : null,
      };
    }
  } catch (e) {
    console.error('Firecrawl Viator error:', e);
  }
  return { rating: null, count: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, google_only } = await req.json();

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
      .select('name, city, google_maps_url, google_reviews_url, tripadvisor_review_url, restaurant_guru_url, getyourguide_url, viator_url')
      .eq('id', business_id)
      .single();

    if (fetchError || !business) {
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching reviews for: "${business.name}" in ${business.city}`);

    const results: ReviewResult = {};
    let googleReviewTexts: ReviewText[] = [];
    const promises: Promise<void>[] = [];

    promises.push(
      fetchGoogleReviews(business.name, business.city, business.google_maps_url).then(r => {
        results.google_rating = r.rating;
        results.google_review_count = r.count;
        googleReviewTexts = r.reviews;
      })
    );

    if (!google_only && business.tripadvisor_review_url) {
      promises.push(
        fetchTripAdvisorReviews(business.tripadvisor_review_url).then(r => {
          results.tripadvisor_rating = r.rating;
          results.tripadvisor_review_count = r.count;
        })
      );
    }

    if (!google_only && business.restaurant_guru_url) {
      promises.push(
        fetchRestaurantGuruReviews(business.restaurant_guru_url).then(r => {
          results.restaurant_guru_rating = r.rating;
          results.restaurant_guru_review_count = r.count;
        })
      );
    }

    if (!google_only && business.getyourguide_url) {
      promises.push(
        fetchGetYourGuideReviews(business.getyourguide_url).then(r => {
          results.getyourguide_rating = r.rating;
          results.getyourguide_review_count = r.count;
        })
      );
    }

    if (!google_only && business.viator_url) {
      promises.push(
        fetchViatorReviews(business.viator_url).then(r => {
          results.viator_rating = r.rating;
          results.viator_review_count = r.count;
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
    if (results.getyourguide_rating != null) updateData.getyourguide_rating = results.getyourguide_rating;
    if (results.getyourguide_review_count != null) updateData.getyourguide_review_count = results.getyourguide_review_count;
    if (results.viator_rating != null) updateData.viator_rating = results.viator_rating;
    if (results.viator_review_count != null) updateData.viator_review_count = results.viator_review_count;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', business_id);
      if (updateError) console.error('Error updating business:', updateError);
    }

    if (googleReviewTexts.length > 0) {
      const reviewRows = googleReviewTexts
        .filter(r => r.text)
        .map(r => ({
          business_id, source: r.source, author_name: r.author_name,
          rating: r.rating, text: r.text, relative_time: r.relative_time, language: r.language,
        }));
      if (reviewRows.length > 0) {
        // Deduplicate: only insert reviews not already in DB (by author_name + source)
        const { data: existing } = await supabase.from('reviews')
          .select('author_name, source')
          .eq('business_id', business_id);
        const existingKeys = new Set(
          (existing || []).map((e: any) => `${e.source}::${e.author_name}`)
        );
        const toInsert = reviewRows.filter(r => !existingKeys.has(`${r.source}::${r.author_name}`));
        if (toInsert.length > 0) {
          const { error: insertError } = await supabase.from('reviews').insert(toInsert);
          if (insertError) console.error('Error inserting reviews:', insertError);
          else console.log(`Saved ${toInsert.length} new review texts (${reviewRows.length - toInsert.length} duplicates skipped)`);
        } else {
          console.log(`All ${reviewRows.length} reviews already exist, skipped`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results, updated: Object.keys(updateData), reviews_saved: googleReviewTexts.length }),
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
