import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAiGateway, resolveCallerContext, normalizeGatewayBodyForModel } from "../_shared/ai-gateway.ts";
import { AI_MODEL, getSurfaceConfig } from "../_shared/ai-engine/surfaces.ts";
import { loadEditorialBundle, formatEditorialBundle } from "../_shared/ai-engine/editorial.ts";
import { classify, isConfident, type ClassifyResult } from "../_shared/ai-engine/classify.ts";
import { detectViewIntent, hasPanoramaAttribute, hasPanoramaProof, withinPointRadius, hasVantage, hasPointViewProof } from "../_shared/ai-engine/view-targets.ts";
import {
  loadCuratedTargets, fetchBlogPostsCached, matchCuratedByText,
  buildArticleTeaser, buildPinnedAnswer, buildFilteredAnswer,

} from "../_shared/ai-engine/routes/curated.ts";
import { buildVideoFeedAnswer, videoFeedMarker } from "../_shared/ai-engine/routes/videoFeed.ts";
import { resolveCityScope, detectExplicitCity } from "../_shared/ai-engine/city-scope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Modèle Flash pour latence/cout ; Pro en fallback si dégénérescence.
const MODEL = AI_MODEL;
const FALLBACK_MODEL = AI_MODEL;
const SEARCH_RESULT_LIMIT = 50;

// ------------------------------------------------------------------
// In-memory TTL cache (per edge instance) for repeated tool calls
// within a short window — 5 min. Same (query+city+lang) reuses result
// instead of re-hitting business-search / events DB.
// ------------------------------------------------------------------
const TOOL_CACHE_TTL_MS = 5 * 60 * 1000;
const TOOL_CACHE_MAX = 200;
type ToolCacheEntry = { t: number; value: any };
const toolCache = new Map<string, ToolCacheEntry>();
function cacheGet(key: string): any | null {
  const e = toolCache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > TOOL_CACHE_TTL_MS) { toolCache.delete(key); return null; }
  return e.value;
}
function cacheSet(key: string, value: any) {
  if (toolCache.size >= TOOL_CACHE_MAX) {
    // drop oldest ~10%
    const drop = Math.ceil(TOOL_CACHE_MAX * 0.1);
    let i = 0;
    for (const k of toolCache.keys()) { toolCache.delete(k); if (++i >= drop) break; }
  }
  toolCache.set(key, { t: Date.now(), value });
}

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: any[]; tool_call_id?: string; name?: string };

type PreviousSearchSnapshot = {
  title?: string;
  slugs: string[];
  returnedCount: number;
  totalCount: number;
};

const MAP_TRIGGER_RE = /\b(sur\s+une?\s+cartes?|une?\s+cartes?|la\s+cartes?|cartes?|maps?|situe(?:z|s|r|nt)?|localise(?:z|s|r|nt)?|o[uù]\s+sont|o[uù]\s+se\s+trouvent|where\s+are|geoloc|g[ée]oloc)\b|خريطة/i;
const KNOWN_CITY_NAMES = ["Marrakech", "Essaouira", "Casablanca", "Rabat", "Agadir", "Fès", "Tanger", "Ouarzazate", "Chefchaouen"];

function extractMoroccoCity(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = normalizeLoose(raw);
  for (const city of KNOWN_CITY_NAMES) {
    if (normalized.includes(normalizeLoose(city))) return city;
  }
  return raw.length <= 40 && !raw.includes(",") ? raw : null;
}

