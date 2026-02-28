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
    const { query, businesses, language = "fr" } = await req.json();

    if (!query || !businesses?.length) {
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from top search results (max 10)
    const topBusinesses = businesses.slice(0, 10);
    const businessContext = topBusinesses.map((b: any, i: number) => {
      const parts = [`${i + 1}. ${b.name}`];
      if (b.city) parts.push(`(${b.city})`);
      if (b.main_category) parts.push(`— ${b.main_category}`);
      if (b.hook_fr) parts.push(`— "${b.hook_fr}"`);
      if (b.rating) parts.push(`— Note: ${b.rating}/20`);
      if (b.categories?.length) parts.push(`— Sous-catégories: ${b.categories.join(", ")}`);
      return parts.join(" ");
    }).join("\n");

    const langInstructions = language === "en"
      ? "Answer in English."
      : language === "ar"
        ? "Answer in Arabic."
        : "Réponds en français.";

    const systemPrompt = `Tu es un concierge expert du Maroc, chaleureux et passionné. Tu aides les utilisateurs à trouver les meilleurs établissements.

RÈGLES :
- ${langInstructions}
- Réponds en 5-8 phrases, de façon détaillée, chaleureuse et enthousiaste.
- Utilise des émojis pertinents pour rendre la réponse vivante (🍽️ 🐟 🌊 ⭐ 🏨 ☕ 🎶 🌅 📍 👨‍🍳 💎 🔥 etc.).
- Base-toi UNIQUEMENT sur les établissements fournis ci-dessous. Ne mentionne JAMAIS d'établissement qui n'est pas dans la liste.
- Cite 3-4 établissements de la liste par leur nom exact, en expliquant pourquoi ils correspondent à la recherche (ambiance, spécialités, vue, note, etc.).
- Si un établissement a une note, mentionne-la.
- Si la liste ne semble pas correspondre à la question, dis-le honnêtement.
- N'utilise pas de formatage markdown (pas de **, pas de #, pas de listes à puces). Écris en texte simple avec émojis.
- Sois naturel et enthousiaste, comme un ami local passionné qui partage ses meilleures adresses.
- Commence par une accroche engageante liée à la recherche de l'utilisateur.

ÉTABLISSEMENTS TROUVÉS :
${businessContext}`;

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
          { role: "user", content: query },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", answer: "" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", answer: "" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() ?? "";

    console.log(`AI answer for "${query}": ${answer.substring(0, 100)}...`);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search answer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", answer: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
