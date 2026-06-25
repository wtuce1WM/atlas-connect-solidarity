import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Templates Remotion disponibles, choisis par l'IA.
// business-showcase = template générique piloté par props (fallback universel).
const TEMPLATES = [
  { id: "business-showcase", scope: "générique", description: "Fallback universel pour tout établissement. Piloté par props (name, hook, tagline, city, images[], offer)." },
  { id: "comptoir-darna", scope: "Comptoir Darna (Marrakech)", description: "Restaurant emblématique, ambiance orientale festive." },
  { id: "riad-dar-najat", scope: "Riad Dar Najat (Marrakech)", description: "Riad d'exception, médina." },
  { id: "maison-brummell", scope: "Maison Brummell (Marrakech)", description: "Boutique-hôtel design contemporain." },
  { id: "jnane-rumi", scope: "Jnane Rumi (Marrakech)", description: "Maison d'hôtes raffinée, jardin." },
  { id: "nar-complexe", scope: "N.A.R Complexe (Marrakech)", description: "Complexe lifestyle, beach club." },
  { id: "farasha-farmhouse", scope: "Farasha Farmhouse (Marrakech)", description: "Farmhouse luxe campagne marrakchie." },
  { id: "bo-zin", scope: "Bô Zin (Marrakech)", description: "Restaurant lounge route de l'Ourika." },
  { id: "corporate-vertical", scope: "1WM corporate", description: "Vidéo institutionnelle One World Morocco (modèle économique, villes pionnières, paliers). À utiliser UNIQUEMENT pour des contenus corporate 1WM." },
];

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

    // Charger le contexte établissement
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

    const systemPrompt = `Tu es directeur artistique pour One World Morocco. Tu choisis un template vidéo Remotion et fournis les props.

TEMPLATES DISPONIBLES :
${TEMPLATES.map(t => `- "${t.id}" — ${t.scope} : ${t.description}`).join("\n")}

RÈGLES DE CHOIX :
1. Si l'établissement correspond à un template dédié (Comptoir Darna, Riad Dar Najat, Maison Brummell, Jnane Rumi, N.A.R, Farasha Farmhouse, Bô Zin) → choisis ce template_id.
2. Si le prompt est purement corporate 1WM → "corporate-vertical".
3. Sinon (cas général) → "business-showcase" + props complètes (le template lit ces props).

FORMAT DE RÉPONSE (JSON strict, AUCUN backtick) :
{
  "template_id": "business-showcase",
  "props": {
    "name": "Nom de l'établissement",
    "hook": "Une phrase courte, ciselée, immersive",
    "tagline": "3 à 6 mots, dernier mot accentué (terracotta)",
    "city": "Marrakech",
    "category": "Restaurant",
    "images": ["url1", "url2", "url3"],
    "offer": { "title": "Brunch signature", "price": "350 MAD" } 
  },
  "rationale": "Pourquoi ce template (1 phrase)"
}

CONTRAINTES PROPS (pour business-showcase) :
- "images" : 3 à 5 URLs PRISES depuis les médias fournis (type image). Mets l'image la plus iconique en premier.
- "hook" : court (max 80 caractères), ton 1WM raffiné.
- "tagline" : 3 à 6 mots, le dernier sera coloré en terracotta automatiquement.
- "offer" : à remplir UNIQUEMENT s'il y a une promotion ou un prix dans les médias ; sinon null.
- "name" : utilise EXACTEMENT le nom de l'établissement fourni.
- Pour les autres templates (dédiés), renvoie des props vides {} : ils sont hardcodés.

Durée demandée : ${duration_sec}s · Ton : ${tone}.`;

    const userPrompt = `Demande utilisateur : ${prompt}\n\nÉtablissement (peut être null si demande générique) :\n${JSON.stringify(businessContext, null, 2)}`;

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
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    // Validation + fallback robuste
    const validIds = TEMPLATES.map(t => t.id);
    let template_id = typeof parsed.template_id === "string" && validIds.includes(parsed.template_id)
      ? parsed.template_id
      : "business-showcase";
    const template_props = parsed.props && typeof parsed.props === "object" ? parsed.props : {};

    // Si l'IA a choisi business-showcase mais sans contexte business, injecter au moins le prompt
    if (template_id === "business-showcase" && !template_props.name && businessContext?.name) {
      template_props.name = businessContext.name;
    }

    const { data: job, error } = await supa
      .from("video_jobs")
      .insert({
        business_id: business_id ?? null,
        prompt,
        duration_sec,
        tone,
        template_id,
        template_props,
        scenario_json: parsed, // garder la réponse IA brute pour debug
        status: "pending",
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ job, template_id, rationale: parsed.rationale });
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
