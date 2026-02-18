import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return new Response(JSON.stringify({ query: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant qui extrait les mots-clés de recherche d'une phrase en langage naturel pour un annuaire d'entreprises au Maroc.

Ta tâche : extraire uniquement les mots-clés pertinents (type d'établissement, service, produit, ville, quartier).

Règles :
- Supprimer les verbes d'intention (chercher, trouver, aller, manger, acheter, vouloir, pouvoir...)
- Supprimer les articles, pronoms, prépositions (le, la, les, un, une, je, on, pour, avec, dans, où, qui...)
- Supprimer les adjectifs vagues (beau, bon, meilleur, grand, authentique, typique...)
- Garder : noms de lieux (villes, quartiers), types d'établissements, services, produits, spécialités
- Retourner uniquement les mots-clés séparés par des espaces, sans ponctuation ni explication
- 2 à 4 mots maximum
- Répondre UNIQUEMENT avec les mots-clés, rien d'autre

Exemples :
"trouve un plombier à Marrakech" → "plombier Marrakech"
"peut on manger du caviar à Marrakech" → "caviar Marrakech"
"je cherche un hôtel qui accepte les animaux de compagnie" → "hôtel animaux"
"acheter un beau tapis berbère" → "tapis berbère"
"où dormir avec piscine à Essaouira" → "hôtel piscine Essaouira"
"meilleur hammam spa de la médina" → "hammam spa médina"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
      // Fallback: return transcript as-is
      return new Response(JSON.stringify({ query: transcript, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const query = data.choices?.[0]?.message?.content?.trim() ?? transcript;

    console.log(`Voice intent: "${transcript}" → "${query}"`);

    return new Response(JSON.stringify({ query }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice intent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", query: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
