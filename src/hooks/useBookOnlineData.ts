import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBrokenLinks } from "@/hooks/useBrokenLinks";
import type { ReviewText } from "@/components/cards/ReviewsFlipCard";
import type { ExternalLinkItem } from "@/components/cards/ExternalLinksFlipCard";
import type { MenuSummary } from "@/components/cards/MenuSummaryCard";
import type { MenuDoc } from "@/components/cards/MenuUrlCard";

export interface BookOnlineBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_bg: string | null;
  images: string[] | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
  google_maps_url: string | null;
  phone: string | null;
  skype: string | null;
  email: string | null;
  languages: string[] | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  google_rating: number | null;
  google_review_count: number | null;
  google_reviews_url: string | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  restaurant_guru_url: string | null;
  trustpilot_rating: number | null;
  trustpilot_review_count: number | null;
  trustpilot_url: string | null;
  getyourguide_rating: number | null;
  getyourguide_review_count: number | null;
  getyourguide_url: string | null;
  viator_rating: number | null;
  viator_review_count: number | null;
  viator_url: string | null;
  avis_verifies_rating: number | null;
  avis_verifies_review_count: number | null;
  avis_verifies_url: string | null;
  tourradar_rating: number | null;
  tourradar_review_count: number | null;
  tourradar_url: string | null;
  online_shop_force_external: boolean;
  website_force_external: boolean;
  reserve_now_url: string | null;
  reserve_now_force_external: boolean;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  menu_url: string | null;
  menu_name: string | null;
  menu_language: string | null;
  video_1_url: string | null;
  kp_regroupement: string | null;
  main_category: string | null;
  presentation_mode: string | null;
  // Fields previously accessed via `as any`
  show_videos: boolean;
  youtube_force_external: boolean;
  computed_rating: number | null;
  total_review_count: number | null;
  kp_regroupement_2: string | null;
  kp_active: boolean;
  is_master: boolean;
  prioritize_images: boolean;
  default_sound_on: boolean;
}

export interface KpRelatedBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  images: string[] | null;
  is_master: boolean;
  computed_rating: number | null;
}

export interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  image_url: string | null;
  images: string[] | null;
}

export interface PoiBusiness {
  id: string;
  name: string;
  images: string[] | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
}

export interface VideoDoc {
  url: string;
  name: string | null;
  city: string | null;
  price: string | null;
  price_type: string | null;
  description: string | null;
  thumbnail_url: string | null;
}

