// Route forcée par le back-office (champ `route_override` d'une suggestion / relance).
// Autorité : quand une entrée curatée impose une route, le moteur n'essaie AUCUNE
// détection d'intention sur le libellé. Une seule implémentation partagée par les
// 3 surfaces (embed / club / search), branchée dans `embed-ai-chat-v2`.

import { normalize, toMapMarker, fetchPriorFull, orderByIds } from "./shared.ts";
import { buildHoursAnswer, buildHoursForBusinesses, buildHoursRanking, buildOpenFilter } from "./opening.ts";
import { buildBookingAnswer, buildBookingForBusinesses } from "./booking.ts";
import { buildDistanceRanking, buildDistanceList, buildRatingRanking, buildCountAnswer } from "./ranking.ts";
import { buildNearbyOverview, buildPoiNearby } from "./nearby.ts";
import { buildDescribePriors, parseDescribeFacet } from "./describe.ts";
import { resolveTidesCity, tidesIntro } from "./tides.ts";

export type Lang = "fr" | "en" | "ar";

export type ForcedRouteKey =
  | "search_businesses"
  | "show_on_map"
  | "contacts"
  | "opening_hours"
  | "hours_ranking_opens_first"
  | "hours_ranking_closes_last"
  | "open_now"
  | "booking"
  | "distance_ranking_closest"
  | "distance_ranking_farthest"
  | "rating_best"
  | "rating_most_reviewed"
  | "weather"
  | "tides"
  | "poi_nearby"
  | "nearby_overview"
  | "describe"
  | "count"
  | "llm";

/** Catalogue partagé back-office / moteur (libellés FR pour le staff). */
export const FORCED_ROUTES: Array<{ key: ForcedRouteKey; label: string; hint: string }> = [
  { key: "search_businesses", label: "🔍 Recherche d'établissements", hint: "Recherche déterministe puis synthèse (route par défaut du moteur)." },
  { key: "show_on_map", label: "🗺 Afficher sur la carte", hint: "Recentre la carte sur les établissements du tour précédent." },
  { key: "contacts", label: "📞 Coordonnées (tél / WhatsApp)", hint: "Téléphone, WhatsApp et adresse des établissements présentés." },
  { key: "opening_hours", label: "🕒 Horaires", hint: "Horaires détaillés des établissements présentés (ou de l'hôte)." },
  { key: "hours_ranking_opens_first", label: "🌅 Qui ouvre le plus tôt", hint: "Classement par heure d'ouverture." },
  { key: "hours_ranking_closes_last", label: "🌙 Qui ferme le plus tard", hint: "Classement par heure de fermeture." },
  { key: "open_now", label: "🟢 Ouvert maintenant", hint: "Filtre sur les établissements ouverts à l'instant." },
  { key: "booking", label: "🎟 Réservation en ligne", hint: "Liens de réservation, téléphone et WhatsApp." },
  { key: "distance_ranking_closest", label: "📏 Les plus proches", hint: "Classement par distance croissante depuis l'hôte." },
  { key: "distance_ranking_farthest", label: "📏 Les plus éloignés", hint: "Classement par distance décroissante depuis l'hôte." },
  { key: "rating_best", label: "⭐ Les mieux notés", hint: "Classement par note." },
  { key: "rating_most_reviewed", label: "⭐ Les plus commentés", hint: "Classement par nombre d'avis." },
  { key: "weather", label: "🌤 Météo (widget)", hint: "Widget météo de la ville active." },
  { key: "tides", label: "🌊 Marées (widget)", hint: "Widget marées / vent de la ville côtière." },
  { key: "poi_nearby", label: "📍 Points d'intérêt à proximité", hint: "Uniquement les POI dans le rayon de proximité." },
  { key: "nearby_overview", label: "🧭 Aperçu à proximité", hint: "Panorama des établissements 1WM dans le rayon." },
  { key: "describe", label: "📝 Détailler les résultats", hint: "Détail cuisine / ambiance / services des établissements présentés." },
  { key: "count", label: "🔢 Comptage", hint: "Nombre d'établissements du tour précédent." },
  { key: "llm", label: "💬 LLM direct", hint: "Réponse générative sans route déterministe." },
];

export function isForcedRouteKey(v: unknown): v is ForcedRouteKey {
  return typeof v === "string" && FORCED_ROUTES.some((r) => r.key === v);
}

export type ForcedRouteResult = {
  /** Texte à émettre (marqueurs inclus si la route en produit). */
  text: string;
  /** Route à loguer. */
  route: string;
  resultsCount: number;
  /** Établissements à envoyer à la carte (marqueur SHOW_ON_MAP). */
  mapBusinesses?: any[];
  /** Ids à mémoriser côté client (marqueur KNOWN_BUSINESSES). */
  knownBusinesses?: Array<{ id: string; name: string; slug?: string | null }>;
};

