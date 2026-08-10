import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { MapPin, ChevronUp, X, Navigation, Minimize2, CalendarCheck, ShoppingBag, ExternalLink } from "lucide-react";
import VideoControls from "@/components/VideoControls";
import BookingOverlay from "@/components/BookingOverlay";
import { MediaCounterBar, DesktopMediaArrows, CardsToggleButton, useOwnerLogo, OwnerLogoOverlay, OwnerBadge } from "@/components/CardsVisibilityToggle";
import { useNavigate } from "react-router-dom";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import PanelSearchBar from "@/components/PanelSearchBar";
import BottomTabsCarousel, { TabScrollRail, TabVideoCard, TabCard, type BottomTabConfig } from "@/components/BottomTabsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import { useVideoSync } from "@/hooks/useVideoSync";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GOLD, getVideoInfo, playWoosh } from "@/lib/overlayConstants";
import OverlayFlipCard from "@/components/overlays/OverlayFlipCard";
import FullscreenVideoOverlay from "@/components/overlays/FullscreenVideoOverlay";
import { LazyDirectionsOverlay, LazyMosaicOverlay, LazyFullscreenLightbox } from "@/components/overlays/LazyOverlays";
import { CTA_MODE_LABELS } from "@/components/slidepanel/CtaBar";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import { businessUrl } from "@/lib/businessUrl";
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";

interface PoiSlidePanelProps {
  /** Either businessId (POI business) OR destinationId (destinations table). businessId takes precedence if both set. */
  businessId?: string;
  destinationId?: string;
  onClose: () => void;
  slideFrom?: "right" | "bottom";
  showSearchBar?: boolean;
  onSearch?: (params: Record<string, string>) => void;
  onSearchBusinessSelect?: (businessId: string) => void;
  /** Optional nav between sibling destinations (only used when destinationId is set) */
  onPrevDestination?: () => void;
  onNextDestination?: () => void;
}

interface PoiFull {
  id: string;
  name: string;
  description: string | null;
  poi_description: string | null;
  poi_hook: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  images: string[] | null;
  video_1_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  logo_url: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  reserve_now_url: string | null;
  reserve_now_force_external: boolean;
  presentation_mode: string;
  online_shop_url: string | null;
  online_shop_force_external: boolean;
  online_shop_presentation_mode: string;
  website: string | null;
  website_force_external: boolean;
  website_presentation_mode: string;
  carousel_badge: string | null;
}

