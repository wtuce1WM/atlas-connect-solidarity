import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DesktopMediaArrows, CardsToggleButton, useOwnerLogo } from "@/components/CardsVisibilityToggle";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import { createPortal } from "react-dom";
import { MapPin, ChevronUp, ChevronLeft, ChevronRight, X, CalendarCheck, Star, Loader2, Expand, Plus, Image as ImageIcon, Sparkles, Newspaper, ExternalLink, MessageCircle, Film, Globe, Landmark, Clock, Play, Building2, Compass } from "lucide-react";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, TwitterIcon, LinkedInIcon, PinterestIcon, VimeoIcon, SnapchatIcon } from "@/components/staff/SocialMediaIcons";
import DynamicIcon from "@/components/DynamicIcon";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import { supabase } from "@/integrations/supabase/client";

import wooshSfx from "@/assets/woosh.wav";
import { playWoosh } from "@/lib/overlayConstants";
import poiNearbyImg from "@/assets/poi-nearby.webp";
import FullscreenLightbox from "@/components/FullscreenLightbox";

import { whatsappUrl } from "@/lib/phoneUtils";
import { groupImagesWithHeadings } from "@/lib/groupImagesWithHeadings";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import ContactFlipCard from "@/components/cards/ContactFlipCard";

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
import { useLocation } from "react-router-dom";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

import { useBookOnlineData } from "@/hooks/useBookOnlineData";
import type { Destination } from "@/hooks/useBookOnlineData";
import VideoDocumentOverlay from "@/components/overlays/VideoDocumentOverlay";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import ExternalVideosOverlay from "@/components/overlays/ExternalVideosOverlay";
import { isExternalVideoUrl } from "@/lib/videoSourceFilter";
import DocumentOverlay from "@/components/overlays/DocumentOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import OverlayShell from "@/components/overlays/OverlayShell";
import SpotifyOverlay from "@/components/overlays/SpotifyOverlay";
import SoundCloudOverlay from "@/components/overlays/SoundCloudOverlay";
import SerpApiHotelOverlay from "@/components/SerpApiHotelOverlay";
import PanelSearchBar from "@/components/PanelSearchBar";

import { useHotelAvailability } from "@/hooks/useHotelAvailability";
import { useOpenStatus } from "@/hooks/useOpenStatus";
import { ToolbarPortals } from "@/components/slidepanel/ToolbarPortals";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import { CtaBar, CTA_MODE_LABELS } from "@/components/slidepanel/CtaBar";
import { HotelAvailabilityResult } from "@/components/slidepanel/HotelAvailabilityResult";
import AvailabilitySearchOverlay from "@/components/overlays/AvailabilitySearchOverlay";

// Extracted hooks & components
import { useCtaConfig } from "@/hooks/useCtaConfig";
import { useMediaItems, useVideoInfo } from "@/hooks/useMediaItems";
import MediaBackground from "@/components/slidepanel/MediaBackground";
import BusinessHeader from "@/components/slidepanel/BusinessHeader";
import { buildReviewHtml } from "@/lib/reviewHtmlBuilder";
import VideoControls from "@/components/VideoControls";
import VideoThumbnail from "@/components/VideoThumbnail";

/* Static hook text component */
const TypewriterHook = ({ text }: { text: string }) => {
  return (
    <p
      className="hidden md:block text-lg md:text-xl text-white/90 font-bold text-center max-w-[85%] md:max-w-xl leading-relaxed pointer-events-none"
      style={{
        fontFamily: "'Josefin Sans', sans-serif",
        filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 6px hsla(0,0%,0%,0.9)) drop-shadow(0 2px 12px hsla(0,0%,0%,0.7)) drop-shadow(0 4px 24px hsla(0,0%,0%,0.4))",
      }}
    >
      {text}
    </p>
  );
};

interface BookOnlineSlidePanelProps {
  businessId: string;
  onClose: () => void;
  externalOverlayActive?: boolean;
  forceMuted?: boolean;
  interceptCloseRef?: React.MutableRefObject<(() => boolean) | null>;
  showSearchBar?: boolean;
  onSearch?: (params: Record<string, string>) => void;
  onSearchBusinessSelect?: (businessId: string) => void;
  onHotelSearch?: (intent: { city: string; checkIn?: string; checkOut?: string; adults?: number }, spokenText: string) => void;
  initialAvailabilityCheckIn?: string;
  initialAvailabilityCheckOut?: string;
  initialAvailabilityAdults?: number;
  onMosaicStateChange?: (open: boolean) => void;
  closeTrigger?: number;
  propagateMosaicState?: boolean;
  /** Optional prefix for toolbar portal IDs (used by POI/KP sub-panels) */
  toolbarPortalPrefix?: string;
  /** If provided, auto-opens the video overlay for the matching URL once videoDocs loaded */
  initialVideoUrl?: string;
}