const CONTACT_FIELDS =
  "id, name, slug, city, neighborhood, address, phone, whatsapp, latitude, longitude, logo_url, images, " +
  "main_category, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements";

async function buildContacts(admin: any, ids: string[], host: any, lang: Lang): Promise<ForcedRouteResult | null> {
  const targetIds = ids.length ? ids.slice(0, 10) : host?.id ? [String(host.id)] : [];
  if (!targetIds.length) return null;
  const { data } = await admin.from("businesses").select(CONTACT_FIELDS).in("id", targetIds);
  const rows = orderByIds((Array.isArray(data) ? data : []) as any[], targetIds);
  if (!rows.length) return null;

  const intro = {
    fr: rows.length > 1 ? "Voici les coordonnées pour appeler directement 👇" : "Voici les coordonnées 👇",
    en: rows.length > 1 ? "Here are the numbers to call directly 👇" : "Here are the contact details 👇",
    ar: "إليك بيانات الاتصال 👇",
  }[lang];

  const lines = rows.map((b: any) => {
    const place = [b.neighborhood, b.city].filter(Boolean).join(" · ");
    const bits: string[] = [];
    if (b.phone) bits.push(`[📞 ${b.phone}](tel:${String(b.phone).replace(/[^\d+]/g, "")})`);
    if (b.whatsapp) bits.push(`[💬 WhatsApp](https://wa.me/${String(b.whatsapp).replace(/[^\d]/g, "")})`);
    if (!bits.length) {
      bits.push({ fr: "numéro non renseigné", en: "no number on file", ar: "لا يوجد رقم" }[lang]);
    }
    const addr = b.address ? `\n  ${b.address}` : "";
    return `- **${b.name}**${place ? ` — ${place}` : ""}\n  ${bits.join(" · ")}${addr}`;
  });

  const outro = {
    fr: "\n\nJe t'aide à réserver ou je te donne les horaires ?",
    en: "\n\nWant me to help you book, or share the opening hours?",
    ar: "\n\nهل أساعدك في الحجز أم أعطيك مواعيد العمل؟",
  }[lang];

  return {
    text: `${intro}\n\n${lines.join("\n")}${outro}`,
    route: "business_qa",
    resultsCount: rows.length,
    mapBusinesses: rows,
    knownBusinesses: rows.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug })),
  };
}

async function buildShowOnMap(admin: any, ids: string[], host: any, lang: Lang): Promise<ForcedRouteResult | null> {
  const targetIds = ids.length ? ids.slice(0, 20) : host?.id ? [String(host.id)] : [];
  if (!targetIds.length) return null;
  const rows = orderByIds(await fetchPriorFull(admin, targetIds), targetIds);
  if (!rows.length) return null;
  const intro = {
    fr: rows.length > 1 ? `Voici les ${rows.length} adresses sur la carte 👇` : "Voici l'adresse sur la carte 👇",
    en: rows.length > 1 ? `Here are the ${rows.length} addresses on the map 👇` : "Here it is on the map 👇",
    ar: "إليك المواقع على الخريطة 👇",
  }[lang];
  return {
    text: intro,
    route: "map",
    resultsCount: rows.length,
    mapBusinesses: rows,
    knownBusinesses: rows.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug })),
  };
}

export interface ForcedRouteContext {
  admin: any;
  key: ForcedRouteKey;
  lang: Lang;
  host: any;
  priorIds: string[];
  userMessage: string;
  scopeCity: string;
  radiusKm: number;
  hostCategoryNames?: Set<string>;
}

/**
 * Exécute la route imposée. Retourne `null` quand la route n'est pas applicable
 * (pas d'hôte, pas de résultats précédents…) → l'appelant reprend le flux normal.
 * `search_businesses` et `llm` retournent `null` volontairement : ce sont des
 * routes « laisse faire le moteur ».
 */
