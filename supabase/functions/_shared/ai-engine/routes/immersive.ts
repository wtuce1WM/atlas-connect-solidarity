// Bloc « immersif » partagé (Classe A, zéro token).
//
// Toutes les réponses IA qui listent des établissements affichent, AVANT les
// cartes résultat (marqueur SHOW_ON_MAP), un court texte immersif par fiche :
//
//   **Nom** — 19,6/20, à Semlalia. Vue panoramique, cocktails, DJ sets…
//
// Source unique et déterministe : hook localisé, sinon description localisée,
// sinon services. Aucune génération, aucun appel modèle.

export type Lang = "fr" | "en" | "ar";

const MAX_PHRASE = 200;

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_#`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function pickLocalized(b: any, base: "hook" | "description", lang: Lang): string {
  const order = lang === "en" ? ["en", "fr", "ar"] : lang === "ar" ? ["ar", "fr", "en"] : ["fr", "en", "ar"];
  for (const l of order) {
    const v = clean(b?.[`${base}_${l}`]);
    if (v) return v;
  }
  return "";
}

/** Tronque proprement sur une fin de phrase ou de mot. */
function trimPhrase(s: string): string {
  if (s.length <= MAX_PHRASE) return s;
  const cut = s.slice(0, MAX_PHRASE);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" ! "), cut.lastIndexOf(" ? "));
  if (dot > 80) return cut.slice(0, dot + 1).trim();
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trim()}…`;
}

export function immersivePhrase(b: any, lang: Lang): string {
  return phraseOf(b, lang);
}

function phraseOf(b: any, lang: Lang): string {
  const hook = pickLocalized(b, "hook", lang);
  if (hook) return trimPhrase(hook);
  const desc = pickLocalized(b, "description", lang);
  if (desc) return trimPhrase(desc);
  const services = (Array.isArray(b?.services) ? b.services : [])
    .map((s: any) => clean(s)).filter(Boolean).slice(0, 6);
  if (services.length) return `${services.join(", ")}.`;
  return "";
}

function ratingOf(b: any): number | null {
  const count = Number(b?.total_review_count ?? 0);
  if (count < 10) return null;
  const r = b?.computed_rating ?? (b?.rating ? Number(b.rating) : null);
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmtRating(n: number, lang: Lang): string {
  const v = n.toFixed(1);
  return lang === "fr" ? v.replace(".", ",") : v;
}

function placeOf(b: any, lang: Lang): string {
  const loc = clean(b?.neighborhood) || clean(b?.city);
  if (!loc) return "";
  return lang === "en" ? `in ${loc}` : lang === "ar" ? `في ${loc}` : `à ${loc}`;
}

/** Une ligne immersive par établissement (ordre conservé). */
export function buildImmersiveLines(rows: any[], lang: Lang, max = 10): string {
  const lines = (Array.isArray(rows) ? rows : []).slice(0, max).map((b: any) => {
    if (!b?.name) return "";
    const bits: string[] = [];
    const rating = ratingOf(b);
    if (rating !== null) bits.push(`${fmtRating(rating, lang)}/20`);
    const place = placeOf(b, lang);
    if (place) bits.push(place);
    const head = `**${clean(b.name)}**${bits.length ? ` — ${bits.join(", ")}` : ""}`;
    const phrase = phraseOf(b, lang);
    return phrase ? `${head}. ${phrase}` : `${head}.`;
  }).filter(Boolean);
  return lines.join("\n\n");
}
