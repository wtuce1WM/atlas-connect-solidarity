const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { business_id, min_reviews = 5 } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: 'business_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business name
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', business_id)
      .maybeSingle();

    if (bizErr || !biz) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all reviews for this business
    const { data: reviews, error: revErr } = await supabase
      .from('reviews')
      .select('source, author_name, rating, text, language')
      .eq('business_id', business_id)
      .not('text', 'is', null)
      .order('rating', { ascending: false });

    if (revErr || !reviews || reviews.length < min_reviews) {
      return new Response(JSON.stringify({
        error: `Not enough reviews (${reviews?.length || 0}/${min_reviews}). Need at least ${min_reviews} reviews.`,
        review_count: reviews?.length || 0,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompt with review texts
    const reviewBlock = reviews.map((r, i) =>
      `[${i + 1}] (${r.source}, ${r.rating}/5) ${r.text}`
    ).join('\n');

    const systemPrompt = `Tu es un analyste d'avis clients. À partir des avis fournis, génère une synthèse structurée en JSON avec exactement ce format :
{
  "fr": {
    "pros": ["point positif 1", "point positif 2", ...],
    "cons": ["point négatif 1", "point négatif 2", ...],
    "summary": "Une phrase de synthèse globale en français"
  },
  "en": {
    "pros": ["positive point 1", "positive point 2", ...],
    "cons": ["negative point 1", "negative point 2", ...],
    "summary": "A one-sentence global summary in English"
  }
}

Règles :
- 3 à 6 pros, 1 à 4 cons (ou moins s'il n'y en a pas)
- Chaque point doit être concis (max 15 mots)
- Le bloc "fr" est rédigé en français, le bloc "en" en anglais
- Les deux blocs doivent contenir les mêmes informations, traduits fidèlement
- Base-toi uniquement sur les avis fournis, n'invente rien
- S'il n'y a pas de points négatifs, mets un tableau vide pour cons
- Réponds UNIQUEMENT avec le JSON, sans markdown ni explication`;

    const userPrompt = `Établissement : ${biz.name}\n\nAvis clients (${reviews.length} au total) :\n${reviewBlock}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: `AI error: ${aiResponse.status}` }), {
        status: aiResponse.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from AI response (strip potential markdown fences)
    let parsed: { fr: { pros: string[]; cons: string[]; summary: string }; en: { pros: string[]; cons: string[]; summary: string } };
    try {
      const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', rawContent);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: rawContent }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both new multilingual format and legacy fallback
    const summaryData = {
      fr: parsed.fr,
      en: parsed.en,
      // Legacy top-level fields for backward compatibility
      pros: parsed.fr.pros,
      cons: parsed.fr.cons,
      summary: parsed.fr.summary,
      review_count: reviews.length,
      generated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('businesses')
      .update({ ai_review_summary: summaryData })
      .eq('id', business_id);

    if (updateErr) {
      console.error('DB update error:', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to save summary' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generated multilingual summary for ${biz.name}: FR(${parsed.fr.pros.length} pros), EN(${parsed.en.pros.length} pros)`);

    return new Response(JSON.stringify({ success: true, business: biz.name, summary: summaryData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
