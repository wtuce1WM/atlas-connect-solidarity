// Traduit à la volée les textes des réponses de l'assistant IA (changement de langue).
// Ne touche PAS la base. Public (assistant accessible sans compte) : taille bornée.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const LANGS: Record<string, string> = { fr: "French", en: "English", ar: "Arabic" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { texts, target } = await req.json().catch(() => ({}));
    if (!Array.isArray(texts) || !LANGS[target]) return json({ error: "bad request" }, 400);
    const items = texts.slice(0, 30).map((t: unknown) => String(t ?? "").slice(0, 6000));
    if (items.reduce((n, t) => n + t.length, 0) > 40000) return json({ error: "too large" }, 413);

    // Une requête par texte, réponse en texte brut : pas de JSON à reparser
    // (les longues réponses cassaient l'enveloppe JSON du modèle).
    const translateOne = async (text: string) => {
      if (!text.trim()) return text;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                `You are a translator. Translate the user's text into ${LANGS[target]}. Keep markdown, emojis, line breaks, URLs, numbers and any bracketed/tag markup exactly. Never translate proper names of businesses, places or people. Output ONLY the translated text, nothing else.`,
            },
            { role: "user", content: text },
          ],
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const data = await res.json();
      const out = String(data?.choices?.[0]?.message?.content || "").trim();
      return out || text;
    };
    const out = await Promise.all(items.map(translateOne));
    return json({ texts: out });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
