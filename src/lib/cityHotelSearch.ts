// Recherche de disponibilité hôtelière à l'échelle d'une ville (SerpAPI + mappings).
// Logique extraite de /search (handleHotelSearch) pour être réutilisée par
// l'assistant IA plateforme (/embed/ask) sans dupliquer le matching.

import { supabase } from "@/integrations/supabase/client";
import type { FallbackPanelData } from "@/components/HotelAvailabilityOverlay";

export interface CityHotelSearchParams {
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency?: string;
}

export interface CityHotelSearchResult extends FallbackPanelData {
  /** Fiches Lovable Cloud correspondantes (pour ouvrir la fiche business). */
  businesses: any[];
  /**
   * Autres hôtels/riads actifs de la ville pour lesquels SerpAPI n'a retourné
   * aucune disponibilité : ils prolongent le feed vidéo en affichage normal.
   */
  otherBusinessIds: string[];
}

function normalizeHotelName(value: unknown): string {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

/** Hash simple d'une chaîne en entier 32 bits (graine de mélange). */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates déterministe piloté par un PRNG mulberry32. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const BIZ_FIELDS =
  "id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, latitude, longitude, rating, min_price, main_category";

/** Ville non renseignée (ou `*` / `all`) = recherche sur toutes les villes couvertes. */
export const ALL_CITIES = "*";

export async function searchCityHotels(params: CityHotelSearchParams): Promise<CityHotelSearchResult> {
  const requested = (params.cityName || "").trim();
  const allCities = !requested || requested === ALL_CITIES || /^all$/i.test(requested);
  const { checkIn, checkOut, adults } = params;

  const [mappingResult, gammeResult] = await Promise.all([
    // RPC publique (security definer) : `hotel_mappings` est réservée au staff en
    // lecture directe, l'assistant tourne en anonyme.
    // `%` (ilike) = tous les mappings, toutes villes confondues.
    supabase.rpc("get_hotel_mappings_by_city", { _city: allCities ? "%" : requested }),
    supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
  ]);
  const allMappings = (mappingResult.data || []) as any[];
  const gammes = (gammeResult.data || []) as any[];

  // Villes réellement interrogées : celle demandée, ou toutes celles qui ont au
  // moins un établissement mappé (une requête SerpAPI par ville).
  const cities = allCities
    ? [...new Set(allMappings.map((m: any) => String(m.city || "").trim()).filter(Boolean))]
    : [requested];
  const mappingsByCity = new Map<string, any[]>();
  for (const c of cities) mappingsByCity.set(c, []);
  for (const m of allMappings) {
    const c = String(m.city || "").trim();
    const bucket = allCities ? mappingsByCity.get(c) : mappingsByCity.get(requested);
    if (bucket) bucket.push(m);
  }

  const matches = new Map<string, { mapping: any; serpMatch: any }>();
  const serpResults = await Promise.all(
    cities.map(async (city) => {
      const cityMappings = mappingsByCity.get(city) || [];
      const serpResult = await supabase.functions.invoke("serpapi-hotels", {
        // Les hôtels référencés ne sont pas nécessairement dans les premières
        // pages Google : profondeur maximale sur les villes bien couvertes,
        // réduite là où un seul établissement est mappé (coût SerpAPI).
        body: {
          cityName: city,
          checkIn,
          checkOut,
          adults,
          currency: params.currency || "EUR",
          maxPages: cityMappings.length > 5 ? 10 : 3,
        },
      });
      if (serpResult.error) {
        // Une ville en échec ne doit pas annuler les autres.
        if (cities.length === 1) throw serpResult.error;
        return { city, hotels: [] as any[] };
      }
      return { city, hotels: ((serpResult.data as any)?.data || []) as any[] };
    }),
  );

  for (const { city, hotels: serpHotels } of serpResults) {
    const serpByExactName = new Map<string, any>();
    for (const h of serpHotels) {
      const n = normalizeHotelName(h.name);
      if (n && !serpByExactName.has(n)) serpByExactName.set(n, h);
    }
    for (const m of mappingsByCity.get(city) || []) {
      const mn = normalizeHotelName(m.serp_hotel_name);
      if (!m.business_id || !mn || matches.has(m.business_id)) continue;
      const sm = serpByExactName.get(mn);
      if (sm) matches.set(m.business_id, { mapping: m, serpMatch: sm });
    }
  }

  const bizIds = [...matches.keys()];
  let bizMap = new Map<string, any>();
  if (bizIds.length > 0) {
    const { data: bizData } = await supabase
      .from("businesses")
      .select(BIZ_FIELDS)
      .in("id", bizIds)
      .eq("is_active", true)
      .eq("main_category", "Hôtellerie");
    bizMap = new Map((bizData || []).map((b: any) => [b.id, b]));
  }

  const gammeMap = new Map(gammes.map((g: any) => [g.id, g]));
  const hotels: any[] = [];
  const businesses: any[] = [];
  for (const { mapping, serpMatch } of matches.values()) {
    const biz = bizMap.get(mapping.business_id);
    if (!biz) continue;
    const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;
    businesses.push(biz);
    hotels.push({
      hotelId: mapping.id || biz.id,
      businessId: biz.id,
      name: biz.name,
      wtuce_status: biz.wtuce_status || undefined,
      offers: [],
      dbImage: biz.images?.[0] || undefined,
      mainImage: serpMatch.thumbnail || undefined,
      dbGoogleRating: biz.google_rating,
      dbGoogleReviewCount: biz.google_review_count,
      dbTripadvisorRating: biz.tripadvisor_rating,
      dbTripadvisorReviewCount: biz.tripadvisor_review_count,
      serpPrice: serpMatch.ratePerNight || null,
      reserveNowUrl: biz.reserve_now_url,
      manualPriceRange: biz.manual_price_range,
      isCurrentHotel: false,
      gamme: gammeInfo
        ? { name_fr: gammeInfo.name_fr, color_hex: gammeInfo.color_hex, text_color_hex: gammeInfo.text_color_hex }
        : null,
      dealDescription: serpMatch.dealDescription || null,
      dbBusiness: biz,
    });
  }

  // Tri : prix SerpAPI croissant quand connu, puis note.
  const price = (h: any) => {
    const raw = h.serpPrice && typeof h.serpPrice === "object" ? h.serpPrice.amount : h.serpPrice;
    const n = parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
  };
  hotels.sort((a, b) => price(a) - price(b) || (b.dbGoogleRating || 0) - (a.dbGoogleRating || 0));

  // Suite du feed vidéo : les autres hôtels/riads actifs de la ville, sans
  // disponibilité SerpAPI, à parcourir en affichage normal.
  const matchedIds = new Set(hotels.map((h: any) => String(h.businessId)));
  let otherQuery = supabase
    .from("businesses")
    .select("id, computed_rating, total_review_count")
    .eq("is_active", true)
    .eq("main_category", "Hôtellerie");
  otherQuery = allCities ? otherQuery.in("city", cities) : otherQuery.ilike("city", requested);
  const { data: otherRows } = await otherQuery
    .order("computed_rating", { ascending: false, nullsFirst: false })
    .limit(200);
  // Mélange stable par seed (Fisher-Yates + mulberry32) pour que la suite du
  // feed varie d'une recherche à l'autre au lieu de toujours retourner les
  // mêmes têtes de liste (tri par note = ordre identique à chaque tour).
  // Seed = ville + dates + horodatage : un même résultat de recherche garde un
  // ordre fixe (il est capturé une fois), deux recherches successives diffèrent.
  const otherBusinessIds = seededShuffle(
    (otherRows || []).map((b: any) => String(b.id)).filter((id) => !matchedIds.has(id)),
    hashSeed(`${cities.join(",")}|${checkIn}|${checkOut}|${Date.now()}`),
  );

  return {
    otherBusinessIds,
    hotels,
    // Libellé affiché : la ville demandée, sinon la liste des villes couvertes.
    city: allCities ? cities.join(", ") : requested,
    checkIn,
    checkOut,
    adults,
    source: "serpapi",
    gammes: gammes.map((g: any) => ({
      id: g.id,
      name_fr: g.name_fr,
      color_hex: g.color_hex,
      text_color_hex: g.text_color_hex,
      sort_order: g.sort_order,
    })),
    businesses,
  };
}
