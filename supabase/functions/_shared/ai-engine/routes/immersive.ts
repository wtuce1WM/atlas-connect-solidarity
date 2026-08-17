// Bloc « immersif » partagé.
//
// Toutes les réponses IA qui listent des établissements affichent, AVANT les
// cartes résultat (marqueur SHOW_ON_MAP), un court texte immersif par fiche :
//
//   **Nom** — 19,6/20, à Semlalia. Vue panoramique, cocktails, DJ sets…
//
// Deux niveaux, une seule source de vérité :
//   A. Sélection déterministe (zéro token) : on pioche dans le corpus éditorial
//      de la fiche (hook, description, TXT IA `business_ai_texts`, blocs
//      highlights `front_highlights`) les phrases qui répondent à la question
//      posée. Aucun appel modèle.
//   B. Réécriture par lot (1 seul appel pour TOUTE la réponse) : le modèle
//      reformule une phrase immersive par fiche à partir des mêmes extraits,
//      orientée sur la question. Jamais d'invention : le corpus est clos.
//
// B est optionnel et dégrade silencieusement vers A (erreur, clé absente,
// réponse incomplète, moins de 3 résultats).

import { GATEWAY_BASE_URL } from "../ai-gateway.ts";

export type Lang = "fr" | "en" | "ar";

const MAX_PHRASE = 200;
/** Longueur cible du texte immersif enrichi (sélection A comme réécriture B). */
const MAX_RICH = 340;
/** Modèle rapide : ce bloc est sur le chemin critique de la réponse. */
const RICH_MODEL = "openai/gpt-5.6-luna";
const RICH_MIN_ROWS = 3;

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_#`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function pickLocalized(b: any, base: "hook" | "description", lang: Lang): string {
  const order = lang === "en" ? ["en", "fr", "ar"] : lang === "ar" ? ["ar", "fr", "en"] : ["fr", "en", "ar"];
  for (const l of order) {
    const v = clean(b?.[`${base}_${l}`]);
    if (v) return v;
  }
  return "";
}

function pickLocalizedRow(row: any, base: string, lang: Lang): string {
  const order = lang === "en" ? ["en", "fr", "ar"] : lang === "ar" ? ["ar", "fr", "en"] : ["fr", "en", "ar"];
  for (const l of order) {
    const v = clean(row?.[`${base}_${l}`]);
    if (v) return v;
  }
  return clean(row?.[base]);
}

/** Tronque proprement sur une fin de phrase ou de mot. */
function trimPhrase(s: string, max = MAX_PHRASE): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
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

function headOf(b: any, lang: Lang): string {
  const bits: string[] = [];
  const rating = ratingOf(b);
  if (rating !== null) bits.push(`${fmtRating(rating, lang)}/20`);
  const place = placeOf(b, lang);
  if (place) bits.push(place);
  return `**${clean(b.name)}**${bits.length ? ` — ${bits.join(", ")}` : ""}`;
}

/** Une ligne immersive par établissement (ordre conservé) — version zéro token simple. */
export function buildImmersiveLines(rows: any[], lang: Lang, max = 10): string {
  const lines = (Array.isArray(rows) ? rows : []).slice(0, max).map((b: any) => {
    if (!b?.name) return "";
    const head = headOf(b, lang);
    const phrase = phraseOf(b, lang);
    return phrase ? `${head}. ${phrase}` : `${head}.`;
  }).filter(Boolean);
  return lines.join("\n\n");
}

// ───────────────────────── Corpus éditorial étendu ─────────────────────────

type Extras = { aiTexts: string[]; highlights: string[] };

/**
 * Corpus éditorial complémentaire par établissement :
 *  - `business_ai_texts` (onglet TXT IA de /affiliates/presence), actifs, ordonnés
 *  - `front_highlights` (blocs highlights de la fiche), ordonnés
 */
export async function fetchImmersiveExtras(
  admin: any,
  ids: string[],
  lang: Lang,
): Promise<Map<string, Extras>> {
  const out = new Map<string, Extras>();
  const wanted = [...new Set((ids || []).filter(Boolean).map(String))].slice(0, 20);
  if (!wanted.length || !admin) return out;
  const ensure = (id: string) => {
    let e = out.get(id);
    if (!e) { e = { aiTexts: [], highlights: [] }; out.set(id, e); }
    return e;
  };

  const [texts, highlights] = await Promise.all([
    admin.from("business_ai_texts")
      .select("business_id, title, hook, content, position")
      .in("business_id", wanted).eq("is_active", true)
      .order("position", { ascending: true })
      .then((r: any) => r?.data ?? [])
      .catch(() => []),
    admin.from("front_highlights")
      .select("business_id, title, title_fr, title_en, title_ar, description, description_fr, description_en, description_ar, sort_order")
      .in("business_id", wanted)
      .order("sort_order", { ascending: true })
      .then((r: any) => r?.data ?? [])
      .catch(() => []),
  ]);

  for (const t of (texts as any[])) {
    const body = clean(t?.content);
    if (!body) continue;
    const hook = clean(t?.hook);
    ensure(String(t.business_id)).aiTexts.push(hook ? `${hook} ${body}` : body);
  }
  for (const h of (highlights as any[])) {
    const title = pickLocalizedRow(h, "title", lang);
    const desc = pickLocalizedRow(h, "description", lang);
    const line = [title, desc].filter(Boolean).join(" : ");
    if (line) ensure(String(h.business_id)).highlights.push(line);
  }
  return out;
}