const PoiSlidePanel = ({ businessId, destinationId, onClose, slideFrom = "bottom", showSearchBar, onSearch, onSearchBusinessSelect, onPrevDestination, onNextDestination }: PoiSlidePanelProps) => {
  // Chrome navigateur en noir + suppression des paddings safe-area (plein cadre)
  useDarkBrowserChrome(true);
  // Analytics: overlay_open au mount
  useEffect(() => {
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("overlay_open", { overlay: "poi", business_id: businessId, destination_id: destinationId })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Stable identifier used for effect dependencies & keys (one of the two must be set)
  const entityId = businessId || destinationId || "";
  const isDestination = !businessId && !!destinationId;
  const { language } = useLanguage();
  const navigate = useNavigate();
  const slideAnim = slideFrom === "bottom" ? "animate-slide-up-from-bottom" : "animate-slide-in-right";
  const savedUrlRef = useRef(window.location.pathname + window.location.search);
  const [poi, setPoi] = useState<PoiFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [showMosaic, setShowMosaic] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [linkedPois, setLinkedPois] = useState<PoiMapItem[]>([]);
  const [cityPoisForTabs, setCityPoisForTabs] = useState<{ id: string; name: string; slug: string; images: string[] | null; rating: number | null }[]>([]);
  const [linkedVideos, setLinkedVideos] = useState<{ url: string; name: string | null; thumbnailUrl: string | null; businessId: string; ownerName: string; ownerLogo: string | null; ownerSlug: string | null }[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<string>("videos");
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [openedPoiBusinessId, setOpenedPoiBusinessId] = useState<string | null>(null);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string | undefined>(undefined);
  const [highlights, setHighlights] = useState<{ id: string; icon: string; title: string; description: string; image_url: string | null; sort_order: number; metric_title: string | null; metric_value: string | null }[]>([]);
  const [highlightsSection, setHighlightsSection] = useState<{ title: string | null; intro: string | null }>({ title: null, intro: null });



  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards,
    onTouchStart: onDragTouchStart, onTouchMove: onDragTouchMove, onTouchEnd: onDragTouchEnd, onMouseDownDrag,
  } = useDragToHide();

  // Shared video sync hook (replaces inline event listeners)
  const images = poi?.images?.filter(Boolean) || [];
  const ownVideos = poi?.video_1_url ? [poi.video_1_url] : [];
  const poiFileVideos = linkedVideos.filter((v) => getVideoInfo(v.url).type === "file");

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };
  const mediaItems: MediaItem[] = useMemo(() => [
    ...poiFileVideos.map((cv) => ({ kind: "video" as const, url: cv.url })),
    ...ownVideos.filter(v => getVideoInfo(v).type === "file").map((v) => ({ kind: "video" as const, url: v })),
    ...images.map((i) => ({ kind: "image" as const, url: i })),
  ], [poiFileVideos, ownVideos, images]);

  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  const { videoPaused, videoMuted, pauseAndMute } = useVideoSync(videoRef as React.RefObject<HTMLVideoElement>, currentMedia);

  // Reset state when entity changes
  useEffect(() => {
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setShowDirections(false);
    setShowMosaic(false);
    setIsLightboxOpen(false);
    setFlipped(false);
    setLinkedPois([]);
    setCityPoisForTabs([]);
    setLinkedVideos([]);
    setHighlights([]);
    setHighlightsSection({ title: null, intro: null });
  }, [entityId]);

  // Fetch front_highlights for the business
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("front_highlights")
        .select("id, icon, title, description, image_url, sort_order, section_title, section_intro, metric_title, metric_value")
        .eq("business_id", businessId)
        .order("sort_order");
      if (cancelled || !data) return;
      const rows = data as any[];
      setHighlights(rows.map(r => ({
        id: r.id, icon: r.icon, title: r.title || "", description: r.description || "",
        image_url: r.image_url, sort_order: r.sort_order,
        metric_title: r.metric_title || null, metric_value: r.metric_value || null,
      })));
      setHighlightsSection({
        title: rows[0]?.section_title || null,
        intro: rows[0]?.section_intro || null,
      });
    })();
    return () => { cancelled = true; };
  }, [businessId]);
  useEffect(() => {
    const overlayOpen = showDirections || showBookingOverlay || showMosaic || isLightboxOpen || !!fullscreenVideo || !!openedPoiBusinessId;
    if (overlayOpen) pauseAndMute();
  }, [showDirections, showBookingOverlay, showMosaic, isLightboxOpen, fullscreenVideo, openedPoiBusinessId]);

  // Cosmetic URL rewriting
  useEffect(() => {
    if (poi?.name) {
      const prefix = isDestination ? "destination" : "poi";
      window.history.replaceState(null, "", `/${prefix}/${encodeURIComponent(poi.name)}`);
    }
  }, [poi?.name, isDestination]);

  // Restore URL on unmount
  useEffect(() => {
    const saved = savedUrlRef.current;
    return () => { window.history.replaceState(null, "", saved); };
  }, []);

  // Fetch POI / destination data
  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    const fetchPoi = async () => {
      setIsLoading(true);
      if (isDestination) {
        const { data } = await supabase
          .from("destinations" as any)
          .select("id, name_fr, name_en, name_ar, image_url, images, hook, description, latitude, longitude, region, videos")
          .eq("id", destinationId!)
          .maybeSingle();
        if (cancelled) return;
        if (!data) { setPoi(null); setIsLoading(false); return; }
        const d = data as any;
        const localizedName =
          language === "ar" && d.name_ar ? d.name_ar
            : language === "en" && d.name_en ? d.name_en
              : d.name_fr;
        const imgs = (d.images && d.images.length > 0 ? d.images : (d.image_url ? [d.image_url] : [])) as string[];
        const mapped: PoiFull = {
          id: d.id,
          name: localizedName,
          description: d.description ?? null,
          poi_description: null,
          poi_hook: d.hook ?? null,
          hook_fr: null, hook_en: null, hook_ar: null,
          images: imgs,
          video_1_url: null,
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          city: Array.isArray(d.region) && d.region.length > 0 ? d.region.join(", ") : null,
          neighborhood: null,
          address: null,
          phone: null, whatsapp: null, skype: null,
          logo_url: null,
          opening_hours: null,
          show_opening_hours: false,
          is_open_24h: false,
          google_rating: null, google_review_count: null,
          tripadvisor_rating: null, tripadvisor_review_count: null,
          restaurant_guru_rating: null, restaurant_guru_review_count: null,
          reserve_now_url: null, reserve_now_force_external: false,
          presentation_mode: "",
          online_shop_url: null, online_shop_force_external: false,
          online_shop_presentation_mode: "",
          website: null, website_force_external: false, website_presentation_mode: "",
          carousel_badge: null,
        };
        setPoi(mapped);
        setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, poi_description, poi_hook, hook_fr, hook_en, hook_ar, images, video_1_url, latitude, longitude, city, neighborhood, address, phone, whatsapp, skype, logo_url, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, reserve_now_url, reserve_now_force_external, presentation_mode, online_shop_url, online_shop_force_external, online_shop_presentation_mode, website, website_force_external, website_presentation_mode, carousel_badge")
        .eq("id", businessId!)
        .maybeSingle();
      if (cancelled) return;
      setPoi(data as PoiFull | null);
      setIsLoading(false);
    };
    fetchPoi();
    return () => { cancelled = true; };
  }, [entityId, isDestination, businessId, destinationId, language]);

  // Fetch linked items: POI businesses (when POI) or destination's provider businesses (when destination)
  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    const fetchLinked = async () => {
      if (isDestination) {
        const { data: links } = await (supabase
          .from("business_destinations" as any)
          .select("business_id")
          .eq("destination_id", destinationId!) as any);
        const bizIds = ((links || []) as any[]).map((l: any) => l.business_id);
        if (cancelled) return;
        if (bizIds.length === 0) { setLinkedPois([]); setCityPoisForTabs([]); return; }
        const all: any[] = [];
        for (let i = 0; i < bizIds.length; i += 500) {
          const { data } = await supabase
            .from("businesses")
            .select("id, name, slug, latitude, longitude, images, city, neighborhood, rating, main_category")
            .eq("is_active", true)
            .in("id", bizIds.slice(i, i + 500));
          if (data) all.push(...data);
        }
        if (cancelled) return;
        setLinkedPois(all.map((b: any) => ({
          id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude,
          images: b.images, city: b.city, neighborhood: b.neighborhood,
          rating: b.rating ? Number(b.rating) : null, subcategory: b.main_category,
        })));
        setCityPoisForTabs(all.map((b: any) => ({
          id: b.id, name: b.name, slug: b.slug, images: b.images,
          rating: b.rating ? Number(b.rating) : null,
        })));
        return;
      }

      const { data: poiLinks } = await supabase
        .from("business_poi_businesses")
        .select("poi_business_id")
        .eq("business_id", businessId!);

      const poiIds = ((poiLinks || []) as { poi_business_id: string }[])
        .map((link) => link.poi_business_id)
        .filter((id) => id !== businessId);

      if (cancelled) return;

      if (poiIds.length === 0) {
        const poiCity = poi?.city;
        if (poiCity) {
          const { data: cityPois } = await supabase
            .from("businesses")
            .select("id, name, slug, latitude, longitude, images, city, neighborhood, rating, main_category")
            .eq("is_active", true)
            .eq("is_poi", true)
            .eq("city", poiCity)
            .neq("id", businessId!)
            .order("priority_score", { ascending: false })
            .limit(50);
          if (!cancelled && cityPois) {
            setLinkedPois(
              cityPois.map((b: any) => ({
                id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude,
                images: b.images, city: b.city, neighborhood: b.neighborhood,
                rating: b.rating ? Number(b.rating) : null, subcategory: b.main_category,
              }))
            );
            setCityPoisForTabs(
              cityPois.map((b: any) => ({
                id: b.id, name: b.name, slug: b.slug, images: b.images,
                rating: b.rating ? Number(b.rating) : null,
              }))
            );
          }
        } else {
          setLinkedPois([]);
          setCityPoisForTabs([]);
        }
        return;
      }

      const { data: pois } = await supabase
        .from("businesses")
        .select("id, name, slug, latitude, longitude, images, city, neighborhood, rating, main_category")
        .in("id", poiIds)
        .eq("is_active", true);

      if (cancelled || !pois) return;

      setLinkedPois(
        pois.map((b) => ({
          id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude,
          images: b.images, city: b.city, neighborhood: b.neighborhood,
          rating: b.rating ? Number(b.rating) : null, subcategory: b.main_category,
        }))
      );

      setCityPoisForTabs(
        pois.map((b) => ({
          id: b.id, name: b.name, slug: b.slug, images: b.images,
          rating: b.rating ? Number(b.rating) : null,
        }))
      );
    };

    fetchLinked();
    return () => { cancelled = true; };
  }, [entityId, isDestination, businessId, destinationId, poi?.city]);

  // Fetch videos linked to this POI (business_documents + generic_videos)
  // or — for destinations — derive from the destination's `videos` array.
  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;

    if (isDestination) {
      (async () => {
        const { data } = await supabase
          .from("destinations" as any)
          .select("videos")
          .eq("id", destinationId!)
          .maybeSingle();
        if (cancelled) return;
        const urls = (((data as any)?.videos as string[] | null) || []).filter(Boolean);
        setLinkedVideos(urls.map((url, i) => ({
          url, name: null, thumbnailUrl: null,
          businessId: destinationId!, ownerName: "", ownerLogo: null, ownerSlug: null,
        })));
      })();
      return () => { cancelled = true; };
    }

    if (!businessId) return;
    // (`cancelled` already declared above)
    const fetchVideos = async () => {
      const [{ data: poiLinkedDocs }, { data: ownDocs }, { data: gvPoiLinks }] = await Promise.all([
        supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, business_id")
          .eq("type", "video")
          .eq("business_is_active", true)
          .eq("poi_id", businessId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, business_id")
          .eq("type", "video")
          .eq("business_is_active", true)
          .eq("business_id", businessId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("generic_video_pois" as any)
          .select("generic_video_id, sort_order")
          .eq("poi_id", businessId)
          .order("sort_order", { ascending: true }) as any,
      ]);
      if (cancelled) return;

      // Fetch generic videos if any are linked
      let genericVideos: { url: string; name: string | null; thumbnail_url: string | null }[] = [];
      if (gvPoiLinks?.length) {
        const gvIds = (gvPoiLinks as any[]).map((l: any) => l.generic_video_id);
        const { data: gvData } = await supabase
          .from("generic_videos")
          .select("id, url, name, thumbnail_url")
          .in("id", gvIds);
        if (!cancelled && gvData) {
          // Preserve sort_order from the link table
          const orderMap = new Map((gvPoiLinks as any[]).map((l: any) => [l.generic_video_id, l.sort_order ?? 0]));
          genericVideos = (gvData as any[])
            .sort((a: any, b: any) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
            .map((gv: any) => ({ url: gv.url, name: gv.name, thumbnail_url: gv.thumbnail_url }));
        }
      }
      if (cancelled) return;

      const seen = new Set<string>();
      const allDocs: typeof poiLinkedDocs = [];
      for (const d of [...(poiLinkedDocs || []), ...(ownDocs || [])]) {
        if (!seen.has(d.url)) { seen.add(d.url); allDocs.push(d); }
      }

      // Build linked videos from business_documents
      let result: typeof linkedVideos = [];
      if (allDocs.length > 0) {
        const ownerIds = [...new Set(allDocs.map(d => d.business_id))];
        const { data: owners } = await supabase
          .from("businesses")
          .select("id, name, logo_url, slug")
          .in("id", ownerIds);
        if (cancelled) return;
        const ownerMap = new Map((owners || []).map(o => [o.id, o]));
        result = allDocs.map(d => {
          const owner = ownerMap.get(d.business_id);
          return {
            url: d.url, name: d.name,
            ownerName: owner?.name || "",
            thumbnailUrl: d.thumbnail_url,
            businessId: d.business_id,
            ownerLogo: owner?.logo_url || null,
            ownerSlug: owner?.slug || null,
          };
        });
      }

      // Append generic videos (use businessId as owner since they belong to the POI)
      for (const gv of genericVideos) {
        if (!seen.has(gv.url)) {
          seen.add(gv.url);
          result.push({
            url: gv.url, name: gv.name,
            ownerName: "", thumbnailUrl: gv.thumbnail_url,
            businessId, ownerLogo: null, ownerSlug: null,
          });
        }
      }

      setLinkedVideos(result);
    };
    fetchVideos();
    return () => { cancelled = true; };
  }, [entityId, isDestination, businessId, destinationId]);

  const ownerVideoDocs = useMemo(() => linkedVideos.map(cv => ({
    url: cv.url,
    owner_business_id: cv.businessId,
    owner_logo: cv.ownerLogo,
    owner_name: cv.ownerName || null,
  })), [linkedVideos]);

  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, ownerVideoDocs, entityId);

  const displayDescription = useMemo(() => {
    const raw = poi?.poi_description || poi?.description || null;
    if (!raw) return null;
    const text = raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
    return text ? raw : null;
  }, [poi?.poi_description, poi?.description]);
  const displayHook = useMemo(() => {
    const specificPoiHook = poi?.poi_hook?.trim();
    if (specificPoiHook) return specificPoiHook;
    const localizedHook =
      language === "ar" ? poi?.hook_ar?.trim()
        : language === "en" ? poi?.hook_en?.trim()
          : poi?.hook_fr?.trim();
    return localizedHook || poi?.hook_fr?.trim() || poi?.hook_en?.trim() || poi?.hook_ar?.trim() || null;
  }, [language, poi?.hook_ar, poi?.hook_en, poi?.hook_fr, poi?.poi_hook]);

  const lightboxItems: LightboxMediaItem[] = useMemo(
    () => [
      ...images.map((url) => ({ type: "image" as const, src: url, alt: poi?.name || "" })),
      ...ownVideos.map((url) => ({ type: "video" as const, src: url, alt: poi?.name || "" })),
    ],
    [images, ownVideos, poi?.name]
  );

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  if (isLoading) {
    return (
      <div className={`absolute inset-0 z-[70] bg-black flex items-center justify-center ${slideAnim}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!poi) return null;

  return (
    <div className={`absolute inset-0 z-[70] bg-black overflow-hidden ${slideAnim}`}>
      {/* Close + mosaic buttons */}
      {!fullscreenVideo && !showDirections && !showBookingOverlay && !isLightboxOpen && (
        <div className="absolute top-3 left-3 z-[80] flex items-center gap-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
          {totalMedia > 0 && (
            <button onClick={() => setShowMosaic((p) => !p)} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors" title={showMosaic ? "Fermer la mosaïque" : "Voir tous les médias"}>
              {showMosaic ? <Minimize2 className="h-4 w-4" /> : <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />}
            </button>
          )}
          {isDestination && (onPrevDestination || onNextDestination) && (
            <>
              <button onClick={onPrevDestination} disabled={!onPrevDestination} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Destination précédente">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={onNextDestination} disabled={!onNextDestination} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Destination suivante">
                <ChevronUp className="h-4 w-4 rotate-180" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Lazy-loaded overlays */}
      <Suspense fallback={null}>
        {showDirections && poi.latitude && poi.longitude && (
          <div className="absolute inset-0 z-[75] bg-background animate-slide-up-from-bottom">
            <LazyDirectionsOverlay
              business={{ name: poi.name, address: poi.address, latitude: poi.latitude, longitude: poi.longitude, city: poi.city, phone: poi.phone, whatsapp: poi.whatsapp, skype: poi.skype, logo_url: poi.logo_url, opening_hours: poi.opening_hours, show_opening_hours: poi.show_opening_hours, is_open_24h: poi.is_open_24h, google_rating: poi.google_rating, google_review_count: poi.google_review_count, tripadvisor_rating: poi.tripadvisor_rating, tripadvisor_review_count: poi.tripadvisor_review_count, restaurant_guru_rating: poi.restaurant_guru_rating, restaurant_guru_review_count: poi.restaurant_guru_review_count } as any}
              onClose={() => setShowDirections(false)}
            />
          </div>
        )}

        {showMosaic && (
          <LazyMosaicOverlay
            mediaItems={mediaItems.map((m) => ({ kind: m.kind, url: m.url }))}
            headerVariant="immersive"
            coverParentToolbar={false}
            onClose={() => setShowMosaic(false)}
            onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
          />
        )}

        {isLightboxOpen && lightboxItems.length > 0 && (
          <LazyFullscreenLightbox
            items={lightboxItems}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </Suspense>

      {/* Fullscreen video overlay — shared component */}
      {fullscreenVideo && (
        <FullscreenVideoOverlay videoUrl={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}

      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" ? (
            <video ref={videoRef} key={currentMedia.url} src={currentMedia.url} className="w-full h-full object-cover" loop muted playsInline />
          ) : currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={poi.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />

        {/* Overlaid content */}
        <div
          className={`relative z-10 flex flex-col h-full p-4 md:p-6 ${cardsHidden ? 'pb-0' : ''}`}
          style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
          onTouchStart={onDragTouchStart} onTouchMove={onDragTouchMove} onTouchEnd={onDragTouchEnd}
        >
          {/* Top bar — show/hide toggle */}
          <div className="relative z-40 overflow-visible flex flex-col items-center pb-3 pointer-events-auto mt-1 md:mt-0">
            {cardsHidden ? (
              <MediaCounterBar currentIndex={safeIndex} totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)}>
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors" title="Afficher les cartes" aria-label="Afficher les cartes" onClick={(e) => { e.stopPropagation(); showCards(); }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Afficher</span>
                  <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
                </button>
              </MediaCounterBar>
            ) : (
              <CardsToggleButton cardsHidden={cardsHidden} showCards={showCards} hideCards={hideCards} onMouseDownDrag={onMouseDownDrag} />
            )}
          </div>

          {/* Flip card — shared component */}
          {!cardsHidden && (
            <OverlayFlipCard
              flipped={flipped}
              onFlip={() => { playWoosh(wooshSfx); setFlipped(true); }}
              onUnflip={() => { playWoosh(wooshSfx); setFlipped(false); }}
              name={poi.name}
              hook={displayHook}
              description={displayDescription}
              descExpanded={descExpanded}
              onToggleDesc={() => setDescExpanded((p) => !p)}
              mapMarkers={linkedPois}
              selectedMarkerId={poi.id}
              selectedLat={poi.latitude}
              selectedLng={poi.longitude}
              backLabel={language === "en" ? "Nearby" : "À proximité"}
              highlights={highlights}
              highlightsSectionTitle={highlightsSection.title}
              highlightsSectionIntro={highlightsSection.intro}
            />
          )}

          {/* Bottom tabs carousel */}
          {!cardsHidden && !flipped && (() => {
            const hasVideosTab = linkedVideos.length > 0;
            const hasPoisTab = cityPoisForTabs.length > 0;
            const tabs: BottomTabConfig[] = [];

            const videoTabLabel = (() => {
              if (poi?.carousel_badge) {
                const cb = poi.carousel_badge;
                if (cb === "immergez_vous") return language === "en" ? "Immerse yourself" : "Immergez-vous";
                if (cb === "bienvenue_a") return `${language === "en" ? "Welcome to" : "Bienvenue à"} ${poi.name}`;
                if (cb === "bienvenue_au") return `${language === "en" ? "Welcome to" : "Bienvenue au"} ${poi.name}`;
                if (cb === "bienvenue_chez") return `${language === "en" ? "Welcome to" : "Bienvenue chez"} ${poi.name}`;
                if (cb === "bienvenue") return language === "en" ? "Welcome" : "Bienvenue";
                if (cb === "bienvenue_a_l") return `${language === "en" ? "Welcome to" : "Bienvenue à l'"} ${poi.name}`;
                if (cb === "bienvenue_a_la") return `${language === "en" ? "Welcome to" : "Bienvenue à la"} ${poi.name}`;
                if (cb === "bienvenue_aux") return `${language === "en" ? "Welcome to" : "Bienvenue aux"} ${poi.name}`;
                if (cb === "nos_offres") return language === "en" ? "Our offers" : "Nos offres";
              }
              return `${language === "en" ? "Welcome to" : "Bienvenue à"} ${poi?.name || ""}`;
            })();

            if (hasVideosTab) tabs.push({
              id: "videos",
              label: videoTabLabel,
              className: "max-w-[220px] truncate md:max-w-none md:overflow-visible md:text-clip",
              renderContent: (animate, animCls) => (
                <TabScrollRail>
                  {linkedVideos.map((cv, index) => {
                    const info = getVideoInfo(cv.url);
                    return (
                      <TabVideoCard key={index} thumbnailUrl={cv.thumbnailUrl} platformThumbnailUrl={info.thumbnail} label={cv.name || cv.ownerName || `${language === "en" ? "Video" : "Vidéo"} ${index + 1}`} onClick={() => setFullscreenVideo(cv.url)} animate={animate} animationClass={animCls} animationDelay={index * 120} />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            if (hasPoisTab) tabs.push({
              id: "pois",
              label: language === "en" ? "NEARBY" : "À PROXIMITÉ",
              renderContent: (animate, animCls) => (
                <TabScrollRail>
                  {cityPoisForTabs.map((p, index) => {
                    const img = p.images && p.images.length > 0 ? p.images[0] : null;
                    return (
                      <TabCard key={p.id} imageUrl={img} label={p.name} onClick={() => setOpenedPoiBusinessId(p.id)} animate={animate} animationClass={animCls} animationDelay={index * 120} />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            if (tabs.length === 0) return null;
            return <BottomTabsCarousel tabs={tabs} activeTab={activeBottomTab} onTabChange={setActiveBottomTab} />;
          })()}

          {/* Owner logo + badge */}
          <OwnerLogoOverlay logoBigOverlay={logoBigOverlay} logoBigFadingOut={logoBigFadingOut} cardsHidden={cardsHidden} currentMediaUrl={currentMedia?.url} videoDocs={ownerVideoDocs} currentBusinessId={entityId} />
          <OwnerBadge
            cardsHidden={cardsHidden} currentMediaKind={currentMedia?.kind} currentMediaUrl={currentMedia?.url}
            videoDocs={ownerVideoDocs} currentBusinessId={entityId}
            onNavigateToOwner={(ownerId) => {
              const cv = linkedVideos.find(v => v.businessId === ownerId);
              if (cv?.ownerSlug) navigate(businessUrl({ id: cv.businessId, slug: cv.ownerSlug }));
            }}
          />

          {/* CTAs + video controls — using shared CTA_MODE_LABELS */}
          {(() => {
            const ctaItems: React.ReactNode[] = [];
            const lang = language === "en" ? "en" : "fr";

            // Booking / Reserve CTA
            if (poi.reserve_now_url) {
              const fullUrl = poi.reserve_now_url.startsWith("http") ? poi.reserve_now_url : `https://${poi.reserve_now_url}`;
              const label = CTA_MODE_LABELS[poi.presentation_mode]?.[lang] || CTA_MODE_LABELS.reserver_en_ligne[lang];
              if (poi.reserve_now_force_external) {
                ctaItems.push(
                  <a key="booking" href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}>
                    <CalendarCheck className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
                  </a>
                );
              } else {
                ctaItems.push(
                  <button key="booking" onClick={() => { setBookingOverlayUrl(fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }} className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
                    <CalendarCheck className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              }
            }

            // Shop CTA
            if (poi.online_shop_url) {
              const fullUrl = poi.online_shop_url.startsWith("http") ? poi.online_shop_url : `https://${poi.online_shop_url}`;
              const label = CTA_MODE_LABELS[poi.online_shop_presentation_mode]?.[lang] || CTA_MODE_LABELS.acheter_en_ligne[lang];
              if (poi.online_shop_force_external) {
                ctaItems.push(
                  <a key="shop" href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}>
                    <ShoppingBag className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
                  </a>
                );
              } else {
                ctaItems.push(
                  <button key="shop" onClick={() => { setBookingOverlayUrl(fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}>
                    <ShoppingBag className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              }
            }

            // Directions CTA
            if (poi.latitude && poi.longitude) {
              ctaItems.push(
                <button key="directions" onClick={() => setShowDirections(true)} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}>
                  <Navigation className="h-4 w-4 hidden md:block" />
                  <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
                </button>
              );
            }

            if (ctaItems.length === 0 && currentMedia?.kind !== "video") return null;
            return (
              <div className="shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto">
                {ctaItems.length > 0 && (
                  <div className="w-full md:w-3/4 md:px-0 flex justify-center gap-2">
                    {ctaItems.map((item, i) => (
                      <div key={i} className="flex-1 md:flex-none md:w-1/3">{item}</div>
                    ))}
                  </div>
                )}
                {/* Use shared VideoControls component instead of inline buttons */}
                {currentMedia?.kind === "video" && (
                  <VideoControls type="file" videoRef={videoRef as React.RefObject<HTMLVideoElement>} paused={videoPaused} muted={videoMuted} className="mt-1 animate-slide-up-from-bottom" />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Booking overlay (iframe) */}
      {showBookingOverlay && bookingOverlayUrl && (
        <div className="absolute inset-0 z-[72] [&>div]:!mt-0">
          <BookingOverlay
            bookingUrl={bookingOverlayUrl}
            title={bookingOverlayTitle}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); }}
          />
        </div>
      )}

      {/* PanelSearchBar removed in POI overlay — no bottom round CTAs */}


      {/* Recursive SlidePanel for selected POI */}
      {openedPoiBusinessId && (
        <div className="absolute inset-0 z-[75] animate-slide-up-from-bottom">
          <BookOnlineSlidePanel
            businessId={openedPoiBusinessId}
            onClose={() => setOpenedPoiBusinessId(null)}
            showSearchBar={false}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
          />
        </div>
      )}
    </div>
  );
};

export default PoiSlidePanel;
