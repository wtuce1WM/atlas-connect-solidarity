 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const STAYAPI_KEY = Deno.env.get('STAYAPI_KEY');
     if (!STAYAPI_KEY) {
       console.error('STAYAPI_KEY is not configured');
       throw new Error('STAYAPI_KEY is not configured');
     }
 
     const { location, check_in, check_out, adults, currency, min_rating, reviews_sort_by } = await req.json();
 
     if (!location) {
       return new Response(
         JSON.stringify({ error: 'location is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (!check_in || !check_out) {
       return new Response(
         JSON.stringify({ error: 'check_in and check_out dates are required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`Searching hotels in: ${location}, check_in: ${check_in}, check_out: ${check_out}`);
 
     const params = new URLSearchParams({ query: location, check_in, check_out });
     if (adults) params.append('adults', adults.toString());
     if (currency) params.append('currency', currency);
     if (min_rating) params.append('min_rating', min_rating.toString());
     if (reviews_sort_by) params.append('reviews_sort_by', reviews_sort_by);
 
     const response = await fetch(`https://api.stayapi.com/v1/google_reviews/search-and-review?${params.toString()}`, {
       method: 'GET',
       headers: {
         'X-API-Key': STAYAPI_KEY,
         'Content-Type': 'application/json',
       },
     });
 
     const data = await response.json();
     console.log(`StayAPI Google Search response status: ${response.status}`);
 
     if (!response.ok) {
       return new Response(
         JSON.stringify(data),
         { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     return new Response(
       JSON.stringify(data),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     console.error('Error in google-hotel-reviews:', error);
     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });