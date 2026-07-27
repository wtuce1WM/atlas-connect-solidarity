// Public embed AI concierge scoped to a single affiliate business.
// - Anonymous (no auth). Designed to be iframed on the business's own site.
// - Streams via the Vercel AI SDK UIMessageStream protocol (useChat-compatible).
// - Markers (SHOW_ON_MAP, EVENTS_SNAPSHOT, KNOWN_BUSINESSES) are still appended
//   as trailing text so the front can render maps / carousels / events panels
//   with the same components as before.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "npm:ai@5";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";
const MAX_ROUNDS = 4;
const SEARCH_LIMIT_HARD = 30;

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] };

// ============= Blog grounding (hybrid) =============
// Cache published blog posts in module scope for 5 minutes to avoid a DB round-trip per turn.
type BlogRow = {
  id: string; slug: string;
  title_fr: string | null; title_en: string | null; title_ar: string | null;
  custom_hero_image_url: string | null; cover_image_url: string | null;
  anchor_business_id: string | null;
};
let BLOG_CACHE: { at: number; items: BlogRow[] } | null = null;
async function fetchBlogPostsCached(admin: any): Promise<BlogRow[]> {
  const now = Date.now();
  if (BLOG_CACHE && now - BLOG_CACHE.at < 5 * 60 * 1000) return BLOG_CACHE.items;
  const { data } = await admin
    .from("blog_posts")
    .select("id, slug, title_fr, title_en, title_ar, custom_hero_image_url, cover_image_url, anchor_business_id")
    .eq("is_published", true)
    .limit(300);
  BLOG_CACHE = { at: now, items: (data as BlogRow[]) || [] };
  return BLOG_CACHE.items;
}

const BLOG_STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","au","aux","en","sur","dans","ou","et","pour","avec",
  "a","à","d","l","s","c","que","qui","quoi","où","ou","est","sont","ce","ces","cet","cette","mon","ma","mes",
  "the","a","an","of","to","in","on","at","and","or","for","with","near","close","best","top","by",
  "meilleur","meilleure","meilleurs","meilleures","top","plus","proche","proches","autour",
  "je","tu","il","elle","on","nous","vous","ils","elles","me","te","se","moi","toi",
  "veux","voudrais","cherche","chercher","trouver","montre","montrer","voir",
  "quoi","comment","quel","quelle","quels","quelles","what","which","how",
]);
function tokenizeForBlog(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !BLOG_STOPWORDS.has(t));
}
function matchBlogArticle(userText: string, lang: "fr" | "en" | "ar", posts: BlogRow[], hostId: string): BlogRow | null {
  const qTokens = new Set(tokenizeForBlog(userText));
  if (qTokens.size < 2) return null;
  let best: { row: BlogRow; score: number; overlap: number; owner: boolean } | null = null;
  for (const p of posts) {
    const titles = [p.title_fr, p.title_en, p.title_ar].filter(Boolean) as string[];
    if (!titles.length) continue;
    let bestForRow = 0, bestOverlap = 0;
    for (const t of titles) {
      const tTokens = new Set(tokenizeForBlog(t));
      if (tTokens.size < 2) continue;
      let overlap = 0;
      for (const w of qTokens) if (tTokens.has(w)) overlap++;
      if (overlap < 2) continue;
      const score = overlap / Math.min(qTokens.size, tTokens.size);
      if (score > bestForRow) { bestForRow = score; bestOverlap = overlap; }
    }
    if (bestForRow < 0.5) continue;
    const owner = p.anchor_business_id === hostId;
    const boost = owner ? 0.15 : 0;
    const finalScore = bestForRow + boost;
    if (!best || finalScore > best.score) best = { row: p, score: finalScore, overlap: bestOverlap, owner };
  }
  return best ? best.row : null;
}

function pickLang(v: unknown): "fr" | "en" | "ar" {
  return v === "en" || v === "ar" ? v : "fr";
}

function fmtHours(oh: any): string {
  if (!oh || typeof oh !== "object") return "";
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const lines: string[] = [];
  keys.forEach((k, i) => {
    const d = oh[k]; if (!d) return;
    if (d.closed) { lines.push(`${days[i]}: fermé`); return; }
    const slots = Array.isArray(d.slots) ? d.slots : [];
    const parts = slots.filter((s: any) => s?.open && s?.close).map((s: any) => `${s.open}–${s.close}`);
    if (parts.length) lines.push(`${days[i]}: ${parts.join(", ")}`);
  });
  return lines.join(" · ");
}

const normalize = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function shouldForceDirectorySearch(text: string): boolean {
  const q = normalize(text);
  if (!q) return false;
  return /\b(que faire|proximite|autour|pres de|ou |où |restaurant|dejeuner|diner|manger|boire|bar|cafe|the|rooftop|terrasse|visiter|activite|sortie|agenda|week[- ]?end|nearby|around|where|eat|drink|visit|activity|event)\b/i.test(q);
}

function isHoursIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(horaires?|heures? d['\s]?ouverture|ouvert|ouverture|ferme|fermeture|jours? d['\s]?ouverture)\b/i.test(n)) return true;
  if (/\b(opening hours?|open hours?|hours of operation|when (?:are you |is it )?open|what time|closing time)\b/i.test(n)) return true;
  if (/(ساعات|مواعيد|أوقات).*(العمل|الفتح|الدوام)/.test(text)) return true;
  return false;
}

function isBookingIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(reserv|reservation|booker|reserver)\b/i.test(n)) return true;
  if (/\b(book(?:ing)?|reserve|make a reservation)\b/i.test(n)) return true;
  if (/(حجز|احجز|يحجز)/.test(text)) return true;
  return false;
}

const DAY_LABELS = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ar: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
};
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function buildHoursAnswer(host: any, lang: "fr" | "en" | "ar"): string | null {
  if (host?.show_opening_hours !== true) {
    if (lang === "en") return `The opening hours of **${host.name}** are not published here. The easiest way is to contact the team directly — ${host.phone ? `by phone at ${host.phone}` : host.whatsapp ? `on WhatsApp at ${host.whatsapp}` : "via the contact details on the site"}. Would you like me to help you with something else — a table nearby, a rooftop, an activity?`;
    if (lang === "ar") return `ساعات عمل **${host.name}** غير منشورة هنا. الأفضل التواصل مباشرة مع الفريق${host.phone ? ` عبر الهاتف ${host.phone}` : host.whatsapp ? ` عبر واتساب ${host.whatsapp}` : ""}. هل تريد مساعدة في شيء آخر — مطعم قريب، سطح، أو نشاط؟`;
    return `Les horaires de **${host.name}** ne sont pas publiés ici. Le plus simple est de contacter l'équipe directement${host.phone ? ` au ${host.phone}` : host.whatsapp ? ` sur WhatsApp au ${host.whatsapp}` : " via les coordonnées du site"}. Je peux t'aider sur autre chose — une table à proximité, un rooftop, une activité ?`;
  }
  const oh = host.opening_hours;
  if (!oh || typeof oh !== "object") {
    if (lang === "en") return `The hours of **${host.name}** haven't been filled in yet. Feel free to contact the team directly for the latest.`;
    if (lang === "ar") return `لم تُعبأ ساعات عمل **${host.name}** بعد. يرجى الاتصال بالفريق مباشرة.`;
    return `Les horaires de **${host.name}** ne sont pas encore renseignés. N'hésite pas à contacter l'équipe directement.`;
  }
  const labels = DAY_LABELS[lang];
  const closedWord = lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  const lines: string[] = [];
  DAY_KEYS.forEach((k, i) => {
    const d = oh[k];
    if (!d) { lines.push(`- ${labels[i]} — —`); return; }
    if (d.closed) { lines.push(`- ${labels[i]} — ${closedWord}`); return; }
    if (!d.open || !d.close) { lines.push(`- ${labels[i]} — —`); return; }
    let s = `${d.open} – ${d.close}`;
    if (d.open2 && d.close2 && !d.continuous) s += ` / ${d.open2} – ${d.close2}`;
    lines.push(`- ${labels[i]} — ${s}`);
  });
  const intro = lang === "en"
    ? `Here are the opening hours of **${host.name}**:`
    : lang === "ar"
      ? `إليك ساعات عمل **${host.name}**:`
      : `Voici les horaires de **${host.name}** :`;
  const outro = lang === "en"
    ? `\n\nWant me to suggest something to do around **${host.name}** at a specific time of day?`
    : lang === "ar"
      ? `\n\nهل تريد اقتراحات لأنشطة قريبة من **${host.name}** في وقت معين؟`
      : `\n\nJe peux te suggérer une activité autour de **${host.name}** à un moment précis de la journée ?`;
  return `${intro}\n\n${lines.join("\n")}${outro}`;
}

/**
 * Parse prior assistant messages for the `<!--KNOWN_BUSINESSES:[...]-->` marker
 * and return the ids of previously-shown businesses (most recent turn first,
 * host excluded, deduped).
 */
function extractPriorKnownBusinessIds(messages: { role: string; content: any }[], hostId: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const content = String(m.content ?? "");
    // Prefer KNOWN_BUSINESSES, fall back to SHOW_ON_MAP (deterministic routes like
    // poi_nearby emit only SHOW_ON_MAP but still represent the latest result set).
    let arr: any = null;
    const knownMatch = content.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?\])-->/);
    if (knownMatch) {
      try { arr = JSON.parse(knownMatch[1].replace(/--&gt;/g, "-->")); } catch { /* ignore */ }
    }
    if (!arr) {
      const mapMatch = content.match(/<!--SHOW_ON_MAP:(\{[\s\S]*?\})-->/);
      if (mapMatch) {
        try {
          const parsed = JSON.parse(mapMatch[1].replace(/--&gt;/g, "-->"));
          if (parsed && Array.isArray(parsed.businesses)) arr = parsed.businesses;
        } catch { /* ignore */ }
      }
    }
    if (Array.isArray(arr)) {
      for (const b of arr) {
        const id = b?.id;
        if (typeof id === "string" && id && id !== hostId && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      if (ids.length) break; // stop at the most recent turn that had results
    }
  }
  return ids;
}

/**
 * Build a multi-business hours summary for the previous search results.
 * Only lists businesses that have `show_opening_hours = true`.
 * For each, shows today's slot (Morocco time) + a compact weekly line.
 */
async function buildHoursForBusinesses(admin: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, show_opening_hours, opening_hours, is_open_24h, phone, whatsapp")
    .in("id", ids.slice(0, 20));
  if (error || !Array.isArray(data) || !data.length) return null;

  // Preserve the order of the incoming ids.
  const byId = new Map<string, any>(data.map((b: any) => [b.id, b]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const withHours = ordered.filter((b: any) => b.show_opening_hours === true && (b.is_open_24h || (b.opening_hours && typeof b.opening_hours === "object")));
  const withoutHours = ordered.filter((b: any) => !(b.show_opening_hours === true));

  if (!withHours.length && !withoutHours.length) return null;

  const labels = DAY_LABELS[lang];
  const closedWord = lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  const open24Word = lang === "en" ? "Open 24/7" : lang === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";

  // Morocco day-of-week index into DAY_KEYS (which starts Monday).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Casablanca", weekday: "short" }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[wd] ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const todayLabel = labels[todayIdx];

  const formatSlot = (d: any): string => {
    if (!d) return "—";
    if (d.closed) return closedWord;
    if (!d.open || !d.close) return "—";
    let s = `${d.open}–${d.close}`;
    if (d.open2 && d.close2 && !d.continuous) s += ` / ${d.open2}–${d.close2}`;
    return s;
  };

  const formatWeek = (oh: any): string => {
    const chunks: string[] = [];
    DAY_KEYS.forEach((k, i) => {
      const short = labels[i].slice(0, 3);
      chunks.push(`${short} ${formatSlot(oh?.[k])}`);
    });
    return chunks.join(" · ");
  };

  const intro = lang === "en"
    ? `Here are the opening hours for the results above (${todayLabel} first):`
    : lang === "ar"
      ? `إليك ساعات العمل للنتائج السابقة (${todayLabel} أولًا):`
      : `Voici les horaires des résultats ci-dessus (${todayLabel} en premier) :`;

  const blocks: string[] = [];
  for (const b of withHours) {
    const loc = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const header = `**${b.name}**${loc ? ` — ${loc}` : ""}`;
    if (b.is_open_24h) {
      blocks.push(`- ${header} — ${open24Word}`);
      continue;
    }
    const today = formatSlot(b.opening_hours?.[todayKey]);
    const week = formatWeek(b.opening_hours);
    blocks.push(`- ${header}\n  · ${todayLabel} : ${today}\n  · ${week}`);
  }

  let out = `${intro}\n\n${blocks.join("\n")}`;

  if (withoutHours.length) {
    const names = withoutHours.map((b: any) => `**${b.name}**`).join(", ");
    const line = lang === "en"
      ? `\n\nHours are not published here for ${names} — best to contact them directly.`
      : lang === "ar"
        ? `\n\nساعات العمل غير منشورة لـ ${names} — يُفضّل التواصل معهم مباشرة.`
        : `\n\nHoraires non publiés ici pour ${names} — le mieux est de les contacter directement.`;
    out += line;
  }

  const outro = lang === "en"
    ? `\n\nWant me to filter by "open now" or suggest one for a specific time slot?`
    : lang === "ar"
      ? `\n\nهل تريد التصفية حسب "مفتوح الآن" أو اقتراح واحد لوقت معين؟`
      : `\n\nJe filtre sur « ouvert maintenant » ou je t'en propose un pour un créneau précis ?`;
  return out + outro;
}

function isOpensFirstIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(premier|premiere|1er|1ere).{0,20}(ouvr|ouverture)/.test(n)) return true;
  if (/\bqui ouvre.{0,15}(tot|premier|en premier|le plus tot)/.test(n)) return true;
  if (/\bouvre.{0,10}le plus tot/.test(n)) return true;
  if (/\b(opens? (?:the )?(?:first|earliest)|earliest to open|which .* opens first)\b/i.test(text)) return true;
  if (/(الأول|أول).{0,15}(يفتح|فتح)/.test(text)) return true;
  return false;
}

function isClosesLastIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(dernier|derniere).{0,20}(ferm)/.test(n)) return true;
  if (/\bqui ferme.{0,15}(tard|dernier|en dernier|le plus tard)/.test(n)) return true;
  if (/\bferme.{0,10}le plus tard/.test(n)) return true;
  if (/\b(closes? (?:the )?(?:last|latest)|latest to close|stays open (?:the )?latest)\b/i.test(text)) return true;
  if (/(الأخير|آخر).{0,15}(يغلق|يقفل|إغلاق)/.test(text)) return true;
  return false;
}

/**
 * Rank previous results by earliest opening time or latest closing time today (Morocco).
 * Uses opening_hours (both slots) and is_open_24h. Excludes businesses whose hours
 * are hidden (show_opening_hours != true) or closed today / on vacation.
 */
