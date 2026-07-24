import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Lang = 'fr' | 'en' | 'ar';
const LANG_LABEL: Record<Lang, string> = { fr: 'français', en: 'anglais', ar: 'arabe standard moderne' };
const LANG_COL: Record<Lang, 'text_fr' | 'text_en' | 'text_ar'> = { fr: 'text_fr', en: 'text_en', ar: 'text_ar' };

async function translateBatch(texts: string[], targetLang: Lang, lovableApiKey: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const langLabel = LANG_LABEL[targetLang];
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
      try { return JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
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
    const { limit = 50, targetLang = 'fr' } = await req.json().catch(() => ({}));

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Count total remaining
    const langCol = targetLang === 'fr' ? 'text_fr' : 'text_en';
    const { count: totalRemaining } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .not('text', 'is', null)
      .is(langCol, null);

    // Fetch batch of reviews missing translation
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, text, language')
      .not('text', 'is', null)
      .is(langCol, null)
      .limit(limit);

    if (error || !reviews) {
      return new Response(JSON.stringify({ error: 'Failed to fetch reviews' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (reviews.length === 0) {
      return new Response(JSON.stringify({ translated: 0, remaining: 0, done: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let translatedCount = 0;

    // Separate reviews already in target language (just copy text)
    const alreadyInLang = reviews.filter(r => {
      const lang = (r.language || '').toLowerCase();
      return targetLang === 'fr' ? lang.startsWith('fr') : lang.startsWith('en');
    });
    const needsTranslation = reviews.filter(r => !alreadyInLang.includes(r));

    // Direct copy for same-language reviews
    for (const r of alreadyInLang) {
      await supabase.from('reviews').update({ [langCol]: r.text } as any).eq('id', r.id);
      translatedCount++;
    }

    // Translate in chunks of 15
    const chunkSize = 15;
    for (let i = 0; i < needsTranslation.length; i += chunkSize) {
      const chunk = needsTranslation.slice(i, i + chunkSize);
      const texts = chunk.map(r => r.text!);
      const translations = await translateBatch(texts, targetLang, lovableApiKey);

      for (let j = 0; j < chunk.length; j++) {
        if (j < translations.length && translations[j]) {
          await supabase.from('reviews').update({ [langCol]: translations[j] } as any).eq('id', chunk[j].id);
          translatedCount++;
        }
      }
    }

    const remaining = (totalRemaining || 0) - translatedCount;

    return new Response(
      JSON.stringify({ translated: translatedCount, remaining: Math.max(0, remaining), done: remaining <= 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
