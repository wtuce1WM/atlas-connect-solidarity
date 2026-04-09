import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DesktopMediaArrows, CardsToggleButton, useOwnerLogo } from "@/components/CardsVisibilityToggle";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import { createPortal } from "react-dom";
import { MapPin, ChevronUp, X, CalendarCheck, Star, Loader2 } from "lucide-react";
import VideoControls from "@/components/VideoControls";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/haversine";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import poiNearbyImg from "@/assets/poi-nearby.webp";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";

import { whatsappUrl } from "@/lib/phoneUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import { getVideoEmbed } from "@/lib/videoEmbed";
import ContactFlipCard from "@/components/cards/ContactFlipCard";
import ReviewsFlipCard from "@/components/cards/ReviewsFlipCard";
import ExternalLinksFlipCard from "@/components/cards/ExternalLinksFlipCard";
import SocialLinksCard from "@/components/cards/SocialLinksCard";
import MenuSummaryCard from "@/components/cards/MenuSummaryCard";
import MapCard from "@/components/cards/MapCard";
import DirectionsOverlay from "@/components/DirectionsOverlay";
import MosaicOverlay from "@/components/MosaicOverlay";
import YouTubeShortsCarousel, { type YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import { useNavigate } from "react-router-dom";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

// Extracted hook and overlay components
import { useBookOnlineData } from "@/hooks/useBookOnlineData";
import type { Destination } from "@/hooks/useBookOnlineData";
import VideoDocumentOverlay from "@/components/overlays/VideoDocumentOverlay";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import DocumentOverlay from "@/components/overlays/DocumentOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import SerpApiHotelOverlay from "@/components/SerpApiHotelOverlay";
import PanelSearchBar from "@/components/PanelSearchBar";

// Extracted sub-components
import { useHotelAvailability } from "@/hooks/useHotelAvailability";
import { useOpenStatus } from "@/hooks/useOpenStatus";
import { ToolbarPortals } from "@/components/slidepanel/ToolbarPortals";
import { CtaBar, CTA_MODE_LABELS } from "@/components/slidepanel/CtaBar";
import { HotelAvailabilityResult } from "@/components/slidepanel/HotelAvailabilityResult";


interface BookOnlineSlidePanelProps {
  businessId: string;
  onClose: () => void;
  externalOverlayActive?: boolean;
  forceMuted?: boolean;
  interceptCloseRef?: React.MutableRefObject<(() => boolean) | null>;
  showSearchBar?: boolean;
  onSearch?: (params: Record<string, string>) => void;
  onSearchBusinessSelect?: (businessId: string) => void;
  onMosaicStateChange?: (open: boolean) => void;
  closeTrigger?: number;
  propagateMosaicState?: boolean;
}

type MediaItem = { kind: "video"; url: string; thumbnailUrl?: string | null } | { kind: "image"; url: string } | { kind: "matterport"; url: string };

const BookOnlineSlidePanel = ({ businessId: propBusinessId, onClose, externalOverlayActive, forceMuted, interceptCloseRef, showSearchBar, onSearch, onSearchBusinessSelect, onMosaicStateChange, closeTrigger, propagateMosaicState = false }: BookOnlineSlidePanelProps) => {
  const [activeBusinessId, setActiveBusinessIdRaw] = useState(propBusinessId);
  const [previousBusinessId, setPreviousBusinessId] = useState<string | null>(null);
  const previousCardsHiddenRef = useRef(false);
  const currentCardsHiddenRef = useRef(false);
  const setActiveBusinessId = useCallback((id: string) => {
    setActiveBusinessIdRaw(prev => {
      if (prev !== id) {
        setPreviousBusinessId(prev);
        previousCardsHiddenRef.current = currentCardsHiddenRef.current;
      }
      return id;
    });
  }, []);
  useEffect(() => { setActiveBusinessIdRaw(propBusinessId); setPreviousBusinessId(null); setSerpApiOverlayCtx(null); setCameFromFallback(false); }, [propBusinessId]);
  const businessId = activeBusinessId;
  const [cameFromFallback, setCameFromFallback] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();

  const {
    business, woDescription, destinations, poiBusinesses, isLoading,
    reviewTexts, externalLinks, menuSummaries, menuDocs, videoDocs,
    allVideoUrls, categoryIcon, showGoogleMap, kpRelated, kpSubcategoryItems, kpSubcategoryLabel, isKp1Only, liteApiHotelId, serpApiMapping, isHotelWithPrice,
  } = useBookOnlineData(businessId);

  // --- Cosmetic URL rewriting ---
  const savedUrlRef = useRef(window.location.pathname + window.location.search);

  // UI state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string | undefined>(undefined);
  const [docOverlay, setDocOverlay] = useState<{ url: string; name: string; type: 'pdf' | 'flipbook'; ts: number } | null>(null);
  const [docOverlayLoaded, setDocOverlayLoaded] = useState(false);
  const [bookingOverlayLoaded, setBookingOverlayLoaded] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedPoiBusinessId, setSelectedPoiBusinessId] = useState<string | null>(null);
  const [selectedKpBusinessId, setSelectedKpBusinessId] = useState<string | null>(null);
  const [showPoiMapOverlay, setShowPoiMapOverlay] = useState(false);
  const [poiMapMode, setPoiMapMode] = useState<"poi" | "destinations">("poi");
  const poiOpenedFromMapRef = useRef(false);
  const [nearbyFallback, setNearbyFallback] = useState<PoiMapItem[]>([]);
  
  const [activeVideoOverlay, setActiveVideoOverlay] = useState<{ url: string; name: string | null; description: string | null } | null>(null);
  const [videoOverlayClosing, setVideoOverlayClosing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showHook, setShowHook] = useState(false);
  
  const [showMosaicRaw, setShowMosaicRaw] = useState(false);
  const setShowMosaic = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setShowMosaicRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      if (next !== prev && propagateMosaicState) onMosaicStateChange?.(next);
      return next;
    });
  }, [onMosaicStateChange, propagateMosaicState]);
  const showMosaic = showMosaicRaw;
  const [ytBgPlaying, setYtBgPlaying] = useState(true);
  const [ytBgMuted, setYtBgMuted] = useState(false);
  const [youtubeVideoCount, setYoutubeVideoCount] = useState<number | null>(null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [allYoutubeVideos, setAllYoutubeVideos] = useState<YouTubeVideo[]>([]);

  // Hotel availability overlay
  const [availabilityOverlayCtx, setAvailabilityOverlayCtx] = useState<{
    liteApiHotelId: string;
    businessName: string;
    businessCity?: string;
    backgroundImage?: string;
  } | null>(null);
  const [fallbackPanelData, setFallbackPanelData] = useState<FallbackPanelData | null>(null);
  const [selectedFallbackHotelId, setSelectedFallbackHotelId] = useState<string | null>(null);
  const [serpApiOverlayCtx, setSerpApiOverlayCtx] = useState<{ serpHotelName: string; serpCity: string; businessName: string; reserveNowUrl?: string | null } | null>(null);
  const serpApiOverlayCtxRef = useRef<typeof serpApiOverlayCtx>(null);
  const serpApiReturnBusinessIdRef = useRef<string | null>(null);
  const [fallbackHiddenOnMobile, setFallbackHiddenOnMobile] = useState(false);
  const [showFallbackOverlay, setShowFallbackOverlay] = useState(false);
  const [searchOverlayActive, setSearchOverlayActive] = useState(false);
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  
  const fallbackDataRef = useRef<FallbackPanelData | null>(null);
  useEffect(() => {
    if (fallbackPanelData) fallbackDataRef.current = fallbackPanelData;
  }, [fallbackPanelData]);

  const destInterceptCloseRef = useRef<(() => boolean) | null>(null);

  // --- Cosmetic URL rewriting effects ---
  useEffect(() => {
    if (!business?.slug) return;
    const hasSubOverlay = selectedDestinationId || selectedPoiBusinessId || selectedKpBusinessId;
    if (!hasSubOverlay) {
      const currentPath = window.location.pathname;
      const prefix = currentPath.startsWith("/fiche/") ? "/fiche/" : "/business/";
      window.history.replaceState(null, "", `${prefix}${business.slug}`);
    }
  }, [business?.slug, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId]);

  useEffect(() => {
    if (!selectedDestinationId) return;
    const dest = destinations.find(d => d.id === selectedDestinationId);
    if (dest) {
      window.history.replaceState(null, "", `/destination/${encodeURIComponent(dest.name_fr)}`);
    }
  }, [selectedDestinationId, destinations]);

  useEffect(() => {
    const saved = savedUrlRef.current;
    return () => { window.history.replaceState(null, "", saved); };
  }, []);

  // Close interceptor
  useEffect(() => {
    if (!interceptCloseRef) return;
    if (selectedDestinationId || selectedPoiBusinessId || selectedKpBusinessId) {
      interceptCloseRef.current = () => {
        if (selectedDestinationId && destInterceptCloseRef.current?.()) return true;
        if (selectedDestinationId) { setSelectedDestinationId(null); return true; }
        if (selectedPoiBusinessId) { setSelectedPoiBusinessId(null); return true; }
        if (selectedKpBusinessId) { setSelectedKpBusinessId(null); return true; }
        return false;
      };
    } else if (previousBusinessId) {
      const shouldRestoreHidden = previousCardsHiddenRef.current;
      interceptCloseRef.current = () => {
        setActiveBusinessIdRaw(previousBusinessId);
        setPreviousBusinessId(null);
        if (shouldRestoreHidden) {
          setTimeout(() => { hideCardsRef.current?.(); }, 100);
        }
        return true;
      };
    } else if (cameFromFallback && fallbackDataRef.current) {
      interceptCloseRef.current = () => {
        if (!fallbackPanelData && fallbackDataRef.current) {
          setFallbackPanelData(fallbackDataRef.current);
        }
        setFallbackHiddenOnMobile(false);
        setShowFallbackOverlay(true);
        return true;
      };
    } else {
      interceptCloseRef.current = null;
    }
  }, [previousBusinessId, cameFromFallback, fallbackPanelData, interceptCloseRef, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId]);

  const hideCardsRef = useRef<() => void>(() => {});
  const hasSerpMapping = !!serpApiMapping || !!liteApiHotelId;

  // Extracted hotel availability hook
  const handleCheckAvailability = useHotelAvailability({
    business,
    businessId,
    serpApiMapping,
    hasSerpMapping,
    language,
    setHotelSearchLoading,
    openFallback: useCallback((data: FallbackPanelData) => {
      const isMobileOrTablet = typeof window !== "undefined" && window.innerWidth < 1024;
      if (isMobileOrTablet) setShowTransitionOverlay(true);
      setFallbackPanelData(data);
      setSelectedFallbackHotelId(null);
      setFallbackHiddenOnMobile(false);
      hideCardsRef.current();
    }, []),
    hideCards: useCallback(() => { hideCardsRef.current(); }, []),
  });

  useEffect(() => {
    if (!showTransitionOverlay) return;
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setShowTransitionOverlay(false);
      return;
    }
    const timer = window.setTimeout(() => setShowTransitionOverlay(false), 300);
    return () => clearTimeout(timer);
  }, [showTransitionOverlay]);

  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards, resetDrag,
    onTouchStart, onTouchMove, onTouchEnd, onMouseDownDrag,
  } = useDragToHide();
  useEffect(() => { hideCardsRef.current = hideCards; }, [hideCards]);
  useEffect(() => { currentCardsHiddenRef.current = cardsHidden; }, [cardsHidden]);

  // Track recently viewed
  useEffect(() => {
    if (business) {
      window.dispatchEvent(new CustomEvent("track-business-view", {
        detail: { id: business.id, name: business.name, images: business.images, logo_url: business.logo_url, city: business.city, slug: (business as any).slug || business.id },
      }));
    }
  }, [business?.id]);

  // Reset UI state when switching business
  useEffect(() => {
    resetDrag();
    setShowDirections(false);
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setSelectedDestinationId(null);
    setSelectedPoiBusinessId(null);
    setSelectedKpBusinessId(null);
    setShowBookingOverlay(false);
    setDocOverlay(null);
    setIsLightboxOpen(false);
    setShowMosaic(false);
    setYtBgPlaying(true);
    setYtBgMuted(!(business?.default_sound_on ?? true));
    setShowHook(false);
    setYoutubeVideoCount(null);
    setActiveYoutubeVideo(null);
    setYoutubeIsPlaying(false);
    setShowYoutubeOverlay(false);
    setActiveVideoOverlay(null);
    setVideoOverlayClosing(false);
    setShowPoiMapOverlay(false);
    setPoiMapMode("poi");
    setNearbyFallback([]);
    if (infoCarouselRef.current) infoCarouselRef.current.scrollLeft = 0;
    setAvailabilityOverlayCtx(null);
    if (!cameFromFallback) {
      setFallbackPanelData(null);
      setSelectedFallbackHotelId(null);
      setFallbackHiddenOnMobile(false);
      setShowFallbackOverlay(false);
    } else {
      setShowFallbackOverlay(false);
    }
  }, [businessId, resetDrag]);

  const infoCarouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  // Nearby fallback
  useEffect(() => {
    if (poiBusinesses.length > 0 || !business?.latitude || !business?.longitude) {
      setNearbyFallback([]);
      return;
    }
    let cancelled = false;
    const fetchNearby = async () => {
      const lat = business.latitude!;
      const lng = business.longitude!;
      const delta = 5 / 111;
      const { data } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, images, city, neighborhood, is_master, kp_regroupement")
        .eq("is_active", true)
        .gte("latitude", lat - delta)
        .lte("latitude", lat + delta)
        .gte("longitude", lng - delta)
        .lte("longitude", lng + delta)
        .neq("id", business.id);
      if (cancelled || !data) return;
      const currentKp = business.kp_regroupement;
      const filtered = currentKp ? data.filter((b: any) => b.kp_regroupement !== currentKp) : data;
      const inRadius = filtered.filter((b: any) =>
        b.latitude && b.longitude && haversineKm(lat, lng, b.latitude, b.longitude) <= 5
      );
      const coordMap = new Map<string, any>();
      for (const b of inRadius) {
        const key = `${b.latitude?.toFixed(6)},${b.longitude?.toFixed(6)}`;
        const existing = coordMap.get(key);
        if (!existing) coordMap.set(key, b);
        else if (b.is_master && !existing.is_master) coordMap.set(key, b);
      }
      const deduped = Array.from(coordMap.values()).map((b: any) => ({
        id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude,
        images: b.images, city: b.city, neighborhood: b.neighborhood,
      } as PoiMapItem));
      if (!cancelled) setNearbyFallback(deduped);
    };
    fetchNearby();
    return () => { cancelled = true; };
  }, [poiBusinesses.length, business?.id, business?.latitude, business?.longitude]);

  const keepMutedRef = useRef(false);
  const muteLockSrcRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrcRef = useRef<string>("");
  const overlayWasOpenRef = useRef(false);

  // Sync video state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setVideoPaused(false);
    const onPause = () => setVideoPaused(true);
    const onVolChange = () => setVideoMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVolChange);
    setVideoPaused(v.paused);
    setVideoMuted(v.muted);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVolChange);
    };
  });

  useEffect(() => {
    keepMutedRef.current = false;
    muteLockSrcRef.current = null;
    overlayWasOpenRef.current = false;
    iframeSrcRef.current = "";
  }, [businessId]);

  // Force-mute
  useEffect(() => {
    if (forceMuted) {
      if (videoRef.current) videoRef.current.muted = true;
      if (iframeRef.current) {
        iframeSrcRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
    } else if (!forceMuted && iframeRef.current && !iframeRef.current.src && iframeSrcRef.current) {
      const restoredMutedSrc = iframeSrcRef.current
        .replace(/([?&])mute=\d/i, "$1mute=1")
        .replace(/([?&])controls=\d/i, "$1controls=0");
      iframeRef.current.src = restoredMutedSrc;
    }
  }, [forceMuted]);

  // Pause/resume on overlays
  useEffect(() => {
    const overlayOpen = showDirections || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId || !!docOverlay || showBookingOverlay || showYoutubeOverlay || showMosaic || !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay || showFallbackOverlay || searchOverlayActive;

    if (overlayOpen) {
      overlayWasOpenRef.current = true;
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.muted = true; }
      if (iframeRef.current) { iframeSrcRef.current = iframeRef.current.src; iframeRef.current.src = ""; }
      return;
    }

    if (overlayWasOpenRef.current) {
      keepMutedRef.current = true;
      if (videoRef.current) {
        videoRef.current.muted = true;
        muteLockSrcRef.current = videoRef.current.currentSrc || videoRef.current.src || null;
        videoRef.current.play().catch(() => {});
      }
      if (iframeRef.current && iframeSrcRef.current) {
        const restoredMutedSrc = iframeSrcRef.current.replace(/([?&])mute=\d/i, "$1mute=1").replace(/([?&])controls=\d/i, "$1controls=0");
        iframeRef.current.src = restoredMutedSrc;
      }
      overlayWasOpenRef.current = false;
      return;
    }

    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [showDirections, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId, docOverlay, showBookingOverlay, showYoutubeOverlay, showMosaic, externalOverlayActive, showPoiMapOverlay, activeVideoOverlay, showFallbackOverlay, searchOverlayActive]);


  const bookUrl = business?.reserve_now_url || null;
  const shopUrl = business?.online_shop_url || null;
  const videos = allVideoUrls;
  const images = business?.images?.filter(Boolean) || [];
  const hasOpeningHours = business?.show_opening_hours !== false && (business?.is_open_24h || business?.opening_hours);

  const reviewPlatforms = useMemo(() => {
    if (!business) return [];
    return [
      { name: "Google", rating: business.google_rating, count: business.google_review_count, url: business.google_reviews_url || business.google_maps_url },
      { name: "TripAdvisor", rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, url: business.tripadvisor_review_url || business.tripadvisor_url },
      { name: "Restaurant Guru", rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, url: business.restaurant_guru_url },
      { name: "Trustpilot", rating: business.trustpilot_rating, count: business.trustpilot_review_count, url: business.trustpilot_url },
      { name: "GetYourGuide", rating: business.getyourguide_rating, count: business.getyourguide_review_count, url: business.getyourguide_url },
      { name: "Viator", rating: business.viator_rating, count: business.viator_review_count, url: business.viator_url },
      { name: "Avis Vérifiés", rating: business.avis_verifies_rating, count: business.avis_verifies_review_count, url: business.avis_verifies_url },
      { name: "TourRadar", rating: business.tourradar_rating, count: business.tourradar_review_count, url: business.tourradar_url },
    ];
  }, [business]);
  const languages = business?.languages?.filter(Boolean) || [];

  const { avgOn20, totalReviewCount } = useMemo(() => {
    if (!business) return { avgOn20: null, totalReviewCount: 0 };
    return { avgOn20: business.computed_rating ?? null, totalReviewCount: business.total_review_count ?? 0 };
  }, [business]);

  const hasContactCard = !!(business?.phone || business?.whatsapp || business?.email || business?.website || business?.address);
  const hasReviewsCard = avgOn20 !== null && avgOn20 > 0;

  // Extracted open status hook
  const openBadgeInfo = useOpenStatus({ business, language });

  // Bottom tabs
  const hasVideosCarousel = videoDocs.length > 0;
  const hasYoutubeBottomCarousel = !!(business?.youtube_url && business?.show_youtube_tab && youtubeVideoCount !== 0);
  const hasYoutubeReady = !!(youtubeVideoCount && youtubeVideoCount > 0);
  const hasKpCarousel = kpRelated.length > 0;
  const hasKpSubcatCarousel = kpSubcategoryItems.length > 0;
  const hasDestCarousel = destinations.length > 1;
  const hasPoiCarousel = poiBusinesses.length >= 2;

  const videoTabLabel = useMemo(() => {
    if (business?.carousel_badge) {
      const cb = business.carousel_badge;
      if (cb === "immergez_vous") return language === "en" ? "Immerse yourself" : "Immergez-vous";
      if (cb === "bienvenue_a") return `${language === "en" ? "Welcome to" : "Bienvenue à"} ${business.name}`;
      if (cb === "bienvenue_au") return `${language === "en" ? "Welcome to" : "Bienvenue au"} ${business.name}`;
      if (cb === "bienvenue_chez") return `${language === "en" ? "Welcome to" : "Bienvenue chez"} ${business.name}`;
      if (cb === "nos_offres") return language === "en" ? "Our offers" : "Nos offres";
    }
    return `${language === "en" ? "Welcome to" : "Bienvenue à"} ${business?.name || ""}`;
  }, [business?.carousel_badge, business?.name, language]);

  type BottomTab = { id: "videos" | "youtube" | "kp" | "kp_subcat" | "dest" | "poi"; label: string; hasContent: boolean };
  const hasKpCode = !!(business?.kp_regroupement?.trim() || business?.kp_regroupement_2?.trim());
  const bottomTabs = useMemo<BottomTab[]>(() => {
    const tabs: BottomTab[] = [];
    if (videoDocs.length >= 2 && !business?.prioritize_images) {
      tabs.push({ id: "videos", label: videoTabLabel, hasContent: hasVideosCarousel });
    }
    if (hasYoutubeBottomCarousel) {
      tabs.push({ id: "youtube", label: "YouTube", hasContent: hasYoutubeReady || hasYoutubeBottomCarousel });
    }
    if (hasDestCarousel) tabs.push({ id: "dest", label: "Destinations", hasContent: true });
    if (hasKpSubcatCarousel) {
      tabs.push({ id: "kp_subcat", label: kpSubcategoryLabel || (language === "en" ? "Category" : "Catégorie"), hasContent: true });
    }
    if (hasKpCarousel) {
      tabs.push({ id: "kp", label: language === "en" ? "Other establishments" : "Autres établissements", hasContent: true });
    }
    if (hasPoiCarousel) {
      tabs.push({ id: "poi", label: language === "en" ? "Nearby" : "À proximité", hasContent: true });
    }
    return tabs;
  }, [videoTabLabel, hasVideosCarousel, hasYoutubeBottomCarousel, hasYoutubeReady, hasKpCarousel, hasKpSubcatCarousel, kpSubcategoryLabel, hasKpCode, hasDestCarousel, hasPoiCarousel, language, videoDocs.length]);

  const [activeBottomTab, setActiveBottomTab] = useState<string>("videos");
  const bottomTabInitialRef = useRef(true);
  useEffect(() => { bottomTabInitialRef.current = true; }, [businessId]);
  useEffect(() => {
    if (bottomTabs.length > 0) {
      if (bottomTabInitialRef.current) {
        if (!isLoading) {
          setActiveBottomTab(bottomTabs[0].id);
          requestAnimationFrame(() => { setTimeout(() => { bottomTabInitialRef.current = false; }, 600); });
        }
      } else if (!bottomTabs.find(t => t.id === activeBottomTab)) {
        setActiveBottomTab(bottomTabs[0].id);
      }
    }
  }, [bottomTabs, businessId, isLoading]);
  const handleBottomTabChange = (tabId: string) => { bottomTabInitialRef.current = false; setActiveBottomTab(tabId); };
  const slideInClass = bottomTabInitialRef.current ? "animate-slide-in-left opacity-0" : "";

  const hookText = useMemo(() => {
    if (!business) return null;
    const raw = language === "ar" && business.hook_ar ? business.hook_ar
      : language === "en" && business.hook_en ? business.hook_en
      : business.hook_fr;
    return raw?.trim() || null;
  }, [business, language]);

  useEffect(() => {
    if (!hookText) { setShowHook(false); return; }
    setShowHook(false);
    const interval = setInterval(() => setShowHook((v) => !v), 5000);
    return () => clearInterval(interval);
  }, [hookText, businessId]);

  const mediaItems = useMemo<MediaItem[]>(() => {
    const videoItems = videos.map((v) => {
      const doc = videoDocs.find(d => d.url === v);
      return { kind: "video" as const, url: v, thumbnailUrl: doc?.thumbnail_url || null };
    });
    const imageItems = images.map((i) => ({ kind: "image" as const, url: i }));
    const matterportItems: MediaItem[] = business?.matterport_url
      ? [{ kind: "matterport" as const, url: business.matterport_url }]
      : [];
    if (business?.prioritize_images) return [...imageItems, ...videoItems, ...matterportItems];
    if (business?.show_videos) return [...videoItems, ...imageItems, ...matterportItems];
    return [...matterportItems, ...videoItems, ...imageItems];
  }, [videos, images, videoDocs, business?.prioritize_images, business?.show_videos, business?.matterport_url]);

  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;
  const matterportItem = useMemo(() => mediaItems.find(m => m.kind === "matterport") || null, [mediaItems]);
  const effectiveMedia = (cardsHidden && matterportItem) ? matterportItem : currentMedia;

  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, videoDocs, businessId);

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  const videoInfo = useMemo(() => {
    if (effectiveMedia?.kind !== "video") return null;
    const base = getVideoEmbed(effectiveMedia.url, window.location.origin, { background: true, defaultSoundOn: business?.default_sound_on ?? true });
    if (base.type === "youtube") {
      return { ...base, embedUrl: base.embedUrl.replace(/controls=0/, "controls=1").replace(/disablekb=1/, "disablekb=0") };
    }
    return base;
  }, [effectiveMedia?.kind, effectiveMedia?.url, business?.default_sound_on]);

  const [isFileVideoVertical, setIsFileVideoVertical] = useState(false);
  const isVerticalVideo = videoInfo ? (videoInfo.type === "file" ? isFileVideoVertical : videoInfo.isVertical) : false;
  const externalVideoInteractiveMode = cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type !== "file";

  // Listen for YouTube "ended"
  useEffect(() => {
    if (!videoInfo || videoInfo.type !== "youtube" || totalMedia <= 1) return;
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) goMedia(1);
      } catch { /* ignore */ }
    };
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 0 }), "*");
    }, 1000);
    window.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [videoInfo, totalMedia, goMedia]);

  const lightboxItems = useMemo<LightboxMediaItem[]>(() =>
    mediaItems.map((m) =>
      m.kind === "video" ? { type: "video" as const, src: m.url, alt: business?.name || "" }
        : m.kind === "matterport" ? { type: "matterport" as const, src: m.url, alt: `${business?.name || ""} – Visite 3D` }
        : { type: "image" as const, src: m.url, alt: business?.name || "" }
    ),
  [mediaItems, business?.name]);

  const bookingCta = useMemo(() => {
    if (!bookUrl) return null;
    const fullUrl = bookUrl.startsWith("http") ? bookUrl : `https://${bookUrl}`;
    const isReserveUrl = !!business?.reserve_now_url;
    const forceExternal = isReserveUrl ? business?.reserve_now_force_external : business?.website_force_external;
    return { fullUrl, forceExternal };
  }, [bookUrl, business?.reserve_now_url, business?.reserve_now_force_external, business?.website_force_external]);

  const shopCta = useMemo(() => {
    if (!shopUrl) return null;
    const fullUrl = shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`;
    const forceExternal = business?.online_shop_force_external;
    return { fullUrl, forceExternal };
  }, [shopUrl, business?.online_shop_force_external]);

  const bookingCtaLabel = useMemo(() => {
    const mode = business?.presentation_mode || 'reserver_en_ligne';
    const pair = CTA_MODE_LABELS[mode] || CTA_MODE_LABELS.reserver_en_ligne;
    return language === 'en' ? pair.en : pair.fr;
  }, [business?.presentation_mode, language]);

  const shopCtaLabel = useMemo(() => {
    const mode = (business as any)?.online_shop_presentation_mode || 'acheter_en_ligne';
    const pair = CTA_MODE_LABELS[mode] || CTA_MODE_LABELS.acheter_en_ligne;
    return language === 'en' ? pair.en : pair.fr;
  }, [(business as any)?.online_shop_presentation_mode, language]);

  const hasBottomActionCtas = !!bookingCta || !!shopCta || (!cardsHidden && showGoogleMap && business?.latitude && business?.longitude);
  const externalVideoBackgroundClass = externalVideoInteractiveMode && showSearchBar
    ? `absolute inset-x-0 top-0 ${hasBottomActionCtas ? 'bottom-[160px]' : 'bottom-[88px]'} z-0`
    : "absolute inset-0 z-0";

  const openDocOrBooking = useCallback((url: string, title?: string) => {
    const isPdf = url?.toLowerCase().endsWith('.pdf') || url?.includes('/pdfs/');
    const isFlipbook = /issuu\.com|calameo\.com/i.test(url || '');
    if (isPdf || isFlipbook) {
      setDocOverlayLoaded(false);
      setDocOverlay({ url, name: title || 'Document', type: isPdf ? 'pdf' : 'flipbook', ts: Date.now() });
    } else {
      setBookingOverlayLoaded(false);
      setBookingOverlayUrl(url);
      setShowBookingOverlay(true);
      setBookingOverlayTitle(title);
    }
  }, []);

  // Overlay state for ripple suppression
  const anyOverlay = showDirections || showBookingOverlay || !!docOverlay || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId || showPoiMapOverlay || !!activeVideoOverlay || isLightboxOpen || showMosaic || showYoutubeOverlay || !!availabilityOverlayCtx || !!serpApiOverlayCtx || showFallbackOverlay || !!externalOverlayActive;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background p-6 space-y-6">
        <Skeleton className="w-full aspect-video rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!business) return null;

  const destName = (d: Destination) => language === "en" && d.name_en ? d.name_en : d.name_fr;

  return (
    <div className="h-full overflow-visible overscroll-none bg-black relative">
      {/* Toolbar portals */}
      <ToolbarPortals
        business={business}
        images={images}
        showMosaic={showMosaic}
        setShowMosaic={setShowMosaic}
        youtubeVideoCount={youtubeVideoCount}
        allYoutubeVideos={allYoutubeVideos}
        setActiveYoutubeVideo={setActiveYoutubeVideo}
        setShowYoutubeOverlay={setShowYoutubeOverlay}
        setYoutubeIsPlaying={setYoutubeIsPlaying}
        serpApiOverlayCtxRef={serpApiOverlayCtxRef}
        activeBusinessId={activeBusinessId}
        propBusinessId={propBusinessId}
        setActiveBusinessId={setActiveBusinessId}
        setSerpApiOverlayCtx={setSerpApiOverlayCtx}
        selectedKpBusinessId={selectedKpBusinessId}
        selectedPoiBusinessId={selectedPoiBusinessId}
        anyOverlay={anyOverlay}
      />

      {/* Full-bleed background */}
      <div className={externalVideoBackgroundClass}>
        {effectiveMedia?.kind === "video" ? (
          videoInfo?.type === "file" ? (
             <video
              ref={videoRef}
              key={effectiveMedia.url}
              src={effectiveMedia.url}
              className={`w-full h-full bg-black ${isVerticalVideo ? "object-cover" : "object-contain"}`}
              autoPlay
              loop
              playsInline
              muted
              onPlay={() => {
                if (videoRef.current) {
                  const currentSrc = videoRef.current.currentSrc || videoRef.current.src || null;
                  if (keepMutedRef.current && muteLockSrcRef.current && currentSrc === muteLockSrcRef.current) {
                    videoRef.current.muted = true;
                    keepMutedRef.current = false;
                    muteLockSrcRef.current = null;
                  } else {
                    videoRef.current.muted = !(business?.default_sound_on ?? true);
                    keepMutedRef.current = false;
                    muteLockSrcRef.current = null;
                  }
                }
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setIsFileVideoVertical(v.videoHeight > v.videoWidth);
              }}
            />
          ) : (
            <div className={`w-full h-full overflow-hidden bg-black ${videoInfo?.type === "youtube" ? "relative" : ""}`}>
              {videoInfo?.type === "youtube" && !isVerticalVideo && !cardsHidden && (
                <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
              )}
              <iframe
                ref={iframeRef}
                key={effectiveMedia.url}
                src={videoInfo?.embedUrl}
                className={videoInfo?.type === "youtube"
                  ? isVerticalVideo
                    ? `w-full h-full ${cardsHidden ? '' : 'pointer-events-none'}`
                    : externalVideoInteractiveMode
                      ? "w-full h-full"
                      : `w-full h-[calc(100%+40px)] -mt-16 pointer-events-none`
                  : `w-full h-full ${cardsHidden ? '' : 'pointer-events-none'}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                frameBorder="0"
                style={{ border: 0 }}
              />
            </div>
          )
        ) : effectiveMedia?.kind === "matterport" ? (
          <iframe
            key={effectiveMedia.url}
            src={effectiveMedia.url + (effectiveMedia.url.includes('?') ? '&' : '?') + 'qs=0&hr=0&brand=0&help=0&gt=0&f=0&dh=0&title=0'}
            className="w-full h-full border-0"
            allow="xr-spatial-tracking"
            allowFullScreen
          />
        ) : effectiveMedia?.kind === "image" ? (
          <img src={effectiveMedia.url} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <CalendarCheck className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
        {effectiveMedia?.kind !== "video" && effectiveMedia?.kind !== "matterport" && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        )}
      </div>

      <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />

      {/* Overlaid content */}
      <div
        className={`relative z-10 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain h-full p-4 pt-14 md:p-6 md:pt-16 lg:pt-6 ${cardsHidden ? 'pb-0' : 'pb-8'} ${effectiveMedia?.kind === "matterport" ? "pointer-events-none" : externalVideoInteractiveMode ? "pointer-events-none" : ""}`}
        style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
        onTouchStart={externalVideoInteractiveMode ? undefined : onTouchStart}
        onTouchMove={externalVideoInteractiveMode ? undefined : onTouchMove}
        onTouchEnd={externalVideoInteractiveMode ? undefined : onTouchEnd}
      >

        {/* Top bar: toggle, flags, rating */}
        <div key={businessId + '-topbar'} className="relative z-40 overflow-visible flex flex-col items-center pb-5 md:pb-3 pointer-events-auto animate-[slide-in-top_0.35s_ease-out_both] mt-1 md:mt-0">
          {cardsHidden ? (
            <div className="w-full shrink-0 pointer-events-auto relative z-20">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-[32px] mb-2">
                <div className="min-w-0 flex items-center justify-start">
                  {languages.length > 0 && (
                    <div className={`flex items-center gap-0.5 md:gap-1.5 bg-black/40 backdrop-blur-sm rounded-full py-1.5 px-2 md:px-2.5 shrink-0 h-[32px] ${languages.length > 5 ? 'max-w-[7rem] md:max-w-none overflow-x-auto md:overflow-visible' : ''}`} style={languages.length > 5 ? { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties : undefined}>
                      {languages.map((lang, i) => {
                        const langAlt = getLangAlt(lang);
                        return (
                          <span key={i} className="group relative inline-flex items-center justify-center text-base md:text-lg leading-none cursor-help shrink-0" title={langAlt} aria-label={langAlt} role="img" tabIndex={0}>
                            {getLangFlag(lang)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-3 h-[32px] text-black shadow-lg backdrop-blur-sm hover:opacity-90 transition-colors"
                  style={{ backgroundColor: '#25D366' }}
                  title="Afficher les cartes"
                  aria-label="Afficher les cartes"
                  onClick={(e) => { e.stopPropagation(); showCards(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>Afficher</span>
                  <span className="hidden md:block h-1.5 w-8 rounded-full bg-black/60" />
                </button>
                <div className="min-w-0 flex items-center justify-end">
                  {avgOn20 !== null && avgOn20 > 0 && (
                    <div className="md:hidden flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full py-0.5 px-1.5">
                      <Star className="h-3 w-3 text-gold fill-gold" />
                      <span className="text-xs font-bold text-white">{avgOn20}</span>
                      <span className="text-[9px] text-white/60">/20</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <CardsToggleButton
              cardsHidden={cardsHidden}
              showCards={showCards}
              hideCards={hideCards}
              onMouseDownDrag={onMouseDownDrag}
              leftSlot={languages.length > 0 ? (
                <div className={`flex items-center gap-0.5 md:gap-1.5 bg-black/40 backdrop-blur-sm rounded-full py-1.5 px-2 md:px-2.5 shrink-0 h-[32px] ${languages.length > 5 ? 'max-w-[7rem] md:max-w-none overflow-x-auto md:overflow-visible' : ''}`} style={languages.length > 5 ? { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties : undefined}>
                  {languages.map((lang, i) => {
                    const langAlt = getLangAlt(lang);
                    return (
                      <span key={i} className="group relative inline-flex items-center justify-center text-base md:text-lg leading-none cursor-help shrink-0" title={langAlt} aria-label={langAlt} role="img" tabIndex={0}>
                        {getLangFlag(lang)}
                        <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:text-xs">
                          {langAlt}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : undefined}
              rightSlot={avgOn20 !== null && avgOn20 > 0 ? (
                <div className="md:hidden flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full py-0.5 px-1.5">
                  <Star className="h-3 w-3 text-gold fill-gold" />
                  <span className="text-xs font-bold text-white">{avgOn20}</span>
                  <span className="text-[9px] text-white/60">/20</span>
                </div>
              ) : undefined}
            />
          )}
        </div>

        {/* Block 1: Logo + name */}
        <div key={businessId} className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[4.5rem] md:h-[5.5rem] pointer-events-auto -mt-1 md:mt-0 animate-slide-in-right">
          <div
            className="absolute inset-0 flex items-center gap-4 px-4 md:px-6 transition-all duration-500 ease-in-out"
            style={{
              opacity: showHook && hookText ? 0 : 1,
              transform: showHook && hookText ? 'translateY(-8px)' : 'translateY(0)',
              pointerEvents: showHook && hookText ? 'none' : 'auto',
            }}
          >
            {business.logo_url && (
              <div
                className={`shrink-0 w-20 h-20 overflow-hidden hidden md:block ${business.logo_bg === 'transparent' ? '' : 'rounded-xl border-2 border-white/20 shadow-lg'}`}
                style={{ backgroundColor: business.logo_bg === 'transparent' ? 'transparent' : (business.logo_bg || '#fff') }}
              >
                <img src={business.logo_url} alt="" className={`w-full h-full object-contain ${business.logo_bg === 'transparent' ? '' : 'p-1'}`} />
              </div>
            )}
            <div className="min-w-0 flex-1 text-center md:text-left md:pr-28">
              <div className="flex items-start gap-2">
                <h2 className={`text-base md:text-xl font-bold uppercase min-w-0 flex-1 line-clamp-2 md:truncate`} style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>{business.name}</h2>
              </div>
              {(business.city || business.neighborhood || business.address) && (
                <p className={`text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center md:justify-start truncate${business.name.length > 18 ? ' hidden lg:flex' : ''}`}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {[business.city, business.neighborhood, business.address].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
          {hookText && (
            <div
              className="absolute inset-0 flex items-center justify-center px-6 transition-all duration-500 ease-in-out"
              style={{
                opacity: showHook ? 1 : 0,
                transform: showHook ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: showHook ? 'auto' : 'none',
              }}
            >
              <p className="text-sm md:text-lg text-white/90 text-center leading-relaxed md:pr-28" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>{hookText}</p>
            </div>
          )}
          {avgOn20 !== null && avgOn20 > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 hidden md:flex flex-col items-center ml-4 pl-4 border-l border-white/20">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-gold fill-gold" />
                <span className="text-lg font-bold text-white">{avgOn20}</span>
                <span className="text-xs text-white/60">/20</span>
              </div>
              {totalReviewCount > 0 && (
                <span className="text-[10px] text-white/60">{totalReviewCount.toLocaleString("fr-FR")} avis</span>
              )}
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${cardsHidden ? 'translate-x-full opacity-0 pointer-events-none max-h-0 overflow-hidden' : 'translate-x-0 opacity-100'}`}
        >
        {/* Info Carousel */}
        <div ref={infoCarouselRef} className="shrink-0 w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pr-0 pb-1 scrollbar-hide snap-x snap-mandatory mt-3 pointer-events-auto animate-slide-in-left">
          <div className="flex w-max gap-2 items-start">
            <div className="snap-start shrink-0 w-2 md:w-4" aria-hidden="true" />
            {woDescription && (
              <div className={`snap-start shrink-0 w-[20rem] md:w-[30rem] h-[15em] md:h-[20em] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white overflow-y-auto animate-slide-in-left opacity-0 border border-white/10`}
                  style={{ animationFillMode: 'forwards' }}
                >
                  <div
                    className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings card1-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-gold [&_h2]:!font-bold [&_h3]:!font-bold"
                    dangerouslySetInnerHTML={{ __html: woDescription }}
                  />
                </div>
              )}
              {hasContactCard && (
                <ContactFlipCard
                  business={business}
                  language={language}
                  hasOpeningHours={!!hasOpeningHours}
                  tallHeight={false}
                  animationDelay={woDescription ? "120ms" : "0ms"}
                  hasHotelMapping={isHotelWithPrice}
                  isSearchingAvailability={hotelSearchLoading}
                  onCheckAvailability={handleCheckAvailability}
                  openBadgeInfo={openBadgeInfo}
                  onOpenWebsite={(url) => {
                    setBookingOverlayLoaded(false);
                    setBookingOverlayUrl(url);
                    setBookingOverlayTitle(language === "en" ? "Website" : "Site web");
                    setShowBookingOverlay(true);
                  }}
                />
              )}
              {showGoogleMap && business && (business.latitude || business.google_maps_url) && (
                <MapCard
                  latitude={business.latitude}
                  longitude={business.longitude}
                  googleMapsUrl={business.google_maps_url}
                  businessName={business.name}
                  tallHeight={false}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                  onClick={() => {
                    if (business?.city && destinations.length >= 2) setPoiMapMode("destinations");
                    setShowPoiMapOverlay(true);
                  }}
                />
              )}
              {menuSummaries.length > 0 && (
                <MenuSummaryCard
                  summaries={menuSummaries}
                  language={language}
                  tallHeight={false}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                  categoryIcon={categoryIcon}
                />
              )}
              {hasReviewsCard && (
                <ReviewsFlipCard
                  avgOn20={avgOn20!}
                  totalReviewCount={totalReviewCount}
                  platforms={reviewPlatforms}
                  reviewTexts={reviewTexts}
                  language={language}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0)) * 120}ms`}
                />
              )}
              {externalLinks.length > 0 && (
                <ExternalLinksFlipCard
                  links={externalLinks}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(hasReviewsCard)) * 120}ms`}
                  onOpenUrl={(url, linkTitle) => openDocOrBooking(url, linkTitle)}
                />
              )}
              {business && (
                <SocialLinksCard
                  facebook={business.facebook_url}
                  instagram={business.instagram_url}
                  tiktok={business.tiktok_url}
                  youtube={business.youtube_url}
                  twitter={business.twitter_url}
                  linkedin={business.linkedin_url}
                  pinterest={business.pinterest_url}
                  vimeo={business.vimeo_url}
                  whatsapp={business.whatsapp}
                  snapchat={business.snapchat_url}
                  menuItems={menuDocs}
                  language={language}
                  onOpenUrl={(url, title) => openDocOrBooking(url, title)}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(hasReviewsCard) + Number(externalLinks.length > 0)) * 120}ms`}
                />
              )}
              <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Tabs bar */}
        <div className={`shrink-0 overflow-x-auto scrollbar-hide pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 pt-2 md:pt-3 pb-1 ${isLoading ? "invisible" : ""}`}>
          <div className="flex gap-1 w-max">
            <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
            {bottomTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleBottomTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-full transition-colors border border-transparent ${tab.id === "videos" ? "max-w-[220px] truncate md:max-w-none md:overflow-visible md:text-clip whitespace-nowrap" : "whitespace-nowrap"} ${
                  activeBottomTab === tab.id
                    ? "bg-black text-white"
                    : tab.id === "youtube"
                      ? "bg-[#FF0000] text-white hover:bg-[#CC0000]"
                      : "bg-white/70 text-black hover:bg-white/80"
                } ${!tab.hasContent ? "opacity-50" : ""}`}
                style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '11px', lineHeight: '16px', padding: '6px 12px' }}
              >
                {tab.label}
              </button>
            ))}
            <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Tab content */}
        <div className="shrink-0 h-[9.5rem] md:h-[12.5rem] lg:h-[17.5rem] animate-slide-in-left">
        {/* Videos tab */}
        {activeBottomTab === "videos" && hasVideosCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {videoDocs.map((vid, index) => {
                const ytMatch = vid.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
                const vimeoMatch = vid.url.match(/vimeo\.com\/(\d+)/);
                const ytThumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null;
                const vimeoThumb = vimeoMatch ? `https://vumbnail.com/${vimeoMatch[1]}.jpg` : null;
                const isFile = !ytMatch && !vimeoMatch;
                const isNosOffres = business?.carousel_badge === "Nos offres";
                const imgH = isNosOffres ? "h-[7rem] md:h-[10rem] lg:h-[15rem]" : "h-[8.5rem] md:h-[11.5rem] lg:h-[16.5rem]";
                return (
                  <div
                    key={`vid-${index}`}
                    className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setActiveVideoOverlay({ url: vid.url, name: vid.name, description: vid.description })}
                  >
                  <div className="relative">
                      {vid.thumbnail_url ? (
                        <img src={vid.thumbnail_url} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : ytThumb ? (
                        <img src={ytThumb} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : vimeoThumb ? (
                        <img src={vimeoThumb} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : (
                        <div className={`w-full ${imgH} bg-white/10 flex items-center justify-center`}>
                          <span className="text-2xl">▶</span>
                        </div>
                      )}
                      {vid.price && (
                        <div className="absolute top-1 inset-x-0 flex justify-center">
                          <span className="bg-gold text-black text-[10px] font-semibold rounded px-2 py-0.5 backdrop-blur-sm">
                            Prix: {vid.price}
                          </span>
                        </div>
                      )}
                    </div>
                    {business?.carousel_badge === "Nos offres" && !vid.is_poi_linked && (
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        {vid.name || vid.city || `Vidéo ${index + 1}`}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="shrink-0 w-6" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* YouTube tab */}
        {business?.youtube_url && business?.show_youtube_tab && (
          <div className={`pointer-events-auto -mr-4 md:-mr-6 mt-2 ${activeBottomTab !== "youtube" ? "hidden" : ""}`}>
            <YouTubeShortsCarousel
              youtubeUrl={business.youtube_url}
              onVideoCount={setYoutubeVideoCount}
              onVideosLoaded={setAllYoutubeVideos}
              onPlayingChange={setYoutubeIsPlaying}
              onSelectVideo={(v) => { setActiveYoutubeVideo(v); if (v) setShowYoutubeOverlay(true); }}
              activeVideoId={activeYoutubeVideo?.videoId ?? null}
              shortsOnly
              hideLabel
              hideHeader
              size="match-tabs"
            />
          </div>
        )}

        {/* Destinations tab */}
        {activeBottomTab === "dest" && hasDestCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {destinations.map((dest, index) => {
                const destImg = dest.images?.filter(Boolean)?.[0] || dest.image_url;
                return (
                  <div key={dest.id} className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setSelectedDestinationId(dest.id)}
                  >
                    {destImg ? (
                      <img src={destImg} alt={destName(dest)} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                    ) : (
                      <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">{destName(dest)}</p>
                  </div>
                );
              })}
              {business?.city && destinations.length >= 2 && (
                <div className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${destinations.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
                  onClick={() => { setPoiMapMode("destinations"); setShowPoiMapOverlay(true); }}
                >
                  <img src={poiNearbyImg} alt="Destinations" className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                  <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                    {language === "en" ? "Where are you going?" : "Où allez-vous ?"}
                  </p>
                </div>
              )}
              <div className="shrink-0 w-6" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* POI tab */}
        {activeBottomTab === "poi" && hasPoiCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {poiBusinesses.map((poi, index) => {
                const poiImg = poi.images?.filter(Boolean)?.[0] || (poi as any).logo_url;
                return (
                  <div key={poi.id} className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setSelectedPoiBusinessId(poi.id)}
                  >
                    {poiImg ? (
                      <img src={poiImg} alt={poi.name} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                    ) : (
                      <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">{poi.name}</p>
                  </div>
                );
              })}
              {business?.latitude && business?.longitude && (
                <div className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${poiBusinesses.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
                  onClick={() => setShowPoiMapOverlay(true)}
                >
                  <img src={poiNearbyImg} alt="Points d'intérêt" className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                  <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                    {language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité"}
                  </p>
                </div>
              )}
              <div className="shrink-0 w-6" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* KP Subcategory tab */}
        {activeBottomTab === "kp_subcat" && hasKpSubcatCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {kpSubcategoryItems.map((rel, index) => {
                const relImg = rel.images?.filter(Boolean)?.[0] || rel.logo_url;
                return (
                  <div key={rel.id} className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setSelectedKpBusinessId(rel.id)}
                  >
                    {relImg ? (
                      <img src={relImg} alt={rel.name} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                    ) : (
                      <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                      {rel.is_master && <span className="text-gold mr-1">★</span>}
                      {rel.name}
                    </p>
                  </div>
                );
              })}
              {(poiBusinesses.length > 0 || nearbyFallback.length > 0) && business?.latitude && business?.longitude && (
                <div className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${kpSubcategoryItems.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
                  onClick={() => setShowPoiMapOverlay(true)}
                >
                  <img src={poiNearbyImg} alt="Points d'intérêt" className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                  <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                    {poiBusinesses.length > 0
                      ? (language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité")
                      : (language === "en" ? "Nearby establishments" : "Établissements à proximité")}
                  </p>
                </div>
              )}
              <div className="shrink-0 w-6" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* KP tab */}
        {activeBottomTab === "kp" && hasKpCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {kpRelated.map((rel, index) => {
                const relImg = rel.images?.filter(Boolean)?.[0] || rel.logo_url;
                return (
                  <div key={rel.id} className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setSelectedKpBusinessId(rel.id)}
                  >
                    {relImg ? (
                      <img src={relImg} alt={rel.name} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                    ) : (
                      <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                      {rel.is_master && <span className="text-gold mr-1">★</span>}
                      {rel.name}
                    </p>
                  </div>
                );
              })}
              {(poiBusinesses.length > 0 || nearbyFallback.length > 0) && business?.latitude && business?.longitude && (
                <div className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${kpRelated.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
                  onClick={() => setShowPoiMapOverlay(true)}
                >
                  <img src={poiNearbyImg} alt="Points d'intérêt" className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                  <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                    {poiBusinesses.length > 0
                      ? (language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité")
                      : (language === "en" ? "Nearby establishments" : "Établissements à proximité")}
                  </p>
                </div>
              )}
              <div className="shrink-0 w-6" aria-hidden="true" />
            </div>
          </div>
        )}
        </div>
        </div>

        {/* Availability result (cards hidden mode) */}
        <HotelAvailabilityResult
          business={business}
          language={language}
          cardsHidden={cardsHidden}
          effectiveMedia={effectiveMedia}
          externalVideoInteractiveMode={externalVideoInteractiveMode}
          hotelSearchLoading={hotelSearchLoading}
          fallbackPanelData={fallbackPanelData}
          showGoogleMap={showGoogleMap}
          showCards={showCards}
          setShowDirections={setShowDirections}
          setShowFallbackOverlay={setShowFallbackOverlay}
          setShowBookingOverlay={setShowBookingOverlay}
          setBookingOverlayLoaded={setBookingOverlayLoaded}
          setBookingOverlayUrl={setBookingOverlayUrl}
          setBookingOverlayTitle={setBookingOverlayTitle}
        />

        {/* CTA Bar */}
        <CtaBar
          business={business}
          language={language}
          cardsHidden={cardsHidden}
          showSearchBar={showSearchBar}
          showGoogleMap={showGoogleMap}
          externalVideoInteractiveMode={externalVideoInteractiveMode}
          effectiveMedia={effectiveMedia}
          bookingCta={bookingCta}
          shopCta={shopCta}
          bookingCtaLabel={bookingCtaLabel}
          shopCtaLabel={shopCtaLabel}
          fallbackPanelData={fallbackPanelData}
          logoBigOverlay={logoBigOverlay}
          logoBigFadingOut={logoBigFadingOut}
          currentMediaIndex={currentMediaIndex}
          videoDocs={videoDocs}
          businessId={businessId}
          currentMediaUrl={effectiveMedia?.url}
          currentMediaKind={effectiveMedia?.kind}
          videoInfo={videoInfo}
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>}
          videoPaused={videoPaused}
          videoMuted={videoMuted}
          ytBgPlaying={ytBgPlaying}
          ytBgMuted={ytBgMuted}
          setYtBgPlaying={setYtBgPlaying}
          setYtBgMuted={setYtBgMuted}
          setShowDirections={setShowDirections}
          setShowBookingOverlay={setShowBookingOverlay}
          setBookingOverlayLoaded={setBookingOverlayLoaded}
          setBookingOverlayUrl={setBookingOverlayUrl}
          setBookingOverlayTitle={setBookingOverlayTitle}
          setActiveBusinessId={setActiveBusinessId}
        />
      </div>

      {/* YouTube Overlay */}
      {showYoutubeOverlay && (
        <YouTubeOverlay
          business={business}
          activeVideo={activeYoutubeVideo}
          onSelectVideo={setActiveYoutubeVideo}
          onPlayingChange={setYoutubeIsPlaying}
          onClose={() => { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); setYoutubeIsPlaying(false); }}
        />
      )}

      {/* Video Document Overlay */}
      {activeVideoOverlay && (
        <VideoDocumentOverlay
          activeVideo={activeVideoOverlay}
          videoDocs={videoDocs}
          closing={videoOverlayClosing}
          defaultSoundOn={business?.default_sound_on ?? true}
          businessId={businessId}
          businessName={business?.name}
          onClose={() => setVideoOverlayClosing(true)}
          onNavigate={(v) => setActiveVideoOverlay(v)}
          onAnimationEnd={() => { setActiveVideoOverlay(null); setVideoOverlayClosing(false); }}
          onOwnerClick={(ownerId) => { setVideoOverlayClosing(true); setTimeout(() => setActiveBusinessId(ownerId), 300); }}
        />
      )}

      {/* Booking Overlay */}
      {showBookingOverlay && (bookingOverlayUrl || bookUrl) && (() => {
        const overlayUrl = bookingOverlayUrl || bookUrl!;
        const finalUrl = overlayUrl.startsWith("http") ? overlayUrl : `https://${overlayUrl}`;
        return (
          <BookingOverlay
            bookingUrl={finalUrl}
            title={bookingOverlayUrl ? bookingOverlayTitle : undefined}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setBookingOverlayLoaded(false); }}
            whatsapp={business?.whatsapp}
            phone={business?.phone}
            onLoad={() => setBookingOverlayLoaded(true)}
          />
        );
      })()}

      {/* Document Overlay */}
      {docOverlay && (
        <DocumentOverlay
          url={docOverlay.url}
          name={docOverlay.name}
          type={docOverlay.type}
          ts={docOverlay.ts}
          onClose={() => { setDocOverlay(null); setDocOverlayLoaded(false); }}
          onLoad={() => setDocOverlayLoaded(true)}
        />
      )}

      {/* Directions Overlay */}
      {showDirections && business && (
        <div
          className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[80] bg-background"
          style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}
        >
          <DirectionsOverlay business={business} onClose={() => setShowDirections(false)} />
        </div>
      )}

      {/* Destination detail overlay */}
      {selectedDestinationId && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[70] animate-slide-up-from-bottom bg-background">
          <DestinationSlidePanel
            destinationId={selectedDestinationId}
            onClose={() => setSelectedDestinationId(null)}
            slideFrom="bottom"
            interceptCloseRef={destInterceptCloseRef}
            showSearchBar={showSearchBar}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
          />
        </div>
      )}

      {/* POI business detail overlay */}
      {selectedPoiBusinessId && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-[70] animate-slide-up-from-bottom bg-background">
          <BookOnlineSlidePanel
            businessId={selectedPoiBusinessId}
            onClose={() => { setSelectedPoiBusinessId(null); onMosaicStateChange?.(false); if (poiOpenedFromMapRef.current) poiOpenedFromMapRef.current = false; }}
            showSearchBar={showSearchBar}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
            onMosaicStateChange={onMosaicStateChange}
            propagateMosaicState
          />
        </div>
      )}

      {/* KP business detail overlay */}
      {selectedKpBusinessId && (
         <div className="absolute top-0 left-0 right-0 bottom-0 z-[70] animate-slide-up-from-bottom bg-background">
          <BookOnlineSlidePanel
            businessId={selectedKpBusinessId}
            onClose={() => { setSelectedKpBusinessId(null); onMosaicStateChange?.(false); }}
            showSearchBar={showSearchBar}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
            onMosaicStateChange={onMosaicStateChange}
            propagateMosaicState
          />
        </div>
      )}

      {showPoiMapOverlay && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[80] bg-background flex flex-col" style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}>
          <div className="shrink-0 flex items-center px-4 py-2 border-b bg-background gap-2">
            <button
              onClick={() => { setShowPoiMapOverlay(false); setPoiMapMode("poi"); }}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium truncate">
              {poiMapMode === "destinations"
                ? (language === "en" ? "Where are you going?" : "Où allez-vous ?")
                : poiBusinesses.length > 0
                  ? (language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité")
                  : (language === "en" ? "Nearby establishments" : "Établissements à proximité")}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <PoiGoogleMap
              pois={poiMapMode === "destinations"
                ? [
                    ...(business?.latitude && business?.longitude ? [{
                      id: `self-${business.id}`, name: business.name,
                      latitude: business.latitude, longitude: business.longitude,
                      images: business.images, city: business.city, neighborhood: business.neighborhood,
                      markerColor: { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" },
                    } as PoiMapItem] : []),
                    ...destinations.filter(d => d.latitude && d.longitude).map(d => ({
                      id: d.id, name: d.name_fr, latitude: d.latitude!, longitude: d.longitude!,
                      images: (d.images && d.images.length > 0) ? d.images : (d.image_url ? [d.image_url] : null),
                      city: null, neighborhood: null,
                    } as PoiMapItem)),
                  ]
                : [
                    ...(business?.latitude && business?.longitude ? [{
                      id: `self-${business.id}`, name: business.name,
                      latitude: business.latitude, longitude: business.longitude,
                      images: business.images, city: business.city, neighborhood: business.neighborhood,
                      markerColor: { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" },
                    } as PoiMapItem] : []),
                    ...((poiBusinesses.length > 0 ? poiBusinesses : nearbyFallback).map(p => ({
                      id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude,
                      images: p.images, city: p.city, neighborhood: p.neighborhood,
                    } as PoiMapItem))),
                  ]
              }
              selectedPoiId={null}
              center={business?.latitude && business?.longitude ? { lat: business.latitude, lng: business.longitude } : undefined}
              onPoiClick={(poiId) => {
                if (poiId.startsWith("self-")) return;
                if (poiMapMode === "destinations") {
                  setSelectedDestinationId(poiId);
                } else if (poiBusinesses.length > 0) {
                  poiOpenedFromMapRef.current = true;
                  setSelectedPoiBusinessId(poiId);
                } else {
                  setSelectedKpBusinessId(poiId);
                }
              }}
              fitToMarkers
            />
          </div>
        </div>
      )}

      {/* Mosaic overlay */}
      {showMosaic && (
        <MosaicOverlay
          mediaItems={mediaItems}
          coverParentToolbar={!propagateMosaicState}
          onClose={() => setShowMosaic(false)}
          onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
        />
      )}

      {/* Fullscreen media lightbox */}
      {isLightboxOpen && totalMedia > 0 && (
        <FullscreenLightbox
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      {/* Hotel Availability overlay */}
      {availabilityOverlayCtx && (
        <HotelAvailabilityOverlay
          liteApiHotelId={availabilityOverlayCtx.liteApiHotelId}
          businessName={availabilityOverlayCtx.businessName}
          businessCity={availabilityOverlayCtx.businessCity}
          backgroundImage={availabilityOverlayCtx.backgroundImage}
          onClose={() => setAvailabilityOverlayCtx(null)}
          onSelectBusiness={(id) => setActiveBusinessId(id)}
          onOpenFallbackPanel={(data) => {
            const isMobileOrTablet = typeof window !== "undefined" && window.innerWidth < 1024;
            if (isMobileOrTablet) setShowTransitionOverlay(true);
            setFallbackPanelData(data);
            setSelectedFallbackHotelId(null);
            setFallbackHiddenOnMobile(false);
            setAvailabilityOverlayCtx(null);
          }}
        />
      )}

      {/* SerpAPI Hotel overlay */}
      {serpApiOverlayCtx && (
        <SerpApiHotelOverlay
          currentBusinessId={businessId}
          serpCity={serpApiOverlayCtx.serpCity}
          businessName={serpApiOverlayCtx.businessName}
          reserveNowUrl={serpApiOverlayCtx.reserveNowUrl}
          onClose={() => setSerpApiOverlayCtx(null)}
          onOpenFallbackPanel={(panelData) => {
            const isMobileOrTablet = typeof window !== "undefined" && window.innerWidth < 1024;
            if (isMobileOrTablet) setShowTransitionOverlay(true);
            setFallbackPanelData(panelData);
            setSelectedFallbackHotelId(null);
            setFallbackHiddenOnMobile(false);
            setSerpApiOverlayCtx(null);
          }}
        />
      )}

      {/* Mobile transition overlay */}
      {showTransitionOverlay && createPortal(
        <div className="fixed inset-0 z-[215] bg-black lg:hidden animate-fade-in" />,
        document.body
      )}

      {/* Fallback hotels overlay */}
      {fallbackPanelData && showFallbackOverlay && (
        <div className="absolute inset-0 -top-[3.3rem] z-[76] overflow-hidden">
          <div className="w-full h-full bg-white overflow-y-auto animate-slide-in-left">
          <FallbackHotelsPanel
            data={fallbackPanelData}
            selectedHotelId={selectedFallbackHotelId}
            onClose={() => setShowFallbackOverlay(false)}
            onSelectHotel={(hotelId, businessId) => {
              if (businessId) {
                if (window.innerWidth < 1024) setShowTransitionOverlay(true);
                setSelectedFallbackHotelId(hotelId);
                setActiveBusinessId(businessId);
                setCameFromFallback(true);
                setShowFallbackOverlay(false);
              }
            }}
            inline
          />
          </div>
        </div>
      )}

      {/* Search bar */}
      {showSearchBar && (
        <PanelSearchBar
          onSearch={onSearch}
          onBusinessSelect={onSearchBusinessSelect}
          businessCity={business?.city}
          businessCategory={business?.main_category}
          businessName={business?.name}
          onOverlayChange={setSearchOverlayActive}
          darkBackground={docOverlayLoaded || bookingOverlayLoaded}
          closeTrigger={closeTrigger}
        />
      )}

    </div>
  );
};

export default BookOnlineSlidePanel;
