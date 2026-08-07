import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertStaffOrAffiliateBusiness } from "../_shared/auth-helpers.ts";
import { fetchAiGateway, resolveCallerContext } from "../_shared/ai-gateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;


/**
 * Carte IA — lecture VISUELLE du/des PDF « carte / menu » liés à la fiche
 * (business_documents type menu | flipbook), comme dans /affiliates/presence
 * → TXT IA → « Liens à exploiter ». Les pictogrammes (sans gluten, végétarien…)
 * et la mise en page ne sont récupérables que par vision multimodale.
 */
async function visionReadPdf(url: string, label: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = new Uint8Array(await res.arrayBuffer());
    const isPdf = ct.includes("pdf") || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
    if (!isPdf || buf.byteLength > 18_000_000) return "";
    let b64 = "";
    const CH = 0x8000;
    for (let i = 0; i < buf.length; i += CH) b64 += String.fromCharCode(...buf.subarray(i, i + CH));
    b64 = btoa(b64);
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analyse visuellement ce document (carte / menu). Restitue en texte structuré : les sections, " +
                "les intitulés exacts des plats et boissons, les spécialités, et les mentions de régime " +
                "indiquées par pictogrammes ou légende (sans gluten, végétarien, vegan, épicé…). " +
                "N'inclus aucun prix.",
            },
            { type: "file", file: { filename: `${label}.pdf`, file_data: `data:application/pdf;base64,${b64}` } },
          ],
        }],
      }),
    });
    if (!ai.ok) return "";
    const json = await ai.json();
    return String(json?.choices?.[0]?.message?.content ?? "").slice(0, 9000);
  } catch (_e) {
    return "";
  }
}

// Templates Remotion disponibles, choisis par l'IA.
// business-showcase = template générique piloté par props (fallback universel).
const TEMPLATES = [
  { id: "business-showcase", scope: "générique", description: "Fallback universel pour tout établissement. Piloté par props (name, hook, tagline, city, images[], offer)." },
  { id: "comptoir-darna", scope: "Comptoir Darna (Marrakech)", description: "Restaurant emblématique, ambiance orientale festive." },
  { id: "riad-dar-najat", scope: "Riad Dar Najat (Marrakech)", description: "Riad d'exception, médina." },
  { id: "maison-brummell", scope: "Maison Brummell (Marrakech)", description: "Boutique-hôtel design contemporain." },
  { id: "jnane-rumi", scope: "Jnane Rumi (Marrakech)", description: "Maison d'hôtes raffinée, jardin." },
  { id: "nar-complexe", scope: "N.A.R Complexe (Marrakech)", description: "Complexe lifestyle, beach club." },
  { id: "farasha-farmhouse", scope: "Farasha Farmhouse (Marrakech)", description: "Farmhouse luxe campagne marrakchie." },
  { id: "bo-zin", scope: "Bô Zin (Marrakech)", description: "Restaurant lounge route de l'Ourika." },
  { id: "corporate-vertical", scope: "1WM corporate", description: "Vidéo institutionnelle One World Morocco (modèle économique, villes pionnières, paliers). À utiliser UNIQUEMENT pour des contenus corporate 1WM." },
];

// ---------------------------------------------------------------------------
// Widgets Météo / Marées, Vents & Météo intégrés au montage vidéo.
// Données Open-Meteo (gratuit, sans clé) résolues à la génération du scénario
// pour que le rendu Remotion reste déterministe.
// ---------------------------------------------------------------------------
const VIDEO_WIDGET_CITIES: Record<string, { name: string; lat: number; lon: number }> = {
  marrakech: { name: "Marrakech", lat: 31.6295, lon: -7.9811 },
  essaouira: { name: "Essaouira", lat: 31.5085, lon: -9.7595 },
  agadir: { name: "Agadir", lat: 30.4202, lon: -9.6119 },
  taghazout: { name: "Taghazout", lat: 30.5450, lon: -9.7100 },
  casablanca: { name: "Casablanca", lat: 33.5731, lon: -7.5898 },
  mohammedia: { name: "Mohammedia", lat: 33.7180, lon: -7.4100 },
  rabat: { name: "Rabat", lat: 34.0209, lon: -6.8416 },
  fes: { name: "Fès", lat: 34.0331, lon: -5.0003 },
  tanger: { name: "Tanger", lat: 35.7595, lon: -5.8340 },
  chefchaouen: { name: "Chefchaouen", lat: 35.1688, lon: -5.2636 },
  ouarzazate: { name: "Ouarzazate", lat: 30.9335, lon: -6.9370 },
  merzouga: { name: "Merzouga", lat: 31.0995, lon: -4.0122 },
  dakhla: { name: "Dakhla", lat: 23.6850, lon: -15.9500 },
  "el-jadida": { name: "El Jadida", lat: 33.2500, lon: -8.5200 },
  oualidia: { name: "Oualidia", lat: 32.7350, lon: -9.0400 },
  safi: { name: "Safi", lat: 32.3050, lon: -9.2600 },
  asilah: { name: "Asilah", lat: 35.4650, lon: -6.0400 },
  "sidi-ifni": { name: "Sidi Ifni", lat: 29.3800, lon: -10.1800 },
  martil: { name: "Martil", lat: 35.6180, lon: -5.2740 },
  "al-hoceima": { name: "Al Hoceïma", lat: 35.2500, lon: -3.9300 },
  saidia: { name: "Saïdia", lat: 35.0930, lon: -2.2300 },
};

function resolveWidgetCity(slug: unknown, fallback: string) {
  const key = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  return VIDEO_WIDGET_CITIES[key] ? { slug: key, ...VIDEO_WIDGET_CITIES[key] } : { slug: fallback, ...VIDEO_WIDGET_CITIES[fallback] };
}

const TZ = "Africa%2FCasablanca";

