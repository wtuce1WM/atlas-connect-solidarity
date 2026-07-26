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

function isNearbyOverviewIntent(text: string): boolean {
  const q = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!q) return false;
  if (/que faire.*(proximite|autour)/.test(q)) return true;
  if (/what to do.*(nearby|around|near me)/.test(q)) return true;
  if (/ما(ذا)?.*(قرب|حول)/.test(q)) return true;
  return false;
}

function haversineKmLocal(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      .map((m: any) => ({ role: m.role, content: extractTextFromUIMessage(m).slice(0, 4000) }));

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

        // Resolve host business
        let bizQ = admin
          .from("businesses")
          .select("id, slug, name, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, opening_hours, latitude, longitude, is_active")
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
        if (suggestionId) {
          try {
            const { data: sugg } = await admin
              .from("embed_ai_suggestions")
              .select("subcategory_ids, badge_ids, business_ids, mode")
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
          } catch (e) {
            console.error("[embed-ai-chat] suggestion_route_lookup_error", e);
          }
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
              let filtered = await filterOutClosed([...pinnedFromAll, ...(await filterOutCompetitors(nonPinned))]);

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

              const totalFound = filtered.length;
              const results = filtered.slice(0, limit);
              if (!results.length) {
                return { results: [], total_shown: 0, total_found: 0, total_count: 0, city, disclosure_note: buildDisclosureFromCounts(0, 0, city), note: `Aucun établissement complémentaire trouvé pour "${fullQuery}" à ${city}.` };
              }
              const disclosure = buildDisclosureFromCounts(results.length, totalFound, city);
              return {
                results: results.map((b: any) => ({
                  id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood,
                  main_category: b.main_category, hook_fr: b.hook_fr, hook_en: b.hook_en, hook_ar: b.hook_ar,
                  latitude: b.latitude, longitude: b.longitude,
                  price_range: b.manual_price_range || (b.min_price ? `${b.min_price}+ MAD` : null),
                  is_pinned: suggestionPinnedIds.includes(b.id),
                  pin_rank: suggestionPinnedIds.includes(b.id) ? suggestionPinnedIds.indexOf(b.id) + 1 : null,
                })),
                total_shown: results.length,
                total_found: totalFound,
                total_count: results.length,
                city,
                disclosure_note: disclosure,
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
        const forcedNearby = followupRadiusKm != null;
        if (forcedNearby || isNearbyOverviewIntent(userMessage)) {
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
          const hostName = (host as any).name || "cet établissement";
          convo.push({
            role: "system",
            content: `RÉSULTATS ONE WORLD MOROCCO OBLIGATOIRES POUR CETTE RÉPONSE (route déterministe events, ville ${host.city || "Marrakech"}, période ${from} → ${to}, badge #Agenda):\n${JSON.stringify(forcedResult).slice(0, 12000)}\n\nFORMAT DE RÉPONSE OBLIGATOIRE :\n1. Ouvre par une phrase d'accroche immersive mentionnant **${hostName}** comme point de départ pour explorer la scène de ${host.city || "Marrakech"} ce week-end.\n2. Présente ensuite CHAQUE événement listé ci-dessus (dans l'ordre) sous forme d'un court paragraphe immersif de 2 à 3 phrases : nomme l'événement en **gras**, précise la date/récurrence et le quartier s'ils existent, décris l'ambiance à partir de hook/description UNIQUEMENT. Pas d'invention.\n3. Si aucun événement : dis-le franchement et propose une relance (autre ville, période plus large).\n4. Termine par UNE question de relance courte.\nRecommande uniquement des événements listés ci-dessus. Réponds dans la même langue que la question de l'utilisateur.`,
          });
        } else if (deterministicSubcategoryNames || deterministicBadgeIds) {
          const forcedArgs: any = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          if (deterministicSubcategoryNames) forcedArgs._subcategoryNames = deterministicSubcategoryNames;
          if (deterministicBadgeIds) forcedArgs._badgeIds = deterministicBadgeIds;
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          const routeDesc = [
            deterministicSubcategoryNames ? `sous-catégories ${deterministicSubcategoryNames.join(", ")}` : null,
            deterministicBadgeIds ? `${deterministicBadgeIds.length} badge(s)` : null,
          ].filter(Boolean).join(" + ");
          convo.push({
            role: "system",
            content: `RÉSULTATS ONE WORLD MOROCCO OBLIGATOIRES POUR CETTE RÉPONSE (route déterministe sur ${routeDesc}):\n${JSON.stringify(forcedResult).slice(0, 12000)}\n${pinnedNames.length ? `ORDRE PRIORITAIRE MANUEL À RESPECTER ABSOLUMENT: cite d'abord ${pinnedNames.join(" puis ")}, avant tout autre résultat.` : ""}\n\nFORMAT DE RÉPONSE OBLIGATOIRE :\n1. Ouvre par une phrase d'accroche immersive (1 phrase) qui plante l'ambiance/le thème de la sélection.\n2. Présente ensuite CHAQUE résultat listé ci-dessus (dans l'ordre imposé) sous forme d'un court paragraphe immersif de 2 à 3 phrases : nomme l'adresse en **gras**, décris l'ambiance/le lieu/pourquoi y aller en t'appuyant UNIQUEMENT sur les champs du résultat (categories, neighborhood, hook, description, badges). Pas d'invention. Pas de puces sèches.\n3. Termine par la phrase exacte de disclosure_note sur sa propre ligne, suivie d'UNE question de relance courte.\nRecommande uniquement des résultats listés ci-dessus, respecte l'ordre. Réponds dans la même langue que la question de l'utilisateur.`,
          });
        } else if (shouldForceDirectorySearch(userMessage)) {
          const forcedArgs = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          convo.push({
            role: "system",
            content: `RÉSULTATS ONE WORLD MOROCCO OBLIGATOIRES POUR CETTE RÉPONSE:\n${JSON.stringify(forcedResult).slice(0, 12000)}\n${pinnedNames.length ? `ORDRE PRIORITAIRE MANUEL À RESPECTER ABSOLUMENT: cite d'abord ${pinnedNames.join(" puis ")}, avant tout autre résultat.` : ""}\n\nFORMAT DE RÉPONSE OBLIGATOIRE :\n1. Ouvre par une phrase d'accroche immersive (1 phrase).\n2. Présente ensuite CHAQUE résultat listé ci-dessus sous forme d'un court paragraphe immersif de 2 à 3 phrases : nomme l'adresse en **gras**, décris l'ambiance/le lieu/pourquoi y aller en t'appuyant UNIQUEMENT sur les champs du résultat (categories, neighborhood, hook, description, badges). Pas d'invention. Pas de puces sèches.\n3. Termine par la phrase exacte de disclosure_note sur sa propre ligne, suivie d'UNE question de relance courte.\nRecommande uniquement des résultats listés ci-dessus.`,
          });
        }

        // Tool loop (up to MAX_ROUNDS). Non-stream rounds via direct gateway fetch
        // (keeps the existing tool_calls JSON contract). Final round streamed via AI SDK.
        let finalText = "";
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const isLast = round === MAX_ROUNDS - 1;
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
            const result = streamText({
              model,
              messages: convertToModelMessages(
                convo
                  .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
                  .map((m) => ({
                    role: m.role as any,
                    parts: [{ type: "text", text: String(m.content || "") }],
                  })) as any,
              ),
              temperature: 0.7,
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