// ───────────────────── A. sélection ciblée (zéro token) ─────────────────────

const QUERY_STOP = new Set([
  "avec", "sans", "pour", "dans", "chez", "plus", "moins", "tres", "tout", "tous", "toute",
  "cote", "pres", "proche", "autour", "quel", "quelle", "quels", "quelles", "quoi", "comment",
  "propose", "proposes", "cherche", "voudrais", "veux", "montre", "montrer", "trouve", "trouver",
  "meilleurs", "meilleures", "meilleur", "meilleure", "adresse", "adresses", "etablissement",
  "with", "without", "near", "close", "around", "what", "which", "best", "show", "find", "want",
  "marrakech", "essaouira", "maroc", "morocco", "agadir", "casablanca",
]);

function queryKeywords(query?: string | null): string[] {
  const toks = norm(query)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !QUERY_STOP.has(t));
  // Radical court : « piscines » ↔ « piscine », « golfs » ↔ « golf ».
  return [...new Set(toks.map((t) => (t.length > 5 ? t.slice(0, t.length - 1) : t)))].slice(0, 8);
}

function splitSentences(text: string): string[] {
  return clean(text)
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35);
}

type Cand = { text: string; weight: number };

function poolOf(b: any, extra: Extras | undefined, lang: Lang): Cand[] {
  const cands: Cand[] = [];
  const push = (src: string, weight: number) => {
    for (const s of splitSentences(src)) cands.push({ text: s, weight });
  };
  push(pickLocalized(b, "hook", lang), 3);
  for (const t of (extra?.aiTexts ?? []).slice(0, 5)) push(t, 2.5);
  push(pickLocalized(b, "description", lang), 2);
  for (const h of (extra?.highlights ?? []).slice(0, 8)) push(h, 1.5);
  return cands;
}

/** Phrase immersive déterministe orientée par la question posée. */
function targetedPhrase(b: any, extra: Extras | undefined, lang: Lang, keywords: string[]): string {
  const cands = poolOf(b, extra, lang);
  if (!cands.length) return phraseOf(b, lang);

  const scored = cands.map((c, i) => {
    const n = norm(c.text);
    let hits = 0;
    for (const k of keywords) if (n.includes(k)) hits++;
    return { ...c, score: hits * 10 + c.weight - i * 0.01, hits };
  }).sort((a, b2) => b2.score - a.score);

  // Aucune phrase ne parle de la question : on garde l'ordre éditorial d'origine.
  const ordered = scored[0]?.hits ? scored : cands.map((c, i) => ({ ...c, score: c.weight - i * 0.01, hits: 0 }))
    .sort((a, b2) => b2.score - a.score);

  const picked: string[] = [];
  const seen = new Set<string>();
  let len = 0;
  for (const c of ordered) {
    const key = norm(c.text).slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    if (len && len + c.text.length + 1 > MAX_RICH) continue;
    picked.push(c.text);
    len += c.text.length + 1;
    if (picked.length >= 2 || len > MAX_RICH - 60) break;
  }
  return picked.length ? trimPhrase(picked.join(" "), MAX_RICH) : phraseOf(b, lang);
}

// ───────────────── B. réécriture par lot (1 appel / réponse) ─────────────────

const RICH_SYS: Record<Lang, string> = {
  fr: "Tu rédiges des micro-descriptions immersives pour un moteur de recherche marocain. Pour chaque établissement, écris 2 phrases maximum (320 caractères max) UNIQUEMENT à partir des extraits fournis, en mettant en avant ce qui répond à la demande de l'utilisateur. N'invente aucun détail, aucun prix, aucun horaire, aucune note. Ne répète pas le nom de l'établissement, ni sa note, ni son quartier (déjà affichés). Style concret et sensoriel, sans superlatif creux, sans emoji, sans markdown.",
  en: "You write immersive micro-descriptions for a Moroccan discovery engine. For each place, write at most 2 sentences (320 characters max) using ONLY the provided excerpts, highlighting what answers the user's request. Invent nothing: no price, no hours, no rating. Do not repeat the place name, rating or neighborhood (already displayed). Concrete, sensory style, no empty superlatives, no emoji, no markdown.",
  ar: "اكتب أوصافًا قصيرة وغنية لمحرك اكتشاف مغربي. لكل مكان، جملتان كحد أقصى (320 حرفًا) اعتمادًا على المقتطفات المقدمة فقط، مع إبراز ما يجيب على طلب المستخدم. لا تخترع أي تفصيل أو سعر أو توقيت أو تقييم. لا تُعد ذكر الاسم أو التقييم أو الحي. بدون رموز تعبيرية أو تنسيق.",
};

