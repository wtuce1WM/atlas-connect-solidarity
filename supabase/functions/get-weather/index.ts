import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!apiKey) {
      console.error('OPENWEATHERMAP_API_KEY is not configured');
      throw new Error('Weather API key not configured');
    }

    const { city } = await req.json();
    
    if (!city) {
      return new Response(
        JSON.stringify({ error: 'City is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather for city: ${city}`);

    // Try by city name first
    let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},MA&appid=${apiKey}&units=metric&lang=fr`;
    let response = await fetch(weatherUrl);
    let data = await response.json();

    // If city name not found, fallback to coordinates from DB
    if (!response.ok && data.cod === "404") {
      console.log(`City "${city}" not found by name, trying coordinates...`);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: cityData } = await supabase
        .from('cities')
        .select('latitude, longitude')
        .eq('name_fr', city)
        .single();

      if (cityData?.latitude && cityData?.longitude) {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${cityData.latitude}&lon=${cityData.longitude}&appid=${apiKey}&units=metric&lang=fr`;
        response = await fetch(weatherUrl);
        data = await response.json();
      }
    }

    if (!response.ok) {
      console.error('OpenWeatherMap API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Weather data not available' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Weather data received:', JSON.stringify(data));

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
    };

    return new Response(
      JSON.stringify(weatherInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching weather:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch weather data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
