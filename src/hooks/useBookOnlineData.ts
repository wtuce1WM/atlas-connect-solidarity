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
  snapchat_url: string | null;
  menu_url: string | null;
  menu_name: string | null;
  menu_language: string | null;
  video_1_url: string | null;
  kp_regroupement: string | null;
  main_category: string | null;
  presentation_mode: string | null;
  // Fields previously accessed via `as any`
  show_videos: boolean;
  computed_rating: number | null;
  total_review_count: number | null;
  kp_regroupement_2: string | null;
  kp_active: boolean;
  is_master: boolean;
  prioritize_images: boolean;
  default_sound_on: boolean;
  min_price: number | null;
  gamme_id: string | null;
  manual_price_range: string | null;
  default_service: string | null;
  matterport_url: string | null;
  carousel_badge: string | null;
  show_youtube_tab: boolean;
  categories: string[] | null;
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
  latitude: number | null;
  longitude: number | null;
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
  owner_business_id: string | null;
  owner_name: string | null;
  owner_logo: string | null;
  owner_instagram: string | null;
}

// In-memory cache to avoid re-fetching data for previously viewed businesses
interface CachedBusinessData {
  business: BookOnlineBusiness | null;
  woDescription: string | null;
  destinations: Destination[];
  poiBusinesses: PoiBusiness[];
  reviewTexts: ReviewText[];
  externalLinks: ExternalLinkItem[];
  menuSummaries: MenuSummary[];
  menuDocsRaw: MenuDoc[];
  videoDocs: VideoDoc[];
  categoryIcon: string | null;
  showGoogleMap: boolean;
  kpRelated: KpRelatedBusiness[];
  kpSubcategoryItems: KpRelatedBusiness[];
  kpSubcategoryLabel: string | null;
  isKp1Only: boolean;
  liteApiHotelId: string | null;
  serpApiMapping: { serpHotelName: string; city: string } | null;
}

const businessDataCache = new Map<string, CachedBusinessData>();
const MAX_CACHE_SIZE = 15;

