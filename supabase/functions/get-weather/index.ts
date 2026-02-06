import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Call OpenWeatherMap API
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},MA&appid=${apiKey}&units=metric&lang=fr`;
    
    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('OpenWeatherMap API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Weather data not available' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Weather data received:', JSON.stringify(data));

    // Extract relevant weather info
    const weatherInfo = {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      description: data.weather[0]?.description || '',
      icon: data.weather[0]?.icon || '',
      wind_speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
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