async function buildHoursRanking(
  admin: any,
  ids: string[],
  mode: "opens_first" | "closes_last",
  lang: "fr" | "en" | "ar",
): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, show_opening_hours, opening_hours, is_open_24h, vacation_dates")
    .in("id", ids.slice(0, 30));
  if (error || !Array.isArray(data) || !data.length) return null;

  // Morocco day + date
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[wd] ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const y = parts.find((p) => p.type === "year")?.value || "";
  const mo = parts.find((p) => p.type === "month")?.value || "";
  const da = parts.find((p) => p.type === "day")?.value || "";
  const todayStr = `${y}-${mo}-${da}`;

  const toMin = (s: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  type Row = { id: string; name: string; slug: string; city?: string; neighborhood?: string; opens: number; closes: number; is24: boolean };
  const rows: Row[] = [];

  for (const b of data) {
    if (b.show_opening_hours !== true) continue;
    // Vacation check
    if (Array.isArray(b.vacation_dates)) {
      const onVac = b.vacation_dates.some((v: any) => v?.start_date && v?.end_date && todayStr >= v.start_date && todayStr <= v.end_date);
      if (onVac) continue;
    }
    if (b.is_open_24h) {
      rows.push({ id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood, opens: 0, closes: 1440, is24: true });
      continue;
    }
    const oh = b.opening_hours;
    const d = oh?.[todayKey];
    if (!d || d.closed || !d.open || !d.close) continue;
    const o1 = toMin(d.open); const c1 = toMin(d.close);
    if (o1 == null || c1 == null) continue;
    const opens = o1;
    let closes = c1 <= o1 ? c1 + 1440 : c1;
    if (d.open2 && d.close2 && !d.continuous) {
      const c2 = toMin(d.close2);
      if (c2 != null) {
        const c2Adj = c2 <= (toMin(d.open2) ?? 0) ? c2 + 1440 : c2;
        if (c2Adj > closes) closes = c2Adj;
      }
    }
    rows.push({ id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood, opens, closes, is24: false });
  }

  if (!rows.length) {
    if (lang === "en") return `I don't have public hours for the previous results — hard to rank them. Want me to try something else?`;
    if (lang === "ar") return `ليست لديّ ساعات عمل منشورة للنتائج السابقة — يصعب ترتيبها. هل تريد شيئًا آخر؟`;
    return `Je n'ai pas d'horaires publics sur les précédentes adresses — difficile de les classer. Je peux t'aider autrement ?`;
  }

  const sorted = mode === "opens_first"
    ? [...rows].sort((a, b) => (a.is24 ? -1 : b.is24 ? 1 : a.opens - b.opens))
    : [...rows].sort((a, b) => (a.is24 ? -1 : b.is24 ? 1 : b.closes - a.closes));

  const top = sorted.slice(0, Math.min(5, sorted.length));
  const fmt = (m: number) => {
    const mm = ((m % 1440) + 1440) % 1440;
    const h = Math.floor(mm / 60); const min = mm % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };
  const dayLabel = DAY_LABELS[lang][todayIdx];

  const lines = top.map((r) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    if (r.is24) {
      const w = lang === "en" ? "Open 24/7" : lang === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w}`;
    }
    if (mode === "opens_first") {
      const w = lang === "en" ? "opens at" : lang === "ar" ? "يفتح في" : "ouvre à";
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w} ${fmt(r.opens)}`;
    }
    const w = lang === "en" ? "closes at" : lang === "ar" ? "يغلق في" : "ferme à";
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w} ${fmt(r.closes)}`;

  });

  const intro = mode === "opens_first"
    ? (lang === "en" ? `Among the previous results, **${top[0].name}** opens the earliest today (${dayLabel}):`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** يفتح أبكر اليوم (${dayLabel}):`
      : `Parmi les précédents, c'est **${top[0].name}** qui ouvre le plus tôt aujourd'hui (${dayLabel}) :`)
    : (lang === "en" ? `Among the previous results, **${top[0].name}** closes the latest today (${dayLabel}):`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** يغلق متأخرًا اليوم (${dayLabel}):`
      : `Parmi les précédents, c'est **${top[0].name}** qui ferme le plus tard aujourd'hui (${dayLabel}) :`);

  const skipped = ids.length - rows.length;
  const outro = skipped > 0
    ? (lang === "en" ? `\n\n_(${skipped} result${skipped > 1 ? "s" : ""} excluded: hours not published or closed today.)_`
      : lang === "ar" ? `\n\n_(${skipped} نتيجة مستبعدة: الساعات غير منشورة أو مغلقة اليوم.)_`
      : `\n\n_(${skipped} résultat${skipped > 1 ? "s" : ""} exclu${skipped > 1 ? "s" : ""} : horaires non publiés ou fermé aujourd'hui.)_`)
    : "";

  return `${intro}\n\n${lines.join("\n")}${outro}`;
}

// ============================================================
// Deterministic ranking / filter / pick on prior results
// ============================================================

function isDistanceRankingIntent(text: string): "closest" | "farthest" | null {
  const n = normalize(text);
  if (!n) return null;
  if (/\b(le plus proche|la plus proche|les plus proches|plus pres|le plus pres)\b/.test(n)) return "closest";
  if (/\b(closest|nearest)\b/i.test(text)) return "closest";
  if (/(الأقرب|أقرب واحد)/.test(text)) return "closest";
  if (/\b(le plus loin|la plus loin|les plus loins|plus eloigne|le plus eloigne)\b/.test(n)) return "farthest";
  if (/\b(farthest|furthest)\b/i.test(text)) return "farthest";
  if (/(الأبعد)/.test(text)) return "farthest";
  return null;
}

function isDistanceListIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(quelles?\s+sont\s+les\s+distances?|distances?\s+(depuis|par\s+rapport|de\s+chaque)|liste\s+des\s+distances?|donne[- ]?moi\s+les\s+distances?|a\s+quelle\s+distance)\b/.test(n)) return true;
  if (/\b(what\s+are\s+the\s+distances?|list\s+the\s+distances?|how\s+far\s+(is|are)\s+each|distances?\s+from)\b/i.test(text)) return true;
  if (/(ما\s+هي\s+المسافات|المسافات\s+من|كم\s+تبعد)/.test(text)) return true;
  return false;
}

function isRatingRankingIntent(text: string): "best_rated" | "most_reviewed" | null {
  const n = normalize(text);
  if (!n) return null;
  if (/\b(le plus d['\s]?avis|le plus commente|les plus commentes|le plus populaire|les plus populaires)\b/.test(n)) return "most_reviewed";
  if (/\b(most reviews?|most reviewed|most popular)\b/i.test(text)) return "most_reviewed";
  if (/(الأكثر تقييما|الأكثر شعبية|الأكثر مراجعة)/.test(text)) return "most_reviewed";
  if (/\b(le mieux note|la mieux notee|le meilleur note|meilleure note|top note|le mieux classe)\b/.test(n)) return "best_rated";
  if (/\b(highest[- ]?rated|best[- ]?rated|top[- ]?rated)\b/i.test(text)) return "best_rated";
  if (/(الأعلى تقييما|الأفضل تقييما)/.test(text)) return "best_rated";
  return null;
}

type OpenFilterIntent = { kind: "now" | "slot"; startH?: number; endH?: number; label: string; dayOffset?: number };

function parseOpenFilterIntent(text: string): OpenFilterIntent | null {
  const n = normalize(text);
  if (!n) return null;
  const filterHint = /\b(lesquels|lesquelles|quels|quelles|which|lequel|laquelle|filtre|filtrer|only|seulement|garde|ouverts?|open|مفتوح|أي(?:ها)?)\b/i.test(text);
  if (!filterHint) return null;
  if (/\b(demain\s+soir|tomorrow\s+(?:evening|night))\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "tomorrow evening", dayOffset: 1 };
  if (/\b(demain\s+midi|tomorrow\s+(?:noon|lunch))\b/i.test(text)) return { kind: "slot", startH: 12, endH: 14, label: "tomorrow lunch", dayOffset: 1 };
  if (/\b(demain\s+matin|tomorrow\s+morning)\b/i.test(text)) return { kind: "slot", startH: 8, endH: 12, label: "tomorrow morning", dayOffset: 1 };
  if (/\b(demain|tomorrow|غدا)\b/i.test(text)) return { kind: "slot", startH: 10, endH: 22, label: "tomorrow", dayOffset: 1 };
  if (/\b(maintenant|actuellement|now|right now|الآن)\b/i.test(text)) return { kind: "now", label: "now" };
  if (/\b(ce soir|soiree|tonight|this evening|الليلة)\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "evening", dayOffset: 0 };
  if (/\b(matin|morning|صباح)\b/i.test(text)) return { kind: "slot", startH: 8, endH: 12, label: "morning", dayOffset: 0 };
  if (/\b(midi|dejeuner|lunch|غداء)\b/i.test(text)) return { kind: "slot", startH: 12, endH: 14, label: "lunch", dayOffset: 0 };
  if (/\b(apres[- ]?midi|after ?noon|بعد الظهر)\b/i.test(text)) return { kind: "slot", startH: 14, endH: 18, label: "afternoon", dayOffset: 0 };
  if (/\b(diner|dinner|عشاء)\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "dinner", dayOffset: 0 };
  if (/\b(nuit|night|nocturne|ليل)\b/i.test(text)) return { kind: "slot", startH: 22, endH: 26, label: "night", dayOffset: 0 };
  if (/\b(ouverts?|open|مفتوح)\b/i.test(text)) return { kind: "now", label: "now" };
  return null;
}

function parseOrdinalIntent(text: string, priorCount: number): number[] | null {
  if (priorCount <= 0) return null;
  const n = normalize(text);
  const firstK = /\b(?:les?\s+)?(\d+)\s+premiers?\b/.exec(n) || /\b(?:the\s+)?(?:first|top)\s+(\d+)\b/i.exec(text);
  if (firstK) {
    const k = Math.max(1, Math.min(priorCount, parseInt(firstK[1], 10)));
    return Array.from({ length: k }, (_, i) => i);
  }
  const lastK = /\b(?:les?\s+)?(\d+)\s+derniers?\b/.exec(n) || /\b(?:the\s+)?last\s+(\d+)\b/i.exec(text);
  if (lastK) {
    const k = Math.max(1, Math.min(priorCount, parseInt(lastK[1], 10)));
    return Array.from({ length: k }, (_, i) => priorCount - k + i);
  }
  if (/\b(le\s+premier|la\s+premiere|the\s+first|1er|1ere)\b/i.test(text)) return [0];
  if (/\b(le\s+dernier|la\s+derniere|the\s+last)\b/i.test(text)) return [priorCount - 1];
  const nth = /\ble\s+(\d+)(?:e|eme|er|ere)?\b/.exec(n) || /\b(?:the\s+)?(\d+)(?:st|nd|rd|th)\b/i.exec(text);
  if (nth) {
    const i = parseInt(nth[1], 10) - 1;
    if (i >= 0 && i < priorCount) return [i];
  }
  return null;
}

function isCountIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(combien|combien y en a|combien il y en a|combien sont)\b/.test(n)) return true;
  if (/\bhow many\b/i.test(text)) return true;
  if (/(كم عدد|كم واحد|كم منها)/.test(text)) return true;
  return false;
}

function extractPriorOrderedBusinesses(messages: any[], hostId: string): Array<{ id: string; slug?: string; name: string }> {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const content = String(m.content ?? "");
    const mapMatch = content.match(/<!--SHOW_ON_MAP:(\{[\s\S]*?\})-->/);
    if (mapMatch) {
      try {
        const parsed = JSON.parse(mapMatch[1]);
        if (parsed && Array.isArray(parsed.businesses)) {
          const arr = parsed.businesses.filter((b: any) => b?.id && b.id !== hostId).map((b: any) => ({ id: b.id, slug: b.slug, name: b.name }));
          if (arr.length) return arr;
        }
      } catch { /* ignore */ }
    }
    const knownMatch = content.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?\])-->/);
    if (knownMatch) {
      try {
        const arr = JSON.parse(knownMatch[1]);
        if (Array.isArray(arr) && arr.length) {
          return arr.filter((b: any) => b?.id && b.id !== hostId).map((b: any) => ({ id: b.id, slug: b.slug, name: b.name }));
        }
      } catch { /* ignore */ }
    }
  }
  return [];
}

async function fetchPriorFull(admin: any, ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const { data } = await admin.from("businesses").select(
    "id, name, slug, city, neighborhood, address, main_category, latitude, longitude, logo_url, images, computed_rating, rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements, opening_hours, is_open_24h, vacation_dates, show_opening_hours"
  ).in("id", ids.slice(0, 30));
  return Array.isArray(data) ? data : [];
}

function orderByIds<T extends { id: string }>(arr: T[], ids: string[]): T[] {
  const map = new Map(arr.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const id of ids) { const v = map.get(id); if (v) out.push(v); }
  return out;
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
}

function toMapMarker(businesses: any[], title: string | null = null): string {
  const mapBusinesses = businesses.slice(0, 20).map((p: any) => ({
    id: p.id, slug: p.slug, name: p.name,
    city: p.city, neighborhood: p.neighborhood, address: p.address,
    main_category: p.main_category || "",
    categories: p.main_category ? [p.main_category] : [],
    latitude: p.latitude, longitude: p.longitude,
    logo_url: p.logo_url,
    images: Array.isArray(p.images) ? p.images : [],
    google_rating: p.google_rating, google_review_count: p.google_review_count,
    tripadvisor_rating: p.tripadvisor_rating, tripadvisor_review_count: p.tripadvisor_review_count,
    engagements: p.engagements,
  }));
  return `\n\n<!--SHOW_ON_MAP:${JSON.stringify({ title, businesses: mapBusinesses })}-->`;
}

async function buildDistanceRanking(admin: any, host: any, ids: string[], mode: "closest" | "farthest", lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const hLat = Number(host.latitude), hLng = Number(host.longitude);
  if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) return null;
  const rows = await fetchPriorFull(admin, ids);
  const withDist = rows
    .filter((r: any) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r: any) => ({ ...r, _dist_km: haversineKmLocal(hLat, hLng, Number(r.latitude), Number(r.longitude)) }));
  if (!withDist.length) return null;
  withDist.sort((a: any, b: any) => (mode === "closest" ? a._dist_km - b._dist_km : b._dist_km - a._dist_km));
  const top = withDist.slice(0, 5);
  const lines = top.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${fmtKm(r._dist_km)}`;
  });
  const intro = mode === "closest"
    ? (lang === "en" ? `Among the previous results, **${top[0].name}** is the closest to **${host.name}**:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** هو الأقرب إلى **${host.name}**:`
      : `Parmi les précédents, c'est **${top[0].name}** le plus proche de **${host.name}** :`)
    : (lang === "en" ? `Among the previous results, **${top[0].name}** is the farthest from **${host.name}**:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** هو الأبعد عن **${host.name}**:`
      : `Parmi les précédents, c'est **${top[0].name}** le plus loin de **${host.name}** :`);
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
}

async function buildDistanceList(admin: any, host: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const hLat = Number(host.latitude), hLng = Number(host.longitude);
  if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) return null;
  const rows = await fetchPriorFull(admin, ids);
  const withDist = rows
    .filter((r: any) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r: any) => ({ ...r, _dist_km: haversineKmLocal(hLat, hLng, Number(r.latitude), Number(r.longitude)) }));
  if (!withDist.length) return null;
  withDist.sort((a: any, b: any) => a._dist_km - b._dist_km);
  const lines = withDist.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${fmtKm(r._dist_km)}`;
  });
  const intro = lang === "en"
    ? `Distances from **${host.name}** for the previous results:`
    : lang === "ar"
      ? `المسافات من **${host.name}** للنتائج السابقة:`
      : `Distances depuis **${host.name}** pour les résultats précédents :`;
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(withDist)}`;
}


