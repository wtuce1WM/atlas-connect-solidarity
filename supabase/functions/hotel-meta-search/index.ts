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
     const STAYAPI_KEY = Deno.env.get('STAYAPI_KEY');
     if (!STAYAPI_KEY) {
       console.error('STAYAPI_KEY is not configured');
       throw new Error('STAYAPI_KEY is not configured');
     }
 
     const { hotel_name, location } = await req.json();
 
     if (!hotel_name) {
       return new Response(
         JSON.stringify({ error: 'hotel_name is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`Searching for hotel: ${hotel_name}, location: ${location || 'not specified'}`);
 
     const params = new URLSearchParams({ hotel_name });
     if (location) {
       params.append('location', location);
     }
 
     const response = await fetch(`https://api.stayapi.com/v1/meta/search?${params.toString()}`, {
       method: 'GET',
       headers: {
         'x-api-key': STAYAPI_KEY,
         'Content-Type': 'application/json',
       },
     });
 
     const data = await response.json();
     console.log(`StayAPI response status: ${response.status}, results: ${data.metadata?.total_results_found || 0}`);
 
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
     console.error('Error in hotel-meta-search:', error);
     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });