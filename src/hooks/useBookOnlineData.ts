import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { haversineKm } from "@/lib/haversine";
import { useBrokenLinks } from "@/hooks/useBrokenLinks";
import type { ReviewText } from "@/lib/reviewHtmlBuilder";
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
  website_cta: string | null;
  website_presentation_mode: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
  online_shop_cta: string | null;
  online_shop_presentation_mode: string | null;
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
  google_review_url: string | null;
  google_place_id: string | null;
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
  booking_url: string | null;
  airbnb_url: string | null;
  hotels_com_url: string | null;
  trivago_url: string | null;
  other_booking_url: string | null;
  other_booking_name: string | null;
  glovo_url: string | null;
  reserve_now_cta: string | null;
  reserve_now_force_external: boolean;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  description: string | null;
  hide_description: boolean;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  snapchat_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  menu_url: string | null;
  menu_name: string | null;
  menu_language: string | null;
  video_1_url: string | null;
  kp_regroupement: string | null;
  main_category: string | null;
  presentation_mode: string | null;
  url_4: string | null;
  url_4_cta: string | null;
  url_4_force_external: boolean;
  url_4_presentation_mode: string | null;
  url_5: string | null;
  url_5_cta: string | null;
  url_5_force_external: boolean;
  url_5_presentation_mode: string | null;
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
  categories: string[] | null;
  default_service?: string | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
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
  is_poi_linked?: boolean;
  /** Account name from a generic video (not navigable) */
  generic_video_account?: string | null;
  /** Social account attached to the video document */
  instagram_account?: string | null;
  instagram_url?: string | null;
  tiktok_account?: string | null;
  tiktok_url?: string | null;
  youtube_account?: string | null;
  youtube_url?: string | null;
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

const meaningfulHtml = (html?: string | null) => {
  if (!html) return null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&amp;nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  return text ? html : null;
};

function setCacheEntry(id: string, data: CachedBusinessData) {
  if (businessDataCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = businessDataCache.keys().next().value;
    if (firstKey) businessDataCache.delete(firstKey);
  }
  businessDataCache.set(id, data);
}

/**
 * @param allowInactive Autorise le chargement d'un établissement désactivé
 *   (cas des widgets embarqués où la fiche ne sert que de point de référence
 *   sur la carte, ex. "Délégation Régionale Du Tourisme Marrakech").
 */