export async function runForcedRoute(ctx: ForcedRouteContext): Promise<ForcedRouteResult | null> {
  const { admin, key, lang, host, priorIds, userMessage, scopeCity, radiusKm } = ctx;
  const ids = priorIds.filter(Boolean);

  switch (key) {
    case "search_businesses":
    case "llm":
      return null;

    case "show_on_map":
      return await buildShowOnMap(admin, ids, host, lang);

    case "contacts":
      return await buildContacts(admin, ids, host, lang);

    case "opening_hours": {
      const text = ids.length
        ? await buildHoursForBusinesses(admin, ids.slice(0, 12), lang)
        : buildHoursAnswer(host, lang);
      return text ? { text, route: "opening", resultsCount: ids.length || 1 } : null;
    }

    case "hours_ranking_opens_first":
    case "hours_ranking_closes_last": {
      if (!ids.length) return null;
      const mode = key === "hours_ranking_opens_first" ? "opens_first" : "closes_last";
      const text = await buildHoursRanking(admin, ids, mode, lang);
      return text ? { text, route: "opening", resultsCount: ids.length } : null;
    }

    case "open_now": {
      if (!ids.length) return null;
      const text = await buildOpenFilter(admin, ids, { kind: "now", label: "now" }, lang);
      return text ? { text, route: "opening", resultsCount: ids.length } : null;
    }

    case "booking": {
      const text = ids.length
        ? await buildBookingForBusinesses(admin, ids.slice(0, 12), lang)
        : host ? buildBookingAnswer(host, lang) : null;
      return text ? { text, route: "booking", resultsCount: ids.length || 1 } : null;
    }

    case "distance_ranking_closest":
    case "distance_ranking_farthest": {
      if (!ids.length || !host) return null;
      const mode = key === "distance_ranking_closest" ? "closest" : "farthest";
      const text = await buildDistanceRanking(admin, host, ids, mode, lang)
        ?? await buildDistanceList(admin, host, ids, lang);
      return text ? { text, route: "nearby", resultsCount: ids.length } : null;
    }

    case "rating_best":
    case "rating_most_reviewed": {
      if (!ids.length) return null;
      const mode = key === "rating_best" ? "best_rated" : "most_reviewed";
      const text = await buildRatingRanking(admin, ids, mode, lang);
      return text ? { text, route: "discover", resultsCount: ids.length } : null;
    }

    case "weather": {
      const { data, error } = await admin.functions.invoke("get-weather", { body: { city: scopeCity } });
      if (error || !data || (data as any).error) return null;
      const w = data as any;
      const intro = {
        fr: `Voici la météo à **${w.city_name || scopeCity}** et la tendance des 3 prochains jours. 👇`,
        en: `Here's the weather in **${w.city_name || scopeCity}** and the 3-day trend. 👇`,
        ar: `إليك حالة الطقس في **${w.city_name || scopeCity}** والتوقعات للأيام الثلاثة القادمة. 👇`,
      }[lang];
      const payload = {
        city_name: w.city_name || scopeCity, temp: w.temp, feels_like: w.feels_like,
        temp_min: w.temp_min, temp_max: w.temp_max, humidity: w.humidity,
        wind_speed: w.wind_speed, description: w.description || "", icon: w.icon || "",
        hourly: Array.isArray(w.hourly) ? w.hourly.slice(0, 8) : [],
        daily: Array.isArray(w.daily) ? w.daily.slice(0, 3) : [],
      };
      return { text: `${intro}\n\n<!--WEATHER_FORECAST:${JSON.stringify(payload)}-->`, route: "weather", resultsCount: 0 };
    }

    case "tides": {
      const coast = resolveTidesCity(userMessage, scopeCity);
      return {
        text: `${tidesIntro(coast.name, lang)}\n\n<!--TIDES_FORECAST:${JSON.stringify({ city: coast.slug, city_name: coast.name })}-->`,
        route: "tides",
        resultsCount: 0,
      };
    }

    case "poi_nearby": {
      if (!host) return null;
      const text = await buildPoiNearby(admin, host, lang, radiusKm);
      return text && text.trim() ? { text, route: "nearby", resultsCount: 0 } : null;
    }

    case "nearby_overview": {
      if (!host) return null;
      const cats = ctx.hostCategoryNames ?? new Set<string>(
        [...(Array.isArray(host.categories) ? host.categories : []), host.main_category]
          .map((c: string) => normalize(c)).filter(Boolean),
      );
      const text = await buildNearbyOverview(admin, host, cats, lang, radiusKm);
      return text && text.trim() ? { text, route: "nearby", resultsCount: 0 } : null;
    }

    case "describe": {
      if (!ids.length) return null;
      const facet = parseDescribeFacet(userMessage);
      const text = await buildDescribePriors(admin, ids, facet, lang, host);
      return text ? { text, route: "business_qa", resultsCount: ids.length } : null;
    }

    case "count": {
      if (!ids.length) return null;
      return { text: buildCountAnswer(ids.length, lang), route: "discover", resultsCount: ids.length };
    }
  }
  return null;
}

/** Marqueur carte pour une route forcée. */
export function forcedMapMarker(rows: any[]): string {
  return toMapMarker(rows, null);
}