async function buildRatingRanking(admin: any, ids: string[], mode: "best_rated" | "most_reviewed", lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const rows = await fetchPriorFull(admin, ids);
  if (!rows.length) return null;
  const scored = rows.map((r: any) => ({
    ...r,
    _rating: r.computed_rating != null ? Number(r.computed_rating) : (r.rating != null ? Number(r.rating) : null),
    _count: r.total_review_count != null ? Number(r.total_review_count) : 0,
  }));
  if (mode === "best_rated") {
    const eligible = scored.filter((r: any) => r._rating != null && r._count >= 10);
    if (!eligible.length) {
      if (lang === "en") return `I don't have enough public reviews on those results to rank them by rating. Want another angle?`;
      if (lang === "ar") return `لا توجد مراجعات كافية لتصنيف هذه النتائج حسب التقييم. زاوية أخرى؟`;
      return `Je n'ai pas assez d'avis publics sur ces adresses pour les classer par note. Un autre angle ?`;
    }
    eligible.sort((a: any, b: any) => (b._rating - a._rating) || (b._count - a._count));
    const top = eligible.slice(0, 5);
    const lines = top.map((r: any) => {
      const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ⭐ ${r._rating.toFixed(1)}/20 (${r._count} avis)`;
    });
    const intro = lang === "en" ? `Among the previous results, **${top[0].name}** has the highest overall rating:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** لديه أعلى تقييم عام:`
      : `Parmi les précédents, c'est **${top[0].name}** qui a la meilleure note globale :`;
    return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
  }
  scored.sort((a: any, b: any) => b._count - a._count);
  const top = scored.filter((r: any) => r._count > 0).slice(0, 5);
  if (!top.length) {
    if (lang === "en") return `I don't have public review counts on those results.`;
    if (lang === "ar") return `لا توجد أعداد مراجعات علنية لهذه النتائج.`;
    return `Je n'ai pas de nombre d'avis publics sur ces adresses.`;
  }
  const lines = top.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${r._count} avis`;
  });
  const intro = lang === "en" ? `Among the previous results, **${top[0].name}** has the most reviews:`
    : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** لديه أكبر عدد من المراجعات:`
    : `Parmi les précédents, c'est **${top[0].name}** qui a le plus d'avis :`;
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
}

async function buildOpenFilter(admin: any, ids: string[], intent: OpenFilterIntent, lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const rows = await fetchPriorFull(admin, ids);
  if (!rows.length) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[get("weekday")] ?? 0;
  const nowMin = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
  const dayOffset = intent.kind === "now" ? 0 : (intent.dayOffset ?? 0);
  const dayIdx = (todayIdx + dayOffset) % 7;
  const dayKey = DAY_KEYS[dayIdx];

  const slotStart = intent.kind === "now" ? nowMin : (intent.startH ?? 0) * 60;
  const slotEnd = intent.kind === "now" ? nowMin + 1 : (intent.endH ?? 24) * 60;

  const toMin = (s: string): number | null => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; };
  const overlaps = (openStr?: string, closeStr?: string): boolean => {
    if (!openStr || !closeStr) return false;
    const o = toMin(openStr), c = toMin(closeStr); if (o == null || c == null) return false;
    const cAdj = c <= o ? c + 1440 : c;
    const sEnd = slotEnd <= slotStart ? slotEnd + 1440 : slotEnd;
    return slotStart < cAdj && sEnd > o;
  };

  const y = get("year"), mo = get("month"), da = get("day");
  const target = new Date(`${y}-${mo}-${da}T00:00:00Z`); target.setUTCDate(target.getUTCDate() + dayOffset);
  const targetStr = target.toISOString().slice(0, 10);

  const kept: any[] = [];
  for (const b of rows) {
    if (b.is_open_24h) { kept.push(b); continue; }
    if (b.show_opening_hours !== true) continue;
    if (Array.isArray(b.vacation_dates)) {
      const onVac = b.vacation_dates.some((v: any) => v?.start_date && v?.end_date && targetStr >= v.start_date && targetStr <= v.end_date);
      if (onVac) continue;
    }
    const d = b.opening_hours?.[dayKey];
    if (!d || d.closed) continue;
    if (overlaps(d.open, d.close) || (!d.continuous && overlaps(d.open2, d.close2))) kept.push(b);
  }

  const ordered = orderByIds(kept, ids);
  const labelMap: Record<string, Record<string, string>> = {
    now: { fr: "ouverts maintenant", en: "open now", ar: "مفتوحة الآن" },
    evening: { fr: "ouverts ce soir", en: "open this evening", ar: "مفتوحة هذا المساء" },
    dinner: { fr: "ouverts pour le dîner", en: "open for dinner", ar: "مفتوحة للعشاء" },
    morning: { fr: "ouverts ce matin", en: "open this morning", ar: "مفتوحة هذا الصباح" },
    lunch: { fr: "ouverts pour le déjeuner", en: "open for lunch", ar: "مفتوحة للغداء" },
    afternoon: { fr: "ouverts cet après-midi", en: "open this afternoon", ar: "مفتوحة بعد الظهر" },
    night: { fr: "ouverts en soirée tardive", en: "open late", ar: "مفتوحة ليلاً" },
    tomorrow: { fr: "ouverts demain", en: "open tomorrow", ar: "مفتوحة غدًا" },
    "tomorrow evening": { fr: "ouverts demain soir", en: "open tomorrow evening", ar: "مفتوحة غدًا مساءً" },
    "tomorrow lunch": { fr: "ouverts demain midi", en: "open tomorrow at lunch", ar: "مفتوحة غدًا للغداء" },
    "tomorrow morning": { fr: "ouverts demain matin", en: "open tomorrow morning", ar: "مفتوحة غدًا صباحًا" },
  };
  const label = labelMap[intent.label]?.[lang] || labelMap.now[lang];

  if (!ordered.length) {
    if (lang === "en") return `None of the previous results are **${label}** based on published hours.`;
    if (lang === "ar") return `لا توجد من النتائج السابقة **${label}** حسب الساعات المنشورة.`;
    return `Aucun des résultats précédents n'est **${label}** selon les horaires publiés.`;
  }

  const lines = ordered.slice(0, 10).map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""}`;
  });
  const skipped = ids.length - ordered.length;
  const intro = lang === "en" ? `Filtered to **${ordered.length}** result${ordered.length > 1 ? "s" : ""} ${label}:`
    : lang === "ar" ? `تم التصفية إلى **${ordered.length}** نتيجة ${label}:`
    : `Filtré : **${ordered.length}** résultat${ordered.length > 1 ? "s" : ""} ${label} :`;
  const outro = skipped > 0
    ? (lang === "en" ? `\n\n_(${skipped} excluded: hours not published or closed.)_`
      : lang === "ar" ? `\n\n_(${skipped} مستبعدة: الساعات غير منشورة أو مغلقة.)_`
      : `\n\n_(${skipped} exclu${skipped > 1 ? "s" : ""} : horaires non publiés ou fermé.)_`)
    : "";
  return `${intro}\n\n${lines.join("\n")}${outro}${toMapMarker(ordered)}`;
}

function buildOrdinalPick(prior: Array<{ id: string; slug?: string; name: string }>, indices: number[], lang: "fr" | "en" | "ar"): string {
  const picks = indices.map((i) => prior[i]).filter(Boolean);
  if (!picks.length) {
    if (lang === "en") return `That position isn't in the previous list.`;
    if (lang === "ar") return `هذا الموقع ليس في القائمة السابقة.`;
    return `Cette position n'est pas dans la liste précédente.`;
  }
  const names = picks.map((p) => `**${p.name}**`).join(lang === "ar" ? "، " : ", ");
  if (picks.length === 1) {
    if (lang === "en") return `That's ${names} — want more detail, hours, or a booking link?`;
    if (lang === "ar") return `هذا ${names} — هل تريد تفاصيل، ساعات، أو رابط حجز؟`;
    return `C'est ${names} — tu veux plus de détails, les horaires, ou un lien de réservation ?`;
  }
  if (lang === "en") return `Those are ${names}. Want me to compare them?`;
  if (lang === "ar") return `هؤلاء هم ${names}. هل تريد المقارنة بينهم؟`;
  return `Ce sont ${names}. Je te les compare ?`;
}

function buildCountAnswer(count: number, lang: "fr" | "en" | "ar"): string {
  if (count === 0) {
    if (lang === "en") return `There are no previous results to count.`;
    if (lang === "ar") return `لا توجد نتائج سابقة للعد.`;
    return `Il n'y a pas de résultats précédents à compter.`;
  }
  if (lang === "en") return `There ${count > 1 ? "are" : "is"} **${count}** result${count > 1 ? "s" : ""} in the previous selection. Want me to rank them or filter them?`;
  if (lang === "ar") return `يوجد **${count}** نتيجة في الاختيار السابق. هل تريد ترتيبها أو تصفيتها؟`;
  return `Il y a **${count}** résultat${count > 1 ? "s" : ""} dans la sélection précédente. Tu veux que je les classe ou les filtre ?`;
}





function isReserveCta(cta: string | null | undefined, mode: string | null | undefined): boolean {
  const raw = `${cta || ""} ${mode || ""}`;
  const n = normalize(raw);
  if (!n) return false;
  if (/reserv/.test(n)) return true; // reserve / reservez / reserver_en_ligne / reservation
  if (/\bbook(?:ing)?\b/.test(n)) return true;
  return false;
}

function buildBookingAnswer(host: any, lang: "fr" | "en" | "ar"): string {
  const candidates: { url: string; label: string }[] = [];
  const push = (url: any, cta: any, mode: any) => {
    if (!url || typeof url !== "string") return;
    if (!isReserveCta(cta, mode)) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const label = (cta && String(cta).trim()) || (lang === "en" ? "Book online" : lang === "ar" ? "احجز عبر الإنترنت" : "Réserver en ligne");
    candidates.push({ url: fullUrl, label });
  };
  push(host.reserve_now_url, host.reserve_now_cta, host.presentation_mode);
  push(host.online_shop_url, host.online_shop_cta, host.online_shop_presentation_mode);
  push(host.url_4, host.url_4_cta, host.url_4_presentation_mode);
  push(host.url_5, host.url_5_cta, host.url_5_presentation_mode);

  if (candidates.length) {
    const first = candidates[0];
    const linksLine = candidates.map((c) => `[${c.label}](${c.url})`).join(" · ");
    if (lang === "en") {
      return `Yes — you can book **${host.name}** online right now. ${linksLine}\n\nWould you like me to suggest a great table or activity to combine with your stay?`;
    }
    if (lang === "ar") {
      return `نعم — يمكنك حجز **${host.name}** مباشرة عبر الإنترنت. ${linksLine}\n\nهل تريد اقتراح مطعم أو نشاط لتكمل إقامتك؟`;
    }
    return `Oui — tu peux réserver **${host.name}** en ligne dès maintenant. ${linksLine}\n\nJe peux te suggérer une belle table ou une activité à combiner avec ton séjour ?`;
  }

  // No online reservation URL — fallback to phone/WhatsApp
  const contacts: string[] = [];
  if (host.whatsapp) contacts.push(lang === "en" ? `WhatsApp: ${host.whatsapp}` : lang === "ar" ? `واتساب: ${host.whatsapp}` : `WhatsApp : ${host.whatsapp}`);
  if (host.phone) contacts.push(lang === "en" ? `phone: ${host.phone}` : lang === "ar" ? `هاتف: ${host.phone}` : `téléphone : ${host.phone}`);
  const contactLine = contacts.length ? contacts.join(" · ") : (host.website || "");
  if (lang === "en") {
    return `**${host.name}** doesn't offer online booking on this page. The team handles reservations directly${contactLine ? ` — ${contactLine}` : ""}. Would you like me to suggest something to do nearby?`;
  }
  if (lang === "ar") {
    return `**${host.name}** لا يوفر الحجز عبر الإنترنت على هذه الصفحة. يتولى الفريق الحجوزات مباشرة${contactLine ? ` — ${contactLine}` : ""}. هل تريد اقتراحات قريبة؟`;
  }
  return `**${host.name}** ne propose pas de réservation en ligne sur cette page. L'équipe s'occupe des réservations directement${contactLine ? ` — ${contactLine}` : ""}. Je peux te suggérer quelque chose à faire à proximité ?`;
}

/**
 * Build a multi-business booking summary for the previous search results.
 * Scans reserve_now_url + online_shop_url + url_4 + url_5 with a Reserve/Book CTA.
 * Businesses without an online booking URL fall back to phone/WhatsApp.
 */
async function buildBookingForBusinesses(admin: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, city, neighborhood, phone, whatsapp, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, url_5_cta, url_5_presentation_mode")
    .in("id", ids.slice(0, 20));
  if (error || !Array.isArray(data) || !data.length) return null;

  const byId = new Map<string, any>(data.map((b: any) => [b.id, b]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const defaultLabel = lang === "en" ? "Book online" : lang === "ar" ? "احجز عبر الإنترنت" : "Réserver en ligne";
  const collectLinks = (b: any): { url: string; label: string }[] => {
    const out: { url: string; label: string }[] = [];
    const push = (url: any, cta: any, mode: any) => {
      if (!url || typeof url !== "string") return;
      if (!isReserveCta(cta, mode)) return;
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const label = (cta && String(cta).trim()) || defaultLabel;
      out.push({ url: fullUrl, label });
    };
    push(b.reserve_now_url, b.reserve_now_cta, b.presentation_mode);
    push(b.online_shop_url, b.online_shop_cta, b.online_shop_presentation_mode);
    push(b.url_4, b.url_4_cta, b.url_4_presentation_mode);
    push(b.url_5, b.url_5_cta, b.url_5_presentation_mode);
    return out;
  };

  const bookable: { b: any; links: { url: string; label: string }[] }[] = [];
  const contactOnly: any[] = [];
  for (const b of ordered) {
    const links = collectLinks(b);
    if (links.length) bookable.push({ b, links });
    else contactOnly.push(b);
  }

  if (!bookable.length && !contactOnly.length) return null;

  const intro = lang === "en"
    ? `Here's the online booking status for the results above:`
    : lang === "ar"
      ? `إليك حالة الحجز عبر الإنترنت للنتائج السابقة:`
      : `Voici le statut de réservation en ligne pour les résultats ci-dessus :`;

  const blocks: string[] = [];
  for (const { b, links } of bookable) {
    const loc = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const header = `**${b.name}**${loc ? ` — ${loc}` : ""}`;
    const linksLine = links.map((c) => `[${c.label}](${c.url})`).join(" · ");
    blocks.push(`- ${header}\n  · ${linksLine}`);
  }
  for (const b of contactOnly) {
    const loc = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const header = `**${b.name}**${loc ? ` — ${loc}` : ""}`;
    const contacts: string[] = [];
    if (b.whatsapp) contacts.push(lang === "en" ? `WhatsApp ${b.whatsapp}` : lang === "ar" ? `واتساب ${b.whatsapp}` : `WhatsApp ${b.whatsapp}`);
    if (b.phone) contacts.push(lang === "en" ? `phone ${b.phone}` : lang === "ar" ? `هاتف ${b.phone}` : `tél. ${b.phone}`);
    const noOnline = lang === "en"
      ? "No online booking"
      : lang === "ar"
        ? "لا حجز عبر الإنترنت"
        : "Pas de réservation en ligne";
    const line = contacts.length ? `${noOnline} — ${contacts.join(" · ")}` : noOnline;
    blocks.push(`- ${header}\n  · ${line}`);
  }

  const outro = lang === "en"
    ? `\n\nWant me to focus on the ones you can book right now?`
    : lang === "ar"
      ? `\n\nهل تريد أن أركز على الأماكن التي يمكنك حجزها الآن؟`
      : `\n\nJe me concentre sur ceux que tu peux réserver directement en ligne ?`;

  return `${intro}\n\n${blocks.join("\n")}${outro}`;
}




function isNearbyOverviewIntent(text: string, hostName?: string): boolean {
  const q = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!q) return false;
  if (/que faire.*(proximite|autour)/.test(q)) return true;
  if (/what to do.*(nearby|around|near me)/.test(q)) return true;
  if (/ما(ذا)?.*(قرب|حول)/.test(q)) return true;
  // Generic "à proximité de / près de / autour de / near / around / close to <lieu>"
  if (/\b(a\s+proximite\s+de|pres\s+de|proche\s+de|autour\s+de|a\s+cote\s+de|aux\s+alentours\s+de|near|around|close\s+to|next\s+to)\b/.test(q)) return true;
  if (hostName) {
    const hn = normalize(hostName);
    if (hn && q.includes(hn)) {
      // "à proximité", "autour", "nearby" mentioned near host name
      if (/(proximite|autour|pres|nearby|around|close|near)/.test(q)) return true;
    }
  }
  return false;
}

// Detect any "à proximité / autour de / near / around / قرب" phrasing,
// independent of the nearby-overview route (which requires no other filter).
function isProximityIntent(text: string): boolean {
  const q = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!q) return false;
  if (/\b(a\s+proximite|proximite|pres\s+de|proche\s+de|autour\s+de|autour|a\s+cote\s+de|aux\s+alentours|nearby|near\s+me|near\s+by|close\s+to|around|next\s+to|walking\s+distance)\b/.test(q)) return true;
  if (/(قرب|بالقرب|حول|بجوار|بجانب)/.test(text || "")) return true;
  // An explicit inline radius ("500 m", "à moins de 1 km", "within 2 km") implies
  // a proximity refinement on the current thread.
  if (parseInlineRadiusKm(text) != null) return true;
  return false;
}

// A free-text message keeps the previous suggestion's deterministic context
// (badges / subcategories / pinned ids) only when it looks like a refinement
// of the same thread — proximity phrase, explicit radius, or a very short
// modifier ("à Marrakech", "moins cher", "500 m"). A longer free-text message
// without those signals is treated as a NEW topic and the suggestion force is
// dropped so we don't hijack the search with the previous badges.
function isSuggestionRefinement(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return true;
  if (isProximityIntent(raw)) return true;
  if (parseInlineRadiusKm(raw) != null) return true;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return true;
  return false;
}

// Parse an explicit radius the user typed inline (FR/EN/AR).
// Recognizes forms like "500 m", "500m", "à moins de 500 m", "0.5 km", "2 km",
// "within 500 m", "within 2 km", "أقل من 500 م", "ضمن 2 كم".
// Returns kilometres, or null if not found.
function parseInlineRadiusKm(text: string): number | null {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  const q = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // km first (avoids "m" of "km" being caught as metres)
  const km = q.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilom[eè]tres?|kilomet(?:er|re)s?|كم|كيلومتر)\b/);
  if (km) {
    const v = Number(km[1].replace(",", "."));
    if (Number.isFinite(v) && v > 0 && v <= 50) return v;
  }
  const m = q.match(/(\d{2,4})\s*(?:m|metres?|meters?|م)\b/);
  if (m) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v >= 50 && v <= 20000) return v / 1000;
  }
  return null;
}

