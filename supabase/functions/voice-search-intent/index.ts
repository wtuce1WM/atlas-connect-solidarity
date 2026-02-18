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

    const systemPrompt = `Tu es un assistant qui traduit des phrases en langage naturel en mots-clés de recherche pour un annuaire d'entreprises au Maroc.

Ta tâche : identifier l'INTENTION sémantique et la traduire en mots-clés concrets (type d'établissement, service, produit, ville, quartier, personnage historique, nom propre).

Règles de traduction sémantique OBLIGATOIRES :
- "manger", "déjeuner", "dîner", "se restaurer", "casse-croûte" → "restaurant"
- "dormir", "séjourner", "loger", "passer la nuit", "réserver une chambre" → "hôtel"
- "se détendre", "relaxation", "soin", "massage", "bien-être" → "spa hammam"
- "boire un verre", "prendre un café", "boire quelque chose" → "café bar"
- "faire du shopping", "acheter", "trouver" + produit → garder le produit
- "bord de l'eau", "bord de mer", "vue mer", "face à la mer", "front de mer" → "plage"
- "en bord de plage", "les pieds dans le sable" → "plage"
- "cadeau", "idée cadeau", "offrir" → "boutique cadeaux artisanat"
- "activités", "que faire", "occuper" + enfants → "activités enfants"
- "a fréquenté", "a visité", "aimait", "habitué de", "lieu de" + personnage → garder le nom du personnage comme mot-clé

Autres règles :
- Supprimer les verbes d'intention après traduction (chercher, trouver, vouloir, pouvoir...)
- Supprimer les articles, pronoms, prépositions
- Supprimer les adjectifs vagues (beau, bon, meilleur, original...)
- Supprimer "Maroc", "au Maroc", "marocain" car l'annuaire est déjà au Maroc — inutile comme filtre
- Garder : noms de villes (Marrakech, Essaouira, Agadir...), quartiers, types d'établissements traduits, produits, NOMS PROPRES (personnes célèbres, lieux historiques)
- 2 à 5 mots maximum
- Répondre UNIQUEMENT avec les mots-clés, rien d'autre

Exemples :
"trouve un plombier à Marrakech" → "plombier Marrakech"
"je veux manger au bord de l'eau à Essaouira" → "restaurant plage Essaouira"
"je cherche un restaurant sur la plage à Essaouira" → "restaurant plage Essaouira"
"où manger avec vue sur la mer à Agadir" → "restaurant mer Agadir"
"je veux boire un café face à l'océan à Essaouira" → "café plage Essaouira"
"peut on manger du caviar à Marrakech" → "caviar restaurant Marrakech"
"je cherche un hôtel qui accepte les animaux de compagnie" → "hôtel animaux"
"acheter un beau tapis berbère" → "tapis berbère"
"où dormir avec piscine à Essaouira" → "hôtel piscine Essaouira"
"meilleur hammam spa de la médina" → "hammam spa médina"
"je cherche à faire un cadeau original à Marrakech" → "boutique cadeaux Marrakech"
"je veux acheter de l'artisanat marocain" → "artisanat boutique"
"activités pour les enfants à Marrakech" → "activités enfants Marrakech"
"quel lieu Ernest Hemingway a fréquenté" → "Ernest Hemingway"
"quel lieu Ernest Hemingway a fréquenté au Maroc" → "Ernest Hemingway"
"où Churchill peignait à Marrakech" → "Churchill Marrakech"
"restaurant typique marocain" → "restaurant typique"
"café traditionnel au maroc" → "café traditionnel"`;


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
