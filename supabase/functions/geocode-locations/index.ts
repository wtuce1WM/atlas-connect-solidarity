import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function geocode(name: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${name}, Maroc`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
    return data.results[0].formatted_address;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { mode, name, context } = body;
    // mode: "single" (geocode one name) or "batch" (geocode all missing GPS)

    if (mode === 'reverse') {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return new Response(JSON.stringify({ error: 'lat and lng are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const address = await reverseGeocode(lat, lng, apiKey);
      if (address) {
        return new Response(JSON.stringify({ address }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Address not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'single') {
      if (!name) {
        return new Response(JSON.stringify({ error: 'name is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const searchName = context ? `${name}, ${context}` : name;
      const query = encodeURIComponent(`${searchName}, Maroc`);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return new Response(JSON.stringify({ lat: loc.lat, lng: loc.lng }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Location not found', status: data.status }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Batch mode
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = { cities: 0, destinations: 0, points_of_interest: 0, businesses: 0, errors: [] as string[] };

    // If a city filter is provided, only geocode businesses in that city
    const cityFilter = body.city_filter as string | undefined;

    // Businesses without GPS (or filtered by city)
    if (mode === 'batch-businesses' || mode === 'batch') {
      let bizQuery = supabase
        .from('businesses')
        .select('id, name, city, address')
        .eq('is_active', true);

      if (mode === 'batch-businesses') {
        // Re-geocode ALL businesses in the specified city (even those with existing GPS)
        if (cityFilter) {
          bizQuery = bizQuery.ilike('city', cityFilter);
        } else {
          bizQuery = bizQuery.or('latitude.is.null,longitude.is.null');
        }
      } else {
        bizQuery = bizQuery.or('latitude.is.null,longitude.is.null');
      }

      const { data: bizData } = await bizQuery;

      for (const biz of bizData || []) {
        const searchName = biz.address
          ? `${biz.name}, ${biz.address}, ${biz.city || 'Maroc'}`
          : `${biz.name}, ${biz.city || 'Maroc'}`;
        const coords = await geocode(searchName, apiKey);
        if (coords) {
          await supabase.from('businesses').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', biz.id);
          results.businesses++;
        } else {
          results.errors.push(`Business: ${biz.name}`);
        }
      }

      if (mode === 'batch-businesses') {
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cities without GPS
    const { data: citiesData } = await supabase
      .from('cities')
      .select('id, name_fr')
      .or('latitude.is.null,longitude.is.null');

    for (const city of citiesData || []) {
      const coords = await geocode(city.name_fr, apiKey);
      if (coords) {
        await supabase.from('cities').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', city.id);
        results.cities++;
      } else {
        results.errors.push(`City: ${city.name_fr}`);
      }
    }

    // Destinations without GPS
    const { data: destsData } = await supabase
      .from('destinations')
      .select('id, name_fr')
      .or('latitude.is.null,longitude.is.null');

    for (const dest of destsData || []) {
      const coords = await geocode(dest.name_fr, apiKey);
      if (coords) {
        await supabase.from('destinations').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', dest.id);
        results.destinations++;
      } else {
        results.errors.push(`Destination: ${dest.name_fr}`);
      }
    }

    // POIs without GPS
    const { data: poisData } = await supabase
      .from('points_of_interest')
      .select('id, name_fr, city_id')
      .or('latitude.is.null,longitude.is.null');

    const cityIds = [...new Set((poisData || []).map(p => p.city_id))];
    const { data: cityNames } = cityIds.length > 0
      ? await supabase.from('cities').select('id, name_fr').in('id', cityIds)
      : { data: [] };
    const cityMap = Object.fromEntries((cityNames || []).map(c => [c.id, c.name_fr]));

    for (const poi of poisData || []) {
      const cityName = cityMap[poi.city_id] || '';
      const searchName = cityName ? `${poi.name_fr}, ${cityName}` : poi.name_fr;
      const coords = await geocode(searchName, apiKey);
      if (coords) {
        await supabase.from('points_of_interest').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', poi.id);
        results.points_of_interest++;
      } else {
        results.errors.push(`POI: ${poi.name_fr}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Geocode error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