function haversineKmLocal(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// TWO-ENTITY PROXIMITY (curated only): "A à côté d'un B" where A and B are
// resolved from staff-picked subcategories/badges on the active suggestion.
// No free-text fallback — free "A à côté d'un B" queries fall through to the
// LLM via search_businesses.
// ─────────────────────────────────────────────────────────────────────────────

type TwoEntityIntent = {
  aTerms: string[];
  bTerm: string;
  radiusKm?: number;
};




// Curated variant: uses staff-picked subcatIds/badgeIds for A and B directly,
// skipping resolveEntityTerm. Any match on subcategory OR badge is trusted.
async function fetchEntityPoolFromCurated(
  admin: any,
  city: string,
  side: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] },
  excludeId?: string,
): Promise<any[]> {
  const cols = "id, slug, name, city, neighborhood, hook_fr, hook_en, hook_ar, description, description_en, description_ar, latitude, longitude, main_category, categories, services, badge_id, images, logo_url, priority_score, computed_rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count";
  const base = () => {
    let q = admin
      .from("businesses")
      .select(cols)
      .eq("is_active", true)
      .is("closure_message", null)
      .eq("city", city)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(200);
    if (excludeId) q = q.neq("id", excludeId);
    return q;
  };
  const runs: Promise<{ data: any[] | null }>[] = [];
  if (side.subcatNames.length) {
    runs.push(base().overlaps("categories", side.subcatNames));
    runs.push(base().in("main_category", side.subcatNames));
  }
  if (side.badgeIds.length) {
    runs.push(base().in("badge_id", side.badgeIds));
  }
  const out = new Map<string, any>();
  if (runs.length) {
    const results = await Promise.all(runs);
    for (const r of results) for (const b of r.data || []) if (b?.id) out.set(b.id, b);
  }
  return [...out.values()];
}

async function buildTwoEntityProximityCurated(
  admin: any,
  host: any,
  intent: TwoEntityIntent,
  lang: "fr" | "en" | "ar",
  strictRadius: boolean,
  curated: {
    a: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
    b: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
  },
): Promise<{ text: string; results: any[]; radiusUsed: number; radiusExpanded: boolean; bTerm: string; aTerms: string[] } | null> {
  const city = host.city || "Marrakech";
  const [poolA, poolB] = await Promise.all([
    fetchEntityPoolFromCurated(admin, city, curated.a, host?.id),
    fetchEntityPoolFromCurated(admin, city, curated.b, host?.id),
  ]);
  if (!poolA.length || !poolB.length) return null;

  const initial = intent.radiusKm ?? 1;
  const ladder = strictRadius ? [initial] : [initial, Math.max(initial, 2), Math.max(initial, 3)];
  let kept: any[] = [];
  let radiusUsed = initial;
  for (const r of ladder) {
    kept = poolA
      .map((a) => {
        let bestKm = Infinity;
        let bestB: any = null;
        for (const b of poolB) {
          if (b.id === a.id) continue;
          if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
          const d = haversineKmLocal(a.latitude, a.longitude, b.latitude, b.longitude);
          if (d < bestKm) { bestKm = d; bestB = b; }
        }
        return bestKm <= r ? { ...a, _nearest_b_km: bestKm, _nearest_b_name: bestB?.name || null } : null;
      })
      .filter(Boolean) as any[];
    if (kept.length) { radiusUsed = r; break; }
  }
  if (!kept.length) return null;

  kept.sort((x, y) => (Number(y.priority_score ?? 0) - Number(x.priority_score ?? 0)) || (Number(y.computed_rating ?? 0) - Number(x.computed_rating ?? 0)));
  const top = kept.slice(0, 12);

  // Collect the B references actually used (nearest B for each kept A within radius).
  const usedBIds = new Set<string>();
  const bReferences: any[] = [];
  for (const a of top) {
    let bestKm = Infinity;
    let bestB: any = null;
    for (const b of poolB) {
      if (b.id === a.id) continue;
      if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
      const d = haversineKmLocal(a.latitude, a.longitude, b.latitude, b.longitude);
      if (d < bestKm) { bestKm = d; bestB = b; }
    }
    if (bestB && !usedBIds.has(bestB.id)) {
      usedBIds.add(bestB.id);
      bReferences.push({ ...bestB, _is_reference: true });
    }
  }

  const radiusExpanded = radiusUsed > (intent.radiusKm ?? 1);
  const fmt = (r: number) => (r < 1 ? `${Math.round(r * 1000)} m` : Number.isInteger(r) ? `${r} km` : `${r.toFixed(1)} km`);
  const aLabel = intent.aTerms[0] || (lang === "en" ? "matching places" : lang === "ar" ? "الأماكن المطابقة" : "les adresses");
  const bLabel = intent.bTerm || (lang === "en" ? "reference" : lang === "ar" ? "المرجع" : "référence");

  const intro = lang === "en"
    ? `Curated cross-search in ${city} — I kept only places matching the selection with at least one reference within **${fmt(radiusUsed)}**. Here is the short list, One World Morocco selection only.`
    : lang === "ar"
      ? `تقاطع مُنسَّق في ${city} — احتفظت فقط بالأماكن التي تطابق الاختيار مع مرجع ضمن **${fmt(radiusUsed)}**. هذه القائمة المختصرة، من اختيار One World Morocco.`
      : `Croisement curé à ${city} — je n'ai gardé que les adresses correspondant à la sélection avec au moins une référence à moins de **${fmt(radiusUsed)}**. Voici la sélection courte, uniquement des adresses One World Morocco.`;

  const body = top.map((b) => {
    const hook = String(
      lang === "en" ? (b.hook_en || b.hook_fr || b.description_en || b.description || "") :
      lang === "ar" ? (b.hook_ar || b.hook_fr || b.description_ar || b.description || "") :
                      (b.hook_fr || b.hook_en || b.description || b.description_en || "")
    ).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const area = [b.neighborhood, b.city].filter(Boolean).join(lang === "ar" ? "، " : ", ");
    const km = Number(b._nearest_b_km);
    const distStr = Number.isFinite(km) ? fmt(km) : null;
    const nearestLabel = b._nearest_b_name
      ? (lang === "en" ? ` — closest reference: **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}` :
         lang === "ar" ? ` — أقرب مرجع: **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}` :
                         ` — référence la plus proche : **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}`)
      : "";
    const detail = hook || (Array.isArray(b.categories) ? b.categories.join(", ") : b.main_category || "");
    return `**${b.name}**${area ? `, ${area}` : ""}. ${detail}${nearestLabel}`;
  }).join("\n\n");

  const expansionNote = radiusExpanded
    ? (lang === "en" ? `\n\n> Not enough matches within ${fmt(intent.radiusKm ?? 1)} — expanded to **${fmt(radiusUsed)}**.`
      : lang === "ar" ? `\n\n> لا توجد نتائج كافية ضمن ${fmt(intent.radiusKm ?? 1)} — تم التوسيع إلى **${fmt(radiusUsed)}**.`
      : `\n\n> Pas assez de résultats à ${fmt(intent.radiusKm ?? 1)} — périmètre élargi à **${fmt(radiusUsed)}**.`)
    : "";

  const closing = lang === "en"
    ? `\n\nWant me to **narrow to ${fmt(Math.max(0.5, radiusUsed / 2))}** or **widen to ${fmt(radiusUsed * 2)}** — or filter by vibe or neighborhood?`
    : lang === "ar"
      ? `\n\nهل تريد **تضييق النطاق إلى ${fmt(Math.max(0.5, radiusUsed / 2))}** أو **توسيعه إلى ${fmt(radiusUsed * 2)}** — أو تصفية حسب الحي أو الأجواء؟`
      : `\n\nTu veux que je **resserre à ${fmt(Math.max(0.5, radiusUsed / 2))}** ou **élargisse à ${fmt(radiusUsed * 2)}** — ou que je filtre par quartier ou ambiance ?`;

  const text = `${intro}\n\n${body}${expansionNote}${closing}`;
  // Append B references (e.g. golfs) so they appear in the carousel + map markers.
  const combinedResults = [...top, ...bReferences];
  return { text, results: combinedResults, radiusUsed, radiusExpanded, bTerm: bLabel, aTerms: [aLabel] };
}





const FS_EMOJI: Record<string, string> = {
  "Restauration": "🍽️", "Hébergement": "🏨", "Bien-être": "🌿", "Vie nocturne": "🌙",
  "Culture": "🎭", "Artisanat marocain": "🧵", "Décoration": "🛋️", "Sport & Loisirs": "🏄",
  "Shopping": "🛍️", "Alimentation": "🥖", "Transport": "🚕", "Informatique": "💻",
  "Immobilier": "🏡", "Santé": "🩺", "Auto / Moto": "🚗",
};

const FS_I18N: Record<string, { en: string; ar: string }> = {
  "Restauration": { en: "Restaurants", ar: "المطاعم" },
  "Hébergement": { en: "Accommodation", ar: "الإقامة" },
  "Bien-être": { en: "Wellness", ar: "العافية" },
  "Vie nocturne": { en: "Nightlife", ar: "الحياة الليلية" },
  "Culture": { en: "Culture", ar: "الثقافة" },
  "Artisanat marocain": { en: "Moroccan crafts", ar: "الحرف المغربية" },
  "Décoration": { en: "Decoration", ar: "الديكور" },
  "Sport & Loisirs": { en: "Sports & Leisure", ar: "الرياضة والترفيه" },
  "Shopping": { en: "Shopping", ar: "التسوق" },
  "Alimentation": { en: "Food", ar: "الأغذية" },
  "Transport": { en: "Transport", ar: "النقل" },
  "Informatique": { en: "IT", ar: "المعلوماتية" },
  "Immobilier": { en: "Real estate", ar: "العقارات" },
  "Santé": { en: "Health", ar: "الصحة" },
  "Auto / Moto": { en: "Auto / Moto", ar: "السيارات" },
};

async function buildNearbyOverview(
  admin: any,
  host: any,
  hostCategoryNames: Set<string>,
  lang: "fr" | "en" | "ar",
  radiusKm: number = 1,
): Promise<string> {
  if (host.latitude == null || host.longitude == null) return "";
  const RADIUS_KM = radiusKm > 0 ? radiusKm : 1;
  const dLat = RADIUS_KM / 111;
  const dLng = RADIUS_KM / (111 * Math.max(Math.cos((host.latitude * Math.PI) / 180), 0.1));
  const { data: biz } = await admin
    .from("businesses")
    .select("id, latitude, longitude, categories, main_category")
    .eq("is_active", true)
    .is("closure_message", null)
    .neq("id", host.id)
    .gte("latitude", host.latitude - dLat)
    .lte("latitude", host.latitude + dLat)
    .gte("longitude", host.longitude - dLng)
    .lte("longitude", host.longitude + dLng);
  const nearby = (biz || []).filter((b: any) =>
    b.latitude != null && b.longitude != null &&
    haversineKmLocal(host.latitude, host.longitude, b.latitude, b.longitude) <= RADIUS_KM,
  );
  if (!nearby.length) return "";

  const bizCategories = new Map<string, Set<string>>();
  for (const b of nearby) {
    const names = Array.isArray(b.categories) ? b.categories : [];
    const normalized = names.map(normalize).filter(Boolean);
    if (b.main_category) normalized.push(normalize(b.main_category));
    if (normalized.length) bizCategories.set(b.id, new Set(normalized));
  }

  const [fsRes, fssRes] = await Promise.all([
    admin.from("front_structure").select("id, name, sort_order").order("sort_order"),
    admin.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
  ]);
  const fsEntries: any[] = fsRes.data || [];
  const subIds = [...new Set((fssRes.data || []).map((l: any) => l.subcategory_id).filter(Boolean))];
  const { data: subRows } = subIds.length
    ? await admin.from("subcategories").select("id, name_fr").in("id", subIds)
    : { data: [] };
  const subNameById = new Map<string, string>();
  for (const s of subRows || []) {
    const n = normalize(s.name_fr);
    if (s.id && n) subNameById.set(s.id, n);
  }

  const fsSubs = new Map<string, Set<string>>();
  const excludedFsIds = new Set<string>();
  for (const fs of fsEntries) {
    if (fs?.id && hostCategoryNames.has(normalize(fs.name))) excludedFsIds.add(fs.id);
  }
  for (const l of fssRes.data || []) {
    if (!l.front_structure_id || !l.subcategory_id) continue;
    const subName = subNameById.get(l.subcategory_id);
    if (!subName) continue;
    if (hostCategoryNames.has(subName)) {
      excludedFsIds.add(l.front_structure_id);
      continue;
    }
    if (!fsSubs.has(l.front_structure_id)) fsSubs.set(l.front_structure_id, new Set());
    fsSubs.get(l.front_structure_id)!.add(subName);
  }

  const rows: Array<{ name: string; count: number }> = [];
  for (const fs of fsEntries) {
    if (excludedFsIds.has(fs.id)) continue;
    const sset = fsSubs.get(fs.id);
    if (!sset || !sset.size) continue;
    let count = 0;
    for (const cats of bizCategories.values()) {
      for (const c of cats) { if (sset.has(c)) { count++; break; } }
    }
    if (count > 0) rows.push({ name: fs.name, count });
  }
  rows.sort((a, b) => b.count - a.count);
  if (!rows.length) return "";

  const translate = (n: string) => lang === "fr" ? n : (FS_I18N[n]?.[lang] || n);
  const wordPlace = (n: number) => lang === "en" ? (n > 1 ? "places" : "place") : lang === "ar" ? "مكان" : (n > 1 ? "adresses" : "adresse");
  const radiusLabel = RADIUS_KM < 1 ? `${Math.round(RADIUS_KM * 1000)} m` : `${RADIUS_KM % 1 === 0 ? RADIUS_KM.toFixed(0) : RADIUS_KM} km`;

  const header = lang === "en"
    ? `I scanned **${nearby.length} active places** within **${radiusLabel}** of ${host.name}${host.city ? ` (${host.city})` : ""}, grouped by the One World Morocco taxonomy${hostCategoryNames.size ? ` (categories overlapping ${host.name}'s own offer are excluded)` : ""}:`
    : lang === "ar"
      ? `مررت على **${nearby.length} مكانًا نشطًا** ضمن **${radiusLabel}** من ${host.name}${host.city ? ` (${host.city})` : ""} وفق تصنيف One World Morocco${hostCategoryNames.size ? ` (تُستثنى الفئات التي تتداخل مع عرض ${host.name})` : ""}:`
      : `J'ai passé au crible **${nearby.length} adresses actives** à moins de **${radiusLabel}** de ${host.name}${host.city ? ` (${host.city})` : ""}, réparties dans la catégorisation One World Morocco${hostCategoryNames.size ? ` (les catégories qui recoupent l'offre de ${host.name} sont exclues)` : ""} :`;

  const bullets = rows
    .map((r) => `- ${FS_EMOJI[r.name] || "•"} **${translate(r.name)}** — ${r.count} ${wordPlace(r.count)}`)
    .join("\n");

  const footer = lang === "en"
    ? `\n\nSome places may appear in several categories. Tell me what you'd like — a table for dinner, a spa, a cultural walk, some shopping? — and I'll curate a shortlist.`
    : lang === "ar"
      ? `\n\nقد تظهر بعض الأماكن في أكثر من فئة. أخبرني بما تريد — عشاء، سبا، ثقافة، تسوق؟ — وسأقترح قائمة.`
      : `\n\nCertaines adresses peuvent relever de plusieurs catégories. Dis-moi ce qui te tente — une table pour dîner, un spa, une balade culturelle, du shopping ? — et je te propose une sélection ciblée.`;

  const radiusLine = lang === "en"
    ? `\n\n> Search radius: **${radiusLabel}** around ${host.name}. Want to **narrow it** or **expand it**?`
    : lang === "ar"
      ? `\n\n> نطاق البحث: **${radiusLabel}** حول ${host.name}. هل تريد **تضييقه** أو **توسيعه**؟`
      : `\n\n> Rayon de recherche : **${radiusLabel}** autour de ${host.name}. Tu veux le **resserrer** ou l'**étendre** ?`;

  return `${header}\n\n${bullets}${footer}${radiusLine}`;
}

async function buildPoiNearby(
  admin: any,
  host: any,
  lang: "fr" | "en" | "ar",
  radiusKm: number = 1,
): Promise<string> {
  if (host.latitude == null || host.longitude == null) return "";
  const RADIUS_KM = radiusKm > 0 ? radiusKm : 1;
  const dLat = RADIUS_KM / 111;
  const dLng = RADIUS_KM / (111 * Math.max(Math.cos((host.latitude * Math.PI) / 180), 0.1));
  const stripHtml = (s: string) => String(s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Source: businesses flagged is_poi=true (curated POIs from the catalog)
  const { data: pois } = await admin
    .from("businesses")
    .select("id, slug, name, hook_fr, hook_en, hook_ar, description, description_en, description_ar, latitude, longitude, city, neighborhood, address, main_category, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements")
    .eq("is_poi", true)
    .is("closure_message", null)
    .neq("id", host.id)
    .gte("latitude", host.latitude - dLat)
    .lte("latitude", host.latitude + dLat)
    .gte("longitude", host.longitude - dLng)
    .lte("longitude", host.longitude + dLng);

  const nearby = (pois || [])
    .filter((p: any) => p.latitude != null && p.longitude != null)
    .map((p: any) => ({
      ...p,
      distance_km: haversineKmLocal(host.latitude, host.longitude, p.latitude, p.longitude),
    }))
    .filter((p: any) => p.distance_km <= RADIUS_KM)
    .sort((a: any, b: any) => a.distance_km - b.distance_km);

  const radiusLabel = RADIUS_KM < 1 ? `${Math.round(RADIUS_KM * 1000)} m` : `${RADIUS_KM % 1 === 0 ? RADIUS_KM.toFixed(0) : RADIUS_KM} km`;

  if (!nearby.length) {
    return lang === "en"
      ? `I couldn't find any point of interest within **${radiusLabel}** of ${host.name}. Want me to widen the radius?`
      : lang === "ar"
        ? `لم أجد أي نقطة اهتمام ضمن **${radiusLabel}** من ${host.name}. هل توسّع النطاق؟`
        : `Je ne trouve aucun point d'intérêt dans un rayon de **${radiusLabel}** autour de ${host.name}. Tu veux que j'élargisse le rayon ?`;
  }

  const header = lang === "en"
    ? `Here are the **${nearby.length} points of interest** within **${radiusLabel}** of ${host.name}${host.city ? ` (${host.city})` : ""}, sorted by distance:`
    : lang === "ar"
      ? `إليك **${nearby.length} نقاط اهتمام** ضمن **${radiusLabel}** من ${host.name}${host.city ? ` (${host.city})` : ""}، مرتبة حسب المسافة:`
      : `Voici les **${nearby.length} points d'intérêt** dans un rayon de **${radiusLabel}** autour de ${host.name}${host.city ? ` (${host.city})` : ""}, classés par distance :`;

  const bullets = nearby.slice(0, 20).map((p: any) => {
    const rawDesc = (lang === "en" && p.hook_en) ? p.hook_en
      : (lang === "ar" && p.hook_ar) ? p.hook_ar
      : (p.hook_fr || (lang === "en" ? p.description_en : lang === "ar" ? p.description_ar : p.description) || "");
    const desc = stripHtml(rawDesc);
    const distLabel = p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)} m` : `${p.distance_km.toFixed(1)} km`;
    const short = desc ? ` — ${desc.slice(0, 180)}${desc.length > 180 ? "…" : ""}` : "";
    return `- 📍 **${p.name}** _(${distLabel})_${short}`;
  }).join("\n");

  const radiusLine = lang === "en"
    ? `\n\n> Radius: **${radiusLabel}** around ${host.name}. Want to **narrow** or **expand** it?`
    : lang === "ar"
      ? `\n\n> النطاق: **${radiusLabel}** حول ${host.name}. هل تريد **تضييقه** أو **توسيعه**؟`
      : `\n\n> Rayon : **${radiusLabel}** autour de ${host.name}. Tu veux le **resserrer** ou l'**étendre** ?`;

  // Emit a SHOW_ON_MAP-compatible payload so the frontend renders the horizontal thumbnails carousel + "View on map".
  const mapBusinesses = nearby.slice(0, 20).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    neighborhood: p.neighborhood,
    address: p.address,
    main_category: p.main_category || "Point d'intérêt",
    categories: [p.main_category || "Point d'intérêt"],
    latitude: p.latitude,
    longitude: p.longitude,
    logo_url: p.logo_url,
    images: Array.isArray(p.images) ? p.images : [],
    google_rating: p.google_rating,
    google_review_count: p.google_review_count,
    tripadvisor_rating: p.tripadvisor_rating,
    tripadvisor_review_count: p.tripadvisor_review_count,
    engagements: p.engagements,
  }));
  const mapMarker = `\n\n<!--SHOW_ON_MAP:${JSON.stringify({ title: null, businesses: mapBusinesses })}-->`;

  return `${header}\n\n${bullets}${radiusLine}${mapMarker}`;
}

