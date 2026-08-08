import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FallbackPanelData, FallbackHotel } from "@/components/HotelAvailabilityOverlay";

interface UseHotelAvailabilityParams {
  business: any;
  businessId: string;
  serpApiMapping: any;
  hasSerpMapping: boolean;
  language: string;
  setHotelSearchLoading: (v: boolean) => void;
  openFallback: (data: FallbackPanelData) => void;
  hideCards: () => void;
}

export function useHotelAvailability({
  business,
  businessId,
  serpApiMapping,
  hasSerpMapping,
  language,
  setHotelSearchLoading,
  openFallback,
  hideCards,
}: UseHotelAvailabilityParams) {
  const handleCheckAvailability = useCallback(async (checkIn: string, checkOut: string, adults: number) => {
    if (!business) return;
    setHotelSearchLoading(true);

    try {
      const cityName = serpApiMapping?.city || business.city || "";
      if (!cityName) throw new Error("City not found");

      // Non-mapped hotel: skip SerpAPI, show unavailability after 500ms
      if (!hasSerpMapping) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const [mappingResult, gammeResult] = await Promise.all([
          supabase.from("hotel_mappings").select("id, serp_hotel_name, business_id, city").ilike("city", cityName),
          supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
        ]);

        const allMappings = (mappingResult.data || []) as any[];
        const gammes = gammeResult.data || [];
        const bizIds = allMappings.map((m: any) => m.business_id).filter(Boolean);
        let altHotels: FallbackHotel[] = [];

        if (bizIds.length > 0) {
          const { data: bizData } = await supabase
            .from("businesses")
            .select("id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, skype, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, badge_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, online_shop_url, latitude, longitude, google_maps_url, rating, website, min_price, main_category")
            .in("id", bizIds)
            .eq("is_active", true)
            .eq("main_category", "Hôtellerie");

          const gammeMap = new Map(gammes.map((g: any) => [g.id, g]));
          const deduped = new Map<string, any>();
          for (const m of allMappings) {
            if (!deduped.has(m.business_id)) deduped.set(m.business_id, m);
          }

          for (const biz of (bizData || [])) {
            if (biz.id === businessId) continue;
            const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;
            altHotels.push({
              hotelId: biz.id,
              businessId: biz.id,
              name: biz.name,
              wtuce_status: biz.wtuce_status || undefined,
              offers: [],
              dbImage: biz.images?.[0] || undefined,
              dbGoogleRating: biz.google_rating,
              dbGoogleReviewCount: biz.google_review_count,
              dbTripadvisorRating: biz.tripadvisor_rating,
              dbTripadvisorReviewCount: biz.tripadvisor_review_count,
              serpPrice: null,
              reserveNowUrl: biz.reserve_now_url,
              manualPriceRange: biz.manual_price_range,
              isCurrentHotel: false,
              gamme: gammeInfo ? { name_fr: gammeInfo.name_fr, color_hex: gammeInfo.color_hex, text_color_hex: gammeInfo.text_color_hex } : null,
              dealDescription: null,
              dbBusiness: biz,
            } satisfies FallbackHotel);
          }

          altHotels.sort((a, b) => {
            const aV = a.wtuce_status === "verified" ? 1 : 0;
            const bV = b.wtuce_status === "verified" ? 1 : 0;
            if (aV !== bV) return bV - aV;
            return (b.dbBusiness?.computed_rating || 0) - (a.dbBusiness?.computed_rating || 0);
          });
        }

        openFallback({
          hotels: altHotels,
          city: cityName,
          checkIn, checkOut, adults,
          source: "serpapi",
          gammes: gammes.map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
        });
        setHotelSearchLoading(false);
        return;
      }

      // Mapped hotel: SerpAPI intersection
      const [mappingResult, gammeResult] = await Promise.all([
        supabase.from("hotel_mappings").select("id, serp_hotel_name, business_id, city").ilike("city", cityName),
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      ]);

      const allMappings = (mappingResult.data || []) as any[];
      const mappedCount = allMappings.length;
      const optimalMaxPages = Math.max(1, Math.ceil(mappedCount / 20));

      const serpResult = await supabase.functions.invoke("serpapi-hotels", {
        body: { cityName, checkIn, checkOut, adults, currency: "EUR", maxPages: optimalMaxPages },
      });

      const serpHotels = (serpResult.data?.data || []) as any[];
      const gammes = gammeResult.data || [];
      const gammeMap = new Map(gammes.map((g: any) => [g.id, g]));

      const serpByExactName = new Map<string, any>();
      for (const hotel of serpHotels) {
        const hotelName = typeof hotel.name === "string" ? hotel.name.trim().toLowerCase() : "";
        if (hotelName && !serpByExactName.has(hotelName)) {
          serpByExactName.set(hotelName, hotel);
        }
      }

      const availableMatches = new Map<string, { mapping: any; serpMatch: any }>();
      for (const mapping of allMappings) {
        const mappingName = typeof mapping.serp_hotel_name === "string" ? mapping.serp_hotel_name.trim().toLowerCase() : "";
        if (!mapping.business_id || !mappingName || availableMatches.has(mapping.business_id)) continue;
        const serpMatch = serpByExactName.get(mappingName);
        if (serpMatch) {
          availableMatches.set(mapping.business_id, { mapping, serpMatch });
        }
      }

      const availableBizIds = [...availableMatches.keys()];
      let bizMap = new Map<string, any>();
      if (availableBizIds.length > 0) {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, skype, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, badge_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, online_shop_url, latitude, longitude, google_maps_url, rating, website, min_price, main_category")
          .in("id", availableBizIds)
          .eq("is_active", true)
          .eq("main_category", "Hôtellerie");
        bizMap = new Map((bizData || []).map((b: any) => [b.id, b]));
      }

      const hotels: FallbackHotel[] = [];
      for (const { mapping, serpMatch } of availableMatches.values()) {
        const biz = bizMap.get(mapping.business_id);
        if (!biz) continue;
        const isCurrentHotel = biz.id === businessId;
        const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;
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
          reserveNowUrl: isCurrentHotel ? (business.reserve_now_url || biz.reserve_now_url) : biz.reserve_now_url,
          manualPriceRange: biz.manual_price_range,
          isCurrentHotel,
          gamme: gammeInfo ? { name_fr: gammeInfo.name_fr, color_hex: gammeInfo.color_hex, text_color_hex: gammeInfo.text_color_hex } : null,
          dealDescription: serpMatch.dealDescription || null,
          dbBusiness: biz,
        } satisfies FallbackHotel);
      }

      hotels.sort((a, b) => {
        if (a.isCurrentHotel !== b.isCurrentHotel) return a.isCurrentHotel ? -1 : 1;
        const aVerified = a.wtuce_status === "verified" ? 1 : 0;
        const bVerified = b.wtuce_status === "verified" ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        return (b.dbBusiness?.computed_rating || 0) - (a.dbBusiness?.computed_rating || 0);
      });

      if (hotels.length > 0) {
        openFallback({
          hotels, city: cityName, checkIn, checkOut, adults, source: "serpapi",
          gammes: gammes.map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
        });
      } else {
        // Aucune intersection SerpAPI : proposer quand même les alternatives de la ville
        hideCards();
        const altBizIds = [...new Set(allMappings.map((m: any) => m.business_id).filter(Boolean))].filter((id) => id !== businessId);
        let altHotels: FallbackHotel[] = [];
        if (altBizIds.length > 0) {
          const { data: altData } = await supabase
            .from("businesses")
            .select("id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, skype, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, badge_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, online_shop_url, latitude, longitude, google_maps_url, rating, website, min_price, main_category")
            .in("id", altBizIds)
            .eq("is_active", true)
            .eq("main_category", "Hôtellerie");

          for (const biz of (altData || [])) {
            const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;
            altHotels.push({
              hotelId: biz.id,
              businessId: biz.id,
              name: biz.name,
              wtuce_status: biz.wtuce_status || undefined,
              offers: [],
              dbImage: biz.images?.[0] || undefined,
              dbGoogleRating: biz.google_rating,
              dbGoogleReviewCount: biz.google_review_count,
              dbTripadvisorRating: biz.tripadvisor_rating,
              dbTripadvisorReviewCount: biz.tripadvisor_review_count,
              serpPrice: null,
              reserveNowUrl: biz.reserve_now_url,
              manualPriceRange: biz.manual_price_range,
              isCurrentHotel: false,
              gamme: gammeInfo ? { name_fr: (gammeInfo as any).name_fr, color_hex: (gammeInfo as any).color_hex, text_color_hex: (gammeInfo as any).text_color_hex } : null,
              dealDescription: null,
              dbBusiness: biz,
            } satisfies FallbackHotel);
          }

          altHotels.sort((a, b) => {
            const aV = a.wtuce_status === "verified" ? 1 : 0;
            const bV = b.wtuce_status === "verified" ? 1 : 0;
            if (aV !== bV) return bV - aV;
            return (b.dbBusiness?.computed_rating || 0) - (a.dbBusiness?.computed_rating || 0);
          });
        }

        openFallback({
          hotels: altHotels, city: cityName, checkIn, checkOut, adults, source: "serpapi",
          gammes: gammes.map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
        });
      }
    } catch (err: any) {
      console.error("Hotel availability error:", err);
      const { toast } = await import("sonner");
      toast.error(err.message || "Erreur");
    } finally {
      setHotelSearchLoading(false);
    }
  }, [business, businessId, serpApiMapping, language, hasSerpMapping, setHotelSearchLoading, openFallback, hideCards]);

  return handleCheckAvailability;
}
