const corsHeaders = {
import { assertStaff } from "../_shared/auth-helpers.ts";
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en extraction de menus de restaurant. Analyse l'image du menu et extrais TOUTES les informations structurées :
1. Liste complète des plats avec leurs prix en MAD
2. Catégories (entrées, plats, desserts, etc.)
3. Ingrédients ou descriptions mentionnés
4. Mots-clés pertinents pour la recherche (ingrédients, spécialités, type de cuisine)
5. Fourchette de prix (min-max par catégorie et globale)

Réponds en JSON avec cette structure :
{
  "menu_sections": [{"title": "...", "items": [{"name": "...", "description": "...", "price": number}]}],
  "price_details": "résumé textuel des prix par catégorie",
  "avg_price_range": {"min": number, "max": number},
  "content_summary": "description narrative du menu pour l'IA",
  "keywords": ["mot1", "mot2", ...]
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais le contenu complet de ce menu de restaurant:" },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: `AI error ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