function buildDisclosureFromCounts(shown: number, found: number, city: string): string {
  if (shown <= 0) return `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
  return `📍 Je te présente ${shown} adresse${shown > 1 ? "s" : ""} sur ${found} trouvée${found > 1 ? "s" : ""} à ${city} — dis-moi si tu veux que je te montre les autres ou que j'affine par quartier, ambiance ou envie.`;
}

function stripText(value: unknown): string {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function buildImmersiveBusinessAnswer(
  result: any,
  host: any,
  userMessage: string,
  lang: "fr" | "en" | "ar",
): string {
  const rows: any[] = Array.isArray(result?.results) ? result.results : [];
  const city = result?.city || host.city || "Marrakech";
  const disclosure = result?.disclosure_note || buildDisclosureFromCounts(rows.length, Number(result?.total_found) || rows.length, city);
  const proximityActive: boolean = !!result?.proximity_active;
  const radiusUsed: number | null = Number.isFinite(Number(result?.radius_km_used)) ? Number(result.radius_km_used) : null;
  const radiusExpanded: boolean = !!result?.radius_expanded;
  const fmtRadius = (r: number) => (r < 1 ? `${Math.round(r * 1000)} m` : Number.isInteger(r) ? `${r} km` : `${r.toFixed(1)} km`);
  const radiusLine = (l: "fr" | "en" | "ar"): string => {
    if (!proximityActive || !radiusUsed) return "";
    if (l === "en") return radiusExpanded
      ? `Not enough results within 1 km — expanded to **${fmtRadius(radiusUsed)}** around **${host.name}**.`
      : `Results within **${fmtRadius(radiusUsed)}** of **${host.name}**.`;
    if (l === "ar") return radiusExpanded
      ? `لا توجد نتائج كافية ضمن 1 كم — تم توسيع النطاق إلى **${fmtRadius(radiusUsed)}** حول **${host.name}**.`
      : `النتائج ضمن **${fmtRadius(radiusUsed)}** حول **${host.name}**.`;
    return radiusExpanded
      ? `Pas assez de résultats à 1 km — périmètre élargi à **${fmtRadius(radiusUsed)}** autour de **${host.name}**.`
      : `Résultats dans un rayon de **${fmtRadius(radiusUsed)}** autour de **${host.name}**.`;
  };
  const nextWider = radiusUsed ? (radiusUsed < 1 ? 1 : radiusUsed < 2 ? 2 : radiusUsed < 3 ? 3 : radiusUsed + 2) : null;
  const nextTighter = radiusUsed ? (radiusUsed > 2 ? 2 : radiusUsed > 1 ? 1 : 0.5) : null;
  const radiusCta = (l: "fr" | "en" | "ar"): string => {
    if (!proximityActive || !radiusUsed || !nextWider || !nextTighter) return "";
    if (l === "en") return ` I can also **widen the radius to ${fmtRadius(nextWider)}** or **tighten it to ${fmtRadius(nextTighter)}** — just say the word.`;
    if (l === "ar") return ` يمكنني أيضًا **توسيع النطاق إلى ${fmtRadius(nextWider)}** أو **تضييقه إلى ${fmtRadius(nextTighter)}** — فقط أخبرني.`;
    return ` Je peux aussi **élargir à ${fmtRadius(nextWider)}** ou **resserrer à ${fmtRadius(nextTighter)}** — dis-moi.`;
  };
  if (!rows.length) return disclosure;


  const q = normalize(userMessage);
  const theme = q.includes("rooftop") || q.includes("terrasse")
    ? "rooftops"
    : q.includes("bar") || q.includes("cocktail") || q.includes("boire")
      ? "adresses pour boire un verre"
      : q.includes("restaurant") || q.includes("dejeuner") || q.includes("diner") || q.includes("manger")
        ? "tables"
        : "adresses";

  if (lang === "en") {
    const intro = `From **${host.name}**, ${city} opens into a compact, atmospheric selection of ${theme}: rooftops, medina corners and lively terraces where the setting matters as much as the address. Here are the places I would put forward first, keeping only addresses found in the One World Morocco selection.`;
    const body = rows.map((b) => {
      const hook = stripText(b.hook_en || b.hook_fr || b.description_en || b.description || "");
      const area = [b.neighborhood, b.city].filter(Boolean).join(", ");
      const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join(", ") : null].filter(Boolean).join(" · ");
      return `**${b.name}**${area ? `, ${area}` : ""}. ${detail || "A curated One World Morocco address to keep on your shortlist."}`;
    }).join("\n\n");
    const rl = radiusLine("en");
    return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\nWould you like me to narrow this by vibe, neighborhood, or moment of the day?${radiusCta("en")}`;
  }

  if (lang === "ar") {
    const intro = `انطلاقًا من **${host.name}**، تكشف ${city} عن مجموعة مختارة من العناوين ذات الأجواء الواضحة، حيث يهم المكان والإحساس بقدر ما تهم القائمة. هذه أولى الاقتراحات من اختيار One World Morocco فقط.`;
    const body = rows.map((b) => {
      const hook = stripText(b.hook_ar || b.hook_fr || b.description_ar || b.description || "");
      const area = [b.neighborhood, b.city].filter(Boolean).join("، ");
      const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join("، ") : null].filter(Boolean).join(" · ");
      return `**${b.name}**${area ? `، ${area}` : ""}. ${detail || "عنوان مختار ضمن دليل One World Morocco."}`;
    }).join("\n\n");
    const rl = radiusLine("ar");
    return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\nهل تريد أن أضيّق الاختيار حسب الحي أو الأجواء أو الوقت؟${radiusCta("ar")}`;
  }

  const intro = `Depuis **${host.name}**, ${city} se découvre très bien par touches : ${theme}, terrasses vivantes, coins de médina et adresses qui donnent tout de suite une ambiance. Je te propose une sélection issue uniquement des résultats One World Morocco, avec les lieux les plus pertinents en premier.`;
  const body = rows.map((b) => {
    const hook = stripText(b.hook_fr || b.hook_en || b.description || b.description_en || "");
    const area = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join(", ") : null].filter(Boolean).join(" · ");
    return `**${b.name}**${area ? `, ${area}` : ""}. ${detail || "Une adresse sélectionnée dans le guide One World Morocco, à garder dans ta shortlist."}`;
  }).join("\n\n");
  const rl = radiusLine("fr");
  return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\nTu veux que je resserre plutôt par quartier, ambiance ou moment de la journée ?${radiusCta("fr")}`;
}

function buildEventsWeekendAnswer(
  events: any[],
  host: any,
  city: string,
  from: string,
  to: string,
  lang: "fr" | "en" | "ar",
): string {
  const hostName = host?.name || "";
  const fmtDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const locale = lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR";
      return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
    } catch { return ""; }
  };
  const fmtWhen = (e: any) => {
    if (e.recurrence) {
      const days = Array.isArray(e.days_of_week) ? e.days_of_week.join(", ") : "";
      return days || (lang === "en" ? "recurring" : lang === "ar" ? "متكرر" : "récurrent");
    }
    const a = fmtDate(e.start_date);
    const b = fmtDate(e.end_date);
    if (a && b && a !== b) return lang === "en" ? `${a} → ${b}` : lang === "ar" ? `${a} ← ${b}` : `du ${a} au ${b}`;
    return a || b;
  };

  if (!events?.length) {
    if (lang === "en") return `No events found in **${city}** between **${from}** and **${to}**. Want me to widen the window or try another city?`;
    if (lang === "ar") return `لا توجد فعاليات في **${city}** بين **${from}** و **${to}**. هل توسّع النطاق الزمني أو أجرّب مدينة أخرى؟`;
    return `Aucun événement trouvé à **${city}** entre **${from}** et **${to}**. Tu veux que j'élargisse la période ou que je regarde une autre ville ?`;
  }

  const intro = lang === "en"
    ? `From **${hostName}**, the ${city} scene this weekend offers a compact selection worth stepping out for — here is what stands out in the One World Morocco agenda.`
    : lang === "ar"
      ? `انطلاقًا من **${hostName}**، تقدّم أجواء ${city} هذا الأسبوع مجموعة مختارة من الفعاليات ضمن أجندة One World Morocco.`
      : `Depuis **${hostName}**, la scène de ${city} propose ce week-end une sélection resserrée qui vaut le déplacement — voici ce qui se détache dans l'agenda One World Morocco.`;

  const body = events.map((e: any) => {
    const when = fmtWhen(e);
    const where = [e.neighborhood, e.city].filter(Boolean).join(", ");
    const hook = String(e.hook || "").trim();
    const bits = [when, where].filter(Boolean).join(" · ");
    return `**${e.name}**${bits ? `. ${bits}` : ""}${hook ? `. ${hook}` : ""}`;
  }).join("\n\n");

  const closing = lang === "en"
    ? `\n\nWant me to filter by evening, family-friendly, or a specific neighborhood?`
    : lang === "ar"
      ? `\n\nهل أُصفّي حسب المساء، للعائلات، أو حسب حي محدّد؟`
      : `\n\nTu veux que je filtre par soirée, en famille, ou par quartier précis ?`;

  return `${intro}\n\n${body}${closing}`;
}