// Types de LIEUX (business) — si présents, on NE bascule PAS en route agenda
// même si un mot temporel ("ce soir", "ce week-end") apparaît.
const VENUE_NOUN_RE = /\b(club|bar|pub|lounge|rooftop|discoth[eè]que|boite|boîte|restaurant|resto|brasserie|bistrot|bistro|cafe|caf[eé]|salon\s+de\s+th[eé]|hotel|h[oô]tel|riad|maison\s+d[' ]h[oô]tes|guesthouse|auberge|spa|hammam|massage|boutique|magasin|shop|galerie|mus[eé]e|piscine|plage|golf|kite|surf|yoga|gym|fitness|salle\s+de\s+sport|ecole|[eé]cole|cours|atelier|traiteur|patisserie|p[aâ]tisserie|boulangerie|glacier|cave|caviste|librairie|fleuriste|coiffeur|barbier|tatoueur|photographe|dentiste|medecin|m[eé]decin|pharmacie|clinique|veterinaire|v[eé]t[eé]rinaire|taxi|transfert|location|agence)\b/i;

// Marqueurs explicitement événementiels (indépendants du type de lieu)
const EXPLICIT_EVENT_RE = /\b(agenda|[eé]v[eé]nement|[eé]v[eé]nements|event|events|concert|concerts|festival|festivals|expo|exposition|expositions|spectacle|spectacles|programme|programmation|se\s+passe|que\s+faire|sortie\s+culturelle|soir[eé]e\s+culturelle|animations?|f[eê]te|f[eê]tes)\b/i;

function isAgendaIntent(text: string): boolean {
  const n = normalizeLoose(text);
  // Si la requête décrit un TYPE DE LIEU (club, bar, restaurant, riad…),
  // c'est une recherche business — pas d'agenda — même avec "ce soir".
  if (VENUE_NOUN_RE.test(n)) return false;
  return EXPLICIT_EVENT_RE.test(n);
}

// Intent : "mes favoris / mes bookmarks / mes sauvegardes"
const BOOKMARKS_INTENT_RE = /\b(mes\s+(favoris?|bookmarks?|sauvegardes?|marque[- ]?pages?|enregistr[ée]s?)|my\s+(bookmarks?|favou?rites?|saved)|ce\s+que\s+j['’]?ai\s+(sauv[eé]|enregistr[eé]|marqu[eé])|قائمة\s+المفضلة|المفضلة)\b/i;
function isBookmarksIntent(text: string): boolean {
  const n = normalizeLoose(text);
  return BOOKMARKS_INTENT_RE.test(n) && n.split(/\s+/).length <= 12;
}

// Intent : "parle-moi de X", "c'est quoi X", "raconte X", "présente X", "tell me about X"
// Retourne le nom du business demandé, ou null si pas de match d'intent.
const DETAILS_PATTERNS: RegExp[] = [
  /^(?:parle|parles?)[-\s]+moi\s+(?:un\s+peu\s+)?(?:de|du|d[’'])\s+(.{2,80})\??\s*$/i,
  /^raconte[-\s]+moi\s+(?:un\s+peu\s+)?(?:de|du|d[’'])?\s*(.{2,80})\??\s*$/i,
  /^(?:pr[eé]sente|d[eé]cris|dis[- ]moi\s+tout\s+sur)\s+(.{2,80})\??\s*$/i,
  /^(?:c['’]?est\s+quoi|qu['’]?est[-\s]?ce\s+que\s+c['’]?est|c['’]?est\s+qui)\s+(.{2,80})\??\s*$/i,
  /^(?:tell\s+me\s+(?:more\s+)?about|what\s+is|who\s+is|describe)\s+(.{2,80})\??\s*$/i,
];
const DETAILS_STOPWORDS = /^(un|une|des|le|la|les|l['’]|a|an|the|this|that|it|ce|cette|ces|mon|ma|mes|ton|ta|tes|the|d[eu])$/i;
function extractDetailsTarget(text: string): string | null {
  const t = String(text || "").trim();
  if (!t || t.length > 120) return null;
  for (const re of DETAILS_PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      let name = m[1].trim().replace(/[?.!,;:]+$/g, "").trim();
      // Rejette si trop générique (pas un nom propre)
      const words = name.split(/\s+/);
      if (words.length === 1 && DETAILS_STOPWORDS.test(words[0])) return null;
      if (name.length < 2) return null;
      return name.slice(0, 80);
    }
  }
  return null;
}

// ---- Open-now filter (Africa/Casablanca) ----
const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function nowInCasablanca(): { dayKey: string; minutes: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wd = (parts.find(p => p.type === "weekday")?.value || "").toLowerCase();
  const h = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  const m = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  return { dayKey: wd, minutes: h * 60 + m };
}
function parseHm(v: unknown): number | null {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10), mm = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h * 60 + mm;
}
function isOpenNow(business: { opening_hours?: any; is_open_24h?: boolean | null }): boolean | null {
  if (business.is_open_24h) return true;
  const oh = business.opening_hours;
  if (!oh || typeof oh !== "object") return null; // unknown
  const { dayKey, minutes } = nowInCasablanca();
  const day = oh[dayKey];
  if (!day || typeof day !== "object") return null;
  if (day.closed === true) return false;
  if (day.continuous === true) return true;
  const inRange = (open: unknown, close: unknown): boolean => {
    const o = parseHm(open), c = parseHm(close);
    if (o == null || c == null) return false;
    if (c > o) return minutes >= o && minutes < c;
    // Overnight (ex: 20:00 → 02:00)
    if (c < o) return minutes >= o || minutes < c;
    return false;
  };
  if (inRange(day.open, day.close)) return true;
  if (day.open2 && day.close2 && inRange(day.open2, day.close2)) return true;
  return false;
}

// Returns today's hours as a short string ("9:00–23:00", "9:00–14:00, 19:00–23:00",
// "24/24", "Fermé") or null if unknown.
function formatTodayHours(business: { opening_hours?: any; is_open_24h?: boolean | null }, lang: "fr" | "en" | "ar" = "fr"): string | null {
  if (business.is_open_24h) return lang === "en" ? "Open 24/7" : lang === "ar" ? "24/24" : "24h/24";
  const oh = business.opening_hours;
  if (!oh || typeof oh !== "object") return null;
  const { dayKey } = nowInCasablanca();
  const day = oh[dayKey];
  if (!day || typeof day !== "object") return null;
  if (day.closed === true) return lang === "en" ? "Closed today" : lang === "ar" ? "مغلق اليوم" : "Fermé aujourd'hui";
  if (day.continuous === true) return lang === "en" ? "Open all day" : lang === "ar" ? "مفتوح طوال اليوم" : "Ouvert en continu";
  const norm = (v: unknown) => {
    const s = String(v || "").trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return `${parseInt(m[1], 10)}:${m[2]}`;
  };
  const a = norm(day.open), b = norm(day.close);
  const a2 = norm(day.open2), b2 = norm(day.close2);
  const parts: string[] = [];
  if (a && b) parts.push(`${a}–${b}`);
  if (a2 && b2) parts.push(`${a2}–${b2}`);
  return parts.length ? parts.join(", ") : null;
}

// Intent : "ouvert maintenant / ouvert ce soir / lesquels sont ouverts / open now / open tonight"
const OPEN_NOW_INTENT_RE = /\b(ouverts?\s+(maintenant|l[àa]|actuellement|ce\s+soir|ce\s+midi|encore|aujourd['’]?hui)|lesquels?\s+sont\s+ouverts?|qu['’]?est[-\s]?ce\s+qui\s+est\s+ouvert|open\s+(now|tonight|today|right\s+now)|which\s+(ones?\s+)?are\s+open|مفتوح\s+الآن)\b/i;
function isOpenNowIntent(text: string): boolean {
  const n = normalizeLoose(text);
  return OPEN_NOW_INTENT_RE.test(n);
}

// Top-level city cleaner (duplicated inside `serve` as local `cleanActiveCity`,
// but hoisted here so deterministic routes running before that inner const
// can also normalize the active city safely).
function cleanActiveCityTop(raw: any): string | undefined {
  const s = String(raw || "").trim();
  if (!s) return undefined;
  const known = ["Marrakech", "Essaouira", "Casablanca", "Agadir", "Taghazout", "Rabat", "Fès", "Fes", "Tanger", "Chefchaouen", "Ouarzazate", "Merzouga"];
  const norm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const k of known) {
    const kn = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm.includes(kn)) return k;
  }
  return s.length <= 40 && !/[,\d]/.test(s) ? s : undefined;
}



// ============= Router helpers : weather / booking / nearby / price =============
const WEATHER_INTENT_RE = /\b(m[ée]t[ée]o|weather|forecast|il\s+fait\s+(?:beau|chaud|froid|mauvais|combien)|quel\s+temps|temps\s+qu[’']?il\s+fait|temp[ée]rature|degr[ée]s?|is\s+it\s+(?:sunny|raining|hot|cold)|الطقس)\b/i;
function isWeatherIntent(text: string): boolean { return WEATHER_INTENT_RE.test(normalizeLoose(text)); }

const BOOKING_INTENT_RE = /\b(je\s+r[ée]serve|r[ée]serve[- ]?moi|r[ée]server\s+(?:chez|à|au|pour)|prends[- ]moi\s+une\s+table|r[ée]serve[- ]moi\s+une\s+table|book\s+me|reserve\s+for\s+me|book\s+a\s+table)\b/i;
function parseBookingIntent(text: string): string | null {
  const raw = String(text || "").trim();
  if (!BOOKING_INTENT_RE.test(raw)) return null;
  const m = raw.match(/(?:je\s+r[ée]serve|r[ée]serve[- ]?moi|r[ée]server\s+(?:chez|à|au|pour)|prends[- ]moi\s+une\s+table\s+(?:chez|à|au)|r[ée]serve[- ]moi\s+une\s+table\s+(?:chez|à|au)|book\s+me\s+(?:a\s+table\s+at)?|reserve\s+for\s+me\s+(?:at)?|book\s+a\s+table\s+(?:at)?)\s+(.{2,120})$/i);
  if (!m) return null;
  return m[1].replace(/[?!.]$/g, "").trim();
}

const NEARBY_INTENT_RE = /\b(le\s+plus\s+proche|les\s+plus\s+proches|le\s+plus\s+pr[eè]s|nearest|closest|nearby|autour\s+de\s+moi|[àa]\s+c[ôo]t[ée]\s+de\s+moi|near\s+me|pr[eè]s\s+de\s+moi|[àa]\s+proximit[ée])\b/i;
const NEAR_LANDMARK_RE = /\b(?:[àa]\s+c[ôo]t[ée]\s+de|pr[eè]s\s+de|autour\s+de|proche\s+de|near|next\s+to|by)\s+(?:la\s+|le\s+|the\s+)?([a-zà-ÿ][a-zà-ÿ' \-]{2,40})\b/i;
function isNearbyIntent(text: string): boolean { return NEARBY_INTENT_RE.test(normalizeLoose(text)) || NEAR_LANDMARK_RE.test(text); }
// Hardcoded coords for well-known Marrakech / Essaouira landmarks (extend as needed).
const LANDMARK_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  "koutoubia":       { lat: 31.6242, lng: -7.9930, label: "Koutoubia" },
  "jemaa el fna":    { lat: 31.6258, lng: -7.9891, label: "Jemaa el-Fna" },
  "jamaa el fna":    { lat: 31.6258, lng: -7.9891, label: "Jemaa el-Fna" },
  "place jemaa":     { lat: 31.6258, lng: -7.9891, label: "Jemaa el-Fna" },
  "majorelle":       { lat: 31.6417, lng: -8.0031, label: "Jardin Majorelle" },
  "bahia":           { lat: 31.6218, lng: -7.9832, label: "Palais Bahia" },
  "menara":          { lat: 31.6115, lng: -8.0230, label: "Ménara" },
  "gueliz":          { lat: 31.6386, lng: -8.0107, label: "Guéliz" },
  "hivernage":       { lat: 31.6300, lng: -8.0125, label: "Hivernage" },
  "palmeraie":       { lat: 31.6800, lng: -7.9500, label: "Palmeraie" },
  "medina":          { lat: 31.6295, lng: -7.9811, label: "Médina" },
  "medina marrakech":{ lat: 31.6295, lng: -7.9811, label: "Médina" },
  "essaouira":       { lat: 31.5085, lng: -9.7595, label: "Essaouira" },
  "sqala":           { lat: 31.5121, lng: -9.7726, label: "Sqala" },
  "port essaouira":  { lat: 31.5107, lng: -9.7752, label: "Port d'Essaouira" },
};
function resolveLandmarkCoords(text: string): { lat: number; lng: number; label: string } | null {
  const n = normalizeLoose(text);
  for (const key of Object.keys(LANDMARK_COORDS)) {
    if (n.includes(key)) return LANDMARK_COORDS[key];
  }
  const m = text.match(NEAR_LANDMARK_RE);
  if (m) {
    const nn = normalizeLoose(m[1]);
    for (const key of Object.keys(LANDMARK_COORDS)) if (nn.includes(key)) return LANDMARK_COORDS[key];
  }
  return null;
}
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ============= Ville par défaut selon la géoloc =============
// Essaouira si l'utilisateur est à moins de 80 km d'Essaouira, sinon Marrakech.
const ESSAOUIRA_COORDS = { lat: 31.5085, lng: -9.7595 };
const ESSAOUIRA_RADIUS_KM = 80;
function resolveGeoDefaultCity(coords: any): string {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    if (haversineKm({ lat, lng }, ESSAOUIRA_COORDS) <= ESSAOUIRA_RADIUS_KM) return "Essaouira";
  }
  return "Marrakech";
}

// Ne retient qu'une ville marocaine réellement connue (évite les quartiers / adresses GPS)
const WEATHER_KNOWN_CITIES = ["Marrakech", "Essaouira", "Casablanca", "Agadir", "Taghazout", "Rabat", "Fès", "Tanger", "Chefchaouen", "Ouarzazate", "Merzouga", "Oualidia", "Sidi Kaouki", "Sidi Ifni", "Dakhla", "Meknès", "Tétouan", "Al Hoceima", "Ifrane", "Imlil", "Ouzoud"];
function knownWeatherCity(raw: any): string | undefined {
  const s = String(raw || "").trim();
  if (!s) return undefined;
  const norm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const c of WEATHER_KNOWN_CITIES) {
    const cn = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm.includes(cn)) return c;
  }
  return undefined;
}



// Price intent : « moins de 300 dh », « pas cher », « haut de gamme », « entre 200 et 500 »
const PRICE_INTENT_RE = /\b(moins\s+de\s+\d{2,5}|plus\s+de\s+\d{2,5}|entre\s+\d{2,5}\s+et\s+\d{2,5}|under\s+\d{2,5}|less\s+than\s+\d{2,5}|pas\s+cher(?:s|es)?|cheap(?:er)?|[eé]conomique|budget|haut\s+de\s+gamme|luxury|luxe|premium|abordable|affordable|mid[- ]range)\b/i;
type PriceFilter = { max?: number; min?: number; tier?: "cheap" | "premium" | "mid" };
function parsePriceIntent(text: string): PriceFilter | null {
  const raw = String(text || "");
  if (!PRICE_INTENT_RE.test(raw)) return null;
  const f: PriceFilter = {};
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/(?:moins\s+de|under|less\s+than)\s+(\d{2,5})/i))) f.max = Number(m[1]);
  if ((m = raw.match(/plus\s+de\s+(\d{2,5})/i))) f.min = Number(m[1]);
  if ((m = raw.match(/entre\s+(\d{2,5})\s+et\s+(\d{2,5})/i))) { f.min = Number(m[1]); f.max = Number(m[2]); }
  if (/\b(pas\s+cher|cheap|[eé]conomique|budget|abordable|affordable)\b/i.test(raw)) f.tier = "cheap";
  else if (/\b(haut\s+de\s+gamme|luxury|luxe|premium)\b/i.test(raw)) f.tier = "premium";
  else if (/\bmid[- ]range\b/i.test(raw)) f.tier = "mid";
  if (f.max == null && f.min == null && !f.tier) return null;
  return f;
}
function extractMinPriceFromRange(text?: string | null): number | null {
  if (!text) return null;
  const nums = String(text).match(/\d{2,5}/g);
  if (!nums || !nums.length) return null;
  return Math.min(...nums.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0));
}
function priceMatches(price: number | null, f: PriceFilter): boolean {
  if (price == null) return false;
  if (f.max != null && price > f.max) return false;
  if (f.min != null && price < f.min) return false;
  if (f.tier === "cheap"   && price > 400)  return false;
  if (f.tier === "mid"     && (price < 300 || price > 900)) return false;
  if (f.tier === "premium" && price < 800)  return false;
  return true;
}



function formatEventDate(event: any): string {
  const fmt = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Casablanca" }).format(d);
  };
  if (event.start_date && event.end_date && event.end_date !== event.start_date) return `${fmt(event.start_date)} → ${fmt(event.end_date)}`;
  if (event.start_date) return fmt(event.start_date);
  if (Array.isArray(event.days_of_week) && event.days_of_week.length) return `récurrent · ${event.days_of_week.join(", ")}`;
  if (event.recurrence) return `récurrent · ${event.recurrence}`;
  return "date à confirmer";
}

function extractRequestedResultCount(text: string): number | null {
  const match = String(text || "").match(/\b(?:les\s+)?(\d{1,3})\s+r[ée]sultats?\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function stripMapMarkers(text: string): string {
  return String(text || "")
    .replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "")
    .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
    .trim();
}

function extractPreviousSearchSnapshot(messages: Msg[]): PreviousSearchSnapshot | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const original = String(messages[i]?.content || "");
    const searchMarkers = Array.from(original.matchAll(/<!--SEARCH_RESULTS:([\s\S]*?)-->/g));
    for (let j = searchMarkers.length - 1; j >= 0; j--) {
      try {
        const parsed = JSON.parse(String(searchMarkers[j][1]).replace(/--&gt;/g, "-->"));
        const slugs = Array.isArray(parsed?.slugs)
          ? parsed.slugs.filter((s: any) => typeof s === "string" && s.trim())
          : [];
        if (slugs.length) {
          return {
            title: typeof parsed.title === "string" ? parsed.title.slice(0, 120) : undefined,
            slugs: Array.from(new Set<string>(slugs)).slice(0, SEARCH_RESULT_LIMIT),
            returnedCount: Number(parsed.returnedCount ?? parsed.returned_count) || slugs.length,
            totalCount: Number(parsed.totalCount ?? parsed.total_count) || slugs.length,
          };
        }
      } catch { /* ignore malformed snapshot */ }
    }

    const raw = stripMapMarkers(original).replace(/<!--SEARCH_RESULTS:[\s\S]*?-->/g, "");
    const lines = raw.split("\n");
    const countMatch = raw.match(/(?:\*\*)?\s*(\d+)\s+r[ée]sultats?\s+affich[ée]s?\s+sur\s+(\d+)\s+trouv[ée]s?/i);
    if (!countMatch) continue;

    const slugs = Array.from(raw.matchAll(/https?:\/\/[^\s)]+\/(?:b|fiche)\/([^\s)]+)/gi))
      .map((m) => decodeURIComponent(m[1]).split(/[?#]/)[0])
      .filter(Boolean);

    const uniqueSlugs = Array.from(new Set(slugs));
    if (!uniqueSlugs.length) continue;

    const firstContentLine = lines
      .map((line) => line.replace(/[*_#>`-]/g, " ").replace(/\s+/g, " ").trim())
      .find((line) => line && !/r[ée]sultats?\s+affich[ée]s?\s+sur\s+\d+\s+trouv[ée]s?/i.test(line));

    return {
      title: firstContentLine?.slice(0, 80) || undefined,
      slugs: uniqueSlugs,
      returnedCount: Number(countMatch[1]) || uniqueSlugs.length,
      totalCount: Number(countMatch[2]) || uniqueSlugs.length,
    };
  }
  return null;
}

function extractPreviousUserQuery(messages: Msg[]): string | null {
  const userMessages = messages
    .filter((m) => m.role === "user" && typeof m.content === "string" && m.content.trim())
    .map((m) => m.content.trim());
  if (userMessages.length < 2) return null;
  const previous = userMessages[userMessages.length - 2];
  const beforePrevious = userMessages[userMessages.length - 3] || "";
  const additive = /^\+?\s*(avec|sans|et|plus|aussi|uniquement|seulement|en|à|a)\b/i.test(previous) || previous.split(/\s+/).length <= 4;
  if (additive && beforePrevious && !MAP_TRIGGER_RE.test(beforePrevious)) {
    return `${beforePrevious} ${previous.replace(/^\+\s*/, "")}`.trim();
  }
  return previous;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

function correctVisibleResultCount(answer: string, resultNames: string[]): string {
  if (!answer || !resultNames.length || !/r[ée]sultats?\s+affich[ée]s?\s+sur\s+\d+\s+trouv[ée]s?/i.test(answer)) return answer;
  const visible = stripMapMarkers(answer).replace(/<!--SEARCH_RESULTS:[\s\S]*?-->/g, "");
  const normalizedVisible = normalizeLoose(visible);
  let count = 0;
  const seen = new Set<string>();
  for (const name of resultNames) {
    const n = String(name || "").trim();
    if (!n) continue;
    const key = normalizeLoose(n);
    if (!key || seen.has(key)) continue;
    const strongName = new RegExp(`\\*\\*\\s*${escapeRegExp(n)}\\s*\\*\\*`, "i");
    if (strongName.test(visible) || normalizedVisible.includes(key)) {
      seen.add(key);
      count++;
    }
  }
  if (count <= 0) return answer;
  return answer.replace(/(\*\*)?\s*\d+\s+(r[ée]sultats?\s+affich[ée]s?\s+sur\s+\d+\s+trouv[ée]s?)(\*\*)?/i, (_m, open = "", rest, close = "") => `${open}${count} ${rest}${close}`);
}

// ============= Session memory (heuristic, deterministic) + follow-ups =============
// Reconstructs "who / where / what / not-what" from the last user turns so shortcut
// routes can propose self-contained, context-aware follow-ups without an LLM call.
// STRICT RULE (product): NEVER suggest a price/budget/cheaper filter — pricing data
// isn't reliable for most establishments (only some hotels/riads).

const KNOWN_CITIES = [
  "marrakech", "essaouira", "casablanca", "rabat", "tanger", "tangier",
  "fes", "fès", "agadir", "ouarzazate", "chefchaouen", "meknes", "meknès",
  "tetouan", "tétouan", "el jadida", "dakhla", "ifrane", "asilah",
];
const KNOWN_LANDMARKS = [
  "koutoubia", "jemaa el fna", "jamaa el fna", "medina", "gueliz", "hivernage",
  "palmeraie", "menara", "majorelle", "bahia", "atlas", "kasbah", "mellah", "bab agnaou",
];
const TOPIC_KEYWORDS: Record<string, string> = {
  "rooftop": "rooftop", "bar": "bar", "restaurant": "restaurant", "resto": "restaurant",
  "diner": "restaurant", "dine": "restaurant", "manger": "restaurant", "brunch": "brunch",
  "cafe": "café", "hotel": "hôtel", "riad": "riad", "spa": "spa", "hammam": "hammam",
  "boutique": "boutique", "musee": "musée", "gallery": "galerie", "galerie": "galerie",
  "jazz": "club de jazz", "concert": "concert", "piscine": "piscine", "plage": "plage",
  "surf": "surf", "yoga": "yoga", "cocktail": "bar à cocktails", "club": "club",
};
const EXCLUSION_STOPWORDS = new Set([
  "pas", "les", "des", "une", "que", "peur", "plus", "trop", "mal", "trop",
  "the", "any", "some", "and", "for", "not",
]);

type SessionMemory = {
  city: string | null;
  topic: string | null;
  landmark: string | null;
  exclusions: string[];
  keywords: string[];
};

// ============= Blog enrichment helper =============
// Loads blog posts referenced by a fixed-response suggestion and returns
// (a) a small human-visible intro line, (b) a BLOG_CARDS marker that the
// client renders as cards + opens a slidepanel, (c) an invisible BLOG_CTX
// marker persisted in message history so subsequent LLM turns can inject
// the full article content as grounded context.
type BlogCard = { id: string; slug: string; title: string; cover: string | null; tldr: string | null };
async function fetchBlogEnrichment(
  admin: any,
  blogPostIds: string[] | null | undefined,
  lang: "fr" | "en" | "ar",
): Promise<{ intro: string; cardsMarker: string; ctxMarker: string; cards: BlogCard[] } | null> {
  const ids = Array.isArray(blogPostIds) ? blogPostIds.filter(Boolean) : [];
  if (!ids.length) return null;
  const { data: posts } = await admin
    .from("blog_posts")
    .select("id,slug,title_fr,title_en,title_ar,cover_image_url,tldr_fr,tldr_en,tldr_ar")
    .in("id", ids)
    .eq("is_published", true);
  if (!posts || !posts.length) return null;
  const pickTitle = (p: any) => (lang === "en" ? p.title_en : lang === "ar" ? p.title_ar : p.title_fr) || p.title_fr || p.title_en || p.title_ar || "";
  const pickTldr = (p: any) => (lang === "en" ? p.tldr_en : lang === "ar" ? p.tldr_ar : p.tldr_fr) || null;
  // Preserve staff ordering (blog_post_ids order)
  const byId = new Map(posts.map((p: any) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  const cards: BlogCard[] = ordered.map((p: any) => ({
    id: p.id, slug: p.slug, title: pickTitle(p), cover: p.cover_image_url || null, tldr: pickTldr(p),
  }));
  const intro = lang === "en"
    ? `\n\n**${cards.length} article${cards.length > 1 ? "s" : ""} du blog** peuvent t'aider à aller plus loin :`
    : lang === "ar"
    ? `\n\n**${cards.length} مقال من المدونة** قد تساعدك على المضي قدماً:`
    : `\n\n**${cards.length} article${cards.length > 1 ? "s" : ""} du blog** peuvent t'aider à aller plus loin :`;
  const cardsMarker = `\n\n<!--BLOG_CARDS:${JSON.stringify(cards)}-->`;
  const ctxMarker = `\n<!--BLOG_CTX:${JSON.stringify(ids)}-->`;
  return { intro, cardsMarker, ctxMarker, cards };
}


// ─────────────────────────────────────────────────────────────────────────────
// Moteur A/B/C (docs/ai/spec-moteur-abc.md §4) — dérive la classe et la route
// canonique depuis la route legacy de club-ai-chat, sans changer le routage.
// ─────────────────────────────────────────────────────────────────────────────
const CLUB_ROUTE_MAP: Record<string, { route: string; aiClass: "A" | "B" | "C" }> = {
  out_of_scope_guard: { route: "out_of_scope", aiClass: "A" },
  fixed_response: { route: "smalltalk", aiClass: "A" },
  fixed_response_semantic: { route: "smalltalk", aiClass: "B" },
  agenda_shortcut: { route: "events", aiClass: "A" },
  affirmative_map: { route: "map", aiClass: "A" },
  map_shortcut_fallback: { route: "map", aiClass: "A" },
  bookmarks_shortcut: { route: "discover", aiClass: "A" },
  anaphora_shortcut: { route: "business_qa", aiClass: "A" },
  details_shortcut: { route: "business_qa", aiClass: "A" },
  open_now_shortcut: { route: "opening", aiClass: "A" },
  weather_shortcut: { route: "weather", aiClass: "A" },
  booking_shortcut: { route: "booking", aiClass: "A" },
  nearby_shortcut: { route: "nearby", aiClass: "A" },
  price_shortcut: { route: "pricing", aiClass: "A" },
  router_direct: { route: "discover", aiClass: "A" },
  tool_loop: { route: "discover", aiClass: "C" },
};

function classifyTurn(log: any, model: string, clf?: ClassifyResult | null): void {
  const m = CLUB_ROUTE_MAP[String(log.route_taken || "")] ?? { route: "discover", aiClass: "C" as const };
  log.ai_class = m.aiClass;
  log.model = m.aiClass === "A" ? null : model;
  if (m.aiClass === "C" && !log.fallback_reason && log.route_taken === "tool_loop") {
    log.fallback_reason = null; // C nominal (discover flou / tool loop), pas un fallback
  }
  // ── Classifieur B (observation) ────────────────────────────────────────────
  // Sur les tours fourre-tout (router_direct / tool_loop), on trace la sortie du
  // classifieur SANS lui donner autorité sur le routage : on mesure d'abord sa
  // qualité en SQL avant de câbler category/exclude/city dans search_businesses.
  const clfOut = clf?.output ?? null;
  if (clfOut) {
    const confident = isConfident(clfOut, "club");
    log.classifier_confidence = clfOut.confidence;
    log.intent_classified = `classifier:${clfOut.intent}|legacy:${log.intent_classified ?? "none"}`;
    if (!log.city_detected && clfOut.city) log.city_detected = clfOut.city;
    if (!confident && !log.fallback_reason) log.fallback_reason = "confidence_low";
    const tools = Array.isArray(log.tools_called) ? log.tools_called : [];
    log.tools_called = {
      tools,
      classifier: {
        intent: clfOut.intent,
        category: clfOut.category,
        exclude: clfOut.exclude,
        city: clfOut.city,
        confidence: clfOut.confidence,
        threshold: getSurfaceConfig("club").confidenceThreshold,
        legacy_route: log.route_taken,
        authority: false,
        tokens_in: clf?.tokensIn ?? null,
        tokens_out: clf?.tokensOut ?? null,
        error: clf?.error ?? null,
      },
    };
    log.tokens_in = (log.tokens_in ?? 0) + (clf?.tokensIn ?? 0);
    log.tokens_out = (log.tokens_out ?? 0) + (clf?.tokensOut ?? 0);
  } else if (clf?.error) {
    log.fallback_reason = log.fallback_reason || "classifier_error";
  }
  if (log.had_error) log.fallback_reason = log.fallback_reason || "route_failed";
  if (log.results_count === 0) log.fallback_reason = log.fallback_reason || "no_results";
}


function buildSessionMemory(messages: Msg[], activeCity?: string | null): SessionMemory {
  const mem: SessionMemory = { city: null, topic: null, landmark: null, exclusions: [], keywords: [] };
  const users = messages
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .slice(-6);
  const exSet = new Set<string>();
  const kwSet = new Set<string>();
  for (const m of users) {
    const raw = String(m.content);
    const n = normalizeLoose(raw);
    for (const c of KNOWN_CITIES) {
      if (n.includes(normalizeLoose(c))) mem.city = c.charAt(0).toUpperCase() + c.slice(1);
    }
    for (const l of KNOWN_LANDMARKS) {
      if (n.includes(normalizeLoose(l))) mem.landmark = l;
    }
    for (const [k, v] of Object.entries(TOPIC_KEYWORDS)) {
      if (n.includes(normalizeLoose(k))) { mem.topic = v; kwSet.add(v); }
    }
    const exclRegexes = [
      /\bpas\s+(?:de\s+|d['’]?\s*|un\s+|une\s+|des\s+)?([a-zà-ÿ]{3,15})/gi,
      /\bsans\s+([a-zà-ÿ]{3,15})/gi,
      /\bno\s+([a-z]{3,15})\b/gi,
      /\bnot\s+(?:a\s+|an\s+)?([a-z]{3,15})\b/gi,
    ];
    for (const re of exclRegexes) {
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(raw)) !== null) {
        const w = normalizeLoose(mm[1]);
        if (w && !EXCLUSION_STOPWORDS.has(w)) exSet.add(w);
      }
    }
  }
  if (!mem.city && activeCity) mem.city = String(activeCity);
  mem.exclusions = Array.from(exSet).slice(0, 4);
  mem.keywords = Array.from(kwSet).slice(0, 5);
  return mem;
}

function buildDeterministicFollowups(route: string, mem: SessionMemory, lang: string): string[] {
  const t = (fr: string, en: string, ar: string) => lang === "en" ? en : lang === "ar" ? ar : fr;
  const cityFR = mem.city || "Marrakech";
  const cityEN = mem.city || "Marrakech";
  const cityAR = mem.city || "مراكش";
  const topicFR = mem.topic || "adresse";
  const topicEN = mem.topic || "spot";
  const topicAR = mem.topic || "مكان";
  const exclFR = mem.exclusions.length ? ` (sans ${mem.exclusions.join(", ")})` : "";
  const exclEN = mem.exclusions.length ? ` (excluding ${mem.exclusions.join(", ")})` : "";
  const landFR = mem.landmark ? ` avec vue sur ${mem.landmark}` : "";
  const landEN = mem.landmark ? ` overlooking ${mem.landmark}` : "";

  const OPEN_NOW = t("Lesquels sont ouverts maintenant ?", "Which ones are open right now?", "أيها مفتوح الآن؟");
  const ON_MAP   = t("Peux-tu me les afficher sur une carte ?", "Can you show them on a map?", "اعرضها على الخريطة");
  const AGENDA   = t(`Que se passe-t-il à ${cityFR} ces prochaines semaines ?`, `What's happening in ${cityEN} in the coming weeks?`, `ما الذي يحدث في ${cityAR} في الأسابيع القادمة؟`);
  const SIMILAR  = t(`Un autre ${topicFR} similaire à ${cityFR}${landFR}${exclFR} ?`, `Another ${topicEN} similar in ${cityEN}${landEN}${exclEN}?`, `${topicAR} آخر مشابه في ${cityAR}`);

  switch (route) {
    case "router_direct":
    case "tool_loop":
    case "refinement":
      return [OPEN_NOW, ON_MAP, AGENDA];
    case "agenda_shortcut":
      return [
        t(`Quels événements ce week-end à ${cityFR} ?`, `What events this weekend in ${cityEN}?`, `فعاليات نهاية الأسبوع في ${cityAR}؟`),
        t(`Un ${topicFR}${exclFR} pour ce soir à ${cityFR} ?`, `A ${topicEN}${exclEN} for tonight in ${cityEN}?`, `${topicAR} لهذه الليلة في ${cityAR}؟`),
        t(`Peux-tu afficher ces événements sur une carte ?`, `Can you show these events on a map?`, `اعرض الفعاليات على الخريطة`),
      ];
    case "affirmative_map":
    case "map_shortcut_fallback":
      return [
        OPEN_NOW,
        t(`Quel est ton préféré et pourquoi ?`, `Which is your favorite and why?`, `أيها المفضل لديك ولماذا؟`),
        AGENDA,
      ];
    case "bookmarks_shortcut":
      return [OPEN_NOW, ON_MAP, AGENDA];
    case "details_shortcut":
      return [
        t(`Quels sont ses horaires d'ouverture aujourd'hui ?`, `What are today's opening hours?`, `ما هي ساعات العمل اليوم؟`),
        SIMILAR,
        t(`Peux-tu me le situer sur une carte ?`, `Can you show it on a map?`, `اعرضه على الخريطة`),
      ];
    case "open_now_shortcut":
      return [
        ON_MAP,
        SIMILAR,
        t(`Que se passe-t-il ce soir à ${cityFR} ?`, `What's happening tonight in ${cityEN}?`, `ما الذي يحدث الليلة في ${cityAR}؟`),
      ];
    default:
      return [ON_MAP, OPEN_NOW, AGENDA];
  }
}



const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Météo d'une ville du Maroc : conditions actuelles, prévisions horaires (toutes les 3h sur 24h) et prévisions journalières sur 5 jours. Utilise les champs `hourly` et `daily` pour décrire l'évolution de la journée.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "Nom de la ville" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_businesses",
      description:
        "Recherche des établissements RÉELS dans la base One World Morocco. À utiliser systématiquement avant de citer un lieu. Combine nom, catégorie, ville, quartier, badges ET services. Les badges qualifient finement l'expérience (#Authentique, Rooftop, Famille, Gastronomique, Piscine, Spa, Beach Club, Vue sur mer, Démarche éco-responsable…) ; les services décrivent l'équipement/prestation (« Avec piscine », « Spa », « Hammam », « Restaurant », « Parking », « Wifi », « Climatisation »…). IMPORTANT : pour une intention comme « avec piscine », passe la valeur à la fois dans badges ET dans services — la fonction fait l'UNION et trouvera les établissements qui ont soit le badge soit le service correspondant. Si l'utilisateur exprime une intention (« authentique », « romantique », « pour enfants », « avec piscine », « avec spa »…), pense à remplir badges + services.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mot-clé ou nom partiel (optionnel si category/badges/services fourni)" },
          category: { type: "string", description: "Catégorie principale: restaurant, hotel, spa, activité, bar, café, etc. (optionnel)" },
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira, Casablanca)" },
          neighborhood: { type: "string", description: "Quartier (ex: Gueliz, Médina, Hivernage)" },
          badges: {
            type: "array",
            items: { type: "string" },
            description: "Badges (name_fr, avec ou sans #) à matcher. Ex: ['#Authentique'], ['Rooftop','Vue sur mer'], ['Piscine']. Combiné en UNION avec `services`.",
          },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services / équipements à matcher (name_fr partiel). Ex: ['piscine'], ['spa','hammam'], ['restaurant']. Combiné en UNION avec `badges` : un établissement matche s'il porte au moins un badge OU un service de la liste.",
          },
          limit: { type: "number", description: "Nombre de résultats à retourner dans le texte (max 50, défaut 12). Augmente jusqu'à 50 si le membre demande une carte ou une vue d'ensemble.", default: 12 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_details",
      description: "Détails complets d'un établissement par son slug : description, horaires, adresse, prix, contact. À utiliser quand l'utilisateur veut en savoir plus sur un lieu précis.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string", description: "Slug exact retourné par search_businesses" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_bookmarks",
      description: "Liste les établissements sauvegardés (bookmarks) de l'utilisateur connecté.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_saved_chats",
      description: "Liste les conversations IA précédentes sauvegardées par l'utilisateur (titre + date).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_taste_profile",
      description: "Renvoie un résumé des goûts du membre (catégories préférées, villes, quartiers, personas) déduit de ses bookmarks, likes vidéos, recherches.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_similar_to_my_bookmarks",
      description: "Suggère des établissements 1WM similaires aux bookmarks du membre, en croisant catégories/villes dominantes.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Restreindre à une ville (optionnel)" },
          limit: { type: "number", description: "Nombre max de suggestions (max 10)", default: 6 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Recherche web temps réel via Firecrawl + Google. À utiliser UNIQUEMENT pour des infos factuelles non présentes dans la base 1WM : pharmacies de garde, numéros d'urgence officiels, horaires d'événements publics, transports, démarches administratives, actualités. NE PAS utiliser pour recommander des établissements (utilise search_businesses). Retourne titres, snippets et URLs sources que tu DOIS citer.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Requête de recherche en langage naturel (ex: 'pharmacie de garde Marrakech aujourd'hui')" },
          limit: { type: "number", description: "Nombre de résultats (3-8, défaut 5)", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_events",
      description:
        "Recherche des ÉVÉNEMENTS / AGENDA culturel & festif référencés dans 1WM (concerts, festivals, expositions, soirées, marchés, etc.). Par défaut filtré sur le badge #Agenda et les événements à venir. Utilise systématiquement cet outil quand le membre demande 'que faire ce week-end', 'quoi voir ce soir', 'événements', 'agenda', 'concerts', 'festivals'.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira)" },
          query: { type: "string", description: "Mot-clé sur le nom/description (optionnel)" },
          from_date: { type: "string", description: "Date début ISO (YYYY-MM-DD). Défaut : aujourd'hui." },
          to_date: { type: "string", description: "Date fin ISO (YYYY-MM-DD). Défaut : +30 jours." },
          include_all_badges: { type: "boolean", description: "Si true, n'applique pas le filtre #Agenda. Défaut false.", default: false },
          limit: { type: "number", description: "Max 10", default: 8 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_trips",
      description:
        "Liste les voyages du membre (titre, description, dates, heures, ville(s), établissements liés). Par défaut : voyages en cours ou à venir, triés par date d'arrivée. Utilise-le quand le membre dit 'mon voyage', 'mes voyages', 'mon séjour à X', 'prépare mon week-end à…', 'planning', ou pour personnaliser une recommandation autour de ses dates et adresses déjà sauvegardées.",
      parameters: {
        type: "object",
        properties: {
          include_past: { type: "boolean", description: "Inclure les voyages passés (défaut false).", default: false },
          limit: { type: "number", description: "Max 10", default: 6 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_business_to_trip",
      description:
        "Lie un établissement (par slug) à l'un des voyages du membre (par trip_id ou par titre de voyage). Demande la confirmation du membre avant d'appeler cet outil si la cible n'est pas évidente. Retourne le voyage mis à jour.",
      parameters: {
        type: "object",
        properties: {
          business_slug: { type: "string", description: "Slug exact de l'établissement (issu de search_businesses)." },
          trip_id: { type: "string", description: "ID du voyage cible (préféré si connu)." },
          trip_title: { type: "string", description: "Titre exact ou approchant du voyage (fallback si trip_id absent)." },
        },
        required: ["business_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_map",
      description:
        "Affiche une sélection d'établissements sur une carte Google Maps (mini-aperçu dans la bulle + panneau latéral avec carte plein écran). Utilise cet outil dès que le membre dit 'montre-moi sur une carte', 'sur une carte', 'situe les', 'où sont-ils', 'localise', ou quand il est utile de visualiser géographiquement plusieurs adresses citées. Passe UNIQUEMENT des slugs valides obtenus via search_businesses, list_my_bookmarks, get_my_trips ou suggest_similar_to_my_bookmarks. Tu peux ensuite continuer ta réponse textuelle normalement — la carte sera rendue automatiquement.",
      parameters: {
        type: "object",
        properties: {
          business_slugs: {
            type: "array",
            items: { type: "string" },
            description: "Liste des slugs (2 à 50) des établissements à afficher sur la carte. Passe tous les résultats utiles de search_businesses (jusqu'à 50).",
          },
          title: { type: "string", description: "Titre court de la carte (ex: 'Hôtels avec piscine à Marrakech'). Optionnel." },
        },
        required: ["business_slugs"],
      },
    },
  },

];




// ----- Taste profile helper -----
async function computeTasteProfile(userId: string, supabase: any) {
  const [bks, vlikes, vbks, sh, personas] = await Promise.all([
    supabase.from("bookmarks").select("business_id").eq("user_id", userId).limit(100),
    supabase.from("video_likes").select("video_id").eq("user_id", userId).limit(100),
    supabase.from("video_bookmarks").select("video_id").eq("user_id", userId).limit(100),
    supabase.from("search_history").select("query,city").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase
      .from("club_member_personas")
      .select("personas:persona_id(slug,name_fr), member:member_id!inner(user_id)")
      .eq("member.user_id", userId),
  ]);

  const bizIds = (bks.data || []).map((b: any) => b.business_id).filter(Boolean);
  const categories: Record<string, number> = {};
  const cities: Record<string, number> = {};
  const neighborhoods: Record<string, number> = {};
  const bookmarkedNames: string[] = [];

  if (bizIds.length) {
    const { data: bizs } = await supabase
      .from("businesses")
      .select("name,main_category,city,neighborhood,categories")
      .in("id", bizIds);
    for (const b of bizs || []) {
      if (b.name) bookmarkedNames.push(b.name);
      if (b.main_category) categories[b.main_category] = (categories[b.main_category] || 0) + 2;
      for (const c of b.categories || []) categories[c] = (categories[c] || 0) + 1;
      if (b.city) cities[b.city] = (cities[b.city] || 0) + 1;
      if (b.neighborhood) neighborhoods[b.neighborhood] = (neighborhoods[b.neighborhood] || 0) + 1;
    }
  }

  const recentSearches = (sh.data || []).map((s: any) => s.query).filter(Boolean).slice(0, 10);
  const personaNames = (personas.data || [])
    .map((p: any) => p.personas?.name_fr)
    .filter(Boolean);

  const top = (obj: Record<string, number>, n = 5) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  return {
    bookmarks_count: bizIds.length,
    video_likes_count: (vlikes.data || []).length,
    video_bookmarks_count: (vbks.data || []).length,
    top_categories: top(categories, 6),
    top_cities: top(cities, 4),
    top_neighborhoods: top(neighborhoods, 4),
    recent_searches: recentSearches,
    personas: personaNames,
    sample_bookmarked: bookmarkedNames.slice(0, 8),
    _bizIds: bizIds,
  };
}

function tasteSummaryLine(t: any): string {
  if (!t) return "";
  const parts: string[] = [];
  if (t.top_categories?.length) parts.push(`catégories favorites ${t.top_categories.join(", ")}`);
  if (t.top_cities?.length) parts.push(`villes ${t.top_cities.join(", ")}`);
  if (t.personas?.length) parts.push(`personas ${t.personas.join(", ")}`);
  if (t.recent_searches?.length) parts.push(`recherches récentes ${t.recent_searches.slice(0, 5).join(" · ")}`);
  return parts.length ? `Profil de goûts du membre — ${parts.join(" ; ")}.` : "";
}

async function runTool(name: string, args: any, ctx: { userId: string; supabase: any; lastUserMessage?: string; language?: string; forceQuery?: string }) {
  try {
    if (name === "get_weather") {
      const { data, error } = await ctx.supabase.functions.invoke("get-weather", { body: { city: args.city } });
      if (error) return { error: String(error) };
      return data;
    }
    if (name === "search_businesses") {
      const limit = Math.min(Math.max(Number(args.limit) || 12, 1), SEARCH_RESULT_LIMIT);

      // Cache court (5 min) : mêmes critères + même dernier message ⇒ même résultat.
      const cacheKey = "sb:" + JSON.stringify({
        q: args.query || "",
        cat: args.category || "",
        b: args.badges || null,
        s: args.services || null,
        n: args.neighborhood || "",
        c: args.city || "",
        l: limit,
        lang: ctx.language || "fr",
        lm: (ctx.lastUserMessage || "").trim().toLowerCase().slice(0, 200),
        fq: (ctx.forceQuery || "").trim().toLowerCase().slice(0, 200),
      });
      const cached = cacheGet(cacheKey);
      if (cached) {
        console.log("club-ai-chat → search_businesses CACHE HIT", { key: cacheKey.slice(0, 80) });
        return { ...cached, _cache_hit: true };
      }

      // Construit une requête en langage naturel qui combine tous les critères
      // pour bénéficier de la MÊME logique que /search (synonymes, badges, services,
      // sous-catégories, détection ville/quartier, ranking, etc.)
      const qParts: string[] = [];
      if (args.query) qParts.push(String(args.query));
      if (args.category) qParts.push(String(args.category));
      const badgesIn: string[] = Array.isArray(args.badges) ? args.badges.filter(Boolean) : [];
      const servicesIn: string[] = Array.isArray(args.services) ? args.services.filter(Boolean) : [];
      badgesIn.forEach((b) => qParts.push(String(b).replace(/^#/, "")));
      servicesIn.forEach((s) => qParts.push(String(s).replace(/^#/, "")));
      if (args.neighborhood) qParts.push(String(args.neighborhood));
      const aiQuery = qParts.filter(Boolean).join(" ").trim();
      const forcedQuery = String(ctx.forceQuery || "").trim();
      const lastUserQuery = String(ctx.lastUserMessage || "")
        .replace(/\b(montre|montres|affiche|affiches|situe|localise|localises|cherche|trouve|peux-tu|pouvez-vous|sur une carte|carte)\b/gi, " ")
        .replace(/[?!.,;:()"“”«»]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const baseQuery = forcedQuery || (lastUserQuery.length >= 4 ? lastUserQuery : aiQuery);
      // « vue atlas » / « vue montagne » / « vue mer » : on injecte le nom EXACT
      // du service/badge existant en base pour que le moteur /search le capte.
      const preViewIntent = detectViewIntent(`${ctx.lastUserMessage || ""} ${ctx.forceQuery || ""} ${args.query || ""}`);
      const viewAttributeHints = preViewIntent.panoramas.map((p) => p.attributeNames[0]);
      // Repère ponctuel (Koutoubia…) : on N'INJECTE PAS « Rooftop » dans la
      // requête de récupération — ce mot oriente le moteur /search vers la
      // catégorie Hôtellerie (rooftops = hôtels/riads), ce qui vide ensuite
      // tout quand l'utilisateur a dit « pas un hôtel ». La preuve de point de
      // vue reste vérifiée en post-filtre (hasVantage), sauf si aucune
      // exclusion d'hébergement n'est demandée.
      const preExcludeHotel =
        /\b(pas|sans|no|not|exclu[re]?|autre que)\s+(un\s+|une\s+|d[e']?\s+|of\s+)?(hotel|hôtel|hotels|hôtels|riad|riads|maison\s+d.?hote|maison\s+d.?hotes|guesthouse|guest\s*house|hebergement|hébergement)/i
          .test(`${ctx.lastUserMessage || ""} ${ctx.forceQuery || ""} ${args.query || ""}`);
      if (preViewIntent.points.length && !preExcludeHotel) viewAttributeHints.push("Rooftop");
      const fullQuery = viewAttributeHints.length
        ? `${baseQuery} ${viewAttributeHints.join(" ")}`.trim()
        : baseQuery;



      // Appel business-search (même moteur que /search) — direct fetch pour éviter
      // les aléas de `functions.invoke` depuis Deno (parfois body non transmis).
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      let sres: any = null;
      let sErr: string | null = null;
      try {
        const body = {
          query: fullQuery || undefined,
          spoken: fullQuery || undefined,
          language: ctx.language || (args.language as string) || "fr",
          pageSize: SEARCH_RESULT_LIMIT,
          offset: 0,
          compact: "card",
          city: args.city || undefined,
        };
        const r = await fetch(`${supabaseUrl}/functions/v1/business-search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const text = await r.text();
        try { sres = JSON.parse(text); } catch { sres = null; }
        if (!r.ok) sErr = `HTTP ${r.status}: ${text.slice(0, 200)}`;
        console.log("club-ai-chat → business-search", JSON.stringify({ args, aiQuery, fullQuery, status: r.status, total: sres?.totalCount, n: Array.isArray(sres?.businesses) ? sres.businesses.length : 0, displayedLimit: limit, detectedCity: sres?.detectedCity, detectedCategory: sres?.detectedCategory, detectedService: sres?.detectedService }));
      } catch (e) {
        sErr = String(e);
        console.error("club-ai-chat → business-search fetch exception", e);
      }
      if (sErr) {
        return { results: [], error: sErr, hint: "Réessaie avec des critères plus simples." };
      }
      const allBusinesses: any[] = Array.isArray(sres?.businesses) ? sres.businesses : [];
      const total = typeof sres?.totalCount === "number" ? sres.totalCount : allBusinesses.length;
      if (!allBusinesses.length) {
        const empty = {
          results: [],
          total_count: 0,
          note: `Aucun établissement trouvé (query="${fullQuery}", city="${args.city || ""}"). Dis-le franchement à l'utilisateur et propose-lui une alternative (autre quartier, élargir la catégorie) au lieu d'inventer.`,
        };
        cacheSet(cacheKey, empty);
        return empty;
      }

      // ---- Hard server-side post-filter based on user intent ---------------
      // The LLM sometimes ignores rules 14/15/16 (landmark proof, composed AND
      // intent, explicit exclusions). We enforce them here so it never even
      // sees non-matching results (e.g. Riad Danka for "bar avec vue koutoubia
      // pas d'hôtel").
      const norm = (s: any) =>
        String(s ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      const intentSource = norm(`${ctx.lastUserMessage || ""} ${ctx.forceQuery || ""} ${args.query || ""}`);

      // Exclusions "pas d'hôtel / no hotel / pas de riad / sans hôtel..."
      const excludeHotel =
        /\b(pas|sans|no|not|exclu[re]?|autre que)\s+(un\s+|une\s+|d[e']?\s+|of\s+)?(hotel|hôtel|hotels|hôtels|riad|riads|maison\s+d.?hote|maison\s+d.?hotes|guesthouse|guest\s*house|hebergement|hébergement)/i
          .test(intentSource);
      const hotelCategoriesNorm = ["hotellerie", "hebergement", "riad", "hotel", "maison d hotes", "maison d'hotes", "guesthouse", "guest house"];
      const isHotelLike = (b: any) => {
        const mc = norm(b.main_category);
        if (hotelCategoriesNorm.includes(mc)) return true;
        const cats = Array.isArray(b.categories) ? b.categories.map(norm) : [];
        return cats.some((c: string) => hotelCategoriesNorm.some((h) => c.includes(h)));
      };

      // Required "bar" attribute
      const requiresBar = /\bbar(s)?\b/.test(intentSource);
      const hasBar = (b: any) => {
        const services = Array.isArray(b.services) ? b.services.map(norm) : [];
        if (services.some((s: string) => /\bbar\b/.test(s))) return true;
        if (/\bbar\b/.test(norm(b.name))) return true;
        if (/\bbar\b/.test(norm(b.main_category))) return true;
        const cats = Array.isArray(b.categories) ? b.categories.map(norm) : [];
        if (cats.some((c: string) => /\bbar\b/.test(c))) return true;
        return false;
      };

      // ---- « Vue sur X » : deux natures, deux stratégies (source partagée) ---
      //  · PANORAMA (Atlas/montagne, mer, ville, désert) → filtre DUR sur les
      //    services/badges existants (« Vue montagne », « Vue sur mer »…). Le
      //    rayon n'a aucun sens ici (l'Atlas est à 50 km et pourtant visible).
      //  · POINT (Koutoubia, Jemaa el-Fna, Ménara…) → rayon ≈1 km autour du
      //    repère, la preuve textuelle ne servant qu'à confirmer.
      const viewIntent = detectViewIntent(intentSource);
      const viewPanoramas = viewIntent.panoramas;
      const viewPoints = viewIntent.points;
      const requiredLandmarks: Array<{ label: string }> = [
        ...viewPanoramas.map((p) => ({ label: p.label })),
        ...viewPoints.map((p) => ({ label: p.label })),
      ];

      // Need descriptions (preuve textuelle) + badges (attributs panorama)
      let descPre = new Map<string, string>();
      let badgesPre = new Map<string, string[]>();
      if ((requiredLandmarks.length || requiresBar) && allBusinesses.length) {
        const preIds = allBusinesses.map((b: any) => b.id).filter(Boolean);
        const [preDescRes, preBadgeRes] = await Promise.all([
          ctx.supabase.from("businesses").select("id,description").in("id", preIds),
          requiredLandmarks.length
            ? ctx.supabase
                .from("business_badges")
                .select("business_id, badges(name_fr)")
                .in("business_id", preIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        (preDescRes.data || []).forEach((r: any) => descPre.set(r.id, norm(r.description || "")));
        (preBadgeRes.data || []).forEach((r: any) => {
          const nameFr = r?.badges?.name_fr;
          if (!nameFr) return;
          const arr = badgesPre.get(r.business_id) || [];
          arr.push(nameFr);
          badgesPre.set(r.business_id, arr);
        });
      }

      const bizText = (b: any) =>
        [norm(b.name), norm(b.hook_fr), norm(b.hook_en), norm(b.hook_ar), descPre.get(b.id) || ""].join(" ");

      // Panorama : attribut en base (déterministe) OU preuve textuelle (secours)
      const matchesPanoramas = (b: any) => {
        if (!viewPanoramas.length) return true;
        return viewPanoramas.every(
          (p) =>
            hasPanoramaAttribute(p, { services: b.services, badgeNames: badgesPre.get(b.id) || [] }) ||
            hasPanoramaProof(p, bizText(b)),
        );
      };
      // Repère ponctuel : « vue sur la Koutoubia » ≠ « à côté de la Koutoubia ».
      // On exige la proximité ET une preuve de point de vue (rooftop / terrasse
      // panoramique / vue dégagée), sauf si le texte cite explicitement la vue.
      const matchesPoints = (b: any) => {
        if (!viewPoints.length) return true;
        const text = bizText(b);
        const vantage = hasVantage({ services: b.services, badgeNames: badgesPre.get(b.id) || [] }, text);
        return viewPoints.every(
          (p) => hasPointViewProof(p, text) || (withinPointRadius(p, b.latitude, b.longitude) && vantage),
        );
      };

      const matchesLandmark = (b: any) => matchesPanoramas(b) && matchesPoints(b);
      const barConfirmed = (b: any) => {
        if (!requiresBar) return true;
        if (hasBar(b)) return true;
        const desc = descPre.get(b.id) || "";
        return /\bbar\b/.test(desc);
      };

      const hasStrictRequirements = excludeHotel || requiresBar || requiredLandmarks.length > 0;
      // Critères DURS (catégorie requise / exclusion explicite) → éliminent.
      // Vue : éliminatoire aussi (attribut base / rayon), mais si ça vide tout
      // alors que les critères durs matchent, on assouplit au lieu de rendre 0.
      const hardFiltered = allBusinesses.filter((b: any) => {
        if (excludeHotel && isHotelLike(b)) return false;
        if (!barConfirmed(b)) return false;
        return true;
      });
      const landmarkFiltered = hardFiltered.filter((b: any) => matchesLandmark(b));
      const landmarkSoftened = requiredLandmarks.length > 0 && !landmarkFiltered.length && hardFiltered.length > 0;
      const filtered = landmarkSoftened
        ? hardFiltered
        : (requiredLandmarks.length ? landmarkFiltered : hardFiltered);

      const droppedCount = allBusinesses.length - filtered.length;
      if (droppedCount > 0 || landmarkSoftened) {
        console.log("club-ai-chat → post-filter", JSON.stringify({
          intentSource: intentSource.slice(0, 120),
          excludeHotel, requiresBar,
          panoramas: viewPanoramas.map((p) => p.slug),
          points: viewPoints.map((p) => p.slug),
          before: allBusinesses.length, hard: hardFiltered.length, landmark: landmarkFiltered.length,
          landmarkSoftened, after: filtered.length,
        }));
      }

      const effectiveList = hasStrictRequirements ? filtered : allBusinesses;
      const strictFilterApplied = hasStrictRequirements && droppedCount > 0;

      if (hasStrictRequirements && !effectiveList.length) {
        return {
          results: [],
          returned_count: 0,
          total_count: 0,
          total_before_filter: total,
          strict_filter_applied: true,
          strict_filter_reason: [
            excludeHotel ? "exclusion:hôtellerie" : null,
            requiresBar ? "requis:bar" : null,
            ...requiredLandmarks.map((l) => `vue:${l.label}`),
          ].filter(Boolean).join(" · "),
          has_more: false,
          map_slugs: [],
          map_count: 0,
          note:
            "Le filtre strict serveur a retiré tous les résultats bruts. Réponds qu'aucun établissement ne remplit simultanément toutes les conditions prouvées, et propose d'élargir un critère. Ne cite aucun résultat brut retiré.",
          answer_guidance:
            "IMPORTANT — aucun résultat ne remplit simultanément les conditions strictes. NE réintroduis JAMAIS les résultats retirés. Ne cite aucun établissement hors results[].",
        };
      }

      // Enrichissement : description + highlights (blocs) pour les résultats affichés
      const businesses = effectiveList.slice(0, limit);
      const ids = businesses.map((b) => b.id).filter(Boolean);

      const [descRes, hlRes] = await Promise.all([
        ctx.supabase.from("businesses").select("id,description").in("id", ids),
        ctx.supabase
          .from("front_highlights")
          .select("business_id,icon,title_fr,title_en,title_ar,description_fr,description_en,description_ar,section_title_fr,section_title_en,section_title_ar,metric_title_fr,metric_title_en,metric_title_ar,metric_value_fr,metric_value_en,metric_value_ar,sort_order")
          .in("business_id", ids)
          .order("sort_order", { ascending: true }),
      ]);
      const descById = new Map<string, string | null>();
      (descRes.data || []).forEach((r: any) => descById.set(r.id, r.description ?? null));
      const hlByBiz = new Map<string, any[]>();
      (hlRes.data || []).forEach((h: any) => {
        const arr = hlByBiz.get(h.business_id) || [];
        arr.push({
          icon: h.icon || null,
          section_title: h.section_title_fr || h.section_title_en || h.section_title_ar || null,
          title: h.title_fr || h.title_en || h.title_ar || null,
          description: h.description_fr || h.description_en || h.description_ar || null,
          metric_title: h.metric_title_fr || h.metric_title_en || h.metric_title_ar || null,
          metric_value: h.metric_value_fr || h.metric_value_en || h.metric_value_ar || null,
        });
        hlByBiz.set(h.business_id, arr);
      });

      const results = businesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        slug: b.slug ?? null,
        url: b.slug ? `https://oneworldmorocco.com/b/${b.slug}` : null,
        city: b.city ?? null,
        neighborhood: b.neighborhood ?? null,
        main_category: b.main_category ?? null,
        categories: b.categories ?? null,
        services: b.services ?? null,
        phone: b.phone ?? null,
        google_rating: b.google_rating ?? null,
        google_review_count: b.google_review_count ?? null,
        priority_score: b.priority_score ?? null,
        hook_fr: b.hook_fr ?? null,
        hook_en: b.hook_en ?? null,
        hook_ar: b.hook_ar ?? null,
        description: descById.get(b.id) ?? null,
        highlights: hlByBiz.get(b.id) || [],
      }));

      const payload = {
        results,
        returned_count: results.length,
        total_count: strictFilterApplied ? filtered.length : total,
        total_before_filter: total,
        strict_filter_applied: strictFilterApplied,
        strict_filter_reason: strictFilterApplied
          ? [
              excludeHotel ? "exclusion:hôtellerie" : null,
              requiresBar ? "requis:bar" : null,
              ...requiredLandmarks.map((l) => `vue:${l.label}`),
            ].filter(Boolean).join(" · ")
          : null,
        has_more: (strictFilterApplied ? filtered.length : total) > results.length,
        map_slugs: effectiveList.map((b: any) => b.slug).filter(Boolean).slice(0, SEARCH_RESULT_LIMIT),
        map_count: Math.min(effectiveList.length, SEARCH_RESULT_LIMIT),
        landmark_softened: landmarkSoftened,
        answer_guidance:
          (strictFilterApplied
            ? `IMPORTANT — un filtre strict serveur a déjà retiré ${droppedCount} établissement(s) qui ne remplissent pas les conditions (${excludeHotel ? "exclusion hôtel " : ""}${requiresBar ? "· doit avoir un bar " : ""}${requiredLandmarks.length ? "· vue prouvée sur " + requiredLandmarks.map((l) => l.label).join(", ") : ""}). Utilise total_count = ${filtered.length} et NE réintroduis JAMAIS les résultats retirés. `
            : "") +
          (landmarkSoftened
            ? `Les résultats respectent bien les critères principaux (${excludeHotel ? "hors hôtellerie, " : ""}${requiresBar ? "bar, " : ""}ville). Présente-les comme des correspondances valides — n'écris PAS "aucune correspondance exacte". Précise seulement, en une courte phrase, que la vue sur ${requiredLandmarks.map((l) => l.label).join(", ")} n'est pas documentée pour chacun. `
            : "") +
          "Dans le texte visible, cite 3 à 5 établissements maximum. La ligne 'N résultats affichés sur M trouvés' doit utiliser N = nombre de noms que tu listes réellement dans ton texte, pas returned_count. Les slugs complets pour la carte sont dans map_slugs.",
        detected: {
          city: sres?.detectedCity || null,
          neighborhood: sres?.detectedNeighborhood || null,
          category: sres?.detectedCategory || null,
          service: sres?.detectedService || null,
          subcategory: sres?.detectedSubcategory || null,
        },
      };
      cacheSet(cacheKey, payload);
      return payload;
    }

    if (name === "get_business_details") {
      const { data, error } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,address,main_category,categories,description,phone,website,google_rating,google_review_count,min_price,opening_hours")
        .eq("slug", args.slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Établissement introuvable" };
      return { ...data, url: `https://oneworldmorocco.com/b/${data.slug}` };
    }
    if (name === "list_my_bookmarks") {
      const { data: bks } = await ctx.supabase
        .from("bookmarks")
        .select("business_id")
        .eq("user_id", ctx.userId)
        .limit(30);
      const ids = (bks || []).map((b: any) => b.business_id);
      if (!ids.length) return { results: [] };
      const { data } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,main_category")
        .in("id", ids);
      return { results: (data || []).map((b: any) => ({ ...b, url: `https://oneworldmorocco.com/b/${b.slug}` })) };
    }
    if (name === "list_my_saved_chats") {
      const { data } = await ctx.supabase
        .from("ai_chats")
        .select("id,title,city,updated_at")
        .eq("user_id", ctx.userId)
        .eq("is_bookmarked", true)
        .order("updated_at", { ascending: false })
        .limit(20);
      return { results: data || [] };
    }
    if (name === "get_my_taste_profile") {
      const t = await computeTasteProfile(ctx.userId, ctx.supabase);
      const { _bizIds, ...pub } = t;
      return pub;
    }
    if (name === "suggest_similar_to_my_bookmarks") {
      const t = await computeTasteProfile(ctx.userId, ctx.supabase);
      const limit = Math.min(Number(args.limit) || 6, 10);
      if (!t.top_categories.length) return { results: [], note: "Aucun bookmark exploitable." };
      let q = ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,main_category,google_rating,google_review_count,priority_score")
        .eq("is_active", true)
        .or(t.top_categories.map((c: string) => `main_category.eq.${c}`).join(","))
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(limit * 3);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      else if (t.top_cities.length) q = q.in("city", t.top_cities);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const excluded = new Set(t._bizIds);
      const results = (data || []).filter((b: any) => !excluded.has(b.id)).slice(0, limit);
      return { results, based_on: { categories: t.top_categories, cities: t.top_cities } };
    }
    if (name === "search_events") {
      const limit = Math.min(Number(args.limit) || 8, 10);
      const today = new Date().toISOString().slice(0, 10);
      const from = (args.from_date && String(args.from_date).slice(0, 10)) || today;
      const to = (args.to_date && String(args.to_date).slice(0, 10))
        || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const evCacheKey = "se:" + JSON.stringify({
        l: limit, f: from, t: to,
        q: args.query || "",
        c: args.city || "",
        all: !!args.include_all_badges,
      });
      const evCached = cacheGet(evCacheKey);
      if (evCached) {
        console.log("club-ai-chat → search_events CACHE HIT", { key: evCacheKey.slice(0, 80) });
        return { ...evCached, _cache_hit: true };
      }

      let eventIds: string[] | null = null;
      if (!args.include_all_badges) {
        // Badge #Agenda
        const { data: badge } = await ctx.supabase
          .from("badges").select("id").ilike("name_fr", "%agenda%").limit(1).maybeSingle();
        if (badge?.id) {
          const { data: eb } = await ctx.supabase
            .from("event_badges").select("event_id").eq("badge_id", badge.id);
          eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
          if (!eventIds.length) return { results: [], note: "Aucun événement avec le badge #Agenda." };
        }
      }

      let q = ctx.supabase
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
      const { data, error } = await q;
      if (error) { console.error("search_events error", error); return { results: [], error: error.message }; }
      let results = data || [];
      const requestedCity = extractMoroccoCity(args.city);
      if (requestedCity) {
        const cv = normalizeLoose(requestedCity);
        results = results.filter((e: any) => normalizeLoose(e.cities?.name_fr || "").includes(cv));
      }
      const totalCount = results.length;
      results = results.slice(0, limit).map((e: any) => ({
        id: e.id,
        name: e.name,
        hook: e.hook,
        description: e.description,
        start_date: e.start_date,
        end_date: e.end_date,
        recurrence: e.recurrence,
        days_of_week: e.days_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        city: e.cities?.name_fr || null,
        neighborhood: e.neighborhoods?.name || null,
        url: e.url || null,
        sort_order: e.sort_order ?? null,
        default_business_id: e.default_business_id || null,
        images: Array.isArray(e.images) ? e.images.filter(Boolean) : [],
        videos: Array.isArray(e.videos) ? e.videos.filter(Boolean) : [],
        logo_url: e.logo_url || null,
      }));
      if (!results.length) {
        const emptyEv = { results: [], returned_count: 0, total_count: 0, period: { from, to }, note: `Aucun événement trouvé entre ${from} et ${to}${requestedCity ? ` à ${requestedCity}` : ""}.` };
        cacheSet(evCacheKey, emptyEv);
        return emptyEv;
      }
      const evPayload = { results, returned_count: results.length, total_count: totalCount, period: { from, to }, city: requestedCity || null };
      cacheSet(evCacheKey, evPayload);
      return evPayload;
    }
    if (name === "get_my_trips") {
      const limit = Math.min(Number(args.limit) || 6, 10);
      const today = new Date().toISOString().slice(0, 10);
      let q = ctx.supabase
        .from("club_trips")
        .select("id,title,description,arrival_date,departure_date,arrival_time,departure_time")
        .eq("user_id", ctx.userId)
        .order("arrival_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      if (!args.include_past) q = q.gte("departure_date", today);
      const { data: trips, error } = await q;
      if (error) return { error: error.message, results: [] };
      const tripIds = (trips || []).map((t: any) => t.id);
      let linksByTrip: Record<string, any[]> = {};
      if (tripIds.length) {
        const { data: links } = await ctx.supabase
          .from("club_trip_businesses")
          .select("trip_id,sort_order,businesses:business_id(id,name,slug,city,neighborhood,main_category)")
          .in("trip_id", tripIds)
          .order("sort_order", { ascending: true });
        for (const l of links || []) {
          if (!l.businesses) continue;
          (linksByTrip[l.trip_id] ||= []).push({
            ...l.businesses,
            url: `https://oneworldmorocco.com/b/${l.businesses.slug}`,
          });
        }
      }
      const results = (trips || [])
        .map((t: any) => ({
          ...t,
          businesses: linksByTrip[t.id] || [],
          is_ongoing: t.arrival_date <= today && t.departure_date >= today,
        }))
        .sort((a: any, b: any) => {
          if (a.is_ongoing !== b.is_ongoing) return a.is_ongoing ? -1 : 1;
          return String(a.arrival_date).localeCompare(String(b.arrival_date));
        });
      if (!results.length) return { results: [], note: "Aucun voyage à venir enregistré." };
      return { results };
    }
    if (name === "link_business_to_trip") {
      const slug = String(args.business_slug || "").trim();
      if (!slug) return { error: "business_slug requis" };
      const { data: biz } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!biz) return { error: `Établissement '${slug}' introuvable.` };

      let tripId: string | null = args.trip_id || null;
      let trip: any = null;
      if (tripId) {
        const { data } = await ctx.supabase
          .from("club_trips").select("id,title,arrival_date,departure_date")
          .eq("id", tripId).eq("user_id", ctx.userId).maybeSingle();
        trip = data;
      } else if (args.trip_title) {
        const { data } = await ctx.supabase
          .from("club_trips").select("id,title,arrival_date,departure_date")
          .eq("user_id", ctx.userId)
          .ilike("title", `%${String(args.trip_title).replace(/[%_]/g, "")}%`)
          .order("arrival_date", { ascending: true })
          .limit(1).maybeSingle();
        trip = data;
        tripId = data?.id || null;
      }
      if (!trip || !tripId) return { error: "Voyage cible introuvable. Demande au membre de préciser le titre exact du voyage." };

      const { data: existing } = await ctx.supabase
        .from("club_trip_businesses")
        .select("id").eq("trip_id", tripId).eq("business_id", biz.id).maybeSingle();
      if (existing) return { ok: true, already_linked: true, trip, business: biz };

      const { data: maxRow } = await ctx.supabase
        .from("club_trip_businesses").select("sort_order")
        .eq("trip_id", tripId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error: insErr } = await ctx.supabase
        .from("club_trip_businesses")
        .insert({ trip_id: tripId, business_id: biz.id, sort_order: nextOrder });
      if (insErr) return { error: insErr.message };
      return { ok: true, linked: true, trip, business: biz };
    }
    if (name === "web_search") {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) return { error: "FIRECRAWL_API_KEY non configurée" };
      const limit = Math.min(Math.max(Number(args.limit) || 5, 3), 8);
      const query = String(args.query || "").trim();
      if (!query) return { error: "Requête vide" };
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit, lang: "fr", country: "ma" }),
        });
        if (!r.ok) {
          const txt = await r.text();
          console.error("firecrawl search error", r.status, txt);
          return { error: `Firecrawl ${r.status}`, results: [] };
        }
        const data = await r.json();
        // v2 retourne { success, data: { web: [...], news: [...], images: [...] } } OU { data: [...] }
        const rawList: any[] = Array.isArray(data?.data?.web)
          ? data.data.web
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.web)
          ? data.web
          : [];
        const results = rawList.slice(0, limit).map((it: any) => ({
          title: it.title || it.name || "",
          url: it.url || it.link || "",
          snippet: (it.description || it.snippet || it.markdown || "").toString().slice(0, 400),
        }));
        return {
          query,
          results,
          instruction: "Synthétise une réponse courte basée sur ces résultats et cite TOUJOURS les sources sous forme [titre](url). Si les résultats sont contradictoires ou incertains, dis-le.",
        };
      } catch (e) {
        console.error("web_search exception", e);
        return { error: String(e), results: [] };
      }
    }
    if (name === "show_on_map") {
      const slugs: string[] = Array.isArray(args.business_slugs)
        ? args.business_slugs.filter((s: any) => typeof s === "string" && s.trim()).slice(0, SEARCH_RESULT_LIMIT)
        : [];
      if (!slugs.length) return { error: "Aucun slug fourni", count: 0 };
      const { data, error } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,address,phone,whatsapp,main_category,categories,latitude,longitude,wtuce_status,logo_url,images,hook_fr,google_rating,google_review_count,tripadvisor_rating,tripadvisor_review_count,engagements")
        .in("slug", slugs)
        .eq("is_active", true);
      if (error) return { error: error.message, count: 0 };
      const withCoords = (data || []).filter((b: any) => b.latitude != null && b.longitude != null);
      const missing = slugs.filter((s) => !(data || []).some((b: any) => b.slug === s));
      const noCoords = (data || []).filter((b: any) => b.latitude == null || b.longitude == null).map((b: any) => b.slug);
      return {
        ok: true,
        count: withCoords.length,
        businesses: withCoords,
        missing_slugs: missing,
        no_coords_slugs: noCoords,
        instruction:
          "La carte sera affichée automatiquement côté UI. Poursuis ta réponse normalement sans recoller la liste si elle vient juste d'être donnée. Mentionne uniquement les établissements éventuellement sans coordonnées (no_coords_slugs) ou introuvables (missing_slugs) si pertinent.",
      };
    }
  } catch (e) {
    return { error: String(e) };
  }
  return { error: "unknown tool" };
}

// ============= SSE streaming helpers =============
// Emits Server-Sent Events to the browser: {type:"chunk",delta}, {type:"done",answer,chatId,followups}, {type:"error",message,status?}
type EmitFn = (obj: any) => void;

async function streamGatewayText(
  url: string,
  init: RequestInit,
  emit: EmitFn,
  onFirstToken?: () => void,
  signal?: AbortSignal,
): Promise<{ text: string; ok: boolean; status: number }> {
  const bodyObj = normalizeGatewayBodyForModel(JSON.parse((init.body as string) || "{}"));
  bodyObj.stream = true;
  const patched: RequestInit = { ...init, body: JSON.stringify(bodyObj), signal };
  const resp = await fetch(url, patched);
  if (!resp.ok || !resp.body) return { text: "", ok: false, status: resp.status };
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; let text = ""; let first = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) {
          if (!first) { first = true; onFirstToken?.(); }
          text += delta;
          emit({ type: "chunk", delta });
        }
      } catch { /* partial */ }
    }
  }
  return { text, ok: true, status: 200 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ============= SSE stream setup =============
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controllerRef = c; },
    cancel() { controllerRef = null; },
  });
  const turnId = crypto.randomUUID();
  // Curated follow-ups (Backoffice / IA / Relances Club). When a suggestion is
  // matched and staff curated a list, it overrides the generated follow-ups on
  // EVERY terminal `done` event, whatever route was taken.
  let curatedFollowups: string[] | null = null;
  // Rayon (km) forcé par une relance staff (ai_followups.radius_km)
  let followupRadiusKm: number | null = null;
  // Article pertinent détecté : proposé en carte cliquable à la fin de la
  // réponse, jamais en remplacement des résultats calculés par le moteur.
  let pendingArticleCard: string | null = null;
  const emit: EmitFn = (obj: any) => {
    if (!controllerRef) return;
    // Auto-inject turnId in every terminal `done` event so the client can
    // attach 👍/👎 feedback to the exact row inserted into ai_conversation_turns.
    let payload = obj;
    if (obj && obj.type === "done") {
      const teaser = pendingArticleCard;
      pendingArticleCard = null;
      if (teaser) {
        try { controllerRef.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", delta: teaser })}\n\n`)); } catch {/* client aborted */}
      }
      payload = {
        ...obj,
        ...(teaser ? { answer: `${obj.answer || ""}${teaser}` } : {}),
        turnId,
        ...(curatedFollowups && curatedFollowups.length ? { followups: curatedFollowups } : {}),
      };
    }
    try { controllerRef.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)); } catch {/* client aborted */}
  };

  const closeStream = () => { try { controllerRef?.close(); } catch {} controllerRef = null; };
  const clientAbort = req.signal;

  // ============= Turn-level structured log =============
  const turnStartMs = Date.now();
  const turnLog: any = {
    id: turnId,
    user_id: null,
    affiliate_id: null,
    chat_id: null,
    user_message: null,
    intent_classified: null,
    route_taken: "unknown",
    tools_called: [] as any[],
    latency_ms_total: null,
    latency_ms_first_token: null,
    latency_ms_synth: null,
    tokens_in: null,
    tokens_out: null,
    cost_usd: null,
    city_active: null,
    city_detected: null,
    results_count: null,
    results_shown: null,
    had_error: false,
    error_message: null,
    stream_completed: true,
    language: null,
    message_index: null,
    // Moteur A/B/C (spec §4) — renseignés dans le finally via classifyTurn()
    surface: "club",
    ai_class: null,
    classifier_confidence: null,
    fallback_reason: null,
    model: null,
  };
  let adminForLog: any = null;
  // Classifieur B lancé en parallèle (observation seule) sur les tours fourre-tout.
  let clubClassifierPromise: Promise<ClassifyResult | null> | null = null;

  // Fire-and-forget async worker: streams events to the client.
  const work = (async () => {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);
    adminForLog = admin;

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      emit({ type: "error", message: "Unauthorized", status: 401 });
      return;
    }
    const callerContext = await resolveCallerContext(admin, user.id);
    turnLog.user_id = user.id;
    turnLog.affiliate_id = callerContext.affiliateId || null;

    const { chatId, messages = [], clientContext = {}, language = "fr" }: { chatId?: string; messages: Msg[]; clientContext?: { activeCity?: string; localTime?: string; coords?: { lat: number; lng: number } }; language?: string } = await req.json();
    let lang = (language === "en" || language === "ar") ? language : "fr";

    // ============= #11 Per-message language detection =============
    // Override lang if the last user message is clearly in another supported
    // language. AR = Arabic script (any codepoint). EN = latin + english stop-
    // words + no french accents/diacritics. FR fallback otherwise.
    try {
      const lastForLang = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "").trim();
      if (lastForLang.length >= 3) {
        if (/[\u0600-\u06FF]/.test(lastForLang)) lang = "ar";
        else {
          const lc = lastForLang.toLowerCase();
          const enStop = /\b(the|what|where|when|is|are|do|does|can|could|show|find|near|please|hotel|restaurant|beach|bar|tomorrow|tonight|today|weather)\b/;
          const frStop = /\b(le|la|les|un|une|des|est|sont|quel|quelle|où|quand|montre|trouve|près|hôtel|hotel|restaurant|plage|demain|soir|aujourd|météo|meteo)\b/;
          const hasFrDia = /[àâäéèêëîïôöùûüÿçœæ]/i.test(lastForLang);
          const enHits = (lc.match(new RegExp(enStop, "g")) || []).length;
          const frHits = (lc.match(new RegExp(frStop, "g")) || []).length;
          if (enHits >= 1 && frHits === 0 && !hasFrDia) lang = "en";
          else if (frHits >= 1) lang = "fr";
        }
      }
    } catch { /* keep opening lang */ }
    turnLog.chat_id = chatId || null;
    turnLog.language = lang;
    turnLog.city_active = clientContext?.activeCity ? String(clientContext.activeCity).slice(0, 100) : null;
    turnLog.message_index = Array.isArray(messages) ? messages.length : null;
    turnLog.user_message = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "").slice(0, 500);

    // IDs curatés matchés (autorité de classe A partagée avec /embed/ask)
    let matchedSuggestionId: string | null = null;
    let matchedFollowupId: string | null = null;

    // ============= Staff-curated suggestion targeting (Backoffice / IA) =============
    // If the last user message is EXACTLY a ai_suggestions label, apply the
    // staff targeting configured in the back-office:
    //   • mode                → forces a deterministic route (events / weather / map / structure_front)
    //   • subcategory_ids     → injects the subcategory names into the search query
    //   • badge_ids           → injects the badge names into the search query
    //   • destination_ids     → injects the destination name (geo scope)
    //   • disabled_followup_ids → filters the curated follow-up list
    // The rewritten user message feeds the SAME engine as /search — no fork.
    try {
      const normLbl = (s: unknown) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const lastIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) if ((messages[i] as any)?.role === "user") return i; return -1; })();
      const lastUserLabel = lastIdx >= 0 ? String((messages[lastIdx] as any).content || "") : "";
      const key = normLbl(lastUserLabel);
      if (key) {
        const { data: sugRows } = await admin
          .from("ai_suggestions")
          .select("id,label_fr,label_en,label_ar,mode,destination_ids,subcategory_ids,badge_ids,disabled_followup_ids,city")
          .eq("surface", "club")
          .eq("is_active", true);
        let sug: any = (sugRows || []).find((r: any) =>
          normLbl(r.label_fr) === key || normLbl(r.label_en) === key || normLbl(r.label_ar) === key
        );
        // Texte libre : recouvrement de tokens sur les libellés staff (matcher partagé)
        // → taper la phrase équivaut à cliquer la suggestion.
        if (!sug) {
          const m = await matchCuratedByText(admin, { text: lastUserLabel, surface: "club" }).catch(() => null);
          if (m) {
            sug = (sugRows || []).find((r: any) => r.id === m.id) || null;
            if (sug) console.log("club-ai-chat → curated_text_match", JSON.stringify(m));
          }
        }
        if (sug) {
          matchedSuggestionId = sug.id;
          const subIds: string[] = Array.isArray(sug.subcategory_ids) ? sug.subcategory_ids : [];
          const badgeIds: string[] = Array.isArray(sug.badge_ids) ? sug.badge_ids : [];
          const destIds: string[] = Array.isArray(sug.destination_ids) ? sug.destination_ids : [];
          const [{ data: subs }, { data: bdgs }, { data: dests }] = await Promise.all([
            subIds.length ? admin.from("subcategories").select("name_fr").in("id", subIds) : Promise.resolve({ data: [] as any[] }),
            badgeIds.length ? admin.from("badges").select("name_fr").in("id", badgeIds) : Promise.resolve({ data: [] as any[] }),
            destIds.length ? admin.from("destinations").select("name_fr").in("id", destIds) : Promise.resolve({ data: [] as any[] }),
          ]);
          const terms: string[] = [
            ...((subs as any[]) || []).map((s) => s.name_fr).filter(Boolean),
            ...((bdgs as any[]) || []).map((b) => b.name_fr).filter(Boolean),
            ...((dests as any[]) || []).map((d) => d.name_fr).filter(Boolean),
          ];
          const cityHint = sug.city || clientContext?.activeCity || "";
          const mode = String(sug.mode || "").trim();
          const modeHint =
            mode === "events" ? (lang === "en" ? "events agenda" : "événements agenda")
            : mode === "weather" ? (lang === "en" ? "weather" : "météo")
            : mode === "map" ? (lang === "en" ? "show on a map" : "montre-les sur une carte")
            : "";
          if (terms.length || modeHint) {
            const rewritten = [lastUserLabel, modeHint, ...terms, cityHint].filter(Boolean).join(" ").trim();
            (messages[lastIdx] as any) = { ...(messages[lastIdx] as any), content: rewritten };
            turnLog.intent_classified = `suggestion:${mode || (terms.length ? "structure_front" : "auto")}`;
            console.log("club-ai-chat → suggestion targeting", JSON.stringify({ id: sug.id, mode, terms, cityHint }));
          }

          // Curated follow-ups for this suggestion
          try {
            const disabled = new Set<string>(Array.isArray(sug.disabled_followup_ids) ? sug.disabled_followup_ids : []);
            const { data: fups } = await admin
              .from("ai_followups")
              .select("id,label_fr,label_en,label_ar,is_active,sort_order")
              .eq("surface", "club")
              .eq("is_active", true)
              .order("sort_order", { ascending: true });
            const list = ((fups as any[]) || [])
              .filter((f) => !disabled.has(f.id))
              .map((f) => String((lang === "en" ? f.label_en : lang === "ar" ? f.label_ar : f.label_fr) || f.label_fr || "").trim())
              .filter(Boolean)
              .slice(0, 4);
            if (list.length) curatedFollowups = list;
          } catch (e) { console.error("curated followups error", e); }
        }
      }
    } catch (e) { console.error("suggestion targeting error", e); }

    // ============= Staff-curated FOLLOW-UP targeting (Backoffice / IA → Relances Club) =============
    // Même taxonomie que les relances embed : si le dernier message utilisateur est
    // EXACTEMENT un libellé de ai_followups, on applique `mode` (route forcée)
    // et `radius_km` (borne de proximité). Ancre proximité = géoloc utilisateur,
    // sinon ville détectée. On réécrit le message pour alimenter le MÊME routeur.
    try {
      const normLbl2 = (s: unknown) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const lastIdx2 = (() => { for (let i = messages.length - 1; i >= 0; i--) if ((messages[i] as any)?.role === "user") return i; return -1; })();
      const lastLabel2 = lastIdx2 >= 0 ? String((messages[lastIdx2] as any).content || "") : "";
      const key2 = normLbl2(lastLabel2);
      if (key2) {
        const { data: fupRows } = await admin
          .from("ai_followups")
          .select("id,label_fr,label_en,label_ar,mode,radius_km")
          .eq("surface", "club")
          .eq("is_active", true);
        const fup: any = (fupRows || []).find((r: any) =>
          normLbl2(r.label_fr) === key2 || normLbl2(r.label_en) === key2 || normLbl2(r.label_ar) === key2
        );
        if (fup) matchedFollowupId = fup.id;
        if (fup && (fup.mode || fup.radius_km != null)) {
          const m = String(fup.mode || "").trim();
          const modeHint2 =
            m === "map_replay" ? (lang === "en" ? "show them on a map" : "montre-les sur une carte")
            : m === "booking" ? (lang === "en" ? "can we book online" : "peut-on réserver en ligne")
            : m === "opening_hours" ? (lang === "en" ? "opening hours" : "horaires d'ouverture")
            : m === "nearby" ? (lang === "en" ? "nearby" : "à proximité")
            : m === "poi_nearby" ? (lang === "en" ? "nearby points of interest" : "points d'intérêt à proximité")
            : m === "weather" ? (lang === "en" ? "weather" : "météo")
            : m === "events" ? (lang === "en" ? "events agenda" : "événements agenda")
            : "";
          const rKm = Number(fup.radius_km);
          const radiusHint = Number.isFinite(rKm) && rKm > 0
            ? (lang === "en" ? `within ${rKm} km` : `à moins de ${rKm} km`)
            : "";
          if (Number.isFinite(rKm) && rKm > 0) followupRadiusKm = rKm;
          if (modeHint2 || radiusHint) {
            const rewritten2 = [lastLabel2, modeHint2, radiusHint].filter(Boolean).join(" ").trim();
            (messages[lastIdx2] as any) = { ...(messages[lastIdx2] as any), content: rewritten2 };
            turnLog.intent_classified = `followup:${m || "radius"}`;
            console.log("club-ai-chat → followup targeting", JSON.stringify({ id: fup.id, mode: m, radius_km: fup.radius_km }));
          }
        }
      }
    } catch (e) { console.error("followup targeting error", e); }


    const languageInstruction = lang === "en"
      ? "IMPORTANT: Always reply in English, regardless of the language of tool results or the system prompt language. Keep the same warm, concise tone."
      : lang === "ar"
      ? "مهم: أجب دائماً بالعربية، بغض النظر عن لغة نتائج الأدوات أو لغة التعليمات. حافظ على نبرة دافئة وموجزة."
      : "IMPORTANT : réponds toujours en français, sauf si l'utilisateur écrit dans une autre langue.";

    // ============= #10 Out-of-scope guard (deterministic, no LLM) =============
    // Politics, medical, legal/tax, finance/crypto, adult, weapons, self-harm →
    // cadré : on redirige vers Marrakech/Essaouira sans consommer de tokens.
    try {
      const lastUserForGuard = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "");
      const g = lastUserForGuard.toLowerCase();
      const OUT_OF_SCOPE = /\b(politique|élection|election|guerre|war|vaccin|covid|médecin|medecin|doctor|prescription|maladie|disease|bourse|crypto|bitcoin|ethereum|investir|invest(ment)?|placement|impôt|impot|tax(e|es)?|fiscal|loi|law|juridique|legal|avocat|lawyer|divorce|sexe|porn|escort|drogue|drug|weapon|arme|suicide|self[- ]?harm)\b/i;
      if (OUT_OF_SCOPE.test(g)) {
        const answer = lang === "en"
          ? "I focus on your Marrakech / Essaouira trip — hotels, riads, restaurants, activities, agenda. That topic is outside my scope. Tell me what you'd like to see, eat or experience in Marrakech or Essaouira and I'll help right away."
          : lang === "ar"
          ? "أنا متخصص في رحلتك إلى مراكش والصويرة (فنادق، رياض، مطاعم، أنشطة، أجندة). هذا الموضوع خارج نطاقي. أخبرني ماذا تود مشاهدته أو تجربته في مراكش أو الصويرة."
          : "Je suis concentré sur ton séjour à Marrakech / Essaouira — hôtels, riads, restaurants, activités, agenda. Ce sujet sort de mon périmètre. Dis-moi plutôt ce que tu voudrais voir, manger ou vivre à Marrakech ou Essaouira, je te réponds tout de suite.";
        const newMessages = [...messages, { role: "assistant", content: answer }];
        let resultChatId: string | null = null;
        if (chatId) {
          const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
          if (existing?.id) {
            await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
            resultChatId = chatId;
          }
        }
        if (!resultChatId) {
          const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserForGuard.slice(0, 200) || "Hors-scope", messages: newMessages }).select("id").single();
          resultChatId = inserted?.id ?? null;
        }
        turnLog.route_taken = "out_of_scope_guard";
        turnLog.results_shown = 0;
        emit({ type: "chunk", delta: answer });
        emit({ type: "done", answer, chatId: resultChatId, followups: [] });
        return;
      }
    } catch (e) { console.error("out_of_scope guard error", e); }


    // ----- Fixed-response shortcut -----
    // If the last user message matches (case-insensitive, trimmed) a suggestion
    // label in ai_suggestions AND a fixed_response_<lang> is set, return it
    // verbatim — no AI call, no tokens, deterministic content maintained by staff.
    try {
      const lastUserMsgRaw = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const norm = (s: string) => String(s || "").trim().toLowerCase();
      const key = norm(lastUserMsgRaw);
      if (key) {
        const col = lang === "en" ? "fixed_response_en" : lang === "ar" ? "fixed_response_ar" : "fixed_response_fr";
        const { data: fixedRows } = await admin
          .from("ai_suggestions")
          .select(`id,label_fr,label_en,label_ar,blog_post_ids,${col}`)
          .eq("surface", "club")
          .eq("is_active", true);
        const match = (fixedRows || []).find((r: any) => {
          // Seul un texte figé rédigé par le staff court-circuite ici. Une suggestion
          // qui ne porte QUE des articles liés passe par l'autorité curatée
          // (rendu éditorial complet, corpus clos) juste en dessous.
          if (!String(r[col] || "").trim()) return false;
          return norm(r.label_fr) === key || norm(r.label_en) === key || norm(r.label_ar) === key;
        });
        const baseAnswer = match ? String((match as any)[col] || "").trim() : "";
        const enrich = match ? await fetchBlogEnrichment(admin, (match as any).blog_post_ids, lang) : null;
        if (baseAnswer || enrich) {
          const defaultIntro = lang === "en"
            ? "Here are resources that can help you:"
            : lang === "ar"
            ? "إليك بعض الموارد التي قد تساعدك:"
            : "Voici quelques ressources qui peuvent t'aider :";
          const head = baseAnswer || defaultIntro;
          const fixedAnswer = enrich
            ? `${head}${enrich.intro}${enrich.cardsMarker}${enrich.ctxMarker}`
            : head;
          const newMessages = [...messages, { role: "assistant", content: fixedAnswer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin
              .from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const title = lastUserMsgRaw.slice(0, 200) || "Nouvelle conversation";
            const { data: inserted } = await admin
              .from("ai_chats").insert({ user_id: user.id, kind: "club", title, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "fixed_response";
          turnLog.results_shown = enrich ? enrich.cards.length : 0;
          emit({ type: "chunk", delta: fixedAnswer });
          emit({ type: "done", answer: fixedAnswer, chatId: resultChatId, followups: [] });
          return;
        }
      }
    } catch (e) {
      console.error("fixed-response lookup error", e);
    }

    // ============= AUTORITÉ CURATÉE (classe A, zéro token) =============
    // Même résolveur que /embed/ask (`_shared/ai-engine/routes/curated.ts`) :
    // une suggestion / relance staff qui pointe vers un article de blog, des
    // établissements épinglés ou des commodités/badges/sous-catégories FAIT LOI.
    // Ni le classifieur ni le LLM ne peuvent la remplacer ou la « compléter ».
    if (matchedSuggestionId || matchedFollowupId) {
      try {
        const curated = await loadCuratedTargets(admin, {
          suggestionId: matchedSuggestionId,
          followupId: matchedFollowupId,
        });
        const pseudoHost: any = { id: null, city: cleanActiveCityTop(clientContext?.activeCity) || null, name: null };

        const deliverCurated = async (built: any) => {
          let answer = built.text;
          if (built.mapPayload?.businesses?.length) {
            answer += `\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`;
          }
          if (built.knownBusinesses?.length) {
            answer += `\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`;
          }
          const lastUserMsg = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "");
          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin
              .from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats")
                .update({ messages: newMessages, updated_at: new Date().toISOString() })
                .eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats")
              .insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || "Nouvelle conversation", messages: newMessages })
              .select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = built.route;
          turnLog.ai_class = "A";
          turnLog.results_count = built.total ?? built.shown ?? null;
          turnLog.results_shown = built.shown ?? null;
          emit({ type: "chunk", delta: answer });
          emit({ type: "done", answer, chatId: resultChatId, followups: [] });
        };

        // 1. Article de blog lié → simple proposition de lecture. Le moteur
        // continue son propre calcul de résultats (épinglés / filtre / classe B).
        if (curated.blogPostIds.length && !pendingArticleCard) {
          const posts = await fetchBlogPostsCached(admin).catch(() => []);
          const post = curated.blogPostIds.map((id) => posts.find((p: any) => p.id === id)).filter(Boolean)[0];
          if (post) pendingArticleCard = buildArticleTeaser(post as any, lang as any) || null;
        }


        // 1bis. Feed vidéo curaté (mode = 'video_feed') : vidéos, pas de fiches.
        if (String(curated.mode || "").trim() === "video_feed") {
          const builtV = await buildVideoFeedAnswer(admin, {
            badgeIds: curated.badgeIds,
            pinnedBusinessIds: curated.pinnedBusinessIds,
            label: curated.label,
            lang: lang as any,
            city: curatedScopeCity,
          }).catch((e) => { console.error("club-ai-chat → video_feed_failed", String(e)); return null; });
          if (builtV) {
            await deliverCurated({
              text: builtV.text + videoFeedMarker(builtV.payload),
              route: builtV.route,
              shown: builtV.count,
              total: builtV.count,
              mapPayload: null,
              knownBusinesses: [],
            });
            return;
          }
        }

        // 2. Établissements épinglés → corpus clos UNIQUEMENT sans filtre taxonomique.
        const curatedHasTaxo = (curated.commodities.length || curated.badgeIds.length || curated.subcategoryNames.length || curated.serviceNames.length) > 0;
        if (curated.pinnedBusinessIds.length && !curatedHasTaxo) {
          const built = await buildPinnedAnswer(admin, curated.pinnedBusinessIds, pseudoHost, lang as any, curated.label)
            .catch((e) => { console.error("club-ai-chat → pinned_route_failed", String(e)); return null; });
          if (built) { await deliverCurated(built); return; }
        }

        // 3. Filtre déterministe (commodités / badges / sous-catégories).
        // Une suggestion qui force déjà une route (`mode` = events / weather / map…)
        // garde SA route : on ne la détourne pas en liste filtrée.
        const hasForcedMode = !!String(curated.mode || "").trim();
        if (!hasForcedMode && curatedHasTaxo) {
          const built = await buildFilteredAnswer(admin, pseudoHost, lang as any, {
            badgeIds: curated.badgeIds,
            subcategoryNames: curated.subcategoryNames,
            serviceNames: curated.serviceNames,
            commodities: curated.commodities,
            label: curated.label,
            pinnedIds: curated.pinnedBusinessIds,
            scopeCity: curatedScopeCity,
            maxResults: 6,
            supabaseUrl,
            serviceKey,
          }).catch((e) => { console.error("club-ai-chat → curated_filter_failed", String(e)); return null; });
          if (built) { await deliverCurated(built); return; }
        }

      } catch (e) {
        console.error("club-ai-chat → curated authority error", e);
      }
    }


    // ============= #12 Semantic match on staff-validated suggestions =============
    // Embed the user question (openai/text-embedding-3-small, 1536-dim) and try
    // to match a ai_suggestions row that has a fixed_response for the
    // active language. Skips entirely if the question is short (< 3 words),
    // has already been matched exactly above, or if no active suggestion has
    // a fixed_response in this language.
    try {
      const lastUserForSem = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "").trim();
      const wc = lastUserForSem.split(/\s+/).filter(Boolean).length;
      if (lastUserForSem.length >= 8 && wc >= 3) {
        const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openai/text-embedding-3-small", input: lastUserForSem }),
        });
        if (embResp.ok) {
          const embJson = await embResp.json();
          const vec = embJson?.data?.[0]?.embedding as number[] | undefined;
          if (Array.isArray(vec) && vec.length === 1536) {
            const { data: matches } = await admin.rpc("match_club_suggestions", {
              query_embedding: vec as any,
              match_count: 1,
              min_similarity: 0.82,
            });
            const top = Array.isArray(matches) && matches.length ? matches[0] as any : null;
            const col = lang === "en" ? "fixed_response_en" : lang === "ar" ? "fixed_response_ar" : "fixed_response_fr";
            const baseAnswer = top ? String(top[col] || "").trim() : "";
            if (baseAnswer) {
              const enrich = top ? await fetchBlogEnrichment(admin, top.blog_post_ids, lang) : null;
              const answer = enrich
                ? `${baseAnswer}${enrich.intro}${enrich.cardsMarker}${enrich.ctxMarker}`
                : baseAnswer;
              const newMessages = [...messages, { role: "assistant", content: answer }];
              let resultChatId: string | null = null;
              if (chatId) {
                const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
                if (existing?.id) {
                  await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
                  resultChatId = chatId;
                }
              }
              if (!resultChatId) {
                const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserForSem.slice(0, 200) || "Suggestion", messages: newMessages }).select("id").single();
                resultChatId = inserted?.id ?? null;
              }
              turnLog.route_taken = "fixed_response_semantic";
              turnLog.results_shown = enrich ? enrich.cards.length : 0;
              turnLog.intent_classified = `semantic:${Number(top.similarity || 0).toFixed(3)}`;
              emit({ type: "chunk", delta: answer });
              emit({ type: "done", answer, chatId: resultChatId, followups: [] });
              return;
            }
          }
        }
      }
    } catch (e) {
      console.error("semantic-suggestion match error", e);
    }


    // Load Club member profile (lightweight context)
    const { data: member } = await admin
      .from("club_members")
      .select("first_name,nickname,city,country")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileLine = member
      ? `Profil utilisateur: ${member.first_name || member.nickname || "Membre"}${member.city ? ` · ${member.city}` : ""}${member.country ? ` (${member.country})` : ""}.`
      : "";

    // ----- Enriched temporal / seasonal context -----
    // Morocco is UTC+1 year-round. Derive weekday, part of day, weekend flag, season.
    const enrichContext = () => {
      const now = new Date();
      // Force Casablanca timezone (Africa/Casablanca)
      const fmt = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Casablanca",
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = fmt.formatToParts(now);
      const get = (t: string) => parts.find(p => p.type === t)?.value || "";
      const weekday = get("weekday");
      const day = get("day"), month = get("month"), year = get("year");
      const hourNum = parseInt(get("hour") || "12", 10);
      const dayJs = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
      const dow = dayJs.getDay(); // 0=Sun
      const isWeekend = dow === 5 || dow === 6 || dow === 0; // ven soir / sam / dim = weekend au Maroc
      const partOfDay =
        hourNum < 6 ? "nuit" :
        hourNum < 12 ? "matinée" :
        hourNum < 14 ? "midi (heure de déjeuner)" :
        hourNum < 18 ? "après-midi" :
        hourNum < 22 ? "soirée (heure de dîner)" :
        "nuit";
      const m = dayJs.getMonth();
      const season =
        m >= 2 && m <= 4 ? "printemps (temps doux, très agréable au Maroc)" :
        m >= 5 && m <= 8 ? "été (chaud, surtout à Marrakech ; côte plus tempérée à Essaouira)" :
        m >= 9 && m <= 10 ? "automne (temps doux)" :
        "hiver (frais le soir, journées douces)";
      return { weekday, day, month, year, hourNum, isWeekend, partOfDay, season };
    };
    const t = enrichContext();
    const contextLines = [
      clientContext.activeCity ? `- Ville active: **${clientContext.activeCity}**` : "",
      `- Date locale: ${t.weekday} ${t.day} ${t.month} ${t.year} · ${t.partOfDay} (${t.hourNum}h) · ${t.isWeekend ? "WEEKEND" : "en semaine"}`,
      `- Saison: ${t.season}`,
      clientContext.coords ? `- Position GPS: ${clientContext.coords.lat.toFixed(3)},${clientContext.coords.lng.toFixed(3)}` : "",
    ].filter(Boolean).join("\n");

    // Compute taste profile once per call (cheap: 5 small queries)
    let tasteLine = "";
    try {
      const taste = await computeTasteProfile(user.id, admin);
      tasteLine = tasteSummaryLine(taste);
    } catch (e) {
      console.error("taste profile error", e);
    }

    // ----- Proactive RAG: pre-fetch candidate businesses from last user message -----
    // The model can still call search_businesses to refine, but starting with real
    // candidates in context cuts hallucination and unnecessary tool round-trips.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    // Deterministic shortcut: when the member asks to put the previous result set
    // on a map ("montre-moi les 32 résultats sur une carte"), do NOT call the AI
    // again and do NOT recompute a broader search. Reuse the hidden snapshot stored
    // with the previous assistant answer.
    const previousSearchSnapshot = extractPreviousSearchSnapshot(messages);
    const requestedMapCount = extractRequestedResultCount(lastUserMsg);

    if (isAgendaIntent(lastUserMsg)) {
      try {
        const agendaCity = extractMoroccoCity(lastUserMsg) || extractMoroccoCity(clientContext.activeCity) || undefined;
        const eventSearch = await runTool("search_events", { city: agendaCity, limit: 8 }, { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang }) as any;
        const events: any[] = Array.isArray(eventSearch?.results) ? eventSearch.results : [];
        const totalCount = Number(eventSearch?.total_count) || events.length;

        let answer = "";
        if (events.length) {
          const shown = Math.min(events.length, 5);
          const title = agendaCity ? `Agenda 1WM · ${agendaCity}` : "Agenda 1WM";
          const lines = events.slice(0, shown).map((event: any) => {
            const place = [event.neighborhood, event.city].filter(Boolean).join(", ");
            const details = [formatEventDate(event), place].filter(Boolean).join(" · ");
            const hook = event.hook ? ` — ${String(event.hook).replace(/\s+/g, " ").slice(0, 150)}` : "";
            return `- **${event.name}**${details ? ` · ${details}` : ""}${hook}`;
          }).join("\n");
          answer = `**Agenda 1WM**\n\n${lines}\n\n**${shown} résultats affichés sur ${totalCount} trouvés dans la base 1WM**`;
          if (totalCount > shown) answer += `\n\nJe peux aussi ouvrir le slidepanel pour parcourir les ${totalCount} événements.`;

          const snapshot = {
            title,
            city: agendaCity || null,
            events: events.map((e: any) => ({
              id: e.id,
              name: e.name,
              hook: e.hook || null,
              start_date: e.start_date || null,
              end_date: e.end_date || null,
              days_of_week: e.days_of_week || null,
              start_time: e.start_time || null,
              end_time: e.end_time || null,
              city: e.city || null,
              neighborhood: e.neighborhood || null,
              url: e.url || null,
              default_business_id: e.default_business_id || null,
              image: (Array.isArray(e.images) && e.images[0]) || e.logo_url || null,
              video: (Array.isArray(e.videos) && e.videos[0]) || null,
              sort_order: e.sort_order ?? null,
            })),
          };
          const safe = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
          answer += `\n\n<!--EVENTS_SNAPSHOT:${safe}-->`;
        } else {
          answer = `**Agenda 1WM**\n\nAucun événement trouvé dans la base 1WM sur les 90 prochains jours${agendaCity ? ` à ${agendaCity}` : ""}.`;
        }

        const newMessages = [...messages, { role: "assistant", content: answer }];
        let resultChatId: string | null = null;
        if (chatId) {
          const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
          if (existing?.id) {
            await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
            resultChatId = chatId;
          }
        }
        if (!resultChatId) {
          const title = lastUserMsg.slice(0, 200) || "Nouvelle conversation";
          const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title, messages: newMessages }).select("id").single();
          resultChatId = inserted?.id ?? null;
        }
        turnLog.route_taken = "agenda_shortcut";
        emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
        emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("agenda_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
        return;
      } catch (e) {
        console.error("deterministic agenda route failed", e);
      }
    }

    const refersToPreviousResults = /\b(r[ée]sultats?|ceux\s*-?ci|celles\s*-?ci|cette\s+liste|la\s+m[êe]me\s+liste|same\s+results?|these|them|les|ces|eux|elles|ils)\b/i.test(lastUserMsg || "");
    // Detect affirmative reply ("oui", "yes", "ok"...) to a previous assistant message
    // that proposed to show results on a map ("Veux-tu que je te montre ... sur une carte ?").
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    const assistantProposedMap = /\?[^?]*$/.test(lastAssistantMsg) && /(carte|map|خريطة)/i.test(lastAssistantMsg.slice(-400));
    const userAffirmative = /^(oui|ouais|yep|yes|yeah|ok(?:ay)?|d['’]?accord|volontiers|avec\s+plaisir|allez|go|carrement|carr[ée]ment|bien\s+s[ûu]r|sure|please|s['’]?il\s+te\s+pla[iî]t|stp|svp|نعم|أجل)\b[\s!.\?]*$/i.test((lastUserMsg || "").trim());
    const affirmativeMapTrigger = assistantProposedMap && userAffirmative && !!previousSearchSnapshot;
    // If the user explicitly asks for a map AND we have a prior snapshot, always reuse it
    // (don't let the LLM re-run a search with fabricated arguments).
    if ((MAP_TRIGGER_RE.test(lastUserMsg || "") && previousSearchSnapshot && previousSearchSnapshot.slugs.length >= 2) || affirmativeMapTrigger) {

      const desiredCount = Math.min(requestedMapCount || previousSearchSnapshot.totalCount || previousSearchSnapshot.slugs.length, SEARCH_RESULT_LIMIT);
      const slugs = previousSearchSnapshot.slugs.slice(0, desiredCount);
      if (slugs.length >= 2) {
        const title = previousSearchSnapshot.title || `${slugs.length} résultats sur la carte`;
        const forced = await runTool("show_on_map", { business_slugs: slugs, title }, { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang });
        if ((forced as any)?.ok && Array.isArray((forced as any).businesses) && (forced as any).businesses.length) {
          const count = (forced as any).businesses.length;
          let answer = `Voici les ${count} résultats précédents affichés sur la carte.`;
          const noCoords = Array.isArray((forced as any).no_coords_slugs) ? (forced as any).no_coords_slugs.length : 0;
          if (noCoords) answer += ` ${noCoords} résultat(s) sans coordonnées GPS n'ont pas pu être affichés.`;
          const safeMap = JSON.stringify({ title, businesses: (forced as any).businesses }).replace(/-->/g, "--&gt;");
          const safeSnapshot = JSON.stringify(previousSearchSnapshot).replace(/-->/g, "--&gt;");
          answer += `\n\n<!--SHOW_ON_MAP:${safeMap}-->\n<!--SEARCH_RESULTS:${safeSnapshot}-->`;

          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const titleRow = lastUserMsg.slice(0, 200) || "Nouvelle conversation";
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: titleRow, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "affirmative_map";
          turnLog.results_shown = (forced as any).businesses.length;
          emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("affirmative_map", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
      }
    }

    // Backward-compatible fallback for conversations created before SEARCH_RESULTS
    // snapshots existed: reuse the previous user query deterministically instead
    // of letting the model search for "montre-moi les 32 résultats".
    const previousUserQuery = extractPreviousUserQuery(messages);
    if (MAP_TRIGGER_RE.test(lastUserMsg || "") && !previousSearchSnapshot && previousUserQuery && (refersToPreviousResults || requestedMapCount != null)) {
      const desiredCount = Math.min(requestedMapCount || SEARCH_RESULT_LIMIT, SEARCH_RESULT_LIMIT);
      const search = await runTool("search_businesses", { query: previousUserQuery, limit: desiredCount }, { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang, forceQuery: previousUserQuery });
      const slugs = (Array.isArray((search as any).map_slugs) && (search as any).map_slugs.length
        ? (search as any).map_slugs
        : Array.isArray((search as any).results) ? (search as any).results.map((r: any) => r.slug) : []
      ).filter(Boolean).slice(0, desiredCount);
      if (slugs.length >= 2) {
        const title = previousUserQuery.slice(0, 120);
        const forced = await runTool("show_on_map", { business_slugs: slugs, title }, { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang });
        if ((forced as any)?.ok && Array.isArray((forced as any).businesses) && (forced as any).businesses.length) {
          const snapshot: PreviousSearchSnapshot = {
            title,
            slugs,
            returnedCount: Number((search as any).returned_count) || Math.min(slugs.length, desiredCount),
            totalCount: Number((search as any).total_count) || slugs.length,
          };
          const count = (forced as any).businesses.length;
          let answer = `Voici les ${count} résultats précédents affichés sur la carte.`;
          const noCoords = Array.isArray((forced as any).no_coords_slugs) ? (forced as any).no_coords_slugs.length : 0;
          if (noCoords) answer += ` ${noCoords} résultat(s) sans coordonnées GPS n'ont pas pu être affichés.`;
          const safeMap = JSON.stringify({ title, businesses: (forced as any).businesses }).replace(/-->/g, "--&gt;");
          const safeSnapshot = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
          answer += `\n\n<!--SHOW_ON_MAP:${safeMap}-->\n<!--SEARCH_RESULTS:${safeSnapshot}-->`;

          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const titleRow = lastUserMsg.slice(0, 200) || "Nouvelle conversation";
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: titleRow, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "map_shortcut_fallback";
          turnLog.results_shown = (forced as any).businesses.length;
          emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("map_shortcut_fallback", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
      }
    }

    // ============= ROUTE DÉTERMINISTE : BOOKMARKS =============
    // "mes favoris" / "mes bookmarks" → query directe user_bookmarks, zéro LLM.
    if (isBookmarksIntent(lastUserMsg)) {
      try {
        const { data: bks } = await admin
          .from("bookmarks")
          .select("business_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(SEARCH_RESULT_LIMIT);
        const ids = (bks || []).map((b: any) => b.business_id).filter(Boolean);
        if (ids.length === 0) {
          const empty = lang === "en"
            ? "You haven't bookmarked any place yet. Tap the bookmark icon on any business to save it here."
            : lang === "ar"
            ? "لم تقم بحفظ أي مكان بعد. اضغط على أيقونة الحفظ في أي مؤسسة لإضافتها هنا."
            : "Tu n'as encore aucun favori. Clique sur l'icône marque-page d'un établissement pour l'ajouter ici.";
          const newMessages = [...messages, { role: "assistant", content: empty }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || "Favoris", messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "bookmarks_shortcut";
          turnLog.results_shown = 0;
          emit({ type: "chunk", delta: empty });
          emit({ type: "done", answer: empty, chatId: resultChatId, followups: buildDeterministicFollowups("bookmarks_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }

        const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
        const { data: bizRows } = await admin
          .from("businesses")
          .select(`id, slug, name, main_category, neighborhood, city, ${hookField}`)
          .in("id", ids);
        // Preserve bookmark order (most recent first)
        const bizById = new Map((bizRows || []).map((b: any) => [b.id, b]));
        const ordered = ids.map((id: string) => bizById.get(id)).filter(Boolean);

        const shown = ordered.slice(0, 5);
        const totalCount = ordered.length;
        const header = lang === "en" ? "Your bookmarks" : lang === "ar" ? "قائمة المفضلة" : "Tes favoris";
        const lines = shown.map((r: any) =>
          `- **${r.name}**${r.main_category ? ` — ${r.main_category}` : ""}${r.neighborhood ? `, ${r.neighborhood}` : ""}${r.city ? `, ${r.city}` : ""}${r[hookField] ? ` · ${String(r[hookField]).slice(0, 140)}` : ""}`
        ).join("\n");
        const shownLine = lang === "en"
          ? `**${shown.length} of ${totalCount} bookmarks shown**`
          : lang === "ar"
          ? `**${shown.length} من ${totalCount} من المفضلة معروضة**`
          : `**${shown.length} favoris affichés sur ${totalCount}**`;
        const mapProposal = totalCount >= 2
          ? (lang === "en" ? "\n\nWant me to show them on a map?" : lang === "ar" ? "\n\nهل تريد أن أعرضها على الخريطة؟" : "\n\nJe peux les afficher sur une carte si tu veux.")
          : "";
        let answer = `**${header}**\n\n${lines}\n\n${shownLine}${mapProposal}`;

        const snapshot: PreviousSearchSnapshot = {
          title: header,
          slugs: ordered.map((r: any) => r.slug).filter(Boolean),
          returnedCount: ordered.length,
          totalCount,
        };
        const safeSnap = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
        answer += `\n\n<!--SEARCH_RESULTS:${safeSnap}-->`;

        const newMessages = [...messages, { role: "assistant", content: answer }];
        let resultChatId: string | null = null;
        if (chatId) {
          const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
          if (existing?.id) {
            await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
            resultChatId = chatId;
          }
        }
        if (!resultChatId) {
          const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || "Favoris", messages: newMessages }).select("id").single();
          resultChatId = inserted?.id ?? null;
        }
        turnLog.route_taken = "bookmarks_shortcut";
        turnLog.results_count = totalCount;
        turnLog.results_shown = shown.length;
        emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
        emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("bookmarks_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
        return;
      } catch (e) {
        console.error("bookmarks route failed, falling back:", e);
      }
    }
    // ============= FIN ROUTE BOOKMARKS =============

    // ============= ROUTE ANAPHORE (ordinal + descripteur → slug snapshot) =============
    // "le premier", "le 3ème", "celui-là", "le rooftop dont tu parlais",
    // "celui d'hier soir" → résout sur previousSearchSnapshot.slugs[N] et
    // enchaîne sur la même logique que details_shortcut sans LLM.
    if (previousSearchSnapshot && previousSearchSnapshot.slugs.length >= 1) {
      try {
        const raw = String(lastUserMsg || "").trim();
        const nRaw = normalizeLoose(raw);
        // 1) Ordinal explicite (1..10) + variantes FR/EN/AR.
        const ordinalWords: Record<string, number> = {
          "premier": 1, "1er": 1, "first": 1, "الاول": 1, "الأول": 1,
          "deuxieme": 2, "deuxième": 2, "second": 2, "seconde": 2, "2eme": 2, "2ème": 2, "second one": 2,
          "troisieme": 3, "troisième": 3, "3eme": 3, "3ème": 3, "third": 3,
          "quatrieme": 4, "quatrième": 4, "4eme": 4, "4ème": 4, "fourth": 4,
          "cinquieme": 5, "cinquième": 5, "5eme": 5, "5ème": 5, "fifth": 5,
          "sixieme": 6, "sixième": 6, "6eme": 6, "6ème": 6, "sixth": 6,
          "dernier": -1, "derniere": -1, "dernière": -1, "last": -1,
        };
        let ordinal: number | null = null;
        for (const [w, n] of Object.entries(ordinalWords)) {
          const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i");
          if (re.test(nRaw)) { ordinal = n; break; }
        }
        // 2) Anaphore descripteur : "le rooftop", "celui-là", "cette adresse"
        const anaphoraPronoun = /\b(celui|celle|ceux|celles|cet(?:te)?|ce\s+(?:lieu|resto|restaurant|bar|hotel|riad|spot|endroit)|the\s+(?:one|place|spot))\b/i.test(raw);
        const descriptorMatch = raw.match(/\b(?:le|la|les|the|ce|cet|cette|celui|celle)\s+([a-zà-ÿ][a-zà-ÿ' \-]{2,25})\b/i);
        const wc = raw.split(/\s+/).length;
        // Requêtes courtes qui n'ont ni ordinal ni pronom anaphorique : skip.
        if (ordinal == null && !anaphoraPronoun && !descriptorMatch) throw "no_anaphora";
        // Requêtes longues (recherche complète) : skip anaphore, laisser router.
        if (wc > 8 && ordinal == null) throw "too_long";

        const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
        const descField = lang === "en" ? "description_en" : lang === "ar" ? "description_ar" : "description_fr";
        const { data: bizRows } = await admin
          .from("businesses")
          .select(`id, slug, name, main_category, neighborhood, city, ${hookField}, ${descField}`)
          .in("slug", previousSearchSnapshot.slugs);
        const bySlug = new Map((bizRows || []).map((b: any) => [b.slug, b]));
        const ordered = previousSearchSnapshot.slugs.map((s: string) => bySlug.get(s)).filter(Boolean) as any[];
        if (ordered.length === 0) throw "empty_snapshot";

        let target: any = null;
        if (ordinal != null) {
          const idx = ordinal === -1 ? ordered.length - 1 : ordinal - 1;
          target = ordered[idx] || null;
        }
        if (!target && descriptorMatch) {
          const desc = normalizeLoose(descriptorMatch[1]);
          // Match sur nom OU main_category (ex : "le rooftop" → main_category contient rooftop)
          target = ordered.find((b: any) => {
            const name = normalizeLoose(String(b.name || ""));
            const cat = normalizeLoose(String(b.main_category || ""));
            return name.includes(desc) || cat.includes(desc);
          }) || null;
        }
        if (!target && anaphoraPronoun && ordered.length === 1) {
          target = ordered[0];
        }
        if (!target) throw "no_match";

        const hook = String(target[hookField] || "").trim();
        const desc = String(target[descField] || "").trim();
        const summary = hook || desc.slice(0, 400);
        const place = [target.neighborhood, target.city].filter(Boolean).join(", ");
        const line1 = `**${target.name}**${target.main_category ? ` — ${target.main_category}` : ""}${place ? ` · ${place}` : ""}`;
        let answer = summary ? `${line1}\n\n${summary}` : line1;
        const snapshot: PreviousSearchSnapshot = {
          title: target.name,
          slugs: [target.slug],
          returnedCount: 1,
          totalCount: 1,
        };
        answer += `\n\n<!--SEARCH_RESULTS:${JSON.stringify(snapshot).replace(/-->/g, "--&gt;")}-->`;
        const newMessages = [...messages, { role: "assistant", content: answer }];
        let resultChatId: string | null = null;
        if (chatId) {
          const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
          if (existing?.id) {
            await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
            resultChatId = chatId;
          }
        }
        if (!resultChatId) {
          const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || target.name, messages: newMessages }).select("id").single();
          resultChatId = inserted?.id ?? null;
        }
        turnLog.route_taken = "anaphora_shortcut";
        turnLog.results_count = 1;
        turnLog.results_shown = 1;
        emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
        emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("details_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
        return;
      } catch (e) {
        if (typeof e !== "string") console.error("anaphora route error, falling back:", e);
      }
    }
    // ============= FIN ROUTE ANAPHORE =============

    // ============= ROUTE DÉTERMINISTE : DETAILS BUSINESS =============
    // "parle-moi de X" / "c'est quoi X" / "tell me about X" → fetch direct
    // du business par fuzzy match sur name, synth courte streamée depuis le hook.
    const detailsTarget = extractDetailsTarget(lastUserMsg);
    if (detailsTarget) {
      try {
        const normTarget = normalizeLoose(detailsTarget);
        const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
        const descField = lang === "en" ? "description_en" : lang === "ar" ? "description_ar" : "description_fr";
        // Match strict d'abord, puis élargi
        const { data: exact } = await admin
          .from("businesses")
          .select(`id, slug, name, main_category, neighborhood, city, ${hookField}, ${descField}`)
          .ilike("name", detailsTarget)
          .limit(3);
        let candidates: any[] = exact || [];
        if (candidates.length === 0) {
          const { data: fuzzy } = await admin
            .from("businesses")
            .select(`id, slug, name, main_category, neighborhood, city, ${hookField}, ${descField}`)
            .ilike("name", `%${detailsTarget}%`)
            .limit(10);
          candidates = fuzzy || [];
        }
        // Sélectionne le meilleur match par distance de longueur au nom normalisé
        let best: any = null;
        let bestScore = Infinity;
        for (const c of candidates) {
          const cn = normalizeLoose(String(c.name || ""));
          if (!cn) continue;
          if (cn === normTarget) { best = c; break; }
          if (cn.includes(normTarget) || normTarget.includes(cn)) {
            const score = Math.abs(cn.length - normTarget.length);
            if (score < bestScore) { bestScore = score; best = c; }
          }
        }
        if (best && best.slug) {
          const hook = String(best[hookField] || "").trim();
          const desc = String(best[descField] || "").trim();
          const summary = hook || desc.slice(0, 400);
          const place = [best.neighborhood, best.city].filter(Boolean).join(", ");
          const line1 = `**${best.name}**${best.main_category ? ` — ${best.main_category}` : ""}${place ? ` · ${place}` : ""}`;
          let answer = summary
            ? `${line1}\n\n${summary}`
            : (lang === "en"
                ? `${line1}\n\nI don't have a description on file yet. Open the fiche to see photos, reviews and details.`
                : lang === "ar"
                ? `${line1}\n\nلا يوجد وصف بعد. افتح البطاقة للاطلاع على الصور والتفاصيل.`
                : `${line1}\n\nPas encore de description enregistrée. Ouvre la fiche pour voir photos, avis et détails.`);

          const snapshot: PreviousSearchSnapshot = {
            title: best.name,
            slugs: [best.slug],
            returnedCount: 1,
            totalCount: 1,
          };
          const safeSnap = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
          answer += `\n\n<!--SEARCH_RESULTS:${safeSnap}-->`;

          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || best.name, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "details_shortcut";
          turnLog.results_count = 1;
          turnLog.results_shown = 1;
          emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("details_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
        console.log(`details route: no business match for "${detailsTarget}" → fallback`);
      } catch (e) {
        console.error("details route failed, falling back:", e);
      }
    }
    // ============= FIN ROUTE DETAILS =============

    // ============= ROUTE DÉTERMINISTE : OPEN NOW =============
    // "lesquels sont ouverts maintenant" / "ouverts ce soir" appliqué au snapshot
    // précédent → filtre en Deno via opening_hours (TZ Africa/Casablanca).
    // Fallback silencieux si pas de snapshot ou si aucun business n'a d'horaires.
    if (isOpenNowIntent(lastUserMsg) && previousSearchSnapshot && previousSearchSnapshot.slugs.length >= 2) {
      try {
        const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
        const { data: bizRows } = await admin
          .from("businesses")
          .select(`id, slug, name, main_category, neighborhood, city, opening_hours, is_open_24h, ${hookField}`)
          .in("slug", previousSearchSnapshot.slugs);
        const bySlug = new Map((bizRows || []).map((b: any) => [b.slug, b]));
        const ordered = previousSearchSnapshot.slugs
          .map((s: string) => bySlug.get(s))
          .filter(Boolean) as any[];

        const openList: any[] = [];
        const closedList: any[] = [];
        const unknownList: any[] = [];
        for (const b of ordered) {
          const status = isOpenNow(b);
          if (status === true) openList.push(b);
          else if (status === false) closedList.push(b);
          else unknownList.push(b);
        }

        const totalOpen = openList.length;
        if (totalOpen === 0 && unknownList.length === ordered.length) {
          // Aucun horaire connu → on préfère laisser tomber, pas router déterministe
          console.log("open_now route: no hours known in snapshot → fallback");
        } else {
          const header = lang === "en" ? "Open now" : lang === "ar" ? "مفتوح الآن" : "Ouverts maintenant";
          const hoursLabel = lang === "en" ? "today" : lang === "ar" ? "اليوم" : "aujourd'hui";
          const fmtLine = (r: any) => {
            const hours = formatTodayHours(r, lang as any);
            const hoursSuffix = hours ? ` · 🕒 ${hours}` : "";
            const hook = r[hookField] ? ` · ${String(r[hookField]).slice(0, 140)}` : "";
            return `- **${r.name}**${r.main_category ? ` — ${r.main_category}` : ""}${r.neighborhood ? `, ${r.neighborhood}` : ""}${r.city ? `, ${r.city}` : ""}${hoursSuffix}${hook}`;
          };
          let body: string;
          if (totalOpen === 0) {
            const intro = lang === "en"
              ? "None of the previous results appear to be open right now. Their hours for today:"
              : lang === "ar"
              ? "لا يبدو أن أياً من النتائج السابقة مفتوح الآن. أوقاتها اليوم:"
              : "Aucun des résultats précédents ne semble ouvert maintenant. Leurs horaires du jour :";
            const closedLines = closedList.slice(0, 8).map(fmtLine).join("\n");
            body = closedLines ? `${intro}\n\n${closedLines}` : intro;
          } else {
            const shown = openList.slice(0, 5);
            const lines = shown.map(fmtLine).join("\n");
            const shownLine = lang === "en"
              ? `**${shown.length} of ${totalOpen} open right now shown**`
              : lang === "ar"
              ? `**${shown.length} من ${totalOpen} مفتوحة الآن معروضة**`
              : `**${shown.length} affichés sur ${totalOpen} ouverts maintenant**`;
            body = `${lines}\n\n${shownLine}`;
          }
          const unknownNote = unknownList.length
            ? (lang === "en"
                ? `\n\n_${unknownList.length} without hours on file — status unknown: ${unknownList.slice(0, 5).map((r: any) => r.name).join(", ")}${unknownList.length > 5 ? "…" : ""}_`
                : lang === "ar"
                ? `\n\n_${unknownList.length} بدون أوقات مسجلة: ${unknownList.slice(0, 5).map((r: any) => r.name).join("، ")}${unknownList.length > 5 ? "…" : ""}_`
                : `\n\n_${unknownList.length} sans horaires renseignés — statut inconnu : ${unknownList.slice(0, 5).map((r: any) => r.name).join(", ")}${unknownList.length > 5 ? "…" : ""}_`)
            : "";
          let answer = `**${header}**\n\n${body}${unknownNote}`;


          if (totalOpen >= 1) {
            const snapshot: PreviousSearchSnapshot = {
              title: header,
              slugs: openList.map((r: any) => r.slug).filter(Boolean),
              returnedCount: openList.length,
              totalCount: totalOpen,
            };
            const safeSnap = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
            answer += `\n\n<!--SEARCH_RESULTS:${safeSnap}-->`;
          }

          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || header, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "open_now_shortcut";
          turnLog.results_count = totalOpen;
          turnLog.results_shown = openList.slice(0, 5).length;
          emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("open_now_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
      } catch (e) {
        console.error("open_now route failed, falling back:", e);
      }
    }
    // ============= FIN ROUTE OPEN NOW =============

    // ============= ROUTE WEATHER (déterministe, get-weather) =============
    if (isWeatherIntent(lastUserMsg)) {
      try {
        const mem = buildSessionMemory(messages, clientContext?.activeCity);
        // Ville explicite dans la question > ville active connue > ville par défaut géo
        const explicitCity = knownWeatherCity(lastUserMsg) || knownWeatherCity(mem.city) || knownWeatherCity(clientContext?.activeCity);
        const city = explicitCity || resolveGeoDefaultCity(clientContext?.coords);
        const { data: w, error: wErr } = await admin.functions.invoke("get-weather", { body: { city } });
        if (!wErr && w && !w.error && typeof w.temp === "number") {
          const cityName = w.city_name || city;
          const intro = lang === "en"
            ? `Here's the weather in **${cityName}** and the trend for the next 3 days. 👇`
            : lang === "ar"
              ? `إليك حالة الطقس في **${cityName}** والتوقعات للأيام الثلاثة القادمة. 👇`
              : `Voici la météo à **${cityName}** ainsi que la tendance des 3 prochains jours. 👇`;
          const weatherJson = {
            city_name: cityName,
            temp: w.temp,
            feels_like: w.feels_like,
            temp_min: w.temp_min,
            temp_max: w.temp_max,
            humidity: w.humidity,
            wind_speed: w.wind_speed,
            description: w.description || "",
            icon: w.icon || "",
            hourly: Array.isArray(w.hourly) ? w.hourly.slice(0, 8) : [],
            daily: Array.isArray(w.daily) ? w.daily.slice(0, 3) : [],
          };
          const answer = `${intro}\n\n<!--WEATHER_FORECAST:${JSON.stringify(weatherJson)}-->`;
          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || "Météo", messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "weather_shortcut";
          turnLog.city_detected = city;
          emit({ type: "chunk", delta: answer });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("weather_shortcut", mem, lang) });
          return;
        }
        console.log("weather route: get-weather failed → fallback", { wErr });
      } catch (e) {
        console.error("weather route error, falling back:", e);
      }
    }
    // ============= FIN ROUTE WEATHER =============

    // ============= ROUTE BOOKING (déterministe, ouvre BookOnlineSlidePanel) =============
    const bookingTarget = parseBookingIntent(lastUserMsg);
    if (bookingTarget) {
      try {
        const clean = bookingTarget.replace(/\s+/g, " ").trim();
        const nName = normalizeLoose(clean);
        const activeCity = cleanActiveCityTop(clientContext?.activeCity);
        let query = admin.from("businesses").select("id, slug, name, city, main_category").eq("is_active", true);
        if (activeCity) query = query.ilike("city", `%${activeCity}%`);
        const { data: candidates } = await query.ilike("name", `%${clean.split(/\s+/)[0]}%`).limit(30);
        const best = (candidates || []).find((b: any) => normalizeLoose(b.name) === nName)
          || (candidates || []).find((b: any) => normalizeLoose(b.name).includes(nName))
          || (candidates || []).find((b: any) => nName.includes(normalizeLoose(b.name)))
          || null;
        if (best) {
          const label = lang === "en"
            ? `Opening booking for **${best.name}** — pick your details in the panel.`
            : lang === "ar"
            ? `فتح نافذة الحجز لـ **${best.name}**.`
            : `J'ouvre la réservation pour **${best.name}** — choisis tes options dans le panneau.`;
          const marker = JSON.stringify({ id: best.id, slug: best.slug, name: best.name }).replace(/-->/g, "--&gt;");
          const answer = `${label}\n\n<!--OPEN_BOOKING:${marker}-->`;
          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || best.name, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "booking_shortcut";
          turnLog.results_count = 1;
          turnLog.results_shown = 1;
          emit({ type: "chunk", delta: label });
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("details_shortcut", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
        console.log("booking route: no business match for", clean);
      } catch (e) {
        console.error("booking route error, falling back:", e);
      }
    }
    // ============= FIN ROUTE BOOKING =============

    // ============= ROUTE NEARBY (déterministe, Haversine) =============
    if (isNearbyIntent(lastUserMsg) && previousSearchSnapshot && previousSearchSnapshot.slugs.length >= 2) {
      try {
        const userCoords = clientContext?.coords && Number.isFinite(clientContext.coords.lat) && Number.isFinite(clientContext.coords.lng)
          ? { lat: Number(clientContext.coords.lat), lng: Number(clientContext.coords.lng) }
          : null;
        const landmark = resolveLandmarkCoords(lastUserMsg);
        const anchor = landmark || userCoords;
        const anchorLabel = landmark?.label || (userCoords ? (lang === "en" ? "your location" : lang === "ar" ? "موقعك" : "toi") : null);
        if (!anchor) {
          console.log("nearby route: no anchor coords → fallback");
        } else {
          const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
          const { data: bizRows } = await admin
            .from("businesses")
            .select(`id, slug, name, main_category, neighborhood, city, latitude, longitude, ${hookField}`)
            .in("slug", previousSearchSnapshot.slugs);
          const scored = (bizRows || [])
            .filter((b: any) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
            .map((b: any) => ({ ...b, _km: haversineKm(anchor, { lat: Number(b.latitude), lng: Number(b.longitude) }) }))
            .sort((a: any, b: any) => a._km - b._km)
            .filter((b: any) => followupRadiusKm == null || b._km <= followupRadiusKm);
          if (scored.length >= 1) {
            const shown = scored.slice(0, 5);
            const header = lang === "en" ? `Nearest to ${anchorLabel}` : lang === "ar" ? `الأقرب إلى ${anchorLabel}` : `Les plus proches de ${anchorLabel}`;
            const lines = shown.map((r: any) => {
              const km = r._km < 1 ? `${Math.round(r._km * 1000)} m` : `${r._km.toFixed(1)} km`;
              const hook = r[hookField] ? ` · ${String(r[hookField]).slice(0, 120)}` : "";
              return `- **${r.name}**${r.main_category ? ` — ${r.main_category}` : ""}${r.neighborhood ? `, ${r.neighborhood}` : ""} · 📍 ${km}${hook}`;
            }).join("\n");
            const shownLine = lang === "en"
              ? `**${shown.length} of ${scored.length} closest shown**`
              : lang === "ar"
              ? `**${shown.length} من ${scored.length} الأقرب معروضة**`
              : `**${shown.length} plus proches affichés sur ${scored.length}**`;
            let answer = `**${header}**\n\n${lines}\n\n${shownLine}`;
            const snapshot: PreviousSearchSnapshot = {
              title: `Proche de ${anchorLabel}`,
              slugs: scored.map((r: any) => r.slug).filter(Boolean),
              returnedCount: scored.length,
              totalCount: scored.length,
            };
            answer += `\n\n<!--SEARCH_RESULTS:${JSON.stringify(snapshot).replace(/-->/g, "--&gt;")}-->`;
            const newMessages = [...messages, { role: "assistant", content: answer }];
            let resultChatId: string | null = null;
            if (chatId) {
              const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
              if (existing?.id) {
                await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
                resultChatId = chatId;
              }
            }
            if (!resultChatId) {
              const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || header, messages: newMessages }).select("id").single();
              resultChatId = inserted?.id ?? null;
            }
            turnLog.route_taken = "nearby_shortcut";
            turnLog.results_count = scored.length;
            turnLog.results_shown = shown.length;
            emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
            emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("router_direct", buildSessionMemory(messages, clientContext?.activeCity), lang) });
            return;
          }
          console.log("nearby route: no snapshot business has coords → fallback");
        }
      } catch (e) {
        console.error("nearby route error, falling back:", e);
      }
    }
    // ============= FIN ROUTE NEARBY =============

    // ============= ROUTE PRICE / BUDGET (déterministe, snapshot only) =============
    const priceFilter = parsePriceIntent(lastUserMsg);
    if (priceFilter && previousSearchSnapshot && previousSearchSnapshot.slugs.length >= 2) {
      try {
        const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
        const { data: bizRows } = await admin
          .from("businesses")
          .select(`id, slug, name, main_category, neighborhood, city, min_price, manual_price_range, ${hookField}`)
          .in("slug", previousSearchSnapshot.slugs);
        const withPrice: any[] = [];
        const unknown: any[] = [];
        for (const b of (bizRows || [])) {
          const priceNum = Number.isFinite(Number(b.min_price)) && Number(b.min_price) > 0
            ? Number(b.min_price)
            : extractMinPriceFromRange(b.manual_price_range);
          if (priceNum != null) withPrice.push({ ...b, _price: priceNum });
          else unknown.push(b);
        }
        const matches = withPrice.filter((b) => priceMatches(b._price, priceFilter)).sort((a, b) => a._price - b._price);
        const totalKnown = withPrice.length;
        const totalUnknown = unknown.length;
        const shown = matches.slice(0, 5);
        const filterLabel = priceFilter.max ? `< ${priceFilter.max} DH` : priceFilter.min && priceFilter.max ? `${priceFilter.min}–${priceFilter.max} DH` : priceFilter.min ? `> ${priceFilter.min} DH` : priceFilter.tier === "cheap" ? "budget" : priceFilter.tier === "premium" ? "haut de gamme" : "milieu de gamme";
        const header = lang === "en" ? `Price filter · ${filterLabel}` : lang === "ar" ? `فلتر السعر · ${filterLabel}` : `Filtre prix · ${filterLabel}`;
        const disclaimer = totalUnknown > 0
          ? (lang === "en"
              ? `\n\n_Note: I only know prices for ${totalKnown} of ${totalKnown + totalUnknown} results (mostly hotels/riads). ${totalUnknown} are excluded from the price filter, not from the shortlist itself._`
              : lang === "ar"
              ? `\n\n_ملاحظة: أعرف الأسعار فقط لـ ${totalKnown} من أصل ${totalKnown + totalUnknown} نتيجة._`
              : `\n\n_Note : je ne connais les prix que pour ${totalKnown} sur ${totalKnown + totalUnknown} résultats (surtout des hôtels/riads). Les ${totalUnknown} autres sont exclus du filtre prix, pas de la sélection globale._`)
          : "";
        let body: string;
        if (!shown.length) {
          body = lang === "en"
            ? `No result in the previous shortlist matches ${filterLabel}${totalKnown === 0 ? " (no reliable price data available)" : ""}.`
            : lang === "ar"
            ? `لا توجد نتيجة تطابق ${filterLabel}.`
            : `Aucun résultat de la sélection précédente ne correspond à ${filterLabel}${totalKnown === 0 ? " (aucun prix fiable disponible)" : ""}.`;
        } else {
          const lines = shown.map((r: any) => {
            const priceStr = `${r._price} DH${r.manual_price_range && !Number.isFinite(Number(r.min_price)) ? ` (${r.manual_price_range})` : ""}`;
            const hook = r[hookField] ? ` · ${String(r[hookField]).slice(0, 120)}` : "";
            return `- **${r.name}**${r.main_category ? ` — ${r.main_category}` : ""}${r.neighborhood ? `, ${r.neighborhood}` : ""} · 💰 ${priceStr}${hook}`;
          }).join("\n");
          const shownLine = lang === "en"
            ? `**${shown.length} of ${matches.length} matching shown**`
            : lang === "ar"
            ? `**${shown.length} من ${matches.length} مطابقة معروضة**`
            : `**${shown.length} résultats affichés sur ${matches.length} correspondants**`;
          body = `${lines}\n\n${shownLine}`;
        }
        let answer = `**${header}**\n\n${body}${disclaimer}`;
        if (shown.length) {
          const snapshot: PreviousSearchSnapshot = {
            title: header,
            slugs: matches.map((r: any) => r.slug).filter(Boolean),
            returnedCount: matches.length,
            totalCount: matches.length,
          };
          answer += `\n\n<!--SEARCH_RESULTS:${JSON.stringify(snapshot).replace(/-->/g, "--&gt;")}-->`;
        }
        const newMessages = [...messages, { role: "assistant", content: answer }];
        let resultChatId: string | null = null;
        if (chatId) {
          const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
          if (existing?.id) {
            await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
            resultChatId = chatId;
          }
        }
        if (!resultChatId) {
          const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title: lastUserMsg.slice(0, 200) || header, messages: newMessages }).select("id").single();
          resultChatId = inserted?.id ?? null;
        }
        turnLog.route_taken = "price_shortcut";
        turnLog.results_count = matches.length;
        turnLog.results_shown = shown.length;
        emit({ type: "chunk", delta: answer.split(/<!--/)[0] });
        emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("router_direct", buildSessionMemory(messages, clientContext?.activeCity), lang) });
        return;
      } catch (e) {
        console.error("price route error, falling back:", e);
      }
    }
    // ============= FIN ROUTE PRICE =============



    // ============= PHASE 1 : ROUTER DÉTERMINISTE =============
    // Court-circuite la boucle tool-calling du LLM pour les intentions pures
    // "search" et "refinement". Le LLM n'est utilisé QUE pour une synthèse
    // éditoriale courte (~1 appel, ~600 tokens max).
    // Objectif : cohérence stricte avec /search + coût divisé, latence réduite.
    const classifyIntent = (text: string, hasPrev: boolean): "search" | "refinement" | "conversation" => {
      const t = String(text || "").trim();
      if (!t) return "conversation";
      const wc = t.split(/\s+/).length;
      const norm = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const refinementStart = /^(et\b|plus\b|avec\b|sans\b|mais\b|lequel|laquelle|lesquels|celui|celle|ceux|celles|le\s+meilleur|le\s+plus|dans\s+la\s|dans\s+le\s|the\s+best|which|and\b|but\b|with\b|without\b)/i;
      const looksLikeSearch = /(h[oô]tel|riad|restaurant|\bbar\b|rooftop|spa|hammam|piscine|plage|beach|caf[eé]|club|golf|shopping|boutique|guide|activit[eé]|excursion|randonn[eé]e|hike|tour|visite|mus[eé]e|marche|souk|voyage|s[eé]jour|week[- ]?end|montagne|desert|dune|surf|yoga|massage|cocktail|d[iî]ner|manger|dormir|boire|petit[- ]?d[eé]jeuner|brunch|marrakech|essaouira|casablanca|gu[eé]liz|palmeraie|m[eé]dina|hivernage|agdal|kasbah|ourika)/i;
      const searchVerbs = /(cherche|trouve|recommande|propose|montre|liste|donne|conseille|find|show|recommend|list|need|want)/i;

      // Une requête qui cite un type de lieu (venue noun) est toujours une NOUVELLE
      // recherche, jamais un raffinement — même courte, même après un tour précédent.
      // Évite de fusionner "club de jazz ce soir" avec une question d'agenda antérieure.
      if (VENUE_NOUN_RE.test(norm) || looksLikeSearch.test(norm)) return "search";
      if (hasPrev && (wc <= 6 || refinementStart.test(norm))) return "refinement";
      if (searchVerbs.test(norm) && wc >= 3) return "search";
      return "conversation";
    };

    // Nettoie activeCity : si le client passe une adresse complète, extrait juste
    // le nom de ville connu (Marrakech, Essaouira, Casablanca, Agadir, Taghazout…).
    const cleanActiveCity = (raw: any): string | undefined => {
      const s = String(raw || "").trim();
      if (!s) return undefined;
      const known = ["Marrakech", "Essaouira", "Casablanca", "Agadir", "Taghazout", "Rabat", "Fès", "Fes", "Tanger", "Chefchaouen", "Ouarzazate", "Merzouga"];
      const norm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const k of known) {
        const kn = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (norm.includes(kn)) return k;
      }
      // Sinon, si c'est un mot simple court, on garde ; sinon on abandonne.
      return s.length <= 40 && !/[,\d]/.test(s) ? s : undefined;
    };
    const activeCityClean = cleanActiveCity(clientContext.activeCity);
    turnLog.city_detected = activeCityClean || null;

    const isMapTrigger = MAP_TRIGGER_RE.test(lastUserMsg || "");
    const routedIntent = classifyIntent(lastUserMsg, !!previousUserQuery);
    turnLog.intent_classified = routedIntent;
    // ── Classifieur B (observation) ──────────────────────────────────────────
    // On arrive ici uniquement quand AUCUN raccourci déterministe (classe A) n'a
    // capté le tour : c'est le fourre-tout (router_direct / tool_loop). Le
    // classifieur est lancé EN PARALLÈLE du reste du tour — il n'influence pas
    // le routage, il est seulement lu au moment du log.
    if (lastUserMsg && lastUserMsg.trim()) {
      clubClassifierPromise = classify(
        {
          message: lastUserMsg.slice(0, 2000),
          surface: "club",
          focus: {
            active_city: activeCityClean || null,
            last_business_names: previousSearchSnapshot?.slugs?.slice(0, 3),
          } as any,
        },
        LOVABLE_API_KEY,
      ).catch(() => null);
    }
    console.log("club-ai-chat router:", JSON.stringify({ intent: routedIntent, isMapTrigger, msg: lastUserMsg.slice(0, 100), hasPrev: !!previousUserQuery, snapSlugs: previousSearchSnapshot?.slugs?.length ?? 0, msgsCount: messages.length, openNowMatch: isOpenNowIntent(lastUserMsg), activeCityRaw: clientContext.activeCity, activeCityClean }));

    if (!isMapTrigger && !affirmativeMapTrigger && (routedIntent === "search" || routedIntent === "refinement")) {
      // Skeleton placeholders : the client can render N grey cards while the
      // synth stream is being generated, halving perceived latency.
      emit({ type: "skeleton", count: 5, intent: routedIntent });
      try {
        const fusedQuery = routedIntent === "refinement" && previousUserQuery
          ? `${previousUserQuery} ${lastUserMsg}`.replace(/\s+/g, " ").slice(0, 400)
          : lastUserMsg;

        // ── Autorité du classifieur B (phase 3) ──────────────────────────────
        // Le classifieur n'est plus en simple observation : au-dessus du seuil de
        // surface, ses champs (category / city / exclude) pilotent réellement les
        // paramètres de la recherche déterministe. La requête texte d'origine est
        // conservée (elle porte les nuances type « vue Koutoubia »).
        let authCategory: string | undefined;
        let authCity: string | undefined;
        let authExcludes: string[] = [];
        let classifierAuthority = false;
        try {
          const clfRes: any = clubClassifierPromise
            ? await Promise.race([
                clubClassifierPromise,
                new Promise((res) => setTimeout(() => res(null), 3000)),
              ])
            : null;
          const clf: any = clfRes?.output ?? clfRes ?? null;
          const conf = Number(clf?.confidence ?? 0);
          const threshold = getSurfaceConfig("club").confidenceThreshold;
          const clfIntent = String(clf?.intent || "");
          if (clf && conf >= threshold && (clfIntent === "search" || clfIntent === "compare")) {
            classifierAuthority = true;
            authCategory = String(clf.category || "").trim() || undefined;
            authCity = String(clf.city || "").trim() || undefined;
            authExcludes = Array.isArray(clf.exclude) ? clf.exclude.map((e: any) => String(e)).filter(Boolean) : [];
            // Garde-fou : une intention de VUE (Koutoubia, Atlas, mer…) est portée par
            // la requête texte (rayon géométrique + preuve de point de vue). Passer
            // `category` écraserait ce filtrage et rendrait une liste générique.
            const vi = detectViewIntent(fusedQuery);
            if (vi.hasViewIntent && (vi.points.length > 0 || vi.panoramas.length > 0)) {
              authCategory = undefined;
              turnLog.fallback_reason = turnLog.fallback_reason || "authority_view_intent";
            }
            turnLog.ai_class = "B";
            turnLog.route_taken = "search";
            turnLog.classifier_confidence = conf;
            if (authCity) turnLog.city_detected = authCity;
          }
          console.log("club classifier authority:", JSON.stringify({ conf, threshold, clfIntent, authCategory, authCity, authExcludes, applied: classifierAuthority, viewIntent: (() => { const v = detectViewIntent(fusedQuery); return { hasViewIntent: v.hasViewIntent, points: v.points.map((x) => x.slug), panoramas: v.panoramas.map((x) => x.slug) }; })() }));
        } catch (e) {
          console.warn("club classifier authority failed", e);
        }

        const searchCity = authCity || activeCityClean || undefined;
        const routerCtx = { userId: user.id, supabase: admin, lastUserMessage: fusedQuery, language: lang, forceQuery: fusedQuery };
        const search = await runTool(
          "search_businesses",
          { query: fusedQuery, limit: 30, city: searchCity, ...(authCategory ? { category: authCategory } : {}) },
          routerCtx,
        ) as any;

        let results: any[] = Array.isArray(search?.results) ? search.results : [];
        // Exclusions explicites du classifieur (« pas un hôtel »).
        if (authExcludes.length) {
          const normEx = (s: any) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const excludeTokens = authExcludes.flatMap((e) => {
            const n = normEx(e);
            return n.startsWith("hotel") ? ["hotel", "riad", "maison d hotes", "guest house"] : [n];
          });
          const before = results.length;
          const filtered = results.filter((r: any) => {
            const hay = normEx([r.main_category, ...(Array.isArray(r.categories) ? r.categories : []), r.name].join(" | "));
            return !excludeTokens.some((t) => t && hay.includes(t));
          });
          // On n'applique le filtre que s'il laisse au moins un résultat.
          if (filtered.length >= 1) results = filtered;
          console.log("club authority excludes:", JSON.stringify({ excludeTokens, before, kept: results.length }));
        }
        const totalCount = results.length < (Number(search?.total_count) || 0) && authExcludes.length
          ? results.length
          : (Number(search?.total_count) || results.length);
        console.log("router direct search:", JSON.stringify({ intent: routedIntent, authority: classifierAuthority, fusedQuery: fusedQuery.slice(0, 120), returned: results.length, total: totalCount, strict: !!search?.strict_filter_applied }));

        if (results.length >= 1) {
          const top = results.slice(0, 5);
          const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
          const listBlock = top.map((r: any, i: number) =>
            `${i + 1}. ${r.name} — ${r.main_category || "?"}${r.neighborhood ? `, ${r.neighborhood}` : ""}${r.city ? `, ${r.city}` : ""}${r[hookField] ? ` · ${String(r[hookField]).slice(0, 160)}` : ""}`
          ).join("\n");

          const synthSystem = lang === "en"
            ? "You write a short warm intro (1-2 sentences) then list the businesses in bold with one short line each from the provided hook. Never invent details. Do not add addresses, prices or hours."
            : lang === "ar"
            ? "اكتب مقدمة قصيرة ودافئة (جملة أو جملتان) ثم اذكر المؤسسات بخط عريض مع سطر قصير لكل منها من الوصف المقدم. لا تخترع أي تفاصيل."
            : "Écris une intro courte et chaleureuse (1-2 phrases) puis liste les établissements en **gras** avec une courte ligne issue du hook fourni. N'invente jamais adresses, prix, horaires ou détails absents.";

          const shownCount = top.length;
          const filterLine = search?.strict_filter_applied ? `\nFiltre strict appliqué côté serveur : ${search.strict_filter_reason}. Ne mentionne PAS d'établissement absent de la liste ci-dessus.` : "";
          const refineNote = routedIntent === "refinement" ? ` (raffinement de : "${previousUserQuery}")` : "";

          // Contexte éditorial partagé (TXT IA + popups d'images + offres) — même
          // module que /search et /embed pour une richesse identique.
          let editorialBlock = "";
          try {
            const edIds = top.map((r: any) => r?.id).filter(Boolean).map(String);
            if (edIds.length) {
              const nameById: Record<string, string> = {};
              for (const r of top as any[]) if (r?.id) nameById[String(r.id)] = r.name || "";
              const bundle = await loadEditorialBundle(admin, { businessIds: edIds, perBusiness: 5, limit: 12, lang });
              const ctxTxt = formatEditorialBundle(bundle, nameById);
              if (ctxTxt) {
                editorialBlock = `\n\nCONTEXTE ÉDITORIAL ([DESCRIPTION] description de l'établissement, [HOOK] accroche, [IMAGE POPUP] titres et textes des photos, [SERVICE] services, [OFFRE] offres et promotions, [TXT IA] textes rédigés par l'établissement/affilié — utilise-le pour enrichir la ligne de chaque établissement, sans rien inventer) :\n${ctxTxt}`;
                const counts = (type: string) => bundle.items.filter((i: any) => i.type === type).length;
                console.log(
                  `[club] Editorial ctx: ${counts("description")} desc, ${counts("hook")} hooks, ${counts("popup")} popups, ${counts("offer")} offres, ${counts("service")} services, ${counts("text")} TXT IA (${edIds.length} businesses)`,
                );
              }
            }
          } catch (e) {
            console.error("[club] editorial_ctx_error", String(e));
          }

          const synthUser = `Requête du membre : "${lastUserMsg}"${refineNote}

Établissements sélectionnés (${totalCount} au total, ${shownCount} présentés) :
${listBlock}${filterLine}${editorialBlock}

Consignes :
- 1 phrase d'intro chaleureuse en ${lang === "en" ? "anglais" : lang === "ar" ? "arabe" : "français"}.
- Liste chaque établissement : **Nom** puis une ligne courte tirée du hook ou du contexte éditorial.
- Termine EXACTEMENT par cette ligne : **${shownCount} résultats affichés sur ${totalCount} trouvés**
${totalCount > shownCount ? "- Puis propose : « je peux les afficher tous sur la carte »." : ""}`;

          let answer = "";
          let streamed = false;
          try {
            const synth = await streamGatewayText(GATEWAY_URL, {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: FALLBACK_MODEL,
                messages: [{ role: "system", content: synthSystem }, { role: "user", content: synthUser }],
                temperature: 0.5,
                max_tokens: 700,
              }),
            }, emit, () => {
              if (turnLog.latency_ms_first_token == null) turnLog.latency_ms_first_token = Date.now() - turnStartMs;
            }, clientAbort);
            if (synth.ok && synth.text) {
              answer = synth.text.trim();
              streamed = true;
            }
          } catch (e) { console.error("router synth error", e); }

          if (!answer) {
            answer = `Voici une sélection :\n\n${top.map((r: any) => `- **${r.name}**${r.neighborhood ? ` — ${r.neighborhood}` : ""}${r[hookField] ? ` · ${String(r[hookField]).slice(0, 140)}` : ""}`).join("\n")}\n\n**${shownCount} résultats affichés sur ${totalCount} trouvés**`;
            emit({ type: "chunk", delta: answer });
          }

          const snapshot: PreviousSearchSnapshot = {
            title: fusedQuery.slice(0, 120),
            slugs: results.map((r: any) => r.slug).filter(Boolean),
            returnedCount: results.length,
            totalCount,
          };
          const safeSnap = JSON.stringify(snapshot).replace(/-->/g, "--&gt;");
          answer = correctVisibleResultCount(answer, top.map((r: any) => r.name)) + `\n\n<!--SEARCH_RESULTS:${safeSnap}-->`;

          const newMessages = [...messages, { role: "assistant", content: answer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin.from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const title = lastUserMsg.slice(0, 200) || "Nouvelle conversation";
            const { data: inserted } = await admin.from("ai_chats").insert({ user_id: user.id, kind: "club", title, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          turnLog.route_taken = "router_direct";
          turnLog.results_count = totalCount;
          turnLog.results_shown = top.length;
          turnLog.city_detected = search?.detected?.city || turnLog.city_detected;
          turnLog.latency_ms_synth = Date.now() - turnStartMs;
          emit({ type: "done", answer, chatId: resultChatId, followups: buildDeterministicFollowups("router_direct", buildSessionMemory(messages, clientContext?.activeCity), lang) });
          return;
        }
        console.log("router direct search returned 0 → fallback to LLM tool loop");
      } catch (e) {
        console.error("router direct search error, falling back to LLM:", e);
      }
    }
    // ============= FIN PHASE 1 ROUTER =============


    let prefetchBlock = "";
    try {
      const q = String(lastUserMsg).trim().slice(0, 200);
      const city = clientContext.activeCity || "";
      if (q.length >= 4) {
        const clean = (s: string) => s.replace(/[,()"]/g, " ").trim();
        const terms = clean(q).split(/\s+/).filter((w) => w.length >= 3).slice(0, 5);
        if (terms.length) {
          const orParts: string[] = [];
          for (const w of terms) {
            orParts.push(`name.ilike.%${w}%`, `description.ilike.%${w}%`, `main_category.ilike.%${w}%`);
          }
          let pq = admin
            .from("businesses")
            .select("name,slug,city,neighborhood,main_category,hook_fr,google_rating")
            .eq("is_active", true)
            .or(orParts.join(","))
            .order("priority_score", { ascending: false, nullsFirst: false })
            .limit(8);
          if (city) pq = pq.ilike("city", `%${city}%`);
          const { data: candidates } = await pq;
          if (candidates && candidates.length) {
            const lines = candidates.map((b: any) =>
              `  • ${b.name} — ${b.main_category || "?"}${b.neighborhood ? `, ${b.neighborhood}` : ""}${b.city ? `, ${b.city}` : ""} (slug: ${b.slug})${b.google_rating ? ` · ★${b.google_rating}` : ""}`
            ).join("\n");
            prefetchBlock = `\nCANDIDATS RÉELS PRÉ-CHARGÉS depuis la base 1WM (message: "${q.slice(0, 80)}"):\n${lines}\n\nUtilise-les en priorité pour ta réponse. Si aucun ne correspond finement à l'intention (ambiance, badge, service, quartier précis), appelle search_businesses pour affiner. Ne mentionne JAMAIS d'établissement qui ne provient pas soit de cette liste, soit d'un appel d'outil.`;
          }
        }
      }
    } catch (e) {
      console.error("prefetch candidates error", e);
    }

    const system = `Tu es l'assistant personnel du Club One World Morocco. Tu aides un membre connecté à découvrir et retrouver des établissements RÉELS référencés dans la base 1WM.

${profileLine}

CONTEXTE SESSION:
${contextLines}

${tasteLine}
${prefetchBlock}

RÈGLES DE PRÉCISION (critiques) :
1. N'INVENTE JAMAIS un établissement, une adresse, un horaire, un prix ou un numéro. Toutes ces informations DOIVENT provenir d'un appel d'outil (search_businesses, get_business_details, list_my_bookmarks…).
2. Avant de recommander un lieu, appelle search_businesses avec les filtres pertinents (city, category, neighborhood). Si la ville n'est pas précisée ET pas évidente dans le contexte, pose UNE courte question de clarification au lieu de deviner.
3. Pour donner des détails (horaires, prix, adresse, téléphone), appelle get_business_details avec le slug exact obtenu via search_businesses.
4. Si une recherche ne renvoie rien, dis-le franchement et propose une reformulation — ne complète pas avec des lieux génériques.
5. Quand tu cites un établissement, écris simplement son **Nom exact** en gras (le nom sera automatiquement cliquable côté UI pour ouvrir la fiche). N'ajoute JAMAIS de lien markdown type [voir la fiche](...) ni d'URL /b/SLUG visible.
6. Reste concis, chaleureux, en français (sauf si l'utilisateur écrit dans une autre langue). Markdown léger (gras, listes courtes). Dans une réponse textuelle, mets en avant 3 à 5 suggestions vraiment ciblées — mais quand le membre demande une carte ou une vue d'ensemble, appelle search_businesses avec limit=50 pour alimenter la carte. **OBLIGATOIRE** : à chaque réponse qui s'appuie sur search_businesses ou search_events, commence (ou termine) par une ligne explicite du type « **N résultats affichés sur M trouvés** » : N = nombre de noms effectivement listés dans TON TEXTE visible (si tu cites 5 établissements, écris 5, même si l'outil en a retourné 12 ou 50) ; M = \`total_count\` retourné par l'outil. Si beaucoup d'autres résultats existent, propose d'élargir, d'affiner ou de les voir sur une carte (« je peux afficher les 32 sur la carte »). **NE PROPOSE JAMAIS de filtrer par budget, prix, gamme de prix ou tarif.**
6bis. **PRIX & TARIFS (interdiction stricte)** : tu ne disposes PAS de données fiables de prix/tarifs pour les établissements. N'annonce JAMAIS un prix, une fourchette de tarif, une gamme de prix, un « pas cher / cher / moyen », et ne propose JAMAIS de filtrer/trier par budget ou par tarif. Si le membre pose une question liée au tarif ou au budget (hors nuitées d'hôtel), réponds franchement : « Je ne dispose pas encore de l'information des prix/tarifs pour cette catégorie. Je peux en revanche te proposer une sélection par quartier, ambiance, type de cuisine, etc. » SEULE EXCEPTION : les **nuitées d'hôtel** (tarifs hôteliers issus du moteur de prix dédié) — là tu peux mentionner un prix s'il est explicitement retourné par un outil.
7. Utilise naturellement les goûts du membre pour personnaliser, sans les réciter.
8. **Événements / agenda** : appelle 'search_events' UNIQUEMENT quand le membre demande explicitement un événement daté (mots-clés : « agenda », « événement(s) », « concert », « festival », « expo/exposition », « spectacle », « programme/programmation », « que se passe-t-il », « animations »). ⚠️ Si la requête décrit un **type de lieu** (club de jazz, bar, restaurant, rooftop, riad, spa, café, salle…) — même accompagné de « ce soir », « ce week-end », « maintenant » — c'est une recherche **business** : appelle 'search_businesses' (les mots temporels sont alors des filtres d'ouverture, pas des déclencheurs agenda). Chaque tour ré-évalue l'intention à partir du message courant seul : ne reste pas en mode events juste parce que le tour précédent portait sur l'agenda. Quand 'search_events' est légitime : filtre #Agenda + ville, dates par défaut aujourd'hui → +90 jours. Tu peux ENSUITE compléter avec web_search (1 appel max) pour des événements publics majeurs absents de 1WM, à condition de : (a) distinguer « **Agenda 1WM** » (issue de search_events, noms cliquables) de « **Aussi à ne pas manquer (web)** » avec sources [titre](url) obligatoires, (b) NE JAMAIS fusionner ou inventer un événement qui ne provient ni de search_events ni d'un snippet web réel, (c) ne pas mettre en gras cliquable les noms issus du web. N'invente jamais une date, un lieu ou un nom d'événement. Si search_events ne renvoie rien pour la période demandée, dis-le franchement AVANT de proposer un complément web.
9. **Recherche web (web_search)** : appelle-la UNIQUEMENT pour des infos factuelles temps réel absentes de 1WM (pharmacie de garde, numéros d'urgence officiels, événements/festivals publics non référencés, horaires transports, démarches admin, actualités) OU en complément explicite de search_events pour l'agenda (voir règle 8). JAMAIS pour recommander des restaurants, hôtels, spas, etc. — ceux-là doivent venir de search_businesses. Maximum 1 appel web_search par message. Cite TOUJOURS les sources sous forme [titre](url) à la fin de ta réponse, et préviens si l'info peut avoir changé. Interdiction absolue de citer un événement ou un établissement qui n'apparaît pas mot pour mot dans un snippet retourné par web_search.
10. **Voyages du membre (get_my_trips)** : dès que le membre évoque « mon voyage », « mon séjour », « prépare », « planning », un week-end / des dates précises, ou qu'il faut s'appuyer sur ses adresses sauvegardées pour un séjour, appelle get_my_trips. Croise ensuite ville + dates + établissements liés pour proposer un planning ou des compléments via search_businesses / search_events. Ne réinvente jamais ses dates, ses villes ou ses adresses liées.

Outils disponibles : get_weather, search_businesses, get_business_details, search_events, get_my_trips, link_business_to_trip, list_my_bookmarks, list_my_saved_chats, get_my_taste_profile, suggest_similar_to_my_bookmarks, web_search, show_on_map.

11. **Lier une adresse à un voyage (link_business_to_trip)** : si le membre demande explicitement « ajoute X à mon voyage Y », appelle d'abord get_my_trips pour récupérer trip_id et search_businesses pour obtenir le slug exact, puis link_business_to_trip. Confirme ensuite poliment ce qui a été ajouté. Si plusieurs voyages possibles, demande au membre lequel cibler avant d'agir.
12. **Affichage sur carte (show_on_map) — DÉCLENCHEMENT OBLIGATOIRE** : tu DOIS appeler show_on_map SANS ATTENDRE une seconde demande dès que la question du membre contient l'un des mots/expressions déclencheurs suivants (FR/EN/AR, insensible aux accents et à la casse) : « carte », « map », « sur une carte », « on a map », « situe », « situer », « localise », « localiser », « où sont », « où se trouvent », « where are », « geoloc », « géolocalise », « خريطة ». Dans ces cas : (a) appelle d'abord search_businesses avec limit: 50 (en réutilisant EXACTEMENT les mêmes filtres — ville, catégorie, quartier, requête — que la recherche précédente si le membre fait référence à des résultats déjà obtenus, ex. « les 32 résultats », « ceux-ci », « ces hôtels », « la même liste »), (b) puis appelle show_on_map DANS LE MÊME TOUR avec **TOUS** les slugs pertinents retournés (jusqu'à 50 ; si le membre mentionne un nombre précis N ≤ 50, passe les N premiers, jamais moins). Ne demande JAMAIS confirmation avant d'ouvrir la carte quand un de ces mots est présent. Appelle aussi show_on_map spontanément quand visualiser géographiquement aide vraiment la décision (≥ 3 lieux dispersés). La carte et le panneau s'affichent automatiquement côté UI ; tu n'as donc pas à répéter la liste ni à coller une URL Google Maps. Indique le nombre total (total_count) — par exemple « Voici 32 activités affichées sur la carte (sur 32 au total) ». Ne l'appelle pas pour 1 seul lieu.

13. **INTENTION RESTAURANT / DÎNER / MANGER — filtre strict** : dès que le membre demande « où dîner », « pour dîner », « pour manger », « restaurant », « lequel est mieux pour dîner », « bonne table », « gastronomie » (FR/EN/AR équivalents), tu dois t'aligner sur la logique de /search :
   (a) Un établissement n'est un vrai restaurant QUE si son \`main_category\` = « Restauration » **OU** si son tableau \`services\` contient explicitement « Restaurant », « Table gastronomique », « Bistrot », « Brasserie », « Fine dining » ou équivalent explicite.
   (b) Le service « **Restauration sur place** » présent sur un **Riad / Hôtel / Maison d'hôtes** (main_category = « Hôtellerie ») veut dire « repas réservés aux résidents » — ce n'est **PAS** un restaurant ouvert au public. Tu dois l'IGNORER quand le membre cherche un restaurant/dîner, sauf si le hook, la description ou un highlight confirme explicitement l'ouverture aux non-résidents (mots-clés : « ouvert au public », « ouvert aux extérieurs », « restaurant ouvert à tous », « table d'hôtes ouverte »).
   (c) Pour trancher, appuie-toi sur les champs enrichis retournés par search_businesses : \`hook_fr/en/ar\`, \`description\`, et \`highlights\` (titre + description des blocs). Si aucun de ces champs ne confirme le caractère « restaurant public », n'inclus PAS l'établissement dans une réponse « où dîner ».
   (d) Quand le membre affine une liste précédente avec une intention qui change la catégorie requise (ex. rooftops → « lequel pour dîner ? », hôtels → « lequel a le meilleur spa ? »), **relance search_businesses** avec la nouvelle catégorie/service (ex. \`category: "restaurant"\` + \`services: ["Restaurant"]\` + le contexte rooftop/ville) au lieu de filtrer mentalement la liste précédente. Ne réutilise la liste précédente que si l'intention ne change pas de nature.

14. **VUE SUR X (« vue sur X », « face à X », « donnant sur X », « overlooking X »)** : il y a DEUX natures de vue, ne les confonds pas.
   (a) **Panorama** (Atlas / montagne / montagnes / mountains, mer / océan / Atlantique, ville / médina / toits, désert / palmeraie) : « vue atlas » et « vue montagne » sont STRICTEMENT la même demande. Appelle search_businesses avec le nom EXACT du service/badge en base : \`services: ["Vue montagne"]\` (Atlas & montagne), \`["Vue sur mer"]\` (mer & océan), \`["Vue sur la ville"]\` (ville & médina). Aucune notion de distance ici : l'Atlas est à 50 km de Marrakech et pourtant visible — ne rejette JAMAIS un établissement au motif qu'il est loin du repère.
   (b) **Repère ponctuel géolocalisé** (Koutoubia, Jemaa el-Fna, Ménara, Bab Agnaou, Palais Bahia, Majorelle, Sqala, port d'Essaouira) : inclus le nom du repère dans \`query\` (ex. \`query: "rooftop koutoubia"\`) en plus des services pertinents. Le serveur applique un rayon d'environ 1 km autour du repère — ne conserve pas un établissement de l'autre bout de la ville.
   (c) Le serveur applique déjà ces filtres avant de te livrer results[] : ne réintroduis JAMAIS un établissement absent de results[], et n'invente jamais une vue non documentée. Si \`landmark_softened\` est vrai, présente les résultats comme valides en précisant simplement, en une phrase, que la vue n'est pas documentée.
   (d) Même règle pour show_on_map : ne passe QUE les slugs présents dans map_slugs.

15. **INTENTION COMPOSÉE (ET STRICT) — « rooftop bar », « restaurant avec piscine », « spa avec hammam »…** : quand le membre combine deux attributs dans la même demande (ex. « rooftop bar », « bar avec terrasse », « restaurant piscine », « riad spa »), tu dois exiger la présence des DEUX conditions simultanément, jamais l'une OU l'autre.
   (a) Décompose la demande en attributs distincts (ex. « rooftop bar » → { rooftop, bar }, « restaurant avec piscine » → { restaurant, piscine }).
   (b) Appelle search_businesses avec tous les attributs répartis correctement (badges + services), puis **filtre côté IA** en ne gardant que les établissements qui prouvent CHAQUE attribut via : \`main_category\`, \`categories\`, \`services\`, \`badges\`, \`name\`, \`hook_*\`, \`description\` ou \`highlights\`. Un « Rooftop » sans preuve de « Bar » (service Bar, mot « bar » dans le nom/hook/description, main_category Bar/Bar à cocktails) doit être exclu — et inversement.
   (c) Si un Riad/Hôtel possède un rooftop mais aucune preuve de bar public, il ne compte PAS comme « rooftop bar ». Idem pour toute combinaison où un des attributs manque.
   (d) Si le filtre laisse moins de résultats que demandé, dis-le clairement (« Je n'ai que N établissements qui sont à la fois rooftop ET bar ») — ne complète jamais avec des lieux qui ne remplissent qu'une seule condition.
   (e) Même filtre strict pour show_on_map.

16. **EXCLUSIONS EXPLICITES (« pas un X », « sans X », « no X », « exclure les X », « autre que X »)** : dès que le membre exclut explicitement une catégorie, un type d'établissement ou un attribut (ex. « avec un bar, pas un hôtel », « un restaurant, pas un riad », « rooftop sans piscine », « no hotel »), tu dois :
   (a) Identifier le/les termes exclus et les mapper aux valeurs de \`main_category\` / \`categories\` correspondantes (« hôtel/hotel/riad/maison d'hôtes/guesthouse » → Hébergement / Hôtellerie ; « restaurant » → Restauration ; etc.).
   (b) **Retirer systématiquement** de la réponse tout établissement dont \`main_category\` (ou \`categories\`) correspond à un terme exclu, même s'il possède l'attribut positif demandé (ex. un hôtel avec rooftop bar est exclu si le membre a dit « pas un hôtel »).
   (c) Ne jamais relâcher l'exclusion (« je te propose quand même quelques hôtels avec bar… ») — respecte-la à la lettre.
   (d) Même filtre strict pour show_on_map. Si le filtre vide la liste, dis-le et propose d'élargir ; ne réintroduis pas les exclus par défaut.

17. **HÉRITAGE DU CONTEXTE SUR REFINEMENT** : quand la nouvelle question du membre est courte, pronom-only ou implicite (« lequel ? », « et le meilleur pour dîner ? », « lequel a la meilleure ambiance le soir ? », « le moins cher ? », « et sur la carte ? »), tu dois **hériter de TOUTES les contraintes explicites** posées dans les tours précédents (catégorie, ville/quartier, mots-clés composés comme « rooftop bar », exclusions comme « pas d'hôtel », landmark « vue Koutoubia », gamme de prix, ambiance…). Concrètement :
   (a) Reconstruis mentalement la requête complète en fusionnant l'ancien contexte + le nouveau critère (ex. tour N-1 « rooftop bar à Marrakech pas d'hôtel » + tour N « lequel a la meilleure ambiance le soir ? » = recherche « rooftop bar à Marrakech, pas d'hôtel, meilleure ambiance le soir »).
   (b) Ré-appelle search_businesses avec le \`query\` fusionné, puis applique les Règles 14/15/16 sur le résultat. N'utilise JAMAIS les résultats précédents comme cache — refais la recherche.
   (c) Si tu n'es pas sûr d'une contrainte, garde-la plutôt que la perdre. En cas de doute réel, demande une confirmation courte au membre AVANT de lancer une nouvelle recherche appauvrie.

${languageInstruction}`;


    // Strip SHOW_ON_MAP markers (huge JSON payloads with images) from prior assistant
    // messages before sending them back to the LLM. Otherwise the model:
    //  1) bloats its context with URLs/coords it doesn't need,
    //  2) tends to echo/regurgitate a truncated marker in its next reply,
    //     which the client-side regex can't match and displays as raw JSON.
    const sanitizedMessages: Msg[] = messages.map((m) =>
      m.role === "assistant" && typeof m.content === "string"
        ? { ...m, content: m.content
            .replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "")
            .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
            .replace(/<!--SEARCH_RESULTS:[\s\S]*?-->/g, "")
            .replace(/<!--SEARCH_RESULTS:[\s\S]*$/g, "")
            .replace(/<!--OPEN_BOOKING:[\s\S]*?-->/g, "")
            .replace(/<!--OPEN_BOOKING:[\s\S]*$/g, "")
            .replace(/<!--BLOG_CARDS:[\s\S]*?-->/g, "")
            .replace(/<!--BLOG_CARDS:[\s\S]*$/g, "")
            .replace(/<!--BLOG_CTX:[\s\S]*?-->/g, "")
            .replace(/<!--BLOG_CTX:[\s\S]*$/g, "")
            .trim() }
        : m
    );

    // ============= Blog RAG injection =============
    // Extract most recent BLOG_CTX marker from assistant history and inject the
    // linked blog posts' content into the system prompt. Persistent scope: as
    // long as the marker exists in a prior turn, the LLM answers grounded on
    // those articles. Selecting a new suggestion overwrites BLOG_CTX naturally.
    let blogGrounding = "";
    try {
      const CTX_RE = /<!--BLOG_CTX:([\s\S]*?)-->/g;
      let lastCtxIds: string[] = [];
      for (const m of messages) {
        if (m.role !== "assistant" || typeof m.content !== "string") continue;
        let match: RegExpExecArray | null;
        CTX_RE.lastIndex = 0;
        while ((match = CTX_RE.exec(m.content)) !== null) {
          try {
            const arr = JSON.parse(match[1]);
            if (Array.isArray(arr) && arr.length) lastCtxIds = arr.map(String);
          } catch { /* ignore */ }
        }
      }
      if (lastCtxIds.length) {
        const { data: ctxPosts } = await admin
          .from("blog_posts")
          .select("id,slug,title_fr,title_en,title_ar,tldr_fr,tldr_en,tldr_ar,content_fr,content_en,content_ar")
          .in("id", lastCtxIds)
          .eq("is_published", true);
        if (ctxPosts && ctxPosts.length) {
          const byId = new Map(ctxPosts.map((p: any) => [p.id, p]));
          const ordered = lastCtxIds.map((id) => byId.get(id)).filter(Boolean) as any[];
          const stripHtml = (s: string | null | undefined) =>
            String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const pickT = (p: any) => (lang === "en" ? p.title_en : lang === "ar" ? p.title_ar : p.title_fr) || p.title_fr;
          const pickL = (p: any) => (lang === "en" ? p.tldr_en : lang === "ar" ? p.tldr_ar : p.tldr_fr) || "";
          const pickC = (p: any) => (lang === "en" ? p.content_en : lang === "ar" ? p.content_ar : p.content_fr) || p.content_fr || "";
          // Cap each article to ~6k chars to keep the context reasonable.
          const chunks = ordered.map((p) => {
            const body = stripHtml(pickC(p)).slice(0, 6000);
            const tldr = stripHtml(pickL(p));
            return `### ARTICLE — ${pickT(p)} (slug: ${p.slug})\n${tldr ? `TL;DR: ${tldr}\n` : ""}${body}`;
          });
          blogGrounding =
            "\n\n=== CONTEXTE BLOG (articles liés à la suggestion sélectionnée) ===\n" +
            "Tu as accès au contenu intégral des articles ci-dessous. Utilise-les en priorité pour répondre aux questions du membre sur ce sujet, cite-les naturellement (« comme expliqué dans notre article X »), et renvoie vers /blog/<slug> quand c'est pertinent. Ne re-liste PAS les cartes des articles : elles sont déjà affichées.\n\n" +
            chunks.join("\n\n---\n\n") +
            "\n=== FIN CONTEXTE BLOG ===\n";
          turnLog.intent_classified = (turnLog.intent_classified ? turnLog.intent_classified + "|" : "") + `blog_rag:${ordered.length}`;
        }
      }
    } catch (e) { console.error("blog RAG injection error", e); }

    const convo: Msg[] = [{ role: "system", content: system + blogGrounding }, ...sanitizedMessages];
    const ctx = { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang };


    // Tool-calling loop (max 4 iterations — reduced from 6 for cost control)
    let finalAnswer = "";
    let modelToUse = MODEL;
    const mapPayloads: Array<{ title?: string; businesses: any[] }> = [];
    let lastSearchSlugs: string[] = [];
    let lastSearchNames: string[] = [];
    let lastSearchTitle: string | undefined;
    let lastSearchSnapshot: PreviousSearchSnapshot | null = null;
    let lastEventsSnapshot: { title?: string; city?: string | null; events: any[] } | null = null;
    // Accumulate businesses seen during the tool loop → seed client's lookup map
    // and remove the client-side fuzzy DB roundtrips on `**Name**` clicks.
    const knownBusinessesMap = new Map<string, { id: string; slug: string | null; name: string }>();
    let editorialInjected = false;
    const addKnown = (b: any) => {
      if (!b?.id || !b?.name) return;
      const key = String(b.name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!key || knownBusinessesMap.has(key)) return;
      knownBusinessesMap.set(key, { id: b.id, slug: b.slug || null, name: b.name });
    };
    // Per-turn tool gating : si la requête utilisateur mentionne un TYPE DE LIEU
    // sans marqueur événementiel explicite, on retire search_events du menu pour
    // empêcher le LLM de rester bloqué en mode agenda.
    const venueOnly = VENUE_NOUN_RE.test(lastUserMsg || "") && !EXPLICIT_EVENT_RE.test(lastUserMsg || "");
    const turnTools = venueOnly ? tools.filter((t: any) => t?.function?.name !== "search_events") : tools;
    for (let i = 0; i < 4; i++) {
      const resp = await fetchAiGateway(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToUse, messages: convo, tools: turnTools, tool_choice: "auto", temperature: 0.5, max_tokens: 1800, frequency_penalty: 0.6, presence_penalty: 0.3 }),
      }, {
        supabase: admin,
        userId: callerContext.userId,
        affiliateId: callerContext.affiliateId,
        chatId: chatId || null,
        context: "club-ai-chat",
        model: modelToUse,
        metadata: { iteration: i, active_city: clientContext?.activeCity || null },
      });

      if (resp.status === 429) { emit({ type: "error", message: "rate_limit", status: 429 }); return; }
      if (resp.status === 402) { emit({ type: "error", message: "credits_exhausted", status: 402 }); return; }
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("gateway error", resp.status, txt);
        // Fallback once on pro model failure
        if (modelToUse === MODEL) { modelToUse = FALLBACK_MODEL; continue; }
        emit({ type: "error", message: "gateway_error", status: 500 });
        return;
      }

      const data = await resp.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls && choice.tool_calls.length) {
        convo.push({ role: "assistant", content: choice.content || "", tool_calls: choice.tool_calls });
        for (const tc of choice.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {/* noop */}
          const result = await runTool(tc.function?.name, args, ctx);
          if (tc.function?.name === "show_on_map" && (result as any)?.ok && Array.isArray((result as any).businesses) && (result as any).businesses.length) {
            mapPayloads.push({ title: args.title, businesses: (result as any).businesses });
          }
          if (tc.function?.name === "show_on_map" && (result as any)?.ok && Array.isArray((result as any).businesses)) {
            for (const b of (result as any).businesses) addKnown(b);
          }
          if (tc.function?.name === "search_businesses" && Array.isArray((result as any)?.results) && (result as any).results.length) {
            for (const b of (result as any).results) addKnown(b);
            lastSearchNames = (result as any).results.map((r: any) => r.name).filter(Boolean);
            lastSearchSlugs = (Array.isArray((result as any).map_slugs) && (result as any).map_slugs.length
              ? (result as any).map_slugs
              : (result as any).results.map((r: any) => r.slug)
            ).filter(Boolean).slice(0, SEARCH_RESULT_LIMIT);
            lastSearchTitle = args.query || args.city || undefined;
            lastSearchSnapshot = {
              title: lastSearchTitle,
              slugs: lastSearchSlugs,
              returnedCount: Number((result as any).returned_count) || (result as any).results.length,
              totalCount: Number((result as any).total_count) || lastSearchSlugs.length,
            };
          }
          if (tc.function?.name === "search_events" && Array.isArray((result as any)?.results) && (result as any).results.length) {
            lastEventsSnapshot = {
              title: args.query || args.city || undefined,
              city: args.city || null,
              events: (result as any).results.map((e: any) => ({
                id: e.id,
                name: e.name,
                hook: e.hook || null,
                start_date: e.start_date || null,
                end_date: e.end_date || null,
                days_of_week: e.days_of_week || null,
                start_time: e.start_time || null,
                end_time: e.end_time || null,
                city: e.city || null,
                neighborhood: e.neighborhood || null,
                url: e.url || null,
                default_business_id: e.default_business_id || null,
                image: (Array.isArray(e.images) && e.images[0]) || e.logo_url || null,
                video: (Array.isArray(e.videos) && e.videos[0]) || null,
                sort_order: e.sort_order ?? null,
              })),
            };
          }
          convo.push({ role: "tool", tool_call_id: tc.id, name: tc.function?.name, content: JSON.stringify(result) });
        }

        // Contexte éditorial partagé (TXT IA + popups d'images + offres), injecté
        // une seule fois par tour dès que des établissements réels sont connus.
        if (!editorialInjected && knownBusinessesMap.size) {
          editorialInjected = true;
          try {
            const known = [...knownBusinessesMap.values()].slice(0, 12);
            const nameById: Record<string, string> = {};
            for (const b of known) nameById[b.id] = b.name;
            const bundle = await loadEditorialBundle(admin, {
              businessIds: known.map((b) => b.id),
              perBusiness: 5,
              limit: 12,
              lang,
            });
            const editorialCtx = formatEditorialBundle(bundle, nameById);
            if (editorialCtx) {
              convo.push({
                role: "system",
                content:
                  "CONTEXTE ÉDITORIAL DES ÉTABLISSEMENTS ([DESCRIPTION] description de l'établissement, [HOOK] accroche, [IMAGE POPUP] titres et textes des photos, [OFFRE] offres et promotions, [SERVICE] services, [TXT IA] textes rédigés par l'établissement/affilié ; intègre-les naturellement pour enrichir tes descriptions, n'invente rien, et ne mets pas en avant un établissement uniquement parce qu'il a du contenu ici) :\n" +
                  editorialCtx,
              });
              const counts = (type: string) => bundle.items.filter((i: any) => i.type === type).length;
              console.log(
                `[club] Editorial ctx: ${counts("description")} desc, ${counts("hook")} hooks, ${counts("popup")} popups, ${counts("offer")} offres, ${counts("service")} services, ${counts("text")} TXT IA (${known.length} businesses)`,
              );
            }
          } catch (e) {
            console.error("[club] editorial_ctx_error", String(e));
          }
        }
        continue;
      }

      finalAnswer = (choice.content || "").trim();
      // Degeneracy guard: if the model emitted a single token looped many times, retry once on fallback.
      const degenerate = /(\b\w{3,}\b)(\s*\1){15,}/i.test(finalAnswer) || /(.{3,40}?)\1{10,}/.test(finalAnswer);
      if (degenerate && modelToUse !== "google/gemini-3-pro-preview") {
        console.warn("degenerate output detected, upgrading to pro model");
        modelToUse = "google/gemini-3-pro-preview";
        finalAnswer = "";
        continue;
      }
      break;
    }

    // ── Filet de sécurité classifieur B ──────────────────────────────────────
    // Le classifieur reste SANS autorité sur le routage. Il n'intervient qu'ici,
    // quand la boucle d'outils a terminé avec ZÉRO établissement : il n'y a donc
    // rien à dégrader. On relance une recherche déterministe avec ses champs
    // (category / city / exclude) au lieu de laisser une réponse « 0 résultat ».
    if (!lastSearchSlugs.length) {
      try {
        const clfRes = clubClassifierPromise ? await clubClassifierPromise : null;
        // classify() renvoie { output, tokensIn, ... } : la classification est dans .output
        const clf: any = (clfRes as any)?.output ?? clfRes ?? null;
        const conf = Number(clf?.confidence ?? 0);
        const cat = String((clf as any)?.category || "").trim();
        console.log("club classifier rescue gate:", JSON.stringify({ intent: clf?.intent ?? null, cat, conf, city: clf?.city ?? null, exclude: clf?.exclude ?? [] }));
        if (clf && clf.intent === "search" && conf >= 0.8 && cat) {
          const excludes: string[] = Array.isArray((clf as any).exclude)
            ? (clf as any).exclude.map((e: any) => String(e || "").trim()).filter(Boolean)
            : [];
          const rescueCity = String((clf as any).city || activeCityClean || "").trim();
          const rescueQuery = [cat, rescueCity].filter(Boolean).join(" ");
          const rescue = await runTool(
            "search_businesses",
            { query: cat, category: cat, city: rescueCity || undefined, limit: 30 },
            { userId: user.id, supabase: admin, lastUserMessage: rescueQuery, language: lang, forceQuery: rescueQuery },
          ) as any;

          const norm = (s: any) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const excludeTokens = excludes.flatMap((e) => {
            const n = norm(e);
            return n.startsWith("hotel") ? ["hotel", "riad", "maison d hotes", "guest house"] : [n];
          });
          let rescued: any[] = Array.isArray(rescue?.results) ? rescue.results : [];
          if (excludeTokens.length) {
            rescued = rescued.filter((r: any) => {
              const hay = norm([r.main_category, ...(Array.isArray(r.categories) ? r.categories : []), r.name].join(" | "));
              return !excludeTokens.some((t) => t && hay.includes(t));
            });
          }

          console.log("club classifier rescue:", JSON.stringify({ cat, rescueCity, excludes, raw: Array.isArray(rescue?.results) ? rescue.results.length : 0, kept: rescued.length, conf }));

          if (rescued.length >= 1) {
            const top = rescued.slice(0, 5);
            const hookField = lang === "en" ? "hook_en" : lang === "ar" ? "hook_ar" : "hook_fr";
            const totalCount = rescued.length;
            for (const b of rescued) addKnown(b);
            lastSearchNames = rescued.map((r: any) => r.name).filter(Boolean);
            lastSearchSlugs = rescued.map((r: any) => r.slug).filter(Boolean);
            lastSearchTitle = rescueQuery.slice(0, 120);
            lastSearchSnapshot = {
              title: lastSearchTitle,
              slugs: lastSearchSlugs.slice(0, SEARCH_RESULT_LIMIT),
              returnedCount: top.length,
              totalCount,
            };
            const catLabel = cat;
            const intro = lang === "en"
              ? `Here is a selection of ${catLabel}${rescueCity ? ` in ${rescueCity}` : ""}:`
              : lang === "ar"
              ? `هذه مجموعة مختارة${rescueCity ? ` في ${rescueCity}` : ""}:`
              : `Voici une sélection de ${catLabel}${rescueCity ? ` à ${rescueCity}` : ""} :`;
            finalAnswer = `${intro}\n\n${top.map((r: any) =>
              `- **${r.name}**${r.neighborhood ? ` — ${r.neighborhood}` : ""}${r[hookField] ? ` · ${String(r[hookField]).slice(0, 140)}` : ""}`
            ).join("\n")}\n\n**${top.length} résultats affichés sur ${totalCount} trouvés**`;
            // pas d'emit ici : finalAnswer est diffusé plus bas (émission unique).
            turnLog.fallback_reason = "classifier_rescue";
            turnLog.results_count = totalCount;
            turnLog.results_shown = top.length;
          }
        }
      } catch (e) {
        console.warn("club classifier rescue failed", e);
      }
    }




    // Safety net: si l'utilisateur a explicitement demandé une carte mais le modèle
    // n'a pas appelé show_on_map, on l'injecte automatiquement à partir des derniers
    // résultats de search_businesses.
    if (!mapPayloads.length && lastSearchSlugs.length >= 2 && MAP_TRIGGER_RE.test(lastUserMsg || "")) {
      try {
        const forced = await runTool("show_on_map", { business_slugs: lastSearchSlugs.slice(0, SEARCH_RESULT_LIMIT), title: lastSearchTitle }, ctx);
        if ((forced as any)?.ok && Array.isArray((forced as any).businesses) && (forced as any).businesses.length) {
          mapPayloads.push({ title: lastSearchTitle, businesses: (forced as any).businesses });
        }
      } catch (e) { console.warn("auto show_on_map failed", e); }
    }

    // Append map markers (hidden HTML comment) for the client to render slide-panel + mini-card.
    if (mapPayloads.length && finalAnswer) {
      for (const p of mapPayloads) {
        const safe = JSON.stringify(p).replace(/-->/g, "--&gt;");
        finalAnswer += `\n\n<!--SHOW_ON_MAP:${safe}-->`;
      }
    }


    // Safety net: if the model exited tool loop without producing prose, force a final synthesis call without tools.
    if (!finalAnswer) {
      try {
        const finalResp = await fetchAiGateway(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            messages: [...convo, { role: "user", content: lang === "en" ? "Now synthesize a clear, warm reply for the member in English, based only on the tool results above. If nothing usable, politely propose a reformulation." : lang === "ar" ? "الآن قدّم جواباً واضحاً ودافئاً للعضو بالعربية، بالاعتماد فقط على نتائج الأدوات أعلاه. إذا لم يكن هناك شيء مفيد، اقترح إعادة صياغة مؤدباً." : "Synthétise maintenant une réponse claire et chaleureuse pour le membre, en français, en t'appuyant uniquement sur les résultats d'outils ci-dessus. Si aucun résultat exploitable, propose poliment une reformulation." }],
            temperature: 0.4,
            max_tokens: 1500,
          }),
        }, {
          supabase: admin,
          userId: callerContext.userId,
          affiliateId: callerContext.affiliateId,
          chatId: chatId || null,
          context: "club-ai-chat",
          model: FALLBACK_MODEL,
          metadata: { fallback: true, active_city: clientContext?.activeCity || null },
        });
        if (finalResp.ok) {
          const fd = await finalResp.json();
          finalAnswer = (fd.choices?.[0]?.message?.content || "").trim();
        }
      } catch (e) {
        console.error("final synthesis error", e);
      }
      if (!finalAnswer) {
        finalAnswer = "Désolé, je n'ai pas pu formuler de réponse cette fois-ci. Peux-tu reformuler ta demande (ville, type de cuisine, quartier) ?";
      }
    }

    finalAnswer = correctVisibleResultCount(finalAnswer, lastSearchNames);

    if (lastSearchSnapshot && finalAnswer && !finalAnswer.includes("<!--SEARCH_RESULTS:")) {
      const safe = JSON.stringify(lastSearchSnapshot).replace(/-->/g, "--&gt;");
      finalAnswer += `\n\n<!--SEARCH_RESULTS:${safe}-->`;
    }

    if (lastEventsSnapshot && finalAnswer && !finalAnswer.includes("<!--EVENTS_SNAPSHOT:")) {
      const safe = JSON.stringify(lastEventsSnapshot).replace(/-->/g, "--&gt;");
      finalAnswer += `\n\n<!--EVENTS_SNAPSHOT:${safe}-->`;
    }

    // Server-side slug resolution: for every **Name** in the answer, resolve to
    // {id, slug, name} once and emit a KNOWN_BUSINESSES marker. The client seeds
    // its lookup map from this and skips fuzzy DB roundtrips on click.
    if (finalAnswer) {
      try {
        const LABELS = new Set([
          "ambiance","atmosphère","atmosphere","cuisine","musique","musique live","décoration","decoration",
          "localisation","adresse","horaires","prix","tarifs","budget","carte","menu","services","accès","acces",
          "réservation","reservation","contact","téléphone","telephone","site web","website","note","avis",
          "vibe","food","drinks","music","location","price","hours","booking","phone","conclusion","résumé","resume",
        ]);
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[:*]+$/g, "").trim();
        const visible = finalAnswer
          .replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "")
          .replace(/<!--SEARCH_RESULTS:[\s\S]*?-->/g, "")
          .replace(/<!--EVENTS_SNAPSHOT:[\s\S]*?-->/g, "");
        const candidateSet = new Set<string>();
        const rawMatches = Array.from(visible.matchAll(/\*\*([^*\n]{3,80})\*\*/g));
        for (const m of rawMatches) {
          const raw = m[1].trim();
          if (raw.length < 4) continue;
          if (LABELS.has(normalize(raw))) continue;
          candidateSet.add(raw);
        }
        // Split unresolved from resolved-via-tool-loop
        const unresolved: string[] = [];
        for (const name of candidateSet) {
          if (!knownBusinessesMap.has(normalize(name))) unresolved.push(name);
        }
        // Batched DB fallback: cap at 20 lookups per turn, exact-match on name (case-insensitive)
        if (unresolved.length) {
          const capped = unresolved.slice(0, 20);
          const { data: rows } = await admin
            .from("businesses")
            .select("id,slug,name")
            .eq("is_active", true)
            .in("name", capped);
          for (const r of rows || []) addKnown(r);
          // For the remaining truly unresolved, try one ilike per name (max 10)
          const stillMissing = capped.filter((n) => !knownBusinessesMap.has(normalize(n))).slice(0, 10);
          for (const n of stillMissing) {
            const { data: fuzzy } = await admin
              .from("businesses")
              .select("id,slug,name")
              .eq("is_active", true)
              .ilike("name", n)
              .limit(1);
            if (fuzzy && fuzzy[0]) addKnown(fuzzy[0]);
          }
        }
        if (knownBusinessesMap.size) {
          const list = Array.from(knownBusinessesMap.values());
          const safe = JSON.stringify(list).replace(/-->/g, "--&gt;");
          finalAnswer += `\n\n<!--KNOWN_BUSINESSES:${safe}-->`;
          turnLog.results_shown = turnLog.results_shown ?? list.length;
        }
      } catch (e) {
        console.warn("KNOWN_BUSINESSES resolution failed", e);
      }
    }


    // Persist conversation
    const userTurns = messages.filter((m) => m.role === "user");
    const lastUser = userTurns[userTurns.length - 1]?.content || "";
    const newMessages = [...messages, { role: "assistant", content: finalAnswer }];

    let resultChatId: string | null = null;
    if (chatId) {
      // Only update when the chat still exists for this user — otherwise
      // (deleted client-side, stale URL, etc.) fall through to INSERT so we
      // never "resurrect" a deleted conversation under its old id.
      const { data: existing } = await admin
        .from("ai_chats")
        .select("id")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
        resultChatId = chatId;
      }
    }
    if (!resultChatId) {
      const title = lastUser.slice(0, 200) || "Nouvelle conversation";
      const { data: inserted } = await admin
        .from("ai_chats")
        .insert({ user_id: user.id, kind: "club", title, messages: newMessages })
        .select("id")
        .single();
      resultChatId = inserted?.id ?? null;
    }

    // Generate 3 contextual follow-up suggestions (best-effort, non-blocking on failure)
    let followups: string[] = [];
    try {
      const lang = (language || "fr").toLowerCase();
      const langLabel = lang === "en" ? "English" : lang === "ar" ? "Arabic" : "French";
      const DEFAULT_FOLLOWUP_PROMPT = `You generate exactly 3 short, natural follow-up questions the user might ask next, in {{LANG_LABEL}}. Each under 90 chars, no numbering, no quotes, one per line.

CRITICAL — each follow-up MUST be SELF-CONTAINED and carry forward ALL explicit constraints from the current conversation (category, city/area, keywords like "rooftop bar", exclusions like "pas d'hôtel", landmark like "vue Koutoubia", ambiance, etc.). A short pronoun-only question like "Lequel a la meilleure ambiance le soir ?" is FORBIDDEN — rewrite it as "Quel rooftop bar (pas hôtel) à Marrakech a la meilleure ambiance le soir ?".

STRICTLY FORBIDDEN — never propose a follow-up about price, budget, tariff, "moins cher / cheaper / plus économique / le meilleur rapport qualité prix". Pricing data is only known for a few hotels/riads and cannot be filtered on. Prefer follow-ups about opening now, map view, neighborhood, ambiance, agenda/events, alternatives similar in style.

The user will click ONE of these as a new turn and prior constraints must be re-searchable from the question alone. Return ONLY the 3 lines.`;
      let followupTemplate = DEFAULT_FOLLOWUP_PROMPT;
      try {
        const { data: cfg } = await admin.from("ai_config").select("value").eq("key", "club_followup_prompt").maybeSingle();
        if (cfg?.value && typeof cfg.value === "string" && cfg.value.trim().length > 20) followupTemplate = cfg.value;
      } catch (_) { /* fallback */ }
      const followupSystem = followupTemplate.replace(/\{\{LANG_LABEL\}\}/g, langLabel);
      const priorTurns = messages.filter((m: any) => m.role === "user").slice(-4).map((m: any) => `- ${String(m.content).slice(0, 200)}`).join("\n");
      const lastAssistant = finalAnswer.replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "").slice(0, 1200);
      const lastUserMsg = lastUser.slice(0, 400);
      const sessionMem = buildSessionMemory(messages, clientContext?.activeCity);
      const memLine = `SESSION MEMORY (deterministic, carry forward): city=${sessionMem.city || "?"} · topic=${sessionMem.topic || "?"} · landmark=${sessionMem.landmark || "?"} · exclusions=[${sessionMem.exclusions.join(", ") || "?"}] · keywords=[${sessionMem.keywords.join(", ") || "?"}]`;
      const fResp = await fetchAiGateway(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages: [
            { role: "system", content: followupSystem },
            { role: "user", content: `${memLine}\n\nRecent user turns (oldest→newest):\n${priorTurns}\n\nLatest user question: ${lastUserMsg}\n\nAssistant answered: ${lastAssistant}\n\nGive 3 self-contained follow-up questions that keep every explicit constraint. NEVER mention price/budget/cheaper.` },
          ],
          temperature: 0.8,
          max_tokens: 200,
        }),
      }, {
        supabase: admin,
        userId: callerContext.userId,
        affiliateId: callerContext.affiliateId,
        chatId: resultChatId || chatId || null,
        context: "club-ai-chat-followups",
        model: FALLBACK_MODEL,
        metadata: { active_city: clientContext?.activeCity || null, session_memory: sessionMem },
      });
      if (fResp.ok) {
        const fData = await fResp.json();
        const raw = fData?.choices?.[0]?.message?.content || "";
        const PRICE_RE = /\b(prix|tarif|tarifs|budget|budgets|moins\s+cher|plus\s+cher|pas\s+cher|économique|economique|cheap|cheaper|price|expensive|affordable|rapport\s+qualit[ée]\s*[/\-]?\s*prix|سعر|أرخص)\b/i;
        followups = raw
          .split("\n")
          .map((s: string) => s.replace(/^[-*\d.)\s]+/, "").replace(/^["'«»]+|["'«»]+$/g, "").trim())
          .filter((s: string) => s && s.length > 3 && s.length < 120 && !PRICE_RE.test(s))
          .slice(0, 3);
      }
      // Deterministic fallback if the LLM returned nothing usable
      if (!followups.length) {
        followups = buildDeterministicFollowups("tool_loop", sessionMem, lang);
      }
    } catch (e) {
      console.error("followup gen error", e);
      try {
        followups = buildDeterministicFollowups("tool_loop", buildSessionMemory(messages, clientContext?.activeCity), (language || "fr").toLowerCase());
      } catch { /* keep empty */ }
    }


    if (turnLog.route_taken === "unknown") turnLog.route_taken = "tool_loop";
    // Non-streamed path: emit the answer as a single chunk then done.
    emit({ type: "chunk", delta: String(finalAnswer || "").split(/<!--/)[0] });
    emit({ type: "done", answer: finalAnswer, chatId: resultChatId, followups });
    return;
  } catch (e) {
    console.error(e);
    turnLog.had_error = true;
    turnLog.error_message = String(e).slice(0, 500);
    emit({ type: "error", message: String(e), status: 500 });
    return;
  } finally {
    try {
      if (adminForLog) {
        turnLog.latency_ms_total = Date.now() - turnStartMs;
        // Le classifieur tourne en parallèle depuis le début du fourre-tout : il
        // est en principe déjà résolu. Garde-fou 2 s pour ne jamais retarder la
        // fermeture du flux si le gateway traîne.
        let clf: ClassifyResult | null = null;
        if (clubClassifierPromise) {
          clf = await Promise.race([
            clubClassifierPromise,
            new Promise<null>((r) => setTimeout(() => r(null), 2000)),
          ]).catch(() => null);
        }
        try { classifyTurn(turnLog, MODEL, clf); } catch (e) { console.error("classifyTurn failed", e); }
        // Fire-and-forget — never block the response on log persistence
        adminForLog.from("ai_conversation_turns").insert(turnLog).then(
          ({ error }: any) => { if (error) console.error("turnLog insert failed", error.message); },
          (err: any) => console.error("turnLog insert threw", err)
        );
      }
    } catch (logErr) {
      console.error("turnLog finally block error", logErr);
    }
    closeStream();
  }
  })();
  // Don't await — return the stream immediately.
  void work;

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