function setCacheEntry(id: string, data: CachedBusinessData) {
  if (businessDataCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = businessDataCache.keys().next().value;
    if (firstKey) businessDataCache.delete(firstKey);
  }
  businessDataCache.set(id, data);
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
  const [showGoogleMap, setShowGoogleMap] = useState(true);
  const [kpRelated, setKpRelated] = useState<KpRelatedBusiness[]>([]);
  const [kpSubcategoryItems, setKpSubcategoryItems] = useState<KpRelatedBusiness[]>([]);
  const [kpSubcategoryLabel, setKpSubcategoryLabel] = useState<string | null>(null);
  const [isKp1Only, setIsKp1Only] = useState(false);
  const [liteApiHotelId, setLiteApiHotelId] = useState<string | null>(null);
  const [serpApiMapping, setSerpApiMapping] = useState<{ serpHotelName: string; city: string } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Check cache first — restore immediately without network round-trip
    const cached = businessDataCache.get(businessId);
    if (cached) {
      setBusiness(cached.business);
      setWoDescription(cached.woDescription);
      setDestinations(cached.destinations);
      setPoiBusinesses(cached.poiBusinesses);
      setReviewTexts(cached.reviewTexts);
      setExternalLinks(cached.externalLinks);
      setMenuSummaries(cached.menuSummaries);
      setMenuDocsRaw(cached.menuDocsRaw);
      setVideoDocs(cached.videoDocs);
      setCategoryIcon(cached.categoryIcon);
      setShowGoogleMap(cached.showGoogleMap);
      setKpRelated(cached.kpRelated);
      setKpSubcategoryItems(cached.kpSubcategoryItems);
      setKpSubcategoryLabel(cached.kpSubcategoryLabel);
      setIsKp1Only(cached.isKp1Only);
      setLiteApiHotelId(cached.liteApiHotelId);
      setSerpApiMapping(cached.serpApiMapping);
      setIsLoading(false);
      // Don't return — continue to re-fetch fresh data in background
    }

    const fetchData = async () => {
      setIsLoading(true);
      // Reset all secondary state to prevent stale data flash from previous business
      setDestinations([]);
      setPoiBusinesses([]);
      setKpRelated([]);
      setKpSubcategoryItems([]);
      setKpSubcategoryLabel(null);
      setIsKp1Only(false);
      setVideoDocs([]);
      setReviewTexts([]);
      setExternalLinks([]);
      setMenuSummaries([]);
      setMenuDocsRaw([]);
      setCategoryIcon(null);
      setShowGoogleMap(true);
      setLiteApiHotelId(null);
      setSerpApiMapping(null);

      const [bizRes, woRes, destLinksRes, reviewsRes, extLinksRes, menuSumRes, menuDocsRes, videoDocsRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, reserve_now_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, show_videos, default_sound_on, prioritize_images, google_rating, google_review_count, google_reviews_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, computed_rating, total_review_count, online_shop_force_external, website_force_external, reserve_now_force_external, hook_fr, hook_en, hook_ar, description, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, linkedin_url, pinterest_url, vimeo_url, snapchat_url, menu_url, menu_name, menu_language, video_1_url, kp_regroupement, kp_regroupement_2, kp_active, is_master, main_category, categories, presentation_mode, min_price, gamme_id, manual_price_range, default_service, matterport_url, carousel_badge, show_youtube_tab")
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
          .select("id, name, url, icon, description")
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
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id")
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

      const vDocs = ((videoDocsRes.data || []) as any[]).map(d => ({
        ...d,
        owner_business_id: d.business_id || businessId,
        owner_name: null as string | null,
        owner_logo: null as string | null,
        owner_instagram: null as string | null,
      })) as VideoDoc[];
      setVideoDocs(vDocs.filter((d) => d.url));

      // Important: render panel as soon as core data is ready
      setIsLoading(false);

      const destIds = ((destLinksRes.data || []) as { destination_id: string }[]).map((d) => d.destination_id);

      const fetchCategoryIcon = async () => {
        const mainCat = biz?.main_category;
        const bizCategories = (biz as any)?.categories as string[] | null;
        if (!mainCat) {
          if (!isCancelled) { setCategoryIcon(null); setShowGoogleMap(true); }
          return;
        }
        const catPromise = supabase.from("categories").select("icon").eq("name_fr", mainCat).maybeSingle();
        
        // Check show_google_map from subcategories matching the business's categories array
        const subNames = bizCategories?.length ? bizCategories : [mainCat];
        const subPromise = supabase.from("subcategories").select("show_google_map").in("name_fr", subNames);
        
        const [catRes, subRes] = await Promise.all([catPromise, subPromise]);
        if (!isCancelled) {
          setCategoryIcon(catRes.data?.icon || null);
          // If ANY matching subcategory has show_google_map = false, hide the map
          const subRows = (subRes.data || []) as { show_google_map: boolean }[];
          const shouldHide = subRows.some(r => r.show_google_map === false);
          setShowGoogleMap(!shouldHide);
        }
      };

      const fetchDestinations = async () => {
        if (destIds.length === 0) {
          if (!isCancelled) setDestinations([]);
          return;
        }
        const { data: destData } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, image_url, images, latitude, longitude")
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
          // Fallback: fetch all POIs from the same city
          const bizCity = biz?.city;
          if (bizCity) {
            const { data: cityPois } = await supabase
              .from("businesses")
              .select("id, name, images, logo_url, latitude, longitude, city, neighborhood")
              .eq("is_active", true)
              .eq("is_poi", true)
              .eq("city", bizCity)
              .neq("id", businessId)
              .order("priority_score", { ascending: false })
              .limit(50);
            if (!isCancelled) setPoiBusinesses((cityPois || []) as PoiBusiness[]);
          } else {
            if (!isCancelled) setPoiBusinesses([]);
          }
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
        const isMaster = biz?.is_master === true;

        if (!kp1Val && !kp2Val) {
          if (!isCancelled) {
            setKpRelated([]);
            setKpSubcategoryItems([]);
            setKpSubcategoryLabel(null);
            setIsKp1Only(false);
          }
          return;
        }

        let kpResults: KpRelatedBusiness[] = [];
        let subcatItems: KpRelatedBusiness[] = [];
        let subcatLabel: string | null = null;

        if (kp1Val) {
          const { data: kp1Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement", kp1Val)
            .eq("is_active", true)
            .neq("id", businessId);
          kpResults = (kp1Data || []) as KpRelatedBusiness[];

          if (kp2Val) {
            // Fetch ALL KP2 members (not just masters) to detect multi-master scenario
            const { data: kp2All } = await supabase
              .from("businesses")
              .select("id, name, slug, logo_url, images, is_master, computed_rating")
              .eq("kp_regroupement_2", kp2Val)
              .eq("is_active", true)
              .neq("id", businessId);

            const kp2Members = (kp2All || []) as KpRelatedBusiness[];
            const kp2MasterCount = kp2Members.filter(m => m.is_master).length;
            // Count current business as a master too if applicable
            const totalKp2Masters = kp2MasterCount + (isMaster ? 1 : 0);

            if (totalKp2Masters > 1) {
              // Multi-master KP2: separate into subcategory tab
              const existingIds = new Set(kpResults.map(r => r.id));
              subcatItems = kp2Members.filter(m => !existingIds.has(m.id));
              subcatLabel = biz?.categories?.[0] || null;
            } else {
              // Single master KP2: merge masters into kpResults as before
              const existingIds = new Set([businessId, ...kpResults.map((r) => r.id)]);
              for (const m of kp2Members) {
                if (m.is_master && !existingIds.has(m.id)) {
                  kpResults.push(m);
                  existingIds.add(m.id);
                }
              }
            }
          }
        } else if (kp2Val) {
          // No KP1 — fetch all KP2 members
          const { data: kp2Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement_2", kp2Val)
            .eq("is_active", true)
            .neq("id", businessId);
          const kp2Members = (kp2Data || []) as KpRelatedBusiness[];
          const kp2MasterCount = kp2Members.filter(m => m.is_master).length;
          const totalKp2Masters = kp2MasterCount + (isMaster ? 1 : 0);

          if (totalKp2Masters > 1) {
            // Multi-master KP2 without KP1: all go to subcategory tab
            subcatItems = kp2Members;
            subcatLabel = biz?.categories?.[0] || null;
          } else {
            // Single/no master: keep as regular kp tab
            kpResults = kp2Members;
          }
        }

        const sortFn = (a: KpRelatedBusiness, b: KpRelatedBusiness) => {
          if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
          return (b.computed_rating ?? 0) - (a.computed_rating ?? 0);
        };
        kpResults.sort(sortFn);
        subcatItems.sort(sortFn);

        if (!isCancelled) {
          setKpRelated(kpResults);
          setKpSubcategoryItems(subcatItems);
          setKpSubcategoryLabel(subcatLabel);
          setIsKp1Only(!!(kp1Val && !kp2Val));
        }
      };

      const fetchLinkedVideos = async () => {
        const { data: linkedVids } = await supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id")
          .eq("linked_business_id", businessId)
          .eq("type", "video")
          .order("sort_order");
        if (!isCancelled && linkedVids && linkedVids.length > 0) {
          // Fetch owner info for each unique business_id
          const ownerIds = [...new Set((linkedVids as any[]).map(v => v.business_id).filter(Boolean))];
          const ownerMap = new Map<string, { name: string; logo_url: string | null; instagram_url: string | null }>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase
              .from("businesses")
              .select("id, name, logo_url, instagram_url")
              .in("id", ownerIds);
            if (owners) {
              for (const o of owners) ownerMap.set(o.id, { name: o.name, logo_url: o.logo_url, instagram_url: (o as any).instagram_url });
            }
          }
          const linked = (linkedVids as any[])
            .filter((d) => d.url)
            .map(d => {
              const owner = ownerMap.get(d.business_id);
              return {
                url: d.url, name: d.name, city: d.city, price: d.price,
                price_type: d.price_type, description: d.description,
                thumbnail_url: d.thumbnail_url,
                owner_business_id: d.business_id,
                owner_name: owner?.name || null,
                owner_logo: owner?.logo_url || null,
                owner_instagram: owner?.instagram_url || null,
              } as VideoDoc;
            });
          setVideoDocs((prev) => {
            const existingUrls = new Set(prev.map((v) => v.url));
            const newVids = linked.filter((v) => !existingUrls.has(v.url));
            return newVids.length > 0 ? [...newVids, ...prev] : prev;
          });
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
        fetchLinkedVideos(),
        fetchLiteApiMapping(),
        fetchSerpApiMapping(),
      ]);
    };

    void fetchData();

    return () => {
      isCancelled = true;
    };
  }, [businessId]);

  // Persist to cache once all data is loaded (including secondary fetches)
  useEffect(() => {
    if (isLoading || !business) return;
    // Debounce slightly to ensure secondary fetches have settled
    const timer = setTimeout(() => {
      setCacheEntry(businessId, {
        business, woDescription, destinations, poiBusinesses,
        reviewTexts, externalLinks, menuSummaries, menuDocsRaw,
        videoDocs, categoryIcon, showGoogleMap, kpRelated,
        kpSubcategoryItems, kpSubcategoryLabel, isKp1Only,
        liteApiHotelId, serpApiMapping,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading, business, businessId, woDescription, destinations, poiBusinesses, reviewTexts, externalLinks, menuSummaries, menuDocsRaw, videoDocs, categoryIcon, showGoogleMap, kpRelated, kpSubcategoryItems, kpSubcategoryLabel, isKp1Only, liteApiHotelId, serpApiMapping]);

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

  // Derived: all video URLs (linked first, then legacy, then own docs)
  const allVideoUrls = useMemo(() => {
    const legacyVideo = business?.video_1_url?.trim() || null;
    // videoDocs already has linked videos prepended (see fetch above)
    // Separate linked (external owner) from own videos to preserve linked-first order
    const linkedUrls = videoDocs.filter(d => d.owner_business_id && d.owner_business_id !== businessId).map(d => d.url).filter(Boolean);
    const ownDocUrls = videoDocs.filter(d => !d.owner_business_id || d.owner_business_id === businessId).map(d => d.url).filter(Boolean);
    const urls = [...linkedUrls];
    if (legacyVideo && !urls.includes(legacyVideo) && !ownDocUrls.includes(legacyVideo)) urls.push(legacyVideo);
    urls.push(...ownDocUrls.filter(u => !urls.includes(u)));
    return urls;
  }, [business?.video_1_url, videoDocs, businessId]);

  // Dynamic: any Hôtellerie business with price data gets the availability widget
  const isHotelWithPrice = useMemo(() => {
    if (!business) return false;
    const isHotellerie = business.main_category === "Hôtellerie";
    const hasPrice = !!(business.manual_price_range || business.min_price);
    return isHotellerie && hasPrice;
  }, [business]);

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
    showGoogleMap,
    kpRelated,
    kpSubcategoryItems,
    kpSubcategoryLabel,
    isKp1Only,
    liteApiHotelId,
    serpApiMapping,
    isHotelWithPrice,
  };
}