export function useBookOnlineData(businessId: string) {
  const { language } = useLanguage();
  const { brokenUrls: brokenLinksSet, loaded: brokenLinksLoaded } = useBrokenLinks();

  const [business, setBusiness] = useState<BookOnlineBusiness | null>(null);
  const [woDescription, setWoDescription] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [poiBusinesses, setPoiBusinesses] = useState<PoiBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewTexts, setReviewTexts] = useState<ReviewText[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);
  const [menuSummaries, setMenuSummaries] = useState<MenuSummary[]>([]);
  const [menuDocsRaw, setMenuDocsRaw] = useState<MenuDoc[]>([]);
  const [videoDocs, setVideoDocs] = useState<VideoDoc[]>([]);
  const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
  const [kpRelated, setKpRelated] = useState<KpRelatedBusiness[]>([]);
  const [isKp1Only, setIsKp1Only] = useState(false);
  const [liteApiHotelId, setLiteApiHotelId] = useState<string | null>(null);
  const [serpApiMapping, setSerpApiMapping] = useState<{ serpHotelName: string; city: string } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      const [bizRes, woRes, destLinksRes, reviewsRes, extLinksRes, menuSumRes, menuDocsRes, videoDocsRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, reserve_now_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, show_videos, default_sound_on, prioritize_images, google_rating, google_review_count, google_reviews_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, computed_rating, total_review_count, online_shop_force_external, website_force_external, reserve_now_force_external, youtube_force_external, hook_fr, hook_en, hook_ar, description, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, linkedin_url, pinterest_url, vimeo_url, menu_url, menu_name, menu_language, video_1_url, kp_regroupement, kp_regroupement_2, kp_active, is_master, main_category, presentation_mode")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("business_web_only")
          .select("description")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("business_destinations")
          .select("destination_id")
          .eq("business_id", businessId),
        supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text, language")
          .eq("business_id", businessId)
          .not("text", "is", null)
          .order("rating", { ascending: false })
          .limit(3),
        supabase
          .from("business_documents")
          .select("id, name, url, icon")
          .eq("business_id", businessId)
          .eq("type", "external_link")
          .order("sort_order"),
        supabase
          .from("business_menu_summaries")
          .select("id, title, content, price_details, avg_price_range")
          .eq("business_id", businessId)
          .order("sort_order"),
        supabase
          .from("business_documents")
          .select("id, name, url, language, icon")
          .eq("business_id", businessId)
          .in("type", ["menu", "flipbook"])
          .order("sort_order"),
        supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url")
          .eq("business_id", businessId)
          .eq("type", "video")
          .order("sort_order"),
      ]);

      if (isCancelled) return;

      const biz = bizRes.data as BookOnlineBusiness | null;
      setBusiness(biz);

      const rawWoDesc = (woRes.data as any)?.description?.replace(/<[^>]*>/g, "").trim();
      setWoDescription(rawWoDesc ? (woRes.data as any).description : biz?.description || null);
      setReviewTexts(reviewsRes.data ? (reviewsRes.data as any[]) : []);
      setExternalLinks((extLinksRes.data || []) as ExternalLinkItem[]);
      setMenuSummaries((menuSumRes.data || []) as MenuSummary[]);
      setMenuDocsRaw((menuDocsRes.data || []) as MenuDoc[]);

      const vDocs = (videoDocsRes.data || []) as VideoDoc[];
      setVideoDocs(vDocs.filter((d) => d.url));

      // Important: render panel as soon as core data is ready
      setIsLoading(false);

      const destIds = ((destLinksRes.data || []) as { destination_id: string }[]).map((d) => d.destination_id);

      const fetchCategoryIcon = async () => {
        const mainCat = biz?.main_category;
        if (!mainCat) {
          if (!isCancelled) setCategoryIcon(null);
          return;
        }
        const { data: catData } = await supabase
          .from("categories")
          .select("icon")
          .eq("name_fr", mainCat)
          .maybeSingle();
        if (!isCancelled) setCategoryIcon(catData?.icon || null);
      };

      const fetchDestinations = async () => {
        if (destIds.length === 0) {
          if (!isCancelled) setDestinations([]);
          return;
        }
        const { data: destData } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, image_url, images")
          .in("id", destIds);
        if (!isCancelled) setDestinations((destData || []) as Destination[]);
      };

      const fetchPoiBusinesses = async () => {
        const { data: poiLinks } = await supabase
          .from("business_poi_businesses")
          .select("poi_business_id")
          .eq("business_id", businessId);

        const poiIds = ((poiLinks || []) as { poi_business_id: string }[]).map((p) => p.poi_business_id);
        if (poiIds.length === 0) {
          if (!isCancelled) setPoiBusinesses([]);
          return;
        }

        const { data: poiData } = await supabase
          .from("businesses")
          .select("id, name, images, logo_url, latitude, longitude, city, neighborhood")
          .in("id", poiIds)
          .eq("is_active", true);

        if (!isCancelled) setPoiBusinesses((poiData || []) as PoiBusiness[]);
      };

      const fetchKpRelated = async () => {
        const kp1Val = biz?.kp_regroupement?.trim() || "";
        const kp2Val = biz?.kp_regroupement_2?.trim() || "";
        const isKpActive = biz?.kp_active;
        const isMaster = biz?.is_master === true;

        if (!isKpActive) {
          if (!isCancelled) {
            setKpRelated([]);
            setIsKp1Only(false);
          }
          return;
        }

        let kpResults: KpRelatedBusiness[] = [];

        if (kp1Val) {
          const { data: kp1Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement", kp1Val)
            .eq("is_active", true)
            .neq("id", businessId);
          kpResults = (kp1Data || []) as KpRelatedBusiness[];

          if (kp2Val) {
            const existingIds = new Set([businessId, ...kpResults.map((r) => r.id)]);
            const { data: kp2Masters } = await supabase
              .from("businesses")
              .select("id, name, slug, logo_url, images, is_master, computed_rating")
              .eq("kp_regroupement_2", kp2Val)
              .eq("is_master", true)
              .eq("is_active", true);

            for (const m of (kp2Masters || []) as KpRelatedBusiness[]) {
              if (!existingIds.has(m.id)) {
                kpResults.push(m);
                existingIds.add(m.id);
              }
            }
          }
        } else if (kp2Val && isMaster) {
          const { data: kp2Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement_2", kp2Val)
            .eq("is_active", true)
            .neq("id", businessId);
          kpResults = (kp2Data || []) as KpRelatedBusiness[];
        }

        kpResults.sort((a, b) => {
          if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
          return (b.computed_rating ?? 0) - (a.computed_rating ?? 0);
        });

        if (!isCancelled) {
          setKpRelated(kpResults);
          setIsKp1Only(!!(kp1Val && !kp2Val));
        }
      };

      const fetchLiteApiMapping = async () => {
        const { data: mapping } = await supabase
          .from("hotel_api_mappings")
          .select("liteapi_hotel_id")
          .eq("business_id", businessId)
          .maybeSingle();

        if (!isCancelled) setLiteApiHotelId(mapping?.liteapi_hotel_id || null);
      };

      const fetchSerpApiMapping = async () => {
        const { data: mapping } = await supabase
          .from("hotel_mappings")
          .select("serp_hotel_name, city")
          .eq("business_id", businessId)
          .maybeSingle();

        if (!isCancelled) setSerpApiMapping(mapping ? { serpHotelName: (mapping as any).serp_hotel_name, city: (mapping as any).city } : null);
      };

      await Promise.allSettled([
        fetchCategoryIcon(),
        fetchDestinations(),
        fetchPoiBusinesses(),
        fetchKpRelated(),
        fetchLiteApiMapping(),
        fetchSerpApiMapping(),
      ]);
    };

    void fetchData();

    return () => {
      isCancelled = true;
    };
  }, [businessId]);

  const menuDocs = useMemo(() => {
    if (!brokenLinksLoaded) return menuDocsRaw;
    return menuDocsRaw.filter((d) => !brokenLinksSet.has(d.url));
  }, [menuDocsRaw, brokenLinksLoaded, brokenLinksSet]);

  const destinationsSorted = useMemo(() => {
    return [...destinations].sort((a, b) => {
      const nameA = (language === "en" && a.name_en ? a.name_en : a.name_fr).toLowerCase();
      const nameB = (language === "en" && b.name_en ? b.name_en : b.name_fr).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [destinations, language]);

  // Derived: all video URLs (legacy + docs)
  const allVideoUrls = useMemo(() => {
    const legacyVideo = business?.video_1_url?.trim() || null;
    const docUrls = videoDocs.map((d) => d.url).filter(Boolean);
    const urls = [...docUrls];
    if (legacyVideo && !urls.includes(legacyVideo)) urls.unshift(legacyVideo);
    return urls;
  }, [business?.video_1_url, videoDocs]);

  return {
    business,
    woDescription,
    destinations: destinationsSorted,
    poiBusinesses,
    isLoading,
    reviewTexts,
    externalLinks,
    menuSummaries,
    menuDocs,
    videoDocs,
    allVideoUrls,
    categoryIcon,
    kpRelated,
    isKp1Only,
    liteApiHotelId,
    serpApiMapping,
  };
}