export function useBookOnlineData(businessId: string, allowInactive = false) {
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
    const cached = businessDataCache.get(`${businessId}:${language}:${allowInactive ? 1 : 0}`);
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
      // Only show loading skeleton & reset state when there's no cache (avoids flicker)
      if (!cached) {
        setIsLoading(true);
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
      }

      const [bizRes, woRes, destLinksRes, reviewsRes, extLinksRes, menuSumRes, menuDocsRes, videoDocsRes] = await Promise.all([
        supabase
         .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, poi_radius_km, website, website_cta, website_presentation_mode, whatsapp, online_shop_url, online_shop_cta, online_shop_presentation_mode, reserve_now_url, reserve_now_cta, booking_url, airbnb_url, hotels_com_url, trivago_url, other_booking_url, other_booking_name, glovo_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, show_videos, default_sound_on, prioritize_images, google_rating, google_review_count, google_reviews_url, google_review_url, google_place_id, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, computed_rating, total_review_count, online_shop_force_external, website_force_external, reserve_now_force_external, hook_fr, hook_en, hook_ar, description, description_fr, description_en, description_ar, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, linkedin_url, pinterest_url, vimeo_url, snapchat_url, menu_url, menu_name, menu_language, video_1_url, kp_regroupement, kp_regroupement_2, kp_active, is_master, main_category, categories, presentation_mode, url_4, url_4_cta, url_4_force_external, url_4_presentation_mode, url_5, url_5_cta, url_5_force_external, url_5_presentation_mode, min_price, gamme_id, manual_price_range, default_service, matterport_url, carousel_badge, show_youtube_tab, hide_description, spotify_url, soundcloud_url, substack_url, popup_image_url")
          .eq("id", businessId)
          .in("is_active", allowInactive ? [true, false] : [true])
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
          .select("source, author_name, rating, text, language, text_fr, text_en, text_ar, is_default, is_hidden")
          .eq("business_id", businessId)
          .eq("is_hidden", false)
          .or("text.not.is.null,text_fr.not.is.null,text_en.not.is.null,text_ar.not.is.null")
          .order("is_default", { ascending: false })
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(5),
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
          .select("id, name, url, language, icon, type")
          .eq("business_id", businessId)
          .in("type", ["menu", "flipbook"])
          .order("sort_order"),
        supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
          .eq("business_id", businessId)
          .eq("type", "video")
          .order("sort_order"),
      ]);

      if (isCancelled) return;

      const biz = bizRes.data as BookOnlineBusiness | null;
      setBusiness(biz);

      if (biz?.hide_description) {
        setWoDescription(null);
      } else {
        const bAny: any = biz || {};
        const woRaw = (woRes.data as any)?.description ?? null;
        // Store all language variants so the display can react to language changes
        // without a network refetch. Priority: web_only override > localized biz > FR fallback.
        const pickLocalized = (lang: string) => {
          if (woRaw) return woRaw; // web_only override (currently single-language)
          if (lang === "ar") return bAny.description_ar || bAny.description_fr || bAny.description;
          if (lang === "en") return bAny.description_en || bAny.description_fr || bAny.description;
          return bAny.description_fr || bAny.description;
        };
        setWoDescription(meaningfulHtml(pickLocalized(language)));
      }

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
      // Dedupe by URL: same video can be linked to multiple POIs (one row per POI in DB)
      const seenUrls = new Set<string>();
      const filteredVDocs = vDocs.filter((d) => {
        if (!d.url || seenUrls.has(d.url)) return false;
        seenUrls.add(d.url);
        return true;
      });

      // Pre-fetch linked / POI / generic videos in parallel so the initial render
      // already has all videos sorted (own → linked → external) before showing media.
      const [linkedVidsRes, poiVidsRes, gvLinksRes] = await Promise.all([
        supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
          .eq("linked_business_id", businessId)
          .eq("type", "video")
          .eq("business_is_active", true)
          .order("front_sort_order"),
        supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
          .eq("poi_id", businessId)
          .eq("type", "video")
          .eq("business_is_active", true)
          .order("front_sort_order"),
        supabase
          .from("generic_video_pois" as any)
          .select("generic_video_id, sort_order")
          .eq("poi_id", businessId)
          .order("sort_order", { ascending: true }) as any,
      ]);

      if (isCancelled) return;

      const ownerIds = new Set<string>();
      ((linkedVidsRes.data || []) as any[]).forEach((v) => v.business_id && ownerIds.add(v.business_id));
      ((poiVidsRes.data || []) as any[]).forEach((v) => v.business_id && ownerIds.add(v.business_id));
      const ownerMap = new Map<string, { name: string; logo_url: string | null; instagram_url: string | null }>();
      const gvIds = ((gvLinksRes.data || []) as any[]).map((l: any) => l.generic_video_id);
      const [ownersRes, gvDataRes] = await Promise.all([
        ownerIds.size > 0
          ? supabase.from("businesses").select("id, name, logo_url, instagram_url, is_active").in("id", [...ownerIds])
          : Promise.resolve({ data: [] as any[] }),
        gvIds.length > 0
          ? supabase.from("generic_videos").select("id, url, name, thumbnail_url, instagram_account, tiktok_account, youtube_account").in("id", gvIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (isCancelled) return;
      ((ownersRes.data || []) as any[]).forEach((o: any) => {
        if (o.is_active === false) return;
        ownerMap.set(o.id, { name: o.name, logo_url: o.logo_url, instagram_url: o.instagram_url });
      });

      const buildLinked = (rows: any[], isPoi: boolean): VideoDoc[] =>
        (rows || [])
          .filter((d) => d.url && ownerMap.has(d.business_id))
          .map((d) => {
            const o = ownerMap.get(d.business_id);
            return {
              url: d.url, name: d.name, city: d.city, price: d.price,
              price_type: d.price_type, description: d.description,
              thumbnail_url: d.thumbnail_url,
              owner_business_id: d.business_id,
              owner_name: o?.name || null,
              owner_logo: o?.logo_url || null,
              owner_instagram: o?.instagram_url || null,
              instagram_account: d.instagram_account || null,
              instagram_url: d.instagram_url || null,
              tiktok_account: d.tiktok_account || null,
              tiktok_url: d.tiktok_url || null,
              youtube_account: d.youtube_account || null,
              youtube_url: d.youtube_url || null,
              ...(isPoi ? { is_poi_linked: true } : {}),
            } as VideoDoc;
          });

      const linkedVDocs = buildLinked((linkedVidsRes.data || []) as any[], false);
      const poiVDocs = buildLinked((poiVidsRes.data || []) as any[], true);

      const orderMap = new Map(((gvLinksRes.data || []) as any[]).map((l: any) => [l.generic_video_id, l.sort_order ?? 0]));
      const genericVDocs: VideoDoc[] = ((gvDataRes.data || []) as any[])
        .sort((a: any, b: any) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
        .map((gv: any) => ({
          url: gv.url, name: gv.name, city: null, price: null, price_type: null,
          description: null, thumbnail_url: gv.thumbnail_url,
          owner_business_id: null, owner_name: null, owner_logo: null, owner_instagram: null,
          generic_video_account: gv.instagram_account || gv.youtube_account || gv.tiktok_account || gv.name || null,
        }));

      // Merge all, dedupe by URL (preserve first occurrence)
      const merged: VideoDoc[] = [];
      const mergedSeen = new Set<string>();
      for (const d of [...filteredVDocs, ...linkedVDocs, ...poiVDocs, ...genericVDocs]) {
        if (!d.url || mergedSeen.has(d.url)) continue;
        mergedSeen.add(d.url);
        merged.push(d);
      }
      setVideoDocs(merged);

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
        const lat = biz?.latitude != null ? Number(biz.latitude) : null;
        const lng = biz?.longitude != null ? Number(biz.longitude) : null;

        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
          if (!isCancelled) setPoiBusinesses([]);
          return;
        }

        // Rayon "par défaut" de l'établissement (businesses.poi_radius_km) = rayon initial affiché,
        // mais on charge un pool plus large (>= 100 km) pour que les pills de rayon puissent filtrer côté client.
        const rawRadius = Number((biz as any)?.poi_radius_km);
        const DEFAULT_RADIUS_KM = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 10;
        const POOL_RADIUS_KM = Math.max(DEFAULT_RADIUS_KM, 100);
        const latDelta = POOL_RADIUS_KM / 111;
        const lngDelta = POOL_RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180) || 1);

        const { data: poiData } = await supabase
          .from("businesses")
          .select("id, name, images, logo_url, latitude, longitude, city, neighborhood, categories, default_service, computed_rating, total_review_count")
          .eq("is_active", true)
          .eq("is_poi", true)
          .neq("id", businessId)
          .gte("latitude", lat - latDelta)
          .lte("latitude", lat + latDelta)
          .gte("longitude", lng - lngDelta)
          .lte("longitude", lng + lngDelta)
          .limit(2000);

        const nearby = ((poiData || []) as PoiBusiness[]).filter((p) => {
          if (p.latitude == null || p.longitude == null) return false;
          return haversineKm(lat, lng, Number(p.latitude), Number(p.longitude)) <= POOL_RADIUS_KM;
        });


        if (!isCancelled) setPoiBusinesses(nearby);
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
          // Parallel fetch KP1 and KP2 (if both exist)
          const kp1Promise = supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement", kp1Val)
            .eq("is_active", true)
            .neq("id", businessId);

          const kp2Promise = kp2Val
            ? supabase
                .from("businesses")
                .select("id, name, slug, logo_url, images, is_master, computed_rating")
                .eq("kp_regroupement_2", kp2Val)
                .eq("is_active", true)
                .neq("id", businessId)
            : Promise.resolve({ data: null });

          const [kp1Res, kp2Res] = await Promise.all([kp1Promise, kp2Promise]);
          kpResults = (kp1Res.data || []) as KpRelatedBusiness[];

          if (kp2Val) {
            const kp2Members = (kp2Res.data || []) as KpRelatedBusiness[];
            const kp2MasterCount = kp2Members.filter(m => m.is_master).length;
            const totalKp2Masters = kp2MasterCount + (isMaster ? 1 : 0);

            if (totalKp2Masters > 1) {
              const existingIds = new Set(kpResults.map(r => r.id));
              subcatItems = kp2Members.filter(m => !existingIds.has(m.id));
              subcatLabel = biz?.categories?.[0] || null;
            } else {
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
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
          .eq("linked_business_id", businessId)
          .eq("type", "video")
          .eq("business_is_active", true)
          .order("front_sort_order")
          .order("sort_order");
        if (!isCancelled && linkedVids && linkedVids.length > 0) {
          const ownerIds = [...new Set((linkedVids as any[]).map(v => v.business_id).filter(Boolean))];
          // Fetch owner info in parallel (single query)
          const ownerMap = new Map<string, { name: string; logo_url: string | null; instagram_url: string | null }>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase
              .from("businesses")
              .select("id, name, logo_url, instagram_url, is_active")
              .in("id", ownerIds);
            if (owners) {
              for (const o of owners) {
                if ((o as any).is_active === false) continue;
                ownerMap.set(o.id, { name: o.name, logo_url: o.logo_url, instagram_url: (o as any).instagram_url });
              }
            }
          }
          const linked = (linkedVids as any[])
            .filter((d) => d.url && ownerMap.has(d.business_id))
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
                instagram_account: d.instagram_account || null,
                instagram_url: d.instagram_url || null,
                tiktok_account: d.tiktok_account || null,
                tiktok_url: d.tiktok_url || null,
                youtube_account: d.youtube_account || null,
                youtube_url: d.youtube_url || null,
              } as VideoDoc;
            });
          setVideoDocs((prev) => {
            const existingUrls = new Set(prev.map((v) => v.url));
            const newVids = linked.filter((v) => !existingUrls.has(v.url));
            if (newVids.length === 0) return prev;
            return [...prev, ...newVids];
          });
        }
      };

      const fetchPoiLinkedVideos = async () => {
        const { data: poiVids } = await supabase
          .from("business_documents")
          .select("url, name, city, price, price_type, description, thumbnail_url, business_id, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url")
          .eq("poi_id", businessId)
          .eq("type", "video")
          .eq("business_is_active", true)
          .order("front_sort_order")
          .order("sort_order");
        if (!isCancelled && poiVids && poiVids.length > 0) {
          const ownerIds = [...new Set((poiVids as any[]).map(v => v.business_id).filter(Boolean))];
          const ownerMap = new Map<string, { name: string; logo_url: string | null; instagram_url: string | null }>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase
              .from("businesses")
              .select("id, name, logo_url, instagram_url, is_active")
              .in("id", ownerIds);
            if (owners) {
              for (const o of owners) {
                if ((o as any).is_active === false) continue;
                ownerMap.set(o.id, { name: o.name, logo_url: o.logo_url, instagram_url: (o as any).instagram_url });
              }
            }
          }
          const seenUrls = new Set<string>();
          const linked = (poiVids as any[])
            .filter((d) => {
              if (!d.url || seenUrls.has(d.url) || !ownerMap.has(d.business_id)) return false;
              seenUrls.add(d.url);
              return true;
            })
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
                instagram_account: d.instagram_account || null,
                instagram_url: d.instagram_url || null,
                tiktok_account: d.tiktok_account || null,
                tiktok_url: d.tiktok_url || null,
                youtube_account: d.youtube_account || null,
                youtube_url: d.youtube_url || null,
                is_poi_linked: true,
              } as VideoDoc;
            });
          setVideoDocs((prev) => {
            const existingUrls = new Set(prev.map((v) => v.url));
            const newVids = linked.filter((v) => !existingUrls.has(v.url));
            if (newVids.length === 0) return prev;
            return [...prev, ...newVids];
          });
        }
      };

      const fetchGenericVideosForPoi = async () => {
        const { data: gvLinks } = await supabase
          .from("generic_video_pois" as any)
          .select("generic_video_id, sort_order")
          .eq("poi_id", businessId)
          .order("sort_order", { ascending: true }) as any;
        if (isCancelled || !gvLinks?.length) return;
        const gvIds = (gvLinks as any[]).map((l: any) => l.generic_video_id);
        const { data: gvData } = await supabase
          .from("generic_videos")
          .select("id, url, name, thumbnail_url, instagram_account, tiktok_account, youtube_account")
          .in("id", gvIds);
        if (isCancelled || !gvData?.length) return;
        const orderMap = new Map((gvLinks as any[]).map((l: any) => [l.generic_video_id, l.sort_order ?? 0]));
        const sorted = (gvData as any[]).sort((a: any, b: any) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        const genericVids: VideoDoc[] = sorted.map((gv: any) => {
          const accountName = gv.instagram_account || gv.youtube_account || gv.tiktok_account || gv.name || null;
          return {
            url: gv.url,
            name: gv.name,
            city: null,
            price: null,
            price_type: null,
            description: null,
            thumbnail_url: gv.thumbnail_url,
            owner_business_id: null,
            owner_name: null,
            owner_logo: null,
            owner_instagram: null,
            generic_video_account: accountName,
          };
        });
        setVideoDocs((prev) => {
          const existingUrls = new Set(prev.map((v) => v.url));
          const newVids = genericVids.filter((v) => !existingUrls.has(v.url));
          if (newVids.length === 0) return prev;
          return [...prev, ...newVids];
        });
      };

      const fetchLiteApiMapping = async () => {
        const { data: mappings } = await (supabase as any)
          .rpc("get_hotel_mapping_for_business", { _business_id: businessId });
        const mapping = (mappings as any[] | null)?.[0] ?? null;

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
        // fetchLinkedVideos / fetchPoiLinkedVideos / fetchGenericVideosForPoi
        // are now performed in the initial fetch above so the first render is correctly ordered.
        fetchLiteApiMapping(),
        fetchSerpApiMapping(),
      ]);
    };

    void fetchData();

    return () => {
      isCancelled = true;
    };
  }, [businessId, language, allowInactive]);

  // Persist to cache once all data is loaded (including secondary fetches)
  useEffect(() => {
    if (isLoading || !business) return;
    // Debounce slightly to ensure secondary fetches have settled
    const timer = setTimeout(() => {
      setCacheEntry(`${businessId}:${language}:${allowInactive ? 1 : 0}`, {
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

  // Derived: all video URLs — order:
  //   1. own fiche internal videos (uploaded files)
  //   2. linked videos
  //   3. POI-linked videos
  //   4. generic videos
  //   5. own fiche YouTube / external videos
  // Stable within each bucket via DB front_sort_order / sort_order.
  const allVideoUrls = useMemo(() => {
    const legacyVideo = business?.video_1_url?.trim() || null;
    const isExternal = (url?: string | null) => !!url && /youtube\.com|youtu\.be|youtube-nocookie\.com|vimeo\.com|player\.vimeo\.com|iframe\.mediadelivery\.net|dailymotion\.com|tiktok\.com|instagram\.com|facebook\.com|fb\.watch/i.test(url);
    const rank = (d: VideoDoc) => {
      const own = d.owner_business_id === businessId;
      if (own && !isExternal(d.url)) return 0; // own fiche internal
      if (d.owner_business_id && !d.is_poi_linked && !own) return 1; // linked KP/business videos
      if (d.is_poi_linked) return 2; // POI-linked videos
      if (!d.owner_business_id) return 3; // generic videos
      return 4; // own fiche external (YouTube etc.)
    };

    const sorted = videoDocs
      .map((d, i) => ({ d, i }))
      .sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i)
      .map(x => x.d);
    const urls = sorted.map(d => d.url).filter(Boolean);
    // Legacy video belongs to the fiche but has no front_sort_order: keep it after sorted own-fiche videos.
    if (legacyVideo && !urls.includes(legacyVideo)) {
      const firstNonOwnIndex = sorted.findIndex((d) => d.owner_business_id !== businessId);
      urls.splice(firstNonOwnIndex === -1 ? urls.length : firstNonOwnIndex, 0, legacyVideo);
    }
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