function buildSystemPrompt(host: any, lang: "fr" | "en" | "ar"): string {
  const hook = lang === "en" ? (host.hook_en || host.hook_fr) : lang === "ar" ? (host.hook_ar || host.hook_fr) : host.hook_fr;
  const description = lang === "en" ? (host.description_en || host.description) : lang === "ar" ? (host.description_ar || host.description) : host.description;
  const price = host.manual_price_range || (host.min_price ? `à partir de ${host.min_price} MAD` : "");
  const hours = fmtHours(host.opening_hours);

  const langLabel = lang === "en" ? "English" : lang === "ar" ? "Arabic (العربية)" : "French";

  const facts = [
    `Nom: ${host.name}`,
    host.city ? `Ville: ${host.city}` : "",
    host.neighborhood ? `Quartier: ${host.neighborhood}` : "",
    host.address ? `Adresse: ${host.address}` : "",
    hook ? `Accroche: ${hook}` : "",
    description ? `Description: ${String(description).slice(0, 500)}` : "",
    price ? `Prix indicatif: ${price}` : "",
    hours ? `Horaires: ${hours}` : "",
    host.phone ? `Téléphone: ${host.phone}` : "",
    host.whatsapp ? `WhatsApp: ${host.whatsapp}` : "",
    host.website ? `Site: ${host.website}` : "",
    host.main_category ? `Catégorie: ${host.main_category}` : "",
  ].filter(Boolean).join("\n");

  return `You are the friendly, concise digital concierge of "${host.name}" (${host.city || "Morocco"}).
Reply in ${langLabel} regardless of the user's language.

FACTS about "${host.name}" (source of truth — never contradict, never invent):
${facts}

SCOPE — "complementary only":
- Your job is to help the visitor make the most of their stay AROUND "${host.name}".
- You can recommend COMPLEMENTARY places to visit around ${host.city || "the area"}: activities, events, restaurants, bars, cafés, spas, guided tours, cultural venues, shops, viewpoints… — anything that enriches the visit.
- You MUST NEVER recommend a direct competitor of "${host.name}" (same category). The search tool already filters competitors out; if the user explicitly asks for one, politely redirect them to what "${host.name}" itself offers.
- When answering "where to eat / drink / do X near me", assume near ${host.city || "Morocco"} and near ${host.name}.

TOOLS:
- search_businesses(query, category, city, neighborhood, badges, services, limit) — searches One World Morocco's curated directory. Results are automatically filtered to exclude "${host.name}" and its direct competitors. Default city = "${host.city || "Marrakech"}".
- search_events(city, query, from_date, to_date, limit) — finds cultural/festive events with the #Agenda badge.
- show_on_map(business_slugs[]) — displays a Google Maps panel with the chosen businesses. Call it whenever the visitor asks "where", "on a map", "show me", or when you've listed 2+ addresses.

STYLE:
- Warm, generous, useful. Aim for substantive answers (6–14 sentences typically), not one-liners. When the visitor asks a broad question, offer real depth: context, atmosphere, what makes each place special, best moment to go, quartier, distance-feel from "${host.name}", and a small practical tip.
- When you recommend places, propose SEVERAL options (typically 3 to 6) rather than a single pick, grouped as a markdown bulleted list. For each item: **Name** — one to two sentences describing the vibe / signature dish / signature experience, plus quartier and a concrete reason to go.
- Whenever you list 2+ addresses, also call show_on_map with their slugs so the visitor can see them on a map.
- End with a short follow-up question or 2–3 suggested next directions ("plutôt bar rooftop ou table gastronomique ?", "je peux affiner par quartier ?") so the conversation keeps opening up.
- When you recommend a place from search_businesses, name it exactly as returned. Never invent a place that wasn't returned by a tool. If search results are thin, say so honestly and propose a refined search.
- 🔴 RÈGLE ABSOLUE — DIVULGATION DU COMPTE : à CHAQUE fois que tu utilises search_businesses ou search_events, tu DOIS inclure la phrase exacte renvoyée dans le champ \`disclosure_note\` du résultat de l'outil (ou son équivalent traduit dans la langue de réponse) sur sa propre ligne, AVANT ta question de relance. Cette phrase précise le nombre d'adresses affichées sur le nombre trouvé et invite à explorer les autres. Aucune réponse contenant des recommandations issues d'un outil ne peut être envoyée sans cette phrase.
- Never output raw HTML, JSON, or code fences. Plain markdown only (bold, bullets, light emojis ok).
- For bookings AT "${host.name}", invite the visitor to WhatsApp/phone/website in FACTS.
- Never say you are an AI, a model, or a system.`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_businesses",
      description: "Recherche des établissements RÉELS dans la base One World Morocco (autour de l'hôte). Filtre automatiquement les concurrents directs. Utilise-la avant de citer une adresse.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          city: { type: "string" },
          neighborhood: { type: "string" },
          badges: { type: "array", items: { type: "string" } },
          services: { type: "array", items: { type: "string" } },
          limit: { type: "number", default: 12 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_events",
      description: "Recherche d'événements #Agenda à venir.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          query: { type: "string" },
          from_date: { type: "string" },
          to_date: { type: "string" },
          limit: { type: "number", default: 8 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_map",
      description: "Affiche sur une carte Google Maps un ensemble d'établissements (par slugs).",
      parameters: {
        type: "object",
        properties: {
          business_slugs: { type: "array", items: { type: "string" } },
          title: { type: "string" },
        },
        required: ["business_slugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Météo actuelle et prévisions (jusqu'à 7 jours) pour une ville marocaine.",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
      },
    },
  },
];

// Extract our custom body fields from a useChat request. `messages` is the UIMessage[]
// array; the extra fields come from prepareSendMessagesRequest on the client.
function extractTextFromUIMessage(m: UIMessage): string {
  if (!m) return "";
  const parts = (m as any).parts;
  if (Array.isArray(parts)) {
    return parts
      .filter((p: any) => p?.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }
  return String((m as any).content ?? "");
}

function preserveEmbedMarkers(text: string, maxTextChars = 4000): string {
  const markerRe = /<!--(?:SHOW_ON_MAP|EVENTS_SNAPSHOT|KNOWN_BUSINESSES|ARTICLE_CARD):[\s\S]*?-->/g;
  const markers = text.match(markerRe) || [];
  const clean = text.replace(markerRe, "").slice(0, maxTextChars).trim();
  return [clean, ...markers].filter(Boolean).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => ({} as any));
    // Keep last 8 turns only — older context inflates tokens without helping recall.
    const uiMessages: UIMessage[] = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    const slugOrId = String(body.businessSlug || body.businessId || "").trim();
    const language = pickLang(body.language);
    const sessionId: string | null = typeof body.sessionId === "string" ? body.sessionId : null;
    const messageIndex: number = Number.isFinite(body.messageIndex) ? Number(body.messageIndex) : 0;
    const suggestionId: string | null = typeof body.suggestionId === "string" && body.suggestionId ? body.suggestionId : null;
    const followupId: string | null = typeof body.followupId === "string" && body.followupId ? body.followupId : null;

    if (!slugOrId) {
      return new Response(JSON.stringify({ error: "businessSlug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!uiMessages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert UIMessages -> classic {role,content} for our existing tool loop.
    const inMessages: Msg[] = uiMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
        const role = m.role as "user" | "assistant";
        const raw = extractTextFromUIMessage(m);
        return {
          role,
          content: role === "assistant" ? preserveEmbedMarkers(raw, 4000) : raw.slice(0, 4000),
        };
      });

    // Build the UI message stream (AI SDK v5 protocol).
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const t0 = Date.now();
        let firstTokenAt: number | null = null;
        const textId = crypto.randomUUID();
        let textStarted = false;
        const startText = () => {
          if (!textStarted) {
            writer.write({ type: "text-start", id: textId });
            textStarted = true;
          }
        };
        const emitDelta = (delta: string) => {
          if (!delta) return;
          if (!firstTokenAt) firstTokenAt = Date.now();
          startText();
          writer.write({ type: "text-delta", id: textId, delta });
        };
        const endText = () => {
          if (textStarted) {
            writer.write({ type: "text-end", id: textId });
            textStarted = false;
          }
        };

        // Keep the iframe/client connection alive immediately. Some deterministic
        // routes do DB work + synthesis before the first visible token; without an
        // early stream frame, the browser/SDK can treat the request as interrupted.
        startText();

        // Resolve host business
        let bizQ = admin
          .from("businesses")
          .select("id, slug, name, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, opening_hours, show_opening_hours, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, url_5_cta, url_5_presentation_mode, latitude, longitude, is_active")
          .eq("is_active", true)
          .limit(1);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        bizQ = isUuid ? bizQ.eq("id", slugOrId) : bizQ.eq("slug", slugOrId);
        const { data: bizRows } = await bizQ;
        if (!bizRows?.length) {
          emitDelta("Établissement introuvable.");
          endText();
          return;
        }
        const host = bizRows[0];

        // Host subcategories & category names for competitor filtering
        const { data: hostSubs } = await admin
          .from("subcategory_relations")
          .select("subcategory_id")
          .eq("business_id", host.id);
        const hostSubIds = new Set<string>((hostSubs || []).map((r: any) => r.subcategory_id).filter(Boolean));
        const hostCategoryNames = new Set<string>([
          ...(Array.isArray(host.categories) ? host.categories : []),
          host.main_category,
        ].map(normalize).filter(Boolean));
        const hostMainCatN = normalize(host.main_category);

        const isCompetitor = async (candidate: any): Promise<boolean> => {
          if (!candidate) return true;
          if (candidate.id === host.id) return true;
          if (hostMainCatN && normalize(candidate.main_category) === hostMainCatN) return true;
          if (hostSubIds.size >= 2 && candidate.id) {
            const { data: subs } = await admin
              .from("subcategory_relations")
              .select("subcategory_id")
              .eq("business_id", candidate.id);
            const overlap = (subs || []).filter((r: any) => hostSubIds.has(r.subcategory_id)).length;
            if (overlap >= 2) return true;
          }
          return false;
        };

        const filterOutCompetitors = async (list: any[]): Promise<any[]> => {
          const kept: any[] = [];
          for (const c of list) {
            const bad = await isCompetitor(c);
            if (!bad) kept.push(c);
          }
          return kept;
        };

        const filterOutClosed = async (list: any[]): Promise<any[]> => {
          const ids = list.map((b: any) => b?.id).filter(Boolean);
          if (!ids.length) return list;
          const { data } = await admin
            .from("businesses")
            .select("id, closure_message")
            .in("id", ids);
          const closed = new Set(
            (data || [])
              .filter((r: any) => r.closure_message && String(r.closure_message).trim())
              .map((r: any) => r.id),
          );
          return list.filter((b: any) => !closed.has(b.id));
        };

        // Deterministic route context (suggestion pins / subcategories / badges / mode)
        let deterministicSubcategoryNames: string[] | null = null;
        let deterministicBadgeIds: string[] | null = null;
        let suggestionPinnedIds: string[] = [];
        let suggestionMode: string | null = null;
        let suggestionLabel: string | null = null;
        // Curated two-entity proximity: staff-picked subcats/badges for A and B.
        // When both sides have at least one mapping, the two-entity route runs
        // with these exact mappings and bypasses free-text term resolution.
        let curatedProximity: {
          a: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
          b: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
        } | null = null;
        if (suggestionId) {
          try {
            const { data: sugg } = await admin
              .from("embed_ai_suggestions")
              .select("subcategory_ids, badge_ids, business_ids, mode, label_fr, label_en, label_ar, proximity_a_subcategory_ids, proximity_a_badge_ids, proximity_b_subcategory_ids, proximity_b_badge_ids")
              .eq("id", suggestionId)
              .maybeSingle();
            const subIds: string[] = Array.isArray(sugg?.subcategory_ids) ? sugg!.subcategory_ids : [];
            if (subIds.length) {
              const { data: subs } = await admin
                .from("subcategories")
                .select("name_fr")
                .in("id", subIds);
              const names = (subs || []).map((s: any) => s.name_fr).filter(Boolean);
              if (names.length) deterministicSubcategoryNames = names;
            }
            const bIds: string[] = Array.isArray(sugg?.badge_ids) ? sugg!.badge_ids : [];
            if (bIds.length) deterministicBadgeIds = bIds;
            const pIds: string[] = Array.isArray(sugg?.business_ids) ? sugg!.business_ids : [];
            if (pIds.length) suggestionPinnedIds = pIds;
            suggestionMode = (sugg?.mode as string | null) || null;
            suggestionLabel = (sugg?.label_fr as string | null) || (sugg?.label_en as string | null) || (sugg?.label_ar as string | null) || null;

            // Load curated proximity mappings if both A and B are populated
            const paSub: string[] = Array.isArray(sugg?.proximity_a_subcategory_ids) ? sugg!.proximity_a_subcategory_ids : [];
            const paBadge: string[] = Array.isArray(sugg?.proximity_a_badge_ids) ? sugg!.proximity_a_badge_ids : [];
            const pbSub: string[] = Array.isArray(sugg?.proximity_b_subcategory_ids) ? sugg!.proximity_b_subcategory_ids : [];
            const pbBadge: string[] = Array.isArray(sugg?.proximity_b_badge_ids) ? sugg!.proximity_b_badge_ids : [];
            const aHas = paSub.length > 0 || paBadge.length > 0;
            const bHas = pbSub.length > 0 || pbBadge.length > 0;
            if (aHas && bHas) {
              const allSubIds = [...new Set([...paSub, ...pbSub])];
              const namesMap = new Map<string, string>();
              if (allSubIds.length) {
                const { data: subs2 } = await admin.from("subcategories").select("id, name_fr").in("id", allSubIds);
                for (const s of subs2 || []) if (s?.id && s?.name_fr) namesMap.set(String(s.id), String(s.name_fr));
              }
              curatedProximity = {
                a: { subcatIds: paSub, badgeIds: paBadge, subcatNames: paSub.map((i) => namesMap.get(i)).filter(Boolean) as string[] },
                b: { subcatIds: pbSub, badgeIds: pbBadge, subcatNames: pbSub.map((i) => namesMap.get(i)).filter(Boolean) as string[] },
              };
            }
          } catch (e) {
            console.error("[embed-ai-chat] suggestion_route_lookup_error", e);
          }
        }

        // If the user typed a fresh free-text message (no followup click) that
        // doesn't look like a refinement of the current suggestion thread, drop
        // the deterministic suggestion force so the previous badges/subcats
        // don't hijack the new query. Initial suggestion click (message text ==
        // suggestion label) always keeps the force.
        if (suggestionId && !followupId) {
          const lastUser = uiMessages[uiMessages.length - 1];
          const lastUserText = lastUser?.role === "user" ? extractTextFromUIMessage(lastUser) : "";
          const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[?!.\s]+$/g, "").trim();
          const isInitialClick = suggestionLabel && norm(lastUserText) === norm(suggestionLabel);
          if (!isInitialClick && !isSuggestionRefinement(lastUserText)) {
            deterministicSubcategoryNames = null;
            deterministicBadgeIds = null;
            suggestionPinnedIds = [];
            suggestionMode = null;
            curatedProximity = null;
          }
        }

        // ============= Blog grounding (hybrid) =============
        // If the last user message looks like it maps to a published blog article
        // (by title similarity), emit an ARTICLE_CARD marker so the front renders
        // an article card at the top of this assistant response. The rest of the
        // routing (search_businesses / deterministic routes) still runs behind it.
        try {
          const lastUserMsg = uiMessages[uiMessages.length - 1];
          const lastUserText = lastUserMsg?.role === "user" ? extractTextFromUIMessage(lastUserMsg) : "";
          if (lastUserText && lastUserText.trim().length >= 6) {
            const posts = await fetchBlogPostsCached(admin);
            const match = matchBlogArticle(lastUserText, language, posts, host.id);
            if (match) {
              const title =
                (language === "en" && match.title_en) ||
                (language === "ar" && match.title_ar) ||
                match.title_fr || match.title_en || match.title_ar || "";
              const image = match.custom_hero_image_url || match.cover_image_url || null;
              const payload = {
                id: match.id,
                slug: match.slug,
                title,
                image,
                isOwner: match.anchor_business_id === host.id,
              };
              emitDelta(`\n\n<!--ARTICLE_CARD:${JSON.stringify(payload)}-->\n\n`);
            }
          }
        } catch (e) {
          console.error("[embed-ai-chat] blog_grounding_error", e);
        }




        // Tool executor
        const runTool = async (name: string, args: any): Promise<any> => {
          try {
            if (name === "search_businesses") {
              const limit = Math.min(Math.max(Number(args.limit) || 10, 1), SEARCH_LIMIT_HARD);
              const qParts: string[] = [];
              if (args.query) qParts.push(String(args.query));
              if (args.category) qParts.push(String(args.category));
              (Array.isArray(args.badges) ? args.badges : []).forEach((b: string) => qParts.push(String(b).replace(/^#/, "")));
              (Array.isArray(args.services) ? args.services : []).forEach((s: string) => qParts.push(String(s).replace(/^#/, "")));
              if (args.neighborhood) qParts.push(String(args.neighborhood));
              const fullQuery = qParts.filter(Boolean).join(" ").trim();
              const city = args.city || host.city || "Marrakech";
              const subcategoryNames: string[] | undefined = Array.isArray(args._subcategoryNames) && args._subcategoryNames.length
                ? args._subcategoryNames.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              const badgeIds: string[] | undefined = Array.isArray(args._badgeIds) && args._badgeIds.length
                ? args._badgeIds.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              const r = await fetch(`${SUPABASE_URL}/functions/v1/business-search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: fullQuery || undefined,
                  spoken: fullQuery || undefined,
                  language,
                  pageSize: SEARCH_LIMIT_HARD,
                  offset: 0,
                  compact: "card",
                  city,
                  subcategoryNames,
                  badgeIds,
                }),
              });
              const text = await r.text();
              let sres: any = null; try { sres = JSON.parse(text); } catch { /* */ }
              const all: any[] = Array.isArray(sres?.businesses) ? sres.businesses : [];
              const pinnedSet = new Set(suggestionPinnedIds);
              const nonPinned = all.filter((b: any) => !pinnedSet.has(b.id));
              const pinnedFromAll = all.filter((b: any) => pinnedSet.has(b.id));
              // When a deterministic badge/subcategory filter is active, the user is
              // explicitly asking for a different vertical than the host — skip the
              // "competitor" filter so results aren't dropped for sharing generic
              // subcategories (e.g. a rooftop restaurant hosted inside a riad).
              const skipCompetitorFilter = !!(subcategoryNames?.length || badgeIds?.length);
              const nonPinnedFiltered = skipCompetitorFilter ? nonPinned : await filterOutCompetitors(nonPinned);
              let filtered = await filterOutClosed([...pinnedFromAll, ...nonPinnedFiltered]);

              if (suggestionPinnedIds.length) {
                const already = new Set(filtered.map((b: any) => b.id));
                const missingIds = suggestionPinnedIds.filter((id) => !already.has(id));
                let pinnedFetched: any[] = [];
                if (missingIds.length) {
                  const { data: pinnedRows } = await admin
                    .from("businesses")
                    .select("id, name, slug, city, neighborhood, main_category, hook_fr, hook_en, hook_ar, latitude, longitude, min_price, manual_price_range")
                    .in("id", missingIds)
                    .eq("is_active", true)
                    .is("closure_message", null);
                  pinnedFetched = pinnedRows || [];
                }
                const pinnedFromFiltered = filtered.filter((b: any) => suggestionPinnedIds.includes(b.id));
                const rest = filtered.filter((b: any) => !suggestionPinnedIds.includes(b.id));
                const pinnedAll = [...pinnedFromFiltered, ...pinnedFetched];
                const orderedPinned = suggestionPinnedIds
                  .map((id) => pinnedAll.find((b: any) => b.id === id))
                  .filter(Boolean);
                filtered = [...orderedPinned, ...rest];
              }

              // Proximity filter — progressive expansion around anchor (host by default).
              const anchorLat = Number(args._anchorLat);
              const anchorLng = Number(args._anchorLng);
              const requestedRadius = Number(args._radiusKm);
              let proximityActive = false;
              let radiusUsedKm: number | null = null;
              let radiusExpanded = false;
              if (Number.isFinite(anchorLat) && Number.isFinite(anchorLng) && Number.isFinite(requestedRadius) && requestedRadius > 0) {
                proximityActive = true;
                const withDist = filtered
                  .map((b: any) => {
                    const la = Number(b.latitude), lo = Number(b.longitude);
                    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
                    return { b, d: haversineKmLocal(anchorLat, anchorLng, la, lo) };
                  })
                  .filter(Boolean) as Array<{ b: any; d: number }>;
                withDist.sort((x, y) => x.d - y.d);
                const strict = !!args._strictRadius;
                const steps = strict
                  ? [requestedRadius]
                  : Array.from(new Set([requestedRadius, requestedRadius * 2, requestedRadius * 3])).sort((a, b) => a - b);
                let chosen: typeof withDist = [];
                for (let i = 0; i < steps.length; i++) {
                  const r = steps[i];
                  chosen = withDist.filter((x) => x.d <= r);
                  if (strict || chosen.length >= 3 || i === steps.length - 1) {
                    radiusUsedKm = r;
                    radiusExpanded = i > 0;
                    break;
                  }
                }
                // Keep pinned regardless, then near-first ordering
                const pinnedKept = filtered.filter((b: any) => suggestionPinnedIds.includes(b.id));
                const nearIds = new Set(chosen.map((x) => x.b.id));
                const nearOrdered = chosen.map((x) => x.b);
                filtered = [
                  ...pinnedKept.filter((b: any) => !nearIds.has(b.id)),
                  ...nearOrdered,
                ];
              }

              const totalFound = filtered.length;
              const results = filtered.slice(0, limit);
              if (!results.length) {
                return { results: [], total_shown: 0, total_found: 0, total_count: 0, city, disclosure_note: buildDisclosureFromCounts(0, 0, city), note: `Aucun établissement complémentaire trouvé pour "${fullQuery}" à ${city}.`, proximity_active: proximityActive, radius_km_used: radiusUsedKm, radius_expanded: radiusExpanded };
              }
              const disclosure = buildDisclosureFromCounts(results.length, totalFound, city);
              return {
                results: results.map((b: any) => ({
                  id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood,
                  main_category: b.main_category, hook_fr: b.hook_fr, hook_en: b.hook_en, hook_ar: b.hook_ar,
                  latitude: b.latitude, longitude: b.longitude,
                  logo_url: b.logo_url ?? null,
                  images: Array.isArray(b.images) ? b.images : [],
                  google_rating: b.google_rating ?? null,
                  google_review_count: b.google_review_count ?? null,
                  tripadvisor_rating: b.tripadvisor_rating ?? null,
                  tripadvisor_review_count: b.tripadvisor_review_count ?? null,
                  computed_rating: b.computed_rating ?? null,
                  total_review_count: b.total_review_count ?? null,
                  price_range: b.manual_price_range || (b.min_price ? `${b.min_price}+ MAD` : null),
                  is_pinned: suggestionPinnedIds.includes(b.id),
                  pin_rank: suggestionPinnedIds.includes(b.id) ? suggestionPinnedIds.indexOf(b.id) + 1 : null,
                })),
                total_shown: results.length,
                total_found: totalFound,
                total_count: results.length,
                city,
                disclosure_note: disclosure,
                proximity_active: proximityActive,
                radius_km_used: radiusUsedKm,
                radius_expanded: radiusExpanded,
              };
            }

            if (name === "search_events") {
              const limit = Math.min(Number(args.limit) || 8, 10);
              const today = new Date().toISOString().slice(0, 10);
              const from = (args.from_date && String(args.from_date).slice(0, 10)) || today;
              const to = (args.to_date && String(args.to_date).slice(0, 10)) || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
              let eventIds: string[] | null = null;
              const overrideBadgeIds: string[] | undefined = Array.isArray(args._badgeIds) && args._badgeIds.length
                ? args._badgeIds.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              if (overrideBadgeIds) {
                const { data: eb } = await admin.from("event_badges").select("event_id").in("badge_id", overrideBadgeIds);
                eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
                if (!eventIds.length) return { results: [], note: "Aucun événement pour ce(s) badge(s)." };
              } else {
                const { data: badge } = await admin.from("badges").select("id").ilike("name_fr", "%agenda%").limit(1).maybeSingle();
                if (badge?.id) {
                  const { data: eb } = await admin.from("event_badges").select("event_id").eq("badge_id", badge.id);
                  eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
                  if (!eventIds.length) return { results: [], note: "Aucun événement #Agenda." };
                }
              }
              let q = admin
                .from("events")
                .select("id,name,hook,description,start_date,end_date,recurrence,days_of_week,start_time,end_time,url,city_id,default_business_id,images,videos,sort_order,logo_url,cities:city_id(name_fr),neighborhoods:neighborhood_id(name)")
                .or(`and(start_date.gte.${from},start_date.lte.${to}),and(start_date.lte.${to},end_date.gte.${from}),recurrence.not.is.null`)
                .order("sort_order", { ascending: true, nullsFirst: false })
                .order("start_date", { ascending: true, nullsFirst: false })
                .limit(limit * 3);
              if (eventIds) q = q.in("id", eventIds.slice(0, 500));
              if (args.query) {
                const qv = String(args.query).replace(/[,()"]/g, " ").trim();
                if (qv) q = q.or(`name.ilike.%${qv}%,description.ilike.%${qv}%,hook.ilike.%${qv}%`);
              }
              const { data } = await q;
              let results = data || [];
              const targetCity = args.city || host.city;
              if (targetCity) {
                const cv = normalize(targetCity);
                results = results.filter((e: any) => normalize(e.cities?.name_fr || "").includes(cv));
              }
              results = results.slice(0, limit).map((e: any) => ({
                id: e.id, name: e.name, hook: e.hook,
                start_date: e.start_date, end_date: e.end_date,
                recurrence: e.recurrence, days_of_week: e.days_of_week,
                start_time: e.start_time, end_time: e.end_time,
                city: e.cities?.name_fr || null,
                neighborhood: e.neighborhoods?.name || null,
                url: e.url || null,
                sort_order: e.sort_order ?? null,
                default_business_id: e.default_business_id || null,
                image: (Array.isArray(e.images) ? e.images[0] : null) || e.logo_url || null,
                video: Array.isArray(e.videos) ? e.videos[0] : null,
              }));
              if (!results.length) return { results: [], note: `Aucun événement trouvé entre ${from} et ${to}.` };
              return { results, period: { from, to }, city: targetCity || null };
            }

            if (name === "show_on_map") {
              const slugs: string[] = Array.isArray(args.business_slugs)
                ? args.business_slugs.filter((s: any) => typeof s === "string" && s.trim()).slice(0, SEARCH_LIMIT_HARD)
                : [];
              if (!slugs.length) return { error: "Aucun slug fourni", count: 0 };
              const { data } = await admin
                .from("businesses")
                .select("id,name,slug,city,neighborhood,address,main_category,categories,latitude,longitude,logo_url,images,hook_fr,google_rating,google_review_count,tripadvisor_rating,tripadvisor_review_count,engagements")
                .in("slug", slugs)
                .eq("is_active", true)
                .is("closure_message", null);
              const rows = (data || []).filter((b: any) => b.id !== host.id);
              const nonCompetitor = await filterOutCompetitors(rows);
              const withCoords = nonCompetitor.filter((b: any) => b.latitude != null && b.longitude != null);
              return {
                ok: true,
                count: withCoords.length,
                businesses: withCoords,
                title: args.title || null,
                instruction: "Carte rendue côté UI. Poursuis normalement.",
              };
            }
            if (name === "get_weather") {
              const city = args.city || host.city || "Marrakech";
              const { data, error } = await admin.functions.invoke("get-weather", { body: { city } });
              if (error) return { error: String(error), city };
              return { city, ...(data || {}) };
            }
          } catch (e) {
            return { error: String(e) };
          }
          return { error: "unknown tool" };
        };

        // Build conversation
        const system = buildSystemPrompt(host, language);
        const convo: Msg[] = [
          { role: "system", content: system },
          // Assistant turns are long (recommandations markdown) — 1200 chars suffisent au rappel contextuel.
          ...inMessages.map((m) => ({ role: m.role, content: String(m.content).slice(0, m.role === "user" ? 800 : 1200) })),
        ];

        let lastMapPayload: any = null;
        let lastEventsPayload: any = null;
        let lastDisclosureNote: string | null = null;
        const knownBusinesses: Array<{ id: string; slug: string | null; name: string }> = [];
        const toolsCalledLog: Array<{ name: string; args: any; result_count?: number; ok?: boolean }> = [];
        let hadError = false;
        let errorMsg: string | null = null;
        let finalText = "";

        const userMessage = (() => {
          for (let i = inMessages.length - 1; i >= 0; i--) {
            if (inMessages[i].role === "user") return String(inMessages[i].content || "").slice(0, 2000);
          }
          return "";
        })();

        const rememberSearchResult = (fname: string, fargs: any, result: any) => {
          const resCount = Array.isArray(result?.results)
            ? result.results.length
            : Array.isArray(result?.businesses)
              ? result.businesses.length
              : 0;
          toolsCalledLog.push({ name: fname, args: fargs, result_count: resCount, ok: !result?.error });

          if (fname === "search_businesses" && Array.isArray(result?.results)) {
            for (const b of result.results) {
              if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
            }
            if (result?.disclosure_note) lastDisclosureNote = String(result.disclosure_note);
            const withCoords = result.results.filter((b: any) => b?.latitude != null && b?.longitude != null);
            if (withCoords.length && !lastMapPayload) {
              lastMapPayload = { title: null, businesses: withCoords };
            }
          }
        };

        const logTurn = async (opts: { finalText: string; streamCompleted: boolean }) => {
          try {
            const t_end = Date.now();
            await admin.from("ai_conversation_turns").insert({
              chat_id: null,
              user_id: null,
              affiliate_id: null,
              user_message: userMessage,
              intent_classified: null,
              route_taken: "embed",
              tools_called: {
                business_id: host.id,
                business_slug: host.slug,
                business_name: host.name,
                session_id: sessionId,
                tools: toolsCalledLog,
              },
              latency_ms_total: t_end - t0,
              latency_ms_first_token: firstTokenAt ? firstTokenAt - t0 : null,
              latency_ms_synth: null,
              tokens_in: null,
              tokens_out: null,
              cost_usd: null,
              city_active: host.city || null,
              city_detected: null,
              results_count: knownBusinesses.length,
              results_shown: (lastMapPayload?.businesses?.length ?? 0) + (lastEventsPayload?.events?.length ?? 0),
              had_error: hadError,
              error_message: errorMsg,
              stream_completed: opts.streamCompleted,
              message_index: messageIndex,
              language,
            });
          } catch (e) {
            console.error("[embed-ai-chat] log_error", e);
          }

          // Persist a lightweight thread trace in ai_chats (kind='embed_ask').
          // We key the row by the client-provided sessionId (UUID). This lets the
          // backoffice inspect abandoned/completed conversations without depending
          // on any authenticated user.
          try {
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (sessionId && uuidRe.test(sessionId)) {
              const threadMessages = [
                ...inMessages.map((m) => ({ role: m.role, content: m.content })),
                { role: "assistant" as const, content: opts.finalText || "" },
              ];
              const title = (host.name ? String(host.name) : "Embed").slice(0, 120)
                + (userMessage ? ` — ${userMessage.slice(0, 60)}` : "");
              await admin
                .from("ai_chats")
                .upsert({
                  id: sessionId,
                  anon_token: sessionId,
                  user_id: null,
                  kind: "embed_ask",
                  title,
                  city: host.city || null,
                  messages: threadMessages,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "id" });
            }
          } catch (e) {
            console.error("[embed-ai-chat] thread_persist_error", e);
          }
        };

        const emitTrailingMarkers = (): string => {
          const markers: string[] = [];
          if (lastMapPayload) {
            const safe = JSON.stringify(lastMapPayload).replace(/-->/g, "--&gt;");
            markers.push(`<!--SHOW_ON_MAP:${safe}-->`);
          }
          if (lastEventsPayload) {
            const safe = JSON.stringify(lastEventsPayload).replace(/-->/g, "--&gt;");
            markers.push(`<!--EVENTS_SNAPSHOT:${safe}-->`);
          }
          if (knownBusinesses.length) {
            const seen = new Set<string>();
            const dedup = knownBusinesses.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
            const safe = JSON.stringify(dedup).replace(/-->/g, "--&gt;");
            markers.push(`<!--KNOWN_BUSINESSES:${safe}-->`);
          }
          if (!markers.length) return "";
          const chunk = "\n\n" + markers.join("\n");
          emitDelta(chunk);
          return chunk;
        };

        // Followup with radius / mode
        let followupRadiusKm: number | null = null;
        let followupMode: string | null = null;
        if (followupId) {
          try {
            const { data: fu } = await admin
              .from("embed_ai_followups")
              .select("radius_km, mode")
              .eq("id", followupId)
              .maybeSingle();
            const rv = fu?.radius_km;
            if (rv != null && Number.isFinite(Number(rv)) && Number(rv) > 0) followupRadiusKm = Number(rv);
            followupMode = (fu?.mode as string | null) || null;
          } catch (e) {
            console.error("[embed-ai-chat] followup_lookup_error", e);
          }
        }

        // Deterministic: MAP REPLAY — the user asks to see the previous results on a map.
        // We do NOT re-run any search. We reuse the last <!--SHOW_ON_MAP:...--> payload
        // emitted in a previous assistant turn and re-attach it to a short reply.
        const isMapReplayIntent = (t: string): boolean => {
          const n = normalize(t);
          if (!n) return false;
          if (/(sur (?:une |la )?carte|voir sur (?:la |une )?carte|montre[rz]?[- ]moi.*carte|affiche.*carte|resultats?.*carte|carte des resultats?)/i.test(n)) return true;
          if (/(on (?:a |the )?map|show (?:them |these |the )?(?:results? )?on (?:a |the )?map|view on map|map view)/i.test(n)) return true;
          if (/(على (?:ال)?خريطة|في (?:ال)?خريطة|أرني.*خريطة)/.test(t)) return true;
          return false;
        };
        if (isMapReplayIntent(userMessage)) {
          // Walk backwards through prior assistant messages to find a SHOW_ON_MAP marker.
          let mapJson: any = null;
          for (let i = inMessages.length - 1; i >= 0; i--) {
            const m = inMessages[i];
            if (m.role !== "assistant") continue;
            const match = String(m.content || "").match(/<!--SHOW_ON_MAP:([\s\S]*?)-->/);
            if (match) {
              try { mapJson = JSON.parse(match[1].replace(/--&gt;/g, "-->")); } catch { /* */ }
              if (mapJson) break;
            }
          }
          if (mapJson && Array.isArray(mapJson.businesses) && mapJson.businesses.length) {
            lastMapPayload = mapJson;
            for (const b of mapJson.businesses) {
              if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
            }
            const n = mapJson.businesses.length;
            const reply = language === "en"
              ? `Here are the **${n}** previous results plotted on the map — tap a marker to open its card.`
              : language === "ar"
                ? `إليك **${n}** من النتائج السابقة على الخريطة — انقر على العلامة لفتح بطاقة العنوان.`
                : `Voici les **${n}** résultats précédents replacés sur la carte — clique sur un marqueur pour ouvrir la fiche.`;
            emitDelta(reply);
            finalText = reply + emitTrailingMarkers();
            toolsCalledLog.push({ name: "map_replay", args: { count: n }, ok: true });
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          // No prior map payload — fall through to normal flow.
        }

        // Deterministic: HOURS RANKING — "quel est le premier à ouvrir / dernier à fermer ?"
        // Operates only on the previous turn's results; no LLM, no fallback if no priors.
        {
          const rankMode: "opens_first" | "closes_last" | null =
            isOpensFirstIntent(userMessage) ? "opens_first"
            : isClosesLastIntent(userMessage) ? "closes_last"
            : null;
          if (rankMode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildHoursRanking(admin, priorIds, rankMode, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "hours_ranking", args: { mode: rankMode, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: DISTANCE LIST — "quelles sont les distances depuis X ?"
        {
          if (isDistanceListIntent(userMessage)) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildDistanceList(admin, host, priorIds, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "distance_list", args: { count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: DISTANCE RANKING — "le plus proche / le plus loin"
        {
          const mode = isDistanceRankingIntent(userMessage);
          if (mode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildDistanceRanking(admin, host, priorIds, mode, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "distance_ranking", args: { mode, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: RATING RANKING — "le mieux noté / le plus d'avis"
        {
          const mode = isRatingRankingIntent(userMessage);
          if (mode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildRatingRanking(admin, priorIds, mode, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "rating_ranking", args: { mode, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: OPEN-NOW / OPEN-DURING-SLOT filter on prior results.
        {
          const filterIntent = parseOpenFilterIntent(userMessage);
          if (filterIntent) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildOpenFilter(admin, priorIds, filterIntent, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "open_filter", args: { intent: filterIntent, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: ORDINAL PICK — "le premier / le 2ème / les 3 premiers / le dernier"
        {
          const prior = extractPriorOrderedBusinesses(inMessages, host.id);
          if (prior.length) {
            const idx = parseOrdinalIntent(userMessage, prior.length);
            if (idx && idx.length) {
              const answer = buildOrdinalPick(prior, idx, language);
              emitDelta(answer);
              toolsCalledLog.push({ name: "ordinal_pick", args: { indices: idx }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
        }

        // Deterministic: COUNT — "combien ?"
        if (isCountIntent(userMessage)) {
          const prior = extractPriorOrderedBusinesses(inMessages, host.id);
          if (prior.length) {
            const answer = buildCountAnswer(prior.length, language);
            emitDelta(answer);
            toolsCalledLog.push({ name: "count_priors", args: { count: prior.length }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: HOURS — read opening_hours directly from DB, gated by show_opening_hours.


        if (isHoursIntent(userMessage)) {
          // 1) If the previous assistant turn returned a list of results (KNOWN_BUSINESSES marker),
          //    the follow-up "Consulter les horaires" refers to those results — not to the host.
          const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIds.length) {
            const answer = await buildHoursForBusinesses(admin, priorIds, language);
            if (answer) {
              emitDelta(answer);
              toolsCalledLog.push({ name: "hours_lookup", args: { scope: "previous_results", count: priorIds.length }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
          // 2) Fallback: hours of the host business.
          const answer = buildHoursAnswer(host, language);
          if (answer) {
            emitDelta(answer);
            toolsCalledLog.push({ name: "hours_lookup", args: { scope: "host", show: !!host.show_opening_hours }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: ONLINE BOOKING — scan url_1..url_5 CTAs for a Reserve/Book label.
        if (isBookingIntent(userMessage)) {
          const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIds.length) {
            const answer = await buildBookingForBusinesses(admin, priorIds, language);
            if (answer) {
              emitDelta(answer);
              toolsCalledLog.push({ name: "booking_lookup", args: { scope: "previous_results", count: priorIds.length }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
          const answer = buildBookingAnswer(host, language);
          emitDelta(answer);
          toolsCalledLog.push({ name: "booking_lookup", args: { scope: "host" }, ok: true });
          endText();
          await logTurn({ finalText: answer, streamCompleted: true });
          return;
        }


        // Deterministic: TWO-ENTITY PROXIMITY (curated only) — the active
        // suggestion must carry proximity_a_* AND proximity_b_* mappings.
        // Free-text "A à côté d'un B" is intentionally NOT handled here;
        // it falls through to search_businesses via the LLM.
        {
          let built: Awaited<ReturnType<typeof buildTwoEntityProximityCurated>> | null = null;
          const strict = parseInlineRadiusKm(userMessage) != null;
          if (curatedProximity) {
            const intent: TwoEntityIntent = {
              aTerms: [suggestionLabel || "A"],
              bTerm: suggestionLabel || "B",
              radiusKm: parseInlineRadiusKm(userMessage) ?? 1,
            };
            built = await buildTwoEntityProximityCurated(admin, host, intent, language, strict, curatedProximity);
          }

          if (built) {
            const forcedResult = {
              results: built.results,
              total_found: built.results.length,
              city: host.city || "Marrakech",
              proximity_active: true,
              radius_km_used: built.radiusUsed,
              radius_expanded: built.radiusExpanded,
              disclosure_note: null,
            };
            rememberSearchResult("search_businesses", {
              _twoEntity: true,
              aTerms: built.aTerms,
              bTerm: built.bTerm,
              radius_km: built.radiusUsed,
            }, forcedResult);
            emitDelta(built.text);
            const trailing = emitTrailingMarkers();
            toolsCalledLog.push({ name: "two_entity_proximity", args: { aTerms: built.aTerms, bTerm: built.bTerm, radius_km: built.radiusUsed, count: built.results.length, curated: !!curatedProximity }, ok: true });
            endText();
            await logTurn({ finalText: built.text + trailing, streamCompleted: true });
            return;
          }
        }


        // Deterministic: POI-only nearby
        if (followupMode === "poi_nearby") {
          const radiusKm = followupRadiusKm ?? 1;
          const answer = await buildPoiNearby(admin, host, language, radiusKm);
          if (answer) {
            emitDelta(answer);
            toolsCalledLog.push({ name: "poi_nearby", args: { lat: host.latitude, lng: host.longitude, radius_km: radiusKm, source: "followup" }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: nearby overview
        // Skip when the suggestion carries a deterministic filter (badge/subcategory)
        // — those must route through search_businesses with an immersive intro + carousel.
        const forcedNearby = followupRadiusKm != null;
        const hasDeterministicFilter = !!(deterministicBadgeIds?.length || deterministicSubcategoryNames?.length);
        if ((forcedNearby || isNearbyOverviewIntent(userMessage, host.name)) && !hasDeterministicFilter) {
          const radiusKm = followupRadiusKm ?? 1;
          const overview = await buildNearbyOverview(admin, host, hostCategoryNames, language, radiusKm);
          if (overview) {
            emitDelta(overview);
            toolsCalledLog.push({ name: "nearby_overview", args: { lat: host.latitude, lng: host.longitude, radius_km: radiusKm, source: forcedNearby ? "followup" : "intent" }, ok: true });
            endText();
            await logTurn({ finalText: overview, streamCompleted: true });
            return;
          }
        }

        // Deterministic: events search (suggestion mode = 'events')
        if (suggestionMode === "events") {
          // Compute a "this weekend" window: from today → next Sunday (+7 max)
          const today = new Date();
          const dow = today.getDay(); // 0=Sun ... 6=Sat
          const daysUntilSun = (7 - dow) % 7 || 7;
          const from = today.toISOString().slice(0, 10);
          const to = new Date(today.getTime() + daysUntilSun * 86400000).toISOString().slice(0, 10);
          const forcedArgs: any = { city: host.city || "Marrakech", from_date: from, to_date: to, limit: 10 };
          const forcedResult = await runTool("search_events", forcedArgs);
          rememberSearchResult("search_events", forcedArgs, forcedResult);
          if (Array.isArray((forcedResult as any)?.results) && (forcedResult as any).results.length) {
            lastEventsPayload = { title: null, city: (forcedResult as any).city || null, events: (forcedResult as any).results };
          }
          const events = Array.isArray((forcedResult as any)?.results) ? (forcedResult as any).results : [];
          const answer = buildEventsWeekendAnswer(events, host, host.city || "Marrakech", from, to, language);
          emitDelta(answer);
          const trailing = emitTrailingMarkers();
          toolsCalledLog.push({ name: "events_weekend", args: { city: host.city, from, to, count: events.length }, ok: true });
          endText();
          await logTurn({ finalText: answer + trailing, streamCompleted: true });
          return;
        }

        if (deterministicSubcategoryNames || deterministicBadgeIds) {
          const forcedArgs: any = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          if (deterministicSubcategoryNames) forcedArgs._subcategoryNames = deterministicSubcategoryNames;
          if (deterministicBadgeIds) forcedArgs._badgeIds = deterministicBadgeIds;
          if (isProximityIntent(userMessage) && Number.isFinite(Number(host.latitude)) && Number.isFinite(Number(host.longitude))) {
            const inlineR = parseInlineRadiusKm(userMessage);
            forcedArgs._anchorLat = Number(host.latitude);
            forcedArgs._anchorLng = Number(host.longitude);
            forcedArgs._radiusKm = inlineR ?? followupRadiusKm ?? 1;
            if (inlineR != null) forcedArgs._strictRadius = true;
          }
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          const routeDesc = [
            deterministicSubcategoryNames ? `sous-catégories ${deterministicSubcategoryNames.join(", ")}` : null,
            deterministicBadgeIds ? `${deterministicBadgeIds.length} badge(s)` : null,
          ].filter(Boolean).join(" + ");
          if (Array.isArray(forcedResult?.results) && forcedResult.results.length) {
            finalText = buildImmersiveBusinessAnswer(forcedResult, host, userMessage, language);
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          {
            const city = host.city || "Marrakech";
            const empty = language === "ar"
              ? `📍 لم أعثر على نتائج في ${city} لهذا البحث — أخبرني إن كنت تريد أن أعيد الصياغة أو أوسّع النطاق.`
              : language === "en"
              ? `📍 No results found in ${city} for this search — tell me if you want me to rephrase or widen the area.`
              : `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
            finalText = empty;
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
        } else if (shouldForceDirectorySearch(userMessage)) {
          const forcedArgs: any = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          if (isProximityIntent(userMessage) && Number.isFinite(Number(host.latitude)) && Number.isFinite(Number(host.longitude))) {
            const inlineR = parseInlineRadiusKm(userMessage);
            forcedArgs._anchorLat = Number(host.latitude);
            forcedArgs._anchorLng = Number(host.longitude);
            forcedArgs._radiusKm = inlineR ?? followupRadiusKm ?? 1;
            if (inlineR != null) forcedArgs._strictRadius = true;
          }
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          if (Array.isArray(forcedResult?.results) && forcedResult.results.length) {
            finalText = buildImmersiveBusinessAnswer(forcedResult, host, userMessage, language);
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          {
            const city = host.city || "Marrakech";
            const empty = language === "ar"
              ? `📍 لم أعثر على نتائج في ${city} لهذا البحث — أخبرني إن كنت تريد أن أعيد الصياغة أو أوسّع النطاق.`
              : language === "en"
              ? `📍 No results found in ${city} for this search — tell me if you want me to rephrase or widen the area.`
              : `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
            finalText = empty;
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
        }

        // When results are already forced deterministically (events / badge / subcategory /
        // directory search), skip the tool loop entirely and stream directly. The tool
        // loop otherwise gave the LLM room to skip the immersive intro and only echo the
        // disclosure_note.
        const hasForcedResults =
          !!(deterministicSubcategoryNames || deterministicBadgeIds) ||
          shouldForceDirectorySearch(userMessage);

        if (hasForcedResults) {
          try {
            const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
            const model = gateway(MODEL);
            const systemText = convo
              .filter((m) => m.role === "system")
              .map((m) => String(m.content || ""))
              .join("\n\n---\n\n");
            const result = streamText({
              model,
              system: systemText,
              messages: convertToModelMessages(
                convo
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((m) => ({
                    role: m.role as any,
                    parts: [{ type: "text", text: String(m.content || "") }],
                  })) as any,
              ),
              temperature: 0.4,
            });
            for await (const delta of result.textStream) {
              finalText += delta;
              emitDelta(delta);
            }
          } catch (streamErr) {
            hadError = true;
            errorMsg = String(streamErr).slice(0, 500);
            console.error("[embed-ai-chat] forced_stream_error", streamErr);
            if (!finalText) {
              const fallback = language === "en"
                ? "I found the matching One World Morocco results, but I couldn't format the full answer this time. Please try again in a moment."
                : language === "ar"
                  ? "وجدت النتائج المطابقة في One World Morocco، لكن لم أتمكن من صياغة الإجابة الكاملة الآن. يرجى المحاولة بعد قليل."
                  : "J'ai trouvé les résultats correspondants One World Morocco, mais je n'ai pas pu formuler la réponse complète cette fois-ci. Réessaie dans un instant.";
              finalText = fallback;
              emitDelta(fallback);
            }
          }

          if (lastDisclosureNote) {
            const hasDisclosure = /\bsur\s+\d+\s+trouv/i.test(finalText) || finalText.includes(lastDisclosureNote);
            if (!hasDisclosure) {
              const injection = `\n\n${lastDisclosureNote}`;
              emitDelta(injection);
              finalText += injection;
            }
          }

          finalText += emitTrailingMarkers();
          endText();
          await logTurn({ finalText, streamCompleted: !hadError });
          return;
        }

        // Tool loop (up to MAX_ROUNDS). Non-stream rounds via direct gateway fetch
        // (keeps the existing tool_calls JSON contract). Final round streamed via AI SDK.
        const effectiveRounds = MAX_ROUNDS;
        for (let round = 0; round < effectiveRounds; round++) {
          const isLast = round === effectiveRounds - 1;
          const resp = await fetch(GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL,
              messages: convo,
              tools: isLast ? undefined : TOOLS,
              tool_choice: isLast ? undefined : "auto",
              temperature: 0.7,
              stream: false,
            }),
          });
          if (!resp.ok) {
            const errTxt = await resp.text().catch(() => "");
            hadError = true;
            errorMsg = `gateway_${resp.status}: ${errTxt.slice(0, 200)}`;
            emitDelta(`\n\n_Erreur passerelle (${resp.status})._`);
            endText();
            await logTurn({ finalText: "", streamCompleted: false });
            return;
          }
          const json = await resp.json();
          const choice = json?.choices?.[0];
          const msg = choice?.message || {};
          const toolCalls: any[] = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

          if (toolCalls.length && !isLast) {
            convo.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
            for (const tc of toolCalls) {
              const fname = tc.function?.name;
              let fargs: any = {};
              try { fargs = JSON.parse(tc.function?.arguments || "{}"); } catch { /* */ }
              const result = await runTool(fname, fargs);
              rememberSearchResult(fname, fargs, result);
              if (fname === "show_on_map" && (result as any)?.ok && Array.isArray((result as any).businesses)) {
                lastMapPayload = { title: (result as any).title || null, businesses: (result as any).businesses };
                for (const b of (result as any).businesses) {
                  if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                }
              }
              if (fname === "search_events" && Array.isArray((result as any)?.results) && (result as any).results.length) {
                lastEventsPayload = { title: null, city: (result as any).city || null, events: (result as any).results };
              }
              convo.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result).slice(0, 12000),
              });
            }
            continue;
          }

          // Final round → stream via AI SDK
          try {
            const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
            const model = gateway(MODEL);
            // IMPORTANT: pass system messages via the `system` option, not inside `messages`.
            // The AI SDK does not reliably forward system messages nested in `messages`,
            // which caused the LLM to skip the immersive intro / paragraph format and
            // echo only the disclosure_note.
            const systemText = convo
              .filter((m) => m.role === "system")
              .map((m) => String(m.content || ""))
              .join("\n\n---\n\n");
            const result = streamText({
              model,
              system: systemText,
              messages: convertToModelMessages(
                convo
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((m) => ({
                    role: m.role as any,
                    parts: [{ type: "text", text: String(m.content || "") }],
                  })) as any,
              ),
              temperature: hasForcedResults ? 0.4 : 0.7,
            });
            for await (const delta of result.textStream) {
              finalText += delta;
              emitDelta(delta);
            }
          } catch (streamErr) {
            const fallback = String(msg.content || "");
            if (fallback) { emitDelta(fallback); finalText = fallback; }
            console.error("[embed-ai-chat] stream_error", streamErr);
          }

          // Inject disclosure if missing
          if (lastDisclosureNote) {
            const hasDisclosure = /\bsur\s+\d+\s+trouv/i.test(finalText) || finalText.includes(lastDisclosureNote);
            if (!hasDisclosure) {
              const injection = `\n\n${lastDisclosureNote}`;
              emitDelta(injection);
              finalText += injection;
            }
          }

          finalText += emitTrailingMarkers();
          endText();
          await logTurn({ finalText, streamCompleted: true });
          return;
        }

        endText();
        await logTurn({ finalText: "", streamCompleted: false });
      },
      onError: (err) => {
        console.error("[embed-ai-chat] stream_execute_error", err);
        return String((err as Error)?.message || err);
      },
    });

    return createUIMessageStreamResponse({ stream, headers: corsHeaders });
  } catch (e) {
    console.error("[embed-ai-chat] fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