async function rewriteBatch(
  rows: any[],
  extras: Map<string, Extras>,
  lang: Lang,
  query: string,
  apiKey: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const dossiers = rows.map((b: any) => {
    const e = extras.get(String(b.id));
    const pool = [
      pickLocalized(b, "hook", lang),
      ...(e?.aiTexts ?? []).slice(0, 3),
      pickLocalized(b, "description", lang),
      ...(e?.highlights ?? []).slice(0, 6),
    ].filter(Boolean).join(" • ").slice(0, 900);
    return {
      id: String(b.id),
      name: clean(b.name),
      category: clean(b.main_category),
      place: clean(b.neighborhood) || clean(b.city),
      excerpts: pool,
    };
  }).filter((d) => d.excerpts);
  if (dossiers.length < RICH_MIN_ROWS) return out;

  const body = {
    model: RICH_MODEL,
    stream: true,
    instructions: RICH_SYS[lang],
    input: [
      {
        role: "user",
        content: [{
          type: "input_text",
          text: `Demande de l'utilisateur : "${query}"\n\nÉtablissements (json) :\n${JSON.stringify(dossiers)}\n\nRends un objet json avec un item par établissement (même id).`,
        }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "immersive_items",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { id: { type: "string" }, text: { type: "string" } },
                required: ["id", "text"],
              },
            },
          },
          required: ["items"],
        },
      },
    },
  };

  const resp = await fetch(`${GATEWAY_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok || !resp.body) {
    console.error("[immersive] rewrite_failed", resp.status, (await resp.text().catch(() => "")).slice(0, 200));
    return out;
  }

  // Réponses API : toujours en streaming, on accumule les deltas côté serveur.
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const handle = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const evt = JSON.parse(payload) as any;
      if (evt?.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
      else if (evt?.type === "response.completed" && typeof evt?.response?.output_text === "string" && !text) {
        text = evt.response.output_text;
      }
    } catch { /* ligne non JSON */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, idx).replace(/\r$/, ""));
      buffer = buffer.slice(idx + 1);
    }
  }
  if (buffer) handle(buffer.replace(/\r$/, ""));

  try {
    const parsed = JSON.parse(text.trim());
    for (const it of (parsed?.items ?? []) as any[]) {
      const v = clean(it?.text);
      if (it?.id && v) out.set(String(it.id), trimPhrase(v, MAX_RICH));
    }
  } catch (e) {
    console.error("[immersive] rewrite_parse_failed", String(e), text.slice(0, 160));
  }
  return out;
}

// ───────────────────────────── Entrée publique ─────────────────────────────

export interface ImmersiveCtx {
  admin: any;
  /** Question / libellé de suggestion : oriente la sélection et la réécriture. */
  query?: string | null;
  /** Clé passerelle : si absente, on reste en zéro token. */
  apiKey?: string | null;
  /** `false` sur les relances mécaniques (horaires, quartier…) → zéro token. */
  rewrite?: boolean;
  max?: number;
}

/**
 * Bloc immersif enrichi : corpus étendu (TXT IA + highlights), sélection ciblée
 * par la question, et réécriture par lot en un seul appel quand c'est utile.
 * Dégrade toujours vers la version déterministe.
 */
export async function buildImmersiveBlock(
  rows: any[],
  lang: Lang,
  ctx: ImmersiveCtx,
): Promise<string> {
  const list = (Array.isArray(rows) ? rows : []).filter((b: any) => b?.name).slice(0, ctx.max ?? 10);
  if (!list.length) return "";

  let extras = new Map<string, Extras>();
  try {
    extras = await fetchImmersiveExtras(ctx.admin, list.map((b: any) => String(b.id)), lang);
  } catch (e) {
    console.error("[immersive] extras_failed", String(e));
  }

  const query = String(ctx.query || "").trim();
  const keywords = queryKeywords(query);

  let rewritten = new Map<string, string>();
  if (ctx.rewrite !== false && ctx.apiKey && query.length >= 6 && list.length >= RICH_MIN_ROWS) {
    try {
      const t0 = Date.now();
      rewritten = await rewriteBatch(list, extras, lang, query, ctx.apiKey);
      console.log("[immersive] rewrite", JSON.stringify({
        rows: list.length, got: rewritten.size, ms: Date.now() - t0, model: RICH_MODEL,
      }));
    } catch (e) {
      console.error("[immersive] rewrite_error", String(e));
    }
  }

  return list.map((b: any) => {
    const head = headOf(b, lang);
    const phrase = rewritten.get(String(b.id))
      || targetedPhrase(b, extras.get(String(b.id)), lang, keywords);
    return phrase ? `${head}. ${phrase}` : `${head}.`;
  }).join("\n\n");
}