async function fetchWeatherWidget(citySlug: unknown, range: number, businessName: string, lang: string) {
  const city = resolveWidgetCity(citySlug, "marrakech");
  const days = range === 7 ? 7 : range === 3 ? 3 : 1;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    + `&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max`
    + `&forecast_days=${days}&timezone=${TZ}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = await res.json();
  const h = j.hourly ?? {};
  const times: string[] = h.time ?? [];
  const hourly = times.slice(0, 24).map((t, i) => ({
    time: t,
    hour: String(t).slice(11, 16),
    temp: Math.round(Number(h.temperature_2m?.[i] ?? 0)),
    code: Number(h.weather_code?.[i] ?? 0),
    wind: Math.round(Number(h.wind_speed_10m?.[i] ?? 0)),
    pop: Math.round(Number(h.precipitation_probability?.[i] ?? 0)),
  }));
  const d = j.daily ?? {};
  const dTimes: string[] = d.time ?? [];
  const daily = dTimes.slice(0, days).map((date, i) => ({
    date,
    code: Number(d.weather_code?.[i] ?? 0),
    tmin: Math.round(Number(d.temperature_2m_min?.[i] ?? 0)),
    tmax: Math.round(Number(d.temperature_2m_max?.[i] ?? 0)),
    pop: Math.round(Number(d.precipitation_probability_max?.[i] ?? 0)),
    wind: Math.round(Number(d.wind_speed_10m_max?.[i] ?? 0)),
  }));
  const fmtFr = (iso: string) => {
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca",
    }).format(new Date(`${iso}T12:00:00Z`));
    // "ven. 7 août 2026" → "Ven. 7 août 2026"
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const fmtEn = (iso: string) => new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca",
  }).format(new Date(`${iso}T12:00:00Z`));
  const firstDate = daily[0]?.date ?? dTimes[0] ?? new Date().toISOString().slice(0, 10);
  const lastDate = daily[daily.length - 1]?.date ?? firstDate;
  const periodFr = days === 1 ? `du ${fmtFr(firstDate)}` : `du ${fmtFr(firstDate)} au ${fmtFr(lastDate)}`;
  const periodEn = days === 1 ? `on ${fmtEn(firstDate)}` : `from ${fmtEn(firstDate)} to ${fmtEn(lastDate)}`;
  const text = lang === "en"
    ? `${businessName} brings you the weather in ${city.name} ${periodEn}.`
    : `${businessName} vous propose la météo à ${city.name} ${periodFr}.`;
  // Durée par défaut selon l'étendue : 1 jour = 5 s, 3 jours = 7 s, 7 jours = 10 s.
  const durationSec = days === 7 ? 10 : days === 3 ? 7 : 5;
  return { city: city.name, citySlug: city.slug, range: days, text, hourly, daily, durationSec };

}

async function fetchTidesWidget(citySlug: unknown, mode: string, businessName: string, lang: string) {
  const city = resolveWidgetCity(citySlug, "essaouira");
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${city.lat}&longitude=${city.lon}`
    + `&hourly=sea_level_height_msl&forecast_days=2&timezone=${TZ}`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    + `&hourly=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability`
    + `&forecast_days=2&timezone=${TZ}`;
  const [mRes, wRes] = await Promise.all([fetch(marineUrl), fetch(weatherUrl)]);
  const m = mRes.ok ? await mRes.json() : null;
  const w = wRes.ok ? await wRes.json() : null;
  const mh = m?.hourly ?? {};
  const wh = w?.hourly ?? {};
  const times: string[] = (mh.time ?? wh.time ?? []) as string[];
  const hours = times.slice(0, 24).map((t, i) => ({
    time: t,
    hour: String(t).slice(11, 16),
    sea: mh.sea_level_height_msl?.[i] != null ? Math.round(Number(mh.sea_level_height_msl[i]) * 100) / 100 : null,
    temp: wh.temperature_2m?.[i] != null ? Math.round(Number(wh.temperature_2m[i])) : null,
    code: wh.weather_code?.[i] != null ? Number(wh.weather_code[i]) : null,
    wind: wh.wind_speed_10m?.[i] != null ? Math.round(Number(wh.wind_speed_10m[i])) : null,
    gust: wh.wind_gusts_10m?.[i] != null ? Math.round(Number(wh.wind_gusts_10m[i])) : null,
    dir: wh.wind_direction_10m?.[i] != null ? Math.round(Number(wh.wind_direction_10m[i])) : null,
    pop: wh.precipitation_probability?.[i] != null ? Math.round(Number(wh.precipitation_probability[i])) : null,
  }));
  // Extrêmes de marée (pleine / basse mer) sur les 24 h
  const extremes: Array<{ hour: string; type: "high" | "low"; height: number }> = [];
  for (let i = 1; i < hours.length - 1; i++) {
    const a = hours[i - 1].sea, b = hours[i].sea, c = hours[i + 1].sea;
    if (a == null || b == null || c == null) continue;
    if (b > a && b >= c) extremes.push({ hour: hours[i].hour, type: "high", height: b });
    else if (b < a && b <= c) extremes.push({ hour: hours[i].hour, type: "low", height: b });
  }
  const allowed = new Set(["all", "tides", "wind", "weather"]);
  const safeMode = allowed.has(mode) ? mode : "all";
  // Marnage moyen de vive-eau (m) par port — base du coefficient estimé.
  const SPRING_RANGE: Record<string, number> = {
    essaouira: 2.9,
    agadir: 2.6,
    casablanca: 3.2,
    "el-jadida": 3.1,
    dakhla: 1.9,
    tanger: 2.5,
  };
  const springRange = SPRING_RANGE[String(city.slug || "").toLowerCase()] ?? 2.9;
  // Date du jour (fuseau Maroc) — affichée à la place de « sur la journée ».
  const refDay = String(times[0] ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  const dFr = new Date(`${refDay}T12:00:00`);
  const DAYS_FR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
  const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dateFr = `${DAYS_FR[dFr.getDay()]} ${dFr.getDate()} ${MONTHS_FR[dFr.getMonth()]}`;
  const dateEn = dFr.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
  const text = lang === "en"
    ? `${businessName} brings you the tides, wind and weather in ${city.name} — ${dateEn}`
    : `${businessName} vous donne les marées, les vents, la météo à ${city.name} — ${dateFr}`;
  return { city: city.name, citySlug: city.slug, mode: safeMode, text, hours, extremes: extremes.slice(0, 4), springRange, durationSec: 9, dateLabel: lang === "en" ? dateEn : dateFr };

}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, business_id, duration_sec = 30, tone = "immersif", parent_job_id, options, preview_only = false } = body;
    // Langue du montage vidéo — indépendante de la langue du header front.
    const videoLang: "fr" | "en" = options?.lang === "en" ? "en" : "fr";
    // Choisit la variante linguistique avec repli FR systématique (jamais de trou).
    const pickLang = (...vals: unknown[]): string | null => {
      for (const v of vals) {
        if (typeof v === "string" && v.trim()) return v;
      }
      return null;
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 8000) {
      return json({ error: "prompt invalide" }, 400);
    }
    const durationNum = Number(duration_sec);
    if (!Number.isFinite(durationNum) || durationNum < 5 || durationNum > 180) {
      return json({ error: "duration_sec doit être entre 5 et 180 secondes" }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Charger un éventuel job parent pour affinage (avant l'auth pour hériter de son business_id)
    let parentJob: any = null;
    if (parent_job_id && typeof parent_job_id === "string") {
      const { data } = await supa
        .from("video_jobs")
        .select("id,prompt,template_id,template_props,business_id,duration_sec,tone")
        .eq("id", parent_job_id)
        .maybeSingle();
      if (data) parentJob = data;
    }

    // Auth: staff full access, otherwise must own the business_id (résolu depuis parent si besoin)
    const authBusinessId = business_id ?? parentJob?.business_id ?? "";
    const auth = await assertStaffOrAffiliateBusiness(req, corsHeaders, authBusinessId);
    if (auth instanceof Response) return auth;
    const callerUserId = auth.userId;
    const callerContext = await resolveCallerContext(supa, callerUserId);


    // Charger le contexte établissement (par id, ou par nom détecté dans le prompt, ou hérité du parent)
    let businessContext: any = null;
    let resolved_business_id: string | null = business_id ?? parentJob?.business_id ?? null;

    // Si pas de business_id fourni, essayer de détecter un nom d'établissement dans le prompt.
    if (!resolved_business_id) {
      const quoteMatch = prompt.match(/[«"']([^»"']{3,80})[»"']/);
      const candidate = quoteMatch?.[1]?.trim();
      if (candidate) {
        const { data: matches } = await supa
          .from("businesses")
          .select("id,name")
          .ilike("name", `%${candidate}%`)
          .eq("is_active", true)
          .limit(1);
        if (matches && matches[0]) resolved_business_id = matches[0].id;
      }
    }

    if (resolved_business_id) {
      const { data: biz } = await supa
        .from("businesses")
        .select("id,name,name_en,slug,hook_fr,hook_en,destination_hook,poi_hook,description,description_en,city,neighborhood,main_category,categories,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count,google_review_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url,images,popup_image_url,getyourguide_rating,getyourguide_review_count,viator_rating,viator_review_count,avis_verifies_rating,avis_verifies_review_count,trustpilot_rating,trustpilot_review_count,kayak_rating,kayak_review_count,tourradar_rating,tourradar_review_count")
        .eq("id", resolved_business_id)
        .maybeSingle();

      const { data: docs } = await supa
        .from("business_documents")
        .select("type,url,name,description,thumbnail_url,sort_order,price,popup")
        .eq("business_id", resolved_business_id)
        .in("type", ["image", "video", "internal-video", "promotion"])
        .order("sort_order", { ascending: true })
        .limit(20);

      const mergedMedias: any[] = [];
      if (biz?.popup_image_url) mergedMedias.push({ type: "image", url: biz.popup_image_url, name: "Image principale" });
      if (Array.isArray(biz?.images)) {
        for (const url of biz.images) mergedMedias.push({ type: "image", url });
      }
      if (docs) mergedMedias.push(...docs);

      businessContext = {
        ...biz,
        // Hook STRICT : jamais de repli sur la description (sinon la scène Hook
        // reprend le texte de présentation, cf. correctif « hook vide »).
        hook: (videoLang === "en" ? pickLang(biz?.hook_en) : null)
          ?? biz?.hook_fr ?? biz?.destination_hook ?? biz?.poi_hook ?? null,
        name: (videoLang === "en" ? pickLang(biz?.name_en) : null) ?? biz?.name,
        medias: mergedMedias,
      };
    }

    // Carte IA : on nourrit le scénario avec le contenu réel des cartes / menus PDF liés.
    let menuVisionDigest = "";
    if (options?.ai_card && resolved_business_id) {
      const { data: menuRows } = await supa
        .from("business_documents")
        .select("url,name,type,sort_order")
        .eq("business_id", resolved_business_id)
        .in("type", ["menu", "flipbook"])
        .order("sort_order", { ascending: true })
        .limit(3);
      for (const d of menuRows ?? []) {
        const u = String((d as any)?.url ?? "");
        if (!/^https?:\/\//i.test(u)) continue;
        const txt = await visionReadPdf(u, String((d as any)?.name ?? "carte"));
        if (txt) menuVisionDigest += `\n--- ${(d as any)?.name ?? "Carte"} ---\n${txt}`;
        if (menuVisionDigest.length > 9000) break;
      }
      menuVisionDigest = menuVisionDigest.slice(0, 9000);
    }

    const NAMED_ENTITIES: Record<string, string> = {
      amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
      eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç",
      ugrave: "ù", ucirc: "û", icirc: "î", iuml: "ï", ocirc: "ô", euml: "ë", uuml: "ü",
      hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—",
      deg: "°", euro: "€", middot: "·", times: "×", copy: "©", reg: "®", trade: "™",
    };
    const decodeEntities = (input: string): string =>
      input
        .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
        .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[String(n).toLowerCase()] ?? m);

    const RICH_TAGS = ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li", "span", "h1", "h2", "h3", "h4"];
    /** Conserve gras / italique / listes, retire attributs et autres balises, décode les entités. */
    const sanitizeRich = (value: unknown): string | null => {
      if (typeof value !== "string" || !value.trim()) return null;
      const out = decodeEntities(
        value
          .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
          .replace(/<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi, (_m, slash, tag) =>
            RICH_TAGS.includes(String(tag).toLowerCase()) ? `<${slash}${String(tag).toLowerCase()}>` : " ",
          ),
      )
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      return out || null;
    };

    const stripHtml = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() || null;
    };


    const cleanDisplayText = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      return value
        .replace(/\bterracotta(?:é|e|s)?\b/gi, "")
        .replace(/\s+([,.:;!?])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, "")
        .trim() || null;
    };

    const deriveTaglineFromHook = (hook: string | null, name?: string | null): string => {
      const fallback = name ? `L'expérience ${name}` : "Une adresse à découvrir";
      const cleanedHook = cleanDisplayText(stripHtml(hook) ?? "");
      if (!cleanedHook) return fallback;
      const afterColon = cleanedHook.includes(":") ? cleanedHook.split(":").pop()?.trim() : cleanedHook;
      let candidate = afterColon || cleanedHook;
      if (name) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        candidate = candidate.replace(new RegExp(`\\b(au|à|chez|pour)?\\s*${escapedName}\\b`, "gi"), "");
      }
      candidate = cleanDisplayText(candidate) || cleanedHook;
      const words = candidate.split(/\s+/).filter(Boolean);
      return words.slice(0, 6).join(" ").replace(/^[a-zàâäéèêëîïôöùûüç]/, (c) => c.toUpperCase());
    };

    const hasInjectablePopup = (context: any): boolean => {
      if (!context) return false;
      if (context.popup_image_url) return true;
      return Array.isArray(context.medias) && context.medias.some((m: any) => Boolean(m?.popup));
    };

    const promptText = prompt.toLowerCase();
    const wantsReviews = Boolean(options?.reviews) || /avis client|badge des avis|note\/20|nombre d'avis|compteur d'avis/i.test(promptText);
    const wantsHours = Boolean(options?.hours) || /horaires|heures d'ouverture|ouverture de l'établissement/i.test(promptText);
    const wantsMapMarker = Boolean(options?.map_marker) || /google\s*map|marqueur de l'établissement|marqueur.*carte|localisation/i.test(promptText);
    const wantsDigitalId = Boolean(options?.digital_id) || /id numérique|fiche.*qr|qr code/i.test(promptText);
    const wantsGoogleReviews = Boolean(options?.google_reviews);
    const wantsTripAdvisor = Boolean(options?.tripadvisor);
    const wantsRestaurantGuru = Boolean(options?.restaurant_guru);
    const wantsCustomerReview = Boolean(options?.customer_review);
    const customerReviewId = typeof options?.customer_review_id === "string" ? options.customer_review_id : null;
    const customerReviewHighlight = typeof options?.customer_review_highlight === "string" ? options.customer_review_highlight.slice(0, 240) : null;
    const wantsInstallCta = Boolean(options?.install_cta) || /installer l'app|installation de l'app|incitation à installer/i.test(promptText);

    const formatOpeningHours = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === "string") return value.trim() || null;
      if (typeof value !== "object") return null;

      const dayLabels: Record<string, string> = videoLang === "en"
        ? {
            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",
            saturday: "Saturday",
            sunday: "Sunday",
          }
        : {
            monday: "Lundi",
            tuesday: "Mardi",
            wednesday: "Mercredi",
            thursday: "Jeudi",
            friday: "Vendredi",
            saturday: "Samedi",
            sunday: "Dimanche",
          };
      const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const source = value as Record<string, any>;

      const formatSlot = (day: string, raw: any) => {
        const label = dayLabels[day] ?? day;
        if (typeof raw === "string") return `${label}: ${raw}`;
        if (!raw || typeof raw !== "object") return null;
        if (raw.closed) return `${label}: ${videoLang === "en" ? "Closed" : "Fermé"}`;
        const first = raw.open && raw.close ? `${raw.open}–${raw.close}` : "";
        const second = raw.open2 && raw.close2 ? `${raw.open2}–${raw.close2}` : "";
        const hours = raw.continuous ? first : [first, second].filter(Boolean).join(" / ");
        return hours ? `${label}: ${hours}` : null;
      };

      const lines = orderedDays
        .filter((day) => day in source)
        .map((day) => formatSlot(day, source[day]))
        .filter(Boolean);

      return lines.length ? lines.join("\n") : null;
    };

    const systemPrompt = `Tu es directeur artistique pour One World Morocco. Tu choisis un template vidéo Remotion et fournis les props.

TEMPLATES DISPONIBLES :
${TEMPLATES.map(t => `- "${t.id}" — ${t.scope} : ${t.description}`).join("\n")}

RÈGLES DE CHOIX (STRICTES) :
1. Templates dédiés UNIQUEMENT si \`businessContext.name\` correspond EXACTEMENT (insensible à la casse) au scope : "Comptoir Darna", "Riad Dar Najat", "Maison Brummell", "Jnane Rumi", "N.A.R", "Farasha Farmhouse", "Bô Zin". Toute autre valeur → INTERDIT d'utiliser ces templates.
2. Si le prompt est purement corporate 1WM (sans \`businessContext\`) → "corporate-vertical".
3. DANS TOUS LES AUTRES CAS (défaut absolu) → "business-showcase" avec props complètes basées sur \`businessContext\`. NE JAMAIS substituer un autre nom d'établissement.

FORMAT DE RÉPONSE (JSON strict, AUCUN backtick) :
{
  "template_id": "business-showcase",
  "props": {
    "name": "Nom de l'établissement",
    "hook": "Hook exact de l'établissement, sans paraphrase",
    "tagline": "3 à 6 mots tirés du hook, sans ajout stylistique",
    "city": "Marrakech",
    "category": "Restaurant",
    "videos": ["url1", "url2"],
    "images": [],
    "offer": { "title": "Pass journée & déjeuner", "price": "60€ / 600 MAD", "lines": ["De 11h à 19h", "Piscine olympique 50 m", "Déjeuner produits locaux inclus", "Réservé aux adultes"], "background_video_url": null, "background_image_url": null }
  },
  "rationale": "Pourquoi ce template (1 phrase)"
}

CONTRAINTES STRICTES :
- RÈGLE MÉDIAS (ABSOLUE, s'applique à TOUS les templates) :
  1) Utilise EN PRIORITÉ les vidéos de l'établissement (medias où type="video" ou "internal-video"), triées dans l'ordre interne \`sort_order\`. Renseigne \`videos\` et laisse \`images: []\`.
  2) Si AUCUNE vidéo n'est disponible, alors et seulement alors utilise les images (medias type="image"), triées par \`sort_order\`. Renseigne \`images\` et laisse \`videos: []\`.
  3) NE JAMAIS mélanger vidéos et images dans une même vidéo : l'un OU l'autre, exclusivement.
- "videos"/"images" : UNIQUEMENT des URLs réelles tirées de \`medias\`. N'INVENTE JAMAIS d'URL.
- "offer" : renseigne-le dans DEUX cas :
  a) Une vraie promotion/prix existe dans \`medias\` (type=promotion ou champ price renseigné).
  b) L'utilisateur décrit dans son PROMPT une annonce/offre/message spécifique à afficher (prix, horaires spécifiques, conditions, contenu promo). Dans ce cas, retranscris fidèlement le message de l'utilisateur : \`title\` = accroche courte (≤60 car), \`price\` = prix si mentionné (ex : "60€ / 600 MAD"), \`lines\` = 2 à 6 lignes courtes (≤80 car chacune) reprenant les infos clés (horaires, inclusions, conditions, contact). Ne paraphrase pas au-delà du nécessaire pour tenir dans les limites.
  Sinon → \`"offer": null\`. Ne mets JAMAIS d'horaires ou de quartier dans \`offer\` s'ils ne sont pas explicitement dans le prompt utilisateur.
- "offer.background_video_url" / "offer.background_image_url" (optionnels) : si l'utilisateur demande explicitement une vidéo ou une image en FOND de la scène Offre (ex : "piscine en fond", "avec le jardin derrière"), choisis UNE URL réelle depuis \`medias\` dont le \`name\` ou la \`description\` correspond au mot-clé. Priorité à une vidéo. Sinon laisse ces champs à null.
- "name" : EXACTEMENT le nom de l'établissement fourni (champ businessContext.name).
- "hook" : utilise le champ \`hook\` du businessContext s'il existe ; sinon génère-en un court (≤80 caractères). Ne paraphrase JAMAIS le hook existant.
- "tagline" : 3 à 6 mots tirés du hook réel. N'ajoute JAMAIS de mot décoratif comme "terracotta", "bohème" ou "sauvage" s'il n'est pas déjà dans le hook.
- "city" : champ \`city\` du businessContext (sinon null).
- Pour les templates dédiés (hors business-showcase), renvoie \`"props": {}\` : ils sont hardcodés (ils respectent déjà la règle médias en interne).


OPTIONS / CONTRAINTES À ACTIVER DANS LE SCÉNARIO :
${wantsReviews ? `- Activer explicitement l'affichage des avis clients (note/20 et nombre d'avis de l'établissement).` : `- Désactiver l'affichage des avis clients.`}
${wantsHours ? `- Activer explicitement l'affichage des horaires d'ouverture de l'établissement.` : `- Désactiver les horaires.`}
${wantsMapMarker ? `- Activer explicitement la visualisation de la Google Map avec le marqueur.` : `- Désactiver le marqueur de carte.`}
${wantsDigitalId ? `- Activer une courte séquence ID numérique (fiche + partage + QR) AVANT l'incitation finale.` : `- Désactiver la séquence ID numérique.`}
${wantsInstallCta ? `- Activer l'incitation à installer l'app (One World Morocco) à la fin.` : `- Désactiver l'incitation de fin d'installation.`}

