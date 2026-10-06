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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              `Translate each string of the JSON array into ${LANGS[target]}. Keep markdown, emojis, line breaks, URLs, numbers and any bracketed/tag markup exactly. Never translate proper names of businesses, places or people. If a string is already in ${LANGS[target]}, return it unchanged. Reply ONLY with a JSON object {"texts": [...]} with the same number of items, same order.`,
          },
          { role: "user", content: JSON.stringify(items) },
        ],
      }),
    });
    if (!res.ok) return json({ error: `gateway ${res.status}` }, res.status === 429 || res.status === 402 ? res.status : 502);
    const data = await res.json();
    let content = String(data?.choices?.[0]?.message?.content || "").trim();
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const s = content.indexOf("{"), e = content.lastIndexOf("}");
    const out = JSON.parse(content.slice(s, e + 1))?.texts;
    if (!Array.isArray(out) || out.length !== items.length) return json({ error: "bad output" }, 502);
    return json({ texts: out.map(String) });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
