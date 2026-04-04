import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import { createPortal } from "react-dom";
import { ExternalLink, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, CalendarCheck, ShoppingBag, Star, Minimize2, Loader2, Volume2, VolumeX, Play, Pause, Phone } from "lucide-react";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentlyOpen } from "@/lib/formatOpeningHours";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import poiNearbyImg from "@/assets/poi-nearby.webp";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";

import { whatsappUrl } from "@/lib/phoneUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import { getVideoEmbed } from "@/lib/videoEmbed";
import ContactFlipCard from "@/components/cards/ContactFlipCard";
import ReviewsFlipCard from "@/components/cards/ReviewsFlipCard";
import ExternalLinksFlipCard from "@/components/cards/ExternalLinksFlipCard";
import SocialLinksCard from "@/components/cards/SocialLinksCard";
import MenuSummaryCard from "@/components/cards/MenuSummaryCard";

import MenuUrlCard from "@/components/cards/MenuUrlCard";
import MapCard from "@/components/cards/MapCard";
import DirectionsOverlay from "@/components/DirectionsOverlay";
import MosaicOverlay from "@/components/MosaicOverlay";
import YouTubeShortsCarousel, { type YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import { useNavigate } from "react-router-dom";
import { businessUrl } from "@/lib/businessUrl";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

// Extracted hook and overlay components
import { useBookOnlineData } from "@/hooks/useBookOnlineData";
import type { Destination } from "@/hooks/useBookOnlineData";
import VideoDocumentOverlay from "@/components/overlays/VideoDocumentOverlay";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import DocumentOverlay from "@/components/overlays/DocumentOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import SerpApiHotelOverlay from "@/components/SerpApiHotelOverlay";

interface BookOnlineSlidePanelProps {
  businessId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  externalOverlayActive?: boolean;
  /** When true, mute all background media (e.g. during voice search) */
  forceMuted?: boolean;
  /** Mutable ref: if set by the panel, the parent should call it instead of closing */
  interceptCloseRef?: React.MutableRefObject<(() => boolean) | null>;
}

type MediaItem = { kind: "video"; url: string; thumbnailUrl?: string | null } | { kind: "image"; url: string } | { kind: "matterport"; url: string };

const BookOnlineSlidePanel = ({ businessId: propBusinessId, onClose, isExpanded, onToggleExpand, externalOverlayActive, forceMuted, interceptCloseRef }: BookOnlineSlidePanelProps) => {
  const [activeBusinessId, setActiveBusinessId] = useState(propBusinessId);
  useEffect(() => { setActiveBusinessId(propBusinessId); setSerpApiOverlayCtx(null); setCameFromFallback(false); }, [propBusinessId]);
  const businessId = activeBusinessId;
  const [cameFromFallback, setCameFromFallback] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Data hook — replaces the massive fetch useEffect
  const {
    business, woDescription, destinations, poiBusinesses, isLoading,
    reviewTexts, externalLinks, menuSummaries, menuDocs, videoDocs,
    allVideoUrls, categoryIcon, showGoogleMap, kpRelated, isKp1Only, liteApiHotelId, serpApiMapping, isHotelWithPrice,
  } = useBookOnlineData(businessId);

  // UI state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string | undefined>(undefined);
  const [docOverlay, setDocOverlay] = useState<{ url: string; name: string; type: 'pdf' | 'flipbook'; ts: number } | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedPoiBusinessId, setSelectedPoiBusinessId] = useState<string | null>(null);
  const [showPoiMapOverlay, setShowPoiMapOverlay] = useState(false);
  const poiOpenedFromMapRef = useRef(false);
  const [activeVideoOverlay, setActiveVideoOverlay] = useState<{ url: string; name: string | null; description: string | null } | null>(null);
  const [videoOverlayClosing, setVideoOverlayClosing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showHook, setShowHook] = useState(false);
  const [showMosaic, setShowMosaic] = useState(false);
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
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const fallbackDataRef = useRef<FallbackPanelData | null>(null);
  useEffect(() => {
    if (fallbackPanelData) fallbackDataRef.current = fallbackPanelData;
  }, [fallbackPanelData]);

  // Expose close interceptor: when navigated from fallback, reopen fallback list instead of closing panel
  useEffect(() => {
    if (!interceptCloseRef) return;
    if (cameFromFallback && fallbackDataRef.current) {
      interceptCloseRef.current = () => {
        if (!fallbackPanelData && fallbackDataRef.current) {
          setFallbackPanelData(fallbackDataRef.current);
        }
        setFallbackHiddenOnMobile(false);
        setShowFallbackOverlay(true);
        return true; // intercepted
      };
    } else {
      interceptCloseRef.current = null;
    }
  }, [cameFromFallback, fallbackPanelData, interceptCloseRef]);
  const hideCardsRef = useRef<() => void>(() => {});

  // Whether this business has a SerpAPI mapping
  const hasSerpMapping = !!serpApiMapping || !!liteApiHotelId;

  // Unified hotel availability search: always calls SerpAPI to verify real availability
  const handleCheckAvailability = useCallback(async (checkIn: string, checkOut: string, adults: number) => {
    if (!business) return;
    setHotelSearchLoading(true);
    const isMobileOrTablet = typeof window !== "undefined" && window.innerWidth < 1024;

    const openFallback = (data: FallbackPanelData) => {
      if (isMobileOrTablet) setShowTransitionOverlay(true);
      setFallbackPanelData(data);
      setSelectedFallbackHotelId(null);
      setFallbackHiddenOnMobile(false);
      hideCardsRef.current();
    };

    try {
      const cityName = serpApiMapping?.city || business.city || "";
      if (!cityName) throw new Error("City not found");

      // Non-mapped hotel: skip SerpAPI, show unavailability after 500ms
      if (!hasSerpMapping) {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch mapped hotels for the city to show as alternatives
        const [mappingResult, gammeResult] = await Promise.all([
          supabase.from("hotel_mappings").select("id, serp_hotel_name, business_id, city").ilike("city", cityName),
          supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
        ]);

        const allMappings = (mappingResult.data || []) as any[];
        const gammes = gammeResult.data || [];

        // Get business data for mapped hotels
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

      // Align with backoffice flow: SerpAPI raw results intersected with exact hotel_mappings
      // Fetch mappings first to determine optimal maxPages
      const [mappingResult, gammeResult] = await Promise.all([
        supabase
          .from("hotel_mappings")
          .select("id, serp_hotel_name, business_id, city")
          .ilike("city", cityName),
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      ]);

      const allMappings = (mappingResult.data || []) as any[];
      // Calculate maxPages: ~20 results per page, cap based on mapped hotel count
      const mappedCount = allMappings.length;
      const optimalMaxPages = Math.max(1, Math.ceil(mappedCount / 20));

      const serpResult = await supabase.functions.invoke("serpapi-hotels", {
        body: {
          cityName,
          checkIn, checkOut, adults,
          currency: "EUR",
          maxPages: optimalMaxPages,
        },
      });

      const serpHotels = (serpResult.data?.data || []) as any[];
      const gammes = gammeResult.data || [];
      const gammeMap = new Map(gammes.map((g: any) => [g.id, g]));

      // Front logic must stay aligned with backoffice: exact intersection only
      const serpByExactName = new Map<string, any>();
      for (const hotel of serpHotels) {
        const hotelName = typeof hotel.name === "string" ? hotel.name.trim().toLowerCase() : "";
        if (hotelName && !serpByExactName.has(hotelName)) {
          serpByExactName.set(hotelName, hotel);
        }
      }

      const availableMatches = new Map<string, { mapping: any; serpMatch: any }>();
      for (const mapping of allMappings) {
        const mappingName = typeof mapping.serp_hotel_name === "string"
          ? mapping.serp_hotel_name.trim().toLowerCase()
          : "";
        if (!mapping.business_id || !mappingName || availableMatches.has(mapping.business_id)) {
          continue;
        }
        const serpMatch = serpByExactName.get(mappingName);
        if (serpMatch) {
          availableMatches.set(mapping.business_id, { mapping, serpMatch });
        }
      }

      const availableBizIds = [...availableMatches.keys()];

      // Fetch all available mapped businesses in one go
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

      // Sort: current hotel first, then verified, then by rating
      hotels.sort((a, b) => {
        if (a.isCurrentHotel !== b.isCurrentHotel) return a.isCurrentHotel ? -1 : 1;
        const aVerified = a.wtuce_status === "verified" ? 1 : 0;
        const bVerified = b.wtuce_status === "verified" ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        const aRating = a.dbBusiness?.computed_rating || 0;
        const bRating = b.dbBusiness?.computed_rating || 0;
        return bRating - aRating;
      });

      if (hotels.length > 0) {
        openFallback({
          hotels,
          city: cityName,
          checkIn, checkOut, adults,
          source: "serpapi",
          gammes: gammes.map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
        });
      } else {
        // No availability found at all
        hideCardsRef.current();
        openFallback({
          hotels: [],
          city: cityName,
          checkIn, checkOut, adults,
          source: "serpapi",
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
  }, [business, businessId, serpApiMapping, language, hasSerpMapping]);

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

  // Track recently viewed when business loads in slide panel
  useEffect(() => {
    if (business) {
      window.dispatchEvent(new CustomEvent("track-business-view", {
        detail: {
          id: business.id,
          name: business.name,
          images: business.images,
          logo_url: business.logo_url,
          city: business.city,
          slug: (business as any).slug || business.id,
        },
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const keepMutedRef = useRef(false);
  const muteLockSrcRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrcRef = useRef<string>("");
  const overlayWasOpenRef = useRef(false);

  // Reset media mute/overlay refs when business changes (new search result).
  useEffect(() => {
    keepMutedRef.current = false;
    muteLockSrcRef.current = null;
    overlayWasOpenRef.current = false;
    iframeSrcRef.current = "";
  }, [businessId]);

  // Force-mute background media when parent requests it (e.g. voice search active)
  useEffect(() => {
    if (forceMuted) {
      if (videoRef.current) videoRef.current.muted = true;
      if (iframeRef.current) {
        iframeSrcRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
    } else if (!forceMuted && iframeRef.current && !iframeRef.current.src && iframeSrcRef.current) {
      // Restore iframe when force mute ends
      const restoredMutedSrc = iframeSrcRef.current
        .replace(/([?&])mute=\d/i, "$1mute=1")
        .replace(/([?&])controls=\d/i, "$1controls=0");
      iframeRef.current.src = restoredMutedSrc;
    }
  }, [forceMuted]);

  // Pause/resume background media when overlays open/close
  useEffect(() => {
    const overlayOpen = !!selectedDestinationId || !!selectedPoiBusinessId || !!docOverlay || showBookingOverlay || showYoutubeOverlay || showMosaic || !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay || showFallbackOverlay;

    if (overlayOpen) {
      overlayWasOpenRef.current = true;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
      }
      if (iframeRef.current) {
        iframeSrcRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
      return;
    }

    // Only keep muted when we are actually returning from an open overlay.
    if (overlayWasOpenRef.current) {
      keepMutedRef.current = true;
      if (videoRef.current) {
        videoRef.current.muted = true;
        muteLockSrcRef.current = videoRef.current.currentSrc || videoRef.current.src || null;
        videoRef.current.play().catch(() => {});
      }
      if (iframeRef.current && iframeSrcRef.current) {
        const restoredMutedSrc = iframeSrcRef.current
          .replace(/([?&])mute=\d/i, "$1mute=1")
          .replace(/([?&])controls=\d/i, "$1controls=0");
        iframeRef.current.src = restoredMutedSrc;
      }
      overlayWasOpenRef.current = false;
      return;
    }

    // Initial load / normal navigation: do not force mute.
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [selectedDestinationId, selectedPoiBusinessId, docOverlay, showBookingOverlay, showYoutubeOverlay, showMosaic, externalOverlayActive, showPoiMapOverlay, activeVideoOverlay, showFallbackOverlay]);

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
    return {
      avgOn20: business.computed_rating ?? null,
      totalReviewCount: business.total_review_count ?? 0,
    };
  }, [business]);

  const hasContactCard = !!(business?.phone || business?.whatsapp || business?.email || business?.website || business?.address);
  const hasReviewsCard = avgOn20 !== null && avgOn20 > 0;

  const openBadgeInfo = useMemo(() => {
    if (!business) return { text: null, isOpen: false };
    const canShow = !!business.show_opening_hours || !!business.is_open_24h;
    if (!canShow) return { text: null, isOpen: false };

    if (business.is_open_24h) {
      const label = language === "en" ? "Open 24/7" : language === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";
      return { text: label, isOpen: true };
    }

    const frToEn: Record<string, string> = {
      lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
      vendredi: "friday", samedi: "saturday", dimanche: "sunday",
    };
    const rawHours = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }> | null;
    if (!rawHours) return { text: null, isOpen: false };
    const hours = Object.entries(rawHours).reduce((acc, [k, v]) => {
      acc[frToEn[k] || k] = v;
      return acc;
    }, {} as Record<string, any>);

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const now = new Date();
    const todayKey = days[now.getDay()];
    const currentlyOpen = isCurrentlyOpen(todayKey ? hours[todayKey] : null);

    if (currentlyOpen) {
      const label = language === "en" ? "Open" : language === "ar" ? "مفتوح" : "Ouvert";
      return { text: label, isOpen: true };
    }

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dh = hours[todayKey];
    let foundToday = false;
    let badgeText: string | null = null;

    if (dh && !dh.closed && dh.open) {
      const [oh, om] = dh.open.split(":").map(Number);
      const openMin = oh * 60 + (om || 0);
      if (openMin > nowMin) {
        const prefix = language === "en" ? "Opens at" : language === "ar" ? "يفتح في" : "Ouvre à";
        badgeText = `${prefix} ${dh.open}`;
        foundToday = true;
      } else if (dh.open2 && dh.close2 && !dh.continuous) {
        const [oh2, om2] = dh.open2.split(":").map(Number);
        const open2Min = oh2 * 60 + (om2 || 0);
        if (open2Min > nowMin) {
          const prefix = language === "en" ? "Opens at" : language === "ar" ? "يفتح في" : "Ouvre à";
          badgeText = `${prefix} ${dh.open2}`;
          foundToday = true;
        }
      }
    }

    if (!foundToday) {
      const dayLabels = language === "en"
        ? ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."]
        : language === "ar"
          ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
          : ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
      for (let i = 1; i <= 7; i++) {
        const idx = (now.getDay() + i) % 7;
        const nextDh = hours[days[idx]];
        if (nextDh && !nextDh.closed && nextDh.open) {
          const prefix = language === "en" ? "Opens" : language === "ar" ? "يفتح" : "Ouvre";
          badgeText = `${prefix} ${dayLabels[idx]} ${language === "ar" ? "" : "à "}${nextDh.open}`;
          break;
        }
      }
    }

    if (badgeText) return { text: badgeText, isOpen: false };

    const closedLabel = language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé";
    return { text: closedLabel, isOpen: false };
  }, [business, language]);

  // Tabs-based bottom carousels — always show Vidéo and Autres établissements
  const hasVideosCarousel = videoDocs.length > 0;
  const hasYoutubeBottomCarousel = !!(business?.youtube_url && business?.show_youtube_tab && youtubeVideoCount !== 0);
  const hasYoutubeReady = !!(youtubeVideoCount && youtubeVideoCount > 0);
  const hasKpCarousel = kpRelated.length > 0;
  const hasDestCarousel = destinations.length > 0;
  const hasPoiCarousel = poiBusinesses.length >= 2;

  // Video tab label from carousel_badge
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

  type BottomTab = { id: "videos" | "youtube" | "kp" | "dest" | "poi"; label: string; hasContent: boolean };
  const hasKpCode = !!(business?.kp_regroupement?.trim() || business?.kp_regroupement_2?.trim());
  const bottomTabs = useMemo<BottomTab[]>(() => {
    const tabs: BottomTab[] = [];
    // Show Vidéo tab only when 2+ videos
    if (videoDocs.length >= 2) {
      tabs.push({ id: "videos", label: videoTabLabel, hasContent: hasVideosCarousel });
    }
    // YouTube tab only when configured
    if (hasYoutubeBottomCarousel) {
      tabs.push({ id: "youtube", label: "YouTube", hasContent: hasYoutubeReady || hasYoutubeBottomCarousel });
    }
    // Destinations tab only when content exists
    if (hasDestCarousel) {
      tabs.push({ id: "dest", label: "Destinations", hasContent: true });
    }
    // Show Autres établissements tab only when there are related businesses
    if (hasKpCarousel) {
      tabs.push({ id: "kp", label: language === "en" ? "Other establishments" : "Autres établissements", hasContent: true });
    }
    // POI tab only when content exists
    if (hasPoiCarousel) {
      tabs.push({ id: "poi", label: language === "en" ? "Nearby" : "À proximité", hasContent: true });
    }
    return tabs;
  }, [videoTabLabel, hasVideosCarousel, hasYoutubeBottomCarousel, hasYoutubeReady, hasKpCarousel, hasKpCode, hasDestCarousel, hasPoiCarousel, language, videoDocs.length]);

  const [activeBottomTab, setActiveBottomTab] = useState<string>("videos");
  const bottomTabInitialRef = useRef(true);
  // Reset to first available tab when business changes
  useEffect(() => { bottomTabInitialRef.current = true; }, [businessId]);
  useEffect(() => {
    if (bottomTabs.length > 0) {
      // Only commit to a tab selection once loading is complete to avoid selecting a partial first tab
      if (bottomTabInitialRef.current) {
        if (!isLoading) {
          setActiveBottomTab(bottomTabs[0].id);
          bottomTabInitialRef.current = false;
        }
      } else if (!bottomTabs.find(t => t.id === activeBottomTab)) {
        setActiveBottomTab(bottomTabs[0].id);
      }
    }
  }, [bottomTabs, businessId, isLoading]);
  const handleBottomTabChange = (tabId: string) => {
    bottomTabInitialRef.current = false;
    setActiveBottomTab(tabId);
  };
  const slideInClass = bottomTabInitialRef.current ? "animate-slide-in-left opacity-0" : "";

  const noBottomCarousel = false; // Tabs are always shown

  const hookText = useMemo(() => {
    if (!business) return null;
    const raw = language === "ar" && business.hook_ar ? business.hook_ar
      : language === "en" && business.hook_en ? business.hook_en
      : business.hook_fr;
    return raw?.trim() || null;
  }, [business, language]);

  useEffect(() => {
    if (!hookText) {
      setShowHook(false);
      return;
    }
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
    // Média prioritaire: show_videos → vidéos d'abord, prioritize_images → images d'abord, les deux à false → matterport d'abord
    if (business?.prioritize_images) {
      return [...imageItems, ...videoItems, ...matterportItems];
    }
    if (business?.show_videos) {
      return [...videoItems, ...imageItems, ...matterportItems];
    }
    // Visite 3D prioritaire (both false)
    return [...matterportItems, ...videoItems, ...imageItems];
  }, [videos, images, videoDocs, business?.prioritize_images, business?.show_videos, business?.matterport_url]);

  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  // In "Afficher" mode, override background to matterport if available
  const matterportItem = useMemo(() => mediaItems.find(m => m.kind === "matterport") || null, [mediaItems]);
  const effectiveMedia = (cardsHidden && matterportItem) ? matterportItem : currentMedia;

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  const videoInfo = effectiveMedia?.kind === "video" ? getVideoEmbed(effectiveMedia.url, window.location.origin, { background: true, defaultSoundOn: business?.default_sound_on ?? true }) : null;

  const [isFileVideoVertical, setIsFileVideoVertical] = useState(false);
  const isVerticalVideo = videoInfo ? (videoInfo.type === "file" ? isFileVideoVertical : videoInfo.isVertical) : false;

  // Listen for YouTube iframe API "ended" state
  useEffect(() => {
    if (!videoInfo || videoInfo.type !== "youtube" || totalMedia <= 1) return;
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) {
          goMedia(1);
        }
      } catch { /* ignore */ }
    };
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 0 }),
        "*"
      );
    }, 1000);
    window.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [videoInfo, totalMedia, goMedia]);

  const lightboxItems = useMemo<LightboxMediaItem[]>(() =>
    mediaItems.map((m) =>
      m.kind === "video"
        ? { type: "video" as const, src: m.url, alt: business?.name || "" }
        : m.kind === "matterport"
          ? { type: "matterport" as const, src: m.url, alt: `${business?.name || ""} – Visite 3D` }
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

  const ctaModeLabels: Record<string, { fr: string; en: string }> = {
    acheter_en_ligne: { fr: 'Acheter en ligne', en: 'Shop Online' },
    reserver_en_ligne: { fr: 'Réserver en ligne', en: 'Book Online' },
    consulter_offre: { fr: 'Consulter notre offre', en: 'View Our Offer' },
    plus_informations: { fr: "Plus d'informations", en: 'More Information' },
    contactez_nous: { fr: 'Contactez nous', en: 'Contact Us' },
  };

  const bookingCtaLabel = useMemo(() => {
    const mode = business?.presentation_mode || 'reserver_en_ligne';
    const pair = ctaModeLabels[mode] || ctaModeLabels.reserver_en_ligne;
    return language === 'en' ? pair.en : pair.fr;
  }, [business?.presentation_mode, language]);

  const shopCtaLabel = useMemo(() => {
    const mode = (business as any)?.online_shop_presentation_mode || 'acheter_en_ligne';
    const pair = ctaModeLabels[mode] || ctaModeLabels.acheter_en_ligne;
    return language === 'en' ? pair.en : pair.fr;
  }, [(business as any)?.online_shop_presentation_mode, language]);

  // --- Helper to open document or booking overlay ---
  const openDocOrBooking = useCallback((url: string, title?: string) => {
    const isPdf = url?.toLowerCase().endsWith('.pdf') || url?.includes('/pdfs/');
    const isFlipbook = /issuu\.com|calameo\.com/i.test(url || '');
    if (isPdf || isFlipbook) {
      setDocOverlay({ url, name: title || 'Document', type: isPdf ? 'pdf' : 'flipbook', ts: Date.now() });
    } else {
      setBookingOverlayUrl(url);
      setShowBookingOverlay(true);
      setBookingOverlayTitle(title);
    }
  }, []);

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

  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");
  const toolbarLeftPortal = document.getElementById("slide-panel-toolbar-left");

  const destName = (d: Destination) => language === "en" && d.name_en ? d.name_en : d.name_fr;

  return (
    <div className="h-full overflow-visible overscroll-none bg-black relative">
      {/* Portal media button into left of fixed bar */}
      {toolbarLeftPortal && createPortal(
        <div className="flex items-center gap-2">
          {serpApiOverlayCtxRef.current && activeBusinessId !== propBusinessId && (
            <button
              onClick={() => {
                const ctx = serpApiOverlayCtxRef.current;
                serpApiOverlayCtxRef.current = null;
                serpApiReturnBusinessIdRef.current = null;
                setActiveBusinessId(propBusinessId);
                setTimeout(() => setSerpApiOverlayCtx(ctx), 50);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-gold text-black shadow-md hover:bg-gold/90 transition-colors"
              title="Retour aux résultats SerpAPI"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {images.length >= 5 && (
            <button
              onClick={() => setShowMosaic((p) => !p)}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors"
              title={showMosaic ? "Fermer la mosaïque" : "Voir tous les médias"}
            >
              {showMosaic ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />
              )}
            </button>
          )}
          {youtubeVideoCount && youtubeVideoCount > 0 && (
            <button
              onClick={() => {
                const firstShort = allYoutubeVideos.find(v => v.isShort) || allYoutubeVideos[0] || null;
                if (firstShort) setActiveYoutubeVideo(firstShort);
                setShowYoutubeOverlay(true);
                setYoutubeIsPlaying(true);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
              title="Vidéos YouTube"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </button>
          )}
        </div>,
        toolbarLeftPortal
      )}
      {/* Portal WhatsApp/Phone icon into center */}
      {toolbarCenterPortal && (() => {
        const anyOverlay = showDirections || showBookingOverlay || !!docOverlay || !!selectedDestinationId || !!selectedPoiBusinessId || showPoiMapOverlay || !!activeVideoOverlay || isLightboxOpen || showMosaic || showYoutubeOverlay || !!availabilityOverlayCtx || !!serpApiOverlayCtx || showFallbackOverlay || !!externalOverlayActive;
        return createPortal(
          <div className="flex items-center gap-6">
            {business.whatsapp ? (
              <a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
                {!anyOverlay && (
                  <>
                    <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
                    <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
                    <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
                  </>
                )}
                <span className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full text-white" style={{ backgroundColor: "#25D366" }}>
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
              </a>
            ) : business.phone ? (
              <a href={`tel:${business.phone}`} className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
                {!anyOverlay && (
                  <>
                    <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(0,0,0,0.25)" }} />
                    <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
                    <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
                  </>
                )}
                <span className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background">
                  <Phone className="h-4 w-4" />
                </span>
              </a>
            ) : null}
          </div>,
          toolbarCenterPortal
        );
      })()}
      {/* Portal Share into right */}
      {toolbarPortal && createPortal(
        <ShareButton title={business.name} variant="dark" className="shrink-0" />,
        toolbarPortal
      )}

      {/* Full-bleed background */}
      <div className="absolute inset-0 z-0">
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
              {videoInfo?.type === "youtube" && !isVerticalVideo && (
                <>
                  <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
                </>
              )}
              <iframe
                ref={iframeRef}
                key={effectiveMedia.url}
                src={videoInfo?.embedUrl}
                className={videoInfo?.type === "youtube"
                  ? isVerticalVideo
                    ? "w-full h-full pointer-events-none"
                    : "w-full h-[calc(100%+40px)] -mt-16 pointer-events-none"
                  : "w-full h-full pointer-events-none"}
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

      {totalMedia > 1 && cardsHidden && (
        <>
          <button onClick={() => goMedia(-1)} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => goMedia(1)} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}


      {/* Overlaid content — always visible, carousels toggle */}
      <div
        className={`relative z-10 flex flex-col overflow-y-auto overscroll-contain h-full p-4 pt-12 md:p-6 md:pt-16 lg:pt-6 ${cardsHidden ? 'pb-0' : 'pb-8'} ${effectiveMedia?.kind === "matterport" ? "pointer-events-none" : ""}`}
        style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar: toggle, flags, rating */}
        <div key={businessId + '-topbar'} className="relative z-40 overflow-visible flex flex-col items-center pb-3 md:pb-3 pointer-events-auto animate-[slide-in-top_0.35s_ease-out_both] mt-1 md:mt-0">
          {cardsHidden ? (
            <div className="flex items-center gap-3">
              {totalMedia > 1 && (
                <button onClick={() => goMedia(-1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors"
                title="Afficher les cartes"
                aria-label="Afficher les cartes"
                onClick={(e) => { e.stopPropagation(); showCards(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Afficher</span>
                <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
              </button>
              {totalMedia > 1 && (
                <button onClick={() => goMedia(1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="relative w-full flex items-center justify-center">
              {languages.length > 0 && (
                <div className={`absolute left-0 z-50 flex items-center gap-0.5 md:gap-1.5 bg-black/40 backdrop-blur-sm rounded-xl py-1.5 px-2 md:px-2.5 md:rounded-full md:py-1 md:flex-wrap md:justify-center md:overflow-visible ${languages.length > 5 ? 'max-w-[7rem] overflow-x-auto' : ''} ${languages.length > 4 ? 'md:max-w-none md:overflow-visible' : ''}`} style={languages.length > 5 ? { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties : undefined}>
                  {languages.map((lang, i) => {
                    const langAlt = getLangAlt(lang);
                    return (
                      <span
                        key={i}
                        className="group relative inline-flex items-center justify-center text-base md:text-lg leading-none cursor-help shrink-0"
                        title={langAlt}
                        aria-label={langAlt}
                        tabIndex={0}
                      >
                        {getLangFlag(lang)}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:text-xs"
                        >
                          {langAlt}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing select-none hover:bg-background transition-colors"
                title="Masquer les cartes"
                aria-label="Masquer les cartes"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    hideCards();
                  }
                }}
                onClick={(e) => { e.stopPropagation(); hideCards(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Masquer</span>
                <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
              </button>
            </div>
          )}
        </div>

        {/* Block 1: Logo + name */}
        <div key={businessId} className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[4.5rem] md:h-[5.5rem] pointer-events-auto mt-1 md:mt-0 animate-slide-in-right">
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
                {/* Mobile: badges stacked vertically */}
                <div className="md:hidden shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  {avgOn20 !== null && avgOn20 > 0 && (
                    <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full py-0.5 px-1.5">
                      <Star className="h-3 w-3 text-gold fill-gold" />
                      <span className="text-xs font-bold text-white">{avgOn20}</span>
                      <span className="text-[9px] text-white/60">/20</span>
                    </div>
                  )}
                  {openBadgeInfo.text && (
                    <div className={`flex items-center gap-0.5 rounded-full py-0.5 px-1.5 text-[9px] font-bold uppercase tracking-wider ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      {openBadgeInfo.text}
                    </div>
                  )}
                </div>
                {/* Desktop: badge inline */}
                {openBadgeInfo.text && (
                  <div className={`hidden md:inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    {openBadgeInfo.text}
                  </div>
                )}
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

        {!cardsHidden && (
          <>
        {/* Info Carousel */}
        <div className="shrink-0 w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pr-0 pb-1 scrollbar-hide snap-x snap-mandatory mt-3 pointer-events-auto">
          <div className="flex w-max gap-2 items-start">
            <div className="snap-start shrink-0 w-2 md:w-4" aria-hidden="true" />
            {/* Card 1: Web only description */}
            {woDescription && (
              <div className={`snap-start shrink-0 w-[20rem] md:w-[30rem] ${noBottomCarousel ? 'h-[21.6em] md:h-[28.8em]' : 'h-[18em] md:h-[24em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white overflow-y-auto animate-slide-in-left opacity-0 border border-white/10`}
                  style={{ animationFillMode: 'forwards' }}
                >
                  <div
                    className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings card1-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-[#C04F17] [&_h2]:!font-bold [&_h3]:!font-bold"
                    dangerouslySetInnerHTML={{ __html: woDescription }}
                  />
                </div>
              )}
              {/* Card 2: Contact */}
              {hasContactCard && (
                <ContactFlipCard
                  business={business}
                  language={language}
                  hasOpeningHours={!!hasOpeningHours}
                  tallHeight={noBottomCarousel}
                  animationDelay={woDescription ? "120ms" : "0ms"}
                  hasHotelMapping={isHotelWithPrice}
                  isSearchingAvailability={hotelSearchLoading}
                  onCheckAvailability={handleCheckAvailability}
                  onOpenWebsite={(url) => {
                    setBookingOverlayUrl(url);
                    setBookingOverlayTitle(language === "en" ? "Website" : "Site web");
                    setShowBookingOverlay(true);
                  }}
                />
              )}
              {/* Card 3: Map */}
              {showGoogleMap && business && (business.latitude || business.google_maps_url) && (
                <MapCard
                  latitude={business.latitude}
                  longitude={business.longitude}
                  googleMapsUrl={business.google_maps_url}
                  businessName={business.name}
                  tallHeight={noBottomCarousel}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                  onClick={() => setShowPoiMapOverlay(true)}
                />
              )}
              {/* Card 4: Menu Summary */}
              {menuSummaries.length > 0 && (
                <MenuSummaryCard
                  summaries={menuSummaries}
                  language={language}
                  tallHeight={noBottomCarousel}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                  categoryIcon={categoryIcon}
                />
              )}
              {/* Card 4: Menu URL */}
              {menuDocs.length > 0 && (
                <MenuUrlCard
                  menus={menuDocs}
                  language={language}
                  tallHeight={noBottomCarousel}
                  categoryIcon={categoryIcon}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0)) * 120}ms`}
                  onOpenUrl={(url, title) => openDocOrBooking(url, title)}
                />
              )}
              {/* Card 5: Reviews */}
              {hasReviewsCard && (
                <ReviewsFlipCard
                  avgOn20={avgOn20!}
                  totalReviewCount={totalReviewCount}
                  platforms={reviewPlatforms}
                  reviewTexts={reviewTexts}
                  language={language}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(menuDocs.length > 0)) * 120}ms`}
                />
              )}
              {/* Card 6: External Links */}
              {externalLinks.length > 0 && (
                <ExternalLinksFlipCard
                  links={externalLinks}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(menuDocs.length > 0) + Number(hasReviewsCard)) * 120}ms`}
                  onOpenUrl={(url, linkTitle) => openDocOrBooking(url, linkTitle)}
                />
              )}
              {/* Card 7: Social Links */}
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
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(menuSummaries.length > 0) + Number(menuDocs.length > 0) + Number(hasReviewsCard) + Number(externalLinks.length > 0)) * 120}ms`}
                />
              )}
              <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Tabs bar — hidden while data is loading to prevent tab recalculation flash */}
        <div className={`shrink-0 flex justify-start md:justify-center gap-1 px-1 pt-2 pb-1 overflow-x-auto scrollbar-hide pointer-events-auto ${isLoading ? "invisible" : ""}`}>
          {bottomTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleBottomTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-transparent ${
                tab.id === "videos" ? "max-w-[min(60vw,240px)] md:max-w-none overflow-hidden text-ellipsis md:overflow-visible md:text-clip" : ""
              } ${
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
        </div>

        {/* Tab content — fixed height container for stable CTA positioning */}
        <div className="shrink-0 h-[9.5rem] md:h-[12.5rem] lg:h-[17.5rem]">
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
                    onClick={() => {
                      setActiveVideoOverlay({ url: vid.url, name: vid.name, description: vid.description });
                    }}
                  >
                  <div className="relative">
                      {vid.thumbnail_url ? (
                        <img src={vid.thumbnail_url} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : ytThumb ? (
                        <img src={ytThumb} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : vimeoThumb ? (
                        <img src={vimeoThumb} alt={vid.name || `Vidéo ${index + 1}`} loading="lazy" decoding="async" className={`w-full ${imgH} object-cover`} />
                      ) : isFile ? (
                        <div className={`w-full ${imgH} bg-white/10 flex items-center justify-center`}>
                          <span className="text-2xl">▶</span>
                        </div>
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
                    {business?.carousel_badge === "Nos offres" && (
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
        {activeBottomTab === "videos" && !hasVideosCarousel && (
          <div className="flex items-center justify-center py-6 pointer-events-auto">
            <p className="text-xs text-white/40 italic">{language === "en" ? "No video available" : "Aucune vidéo disponible"}</p>
          </div>
        )}

        {/* YouTube tab — always mounted to preload, hidden when not active */}
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
                  <div
                    key={dest.id}
                    className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
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
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                      {destName(dest)}
                    </p>
                  </div>
                );
              })}
              {poiBusinesses.length > 0 && business?.latitude && business?.longitude && (
                <div
                  className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${destinations.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
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

        {/* POI tab */}
        {activeBottomTab === "poi" && hasPoiCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {poiBusinesses.map((poi, index) => {
                const poiImg = poi.images?.filter(Boolean)?.[0] || poi.logo_url;
                return (
                  <div
                    key={poi.id}
                    className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
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
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                      {poi.name}
                    </p>
                  </div>
                );
              })}
              {business?.latitude && business?.longitude && (
                <div
                  className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
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

        {/* KP Related tab */}
        {activeBottomTab === "kp" && hasKpCarousel && (
          <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
            <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
              {kpRelated.map((rel, index) => {
                const relImg = rel.images?.filter(Boolean)?.[0] || rel.logo_url;
                return (
                  <div
                    key={rel.id}
                    className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                    style={bottomTabInitialRef.current ? { animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' } : undefined}
                    onClick={() => setActiveBusinessId(rel.id)}
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
                <div
                  className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${slideInClass} cursor-pointer hover:border-white/30 transition-colors`}
                  style={bottomTabInitialRef.current ? { animationDelay: `${kpRelated.length * 120}ms`, animationFillMode: 'forwards' } : undefined}
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
        </div>
          </>
        )}

        {/* Hidden YouTube count probe — always mounted */}

        {/* Spacer + availability zone when cards hidden */}
        {cardsHidden && (
          <div className={`flex-1 w-full flex flex-col justify-center gap-3 px-0 md:px-8 overflow-y-auto ${effectiveMedia?.kind === "matterport" ? "pointer-events-none" : "pointer-events-auto"}`}>
            {hotelSearchLoading && (
              <div className="flex items-center justify-center gap-2 text-white/80">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-['Roboto',sans-serif]">{language === "en" ? "Searching availability..." : "Recherche de disponibilité..."}</span>
              </div>
            )}
            {fallbackPanelData && !hotelSearchLoading && (() => {
              const currentHotel = fallbackPanelData.hotels.find(h => h.isCurrentHotel);
              const hasAvailability = !!currentHotel;
              const hotelName = business?.name || "";
              const minPrice = business?.min_price;
              const nightsCount = (() => {
                const d1 = new Date(fallbackPanelData.checkIn);
                const d2 = new Date(fallbackPanelData.checkOut);
                const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
                return diff > 0 ? diff : 1;
              })();
              const totalMinPrice = minPrice ? minPrice * nightsCount : null;

              // Build action cards for availability case
              const actionCards: { icon: React.ReactNode; label: string; onClick: () => void; color: string; textColor?: string }[] = [];
              if (hasAvailability && business) {
                if (business.whatsapp) {
                  actionCards.push({
                    icon: <WhatsAppIcon className="h-5 w-5" />,
                    label: "WhatsApp",
                    onClick: () => window.open(whatsappUrl(business.whatsapp!), "_blank"),
                    color: "#25D366",
                  });
                }
                if (business.phone) {
                  actionCards.push({
                    icon: <span className="text-lg">📞</span>,
                    label: language === "en" ? "Call" : "Téléphone",
                    onClick: () => window.open(`tel:${business.phone!.replace(/(?!^\+)[^\d]/g, '')}`, "_self"),
                    color: "#FFFFFF",
                    textColor: "#000000",
                  });
                }
                if (business.reserve_now_url) {
                  const isExternal = business.reserve_now_force_external;
                  actionCards.push({
                    icon: <CalendarCheck className="h-5 w-5" />,
                    label: ctaModeLabels[business.presentation_mode]?.[language === "en" ? "en" : "fr"] || (language === "en" ? "Book online" : "Réservez en ligne"),
                    onClick: () => {
                      if (isExternal) {
                        window.open(business.reserve_now_url!, "_blank");
                      } else {
                        setBookingOverlayUrl(null);
                        setBookingOverlayTitle(undefined);
                        setShowBookingOverlay(true);
                      }
                    },
                    color: "#25D366",
                    textColor: "#000000",
                  });
                }
                if (showGoogleMap && business.latitude && business.longitude) {
                  actionCards.push({
                    icon: <MapPin className="h-5 w-5" />,
                    label: language === "en" ? "Directions" : "Vous rendre sur place",
                    onClick: () => setShowDirections(true),
                    color: "#C04F17",
                  });
                }
              }

              return (
                <div className="flex flex-col items-center justify-center flex-1 w-full">
                  {/* Contextual message */}
                  <div className="text-left text-white bg-black/40 backdrop-blur-sm rounded-xl px-4 md:px-5 py-4 border border-white/10 w-full md:w-auto">
                    <div className="text-[14px] md:text-[20px] font-['Roboto',sans-serif] leading-relaxed space-y-2">
                        {hasAvailability ? (
                        <>
                          <p>
                            <span className="font-bold">{hotelName}</span>{" "}
                            {language === "en"
                              ? "has availability for the selected dates."
                              : "a de la disponibilité sur les dates recherchées."}
                          </p>
                          {minPrice ? (
                            <p>
                              {language === "en" ? "The minimum price generally observed is" : "Le prix minimum généralement constaté est de"}{" "}
                              <span className="font-bold">{minPrice} €</span>{" "}
                              {language === "en" ? "per night" : "par nuit"}{" "}
                              {language === "en"
                                ? "but the price per night may vary depending on season and room type."
                                : "mais le prix par nuitée peut varier selon la saison et du type de chambre."}
                            </p>
                          ) : null}
                          {totalMinPrice ? (
                            <p>
                              {language === "en"
                                ? `You can therefore expect a minimum price for your stay of`
                                : `Vous pouvez donc vous attendre à un prix minimal pour votre séjour de`}{" "}
                              <span className="font-bold">{totalMinPrice} €</span>.
                            </p>
                          ) : null}
                          <p>
                            {language === "en"
                              ? <>Contact <span className="font-bold">{hotelName}</span> directly to book your stay.</>
                              : <>Renseignez-vous directement auprès de <span className="font-bold">{hotelName}</span> pour réserver votre séjour.</>}
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            {language === "en"
                              ? `Unfortunately, we could not find availability at ${hotelName} for the selected dates.`
                              : `Malheureusement, nous n'avons pas pu trouver de disponibilité chez ${hotelName} sur les dates recherchées.`}
                          </p>
                          <p>
                            {language === "en"
                              ? "Please modify your search criteria or select an alternative below."
                              : "Veuillez modifier vos critères de recherche ou sélectionner une alternative ci-dessous."}
                          </p>
                          <div className="flex justify-center mt-2">
                            <button
                              onClick={showCards}
                              className="px-4 py-2 rounded-lg text-xs md:text-sm font-medium font-['Josefin_Sans',sans-serif] shadow-lg hover:opacity-90 transition-opacity bg-gold text-black"
                              style={{ height: '40px' }}
                            >
                              {language === "en" ? "Change dates" : "Modifier les dates"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action cards when available */}
                  {actionCards.length > 0 && (
                    <div className="flex flex-col items-center gap-2 mt-3" style={{ width: 'fit-content' }}>
                      {actionCards.map((card, i) => (
                        <button
                          key={i}
                          onClick={card.onClick}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium font-['Josefin_Sans',sans-serif] shadow-lg hover:opacity-90 transition-opacity normal-case tracking-normal whitespace-nowrap w-full"
                          style={{ backgroundColor: card.color, color: card.textColor || "#FFFFFF", height: '40px' }}
                        >
                          {card.icon}
                          <span>{card.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hotels available card */}
                  {fallbackPanelData.hotels.filter(h => !h.isCurrentHotel).length > 0 && (
                    <div className="text-center text-white bg-black/40 backdrop-blur-sm rounded-xl px-4 md:px-5 py-3 border border-white/10 mt-3 font-['Roboto',sans-serif] cursor-pointer hover:bg-black/50 transition-colors w-full md:w-auto" onClick={() => { setShowFallbackOverlay(true); }}>
                      <p className="text-[14px] md:text-[20px] font-medium mb-1">
                        {fallbackPanelData.hotels.filter(h => !h.isCurrentHotel).length} {language === "en" ? "available hotels" : "hôtels disponibles"}
                      </p>
                      <p className="text-[12px] md:text-[16px] text-white/60">
                        {fallbackPanelData.checkIn} → {fallbackPanelData.checkOut} · {fallbackPanelData.adults} {language === "en" ? "adults" : "adultes"}
                      </p>
                      <p className="text-[12px] md:text-[16px] text-white/80 mt-1.5 underline underline-offset-2">
                        {language === "en" ? "View other available hotels" : "Consulter les autres établissements avec de la disponibilité"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* CTAs + video controls */}
        <div className={`shrink-0 py-2 lg:pb-2 flex flex-col items-center gap-2 pointer-events-auto ${cardsHidden && effectiveMedia?.kind === "matterport" ? 'mb-24' : ''} ${cardsHidden ? '' : noBottomCarousel ? 'lg:mt-auto' : ''}`} style={(cardsHidden && fallbackPanelData && (() => { const ch = fallbackPanelData.hotels.find(h => h.isCurrentHotel); return !!ch; })()) ? { display: 'none' } : undefined}>
            {(() => {
              const ctaItems: React.ReactNode[] = [];
              if (bookingCta) {
                ctaItems.push(
                  bookingCta.forceExternal ? (
                    <a
                      key="booking"
                      href={bookingCta.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                    >
                      <CalendarCheck className="h-4 w-4 hidden md:block" />
                      <span className="truncate">{bookingCtaLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
                    </a>
                  ) : (
                    <button
                      key="booking"
                      onClick={() => { setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setShowBookingOverlay(true); }}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-right"
                      style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366' }}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      <span className="truncate">{bookingCtaLabel}</span>
                    </button>
                  )
                );
              }
              if (shopCta) {
                ctaItems.push(
                  shopCta.forceExternal ? (
                    <a
                      key="shop"
                      href={shopCta.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="truncate">{shopCtaLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0" />
                    </a>
                  ) : (
                    <button
                      key="shop"
                      onClick={() => { setBookingOverlayUrl(shopCta.fullUrl); setBookingOverlayTitle(shopCtaLabel); setShowBookingOverlay(true); }}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-black [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
                      style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366' }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="truncate">{shopCtaLabel}</span>
                    </button>
                  )
                );
              }
              if (showGoogleMap && business.latitude && business.longitude) {
                ctaItems.push(
                  <button
                    key="directions"
                    onClick={() => setShowDirections(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-in-left"
                    style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
                  </button>
                );
              }
              if (ctaItems.length === 0) return null;
              return (
                <div className="w-full md:w-3/4 md:px-0 flex justify-center gap-2">
                  {ctaItems.map((item, i) => (
                    <div key={i} className="flex-1 md:flex-none md:w-1/3">{item}</div>
                  ))}
                </div>
              );
            })()}
            {/* Video controls — below CTAs */}
            {!cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type === "file" && (
              <div className="flex items-center gap-6 md:gap-10 mt-2 md:mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) videoRef.current.play();
                      else videoRef.current.pause();
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={videoRef.current?.paused ? "Play" : "Pause"}
                >
                  {videoRef.current?.paused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={videoRef.current?.muted ? "Unmute" : "Mute"}
                >
                  {videoRef.current?.muted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
              </div>
            )}
            {/* YouTube iframe controls — below CTAs */}
            {!cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type === "youtube" && (
              <div className="flex items-center gap-6 md:gap-10 mt-2 md:mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: "command", func: ytBgPlaying ? "pauseVideo" : "playVideo" }),
                        "*"
                      );
                      setYtBgPlaying(p => !p);
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={ytBgPlaying ? "Pause" : "Play"}
                >
                  {ytBgPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: "command", func: ytBgMuted ? "unMute" : "mute" }),
                        "*"
                      );
                      setYtBgMuted(m => !m);
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={ytBgMuted ? "Unmute" : "Mute"}
                >
                  {ytBgMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
              </div>
            )}
          </div>

          {/* Video controls — always visible at bottom in Afficher mode */}
          {cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type === "file" && (
            <div className="shrink-0 flex justify-center pointer-events-auto mt-2 md:mt-3 pb-[14px] md:pb-[10px]">
              <div className="flex items-center gap-6 md:gap-10">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) videoRef.current.play();
                      else videoRef.current.pause();
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={videoRef.current?.paused ? "Play" : "Pause"}
                >
                  {videoRef.current?.paused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={videoRef.current?.muted ? "Unmute" : "Mute"}
                >
                  {videoRef.current?.muted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
              </div>
            </div>
          )}
          {cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type === "youtube" && (
            <div className="shrink-0 flex justify-center pointer-events-auto mt-2 md:mt-3 pb-[14px] md:pb-[10px]">
              <div className="flex items-center gap-6 md:gap-10">
                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: "command", func: ytBgPlaying ? "pauseVideo" : "playVideo" }),
                        "*"
                      );
                      setYtBgPlaying(p => !p);
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={ytBgPlaying ? "Pause" : "Play"}
                >
                  {ytBgPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: "command", func: ytBgMuted ? "unMute" : "mute" }),
                        "*"
                      );
                      setYtBgMuted(m => !m);
                    }
                  }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={ytBgMuted ? "Unmute" : "Mute"}
                >
                  {ytBgMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
              </div>
            </div>
          )}
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
          onClose={() => setVideoOverlayClosing(true)}
          onNavigate={(v) => setActiveVideoOverlay(v)}
          onAnimationEnd={() => { setActiveVideoOverlay(null); setVideoOverlayClosing(false); }}
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
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); }}
            whatsapp={business?.whatsapp}
            phone={business?.phone}
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
          onClose={() => setDocOverlay(null)}
        />
      )}

      {/* Directions Overlay — covers toolbar */}
      {showDirections && business && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[70] animate-slide-down-from-top">
          <DirectionsOverlay
            business={business}
            onClose={() => setShowDirections(false)}
          />
        </div>
      )}

      {/* Destination detail overlay */}
      {selectedDestinationId && (
        <DestinationSlidePanel
          destinationId={selectedDestinationId}
          onClose={() => setSelectedDestinationId(null)}
          slideFrom="bottom"
        />
      )}

      {/* POI business detail overlay */}
      {selectedPoiBusinessId && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[70]">
          <PoiSlidePanel
            businessId={selectedPoiBusinessId}
            onClose={() => {
              setSelectedPoiBusinessId(null);
              if (poiOpenedFromMapRef.current) {
                poiOpenedFromMapRef.current = false;
              }
            }}
            slideFrom="bottom"
          />
        </div>
      )}

      {/* POI Google Map overlay */}
      {showPoiMapOverlay && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[60] bg-background flex flex-col animate-slide-in-right">
          <div className="shrink-0 flex items-center px-4 py-2 border-b bg-background gap-2">
            <button
              onClick={() => setShowPoiMapOverlay(false)}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium truncate">
              {language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité"}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <PoiGoogleMap
              pois={[
                ...(business?.latitude && business?.longitude ? [{
                  id: `self-${business.id}`,
                  name: business.name,
                  latitude: business.latitude,
                  longitude: business.longitude,
                  images: business.images,
                  city: business.city,
                  neighborhood: business.neighborhood,
                  markerColor: { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" },
                } as PoiMapItem] : []),
                ...poiBusinesses.map(p => ({
                  id: p.id,
                  name: p.name,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  images: p.images,
                  city: p.city,
                  neighborhood: p.neighborhood,
                } as PoiMapItem)),
              ]}
              selectedPoiId={null}
              center={business?.latitude && business?.longitude ? { lat: business.latitude, lng: business.longitude } : undefined}
              onPoiClick={(poiId) => {
                if (poiId.startsWith("self-")) return;
                poiOpenedFromMapRef.current = true;
                setSelectedPoiBusinessId(poiId);
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

      {/* Fallback hotels overlay — covers toolbar */}
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
    </div>
  );
};

export default BookOnlineSlidePanel;
