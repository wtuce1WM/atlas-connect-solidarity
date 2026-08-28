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
}

const BIZ_FIELDS =
  "id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, latitude, longitude, rating, min_price, main_category";

export async function searchCityHotels(params: CityHotelSearchParams): Promise<CityHotelSearchResult> {
  const cityName = (params.cityName || "").trim();
  const { checkIn, checkOut, adults } = params;

  const [mappingResult, gammeResult] = await Promise.all([
    // RPC publique (security definer) : `hotel_mappings` est réservée au staff en
    // lecture directe, l'assistant tourne en anonyme.
    supabase.rpc("get_hotel_mappings_by_city", { _city: cityName }),
    supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
  ]);
  const allMappings = (mappingResult.data || []) as any[];
  const gammes = (gammeResult.data || []) as any[];
  const maxPages = Math.max(1, Math.ceil(allMappings.length / 20));

  const serpResult = await supabase.functions.invoke("serpapi-hotels", {
    body: { cityName, checkIn, checkOut, adults, currency: params.currency || "EUR", maxPages },
  });
  const serpHotels = ((serpResult.data as any)?.data || []) as any[];

  const serpByExactName = new Map<string, any>();
  for (const h of serpHotels) {
    const n = typeof h.name === "string" ? h.name.trim().toLowerCase() : "";
    if (n && !serpByExactName.has(n)) serpByExactName.set(n, h);
  }

  const matches = new Map<string, { mapping: any; serpMatch: any }>();
  for (const m of allMappings) {
    const mn = typeof m.serp_hotel_name === "string" ? m.serp_hotel_name.trim().toLowerCase() : "";
    if (!m.business_id || !mn || matches.has(m.business_id)) continue;
    const sm = serpByExactName.get(mn);
    if (sm) matches.set(m.business_id, { mapping: m, serpMatch: sm });
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
    const n = parseFloat(String(h.serpPrice ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
  };
  hotels.sort((a, b) => price(a) - price(b) || (b.dbGoogleRating || 0) - (a.dbGoogleRating || 0));

  return {
    hotels,
    city: cityName,
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
