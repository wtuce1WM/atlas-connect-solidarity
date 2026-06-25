import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, business_id, duration_sec = 22, tone = "immersif" } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return json({ error: "prompt invalide" }, 400);
    }
    if (![17, 22, 27].includes(Number(duration_sec))) {
      return json({ error: "duration_sec doit être 17, 22 ou 27" }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Charger le contexte établissement (optionnel)
    let businessContext: any = null;
    if (business_id) {
      const { data: biz } = await supa
        .from("businesses")
        .select("id,name,hook,city,main_category,categories,computed_rating,total_review_count,popup_title,popup_description")
        .eq("id", business_id)
        .maybeSingle();

      const { data: docs } = await supa
        .from("business_documents")
        .select("type,url,name,description,thumbnail_url,sort_order,price,popup")
        .eq("business_id", business_id)
        .in("type", ["image", "video", "internal-video", "promotion"])
        .order("sort_order", { ascending: true })
        .limit(20);

      businessContext = { ...biz, medias: docs ?? [] };
    }

    const systemPrompt = `Tu es directeur artistique pour One World Morocco. Tu produis un scénario JSON pour une vidéo verticale 720x1280 de ${duration_sec} secondes, ton "${tone}".

Structure JSON attendue :
{
  "duration_sec": ${duration_sec},
  "beats": [
    { "type": "hook" | "identity" | "signature" | "reviews" | "cta_install", "start": 0, "duration": 3, "title": "...", "subtitle": "...", "media_url": "...|null", "price": "...|null" }
  ]
}

Règles :
- 5 à 7 beats au total, qui couvrent toute la durée sans trou.
- Choisis les médias depuis la liste fournie (uniquement leurs URLs).
- Textes courts, ciselés, ton 1WM (raffiné, immersif).
- Termine toujours par un beat "cta_install".
- Renvoie UNIQUEMENT le JSON, sans backticks ni commentaire.`;

    const userPrompt = `Demande utilisateur : ${prompt}\n\nÉtablissement :\n${JSON.stringify(businessContext, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Limite IA atteinte, réessayez dans un instant." }, 429);
    if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiRes.ok) return json({ error: `Erreur IA: ${await aiRes.text()}` }, 500);

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let scenario: any;
    try {
      scenario = JSON.parse(content);
    } catch {
      scenario = { duration_sec, beats: [], raw: content };
    }

    const { data: job, error } = await supa
      .from("video_jobs")
      .insert({
        business_id: business_id ?? null,
        prompt,
        duration_sec,
        tone,
        scenario_json: scenario,
        status: "pending",
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ job });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