Si \`businessContext\` est null, l'établissement est introuvable dans la base : choisis quand même "business-showcase", remplis name/hook/tagline depuis le prompt utilisateur, mets \`"images": []\` et \`"offer": null\`.

LANGUE DE SORTIE (ABSOLUE) : ${videoLang === "en" ? "ANGLAIS" : "FRANÇAIS"}. Tous les textes que tu génères (hook de secours, tagline, titres et lignes d'offre, textes de scènes) doivent être rédigés en ${videoLang === "en" ? "anglais" : "français"}. N'ajoute AUCUNE traduction entre parenthèses. Les noms propres (établissement, ville, quartier) restent inchangés.

${menuVisionDigest ? `CARTE IA — CONTENU RÉEL DES CARTES / MENUS PDF LIÉS À LA FICHE (lecture visuelle) :
${menuVisionDigest}
Utilise EXCLUSIVEMENT ce contenu pour construire \`offer\` (scène « Carte IA ») : \`title\` = accroche courte issue de la carte (≤60 car), \`lines\` = 3 à 6 plats/sections réellement présents (≤80 car chacune), \`price\` = null (jamais de prix). N'invente aucun plat.` : ""}

Durée demandée : ${duration_sec}s · Ton : ${tone}.

${parentJob ? `MODE AFFINAGE : tu pars d'un scénario existant (ci-dessous) et tu appliques UNIQUEMENT les modifications décrites par l'utilisateur. Conserve template_id et toutes les autres props inchangées. Renvoie le JSON complet modifié.` : ""}`;

    const userPrompt = `Demande utilisateur : ${prompt}\n\nÉtablissement (peut être null si demande générique) :\n${JSON.stringify(businessContext, null, 2)}${parentJob ? `\n\nSCÉNARIO PRÉCÉDENT À AFFINER :\n${JSON.stringify({ template_id: parentJob.template_id, props: parentJob.template_props, prompt: parentJob.prompt }, null, 2)}` : ""}`;

    const scenarioModel = "google/gemini-3-flash-preview";
    const aiRes = await fetchAiGateway("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: scenarioModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    }, {
      supabase: supa,
      userId: callerContext.userId,
      affiliateId: callerContext.affiliateId,
      businessId: resolved_business_id,
      context: "studio-video-scenario",
      model: scenarioModel,
      metadata: { duration_sec, tone, parent_job_id: parentJob?.id ?? null },
    });

    if (aiRes.status === 429) return json({ error: "Limite IA atteinte, réessayez dans un instant." }, 429);
    if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiRes.ok) return json({ error: `Erreur IA: ${await aiRes.text()}` }, 500);

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    // Validation + fallback robuste
    const validIds = TEMPLATES.map(t => t.id);
    let template_id = typeof parsed.template_id === "string" && validIds.includes(parsed.template_id)
      ? parsed.template_id
      : "business-showcase";
    // Si un établissement est ciblé (ou si l'utilisateur a coché des médias / options),
    // on force le template paramétrique `business-showcase` : les templates statiques
    // (farasha-farmhouse, etc.) ignorent la whitelist médias et les options.
    const hasManualSel = Array.isArray(options?.selected_images) && options.selected_images.length > 0
      || Array.isArray(options?.selected_videos) && options.selected_videos.length > 0;
    if (resolved_business_id || hasManualSel) {
      template_id = "business-showcase";
    }
    const template_props = parsed.props && typeof parsed.props === "object" ? parsed.props : {};

    // Nettoyage anti-hallucination des textes visibles.
    template_props.hook = cleanDisplayText(template_props.hook) || undefined;
    template_props.tagline = cleanDisplayText(template_props.tagline) || undefined;

    // Anti-hallucination : ne garder que des URLs réellement présentes dans medias
    const realMediaUrls = new Set<string>();
    if (businessContext?.medias) {
      for (const m of businessContext.medias) {
        if (m.url) realMediaUrls.add(m.url);
        if (m.thumbnail_url) realMediaUrls.add(m.thumbnail_url);
      }
    }
    if (Array.isArray(template_props.images)) {
      template_props.images = template_props.images.filter((u: unknown) =>
        typeof u === "string" && realMediaUrls.has(u)
      );
    } else {
      template_props.images = [];
    }
    if (Array.isArray(template_props.videos)) {
      template_props.videos = template_props.videos.filter((u: unknown) =>
        typeof u === "string" && realMediaUrls.has(u)
      );
    } else {
      template_props.videos = [];
    }

    // Filet de sécurité : on garde `offer` si (a) prix crédible ou (b) un titre + lines existent
    // (annonce/message venant du prompt utilisateur).
    if (template_props.offer && typeof template_props.offer === "object") {
      const off = template_props.offer;
      const priceStr = String(off.price || "").trim();
      const looksLikePrice = /(\d+\s*(mad|dhs?|€|\$|eur|usd))|^\d+$/i.test(priceStr);
      const title = cleanDisplayText(off.title) || "";
      const rawLines = Array.isArray(off.lines) ? off.lines : [];
      const lines = rawLines
        .map((l: unknown) => cleanDisplayText(typeof l === "string" ? l : ""))
        .filter((l: string) => !!l && l.length <= 120)
        .slice(0, 6);
      const hasContent = looksLikePrice || (title && lines.length > 0) || (title && looksLikePrice);
      if (!hasContent) {
        template_props.offer = null;
      } else {
        template_props.offer = {
          title: title || undefined,
          price: looksLikePrice ? priceStr : (priceStr || undefined),
          lines: lines.length ? lines : undefined,
        };
        // Fond d'écran optionnel de la scène Offre : accepte une URL fournie par l'IA
        // OU la déduit d'un mot-clé du prompt utilisateur (ex: "piscine en fond de l'offre").
        const bgVidFromIa = typeof off.background_video_url === "string" && realMediaUrls.has(off.background_video_url)
          ? off.background_video_url : null;
        const bgImgFromIa = typeof off.background_image_url === "string" && realMediaUrls.has(off.background_image_url)
          ? off.background_image_url : null;
        let bgVideo = bgVidFromIa;
        let bgImage = bgImgFromIa;

        if (!bgVideo && !bgImage) {
          const bgMatch = prompt.match(/(?:en\s+fond|fond\s+(?:de|du|d[e']|derrière))[^.\n]*?\b([a-zà-ÿ]{4,})\b/i)
            || prompt.match(/\b(piscine|jardin|terrasse|plage|spa|hammam|chambre|patio|restaurant|salon|bar|cuisine|coucher\s+de\s+soleil|sunset)\b/i);
          const keyword = bgMatch?.[1]?.toLowerCase().trim();
          if (keyword && Array.isArray(businessContext?.medias)) {
            const norm = (s: unknown) => (typeof s === "string" ? s.toLowerCase() : "");
            const scored = businessContext.medias
              .map((m: any) => ({
                m,
                hit: (norm(m?.name).includes(keyword) || norm(m?.description).includes(keyword)) ? 1 : 0,
              }))
              .filter((x: any) => x.hit && typeof x.m?.url === "string" && /^https?:\/\//i.test(x.m.url));
            const vid = scored.find((x: any) => x.m.type === "video" || x.m.type === "internal-video");
            const img = scored.find((x: any) => x.m.type === "image");
            if (vid) bgVideo = vid.m.url;
            else if (img) bgImage = img.m.url;
          }
        }
        if (bgVideo) template_props.offer.background_video_url = bgVideo;
        else if (bgImage) template_props.offer.background_image_url = bgImage;
      }
    }

    if (template_id === "business-showcase" && businessContext?.name) {
      // Toujours forcer le nom réel — l'IA n'a pas le droit de réécrire.
      template_props.name = businessContext.name;
    }
    if (template_id === "business-showcase" && !template_props.city && businessContext?.city) {
      template_props.city = businessContext.city;
    }
    if (template_id === "business-showcase" && businessContext?.neighborhood) {
      template_props.neighborhood = businessContext.neighborhood;
    }
    // Forcer le hook réel de l'établissement (hook_fr en priorité) — interdire toute paraphrase IA.
    if (template_id === "business-showcase" && businessContext) {
      const realHook = stripHtml(
        videoLang === "en"
          ? pickLang(businessContext.hook_en, businessContext.hook_fr, businessContext.hook)
          : (businessContext.hook_fr || businessContext.hook),
      );
      if (realHook && typeof realHook === "string" && realHook.trim()) {
        template_props.hook = realHook.trim();
        const shouldUseFullHook = !template_props.offer && !hasInjectablePopup(businessContext);
        template_props.tagline = deriveTaglineFromHook(realHook, businessContext.name);
        template_props.useFullHookScene = shouldUseFullHook;
      }
    }

    // Injection serveur des options + vraies données BD (l'IA ne fournit pas ces champs).
    // Relecture dédiée juste avant l'insertion : évite qu'un échec du contexte média empêche
    // l'injection des avis / horaires / carte.
    let businessDetails = businessContext;
    if (resolved_business_id) {
      const { data: freshBiz } = await supa
        .from("businesses")
        .select("id,name,name_en,slug,hook_fr,hook_en,destination_hook,poi_hook,description,description_en,city,neighborhood,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count,google_review_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url,logo_url,images,popup_image_url,getyourguide_rating,getyourguide_review_count,viator_rating,viator_review_count,avis_verifies_rating,avis_verifies_review_count,trustpilot_rating,trustpilot_review_count,kayak_rating,kayak_review_count,tourradar_rating,tourradar_review_count,whatsapp,instagram_url")
        .eq("id", resolved_business_id)
        .maybeSingle();
      if (freshBiz) businessDetails = { ...(businessContext ?? {}), ...freshBiz };
    }

    if (template_id === "business-showcase" && businessDetails) {
      const detailName = videoLang === "en" ? pickLang(businessDetails.name_en, businessDetails.name) : businessDetails.name;
      if (detailName) template_props.name = detailName;
      if (businessDetails.city) template_props.city = businessDetails.city;
      if (businessDetails.neighborhood) template_props.neighborhood = businessDetails.neighborhood;
      const realHook = stripHtml(
        videoLang === "en"
          ? pickLang(businessDetails.hook_en, businessDetails.hook_fr, businessDetails.destination_hook, businessDetails.poi_hook)
          : (businessDetails.hook_fr || businessDetails.destination_hook || businessDetails.poi_hook),
      );
      if (realHook) {
        template_props.hook = realHook;
        const shouldUseFullHook = !template_props.offer && !hasInjectablePopup(businessDetails);
        template_props.tagline = deriveTaglineFromHook(realHook, detailName || businessDetails.name);
        template_props.useFullHookScene = shouldUseFullHook;
      }

      // FORCE-INJECT médias depuis la BD (l'IA est trop peu fiable et peut renvoyer videos:[]).
      // Sélection manuelle (options.selected_images / selected_videos) → whitelist stricte
      // et autorisation du montage mixte images + vidéos. Sinon règle historique :
      // priorité aux vidéos internes ; à défaut images.
      const selImages = Array.isArray(options?.selected_images)
        ? options.selected_images.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u as string)) as string[]
        : [];
      const selVideos = Array.isArray(options?.selected_videos)
        ? options.selected_videos.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u as string)) as string[]
        : [];
      const hasManualSelection = selImages.length > 0 || selVideos.length > 0;

      if (hasManualSelection) {
        template_props.videos = Array.from(new Set(selVideos)).slice(0, 8);
        template_props.images = Array.from(new Set(selImages)).slice(0, 8);
      } else {
        const medias = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        const realVideos = medias
          .filter((m: any) => (m?.type === "video" || m?.type === "internal-video") && typeof m?.url === "string" && /^https?:\/\//i.test(m.url))
          .map((m: any) => m.url as string);
        const realImages = medias
          .filter((m: any) => m?.type === "image" && typeof m?.url === "string" && /^https?:\/\//i.test(m.url))
          .map((m: any) => m.url as string);
        if (realVideos.length > 0) {
          template_props.videos = Array.from(new Set(realVideos)).slice(0, 8);
          template_props.images = [];
        } else if (realImages.length > 0) {
          template_props.videos = [];
          template_props.images = Array.from(new Set(realImages)).slice(0, 8);
        }
      }

      // Time Start par vidéo (secondes, 0,1 s) : point de départ du média dans le montage.
      const rawStarts = options?.video_starts;
      if (rawStarts && typeof rawStarts === "object") {
        const starts: Record<string, number> = {};
        for (const [u, t] of Object.entries(rawStarts as Record<string, unknown>)) {
          if (typeof u !== "string" || !/^https?:\/\//i.test(u)) continue;
          const n = Number(t);
          if (!Number.isFinite(n) || n <= 0 || n > 3600) continue;
          starts[u] = Math.round(n * 10) / 10;
        }
        if (Object.keys(starts).length) template_props.videoStarts = starts;
      }

      // Time End par vidéo (secondes, 0,1 s) : point de fin du média dans le montage.
      const rawEnds = options?.video_ends;
      if (rawEnds && typeof rawEnds === "object") {
        const ends: Record<string, number> = {};
        for (const [u, t] of Object.entries(rawEnds as Record<string, unknown>)) {
          if (typeof u !== "string" || !/^https?:\/\//i.test(u)) continue;
          const n = Number(t);
          if (!Number.isFinite(n) || n <= 0 || n > 3600) continue;
          const end = Math.round(n * 10) / 10;
          const st = (template_props.videoStarts as Record<string, number> | undefined)?.[u] ?? 0;
          if (end <= st) continue;
          ends[u] = end;
        }
        if (Object.keys(ends).length) template_props.videoEnds = ends;
      }

      // Durée réelle par vidéo (secondes) : permet de boucler le média quand
      // l'étape est plus longue que le clip (au lieu de figer la dernière image).
      const rawVideoDurations = options?.video_durations;
      if (rawVideoDurations && typeof rawVideoDurations === "object") {
        const durs: Record<string, number> = {};
        for (const [u, t] of Object.entries(rawVideoDurations as Record<string, unknown>)) {
          if (typeof u !== "string" || !/^https?:\/\//i.test(u)) continue;
          const n = Number(t);
          if (!Number.isFinite(n) || n <= 0.5 || n > 3600) continue;
          durs[u] = Math.round(n * 10) / 10;
        }
        if (Object.keys(durs).length) template_props.videoDurations = durs;
      }




      // Sélection média par scène (facultatif). Whitelist stricte : chaque URL doit
      // appartenir aux médias autorisés de l'établissement (images ou vidéos internes).
      const rawSceneMedia = options?.scene_media;
      if (rawSceneMedia && typeof rawSceneMedia === "object") {
        const allowedUrls = new Set<string>();
        const medias = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        for (const m of medias) {
          if (typeof m?.url === "string" && /^https?:\/\//i.test(m.url)) allowedUrls.add(m.url);
        }
        // Autoriser aussi les URLs déjà passées via la sélection globale (au cas où)
        selImages.forEach((u) => allowedUrls.add(u));
        selVideos.forEach((u) => allowedUrls.add(u));

        const ALLOWED_KINDS = new Set(["logo", "welcome", "proposition", "hook", "name", "ai_card", "media", "popup", "offer", "highlight", "reviews", "google_review", "tripadvisor", "restaurant_guru", "customer_review", "hours", "map", "digital", "whatsapp", "cta", "outro", "blog", "weather", "tides", "ai_text", "external_link", "menu_doc"]);
        const cleaned: Record<string, Array<{ url: string; kind: "image" | "video" }>> = {};
        for (const [k, v] of Object.entries(rawSceneMedia)) {
          if (!ALLOWED_KINDS.has(k) || !Array.isArray(v)) continue;
          const items = (v as any[])
            .map((it) => (it && typeof it.url === "string" && (it.kind === "image" || it.kind === "video"))
              ? { url: it.url as string, kind: it.kind as "image" | "video" }
              : null)
            .filter((it): it is { url: string; kind: "image" | "video" } => !!it && allowedUrls.has(it.url))
            .slice(0, 8);
          if (items.length) cleaned[k] = items;
        }
        if (Object.keys(cleaned).length) template_props.scene_media = cleaned;
      }

      // Refus explicite de l'image associée par défaut d'une étape (bloc, popup, lien externe…)
      const rawAssoc = options?.use_associated_media;
      if (rawAssoc && typeof rawAssoc === "object") {
        const assoc: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(rawAssoc)) {
          if (v === false) assoc[k] = false;
        }
        if (Object.keys(assoc).length) template_props.use_associated_media = assoc;
      }

      // Étapes personnalisées ajoutées par l'utilisateur dans l'aperçu (carton texte ou overlay).
      // Whitelist stricte : URL média doit appartenir aux médias autorisés.
      const rawCustomScenes = options?.custom_scenes;
      const cleanedCustomScenes: Array<{
        id: string;
        mode: "fullscreen" | "overlay";
        title: string;
        subtitle?: string;
        duration: number;
        media?: { url: string; kind: "image" | "video" };
        mediaList?: Array<{ url: string; kind: "image" | "video" }>;
        priceBadge?: string;
        splitCount?: number;
      }> = [];
      if (Array.isArray(rawCustomScenes)) {
        const allowedUrlsForCustom = new Set<string>();
        const mediasForCustom = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        for (const m of mediasForCustom) {
          if (typeof m?.url === "string" && /^https?:\/\//i.test(m.url)) allowedUrlsForCustom.add(m.url);
        }
        selImages.forEach((u) => allowedUrlsForCustom.add(u));
        selVideos.forEach((u) => allowedUrlsForCustom.add(u));
        // Un média personnalisé est retenu si l'URL est autorisée et pointe vers un
        // fichier lisible par Remotion (les liens YouTube ne sont pas rendables).
        const normalizeCustomMedia = (m: any): { url: string; kind: "image" | "video" } | null => {
          if (!m || typeof m.url !== "string" || !allowedUrlsForCustom.has(m.url)) return null;
          if (m.kind === "image") return { url: m.url, kind: "image" };
          const isFile = /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(m.url);
          if ((m.kind === "video" || m.kind === "youtube") && isFile) return { url: m.url, kind: "video" };
          if (m.kind === "video") return { url: m.url, kind: "video" };
          return null;
        };
        for (const c of rawCustomScenes as any[]) {
          if (!c || typeof c !== "object") continue;
          const id = typeof c.id === "string" && /^[a-zA-Z0-9_-]{3,40}$/.test(c.id) ? c.id : null;
          const title = typeof c.title === "string" ? c.title.trim().slice(0, 120) : "";
          const subtitle = typeof c.subtitle === "string" ? c.subtitle.trim().slice(0, 1200) : "";
          const dur = Number(c.duration);
          if (!id || !title || !Number.isFinite(dur) || dur < 1 || dur > 60) continue;
          const media = normalizeCustomMedia(c.media) ?? undefined;
          const listRaw = Array.isArray(c.mediaList) ? c.mediaList : [];
          const mediaList = listRaw
            .map((m: any) => normalizeCustomMedia(m))
            .filter((m: any): m is { url: string; kind: "image" | "video" } => !!m)
            .slice(0, 8);
          const firstMedia = media ?? mediaList[0];
          // Pas de média exploitable → on ne jette plus l'étape : elle passe en
          // carton plein cadre (Remotion applique alors un fond de repli animé).
          const mode: "fullscreen" | "overlay" = c.mode === "overlay" && firstMedia ? "overlay" : "fullscreen";
          const priceBadge = typeof c.priceBadge === "string" ? c.priceBadge.trim().slice(0, 80) : "";
          const rawSplit = Number(c.splitCount);
          const splitCount = Number.isFinite(rawSplit) && rawSplit >= 1 && rawSplit <= 10 ? Math.round(rawSplit) : undefined;
          cleanedCustomScenes.push({
            id,
            mode,
            title,
            subtitle: subtitle || undefined,
            duration: Math.round(dur),
            media: firstMedia,
            mediaList: mediaList.length ? mediaList : undefined,
            priceBadge: priceBadge || undefined,
            splitCount,
          });
          if (cleanedCustomScenes.length >= 8) break;
        }
        if (cleanedCustomScenes.length) template_props.custom_scenes = cleanedCustomScenes;
      }

      const allowedCustomIds = new Set(cleanedCustomScenes.map((c) => `custom:${c.id}`));

      // "Ouvrir avec le logo" — active la scène logo d'intro dans Remotion.
      const wantsLogoIntro = !!options?.open_with_logo;
      const logoUrlFromClient = typeof options?.logo_url === "string" && /^https?:\/\//i.test(options.logo_url as string)
        ? (options.logo_url as string)
        : (businessDetails.logo_url || null);
      if (wantsLogoIntro && logoUrlFromClient) {
        template_props.openWithLogo = true;
        template_props.logoUrl = logoUrlFromClient;
      }

      // Vidéo unique jouée en fond continu (neutralise les fonds de scène côté Remotion)
      const contBgUrl = typeof options?.continuous_bg_video_url === "string" && /^https?:\/\//i.test(options.continuous_bg_video_url as string)
        ? (options.continuous_bg_video_url as string)
        : null;
      if (contBgUrl) {
        template_props.continuousBgVideoUrl = contBgUrl;
        template_props.continuousBgSound = Boolean(options?.continuous_bg_sound);
        // Durée réelle de la vidéo (secondes) : Remotion la boucle si < durée du scénario.
        const contBgDur = Number(options?.continuous_bg_video_duration);
        if (Number.isFinite(contBgDur) && contBgDur > 0.5 && contBgDur < 3600) {
          template_props.continuousBgVideoDurationSec = Math.round(contBgDur * 100) / 100;
        }
        const vids = Array.isArray(template_props.videos) ? template_props.videos as string[] : [];
        if (!vids.includes(contBgUrl)) template_props.videos = [contBgUrl, ...vids].slice(0, 8);
      }

      // Bande son issue d'une vidéo (prioritaire sur le son de la vidéo de fond continue)
      const soundtrackUrl = typeof options?.soundtrack_url === "string" && /^https?:\/\//i.test(options.soundtrack_url as string)
        ? (options.soundtrack_url as string)
        : null;
      if (soundtrackUrl) {
        template_props.soundtrackUrl = soundtrackUrl;
        template_props.continuousBgSound = false;
      }


      // Zone libre — étape "media" optionnelle avec texte + médias de fond au choix
      const wantsFreeZone = !!options?.free_zone;
      if (wantsFreeZone) {
        template_props.freeZone = true;
        const fzTitle = typeof options?.free_zone_title === "string" ? options.free_zone_title.trim().slice(0, 80) : "";
        const fzSub = typeof options?.free_zone_subtitle === "string" ? options.free_zone_subtitle.trim().slice(0, 160) : "";
        if (fzTitle) template_props.freeZoneTitle = fzTitle;
        if (fzSub) template_props.freeZoneSubtitle = fzSub;
      }

      // ---- Lieux liés aux scènes (POIs / destinations) ----
      const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
      // Média du lieu : vidéo 1 si dispo (mode "videos"), sinon image 1.
      const placesMediaMode: "videos" | "images" = options?.places_media_mode === "images" ? "images" : "videos";
      const firstOf = (v: unknown): string | null => {
        if (Array.isArray(v)) {
          const f = v.find((x) => typeof x === "string" && x.trim());
          return f ? String(f).trim() : null;
        }
        return typeof v === "string" && v.trim() ? v.trim() : null;
      };
      const placeMedia = (r: any) => {
        const vid = firstOf(r.videos);
        const img = firstOf(r.images) || (typeof r.image_url === "string" ? r.image_url : null);
        if (placesMediaMode === "videos" && vid) return { media_url: vid, media_kind: "video" as const };
        if (img) return { media_url: img, media_kind: "image" as const };
        if (vid) return { media_url: vid, media_kind: "video" as const };
        return { media_url: null, media_kind: null };
      };
      template_props.placesMediaMode = placesMediaMode;
      const rawScenePois = (options?.scene_pois && typeof options.scene_pois === "object") ? options.scene_pois as Record<string, unknown> : null;
      const rawSceneDests = (options?.scene_destinations && typeof options.scene_destinations === "object") ? options.scene_destinations as Record<string, unknown> : null;
      // Distance Master → POI (mètres) + cap directionnel, calculés côté serveur
      // pour un rendu déterministe dans le montage.
      const masterLat = Number((template_props as any)?.latitude);
      const masterLng = Number((template_props as any)?.longitude);
      const hasMasterGeo = Number.isFinite(masterLat) && Number.isFinite(masterLng);
      const toRad = (d: number) => (d * Math.PI) / 180;
      const distanceMeters = (lat: number, lng: number) => {
        const R = 6371000;
        const dLat = toRad(lat - masterLat);
        const dLng = toRad(lng - masterLng);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(masterLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
        return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };
      const bearingDeg = (lat: number, lng: number) => {
        const y = Math.sin(toRad(lng - masterLng)) * Math.cos(toRad(lat));
        const x = Math.cos(toRad(masterLat)) * Math.sin(toRad(lat)) -
          Math.sin(toRad(masterLat)) * Math.cos(toRad(lat)) * Math.cos(toRad(lng - masterLng));
        return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      };
      if (rawScenePois) {
        const allIds = [...new Set(Object.values(rawScenePois).flatMap((v) => Array.isArray(v) ? v : []).filter(isUuid))] as string[];
        if (allIds.length) {
          // Points d'intérêt = fiches établissements marquées is_poi
          const { data: poiRows } = await supa
            .from("businesses")
            .select("id,name,hook_fr,hook_en,images,video_1_url,latitude,longitude")
            .in("id", allIds.slice(0, 60));
          // Les POIs n'ont pas de video_1_url : leurs vidéos vivent dans business_documents.
          const { data: poiVideoRows } = await supa
            .from("business_documents")
            .select("business_id,url,sort_order")
            .eq("type", "video")
            .in("business_id", allIds.slice(0, 60))
            .order("sort_order", { ascending: true });
          const isPlayableVideo = (u: unknown) =>
            typeof u === "string" && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
          const videoByBiz = new Map<string, string>();
          for (const row of (poiVideoRows ?? []) as any[]) {
            if (!videoByBiz.has(row.business_id) && isPlayableVideo(row.url)) {
              videoByBiz.set(row.business_id, row.url);
            }
          }
          const byId = new Map<string, any>((poiRows ?? []).map((r: any) => [r.id, r]));
          const out: Record<string, any[]> = {};
          for (const [key, v] of Object.entries(rawScenePois)) {
            const ids = (Array.isArray(v) ? v : []).filter(isUuid) as string[];
            const items = ids.map((id) => byId.get(id)).filter(Boolean).map((r: any) => {
              const vid = isPlayableVideo(r.video_1_url) ? r.video_1_url : (videoByBiz.get(r.id) ?? null);
              const row = { ...r, videos: vid ? [vid] : null, image_url: firstOf(r.images) };
              const lat = Number.isFinite(Number(r.latitude)) ? Number(r.latitude) : null;
              const lng = Number.isFinite(Number(r.longitude)) ? Number(r.longitude) : null;
              return {
                id: r.id,
                name: r.name,
                hook: (videoLang === "en" ? (r.hook_en || r.hook_fr) : r.hook_fr) || null,
                image_url: firstOf(r.images) || null,
                ...placeMedia(row),
                latitude: lat,
                longitude: lng,
                distance_m: hasMasterGeo && lat != null && lng != null ? distanceMeters(lat, lng) : null,
                bearing_deg: hasMasterGeo && lat != null && lng != null ? bearingDeg(lat, lng) : null,
                master_latitude: hasMasterGeo ? masterLat : null,
                master_longitude: hasMasterGeo ? masterLng : null,
              };
            });
            if (items.length) out[key] = items;
          }
          if (Object.keys(out).length) {
            template_props.scenePois = out;
            // Durée par défaut d'une étape liée à des POIs : 6 s + 1 s par POI
            // supplémentaire (respecte une durée déjà fixée par l'utilisateur).
            if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
            const sd = (template_props as any).scene_durations as Record<string, number>;
            for (const [key, items] of Object.entries(out)) {
              if (sd[key] == null) sd[key] = 6 + Math.max(0, items.length - 1);
            }
          }
        }
      }

      if (rawSceneDests) {
        const allIds = [...new Set(Object.values(rawSceneDests).flatMap((v) => Array.isArray(v) ? v : []).filter(isUuid))] as string[];
        if (allIds.length) {
          const { data: destRows } = await supa
            .from("destinations")
            .select("id,name_fr,name_en,hook,image_url,images,videos,latitude,longitude")
            .in("id", allIds.slice(0, 40));
          const byId = new Map<string, any>((destRows ?? []).map((r: any) => [r.id, r]));
          const out: Record<string, any[]> = {};
          for (const [key, v] of Object.entries(rawSceneDests)) {
            const ids = (Array.isArray(v) ? v : []).filter(isUuid) as string[];
            const items = ids.map((id) => byId.get(id)).filter(Boolean).map((r: any) => ({
              id: r.id,
              name: (videoLang === "en" ? (r.name_en || r.name_fr) : r.name_fr) || r.name_fr,
              hook: r.hook || null,
              image_url: r.image_url || null,
              ...placeMedia(r),
              latitude: Number.isFinite(Number(r.latitude)) ? Number(r.latitude) : null,
              longitude: Number.isFinite(Number(r.longitude)) ? Number(r.longitude) : null,
            }));
            if (items.length) out[key] = items;
          }
          if (Object.keys(out).length) template_props.sceneDestinations = out;
        }
      }

      // ---- Articles de blog propriétaires ----
      const wantsBlog = options?.blog_articles === true;
      const blogIds = (Array.isArray(options?.blog_article_ids) ? options.blog_article_ids : []).filter(isUuid).slice(0, 6) as string[];
      if (wantsBlog && blogIds.length) {
        const blogMode: "scroll" | "hero_map" = options?.blog_mode === "scroll" ? "scroll" : "hero_map";
        const perArticleModes: Record<string, string> = (options?.blog_modes && typeof options.blog_modes === "object") ? options.blog_modes : {};
        const { data: postRows } = await supa
          .from("blog_posts")
          .select("id,slug,title_fr,title_en,excerpt_fr,excerpt_en,cover_image_url,custom_hero_image_url")
          .in("id", blogIds);
        const ordered = blogIds.map((id) => (postRows ?? []).find((r: any) => r.id === id)).filter(Boolean) as any[];
        if (ordered.length) {
          const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
          const articles: any[] = [];
          for (const post of ordered) {
            const item: any = {
              id: post.id,
              slug: post.slug,
              title: (videoLang === "en" ? (post.title_en || post.title_fr) : post.title_fr) || post.slug,
              excerpt: (videoLang === "en" ? (post.excerpt_en || post.excerpt_fr) : post.excerpt_fr) || null,
              heroUrl: post.custom_hero_image_url || post.cover_image_url || null,
              url: `https://oneworldmorocco.com/blog/${post.slug}`,
            };
            const itemMode: "scroll" | "hero_map" = perArticleModes[post.id] === "scroll" ? "scroll" : perArticleModes[post.id] === "hero_map" ? "hero_map" : blogMode;
            item.mode = itemMode;
            if (itemMode === "scroll" && fcKey) {
              try {
                const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${fcKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    url: `${item.url}?bare=1`,
                    formats: [{ type: "screenshot", fullPage: true }],
                    onlyMainContent: false,
                    mobile: true,
                    waitFor: 5000,
                    actions: [
                      { type: "executeJavascript", script: `try{localStorage.setItem('cookie-consent-v1',JSON.stringify({analytics:'denied',ts:Date.now()}));}catch(e){};document.querySelectorAll('[aria-label="Bannière de consentement aux cookies"],[role="dialog"][aria-live="polite"]').forEach(function(n){n.remove();});Array.prototype.forEach.call(document.images,function(i){i.loading='eager';i.decoding='sync';});` },
                      { type: "wait", milliseconds: 4000 },
                    ],
                  }),
                });
                const fcJson = await fcRes.json().catch(() => null) as any;
                const shotUrl: string | undefined = fcJson?.data?.screenshot || fcJson?.screenshot;
                if (shotUrl && /^https?:\/\//i.test(shotUrl)) {
                  const imgRes = await fetch(shotUrl);
                  if (imgRes.ok) {
                    const bytes = new Uint8Array(await imgRes.arrayBuffer());
                    const path = `blog/${post.slug}-${Date.now()}.png`;
                    const up = await supa.storage.from("studio-videos").upload(path, bytes, { contentType: "image/png", upsert: true });
                    if (!up.error) {
                      const { data: pub } = supa.storage.from("studio-videos").getPublicUrl(path);
                      if (pub?.publicUrl) item.scrollShotUrl = pub.publicUrl;
                    }
                  }
                }
              } catch (e) {
                console.warn("[blog] firecrawl screenshot failed", (e as Error).message);
              }
            }
            articles.push(item);
          }
          template_props.showBlogArticles = true;
          template_props.blogMode = blogMode;
          template_props.blogArticles = articles;
        }
      }

      // Ordre et durées personnalisés des scènes (édités par l'utilisateur dans l'aperçu)
      const ALLOWED_SCENE_KINDS = new Set(["logo", "welcome", "proposition", "hook", "name", "ai_card", "media", "popup", "offer", "highlight", "reviews", "google_review", "tripadvisor", "restaurant_guru", "customer_review", "hours", "map", "digital", "whatsapp", "cta", "outro", "blog", "weather", "tides", "ai_text", "external_link", "menu_doc"]);
      const rawOrder = options?.scene_order;
      let orderedFromClient: string[] | null = null;
      if (Array.isArray(rawOrder)) {
        const seen = new Set<string>();
        const cleanedOrder: string[] = [];
        for (const k of rawOrder) {
          if (typeof k !== "string" || seen.has(k)) continue;
          // Zone libre désactivée → on retire "media" de l'ordre
          if (k === "media" && !wantsFreeZone) continue;
          if (ALLOWED_SCENE_KINDS.has(k) || allowedCustomIds.has(k)) {
            seen.add(k);
            cleanedOrder.push(k);
          }
        }
        if (cleanedOrder.length) orderedFromClient = cleanedOrder;
      }
      // Si logo intro demandé, on force sa présence en tête de l'ordre.
      if (wantsLogoIntro && logoUrlFromClient) {
        const base = orderedFromClient ?? [];
        const withoutLogo = base.filter((k) => k !== "logo");
        orderedFromClient = ["logo", ...withoutLogo];
      }
      if (orderedFromClient && orderedFromClient.length) {
        template_props.scene_order = orderedFromClient;
      }
      const rawDurations = options?.scene_durations;
      if (rawDurations && typeof rawDurations === "object") {
        const cleanedDur: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawDurations)) {
          if (!ALLOWED_SCENE_KINDS.has(k) && !allowedCustomIds.has(k)) continue;
          const n = Number(v);
          if (Number.isFinite(n) && n >= 1 && n <= 60) cleanedDur[k] = Math.round(n);
        }
        if (Object.keys(cleanedDur).length) template_props.scene_durations = cleanedDur;
      }

      // Position verticale du texte dans les scènes (haut / milieu / bas)
      const rawTextPosition = options?.text_position;
      if (rawTextPosition === "top" || rawTextPosition === "middle" || rawTextPosition === "bottom") {
        template_props.textPosition = rawTextPosition;
      }

      // Transitions entre les plans (vidéos / images)
      const rawTransitions = options?.transitions;
      if (rawTransitions && typeof rawTransitions === "object") {
        const STYLES = new Set(["auto", "doux", "dynamique", "minimal"]);
        const EFFECTS = new Set(["crossfade", "fade_black", "wipe", "zoom", "kenburns", "slide", "cut", "fast", "mix"]);
        const t: Record<string, unknown> = {};
        if (STYLES.has(rawTransitions.style)) t.style = rawTransitions.style;
        t.differentiate = rawTransitions.differentiate !== false;
        if (EFFECTS.has(rawTransitions.video)) t.video = rawTransitions.video;
        if (EFFECTS.has(rawTransitions.image)) t.image = rawTransitions.image;
        template_props.transitions = t;
      }


      template_props.lang = videoLang;
      template_props.durationSec = Number(duration_sec);
      // Le ton pilote le rendu Remotion (Ken Burns, fondus, finition visuelle).
      if (tone === "immersif" || tone === "dynamique" || tone === "elegant") {
        template_props.tone = tone;
      }
      // Découpe du texte sur le montage vidéo (nb d'étapes)
      const rawSplitCount = Number(options?.split_count);
      if (Number.isFinite(rawSplitCount) && rawSplitCount >= 1 && rawSplitCount <= 10) {
        template_props.splitCount = Math.round(rawSplitCount);
      }
      const rawTextSplits = options?.text_splits;
      if (rawTextSplits && typeof rawTextSplits === "object" && !Array.isArray(rawTextSplits)) {
        const cleanedSplits: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawTextSplits)) {
          const n = Number(v);
          if (typeof k === "string" && Number.isFinite(n) && n >= 1 && n <= 10) {
            cleanedSplits[k] = Math.round(n);
          }
        }
        if (Object.keys(cleanedSplits).length) template_props.textSplits = cleanedSplits;
      }
      // Segments explicites (découpe au caractère près) — prioritaires sur textSplits
      const rawTextSegments = options?.text_segments;
      if (rawTextSegments && typeof rawTextSegments === "object" && !Array.isArray(rawTextSegments)) {
        const cleanedSegs: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(rawTextSegments as Record<string, any>)) {
          if (typeof k !== "string" || !Array.isArray(v)) continue;
          const segs = v
            .filter((x) => typeof x === "string")
            .map((x) => (x as string).trim().slice(0, 400))
            .filter(Boolean)
            .slice(0, 10);
          if (segs.length > 1) cleanedSegs[k] = segs;
        }
        if (Object.keys(cleanedSegs).length) template_props.textSegments = cleanedSegs;
      }
      // Overrides manuels du texte des scènes (titre + texte), saisis dans l'aperçu du scénario.
      const rawTextOverrides = options?.text_overrides;
      if (rawTextOverrides && typeof rawTextOverrides === "object" && !Array.isArray(rawTextOverrides)) {
        const cleanedOv: Record<string, { label?: string; description?: string }> = {};
        for (const [k, v] of Object.entries(rawTextOverrides as Record<string, any>)) {
          if (typeof k !== "string" || !v || typeof v !== "object") continue;
          const label = typeof v.label === "string" ? v.label.trim().slice(0, 200) : "";
          const description = typeof v.description === "string" ? v.description.trim().slice(0, 600) : "";
          if (!label && !description) continue;
          cleanedOv[k] = { ...(label ? { label } : {}), ...(description ? { description } : {}) };
        }
        if (Object.keys(cleanedOv).length) template_props.textOverrides = cleanedOv;
      }

      // Moyenne pondérée sur les 9 plateformes d'avis (même methode que le site)
      const REVIEW_SOURCES = [
        "google", "tripadvisor", "restaurant_guru", "getyourguide", "viator",
        "avis_verifies", "trustpilot", "kayak", "tourradar",
      ] as const;
      let weightedSum = 0;
      let countSum = 0;
      for (const src of REVIEW_SOURCES) {
        const r = Number((businessDetails as any)[`${src}_rating`]);
        const c = Number((businessDetails as any)[`${src}_review_count`]);
        if (Number.isFinite(r) && r > 0 && Number.isFinite(c) && c > 0) {
          weightedSum += r * c;
          countSum += c;
        }
      }
      const computedRating = Number(businessDetails.computed_rating);
      const totalReviews = Number(businessDetails.total_review_count);
      const rating = countSum > 0
        ? Math.round((weightedSum / countSum) * 1000) / 1000
        : (Number.isFinite(computedRating) && computedRating > 0 ? computedRating : null);
      const reviewsCount = countSum > 0
        ? countSum
        : (Number.isFinite(totalReviews) && totalReviews > 0 ? totalReviews : null);

      if (wantsReviews) {
        template_props.showReviews = true;
        template_props.rating = rating;
        template_props.reviewsCount = reviewsCount;
      }
      // Plateformes d'avis externes
      if (wantsGoogleReviews) {
        const gr = Number(businessDetails.google_rating);
        const gc = Number(businessDetails.google_review_count);
        const gu = typeof businessDetails.google_review_url === "string" ? businessDetails.google_review_url : null;
        if ((Number.isFinite(gr) && gr > 0) || (Number.isFinite(gc) && gc > 0) || gu) {
          template_props.showGoogleReviews = true;
          template_props.googleReview = {
            rating: Number.isFinite(gr) && gr > 0 ? gr : null,
            count: Number.isFinite(gc) && gc > 0 ? gc : null,
            url: gu,
          };
        }
      }
      if (wantsTripAdvisor) {
        const tr = Number((businessDetails as any).tripadvisor_rating);
        const tc = Number((businessDetails as any).tripadvisor_review_count);
        const tu = typeof (businessDetails as any).tripadvisor_url === "string" ? (businessDetails as any).tripadvisor_url : null;
        if ((Number.isFinite(tr) && tr > 0) || (Number.isFinite(tc) && tc > 0) || tu) {
          template_props.showTripAdvisor = true;
          template_props.tripAdvisor = {
            rating: Number.isFinite(tr) && tr > 0 ? tr : null,
            count: Number.isFinite(tc) && tc > 0 ? tc : null,
            url: tu,
          };
        }
      }
      if (wantsRestaurantGuru) {
        const rr = Number((businessDetails as any).restaurant_guru_rating);
        const rc = Number((businessDetails as any).restaurant_guru_review_count);
        const ru = typeof (businessDetails as any).restaurant_guru_url === "string" ? (businessDetails as any).restaurant_guru_url : null;
        if ((Number.isFinite(rr) && rr > 0) || (Number.isFinite(rc) && rc > 0) || ru) {
          template_props.showRestaurantGuru = true;
          template_props.restaurantGuru = {
            rating: Number.isFinite(rr) && rr > 0 ? rr : null,
            count: Number.isFinite(rc) && rc > 0 ? rc : null,
            url: ru,
          };
        }
      }
      if (wantsCustomerReview && customerReviewId) {
        try {
          const { data: revRow } = await supa
            .from("reviews")
            .select("id,author_name,rating,text,text_fr,text_en,source,published_at")
            .eq("id", customerReviewId)
            .maybeSingle();
          if (revRow) {
            const fullText = (videoLang === "en"
              ? pickLang(revRow.text_en, revRow.text_fr, revRow.text)
              : pickLang(revRow.text_fr, revRow.text)
            ) ?? "";
            // Extrait mis en avant : uniquement des PHRASES COMPLÈTES issues de
            // l'avis. Tout fragment parasite (bout de phrase, texte absent de
            // l'avis, extrait non ponctué) est rejeté au profit d'un repli propre.
            const cleanFull = fullText.replace(/\s+/g, " ").trim();
            const sentences = cleanFull.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
            const firstSentences = (() => {
              let acc = "";
              for (const s of sentences) {
                if (acc.length >= 60) break;
                acc = acc ? `${acc} ${s.trim()}` : s.trim();
                if (acc.length > 200) break;
              }
              return acc.slice(0, 200);
            })();
            const proposed = (customerReviewHighlight || "").replace(/\s+/g, " ").trim();
            const isValidHighlight =
              proposed.length >= 30 &&
              /[.!?…]$/.test(proposed) &&
              /^[A-ZÀ-ÖØ-Þ«"]/.test(proposed) &&
              cleanFull.toLowerCase().includes(proposed.toLowerCase());
            template_props.showCustomerReview = true;
            template_props.customerReview = {
              id: revRow.id,
              author: revRow.author_name || null,
              rating: revRow.rating != null ? Number(revRow.rating) : null,
              text: cleanFull.slice(0, 800),
              highlight: isValidHighlight ? proposed : (firstSentences || cleanFull.slice(0, 200)),
              source: revRow.source || null,
            };
          }

        } catch (_) { /* silent */ }
      }
      const formattedOpeningHours = formatOpeningHours(businessDetails.opening_hours);
      if (wantsHours && formattedOpeningHours) {
        template_props.showOpeningHours = true;
        template_props.openingHours = formattedOpeningHours;
      }
      const latitude = Number(businessDetails.latitude);
      const longitude = Number(businessDetails.longitude);
      if (wantsMapMarker && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        template_props.showMap = true;
        template_props.latitude = latitude;
        template_props.longitude = longitude;
        template_props.address = businessDetails.address ?? null;
      }
      if (wantsDigitalId && (businessDetails.slug || businessDetails.id)) {
        template_props.showDigitalId = true;
        template_props.slug = businessDetails.slug || businessDetails.id;
        const firstImg = Array.isArray(businessDetails.images) ? businessDetails.images.find((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u)) : null;
        template_props.logoUrl = businessDetails.logo_url || firstImg || null;
        template_props.whatsapp = businessDetails.whatsapp || null;
        template_props.instagramUrl = businessDetails.instagram_url || null;
        if (rating) template_props.rating = rating;
        if (reviewsCount) template_props.reviewsCount = reviewsCount;

        // Capture mobile screenshot of the live published fiche via Firecrawl, upload to storage
        // and pass the URL to Remotion so SceneDigitalId shows the exact published page.
        try {
          const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
          if (fcKey) {
            const ficheUrl = `https://oneworldmorocco.com/b/${encodeURIComponent(template_props.slug)}?bare=1`;
            const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
              method: "POST",
              headers: { "Authorization": `Bearer ${fcKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                url: ficheUrl,
                formats: ["screenshot"],
                onlyMainContent: false,
                mobile: true,
                waitFor: 5000,
                // Ceinture + bretelles : ?bare=1 masque déjà la bannière cookies côté app,
                // mais si le build publié est en retard on la supprime aussi du DOM avant la capture.
                // On force également le chargement immédiat des images (avatar/logo) et on attend 5 s :
                // sinon la capture part avant que l'avatar ne soit peint (cercle vide).
                actions: [
                  {
                    type: "executeJavascript",
                    script: `try{localStorage.setItem('cookie-consent-v1',JSON.stringify({analytics:'denied',ts:Date.now()}));}catch(e){};document.querySelectorAll('[aria-label="Bannière de consentement aux cookies"],[role="dialog"][aria-live="polite"]').forEach(function(n){n.remove();});Array.prototype.forEach.call(document.images,function(i){i.loading='eager';i.decoding='sync';if(!i.complete&&i.src){var s=i.src;i.src='';i.src=s;}});`,
                  },
                  { type: "wait", milliseconds: 5000 },
                ],
              }),
            });
            const fcJson = await fcRes.json().catch(() => null) as any;
            const shotUrl: string | undefined = fcJson?.data?.screenshot || fcJson?.screenshot;
            if (shotUrl && /^https?:\/\//i.test(shotUrl)) {
              const imgRes = await fetch(shotUrl);
              if (imgRes.ok) {
                const bytes = new Uint8Array(await imgRes.arrayBuffer());
                const path = `fiches/${template_props.slug}-${Date.now()}.png`;
                const up = await supa.storage.from("studio-videos").upload(path, bytes, {
                  contentType: "image/png",
                  upsert: true,
                });
                if (!up.error) {
                  const { data: pub } = supa.storage.from("studio-videos").getPublicUrl(path);
                  if (pub?.publicUrl) template_props.ficheScreenshotUrl = pub.publicUrl;
                }
              }
            }
          }
        } catch (e) {
          console.warn("[digital_id] firecrawl screenshot failed", (e as Error).message);
        }
      }
      // Toujours refléter le choix utilisateur : true = incitation à installer l'app,
      // false = pas de scène finale de CTA (le rendu Remotion supprimera la scène cta).
      template_props.showAppInstall = wantsInstallCta;

      // Injection serveur des offres sélectionnées par l'utilisateur.
      // On force la présence de `offer` en base plutôt que compter sur l'IA
      // (l'IA a tendance à ignorer les offres si aucune n'est présente dans `medias`).
      // Carte IA : l'offre inventée par l'IA n'est conservée que si l'option est cochée.
      const aiInventedOffer = template_props.offer && typeof template_props.offer === "object"
        ? { ...template_props.offer }
        : null;
      if (aiInventedOffer) {
        // Rich Text respecté : on conserve la mise en forme (gras, puces, retours ligne)
        // si l'IA renvoie du HTML, sinon on reconstruit un HTML propre à partir des lignes.
        const rawMsg = String((aiInventedOffer as any).message_html || (aiInventedOffer as any).message || "");
        const lines = Array.isArray((aiInventedOffer as any).lines)
          ? (aiInventedOffer as any).lines.map((l: unknown) => String(l || "").trim()).filter(Boolean)
          : [];
        const fallbackHtml = lines.length > 0
          ? `<ul>${lines.map((l: string) => `<li>${l.replace(/[<>]/g, "")}</li>`).join("")}</ul>`
          : "";
        (aiInventedOffer as any).message_html = sanitizeRich(rawMsg) || fallbackHtml || undefined;
      }
      template_props.aiCard = options?.ai_card && aiInventedOffer ? aiInventedOffer : null;
      if (template_props.aiCard && Array.isArray(template_props.scene_order) && !template_props.scene_order.includes("ai_card")) {
        template_props.scene_order = [...template_props.scene_order, "ai_card"];
      }
      if (!template_props.aiCard && Array.isArray(template_props.scene_order)) {
        template_props.scene_order = template_props.scene_order.filter((k: unknown) => k !== "ai_card");
      }



      const rawOfferIds = Array.isArray(options?.offer_ids) ? options.offer_ids : [];
      const offerIds = rawOfferIds.filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v));
      if (offerIds.length > 0) {
        const { data: offerRows } = await supa
          .from("affiliate_business_promotions")
          .select("id,title,title_fr,title_en,promotion_type,promotion_value,promotion_currency,promotion_message,promotion_message_fr,promotion_message_en,savings_amount,sort_order")
          .eq("business_id", resolved_business_id)
          .in("id", offerIds)
          .order("sort_order", { ascending: true });
        // Preserve the exact user-selected order (offerIds) when sort_order collides.
        const rows = (offerRows ?? []).slice().sort((a: any, b: any) => {
          const ia = offerIds.indexOf(a.id);
          const ib = offerIds.indexOf(b.id);
          return ia - ib;
        });
        const built = rows
          .map((row: any) => {
            const title = cleanDisplayText(videoLang === "en" ? pickLang(row.title_en, row.title_fr, row.title) : (row.title_fr || row.title)) || undefined;
            const priceStr = row.promotion_type === "percentage" && row.promotion_value != null
              ? `-${row.promotion_value}%`
              : row.promotion_type === "fixed" && row.promotion_value != null
                ? `-${row.promotion_value} ${row.promotion_currency || "MAD"}`
                : row.savings_amount != null
                  ? `-${row.savings_amount} ${row.promotion_currency || "MAD"}`
                  : undefined;
            // Préserve les retours à la ligne du texte de l'offre (HTML <br>, </p>, \n)
            const rawSrc = videoLang === "en"
              ? pickLang(row.promotion_message_en, row.promotion_message_fr, row.promotion_message)
              : (row.promotion_message_fr || row.promotion_message);
            const rawMsg = typeof rawSrc === "string"
              ? rawSrc
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/&nbsp;/gi, " ")
                  .replace(/[ \t]+/g, " ")
                  .replace(/\n{2,}/g, "\n")
                  .trim()
              : "";
            // Le texte de l'offre doit TOUJOURS être affiché : on découpe en segments,
            // et les segments trop longs sont recoupés (au lieu d'être supprimés).
            const chunkLong = (t: string): string[] => {
              if (t.length <= 120) return [t];
              const words = t.split(" ");
              const out: string[] = [];
              let cur = "";
              for (const w of words) {
                if ((cur + " " + w).trim().length > 120) { if (cur) out.push(cur.trim()); cur = w; }
                else cur = (cur + " " + w).trim();
              }
              if (cur) out.push(cur.trim());
              return out;
            };
            const lines = rawMsg
              ? rawMsg
                  .split(/[\n•·|]+/)
                  .map((l: string) => cleanDisplayText(l) || "")
                  .filter(Boolean)
                  .flatMap(chunkLong)
                  .slice(0, 8)
              : [];
            if (!title && !priceStr && lines.length === 0) return null;
            const message_html = typeof rawSrc === "string" ? sanitizeRich(rawSrc) : null;
            return { title, price: priceStr, lines: lines.length ? lines : undefined, message_html: message_html || undefined };
          })
          .filter((o: any) => o !== null);
        if (built.length > 0) {
          template_props.offers = built;
          template_props.offer = built[0]; // backward compat with single-offer template
        } else {
          template_props.offers = [];
          template_props.offer = null;
        }
      } else {
        // Aucune offre cochée dans "Éléments à inclure dans la vidéo" :
        // on supprime toute offre inventée par l'IA pour que l'utilisateur garde le contrôle.
        template_props.offers = [];
        template_props.offer = null;
      }


      // Popup (image d'accueil) — expose une scène dédiée si option cochée et image disponible.
      const wantsPopup = !!options?.popup;
      if (wantsPopup && businessDetails.popup_image_url) {
        template_props.showPopup = true;
        template_props.popupImageUrl = businessDetails.popup_image_url;
        // Titre & texte de l'image popup (business_image_titles) — affichés dans la scène.
        const { data: popupMeta } = await supa
          .from("business_image_titles")
          .select("title,description,title_fr,description_fr,title_en,description_en")
          .eq("business_id", resolved_business_id)
          .eq("image_url", businessDetails.popup_image_url)
          .maybeSingle();
        if (popupMeta) {
          const pTitle = cleanDisplayText(stripHtml(videoLang === "en" ? pickLang(popupMeta.title_en, popupMeta.title_fr, popupMeta.title) : (popupMeta.title_fr || popupMeta.title)) || "");
          const pDesc = cleanDisplayText(stripHtml(videoLang === "en" ? pickLang(popupMeta.description_en, popupMeta.description_fr, popupMeta.description) : (popupMeta.description_fr || popupMeta.description)) || "");
          if (pTitle) template_props.popupTitle = pTitle;
          if (pDesc) template_props.popupDescription = pDesc;
          const pDescHtml = sanitizeRich(videoLang === "en" ? pickLang(popupMeta.description_en, popupMeta.description_fr, popupMeta.description) : (popupMeta.description_fr || popupMeta.description));
          if (pDescHtml) template_props.popupDescriptionHtml = pDescHtml;
        }
      }

      // WhatsApp — scène dédiée si option cochée et numéro disponible.
      const wantsWhatsapp = !!options?.whatsapp;
      const waNumber = (typeof options?.whatsapp_number === "string" && options.whatsapp_number.trim())
        || (typeof businessDetails.whatsapp === "string" && businessDetails.whatsapp.trim())
        || null;
      if (wantsWhatsapp && waNumber) {
        template_props.showWhatsapp = true;
        template_props.whatsappNumber = waNumber;
        // Relation étape WhatsApp ↔ carte Offre (choisie dans l'aperçu du scénario) :
        // "with_offer" = le contenu de l'offre est affiché dans la scène WhatsApp.
        if (options?.whatsapp_offer_mode === "with_offer") template_props.whatsappShowOffer = true;
      }

      const MOTION_EFFECTS = ["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_down", "pan_up", "scroll_v"];
      const pickEffect = (map: unknown, id: string, fallback: string | null): string | null => {
        const v = map && typeof map === "object" ? (map as Record<string, unknown>)[id] : null;
        if (typeof v === "string" && MOTION_EFFECTS.includes(v)) return v;
        return fallback && MOTION_EFFECTS.includes(fallback) ? fallback : null;
      };

      // Blocs highlights sélectionnés — une entrée par bloc dans le scénario.
      const rawHighlightIds = Array.isArray(options?.highlight_ids) ? options.highlight_ids : [];
      const highlightIds = rawHighlightIds.filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v));
      if (highlightIds.length > 0) {
        const { data: hlRows } = await supa
          .from("front_highlights")
          .select("id,icon,image_url,title,description,title_fr,description_fr,title_en,description_en,metric_title,metric_value,metric_title_fr,metric_value_fr,metric_title_en,metric_value_en,sort_order")
          .eq("business_id", resolved_business_id)
          .in("id", highlightIds)
          .order("sort_order", { ascending: true });
        const rows = (hlRows ?? []).slice().sort((a: any, b: any) => {
          const ia = highlightIds.indexOf(a.id);
          const ib = highlightIds.indexOf(b.id);
          return ia - ib;
        });
        const builtH = rows
          .map((row: any) => {
            const rawDesc = videoLang === "en" ? pickLang(row.description_en, row.description_fr, row.description) : (row.description_fr || row.description);
            const title = cleanDisplayText(stripHtml(videoLang === "en" ? pickLang(row.title_en, row.title_fr, row.title) : (row.title_fr || row.title))) || "";
            const description = stripHtml(rawDesc) || "";
            const description_html = sanitizeRich(rawDesc);
            const metric_title = cleanDisplayText(stripHtml(videoLang === "en" ? pickLang(row.metric_title_en, row.metric_title_fr, row.metric_title) : (row.metric_title_fr || row.metric_title))) || "";
            const metric_value = cleanDisplayText(stripHtml(videoLang === "en" ? pickLang(row.metric_value_en, row.metric_value_fr, row.metric_value) : (row.metric_value_fr || row.metric_value))) || "";
            if (!title && !description && !row.image_url && !metric_title && !metric_value) return null;
            return {
              id: row.id,
              icon: row.icon || null,
              image_url: row.image_url || null,
              title,
              description,
              description_html: description_html || undefined,
              effect: pickEffect(options?.highlight_effects, row.id, null) || undefined,
              metric_title: metric_title || undefined,
              metric_value: metric_value || undefined,
            };
          })
          .filter((h: any) => h !== null);
        if (builtH.length > 0) {
          template_props.highlights = builtH;
        }
      }

      // Liens externes / menus & cartes — une séquence par élément coché.
      const uuidOnly = (arr: unknown) => (Array.isArray(arr) ? arr : []).filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) as string[];
      // Textes IA (onglet TXT IA) — une séquence par texte coché.
      const aiTextIds = uuidOnly(options?.ai_text_ids).slice(0, 8);
      if (aiTextIds.length > 0) {
        const { data: rows } = await supa
          .from("business_ai_texts")
          .select("id,title,content,position")
          .eq("business_id", resolved_business_id)
          .in("id", aiTextIds)
          .order("position", { ascending: true });
        const built = (rows ?? [])
          .slice()
          .sort((a: any, b: any) => aiTextIds.indexOf(a.id) - aiTextIds.indexOf(b.id))
          .map((r: any) => ({
            id: r.id,
            title: cleanDisplayText(stripHtml(r.title || "")) || "",
            content: cleanDisplayText(stripHtml(r.content || "")) || "",
            content_html: sanitizeRich(r.content || "") || undefined,
            effect: pickEffect(options?.ai_text_effects, r.id, "zoom_in") || "zoom_in",
          }))
          .filter((r: any) => r.title || r.content);
        if (built.length > 0) template_props.aiTexts = built;
      }

      const linkIds = uuidOnly(options?.external_link_ids).slice(0, 8);
      const menuIds = uuidOnly(options?.menu_doc_ids).slice(0, 8);
      if (linkIds.length > 0 || menuIds.length > 0) {
        const { data: docRows } = await supa
          .from("business_documents")
          .select("id,type,name,description,url,icon,thumbnail_url,sort_order")
          .eq("business_id", resolved_business_id)
          .in("id", [...linkIds, ...menuIds])
          .order("sort_order", { ascending: true });
        const rows = (docRows ?? []) as any[];
        const links = linkIds
          .map((id) => rows.find((r) => r.id === id && r.type === "external_link"))
          .filter(Boolean)
          .map((r: any) => ({
            id: r.id,
            name: cleanDisplayText(stripHtml(r.name || "")) || "Lien",
            label: cleanDisplayText(stripHtml(r.description || "")) || "",
            // Rich Text de la description du document, respecté au montage.
            description: cleanDisplayText(stripHtml(r.description || "")) || "",
            description_html: sanitizeRich(r.description || "") || null,
            url: r.url || null,
            image: typeof r.icon === "string" && r.icon.startsWith("http") ? r.icon : (r.thumbnail_url || null),
          }));
        if (links.length > 0) template_props.externalLinks = links;
        const menus = menuIds
          .map((id) => rows.find((r) => r.id === id && r.type === "menu"))
          .filter(Boolean)
          .map((r: any) => ({
            id: r.id,
            name: cleanDisplayText(stripHtml(r.name || "")) || "Menu",
            description: cleanDisplayText(stripHtml(r.description || "")) || "",
            description_html: sanitizeRich(r.description || "") || null,
            url: r.url || null,
          }));
        if (menus.length > 0) template_props.menuDocs = menus;

      }
    }

    // Widgets Météo / Marées, Vents & Météo — 5 s par défaut, données déterministes.
    // Chaque widget est tenté indépendamment : si l'un échoue, l'autre reste monté.
    // Hook vide en base → on n'invente rien et on retire l'étape Hook du scénario
    // (kind "name" côté montage) au lieu de reprendre la Description.
    if (template_id === "business-showcase" && businessDetails) {
      const dbHook = stripHtml(
        videoLang === "en"
          ? pickLang(businessDetails.hook_en, businessDetails.hook_fr, businessDetails.destination_hook, businessDetails.poi_hook)
          : (businessDetails.hook_fr || businessDetails.destination_hook || businessDetails.poi_hook),
      );
      if (!dbHook || !dbHook.trim()) {
        delete (template_props as any).hook;
        delete (template_props as any).useFullHookScene;
        const order = (template_props as any).scene_order;
        if (Array.isArray(order)) {
          (template_props as any).scene_order = order.filter((k: unknown) => String(k) !== "name");
        }
      }
    }

    const ensureSceneInOrder = (kind: "weather" | "tides") => {
      const order = (template_props as any).scene_order;
      if (!Array.isArray(order) || !order.length) return; // ordre implicite → déjà géré côté Remotion
      if (order.includes(kind)) return;
      // On insère avant la séquence de clôture (cta / outro) si elle existe.
      const closingIdx = order.findIndex((k: unknown) => k === "cta" || k === "outro");
      if (closingIdx >= 0) order.splice(closingIdx, 0, kind);
      else order.push(kind);
    };
    // Étapes BIENVENUE / PROPOSITION (Présence en ligne / CTAs) — juste après le logo,
    // avant « Nom & identité » (kind "hook" côté montage).
    // Widgets Météo / Marées : juste APRÈS l'étape Hook (kind "name" côté montage).
    const insertAfterHookScene = (kind: "weather" | "tides") => {
      const order = (template_props as any).scene_order;
      if (!Array.isArray(order) || !order.length) return;
      if (order.includes(kind)) return;
      let idx = order.indexOf("name");
      if (idx < 0) idx = order.indexOf("hook");
      if (idx < 0) {
        const closingIdx = order.findIndex((k: unknown) => k === "cta" || k === "outro");
        idx = closingIdx >= 0 ? closingIdx - 1 : order.length - 1;
      }
      // On insère après l'étape trouvée, et après un widget déjà inséré.
      let at = idx + 1;
      while (at < order.length && (order[at] === "weather" || order[at] === "tides")) at++;
      order.splice(at, 0, kind);
    };
    const insertIntroScene = (kind: "welcome" | "proposition") => {
      const order = (template_props as any).scene_order;
      if (!Array.isArray(order) || !order.length) return;
      if (order.includes(kind)) return;
      const anchors = kind === "welcome" ? ["hook"] : ["hook"];
      let idx = -1;
      if (kind === "proposition") {
        const w = order.indexOf("welcome");
        if (w >= 0) idx = w + 1;
      }
      if (idx < 0) {
        const hookIdx = order.findIndex((k: unknown) => anchors.includes(String(k)));
        idx = hookIdx >= 0 ? hookIdx : (order[0] === "logo" ? 1 : 0);
      }
      order.splice(idx, 0, kind);
    };
    const welcomeText = typeof options?.welcome_text === "string" ? options.welcome_text.trim().slice(0, 160) : "";
    const propositionText = typeof options?.proposition_text === "string" ? options.proposition_text.trim().slice(0, 160) : "";
    if (welcomeText) {
      template_props.welcomeText = welcomeText;
      if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
      if ((template_props as any).scene_durations.welcome == null) (template_props as any).scene_durations.welcome = 3;
      insertIntroScene("welcome");
    }
    if (propositionText) {
      template_props.propositionText = propositionText;
      if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
      if ((template_props as any).scene_durations.proposition == null) (template_props as any).scene_durations.proposition = 3;
      insertIntroScene("proposition");
    }

    const bizName = String((template_props as any)?.name || "Nous");
    if (options?.weather_widget) {
      try {
        const w = await fetchWeatherWidget(options?.weather_city, Number(options?.weather_range) || 1, bizName, videoLang);
        // Texte modifiable dans la carte « Widget Météo » de l'aperçu du scénario.
        const weatherOv = (template_props as any)?.textOverrides?.weather?.description;
        if (typeof weatherOv === "string" && weatherOv.trim()) w.text = weatherOv.trim();
        template_props.showWeatherWidget = true;
        template_props.weatherWidget = w;
        if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
        if ((template_props as any).scene_durations.weather == null) (template_props as any).scene_durations.weather = 6;
        insertAfterHookScene("weather");
      } catch (e) {
        console.warn("[widgets] weather fetch failed", (e as Error).message);
      }
    }
    if (options?.tides_widget) {
      try {
        const t = await fetchTidesWidget(options?.tides_city, String(options?.tides_mode || "all"), bizName, videoLang);
        template_props.showTidesWidget = true;
        template_props.tidesWidget = t;
        if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
        if ((template_props as any).scene_durations.tides == null) (template_props as any).scene_durations.tides = 6;
        insertAfterHookScene("tides");
      } catch (e) {
        console.warn("[widgets] tides fetch failed", (e as Error).message);
      }
    }

    // ── Configuration backoffice (/staff/backoffice/videos → « Ordre et durées des étapes »).
    // Source de vérité unique : table video_scenario_steps. Toute modification y est
    // reprise automatiquement, ici (montage) comme dans l'aperçu du Studio.
    let cfgOrder: string[] = [];
    const cfgDurations: Record<string, number> = {};
    const cfgDisabled = new Set<string>();
    try {
      const cfgMode = business_id ? "business" : "corporate";
      const { data: cfgRows } = await supa
        .from("video_scenario_steps")
        .select("scene_key, position, duration_sec, enabled")
        .eq("mode", cfgMode)
        .order("position", { ascending: true });
      for (const r of cfgRows ?? []) {
        const key = String((r as any).scene_key);
        if ((r as any).enabled === false) {
          cfgDisabled.add(key);
          continue;
        }
        cfgOrder.push(key);
        const d = Number((r as any).duration_sec);
        if (Number.isFinite(d) && d > 0) cfgDurations[key] = Math.round(d);
      }
    } catch (e) {
      console.warn("[scenario-config] lecture video_scenario_steps échouée", (e as Error).message);
    }

    // Durées par défaut (secondes) — celles du backoffice d'abord, puis un filet de
    // sécurité si la table est vide.
    {
      if (!(template_props as any).scene_durations) (template_props as any).scene_durations = {};
      const sd = (template_props as any).scene_durations as Record<string, number>;
      const manualDurations = options?.manual_durations === true;
      const fallback: Record<string, number> = {
        welcome: 3, proposition: 3, name: 6, ai_card: 5, hours: 3, map: 3, digital: 3, weather: 6, tides: 6,
      };
      // Le backoffice prime sur les durées calculées côté client, sauf réglage manuel
      // explicite de l'utilisateur dans l'aperçu du scénario.
      for (const [k, v] of Object.entries(cfgDurations)) {
        if (!manualDurations || sd[k] == null) sd[k] = v;
      }
      for (const [k, v] of Object.entries(fallback)) if (sd[k] == null) sd[k] = v;
    }

    // Ordre du montage — l'IA ne décide plus du déroulé : ordre backoffice, sinon canon.
    {
      const CANON = cfgOrder.length
        ? cfgOrder
        : [
            "logo", "welcome", "popup", "proposition", "weather", "tides",
            "hook", "name", "ai_text", "ai_card", "offer", "highlight",
            "external_link", "menu_doc", "media",
            "reviews", "google_review", "tripadvisor", "restaurant_guru", "customer_review",
            "hours", "map", "digital", "blog", "whatsapp", "cta", "outro",
          ];
      const order = (template_props as any).scene_order;
      if (Array.isArray(order) && order.length) {
        const rank = (k: unknown) => {
          const i = CANON.indexOf(String(k));
          return i < 0 ? CANON.length : i;
        };
        (template_props as any).scene_order = order
          .filter((k: unknown) => !cfgDisabled.has(String(k)))
          .map((k: unknown, i: number) => ({ k, i }))
          .sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i)
          .map((x) => x.k);
      }
    }



    // Format de sortie (canvas Remotion) — vertical 720×1280 par défaut.
    {
      const cw = Number(options?.canvas_width);
      const ch = Number(options?.canvas_height);
      (template_props as Record<string, unknown>).canvas_width =
        Number.isFinite(cw) && cw >= 320 && cw <= 3840 ? Math.round(cw) : 720;
      (template_props as Record<string, unknown>).canvas_height =
        Number.isFinite(ch) && ch >= 320 && ch <= 3840 ? Math.round(ch) : 1280;
    }

    if (preview_only) {

      return json({
        preview: true,
        template_id,
        template_props,
        resolved_business_id,
        rationale: parsed.rationale,
        duration_sec,
      });
    }

    // Les textes issus de l'IA et de certains documents peuvent contenir des
    // caractères NUL / substituts Unicode isolés refusés par PostgreSQL jsonb.
    // On normalise également NaN/Infinity avant l'envoi à PostgREST.
    const sanitizeJson = (value: unknown): unknown => {
      if (value === null || typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value
          .replace(/\u0000/g, "")
          .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "�")
          .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1�");
      }
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (Array.isArray(value)) return value.map(sanitizeJson);
      if (typeof value === "object") {
        const clean: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          if (child !== undefined && typeof child !== "function" && typeof child !== "symbol") {
            clean[key] = sanitizeJson(child);
          }
        }
        return clean;
      }
      return null;
    };

    const cleanTemplateProps = sanitizeJson(template_props) as Record<string, unknown>;
    const cleanScenario = sanitizeJson({
      ...parsed,
      studio_options: { ...(options ?? {}), lang: videoLang },
    }) as Record<string, unknown>;

    // PostgREST décode toute la requête comme un unique document JSON avant
    // d'écrire les colonnes. Un caractère invalide dans un simple champ texte
    // (prompt, tone, e-mail…) suffit donc à faire échouer aussi les jsonb.
    const insertPayload = sanitizeJson({
      business_id: resolved_business_id,
      user_id: callerUserId,
      prompt,
      duration_sec: durationNum,
      tone,
      template_id,
      template_props: cleanTemplateProps,
      scenario_json: cleanScenario,
      status: "pending",
      parent_job_id: parentJob?.id ?? null,
      notify_email: Boolean(body?.notify_email),
      notify_email_to: body?.notify_email ? (body?.notify_email_to ?? null) : null,
    }) as Record<string, unknown>;

    // Valide explicitement le document exact qui sera transmis. Le round-trip
    // élimine aussi les prototypes/valeurs exotiques qui auraient échappé au
    // nettoyage récursif.
    const serializedPayload = JSON.stringify(insertPayload);
    const validatedPayload = JSON.parse(serializedPayload) as Record<string, unknown>;

    const { data: job, error } = await supa
      .from("video_jobs")
      .insert(validatedPayload)
      .select()
      .single();

    if (error) {
      console.error(
        "video_jobs insert failed:",
        error.message,
        error.details ?? "",
        error.hint ?? "",
        `payload_bytes=${new TextEncoder().encode(serializedPayload).length}`,
      );
      return json({ error: error.message }, 500);
    }

    return json({ job, template_id, resolved_business_id, rationale: parsed.rationale });
  } catch (e) {
    console.error("video-scenario-generate failed:", (e as Error)?.message, (e as Error)?.stack);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
