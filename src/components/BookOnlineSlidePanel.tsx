import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DesktopMediaArrows, CardsToggleButton, useOwnerLogo } from "@/components/CardsVisibilityToggle";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import { createPortal } from "react-dom";
import { MapPin, ChevronUp, ChevronLeft, ChevronRight, X, CalendarCheck, Star, Loader2, Expand, Plus, Image as ImageIcon, Sparkles, Newspaper, ExternalLink, MessageCircle } from "lucide-react";
import VideoControls from "@/components/VideoControls";
import DynamicIcon from "@/components/DynamicIcon";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import { supabase } from "@/integrations/supabase/client";

import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import { playWoosh } from "@/lib/overlayConstants";
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
import AppStoreCard from "@/components/cards/AppStoreCard";
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
  const [bookingOverlayHideContact, setBookingOverlayHideContact] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedPoiBusinessId, setSelectedPoiBusinessId] = useState<string | null>(null);
  const [selectedKpBusinessId, setSelectedKpBusinessId] = useState<string | null>(null);
  const [showPoiMapOverlay, setShowPoiMapOverlay] = useState(false);
  const [poiMapMode, setPoiMapMode] = useState<"poi" | "destinations">("poi");
  const poiOpenedFromMapRef = useRef(false);
  
  
  const [showDescriptionOverlay, setShowDescriptionOverlay] = useState(false);
  const [descOverlayDirect, setDescOverlayDirect] = useState(false);
  const [descGridMode, setDescGridMode] = useState(false);
   const [descGridPage, setDescGridPage] = useState(0);
   const [sidebarOpenGroup, setSidebarOpenGroup] = useState<string | null>(null);
   const [descOverlayContent, setDescOverlayContent] = useState<{ html: string; title: string; priceDetails?: string | null; avgPriceRange?: unknown } | null>(null);
  const [activeVideoOverlay, setActiveVideoOverlay] = useState<{ url: string; name: string | null; description: string | null } | null>(null);
  const [videoOverlayClosing, setVideoOverlayClosing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showExtLinksOverlay, setShowExtLinksOverlay] = useState(false);
  const [extLinksOrigin, setExtLinksOrigin] = useState<'carousel' | 'description'>('carousel');
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
  const [ytBgMuted, setYtBgMuted] = useState(true);
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
    setYtBgMuted(true);
    setShowHook(false);
    setYoutubeVideoCount(null);
    setActiveYoutubeVideo(null);
    setYoutubeIsPlaying(false);
    setShowYoutubeOverlay(false);
    setActiveVideoOverlay(null);
    setVideoOverlayClosing(false);
    setShowPoiMapOverlay(false);
    setShowDescriptionOverlay(false);
    setDescGridMode(false);
    setDescOverlayContent(null);
    setShowExtLinksOverlay(false);
    setPoiMapMode("poi");
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

  /** Scroll the info carousel so that `el` is horizontally centered in the visible panel area */
  const centerCardInCarousel = (el: HTMLElement) => {
    const container = infoCarouselRef.current;
    if (!container) return;
    // The container has negative margins (-ml-4 = 16px on mobile, -ml-6 = 24px on desktop)
    // so the visible panel center is offset from the container's left edge
    const style = getComputedStyle(container);
    const marginLeft = Math.abs(parseFloat(style.marginLeft) || 0);
    const panelVisibleWidth = container.clientWidth - marginLeft;
    const cardCenter = el.offsetLeft + el.offsetWidth / 2;
    const targetScroll = cardCenter - marginLeft - panelVisibleWidth / 2;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);


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
    const overlayOpen = showDirections || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId || !!docOverlay || showBookingOverlay || showYoutubeOverlay || showMosaic || !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay || showFallbackOverlay || searchOverlayActive || showDescriptionOverlay;

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
  }, [showDirections, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId, docOverlay, showBookingOverlay, showYoutubeOverlay, showMosaic, externalOverlayActive, showPoiMapOverlay, activeVideoOverlay, showFallbackOverlay, searchOverlayActive, showDescriptionOverlay]);


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

  const hasContactCard = !!(hasOpeningHours && !business?.is_open_24h) || !!isHotelWithPrice;
  const hasReviewsCard = avgOn20 !== null && avgOn20 > 0;

  const handleOpenReviews = useCallback(async () => {
    if (!hasReviewsCard) return;
    const buildReviewHtml = (texts: typeof reviewTexts, translated?: string[]) => {
      const platformsHtml = reviewPlatforms
        .filter(p => p.rating && p.count)
        .map(p => `<p><strong>${p.name}</strong> — ${p.rating}/5 (${p.count} ${language === "en" ? "reviews" : "avis"})</p>`)
        .join("");
      const textsHtml = texts.length > 0
        ? "<hr/>" + texts.slice(0, 10).map((r, i) => {
          const displayText = translated?.[i] || r.text || "";
          return `<blockquote><p>${displayText}</p><footer>— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
        }).join("")
        : "";
      return platformsHtml + textsHtml;
    };
    const title = language === "en" ? `Customer reviews (${totalReviewCount})` : `Avis clients (${totalReviewCount})`;
    setDescOverlayContent({ html: buildReviewHtml(reviewTexts), title });
    setDescGridMode(false);
    setDescOverlayDirect(true);
    setShowDescriptionOverlay(true);
    const targetLang = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
    const needsTranslation = reviewTexts.some(r => r.language && r.language !== targetLang);
    if (needsTranslation && reviewTexts.some(r => r.text)) {
      try {
        const { data, error } = await supabase.functions.invoke("translate-reviews", {
          body: { reviews: reviewTexts.filter(r => r.text).map(r => ({ text: r.text })), targetLanguage: targetLang },
        });
        if (!error && data?.translations?.length) {
          setDescOverlayContent({ html: buildReviewHtml(reviewTexts, data.translations), title });
        }
      } catch (e) { console.error("Translation error:", e); }
    }
  }, [hasReviewsCard, reviewPlatforms, reviewTexts, totalReviewCount, language]);

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
    const base = getVideoEmbed(effectiveMedia.url, window.location.origin, { background: true, defaultSoundOn: false });
    if (base.type === "youtube") {
      return { ...base, embedUrl: base.embedUrl.replace(/controls=0/, "controls=1").replace(/disablekb=1/, "disablekb=0") };
    }
    return base;
  }, [effectiveMedia?.kind, effectiveMedia?.url, business?.default_sound_on]);

  const [isFileVideoVertical, setIsFileVideoVertical] = useState(false);
  const [isFileVideoSquare, setIsFileVideoSquare] = useState(false);
  const isVerticalVideo = videoInfo ? (videoInfo.type === "file" ? isFileVideoVertical : videoInfo.isVertical) : false;
  const isSquareVideo = videoInfo?.type === "file" && isFileVideoSquare;
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

  const normalizeCtaMode = (value: string | null | undefined) => {
    if (!value) return null;

    const normalizedValue = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " ")
      .replace(/[\s/-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return normalizedValue || null;
  };

  const isAppStoreCta = (ctaKey: string | null | undefined, presentationMode: string | null | undefined) => {
    const raw = ctaKey || presentationMode;
    if (!raw) return false;
    const n = raw.toLowerCase().replace(/[\s_-]+/g, '');
    return n === 'appstore' || n === 'googleplay';
  };

  const resolveCtaLabel = (
    preferredValue: string | null | undefined,
    fallbackValue: string | null | undefined,
    defaultKey: keyof typeof CTA_MODE_LABELS,
  ) => {
    // Custom label always wins
    if (preferredValue) return preferredValue;
    // Fallback to presentation mode mapping
    if (fallbackValue) {
      const match = CTA_MODE_LABELS[fallbackValue] || CTA_MODE_LABELS[normalizeCtaMode(fallbackValue) || ""];
      if (match) return language === 'en' ? match.en : match.fr;
    }
    const pair = CTA_MODE_LABELS[defaultKey];
    return language === 'en' ? pair.en : pair.fr;
  };

  const bookingCtaLabel = resolveCtaLabel(
    (business as any)?.reserve_now_cta,
    business?.presentation_mode,
    'reserver_en_ligne',
  );

  const shopCtaLabel = resolveCtaLabel(
    (business as any)?.online_shop_cta,
    (business as any)?.online_shop_presentation_mode,
    'acheter_en_ligne',
  );

  const url4Cta = useMemo(() => {
    const url = (business as any)?.url_4;
    if (!url) return null;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    return { fullUrl, forceExternal: (business as any)?.url_4_force_external };
  }, [(business as any)?.url_4, (business as any)?.url_4_force_external]);

  const url4CtaLabel = resolveCtaLabel(
    (business as any)?.url_4_cta,
    (business as any)?.url_4_presentation_mode,
    'acheter_en_ligne',
  );

  const url5Cta = useMemo(() => {
    const url = (business as any)?.url_5;
    if (!url) return null;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    return { fullUrl, forceExternal: (business as any)?.url_5_force_external };
  }, [(business as any)?.url_5, (business as any)?.url_5_force_external]);

  const url5CtaLabel = resolveCtaLabel(
    (business as any)?.url_5_cta,
    (business as any)?.url_5_presentation_mode,
    'acheter_en_ligne',
  );

  const appStoreLinks = useMemo(() => {
    const links: { type: "app_store" | "google_play"; url: string }[] = [];
    const seen = new Set<string>();
    const normalize = (v: string | null | undefined): "app_store" | "google_play" | null => {
      if (!v) return null;
      const lower = v.toLowerCase().replace(/[\s_-]+/g, '');
      if (lower === 'appstore') return 'app_store';
      if (lower === 'googleplay') return 'google_play';
      return null;
    };
    const checks = [
      { key: business?.presentation_mode, url: business?.website },
      { key: (business as any)?.reserve_now_cta || business?.presentation_mode, url: business?.reserve_now_url },
      { key: (business as any)?.online_shop_cta || (business as any)?.online_shop_presentation_mode, url: business?.online_shop_url },
      { key: (business as any)?.url_4_cta || (business as any)?.url_4_presentation_mode, url: (business as any)?.url_4 },
      { key: (business as any)?.url_5_cta || (business as any)?.url_5_presentation_mode, url: (business as any)?.url_5 },
    ];
    for (const c of checks) {
      if (!c.url || !c.key) continue;
      const type = normalize(c.key);
      if (type && !seen.has(type)) {
        seen.add(type);
        const fullUrl = c.url.startsWith("http") ? c.url : `https://${c.url}`;
        links.push({ type, url: fullUrl });
      }
    }
    return links;
  }, [business]);

  const hasBottomActionCtas = !!bookingCta || !!shopCta || !!url4Cta || !!url5Cta || (!cardsHidden && showGoogleMap && business?.latitude && business?.longitude);
  const externalVideoBackgroundClass = externalVideoInteractiveMode && showSearchBar
    ? `absolute inset-x-0 top-0 ${hasBottomActionCtas ? 'bottom-[160px]' : 'bottom-[88px]'} z-0`
    : "absolute inset-0 z-0";

  const openDocOrBooking = useCallback((url: string, title?: string, hideContact?: boolean) => {
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
      setBookingOverlayHideContact(!!hideContact);
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
              className={`w-full h-full bg-black ${(isVerticalVideo || isSquareVideo) ? "object-cover" : "object-contain"}`}
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
                    videoRef.current.muted = true;
                    keepMutedRef.current = false;
                    muteLockSrcRef.current = null;
                  }
                }
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                 const ratio = v.videoWidth > 0 ? v.videoHeight / v.videoWidth : 1;
                 setIsFileVideoVertical(v.videoHeight > v.videoWidth);
                 setIsFileVideoSquare(ratio >= 0.9 && ratio <= 1.1);
              }}
            />
          ) : (
            <div className={`w-full h-full overflow-hidden bg-black ${videoInfo?.type === "youtube" ? "relative" : ""}`}>
              {videoInfo?.type === "youtube" && !isVerticalVideo && (
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
                      ? "w-full h-[calc(100%+40px)] -mt-16"
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
        {!business?.hide_description && (
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
                    <div className="md:hidden flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full py-0.5 px-1.5 cursor-pointer" onClick={handleOpenReviews}>
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
                <div className="md:hidden flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full py-0.5 px-1.5 cursor-pointer" onClick={handleOpenReviews}>
                  <Star className="h-3 w-3 text-gold fill-gold" />
                  <span className="text-xs font-bold text-white">{avgOn20}</span>
                  <span className="text-[9px] text-white/60">/20</span>
                </div>
              ) : undefined}
            />
          )}
        </div>
        )}

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
            {business.logo_url && business.id === businessId && (
              <div
                className={`shrink-0 w-20 h-20 overflow-hidden hidden md:block ${business.logo_bg === 'transparent' ? '' : 'rounded-xl border-2 border-white/20 shadow-lg'}`}
                style={{ backgroundColor: business.logo_bg === 'transparent' ? 'transparent' : (business.logo_bg || '#fff') }}
              >
                <img src={business.logo_url} alt="" className={`w-full h-full object-contain ${business.logo_bg === 'transparent' ? '' : 'p-1'}`} />
              </div>
            )}
            <div className={`min-w-0 flex-1 text-center md:text-left ${hasReviewsCard ? 'md:pr-28' : ''}`}>
              <div className="flex items-start gap-2">
                <h2 className={`text-base md:text-xl font-bold uppercase min-w-0 flex-1 ${hasReviewsCard ? 'line-clamp-2 md:truncate' : 'line-clamp-3 md:line-clamp-2'}`} style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>{business.name}</h2>
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
              <p className={`text-sm md:text-lg text-white/90 text-center leading-relaxed ${hasReviewsCard ? 'md:pr-28' : ''}`} style={{ fontFamily: "'Josefin Sans', sans-serif" }}>{hookText}</p>
            </div>
          )}
          {avgOn20 !== null && avgOn20 > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 hidden md:flex flex-col items-center ml-4 pl-4 border-l border-white/20 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleOpenReviews}>
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
          <div className="flex w-max gap-2 items-start min-h-[15em] md:min-h-[20em]">
            <div className="snap-start shrink-0 w-2 md:w-4" aria-hidden="true" />
              {woDescription && (
                <div
                  className="snap-start shrink-0 w-[20rem] h-[6.5em] mb-4 relative animate-slide-in-left opacity-0 overflow-hidden rounded-2xl cursor-pointer group"
                  style={{ animationFillMode: 'forwards' }}
                  onClick={() => setShowDescriptionOverlay(true)}
                  onMouseEnter={(e) => {
                    centerCardInCarousel(e.currentTarget);
                  }}
                >
                  <div className="h-full rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white overflow-hidden border border-white/10 pointer-events-none relative">
                    <div
                      className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings prose-h2:text-base prose-h3:text-lg card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:!text-white [&_h2]:!font-bold [&_h2]:!uppercase [&_h3]:!font-bold opacity-90"
                      dangerouslySetInnerHTML={{ __html: woDescription }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-xl border-2 border-white/80 flex items-center justify-center group-hover:bg-black/35 transition-colors animate-fade-in"
                        style={{ opacity: 0, animationDelay: '2s', animationFillMode: 'forwards' }}
                      >
                        <span className="text-2xl text-white font-light leading-none">+</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {hasContactCard && (
                <div onMouseEnter={(e) => centerCardInCarousel(e.currentTarget)}>
                  <ContactFlipCard
                    key={business.id}
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
                </div>
              )}
              {showGoogleMap && business && (business.latitude || business.google_maps_url) && (
                <div onMouseEnter={(e) => centerCardInCarousel(e.currentTarget)}>
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
                </div>
              )}
              {externalLinks.length > 0 && (
                <div onMouseEnter={(e) => centerCardInCarousel(e.currentTarget)}>
                  <ExternalLinksFlipCard
                    links={externalLinks}
                    animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(hasReviewsCard)) * 120}ms`}
                    onClick={() => { setExtLinksOrigin('carousel'); setShowExtLinksOverlay(true); }}
                  />
                </div>
              )}
              {appStoreLinks.length > 0 && (
                <AppStoreCard
                  links={appStoreLinks}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(hasReviewsCard) + Number(externalLinks.length > 0)) * 120}ms`}
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
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(hasReviewsCard) + Number(externalLinks.length > 0) + Number(appStoreLinks.length > 0)) * 120}ms`}
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
              {poiBusinesses.length > 0 && business?.latitude && business?.longitude && (
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
              {poiBusinesses.length > 0 && business?.latitude && business?.longitude && (
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
          bookingCta={isAppStoreCta((business as any)?.reserve_now_cta, business?.presentation_mode) ? null : bookingCta}
          shopCta={isAppStoreCta((business as any)?.online_shop_cta, (business as any)?.online_shop_presentation_mode) ? null : shopCta}
          url4Cta={isAppStoreCta((business as any)?.url_4_cta, (business as any)?.url_4_presentation_mode) ? null : url4Cta}
          url5Cta={isAppStoreCta((business as any)?.url_5_cta, (business as any)?.url_5_presentation_mode) ? null : url5Cta}
          bookingCtaLabel={bookingCtaLabel}
          shopCtaLabel={shopCtaLabel}
          url4CtaLabel={url4CtaLabel}
          url5CtaLabel={url5CtaLabel}
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
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setBookingOverlayLoaded(false); setBookingOverlayHideContact(false); }}
            whatsapp={business?.whatsapp}
            phone={business?.phone}
            onLoad={() => setBookingOverlayLoaded(true)}
            hideContact={bookingOverlayHideContact}
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

      {/* Full Description Overlay */}
      {showDescriptionOverlay && woDescription && (
        <div className="absolute inset-0 lg:-top-[3.3rem] z-[80] animate-zoom-out-center overflow-hidden flex flex-col lg:pt-0">
          {/* Background image */}
          {images[0] && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${images[0]})` }}
            >
              <div className={`absolute inset-0 transition-colors duration-300 ${descGridMode ? 'bg-black/75' : 'bg-black/50'}`} />
            </div>
          )}
          {!images[0] && <div className="absolute inset-0 bg-background" />}
          {/* Sticky header — order-[-2] to stay above content */}
          <div className="relative z-30 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent backdrop-blur-sm border-b border-white/10 order-[-2]">
            <button onClick={() => { if (descGridMode) { setDescGridMode(false); setDescGridPage(0); } else if (descOverlayContent && !descOverlayDirect) { setDescOverlayContent(null); } else { setShowDescriptionOverlay(false); setDescOverlayContent(null); setDescOverlayDirect(false); } }} className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold uppercase font-['Josefin_Sans',sans-serif] truncate text-white flex-1">{business?.name}</h2>
            {!descGridMode && images.length > 0 && (
              <button
                onClick={() => { setDescGridMode(true); setDescGridPage(0); }}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shrink-0"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Scrollable content — fills remaining space between header and thumbnails */}
          <div className="relative z-10 flex-1 min-h-0 order-[-1]" style={{ perspective: "1200px" }}>
            {descGridMode ? (() => {
              const GRID_PAGE_SIZE = 9;
              const totalGridPages = Math.ceil(images.length / GRID_PAGE_SIZE);
              const currentPageImages = images.slice(descGridPage * GRID_PAGE_SIZE, (descGridPage + 1) * GRID_PAGE_SIZE);
              const globalOffset = descGridPage * GRID_PAGE_SIZE;
              return (
                <div className="w-full h-full flex flex-col items-center overflow-hidden">
                  <div className="flex-1" />
                  {totalGridPages > 1 && (
                    <div className="flex items-center gap-3 mb-auto">
                      <button
                        onClick={() => { playWoosh(wooshSfx); setDescGridPage(p => p - 1); }}
                        disabled={descGridPage === 0}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-white text-xs font-medium font-['Josefin_Sans',sans-serif] min-w-[2rem] text-center">
                        {descGridPage + 1} / {totalGridPages}
                      </span>
                      <button
                        onClick={() => { playWoosh(wooshSfx); setDescGridPage(p => p + 1); }}
                        disabled={descGridPage >= totalGridPages - 1}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1" />
                  <div className="w-full max-w-2xl px-3 relative" style={{ perspective: "1200px" }}>
                    <div
                      key={descGridPage}
                      style={{
                        animation: "0.5s cubic-bezier(0.4, 0, 0.2, 1) both",
                        animationName: "descGridFlip",
                      }}
                    >
                      <div className="px-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {currentPageImages.map((img, i) => {
                            const realIndex = globalOffset + i;
                            return (
                              <div
                                key={`grid-${realIndex}`}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => { const mi = mediaItems.findIndex(m => m.kind === "image" && m.url === img); setLightboxIndex(mi >= 0 ? mi : realIndex); setIsLightboxOpen(true); }}
                              >
                                <img src={img} alt={`${business?.name} ${realIndex + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1" />
                </div>
              );
            })() : (
              <div className="w-full h-full overflow-y-auto overscroll-contain">
                <div className="px-4 pt-4 pb-6 md:pl-6 md:pt-6 pr-14 md:pr-16">
                  {descOverlayContent && (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        {descOverlayContent.title?.toLowerCase().startsWith("avis") || descOverlayContent.title?.toLowerCase().startsWith("customer")
                          ? <Star className="h-4 w-4 text-gold fill-gold shrink-0" />
                          : <Sparkles className="h-4 w-4 text-gold shrink-0" />}
                        <h3 className="text-sm font-bold uppercase font-['Josefin_Sans',sans-serif] text-white">{descOverlayContent.title}</h3>
                      </div>
                      {/* Price info blocks */}
                      {(descOverlayContent.avgPriceRange || descOverlayContent.priceDetails) && (
                        <div className="flex flex-wrap gap-3 mb-5">
                          {descOverlayContent.avgPriceRange && (() => {
                            const pr = descOverlayContent.avgPriceRange as Record<string, unknown>;
                            const min = pr?.min ?? pr?.from;
                            const max = pr?.max ?? pr?.to;
                            const currency = (pr?.currency as string) || 'MAD';
                            if (min == null && max == null) return null;
                            return (
                              <div className="flex-1 min-w-[140px] rounded-xl border border-gold/30 backdrop-blur-md px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-gold/70 font-['Josefin_Sans',sans-serif] mb-1">Budget moyen / pers.</span>
                                <span className="text-lg font-normal text-gold font-['Josefin_Sans',sans-serif]">
                                  {min != null && max != null ? `${min} – ${max} ${currency}` : `${min ?? max} ${currency}`}
                                </span>
                              </div>
                            );
                          })()}
                          {descOverlayContent.priceDetails && (
                            <div className="flex-1 min-w-[140px] rounded-xl border backdrop-blur-md px-4 py-3" style={{ borderColor: 'rgba(192,79,23,0.35)', backgroundColor: 'rgba(255,255,255,0.45)' }}>
                              <span className="block text-[10px] font-extrabold uppercase tracking-widest font-['Josefin_Sans',sans-serif] text-terracotta/70 mb-1">Détail des prix</span>
                              <div className="rich-price-html text-sm font-normal leading-relaxed whitespace-pre-line text-terracotta" dangerouslySetInnerHTML={{ __html: descOverlayContent.priceDetails }} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                   <div
                    className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings prose-h2:text-base prose-h3:text-lg card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h2]:!uppercase [&_h3]:!font-bold [&_p:empty]:min-h-[1em] [&_table]:border-collapse [&_table]:w-full [&_table]:table-fixed [&_td]:border [&_td]:border-white/20 [&_td]:p-4 [&_td]:align-top [&_td]:text-xs [&_td_img]:w-full [&_td_img]:h-36 [&_td_img]:object-cover [&_td_img]:rounded-md [&_td_img]:block [&_th]:border [&_th]:border-white/20 [&_th]:p-2 [&_th]:bg-white/10 [&_th]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_iframe]:max-w-full [&_iframe]:rounded-md [&_mark]:bg-yellow-500/40 [&_mark]:px-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_hr]:border-white/20 prose-strong:!text-white"
                    dangerouslySetInnerHTML={{ __html: descOverlayContent ? descOverlayContent.html : woDescription }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Right sticky sidebar — Menu / Menu IA / External links */}
          {!descGridMode && (menuDocs.length > 0 || menuSummaries.length > 0 || externalLinks.length > 0 || hasReviewsCard) && (() => {
            const groups: { key: string; icon: React.ReactNode; directClick?: () => void; items: { label: string; logo?: string | null; onClick: () => void }[]; tooltip?: string }[] = [];
            if (menuDocs.length > 0) groups.push({
              key: 'menu',
              icon: <span className="flex items-center justify-center w-6 h-6">{categoryIcon ? <DynamicIcon name={categoryIcon} size={22} /> : <Newspaper className="h-[22px] w-[22px]" />}</span>,
              items: menuDocs.map(doc => ({ label: doc.name || 'Menu', onClick: () => { openDocOrBooking(doc.url, doc.name || 'Menu'); } })),
            });
            if (menuSummaries.length > 0) groups.push({
              key: 'ai',
              icon: <Sparkles className="h-[22px] w-[22px]" />,
              items: menuSummaries.map(ms => ({ label: ms.title || 'Menu IA', onClick: () => { setDescOverlayContent({ html: ms.content || '', title: ms.title || 'Menu IA', priceDetails: ms.price_details, avgPriceRange: ms.avg_price_range }); setDescGridMode(false); setSidebarOpenGroup(null); } })),
            });
            if (externalLinks.length > 0) {
              const extDesc = externalLinks[0]?.description?.toLowerCase() || "";
              const extIcon = (extDesc === "presse" || extDesc === "media")
                ? <Newspaper className="h-[22px] w-[22px]" />
                : <ExternalLink className="h-[22px] w-[22px]" />;
              const extLabel = extDesc === "partenaires" ? "Ils nous font confiance"
                : extDesc === "recompenses" ? "Nous sommes reconnus par…"
                : extDesc === "certifications" ? "Nous sommes certifiés par…"
                : (extDesc === "presse" || extDesc === "media") ? "Ils parlent de nous"
                : "+ d'infos";
              groups.push({
                key: 'ext',
                icon: extIcon,
                directClick: () => { setExtLinksOrigin('description'); setShowExtLinksOverlay(true); },
                items: [],
                tooltip: extLabel,
              });
            }
            if (hasReviewsCard) {
              const buildReviewHtml = (texts: { text: string | null; author_name: string | null; source: string }[], translated?: string[]) => {
                const platformsHtml = reviewPlatforms
                  .filter(p => p.rating && p.count)
                  .map(p => `<p><strong>${p.name}</strong> — ${p.rating}/5 (${p.count} ${language === "en" ? "reviews" : "avis"})</p>`)
                  .join("");
                const textsHtml = texts.length > 0
                  ? "<hr/>" + texts.slice(0, 10).map((r, i) => {
                    const displayText = translated?.[i] || r.text || "";
                    return `<blockquote><p>${displayText}</p><footer>— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
                  }).join("")
                  : "";
                return platformsHtml + textsHtml;
              };
              groups.push({
                key: 'reviews',
                icon: <Star className="h-[22px] w-[22px] text-gold fill-gold" />,
                tooltip: language === "en" ? "Customer reviews" : "Avis clients",
                directClick: async () => {
                  const title = language === "en" ? `Customer reviews (${totalReviewCount})` : `Avis clients (${totalReviewCount})`;
                  setDescOverlayContent({ html: buildReviewHtml(reviewTexts), title });
                  setDescGridMode(false);
                  setSidebarOpenGroup(null);
                  // Translate if needed
                  const targetLang = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
                  const needsTranslation = reviewTexts.some(r => r.language && r.language !== targetLang);
                  if (needsTranslation && reviewTexts.some(r => r.text)) {
                    try {
                      const { data, error } = await supabase.functions.invoke("translate-reviews", {
                        body: { reviews: reviewTexts.filter(r => r.text).map(r => ({ text: r.text })), targetLanguage: targetLang },
                      });
                      if (!error && data?.translations?.length) {
                        setDescOverlayContent({ html: buildReviewHtml(reviewTexts, data.translations), title });
                      }
                    } catch (e) { console.error("Translation error:", e); }
                  }
                },
                items: [],
              });
            }
            return (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-end">
                {groups.map(g => {
                  if (g.directClick) {
                    return (
                      <div key={g.key} className="group relative flex flex-col items-end">
                        <button
                          onClick={g.directClick}
                          className="flex items-center justify-center h-10 w-10 rounded-full border border-white/10 text-white transition-colors shadow-lg bg-black/80 hover:bg-black/90"
                        >
                          {g.icon}
                        </button>
                        {g.tooltip && (
                          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/90 px-2.5 py-1 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {g.tooltip}
                          </span>
                        )}
                      </div>
                    );
                  }
                  const isOpen = sidebarOpenGroup === g.key;
                  return (
                    <div key={g.key} className="flex flex-col items-end"
                      onMouseEnter={() => setSidebarOpenGroup(g.key)}
                      onMouseLeave={() => setSidebarOpenGroup(null)}
                    >
                      <button
                        className={`flex items-center justify-center h-10 w-10 rounded-full border border-white/10 text-white transition-colors shadow-lg ${isOpen ? 'bg-black/90' : 'bg-black/80 hover:bg-black/90'}`}
                      >
                        {g.icon}
                      </button>
                      <div
                        className="flex flex-col gap-1 mt-1 overflow-hidden transition-all duration-300 ease-in-out"
                        style={{ maxHeight: isOpen ? `${g.items.length * 44}px` : '0px', opacity: isOpen ? 1 : 0 }}
                      >
                        {g.items.map((item, i) => (
                          <button
                            key={i}
                            onClick={item.onClick}
                            className={`flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white/35 transition-colors shadow-lg whitespace-nowrap ${item.logo ? 'h-10 px-3' : 'h-7 gap-1.5 px-2.5 pr-3 text-[11px] font-medium'}`}
                          >
                            {item.logo ? (
                              <img src={item.logo} alt={item.label} className="h-6 max-w-[5rem] object-contain" loading="lazy" />
                            ) : (
                              <span className="text-[11px]">{item.label}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {images.length > 1 && !descGridMode && (
            <div className="relative z-20 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 md:py-2 bg-transparent backdrop-blur-sm border-t border-white/10">
              {images.slice(0, 5).map((img, i) => (
                  <div
                    key={i}
                    className={`relative w-[calc((100%-6*4px)/5)] shrink-0 aspect-[3/2] rounded-md overflow-hidden cursor-pointer ${i >= 2 ? 'hidden md:block' : ''} ${i >= 4 ? 'md:hidden lg:block' : ''}`}
                    style={{ maxHeight: 'none' }}
                    onClick={() => { setDescGridMode(true); setDescGridPage(0); }}
                  >
                    <img src={img} alt={`${business?.name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Plus className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-lg" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Searchbar spacer */}
          <div className="shrink-0 h-[3.5rem] md:h-[3.75rem]" />
        </div>
      )}

      {/* External Links Overlay */}
      {showExtLinksOverlay && externalLinks.length > 0 && (
        <div className="absolute inset-0 lg:-top-[3.5rem] z-[85] flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ animation: "panelFadeIn 0.3s ease-out both" }}>
          <button
            onClick={() => setShowExtLinksOverlay(false)}
            className="absolute top-3 left-3 z-10 flex items-center justify-center h-9 w-9 rounded-full bg-white text-black shadow-lg hover:opacity-90 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-full max-w-lg px-4">
            <ExternalLinksFlipCard
              links={externalLinks}
              variant="overlay"
              onOpenUrl={(url, title) => { setShowExtLinksOverlay(false); openDocOrBooking(url, title, true); }}
            />
          </div>
        </div>
      )}

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
        <div className="absolute top-0 left-0 right-0 bottom-0 z-[80] animate-slide-up-from-bottom bg-background">
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
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[80] flex flex-col" style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}>
          <div className="sticky top-0 z-10 flex items-center px-4 py-2 gap-2 bg-black/30 backdrop-blur-sm">
            <button
              onClick={() => { setShowPoiMapOverlay(false); setPoiMapMode("poi"); infoCarouselRef.current?.scrollTo({ left: 0, behavior: "smooth" }); }}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-opacity"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-white truncate drop-shadow-md">
              {poiMapMode === "destinations"
                ? (language === "en" ? "Where are you going?" : "Où allez-vous ?")
                : poiBusinesses.length > 0
                  ? (language === "en" ? `Nearby points of interest of ${business?.name}` : `Points d'intérêt à proximité de ${business?.name}`)
                  : (language === "en" ? `Nearby establishments of ${business?.name}` : `Établissements à proximité de ${business?.name}`)}
            </span>
          </div>
          <div className="flex-1 min-h-0 -mt-[3.25rem]">
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
                    ...(poiBusinesses.map(p => ({
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
