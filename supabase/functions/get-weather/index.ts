import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";
import { resolveCityCoords } from "../_shared/resolve-city-coords.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

  try {
    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!apiKey) throw new Error('Weather API key not configured');

    const { city } = await req.json();
    if (!city) {
      return new Response(JSON.stringify({ error: 'City is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching weather for city: ${city}`);

    let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},MA&appid=${apiKey}&units=metric&lang=fr`;
    let response = await fetch(weatherUrl);
    let data = await response.json();

    if (!response.ok) {
      const resolved = await resolveCityCoords(city);
      if (resolved) {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${resolved.lat}&lon=${resolved.lon}&appid=${apiKey}&units=metric&lang=fr`;
        response = await fetch(weatherUrl);
        data = await response.json();
        if (response.ok) data.name = resolved.name;
      }
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Weather data not available' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch 5-day / 3h forecast using coords from the current-weather response
    const lat = data.coord?.lat;
    const lon = data.coord?.lon;
    let hourly: any[] = [];
    let daily: any[] = [];
    if (lat != null && lon != null) {
      try {
        const fUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=fr`;
        const fRes = await fetch(fUrl);
        if (fRes.ok) {
          const fData = await fRes.json();
          const list: any[] = fData.list || [];
          // Hourly: next 8 slots (24h, 3h step)
          hourly = list.slice(0, 8).map((it) => ({
            time: it.dt_txt,
            hour: new Date(it.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' }),
            temp: Math.round(it.main.temp),
            feels_like: Math.round(it.main.feels_like),
            description: it.weather?.[0]?.description || '',
            icon: it.weather?.[0]?.icon || '',
            wind_speed: Math.round((it.wind?.speed || 0) * 3.6),
            pop: Math.round((it.pop || 0) * 100),
          }));
          // Daily aggregation
          const byDay = new Map<string, any[]>();
          for (const it of list) {
            const d = new Date(it.dt * 1000).toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' });
            if (!byDay.has(d)) byDay.set(d, []);
            byDay.get(d)!.push(it);
          }
          daily = Array.from(byDay.entries()).slice(0, 5).map(([date, items]) => {
            const temps = items.map((i) => i.main.temp);
            const noon = items.find((i) => i.dt_txt.includes('12:00:00')) || items[Math.floor(items.length / 2)];
            return {
              date,
              temp_min: Math.round(Math.min(...temps)),
              temp_max: Math.round(Math.max(...temps)),
              description: noon.weather?.[0]?.description || '',
              icon: noon.weather?.[0]?.icon || '',
              pop_max: Math.round(Math.max(...items.map((i) => (i.pop || 0) * 100))),
            };
          });
        }
      } catch (e) {
        console.error('Forecast fetch failed:', e);
      }
    }

    const weatherInfo = {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      description: data.weather[0]?.description || '',
      icon: data.weather[0]?.icon || '',
      wind_speed: Math.round(data.wind.speed * 3.6),
      city_name: data.name,
      hourly,
      daily,
    };

    return new Response(JSON.stringify(weatherInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching weather:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch weather data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