const BookOnlineSlidePanel = ({ businessId: propBusinessId, onClose, externalOverlayActive, forceMuted, interceptCloseRef, showSearchBar, onSearch, onSearchBusinessSelect, onHotelSearch, initialAvailabilityCheckIn, initialAvailabilityCheckOut, initialAvailabilityAdults, onMosaicStateChange, closeTrigger, propagateMosaicState = false, toolbarPortalPrefix, initialVideoUrl }: BookOnlineSlidePanelProps) => {
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
  const location = useLocation();

  const {
    business, woDescription, destinations, poiBusinesses, isLoading,
    reviewTexts, externalLinks, menuSummaries, menuDocs, videoDocs,
    allVideoUrls, categoryIcon, showGoogleMap, kpRelated, kpSubcategoryItems, kpSubcategoryLabel, isKp1Only, liteApiHotelId, serpApiMapping, isHotelWithPrice,
  } = useBookOnlineData(businessId);

  // --- Extracted hooks ---
  const { images, videos, mediaItems, totalMedia, matterportIndex, matterportItem, lightboxItems } = useMediaItems(business, allVideoUrls, videoDocs);
  const ctaConfig = useCtaConfig(business, language);

  // --- Cosmetic URL rewriting ---
  const savedUrlRef = useRef(window.location.pathname + window.location.search);

  // UI state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [matterportPinnedInHiddenMode, setMatterportPinnedInHiddenMode] = useState(true);
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
  const [descGridSection, setDescGridSection] = useState<"images" | "videos" | "poi" | "dest" | "kp" | "kp_subcat" | null>(null);
   const [descGridPage, setDescGridPage] = useState(0);
   const [sidebarOpenGroup, setSidebarOpenGroup] = useState<string | null>(null);
   const [descOverlayContent, setDescOverlayContent] = useState<{ html: string; title: string; priceDetails?: string | null; avgPriceRange?: unknown } | null>(null);
  const [activeVideoOverlay, setActiveVideoOverlay] = useState<{ url: string; name: string | null; description: string | null } | null>(null);
  const [videoOverlayClosing, setVideoOverlayClosing] = useState(false);
  const consumedInitialVideoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialVideoUrl) return;
    if (consumedInitialVideoRef.current === initialVideoUrl) return;
    if (!videoDocs || videoDocs.length === 0) return;
    const match = videoDocs.find(v => v.url === initialVideoUrl);
    consumedInitialVideoRef.current = initialVideoUrl;
    setActiveVideoOverlay({
      url: initialVideoUrl,
      name: match?.name ?? null,
      description: match?.description ?? null,
    });
  }, [initialVideoUrl, videoDocs]);
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
  const [ytBgMuted, setYtBgMuted] = useState(false);
  const [youtubeVideoCount, setYoutubeVideoCount] = useState<number | null>(null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [showExternalVideosOverlay, setShowExternalVideosOverlay] = useState(false);
  const [allYoutubeVideos, setAllYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [kpGroupTitle, setKpGroupTitle] = useState<string | null>(null);

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
  const [showAvailabilitySearch, setShowAvailabilitySearch] = useState(false);
  const [showHoursOverlay, setShowHoursOverlay] = useState(false);
  const [showSpotifyOverlay, setShowSpotifyOverlay] = useState(false);
  const [showSoundCloudOverlay, setShowSoundCloudOverlay] = useState(false);
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);

  // Auto-close availability search overlay when search completes
  const prevHotelSearchLoadingRef = useRef(false);
  useEffect(() => {
    if (prevHotelSearchLoadingRef.current && !hotelSearchLoading) {
      setShowAvailabilitySearch(false);
    }
    prevHotelSearchLoadingRef.current = hotelSearchLoading;
  }, [hotelSearchLoading]);
  
  const fallbackDataRef = useRef<FallbackPanelData | null>(null);
  useEffect(() => {
    if (fallbackPanelData) fallbackDataRef.current = fallbackPanelData;
  }, [fallbackPanelData]);

  const destInterceptCloseRef = useRef<(() => boolean) | null>(null);
  const kpInterceptCloseRef = useRef<(() => boolean) | null>(null);

  // --- Cosmetic URL rewriting effects ---
  useEffect(() => {
    if (!business?.slug) return;
    const hasSubOverlay = selectedDestinationId || selectedPoiBusinessId || selectedKpBusinessId;
    if (!hasSubOverlay) {
      if (location.pathname === "/search") return;
      const currentPath = window.location.pathname;
      const prefix = currentPath.startsWith("/fiche/") ? "/fiche/" : "/business/";
      window.history.replaceState(null, "", `${prefix}${business.slug}`);
    }
  }, [business?.slug, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId, location.pathname]);

  useEffect(() => {
    if (!selectedDestinationId) return;
    const dest = destinations.find(d => d.id === selectedDestinationId);
    if (dest) {
      window.history.replaceState(null, "", `/destination/${encodeURIComponent(dest.name_fr)}`);
    }
  }, [selectedDestinationId, destinations]);

  useEffect(() => {
    const saved = savedUrlRef.current;
    return () => {
      // Only restore the saved URL if it was cosmetically rewritten (i.e. we're
      // no longer on /search). If the user navigated to a new /search URL
      // (e.g. via the Hashtags overlay), keep that navigation intact.
      if (window.location.pathname !== "/search") {
        window.history.replaceState(null, "", saved);
      }
    };
  }, []);

  // Close interceptor
  useEffect(() => {
    if (!interceptCloseRef) return;
    if (showHoursOverlay || showAvailabilitySearch || showDescriptionOverlay || showDirections || showBookingOverlay || !!docOverlay || showMosaic || showYoutubeOverlay || showExternalVideosOverlay || selectedDestinationId || selectedPoiBusinessId || selectedKpBusinessId) {
      interceptCloseRef.current = () => {
        if (showHoursOverlay) { setShowHoursOverlay(false); return true; }
        if (showAvailabilitySearch) { setShowAvailabilitySearch(false); return true; }
        if (showMosaic) { setShowMosaic(false); return true; }
        if (showYoutubeOverlay) { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); setYoutubeIsPlaying(false); return true; }
        if (showExternalVideosOverlay) { setShowExternalVideosOverlay(false); return true; }
        if (showBookingOverlay) { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setBookingOverlayLoaded(false); setBookingOverlayHideContact(false); return true; }
        if (docOverlay) { setDocOverlay(null); setDocOverlayLoaded(false); return true; }
        if (showDirections) { setShowDirections(false); return true; }
        if (selectedDestinationId && destInterceptCloseRef.current?.()) return true;
        if (selectedDestinationId) { setSelectedDestinationId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); return true; }
        if (selectedPoiBusinessId) { setSelectedPoiBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); return true; }
        if (selectedKpBusinessId && kpInterceptCloseRef.current?.()) return true;
        if (selectedKpBusinessId) { setSelectedKpBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); return true; }
        if (showDescriptionOverlay) { setShowDescriptionOverlay(false); setDescOverlayContent(null); setDescOverlayDirect(false); return true; }
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
  }, [previousBusinessId, cameFromFallback, fallbackPanelData, interceptCloseRef, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId, showHoursOverlay, showAvailabilitySearch, showDescriptionOverlay, showDirections, showBookingOverlay, docOverlay, showMosaic, showYoutubeOverlay, showExternalVideosOverlay]);

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
  useEffect(() => {
    if (cardsHidden) setMatterportPinnedInHiddenMode(true);
  }, [cardsHidden, businessId]);

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
    setShowExternalVideosOverlay(false);
    setKpGroupTitle(null);
    setActiveVideoOverlay(null);
    setVideoOverlayClosing(false);
    setShowPoiMapOverlay(false);
    setShowDescriptionOverlay(false);
    setShowAvailabilitySearch(false);
    setDescGridSection(null);
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

  const centerCardInCarousel = (el: HTMLElement) => {
    const container = infoCarouselRef.current;
    if (!container) return;
    const style = getComputedStyle(container);
    const marginLeft = Math.abs(parseFloat(style.marginLeft) || 0);
    const panelVisibleWidth = container.clientWidth - marginLeft;
    const cardCenter = el.offsetLeft + el.offsetWidth / 2;
    const targetScroll = cardCenter - marginLeft - panelVisibleWidth / 2;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync video state — use MutationObserver-like approach via interval to catch key-based remounts
  useEffect(() => {
    let lastEl: HTMLVideoElement | null = null;
    let cleanup: (() => void) | null = null;

    const attach = () => {
      const v = videoRef.current;
      if (v === lastEl) return;
      cleanup?.();
      cleanup = null;
      lastEl = v;
      if (!v) return;
      const onPlay = () => setVideoPaused(false);
      const onPause = () => setVideoPaused(true);
      const onVolChange = () => { setVideoMuted(v.muted); setGlobalSoundOn(!v.muted); };
      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("volumechange", onVolChange);
      setVideoPaused(v.paused);
      setVideoMuted(v.muted);
      cleanup = () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("volumechange", onVolChange);
      };
    };

    attach();
    // Poll briefly to catch React key-based remounts
    const id = setInterval(attach, 200);
    return () => {
      clearInterval(id);
      cleanup?.();
    };
  }, [businessId, currentMediaIndex]);

  // Pause/mute background media when an overlay is open — WITHOUT reloading iframes
  // (reloading caused the YouTube background to "jump" to its default top-anchored layout).
  // We pause/mute via postMessage for YouTube and via the <video> element for files,
  // so the iframe DOM stays mounted and never re-layouts.
  useEffect(() => {
    const overlayOpen =
      showDirections || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId ||
      !!docOverlay || showBookingOverlay || showYoutubeOverlay || showExternalVideosOverlay || showMosaic ||
      !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay ||
      showFallbackOverlay || searchOverlayActive || showDescriptionOverlay || !!forceMuted;

    const v = videoRef.current;
    const iframe = iframeRef.current;
    const ytPost = (func: string) => {
      iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func }), "*");
    };

    if (overlayOpen) {
      if (v) { v.pause(); v.muted = true; }
      if (iframe) { ytPost("mute"); ytPost("pauseVideo"); }
      return;
    }

    if (v && v.paused) {
      v.muted = true;
      v.play().catch(() => {});
    }
    if (iframe) { ytPost("mute"); ytPost("playVideo"); }
  }, [
    forceMuted, showDirections, selectedDestinationId, selectedPoiBusinessId, selectedKpBusinessId,
    docOverlay, showBookingOverlay, showYoutubeOverlay, showExternalVideosOverlay, showMosaic, externalOverlayActive,
    showPoiMapOverlay, activeVideoOverlay, showFallbackOverlay, searchOverlayActive, showDescriptionOverlay,
  ]);

  const hasOpeningHours = business?.show_opening_hours !== false && (business?.is_open_24h || business?.opening_hours);

  const reviewPlatforms = useMemo(() => {
    if (!business) return [];
    return [
      { name: "Google", rating: business.google_rating, count: business.google_review_count, url: business.google_reviews_url || business.google_maps_url, leaveReviewUrl: (business as any).google_review_url || ((business as any).google_place_id ? `https://search.google.com/local/writereview?placeid=${(business as any).google_place_id}` : null) },
      { name: "TripAdvisor", rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, url: business.tripadvisor_review_url || business.tripadvisor_url, listingUrl: business.tripadvisor_url },
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
    const html = buildReviewHtml(reviewTexts, reviewPlatforms, avgOn20, totalReviewCount, language);
    const title = language === "en" ? `Customer reviews (${totalReviewCount})` : `Avis clients (${totalReviewCount})`;
    setDescOverlayContent({ html, title });
    setDescGridSection(null);
    setDescOverlayDirect(true);
    setShowDescriptionOverlay(true);
  }, [hasReviewsCard, reviewPlatforms, reviewTexts, totalReviewCount, language, avgOn20]);

  // Extracted open status hook
  const openBadgeInfo = useOpenStatus({ business, language });

  // Bottom tabs
  const hasVideosCarousel = videoDocs.length > 0;
  const hasYoutubeChannel = !!(business?.youtube_url && business?.show_youtube_tab && youtubeVideoCount !== 0);
  // External (YouTube/Vimeo/etc.) videos attached to this business or POI — used when the business has no YouTube channel
  const externalVideoDocs = useMemo(
    () => (videoDocs || []).filter((d: any) => isExternalVideoUrl(d.url)),
    [videoDocs]
  );
  const hasExternalVideos = externalVideoDocs.length > 0;
  // Single YouTube button: opens channel overlay if channel exists, else external videos overlay
  const hasYoutubeBottomCarousel = hasYoutubeChannel || hasExternalVideos;
  const hasYoutubeReady = !!(youtubeVideoCount && youtubeVideoCount > 0);
  const hasKpCarousel = kpRelated.length > 0;
  const hasKpSubcatCarousel = kpSubcategoryItems.length > 0;
  const hasDestCarousel = destinations.length > 1;
  const hasPoiCarousel = poiBusinesses.length >= 2;

  // Fetch KP group title
  useEffect(() => {
    const kpCode = business?.kp_regroupement?.trim();
    if (!kpCode || !hasKpCarousel) { setKpGroupTitle(null); return; }
    let cancelled = false;
    supabase.from("kp_group_titles").select("title").eq("kp_code", kpCode).eq("kp_type", "kp1").maybeSingle()
      .then(({ data }) => { if (!cancelled) setKpGroupTitle(data?.title || null); });
    return () => { cancelled = true; };
  }, [business?.kp_regroupement, hasKpCarousel]);

  const videoTabLabel = useMemo(() => {
    if (business?.carousel_badge) {
      const cb = business.carousel_badge;
      if (cb === "immergez_vous") return language === "en" ? "Immerse yourself" : "Immergez-vous";
      if (cb === "bienvenue_a") return `${language === "en" ? "Welcome to" : "Bienvenue à"} ${business.name}`;
      if (cb === "bienvenue_au") return `${language === "en" ? "Welcome to" : "Bienvenue au"} ${business.name}`;
      if (cb === "bienvenue_chez") return `${language === "en" ? "Welcome to" : "Bienvenue chez"} ${business.name}`;
      if (cb === "bienvenue") return language === "en" ? "Welcome" : "Bienvenue";
      if (cb === "bienvenue_a_l") return `${language === "en" ? "Welcome to" : "Bienvenue à l'"} ${business.name}`;
      if (cb === "bienvenue_a_la") return `${language === "en" ? "Welcome to" : "Bienvenue à la"} ${business.name}`;
      if (cb === "bienvenue_aux") return `${language === "en" ? "Welcome to" : "Bienvenue aux"} ${business.name}`;
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
      tabs.push({ id: "kp", label: kpGroupTitle || (language === "en" ? "Other establishments" : "Autres établissements"), hasContent: true });
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

  // Media items are now computed via useMediaItems hook
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;
  const effectiveMedia = (cardsHidden && matterportPinnedInHiddenMode && matterportItem) ? matterportItem : currentMedia;

  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, videoDocs, businessId);

  // Video info via extracted hook
  const { soundOn: globalSoundOn, setSoundOn: setGlobalSoundOn } = useVideoSoundPreference();
  const { videoInfo, isVerticalVideo, isSquareVideo, setIsFileVideoVertical, setIsFileVideoSquare } = useVideoInfo(effectiveMedia || null, globalSoundOn);
  const externalVideoInteractiveMode = cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type !== "file";

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    if (cardsHidden && matterportPinnedInHiddenMode && matterportIndex >= 0) {
      setMatterportPinnedInHiddenMode(false);
      setCurrentMediaIndex((matterportIndex + dir + totalMedia) % totalMedia);
      return;
    }
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [cardsHidden, matterportPinnedInHiddenMode, matterportIndex, totalMedia]);

  // Horizontal swipe on media to navigate (replaces left/right chevrons)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleMediaTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
    onTouchStart?.(e);
  }, [onTouchStart]);
  const handleMediaTouchMove = useCallback((e: React.TouchEvent) => {
    onTouchMove?.(e);
  }, [onTouchMove]);
  const handleMediaTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (start) {
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goMedia(dx < 0 ? 1 : -1);
      }
    }
    onTouchEnd?.();
  }, [onTouchEnd, goMedia]);

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

  const externalVideoBackgroundClass = "absolute inset-0 z-0";

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
  const anyOverlay = showDirections || showBookingOverlay || !!docOverlay || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId || showPoiMapOverlay || !!activeVideoOverlay || isLightboxOpen || showMosaic || showYoutubeOverlay || showExternalVideosOverlay || !!availabilityOverlayCtx || !!serpApiOverlayCtx || showFallbackOverlay || !!externalOverlayActive;

  const handleVideoLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const ratio = v.videoWidth > 0 ? v.videoHeight / v.videoWidth : 1;
    setIsFileVideoVertical(v.videoHeight > v.videoWidth);
    setIsFileVideoSquare(ratio >= 0.9 && ratio <= 1.1);
  }, [setIsFileVideoVertical, setIsFileVideoSquare]);

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
        toolbarPortalPrefix={toolbarPortalPrefix}
        openBadgeInfo={openBadgeInfo}
      />

      <ClubLoginPopup />

      {/* Full-bleed background — extracted component */}
      <div className={externalVideoBackgroundClass}>
        <MediaBackground
          effectiveMedia={effectiveMedia || null}
          businessName={business.name}
          videoInfo={videoInfo}
          isVerticalVideo={isVerticalVideo}
          isSquareVideo={isSquareVideo}
          cardsHidden={cardsHidden}
          externalVideoInteractiveMode={externalVideoInteractiveMode}
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>}
          onLoadedMetadata={handleVideoLoadedMetadata}
        />
        {effectiveMedia?.kind !== "video" && effectiveMedia?.kind !== "matterport" && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        )}
      </div>

      <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />


      {/* Left sidebar CTAs — mirrors the Full Description overlay sidebar */}
      {!cardsHidden && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
          {languages.length > 1 && (
          <div className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Nous parlons</span>
            <span
              className="relative inline-flex items-center justify-center text-[22px] leading-none shrink-0 group-hover:ml-2 transition-[margin] duration-300 cursor-help [&:hover>span]:opacity-100"
              aria-label="Nous parlons français"
              title="Nous parlons français"
            >
              🇫🇷
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-50 mt-2 hidden md:block whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] md:text-xs text-white opacity-0 transition-opacity duration-150">
                Nous parlons français
              </span>
            </span>
            {languages.filter(l => !['fr','français','french'].includes(l.toLowerCase().trim())).length > 0 && (
              <span className="flex items-center max-w-0 overflow-hidden opacity-0 group-hover:max-w-[300px] group-hover:opacity-100 transition-all duration-300 ease-out whitespace-nowrap gap-1.5 group-hover:ml-1.5">
                {languages.filter(l => !['fr','français','french'].includes(l.toLowerCase().trim())).map((lang, i) => {
                  const langAlt = getLangAlt(lang);
                  return (
                    <span
                      key={i}
                      className="relative inline-flex items-center justify-center text-[22px] leading-none shrink-0 cursor-help [&:hover>span]:opacity-100"
                      aria-label={langAlt}
                      title={langAlt}
                    >
                      {getLangFlag(lang)}
                      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-50 mt-2 hidden md:block whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] md:text-xs text-white opacity-0 transition-opacity duration-150">
                        {langAlt}
                      </span>
                    </span>
                  );
                })}
              </span>
            )}
          </div>
          )}
          {isHotelWithPrice ? (
            <div onClick={() => setShowAvailabilitySearch(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[130px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Disponibilité</span>
              <CalendarCheck className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          ) : hasOpeningHours && !business?.is_open_24h ? (
            <div onClick={() => setShowHoursOverlay(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Horaires</span>
              <Clock className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          ) : null}
          {showGoogleMap && business && (business.latitude || business.google_maps_url) && (
            <div onClick={() => setShowPoiMapOverlay(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Localisation</span>
              <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {videoDocs.length >= 2 && (
            <div onClick={() => { setDescGridSection("videos"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Vidéos</span>
              <Film className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {business?.spotify_url && (
            <div onClick={() => setShowSpotifyOverlay(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Spotify</span>
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" fill="#1DB954" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.224.364-.704.479-1.068.255-2.928-1.789-6.612-2.193-10.95-1.203-.42.096-.84-.168-.936-.588-.096-.42.168-.84.588-.936 4.752-1.085 8.832-.62 12.108 1.404.36.224.479.704.258 1.068zm1.473-3.272c-.282.456-.879.6-1.335.318-3.348-2.058-8.454-2.652-12.42-1.452-.51.156-1.05-.132-1.206-.642-.156-.51.132-1.05.642-1.206 4.53-1.374 10.155-.708 14.022 1.668.456.282.6.879.297 1.314zm.129-3.408c-4.014-2.382-10.638-2.604-14.466-1.44-.612.186-1.26-.162-1.446-.774-.186-.612.162-1.26.774-1.446 4.392-1.332 11.706-1.074 16.32 1.668.546.324.726 1.032.402 1.578-.324.546-1.032.726-1.584.414z"/>
              </svg>
            </div>
          )}
          {business?.soundcloud_url && (
            <div onClick={() => setShowSoundCloudOverlay(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">SoundCloud</span>
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" fill="#FF5500" aria-hidden="true">
                <path d="M11.56 8.87V17h8.76c1.85-.13 3.68-1.5 3.68-3.92 0-2.6-2.13-3.96-4-3.96-.55 0-1.06.1-1.55.27-.55-2.7-2.85-4.4-5.55-4.4-.45 0-.94.07-1.34.18zm-1.5.43c-.36-.13-.74-.2-1.13-.2-.5 0-.96.1-1.4.27V17h2.53V9.3zm-3.92.7c-.27-.07-.55-.1-.84-.1-.3 0-.58.04-.84.1V17h1.68V10zm-2.86.66c-.2-.04-.4-.07-.6-.07-.2 0-.42.03-.62.07V17h1.22v-6.34zM.78 12c-.32.13-.56.5-.56.93 0 .43.24.8.56.93V12zm21.66-2.88z"/>
              </svg>
            </div>
          )}
          {hasYoutubeBottomCarousel && (
            <div onClick={() => {
              if (hasYoutubeChannel) {
                const firstShort = allYoutubeVideos.find(v => v.isShort) || allYoutubeVideos[0] || null;
                if (firstShort) setActiveYoutubeVideo(firstShort);
                setShowYoutubeOverlay(true);
                setYoutubeIsPlaying(true);
              } else {
                setShowExternalVideosOverlay(true);
              }
            }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">YouTube</span>
              <YouTubeIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300 text-red-600" />
            </div>
          )}
          {images.length > 0 && (
            <div onClick={() => { setDescGridSection("images"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Images</span>
              <ImageIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {hasPoiCarousel && (
            <div onClick={() => { setDescGridSection("poi"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">À proximité</span>
              <Compass className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {hasDestCarousel && (
            <div onClick={() => { setDescGridSection("dest"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Destinations</span>
              <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {hasKpCarousel && (
            <div onClick={() => { setDescGridSection("kp"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">{kpGroupTitle || (language === "en" ? "Other establishments" : "Autres établissements")}</span>
              <Landmark className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {externalLinks.length > 0 && (() => {
            const extDesc = externalLinks[0]?.description?.toLowerCase() || "";
            const isPresse = extDesc === "presse" || extDesc === "media";
            const extLabel = (() => {
              if (extDesc === "partenaires") return "Ils nous font confiance";
              if (extDesc === "recompenses") return "Nous sommes reconnus par";
              if (extDesc === "certifications") return "Nous sommes certifiés par";
              if (extDesc === "en_savoir_plus") return "En savoir plus";
              if (extDesc === "presse" || extDesc === "media") return "Ils parlent de nous";
              return "+ d'infos";
            })();
            return (
              <div onClick={() => { setExtLinksOrigin('carousel'); setShowExtLinksOverlay(true); }} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">{extLabel}</span>
                {isPresse
                  ? <Newspaper className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
                  : <ExternalLink className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />}
              </div>
            );
          })()}
          {hasReviewsCard && (
            <div onClick={handleOpenReviews} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">Avis clients</span>
              <Star className="h-[22px] w-[22px] text-gold fill-gold shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
        </div>
      )}

      {/* Overlaid content */}
      <div
        className={`relative z-10 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain h-full p-4 pt-16 md:p-6 md:pt-20 lg:pt-16 ${cardsHidden ? 'pb-0' : showSearchBar ? 'pb-[70px] md:pb-[66px]' : 'pb-8'} ${(effectiveMedia?.kind === "matterport" && cardsHidden) ? "pointer-events-none" : externalVideoInteractiveMode ? "pointer-events-none" : ""} scrollbar-hide-mobile`}
        style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
        onTouchStart={externalVideoInteractiveMode ? undefined : handleMediaTouchStart}
        onTouchMove={externalVideoInteractiveMode ? undefined : handleMediaTouchMove}
        onTouchEnd={externalVideoInteractiveMode ? undefined : handleMediaTouchEnd}
      >

        {/* Block 1: Logo + name — extracted component */}
        <BusinessHeader
          business={business}
          businessId={businessId}
          hookText={hookText}
          showHook={showHook}
          hasReviewsCard={hasReviewsCard}
          avgOn20={avgOn20}
          totalReviewCount={totalReviewCount}
          onOpenReviews={handleOpenReviews}
          openBadgeInfo={openBadgeInfo}
        />

        {/* Top bar: toggle, flags, rating — below BusinessHeader */}
        {!business?.hide_description && (
        <div key={businessId + '-topbar'} className="relative z-40 overflow-visible flex flex-col items-center pt-3 pb-1 pointer-events-auto">
          {cardsHidden ? (
            <div className="w-full shrink-0 pointer-events-auto relative z-20">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-[32px] mb-2">
                <div className="min-w-0" />
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
                <div className="min-w-0" />
              </div>
            </div>
          ) : (
            <CardsToggleButton
              cardsHidden={cardsHidden}
              showCards={showCards}
              hideCards={hideCards}
              onMouseDownDrag={onMouseDownDrag}
              openBadgeInfo={openBadgeInfo}
              leftSlot={languages.length > 0 ? (
                <div className={`hidden md:flex items-center flex-wrap justify-center gap-1 md:gap-2 py-1.5 px-3 md:px-3 shrink-0 ${languages.length > 5 ? 'md:max-w-none' : ''}`}>
                  {languages.map((lang, i) => {
                    const langAlt = getLangAlt(lang);
                    return (
                      <span
                        key={i}
                        className="group relative inline-flex items-center justify-center text-xl md:text-2xl leading-none cursor-help shrink-0"
                        title={langAlt}
                        aria-label={langAlt}
                        role="img"
                        tabIndex={0}
                        style={{ filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 6px hsla(0,0%,0%,0.9)) drop-shadow(0 2px 12px hsla(0,0%,0%,0.7)) drop-shadow(0 4px 24px hsla(0,0%,0%,0.4))" }}
                      >
                        {getLangFlag(lang)}
                        <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:text-xs">
                          {langAlt}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : undefined}
              middleSlot={hookText ? (
                <p
                  className="md:hidden text-base text-white/90 font-bold text-center max-w-[95%] md:max-w-[85%] leading-relaxed pointer-events-none pl-8 pr-0 md:px-2"
                  style={{
                    fontFamily: "'Josefin Sans', sans-serif",
                    filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 6px hsla(0,0%,0%,0.9)) drop-shadow(0 2px 12px hsla(0,0%,0%,0.7)) drop-shadow(0 4px 24px hsla(0,0%,0%,0.4))",
                  }}
                >
                  {hookText}
                </p>
              ) : undefined}
              rightSlot={undefined}
            />
          )}
        </div>
        )}

        <div
          className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${cardsHidden ? 'translate-x-full opacity-0 pointer-events-none max-h-0 overflow-hidden' : 'translate-x-0 opacity-100'}`}
        >

        {/* Note /20 + bouton + : centrés entre carrousel info et tabs */}
        {(avgOn20 != null && totalReviewCount > 0) || woDescription ? (
          <div className="slidepanel-center-short flex flex-col items-center justify-center pointer-events-auto gap-4 md:gap-10 flex-1 -mt-[3rem]">
            {hookText && <TypewriterHook text={hookText} key={businessId + '-hook'} />}
            {woDescription && (
              <div className="mt-8 md:mt-0 slidepanel-plus-short">
                <div
                  className="cursor-pointer group flex flex-col items-center gap-2"
                  onClick={() => setShowDescriptionOverlay(true)}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <span className="text-2xl text-white font-light leading-none">+</span>
                  </div>
                </div>
              </div>
            )}
            {avgOn20 != null && totalReviewCount > 0 && (
              <>
                {(() => {
                  const defaultReview = reviewTexts.find((r) => {
                    const displayText = ((language === "en" ? r.text_en : r.text_fr) || r.text || "").trim();
                    return r.is_default && displayText.length > 0;
                  });
                  if (!defaultReview) return null;
                  const displayText = ((language === "en" ? defaultReview.text_en : defaultReview.text_fr) || defaultReview.text || "").trim();
                  return (
                    <div
                      className="text-center max-w-[95%] md:max-w-xl pl-8 pr-0 md:px-0 cursor-pointer slidepanel-review-short"
                      onClick={handleOpenReviews}
                      style={{
                        fontFamily: "'Josefin Sans', sans-serif",
                        filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 6px hsla(0,0%,0%,0.9)) drop-shadow(0 2px 12px hsla(0,0%,0%,0.7)) drop-shadow(0 4px 24px hsla(0,0%,0%,0.4))",
                      }}
                    >
                      <p className="text-base md:text-lg text-white/90 italic leading-relaxed line-clamp-4">
                        "{displayText}"
                      </p>
                      {defaultReview.author_name && (
                        <p className="text-sm md:text-base text-white mt-1.5 capitalize">— {defaultReview.author_name.toLowerCase()}</p>
                      )}
                    </div>
                  );
                })()}
                <div
                  key={`rating-${business?.id}`}
                  className="flex items-center justify-center gap-1.5 md:gap-2.5 py-1 md:py-1.5 px-3 md:px-4 rounded-full border-2 border-gold cursor-pointer flex-wrap slidepanel-rating-short backdrop-blur-sm bg-white/5"
                  onClick={handleOpenReviews}
                  style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                >
                  <div className="flex items-center gap-1.5 md:gap-2.5">
                    <Star className="h-5 w-5 md:h-7 md:w-7 text-gold fill-gold" />
                    <span className="text-2xl md:text-4xl font-black text-gold whitespace-nowrap" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                      {avgOn20}<span className="text-sm md:text-xl font-semibold text-white/60">/20</span>
                    </span>
                  </div>
                  <span className="text-[10px] md:text-sm text-white/60 font-medium whitespace-nowrap" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                    · {totalReviewCount.toLocaleString("fr-FR")} {language === "en" ? "reviews" : "avis"}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Bottom carousel removed — all sections now accessible via description overlay grid */}
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
          onClosePanel={onClose}
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
          bookingCta={ctaConfig.bookingCta}
          shopCta={ctaConfig.shopCta}
          url4Cta={ctaConfig.url4Cta}
          url5Cta={ctaConfig.url5Cta}
          bookingCtaLabel={ctaConfig.bookingCtaLabel}
          shopCtaLabel={ctaConfig.shopCtaLabel}
          url4CtaLabel={ctaConfig.url4CtaLabel}
          url5CtaLabel={ctaConfig.url5CtaLabel}
          appStoreLinks={ctaConfig.appStoreLinks}
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
          setYtBgMuted={(m: boolean) => { setYtBgMuted(m); setGlobalSoundOn(!m); }}
          setShowDirections={setShowDirections}
          setShowBookingOverlay={setShowBookingOverlay}
          setBookingOverlayLoaded={setBookingOverlayLoaded}
          setBookingOverlayUrl={setBookingOverlayUrl}
          setBookingOverlayTitle={setBookingOverlayTitle}
          setActiveBusinessId={setActiveBusinessId}
          hideVideoControls={showSearchBar}
        />

      </div>

      {/* Spotify Overlay */}
      {showSpotifyOverlay && business?.spotify_url && (
        <SpotifyOverlay
          url={business.spotify_url}
          businessName={business.name}
          language={language}
          onClose={() => setShowSpotifyOverlay(false)}
        />
      )}

      {/* SoundCloud Overlay */}
      {showSoundCloudOverlay && business?.soundcloud_url && (
        <SoundCloudOverlay
          url={business.soundcloud_url}
          businessName={business.name}
          language={language}
          onClose={() => setShowSoundCloudOverlay(false)}
        />
      )}

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

      {/* External Videos Overlay (long-form YouTube videos linked to this business/POI) */}
      {showExternalVideosOverlay && (
        <ExternalVideosOverlay
          videos={externalVideoDocs.map((d: any) => ({
            url: d.url,
            name: d.name ?? null,
            thumbnail_url: d.thumbnail_url ?? null,
            description: d.description ?? null,
          }))}
          businessName={business?.name}
          onClose={() => setShowExternalVideosOverlay(false)}
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
      {showBookingOverlay && (bookingOverlayUrl || ctaConfig.bookUrl) && (() => {
        const overlayUrl = bookingOverlayUrl || ctaConfig.bookUrl!;
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

      {/* Availability Search Overlay */}
      {showAvailabilitySearch && (
        <AvailabilitySearchOverlay
          language={language}
          isSearching={hotelSearchLoading}
          initialCheckIn={fallbackPanelData?.checkIn ?? initialAvailabilityCheckIn}
          initialCheckOut={fallbackPanelData?.checkOut ?? initialAvailabilityCheckOut}
          initialAdults={fallbackPanelData?.adults ?? initialAvailabilityAdults}
          onSearch={(checkIn, checkOut, adults) => {
            handleCheckAvailability(checkIn, checkOut, adults);
          }}
          onClose={() => setShowAvailabilitySearch(false)}
        />
      )}

      {/* Hours Overlay */}
      {showHoursOverlay && business && (
        <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowHoursOverlay(false)}>
          <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-[22rem] max-w-[95vw] text-white animate-zoom-out-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {language === "en" ? "Opening hours" : language === "ar" ? "أوقات العمل" : "Horaires d'ouverture"}
              </p>
              <button onClick={() => setShowHoursOverlay(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <HoursOverlayContent business={business} language={language} />
          </div>
        </div>
      )}

      {/* Full Description Overlay */}
      {showDescriptionOverlay && woDescription && (
        <OverlayShell zClass="z-[80]" animClass="animate-zoom-out-center" className="flex flex-col">
          {images[0] && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${images[0]})` }}
            >
              {(() => {
                const isReviews = !!descOverlayContent?.title && /^(avis|customer)/i.test(descOverlayContent.title);
                const overlayClass = isReviews ? 'bg-black/70' : (descGridSection ? 'bg-black/75' : 'bg-black/70');
                return <div className={`absolute inset-0 transition-colors duration-300 ${overlayClass}`} />;
              })()}
            </div>
          )}
          {!images[0] && <div className="absolute inset-0 bg-background" />}
          {!selectedPoiBusinessId && !selectedKpBusinessId && (
          <div className="relative z-30 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent backdrop-blur-sm border-b border-white/10 order-[-2]">
            <button onClick={() => { if (descGridSection && !descOverlayDirect) { setDescGridSection(null); setDescGridPage(0); } else if (descOverlayContent && !descOverlayDirect) { setDescOverlayContent(null); } else { setShowDescriptionOverlay(false); setDescOverlayContent(null); setDescOverlayDirect(false); setDescGridSection(null); setDescGridPage(0); } }} className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold uppercase font-['Josefin_Sans',sans-serif] truncate text-white flex-1">{business?.name}</h2>
          </div>
          )}
          <div className="relative z-10 flex-1 min-h-0 order-[-1]" style={{ perspective: "1200px" }}>
            {descGridSection ? (() => {
              const isMobileGrid = typeof window !== "undefined" && window.innerWidth < 768;
              const GRID_PAGE_SIZE = isMobileGrid ? 8 : 9;

              // Build items array based on active section
              type GridItem = { key: string; imgUrl: string | null; label?: string; onClick: () => void; playIcon?: boolean; masterStar?: boolean; videoFallbackUrl?: string };
              let gridItems: GridItem[] = [];

              if (descGridSection === "images") {
                gridItems = images.map((img, i) => ({
                  key: `img-${i}`,
                  imgUrl: img,
                  onClick: () => { const mi = mediaItems.findIndex(m => m.kind === "image" && m.url === img); setLightboxIndex(mi >= 0 ? mi : i); setIsLightboxOpen(true); },
                }));
              } else if (descGridSection === "videos") {
                // Reorder videoDocs to match allVideoUrls order (own → linked → external)
                const urlOrder = new Map(allVideoUrls.map((u, i) => [u, i]));
                const sortedVideoDocs = [...videoDocs].sort(
                  (a, b) => (urlOrder.get(a.url) ?? 999) - (urlOrder.get(b.url) ?? 999)
                );
                gridItems = sortedVideoDocs.map((vid, i) => {
                  const ytMatch = vid.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
                  const vimeoMatch = vid.url.match(/vimeo\.com\/(\d+)/);
                  const thumb = vid.thumbnail_url || (ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null) || (vimeoMatch ? `https://vumbnail.com/${vimeoMatch[1]}.jpg` : null);
                  const isHostedFile = !thumb && !ytMatch && !vimeoMatch;
                  return {
                    key: `vid-${i}`,
                    imgUrl: thumb,
                    videoFallbackUrl: isHostedFile ? vid.url : undefined,
                    label: vid.name || undefined,
                    playIcon: true,
                    onClick: () => setActiveVideoOverlay({ url: vid.url, name: vid.name, description: vid.description }),
                  } as GridItem;
                });
              } else if (descGridSection === "poi") {
                gridItems = poiBusinesses.map((poi) => ({
                  key: `poi-${poi.id}`,
                  imgUrl: poi.images?.filter(Boolean)?.[0] || (poi as any).logo_url || null,
                  label: poi.name,
                  onClick: () => setSelectedPoiBusinessId(poi.id),
                }));
              } else if (descGridSection === "dest") {
                gridItems = destinations.map((dest) => ({
                  key: `dest-${dest.id}`,
                  imgUrl: dest.images?.filter(Boolean)?.[0] || dest.image_url || null,
                  label: language === "en" ? (dest.name_en || dest.name_fr) : dest.name_fr,
                  onClick: () => setSelectedDestinationId(dest.id),
                }));
              } else if (descGridSection === "kp_subcat") {
                gridItems = kpSubcategoryItems.map((rel) => ({
                  key: `kps-${rel.id}`,
                  imgUrl: rel.images?.filter(Boolean)?.[0] || rel.logo_url || null,
                  label: rel.name,
                  masterStar: rel.is_master,
                  onClick: () => setSelectedKpBusinessId(rel.id),
                }));
              } else if (descGridSection === "kp") {
                gridItems = kpRelated.map((rel) => ({
                  key: `kp-${rel.id}`,
                  imgUrl: rel.images?.filter(Boolean)?.[0] || rel.logo_url || null,
                  label: rel.name,
                  masterStar: rel.is_master,
                  onClick: () => setSelectedKpBusinessId(rel.id),
                }));
              }

              const totalGridPages = Math.max(1, Math.ceil(gridItems.length / GRID_PAGE_SIZE));
              const currentPageItems = gridItems.slice(descGridPage * GRID_PAGE_SIZE, (descGridPage + 1) * GRID_PAGE_SIZE);
              const globalOffset = descGridPage * GRID_PAGE_SIZE;

              return (
                <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
                  {totalGridPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pb-2">
                      <button
                        onClick={() => { playWoosh(wooshSfx); setDescGridPage(p => p - 1); }}
                        disabled={descGridPage === 0}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-white text-xs font-medium font-['Josefin_Sans',sans-serif] min-w-[2rem] text-center">
                        {descGridPage + 1} / {totalGridPages}
                      </span>
                      <button
                        onClick={() => { playWoosh(wooshSfx); setDescGridPage(p => p + 1); }}
                        disabled={descGridPage >= totalGridPages - 1}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <div className="w-full max-w-3xl mx-auto px-3 md:px-3 relative" style={{ perspective: "1200px", maxWidth: isMobileGrid ? "85%" : undefined }}>
                    <div
                      key={`${descGridSection}-${descGridPage}`}
                      style={{
                        animation: "0.5s cubic-bezier(0.4, 0, 0.2, 1) both",
                        animationName: "descGridFlip",
                      }}
                    >
                      <div className="px-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 grid-rows-4 md:grid-rows-3 gap-1.5">
                          {currentPageItems.map((item, i) => {
                            const realIndex = globalOffset + i;
                            return (
                              <div
                                key={item.key}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                                onClick={item.onClick}
                              >
                                {item.imgUrl ? (
                                  <img src={item.imgUrl} alt={item.label || `${realIndex + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                                ) : item.videoFallbackUrl ? (
                                  <VideoThumbnail src={item.videoFallbackUrl} alt={item.label} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                    {descGridSection === "videos" ? <Play className="h-8 w-8 text-white/40" /> : <MapPin className="h-8 w-8 text-white/40" />}
                                  </div>
                                )}
                                {item.playIcon && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                      <Play className="h-5 w-5 text-white fill-white" />
                                    </div>
                                  </div>
                                )}
                                {item.label && (
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 pointer-events-none">
                                    <p className="text-[11px] font-medium text-white truncate font-['Josefin_Sans',sans-serif]">
                                      {item.masterStar && <span className="text-gold mr-1">★</span>}
                                      {item.label}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="w-full h-full overflow-y-auto overscroll-contain">
                <div className={`px-4 pt-4 pb-6 md:pl-6 md:pt-6 ${descOverlayContent ? 'pr-4 md:pr-6' : 'pr-14 md:pr-16'}`}>
                  {descOverlayContent && (
                    <>
                      {!(descOverlayContent.title?.toLowerCase().startsWith("avis") || descOverlayContent.title?.toLowerCase().startsWith("customer")) && (
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="h-4 w-4 text-gold shrink-0" />
                          <h3 className="text-sm font-bold uppercase font-['Josefin_Sans',sans-serif] text-white">{descOverlayContent.title}</h3>
                        </div>
                      )}
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
                            <div className="flex-1 min-w-[140px] rounded-xl border border-terracotta/20 backdrop-blur-md px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.80)' }}>
                              <span className="block text-[10px] font-extrabold uppercase tracking-widest font-['Josefin_Sans',sans-serif] text-terracotta/70 mb-1">Détail des prix</span>
                              <div className="rich-price-html text-sm font-normal leading-relaxed whitespace-pre-line text-terracotta [&_li]:text-base [&_p]:text-base" style={{ fontSize: '0.925rem' }} dangerouslySetInnerHTML={{ __html: descOverlayContent.priceDetails.replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:2em;line-height:1">$1</span>') }} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                   <div
                    className="prose prose-invert prose-base max-w-none break-words text-base leading-[1.625] font-['Roboto',sans-serif] prose-josefin-headings prose-h2:text-base md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h2]:!uppercase [&_h3]:!font-bold [&_p:empty]:min-h-[1em] [&_table]:border-collapse [&_table]:w-full [&_table]:table-fixed [&_td]:border [&_td]:border-white/20 [&_td]:p-4 [&_td]:align-top [&_td]:text-xs [&_td_img]:w-full [&_td_img]:h-36 [&_td_img]:object-cover [&_td_img]:rounded-md [&_td_img]:block [&_th]:border [&_th]:border-white/20 [&_th]:p-2 [&_th]:bg-white/10 [&_th]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_iframe]:max-w-full [&_iframe]:rounded-md [&_mark]:bg-yellow-500/40 [&_mark]:px-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_hr]:border-white/20 prose-strong:!text-white [&_.img-h2-row]:flex [&_.img-h2-row]:items-center [&_.img-h2-row]:gap-3 [&_.img-h2-row]:my-4 [&_.img-h2-row_img]:!my-0 [&_.img-h2-row_img]:h-10 [&_.img-h2-row_img]:w-10 [&_.img-h2-row_img]:object-contain [&_.img-h2-row_img]:shrink-0 [&_.img-h2-row_h2]:!my-0"
                    dangerouslySetInnerHTML={{ __html: groupImagesWithHeadings((descOverlayContent ? descOverlayContent.html : woDescription)).replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:1.6em;line-height:1;vertical-align:middle">$1</span>') }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Right sticky sidebar */}
          {!descGridSection && !descOverlayContent && (menuDocs.length > 0 || menuSummaries.length > 0 || externalLinks.length > 0 || hasReviewsCard) && (() => {
            const groups: { key: string; icon: React.ReactNode; directClick?: () => void; items: { label: string; logo?: string | null; onClick: () => void }[]; tooltip?: string }[] = [];
            if (menuDocs.length > 0) groups.push({
              key: 'menu',
              icon: <span className="flex items-center justify-center w-6 h-6">{categoryIcon ? <DynamicIcon name={categoryIcon} size={22} /> : <Newspaper className="h-[22px] w-[22px]" />}</span>,
              items: menuDocs.map(doc => ({ label: doc.name || 'Menu', onClick: () => { openDocOrBooking(doc.url, doc.name || 'Menu'); } })),
            });
            // Menu IA group removed (per user request)
            if (externalLinks.length > 0) {
              const extDesc = externalLinks[0]?.description?.toLowerCase() || "";
              const extIcon = (extDesc === "presse" || extDesc === "media")
                ? <Newspaper className="h-[22px] w-[22px]" />
                : <ExternalLink className="h-[22px] w-[22px]" />;
              groups.push({
                key: 'ext',
                icon: extIcon,
                items: externalLinks.map(link => ({
                  label: link.name || 'Lien',
                  logo: link.icon,
                  onClick: () => {
                    if (link.url && link.url !== '#' && link.url !== '*') {
                      openDocOrBooking(link.url, link.name || 'Lien', true);
                    } else {
                      setExtLinksOrigin('description');
                      setShowExtLinksOverlay(true);
                    }
                    setSidebarOpenGroup(null);
                  },
                })),
              });
            }
            // Avis clients group removed (per user request)
            return (
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-end"
                onMouseLeave={() => setSidebarOpenGroup(null)}
              >
                {groups.filter(g => g.key === 'ai' || g.key === 'reviews').map(g => {
                  if (g.directClick) {
                    return (
                      <div key={g.key} className="group relative flex flex-col items-end"
                        onMouseEnter={() => setSidebarOpenGroup(null)}
                      >
                        <button
                          onClick={g.directClick}
                          className="flex items-center justify-center h-10 rounded-l-full border border-r-0 border-white/10 text-white transition-colors shadow-[−8px_4px_12px_rgba(0,0,0,0.3)] bg-black/80 hover:bg-black/90 pl-3 pr-4"
                        >
                          {g.icon}
                        </button>
                        {g.tooltip && (
                          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/90 px-2.5 py-1 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                    >
                      <button
                        className={`flex items-center justify-center h-10 rounded-l-full border border-r-0 border-white/10 text-white transition-colors shadow-[−8px_4px_12px_rgba(0,0,0,0.3)] pl-3 pr-4 ${isOpen ? 'bg-black/90' : 'bg-black/80 hover:bg-black/90'}`}
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
                            className="flex items-center justify-center h-10 rounded-l-full bg-white/20 backdrop-blur-md border border-r-0 border-white/10 text-white hover:bg-white/35 transition-colors shadow-[−8px_4px_12px_rgba(0,0,0,0.3)] whitespace-nowrap px-3"
                          >
                            {item.logo ? (
                              <img src={item.logo} alt={item.label} className="h-6 max-w-[5rem] object-contain" loading="lazy" />
                            ) : (
                              <span className="text-[11px] font-medium">{item.label}</span>
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
          {/* Social / Menu / External links strip */}
          {!descGridSection && (() => {
            const socialItems: { name: string; url: string; icon: React.ReactNode }[] = [
              business?.instagram_url && { name: "Instagram", url: business.instagram_url, icon: <InstagramIcon className="h-4 w-4" /> },
              business?.facebook_url && { name: "Facebook", url: business.facebook_url, icon: <FacebookIcon className="h-4 w-4" /> },
              business?.tiktok_url && { name: "TikTok", url: business.tiktok_url, icon: <TikTokIcon className="h-5 w-5" /> },
              business?.youtube_url && { name: "YouTube", url: business.youtube_url, icon: <YouTubeIcon className="h-4 w-4" /> },
              business?.twitter_url && { name: "X", url: business.twitter_url, icon: <TwitterIcon className="h-5 w-5" /> },
              business?.linkedin_url && { name: "LinkedIn", url: business.linkedin_url, icon: <LinkedInIcon className="h-5 w-5" /> },
              business?.pinterest_url && { name: "Pinterest", url: business.pinterest_url, icon: <PinterestIcon className="h-4 w-4" /> },
              business?.vimeo_url && { name: "Vimeo", url: business.vimeo_url, icon: <VimeoIcon className="h-4 w-4" /> },
              business?.snapchat_url && { name: "Snapchat", url: business.snapchat_url, icon: <SnapchatIcon className="h-4 w-4" /> },
            ].filter(Boolean) as { name: string; url: string; icon: React.ReactNode }[];
            const hasAnything = socialItems.length > 0 || menuDocs.length > 0 || externalLinks.length > 0;
            if (!hasAnything) return null;
            return (
              <div className="relative z-20 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-transparent backdrop-blur-sm border-t border-white/10 overflow-x-auto scrollbar-none">
                  {socialItems.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => window.open(s.url, "_blank", "noopener")}
                      className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
                      title={s.name}
                    >
                      {s.icon}
                    </button>
                  ))}
                  {socialItems.length > 0 && (menuDocs.length > 0 || externalLinks.length > 0) && (
                    <div className="shrink-0 w-px h-5 bg-white/20" />
                  )}
                  {menuDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => openDocOrBooking(doc.url, doc.name || 'Menu')}
                      className="shrink-0 h-8 px-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
                    >
                      {categoryIcon ? <DynamicIcon name={categoryIcon} size={14} /> : <Globe className="h-3.5 w-3.5" />}
                      <span className="text-[11px] font-medium uppercase font-['Josefin_Sans',sans-serif] whitespace-nowrap">{doc.name || 'Menu'}</span>
                    </button>
                  ))}
                  {externalLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => {
                        if (link.url && link.url !== '#' && link.url !== '*') {
                          openDocOrBooking(link.url, link.name || 'Lien', true);
                        }
                      }}
                      className={`shrink-0 h-8 flex items-center gap-1.5 rounded-full text-white transition-colors overflow-hidden ${link.icon ? 'bg-white hover:bg-white/90' : 'bg-white/15 hover:bg-white/30'}`}
                    >
                      {link.icon ? (
                        <img src={link.icon} alt={link.name || ''} className="h-8 w-8 object-contain rounded-full p-1" loading="lazy" />
                      ) : (
                        <span className="px-3 text-[11px] font-medium uppercase font-['Josefin_Sans',sans-serif] whitespace-nowrap">{link.name || 'Lien'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {images.length > 1 && !descGridSection && (
            <div className="relative z-20 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 md:py-2 bg-transparent backdrop-blur-sm border-t border-white/10">
              {images.slice(0, 5).map((img, i) => (
                  <div
                    key={i}
                    className={`relative w-[calc((100%-6px)/2)] md:w-[calc((100%-6*4px)/5)] shrink-0 aspect-[5/4] md:aspect-[4/3] lg:aspect-[3/2] rounded-md overflow-hidden cursor-pointer ${i >= 2 ? 'hidden md:block' : ''}`}
                    style={{ maxHeight: 'none' }}
                    onClick={() => { setDescGridSection("images"); setDescGridPage(0); }}
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
          <div className="shrink-0 h-[3.5rem] md:h-[3.75rem]" />
        </OverlayShell>
      )}

      {/* External Links Overlay */}
      {showExtLinksOverlay && externalLinks.length > 0 && (
        <OverlayShell zClass="z-[85]" desktopOnly={false} coverToolbar={false}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExtLinksOverlay(false)} />
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="pointer-events-auto relative">
              <button
                onClick={() => setShowExtLinksOverlay(false)}
                className="absolute -top-3 -right-3 z-20 h-8 w-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
                <ExternalLinksFlipCard
                links={externalLinks}
                animationDelay="0ms"
                variant="overlay"
                onClick={() => {}}
                onOpenUrl={(url, title) => { setShowExtLinksOverlay(false); openDocOrBooking(url, title || 'Lien', true); }}
              />
            </div>
          </div>
        </OverlayShell>
      )}

      {/* Directions overlay */}
      {showDirections && business && (
        <DirectionsOverlay
          business={business}
          onClose={() => setShowDirections(false)}
        />
      )}

      {/* Destination sub-panel */}
      {selectedDestinationId && (
        <div className="absolute inset-0 z-[80] bg-background">
          <DestinationSlidePanel
            destinationId={selectedDestinationId}
            onClose={() => { setSelectedDestinationId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); }}
            interceptCloseRef={destInterceptCloseRef}
            showSearchBar={showSearchBar}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
          />
        </div>
      )}

      {/* POI sub-panel */}
      {selectedPoiBusinessId && (
        <OverlayShell zClass="z-[85]" coverToolbar={false} animClass="animate-slide-up-from-bottom" bg="bg-background" className="flex flex-col">
          <SlidePanelHeader
            onClose={() => { setSelectedPoiBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); onMosaicStateChange?.(false); if (poiOpenedFromMapRef.current) poiOpenedFromMapRef.current = false; }}
            alwaysDark
            toolbarLeftId="poi-slide-panel-toolbar-left"
            toolbarCenterId="poi-slide-panel-toolbar-center"
            toolbarRightId="poi-slide-panel-toolbar"
          />
          <div className="flex-1 min-h-0">
            <BookOnlineSlidePanel
              businessId={selectedPoiBusinessId}
              onClose={() => { setSelectedPoiBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); onMosaicStateChange?.(false); if (poiOpenedFromMapRef.current) poiOpenedFromMapRef.current = false; }}
              showSearchBar={showSearchBar}
              onSearch={onSearch}
              onSearchBusinessSelect={onSearchBusinessSelect}
              onHotelSearch={onHotelSearch}
              onMosaicStateChange={onMosaicStateChange}
              propagateMosaicState
              toolbarPortalPrefix="poi"
            />
          </div>
        </OverlayShell>
      )}

      {/* KP sub-panel */}
      {selectedKpBusinessId && (
         <OverlayShell zClass="z-[85]" coverToolbar={false} animClass="animate-slide-up-from-bottom" bg="bg-background" className="flex flex-col">
          <SlidePanelHeader
            onClose={() => { setSelectedKpBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); onMosaicStateChange?.(false); }}
            alwaysDark
            toolbarLeftId="kp-slide-panel-toolbar-left"
            toolbarCenterId="kp-slide-panel-toolbar-center"
            toolbarRightId="kp-slide-panel-toolbar"
          />
          <div className="flex-1 min-h-0">
            <BookOnlineSlidePanel
              businessId={selectedKpBusinessId}
              onClose={() => { setSelectedKpBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); onMosaicStateChange?.(false); }}
              interceptCloseRef={kpInterceptCloseRef}
              showSearchBar={showSearchBar}
              onSearch={onSearch}
              onSearchBusinessSelect={onSearchBusinessSelect}
              onHotelSearch={onHotelSearch}
              onMosaicStateChange={onMosaicStateChange}
              propagateMosaicState
              toolbarPortalPrefix="kp"
            />
          </div>
        </OverlayShell>
      )}

      {showPoiMapOverlay && (
        <OverlayShell zClass="z-[80]" desktopOnly={false} animClass="animate-slide-up-from-bottom">
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
        </OverlayShell>
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
        <OverlayShell zClass="z-[76]" desktopOnly={false}>
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
        </OverlayShell>
      )}
      {/* Search bar */}
      {showSearchBar && (
        <PanelSearchBar
          iconVariant="black"
          onSearch={onSearch}
          onBusinessSelect={onSearchBusinessSelect}
            onHotelSearch={onHotelSearch}
          businessCity={business?.city}
          businessCategory={business?.main_category}
          businessName={business?.name}
          onOverlayChange={setSearchOverlayActive}
          darkBackground={true}
          closeTrigger={closeTrigger}
          compact
          onSeeResults={onClose}
          leadingControls={
            effectiveMedia?.kind === "video" && videoInfo?.type === "file" ? (
              <VideoControls
                type="file"
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                paused={videoPaused}
                muted={videoMuted}
              />
            ) : effectiveMedia?.kind === "video" && videoInfo?.type === "youtube" && !cardsHidden ? (
              <VideoControls
                type="youtube"
                iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>}
                playing={ytBgPlaying}
                muted={ytBgMuted}
                onPlayingChange={setYtBgPlaying}
                onMutedChange={(m) => { setYtBgMuted(m); setGlobalSoundOn(!m); }}
              />
            ) : undefined
          }
        />
      )}

    </div>
  );
};

/** Inline opening hours display for the hours overlay */
function HoursOverlayContent({ business, language }: { business: any; language: string }) {
  const frToEn: Record<string, string> = {
    lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
    vendredi: "friday", samedi: "saturday", dimanche: "sunday",
  };
  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayNames: Record<string, Record<string, string>> = {
    fr: { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" },
    en: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" },
    ar: { monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت", sunday: "الأحد" },
  };
  const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const rawHours = business.opening_hours as Record<string, any> | null;
  const hours = rawHours ? Object.entries(rawHours).reduce((acc, [k, v]) => { acc[frToEn[k] || k] = v; return acc; }, {} as Record<string, any>) : null;
  const now = new Date();
  const todayKey = dayOrder[now.getDay()];
  const names = dayNames[language] || dayNames.fr;

  if (business.is_open_24h) {
    return <p className="text-white/80 text-sm">{language === "en" ? "Open 24/7" : language === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24"}</p>;
  }
  if (!hours) return <p className="text-white/50 text-sm">{language === "en" ? "No hours available" : "Aucun horaire disponible"}</p>;

  return (
    <div className="space-y-1.5">
      {displayOrder.map(day => {
        const dh = hours[day];
        const isToday = day === todayKey;
        const closed = !dh || dh.closed;
        const closedLabel = language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé";
        let timeStr = closedLabel;
        if (dh && !dh.closed && dh.open && dh.close) {
          timeStr = `${dh.open} - ${dh.close}`;
          if (dh.open2 && dh.close2 && !dh.continuous) timeStr += ` / ${dh.open2} - ${dh.close2}`;
          if (dh.continuous) timeStr += language === "en" ? " (continuous)" : " (continu)";
        }
        return (
          <div key={day} className={`flex justify-between text-sm ${isToday ? "font-bold text-white" : closed ? "text-white/30" : "text-white/70"}`}>
            <span>{names[day]}{isToday ? " ●" : ""}</span>
            <span>{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}

export default BookOnlineSlidePanel;
