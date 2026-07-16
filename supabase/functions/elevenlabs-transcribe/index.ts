import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

  try {
    const rawKey = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
    // Remove ALL non-printable and non-ASCII characters to ensure ByteString compliance
    const ELEVENLABS_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, '').trim();
    console.log(`API key length after sanitization: ${ELEVENLABS_API_KEY.length} (raw: ${rawKey.length})`);
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiFormData = new FormData();
    apiFormData.append('file', audioFile, 'recording.webm');
    apiFormData.append('model_id', 'scribe_v2');
    apiFormData.append('tag_audio_events', 'false');
    apiFormData.append('diarize', 'false');

    // Forwarde la langue attendue (ISO 639-1 côté front -> ISO 639-3 pour
    // scribe_v2) pour éviter les auto-détections aberrantes en asiatique
    // sur des fragments courts/bruités.
    const langRaw = String(formData.get('language') || '').slice(0, 2).toLowerCase();
    const iso3: Record<string, string> = { fr: 'fra', en: 'eng', ar: 'ara', es: 'spa', de: 'deu', it: 'ita', pt: 'por', nl: 'nld' };
    if (iso3[langRaw]) apiFormData.append('language_code', iso3[langRaw]);

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: `ElevenLabs API error [${response.status}]: ${errorBody}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transcription = await response.json();

    return new Response(JSON.stringify({ text: transcription.text || '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
