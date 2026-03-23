import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Phone, Mail, Globe, Star, BadgeCheck, ChevronLeft, ChevronRight, ChevronDown, Clock, Loader2, ExternalLink, CookingPot, Volume2, VolumeX, Maximize, Play, Pause, Headphones, Mic, Minimize2, Navigation, Box, BookOpen, BedDouble, Search, Route } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";
import logoGold from "@/assets/logoGOLDsimple.webp";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";
import tripadvisorLogo from "@/assets/tripadvisor-logo.png";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import SimilarBusinesses from "@/components/SimilarBusinesses";
import NearbyBusinesses from "@/components/NearbyBusinesses";
import { Separator } from "@/components/ui/separator";
import { FacebookIcon, InstagramIcon, LinkedInIcon, YouTubeIcon, TikTokIcon, TwitterIcon, PinterestIcon, VimeoIcon } from "@/components/staff/SocialMediaIcons";
import BookingOverlay from "@/components/BookingOverlay";
import SocialEmbedsTab from "@/components/SocialEmbedsTab";
import DynamicIcon from "@/components/DynamicIcon";
import ServiceListItem from "@/components/ServiceListItem";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { Info } from "lucide-react";


const LANG_FLAGS: Record<string, string> = {
  FR: "🇫🇷", EN: "🇬🇧", ES: "🇪🇸", AR: "🇲🇦", DE: "🇩🇪", IT: "🇮🇹",
  PT: "🇵🇹", NL: "🇳🇱", RU: "🇷🇺", ZH: "🇨🇳", JA: "🇯🇵", KO: "🇰🇷",
};
const langToFlag = (lang: string) => LANG_FLAGS[lang?.toUpperCase()] || "";


export interface LiteApiData {
  offers: { roomName: string; price: string; currency: string; paymentType?: string }[];
  rating?: number;
  reviewCount?: number;
  checkIn: string;
  checkOut: string;
  hotelName: string;
}

interface BusinessSlidePanelProps {
  businessId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  liteApiData?: LiteApiData;
  /** When provided, availability overlay & fallback panel are portaled into this container (used in AI overlay split-screen) */
  leftPanelPortalRef?: React.RefObject<HTMLDivElement | null>;
  /** Called when business images are loaded, reports the count */
  onImageCount?: (count: number) => void;
}

export interface BusinessSlidePanelHandle {
  /** Returns true if it handled the close internally (went back to fallback), false if parent should close */
  requestClose: () => boolean;
}

interface FullBusiness {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  wtuce_status: string | null;
  account_type: string | null;
  logo_url: string | null;
  logo_bg: string | null;
  images: string[] | null;
  categories: string[] | null;
  services: string[] | null;
  main_category: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  rating: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  google_maps_url: string | null;
  google_reviews_url: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  restaurant_guru_url: string | null;
  booking_url: string | null;
  reserve_now_url: string | null;
  opening_hours: any;
  is_open_24h: boolean | null;
  show_opening_hours: boolean | null;
  gamme_id: string | null;
  latitude: number | null;
  longitude: number | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  skype: string | null;
  airbnb_url: string | null;
  hotels_com_url: string | null;
  trivago_url: string | null;
  glovo_url: string | null;
  getyourguide_url: string | null;
  viator_url: string | null;
  other_booking_name: string | null;
  other_booking_url: string | null;
  menu_url: string | null;
  video_1_url: string | null;
  default_service: string | null;
  ai_review_summary: any;
  matterport_url: string | null;
  flipbook_url: string | null;
  online_shop_url: string | null;
}

/** Convert Issuu/Calaméo URLs to embeddable format, or return as-is */
function getFlipbookEmbedUrl(url: string): string {
  // Issuu: https://issuu.com/username/docs/docname → https://e.issuu.com/embed.html?d=docname&u=username
  const issuuMatch = url.match(/issuu\.com\/([^/]+)\/docs\/([^/?#]+)/);
  if (issuuMatch) {
    return `https://e.issuu.com/embed.html?d=${issuuMatch[2]}&u=${issuuMatch[1]}`;
  }
  // Calaméo: https://www.calameo.com/read/00123456789 → https://www.calameo.com/read/00123456789 (already embeddable)
  if (url.includes("calameo.com")) {
    return url;
  }
  return url;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const WhatsAppIcon = forwardRef<SVGSVGElement, { className?: string }>(function WhatsAppIcon({ className = "h-5 w-5" }, ref) {
  return (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
});

const SkypeIcon = forwardRef<SVGSVGElement, { className?: string }>(function SkypeIcon({ className = "h-5 w-5" }, ref) {
  return (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882a7.508 7.508 0 01.12 1.357c0 4.456-4.214 8.07-9.413 8.07a9.643 9.643 0 01-2.987-.463 5.56 5.56 0 01-2.559.631c-3.024 0-5.478-2.455-5.478-5.478 0-.957.245-1.878.681-2.683a8.4 8.4 0 01-.152-1.603c0-4.456 4.214-8.07 9.413-8.07.967 0 1.914.122 2.816.353A5.478 5.478 0 0120.593 5c3.024 0 5.478 2.455 5.478 5.478a5.48 5.48 0 01-.918 3.514"/>
    </svg>
  );
});

const BusinessSlidePanel = forwardRef<BusinessSlidePanelHandle, BusinessSlidePanelProps>(({ businessId: externalBusinessId, onClose, isExpanded, onToggleExpand, liteApiData, leftPanelPortalRef, onImageCount }, ref) => {
  const [internalBusinessId, setInternalBusinessId] = useState(externalBusinessId);
  const businessId = internalBusinessId;
  const [fallbackHiddenOnMobile, setFallbackHiddenOnMobile] = useState(false);
  const fallbackDataRef = useRef<FallbackPanelData | null>(null);

  // Expose requestClose for parent to intercept close and go back to fallback on mobile
  useImperativeHandle(ref, () => ({
    requestClose: () => {
      if (fallbackHiddenOnMobile && fallbackDataRef.current && window.innerWidth < 1024) {
        setInternalBusinessId(externalBusinessId);
        setFallbackHiddenOnMobile(false);
        scrollContainerRef.current?.scrollTo({ top: 0 });
        return true;
      }
      return false;
    },
  }), [fallbackHiddenOnMobile, externalBusinessId]);

  // Always close directions overlay when the displayed business changes (internal navigation)
  useEffect(() => {
    setShowDirectionsOverlay(false);
    setDirectionsMode("walking");
    setUserOrigin(null);
  }, [businessId]);


  // Sync when parent changes the business
  useEffect(() => {
    setInternalBusinessId(externalBusinessId);
    setAvailabilityOverlayCtx(null);
    setIsBookingOpen(false);
    setForceBookingOverlay(false);
    setDocOverlay(null);
    setShowDirectionsOverlay(false);
  }, [externalBusinessId]);

  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const voiceLoopRef = useRef(false);

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (keywords, spoken) => {
      const params = new URLSearchParams({ q: keywords, spoken });
      navigate(`/search?${params.toString()}`);
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur", description: message });
    },
  });

  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech({
    onEnd: () => {
      if (voiceLoopRef.current) {
        voiceLoopRef.current = false;
        setTimeout(() => toggleRecording(), 400);
      }
    },
  });
  const [business, setBusiness] = useState<FullBusiness | null>(null);
  const isWebOnly = useMemo(() => {
    const engs: string[] = (business as any)?.engagements || [];
    return engs.some((e: string) => {
      const n = e.toLowerCase().trim();
      return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
    });
  }, [business]);
  const [gamme, setGamme] = useState<Gamme | null>(null);
  const [activeServiceNames, setActiveServiceNames] = useState<Set<string> | null>(null);
  const [groupedServices, setGroupedServices] = useState<{ subcategoryName: string; description: string | null; icon: string | null; services: string[] }[]>([]);
  const [openServiceGroups, setOpenServiceGroups] = useState<Set<string>>(new Set());
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [forceBookingOverlay, setForceBookingOverlay] = useState(false);
  const [liteApiHotelId, setLiteApiHotelId] = useState<string | null>(null);
  // Preserve the availability overlay context when switching business via fallback
  const [availabilityOverlayCtx, setAvailabilityOverlayCtx] = useState<{
    liteApiHotelId: string;
    businessName: string;
    businessCity?: string;
    backgroundImage?: string;
  } | null>(null);
  const [fallbackPanelData, setFallbackPanelData] = useState<FallbackPanelData | null>(null);
  // Keep ref in sync for imperative close check
  useEffect(() => { fallbackDataRef.current = fallbackPanelData; }, [fallbackPanelData]);
  const [selectedFallbackHotelId, setSelectedFallbackHotelId] = useState<string | null>(null);
  const [pressEntries, setPressEntries] = useState<{ name: string; logo_url: string; url: string; language: string }[]>([]);
  const [articlePreview, setArticlePreview] = useState<{ title: string; summary: string; screenshot: string; url: string; name: string; publishedDate?: string } | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  
  const [businessDocs, setBusinessDocs] = useState<{ id: string; type: string; url: string; name: string | null; icon: string | null; sort_order: number }[]>([]);
  const [menuSummaries, setMenuSummaries] = useState<any[]>([]);
  const [docOverlay, setDocOverlay] = useState<{ url: string; name: string; type: 'pdf' | 'flipbook' | 'webpage' } | null>(null);
  const [showDirectionsOverlay, setShowDirectionsOverlay] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);

  // Fetch user geolocation when directions overlay opens
  useEffect(() => {
    if (!showDirectionsOverlay) return;
    setUserOrigin(null);
    setShowInfoCard(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => setUserOrigin(null),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  }, [showDirectionsOverlay]);
  
  const [reviewTexts, setReviewTexts] = useState<{ source: string; author_name: string | null; rating: number | null; text: string | null; relative_time: string | null; language?: string | null }[]>([]);
  const [translatedReviewTexts, setTranslatedReviewTexts] = useState<string[]>([]);
  const [isTranslatingReviews, setIsTranslatingReviews] = useState(false);
  const [showReviewComments, setShowReviewComments] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCurrentImageLandscape, setIsCurrentImageLandscape] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showClubCard, setShowClubCard] = useState(false);
  // isMatterportOpen removed — Matterport is now part of the unified lightbox
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLandscape, setIsVideoLandscape] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mediaEndSentinelRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);
  const similarSectionRef = useRef<HTMLDivElement>(null);
  const nearbySectionRef = useRef<HTMLDivElement>(null);
  const socialSectionRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const tabsSentinelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("apercu");
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [similarCount, setSimilarCount] = useState<number | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [socialPostCount, setSocialPostCount] = useState<number | null>(null);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const menuDragStartXRef = useRef<number | null>(null);
  const menuDragStartYRef = useRef<number | null>(null);
  const menuDragStartScrollLeftRef = useRef(0);
  const menuIsDraggingRef = useRef(false);
  const isScrollingToTabRef = useRef(false);
  const tabScrollUnlockTimeoutRef = useRef<number | null>(null);

  const resetMenuMouseDrag = useCallback(() => {
    menuDragStartXRef.current = null;
    menuDragStartYRef.current = null;
    menuIsDraggingRef.current = false;
    document.body.style.userSelect = "";
  }, []);

  const handleMenuMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!menuScrollRef.current) return;
    menuIsDraggingRef.current = true;
    menuDragStartXRef.current = event.clientX;
    menuDragStartYRef.current = event.clientY;
    menuDragStartScrollLeftRef.current = menuScrollRef.current.scrollLeft;
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!menuIsDraggingRef.current || menuDragStartXRef.current === null || menuDragStartYRef.current === null || !menuScrollRef.current) return;

      const deltaX = event.clientX - menuDragStartXRef.current;
      const deltaY = event.clientY - menuDragStartYRef.current;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      event.preventDefault();
      menuScrollRef.current.scrollLeft = menuDragStartScrollLeftRef.current - deltaX;
    };

    const handleWindowMouseUp = () => resetMenuMouseDrag();

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [resetMenuMouseDrag]);

  const handleFullscreen = useCallback(() => {
    // For native video, use the video element's fullscreen
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
      return;
    }
    // For iframes (YouTube/Vimeo), fullscreen the container
    if (mediaContainerRef.current) {
      if (mediaContainerRef.current.requestFullscreen) {
        mediaContainerRef.current.requestFullscreen();
      } else if ((mediaContainerRef.current as any).webkitRequestFullscreen) {
        (mediaContainerRef.current as any).webkitRequestFullscreen();
      }
    }
  }, []);

  // Sticky header: show when scrolled past media
  useEffect(() => {
    const sentinel = mediaEndSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { root, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, business, isExpanded]);

  // Sticky tabs: show when inline tabs scroll out of view
  useEffect(() => {
    const sentinel = tabsSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyTabs(!entry.isIntersecting);
      },
      { root, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, business, isExpanded]);

  // Auto-update active tab based on scroll position (IntersectionObserver)
  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || isLoading || !business) return;

    const sectionMap: { id: string; ref: React.RefObject<HTMLDivElement | null> }[] = [
      { id: "acote", ref: nearbySectionRef },
      { id: "similaires", ref: similarSectionRef },
      { id: "social", ref: socialSectionRef },
      { id: "services", ref: servicesSectionRef },
      { id: "localiser", ref: mapSectionRef },
      { id: "avis", ref: reviewsSectionRef },
      { id: "contact", ref: contactSectionRef },
      { id: "apercu", ref: descriptionRef },
    ];

    const visibleSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToTabRef.current) return;
        entries.forEach((entry) => {
          const sectionId = (entry.target as HTMLElement).dataset.sectionId;
          if (!sectionId) return;
          if (entry.isIntersecting) {
            visibleSections.add(sectionId);
          } else {
            visibleSections.delete(sectionId);
          }
        });

        // Pick the lowest section (highest priority = furthest down the page)
        for (const section of sectionMap) {
          if (visibleSections.has(section.id)) {
            setActiveTab(section.id);
            return;
          }
        }
      },
      { root, threshold: 0, rootMargin: "-120px 0px -60% 0px" }
    );

    sectionMap.forEach(({ id, ref }) => {
      if (ref.current) {
        ref.current.dataset.sectionId = id;
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [isLoading, business]);

  const navigateToTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    isScrollingToTabRef.current = true;
    // Let the sticky tabs observer handle visibility naturally (no forcing)

    if (tabScrollUnlockTimeoutRef.current) {
      window.clearTimeout(tabScrollUnlockTimeoutRef.current);
    }

    const root = scrollContainerRef.current;
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      contact: contactSectionRef,
      avis: reviewsSectionRef,
      localiser: mapSectionRef,
      services: servicesSectionRef,
      social: socialSectionRef,
      similaires: similarSectionRef,
      acote: nearbySectionRef,
      apercu: descriptionRef,
    };

    const target = refMap[tabId]?.current;
    if (!root || !target) {
      tabScrollUnlockTimeoutRef.current = window.setTimeout(() => {
        isScrollingToTabRef.current = false;
      }, 550);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const stickyOffset = 92;
    const nextTop = root.scrollTop + (targetRect.top - rootRect.top) - stickyOffset;

    root.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });

    tabScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      isScrollingToTabRef.current = false;
    }, 550);
  }, []);

  useEffect(() => {
    return () => {
      if (tabScrollUnlockTimeoutRef.current) {
        window.clearTimeout(tabScrollUnlockTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    const fetch = async () => {
      // Don't show loading skeleton when browsing via fallback panel (avoids flash)
      if (!fallbackPanelData) {
        setIsLoading(true);
      }
      setTimeout(() => setAvailabilityOverlayCtx(null), 300);
      setIsBookingOpen(false);
      setForceBookingOverlay(false);
      setDocOverlay(null);
      setCurrentImageIndex(0);
      setVideoError(false);
      setIsVideoLandscape(true);
      setActiveTab("apercu");
      setIsDescriptionExpanded(false);
      setShowReviewComments(false);
      setSimilarCount(null);
      setNearbyCount(null);
      setSocialPostCount(null);

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setBusiness(null);
        setIsLoading(false);
        return;
      }

      setBusiness(data as any);

      // Track recently viewed business
      window.dispatchEvent(new CustomEvent("track-business-view", { detail: { id: data.id, name: data.name, images: data.images, logo_url: data.logo_url, city: data.city, slug: (data as any).slug || data.id } }));

      // Fetch active service names scoped to business subcategories
      if (data.services && data.services.length > 0) {
        const bizCategories: string[] = data.categories || [];
        // Get subcategory IDs matching this business's categories
        const { data: subRows } = await supabase
          .from("subcategories")
          .select("id, name_fr")
          .in("name_fr", bizCategories.length > 0 ? bizCategories : ["__none__"]);
        const subIds = (subRows || []).map((s: any) => s.id);

        // Fetch services that are active AND belong to relevant subcategories (or any if no subcategory match)
        let activeNames: Set<string>;
        if (subIds.length > 0) {
          const { data: activeServices } = await supabase
            .from("services")
            .select("name_fr, subcategory_id, is_active");
          if (activeServices) {
            // A service is visible if it's active in at least one of the business's subcategories,
            // OR if it doesn't exist in any of the business's subcategories (fallback to global active check)
            const svcInBizSubs = new Map<string, boolean>();
            for (const svc of activeServices as any[]) {
              const inBizSub = subIds.includes(svc.subcategory_id);
              if (inBizSub) {
                // If active in at least one matching subcategory, mark as visible
                if (svc.is_active) {
                  svcInBizSubs.set(svc.name_fr, true);
                } else if (!svcInBizSubs.has(svc.name_fr)) {
                  svcInBizSubs.set(svc.name_fr, false);
                }
              }
            }
            // For services not found in business subcategories, check global active status
            activeNames = new Set<string>();
            for (const svc of activeServices as any[]) {
              if (svcInBizSubs.has(svc.name_fr)) {
                if (svcInBizSubs.get(svc.name_fr)) activeNames.add(svc.name_fr);
              } else if (svc.is_active) {
                activeNames.add(svc.name_fr);
              }
            }
          } else {
            activeNames = new Set(data.services);
          }
        } else {
          // No subcategory match — fallback to simple is_active filter
          const { data: activeServices } = await supabase
            .from("services")
            .select("name_fr")
            .eq("is_active", true);
          activeNames = new Set((activeServices || []).map((s: any) => s.name_fr));
        }
        setActiveServiceNames(activeNames);

        // Build grouped services by subcategory (matching BusinessDetail page)
        const filteredServices = data.services.filter((s: string) => activeNames.has(s));
        if (filteredServices.length > 0) {
          const { data: svcRows } = await supabase
            .from("services")
            .select("name_fr, subcategory_id, subcategories(name_fr, description_fr, icon)")
            .in("name_fr", filteredServices);

          const groupMap = new Map<string, { description: string | null; icon: string | null; services: Set<string> }>();
          const businessCats = new Set(data.categories || []);
          const serviceToSubcat = new Map<string, { subcatName: string; description: string | null; icon: string | null }>();

          if (svcRows) {
            for (const row of svcRows as any[]) {
              const subcatName = row.subcategories?.name_fr || null;
              if (!subcatName) continue;
              const existing = serviceToSubcat.get(row.name_fr);
              if (!existing) {
                serviceToSubcat.set(row.name_fr, { subcatName, description: row.subcategories?.description_fr || null, icon: row.subcategories?.icon || null });
              } else if (!businessCats.has(existing.subcatName) && businessCats.has(subcatName)) {
                serviceToSubcat.set(row.name_fr, { subcatName, description: row.subcategories?.description_fr || null, icon: row.subcategories?.icon || null });
              }
            }
            for (const [svcName, info] of serviceToSubcat) {
              if (!businessCats.has(info.subcatName)) continue;
              if (!groupMap.has(info.subcatName)) {
                groupMap.set(info.subcatName, { description: info.description, icon: info.icon, services: new Set() });
              }
              groupMap.get(info.subcatName)!.services.add(svcName);
            }
          }

          const groups = Array.from(groupMap.entries()).map(([name, g]) => ({
            subcategoryName: name,
            description: g.description,
            icon: g.icon,
            services: Array.from(g.services).sort((a, b) => a.localeCompare(b, 'fr')),
          }));
          const businessCategories: string[] = data.categories || [];
          const defaultSvc = data.default_service;
          groups.sort((a, b) => {
            if (defaultSvc) {
              const aHas = a.services.includes(defaultSvc);
              const bHas = b.services.includes(defaultSvc);
              if (aHas && !bHas) return -1;
              if (!aHas && bHas) return 1;
            }
            const aIdx = businessCategories.indexOf(a.subcategoryName);
            const bIdx = businessCategories.indexOf(b.subcategoryName);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.subcategoryName.localeCompare(b.subcategoryName, 'fr');
          });

          setGroupedServices(groups);
          setOpenServiceGroups(groups.length === 1 ? new Set([groups[0].subcategoryName]) : new Set());
        } else {
          setGroupedServices([]);
          setOpenServiceGroups(new Set());
        }
      } else {
        setActiveServiceNames(null);
        setGroupedServices([]);
        setOpenServiceGroups(new Set());
      }

      // Fetch review texts – prefer reviews in the current UI language
      const langCode = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
      const { data: langReviews } = await supabase
        .from("reviews" as any)
        .select("source, author_name, rating, text, relative_time, language")
        .eq("business_id", businessId)
        .eq("language", langCode)
        .not("text", "is", null)
        .order("rating", { ascending: false })
        .limit(5);
      if (langReviews && langReviews.length >= 2) {
        setReviewTexts(langReviews as any[]);
      } else {
        // Fallback: fetch best reviews regardless of language
        const { data: allReviews } = await supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text, relative_time, language")
          .eq("business_id", businessId)
          .not("text", "is", null)
          .order("rating", { ascending: false })
          .limit(5);
        setReviewTexts(allReviews ? (allReviews as any[]) : []);
      }

      if (data.gamme_id) {
        const { data: g } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex")
          .eq("id", data.gamme_id)
          .maybeSingle();
        if (g) setGamme(g);
      } else {
        setGamme(null);
      }

      // Fetch press entries from knowledge base linked to this business
      const { data: knowledgeData } = await supabase
        .from("knowledge_entries")
        .select("external_urls")
        .eq("business_id", businessId)
        .eq("is_active", true);
      const allPress: { name: string; logo_url: string; url: string; language: string }[] = [];
      if (knowledgeData) {
        for (const entry of knowledgeData) {
          const urls = entry.external_urls as any[];
          if (urls && Array.isArray(urls)) {
            for (const u of urls) {
              if (u.logo_url && u.name) {
                allPress.push({ name: u.name, logo_url: u.logo_url, url: u.url || "", language: u.language || "" });
              }
            }
          }
        }
      }
      setPressEntries(allPress);

      // Check LiteAPI hotel mapping
      const { data: mapping } = await supabase
        .from("hotel_api_mappings")
        .select("liteapi_hotel_id")
        .eq("business_id", businessId)
        .maybeSingle();
      setLiteApiHotelId(mapping?.liteapi_hotel_id || null);

      // Fetch business documents (menus, flipbooks)
      const { data: docs } = await supabase
        .from("business_documents")
        .select("id, type, url, name, icon, sort_order")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .limit(4);
      setBusinessDocs(docs || []);

      const { data: summariesData } = await supabase
        .from("business_menu_summaries")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      setMenuSummaries(summariesData || []);

      setIsLoading(false);
    };
    fetch();
  }, [businessId]);

  // Auto-translate reviews when they're in a different language than the UI
  useEffect(() => {
    setTranslatedReviewTexts([]);
    if (reviewTexts.length === 0) return;

    const langCode = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
    const needsTranslation = reviewTexts.some(
      (r) => r.text && r.language && r.language !== langCode
    );
    if (!needsTranslation) return;

    const translateReviews = async () => {
      setIsTranslatingReviews(true);
      try {
        const reviewsToTranslate = reviewTexts
          .filter((r) => r.text && r.language && r.language !== langCode)
          .map((r) => ({ text: r.text }));
        if (reviewsToTranslate.length === 0) return;

        const { data, error } = await supabase.functions.invoke("translate-reviews", {
          body: { reviews: reviewsToTranslate, targetLanguage: langCode },
        });

        if (!error && data?.translations?.length) {
          const mapped: string[] = [];
          let tIdx = 0;
          for (const r of reviewTexts) {
            if (r.text && r.language && r.language !== langCode && tIdx < data.translations.length) {
              mapped.push(data.translations[tIdx]);
              tIdx++;
            } else {
              mapped.push(r.text || "");
            }
          }
          setTranslatedReviewTexts(mapped);
        }
      } catch (e) {
        console.error("Translation error:", e);
      } finally {
        setIsTranslatingReviews(false);
      }
    };
    translateReviews();
  }, [reviewTexts, language]);

  const imageCount = business?.images?.length ?? 0;
  useEffect(() => { onImageCount?.(imageCount); }, [imageCount, onImageCount]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Établissement introuvable
      </div>
    );
  }

  const isVerified = business.wtuce_status === "verified";
  const isInstitution = business.account_type?.toLowerCase() === "institution";
   const images = business.images || [];
   const hasVideo = !!business.video_1_url && !videoError;
   const hasMatterport = !!business.matterport_url;
   const hasFlipbook = !!business.flipbook_url;
   const mediaCount = (hasVideo ? 1 : 0) + images.length + (hasMatterport ? 1 : 0);
   const videoOffset = hasVideo ? 1 : 0;
   const matterportIndex = hasMatterport ? (hasVideo ? 1 : 0) + images.length : -1;
   const flipbookIndex = -1; // flipbook now opened via doc overlay, not in carousel
  const ratingSourcesForCalc = collectRatingSources(business);
  const computedOn20 = computeWeightedRatingOn20(ratingSourcesForCalc);
  const avgOn20 = business.rating ?? computedOn20;

  const reviews: { rating: number; count: number; label: string }[] = [];
  if (business.google_rating && business.google_review_count) reviews.push({ rating: business.google_rating, count: business.google_review_count, label: "Google" });
  if (business.tripadvisor_rating && business.tripadvisor_review_count) reviews.push({ rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, label: "TripAdvisor" });
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) reviews.push({ rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, label: "Restaurant Guru" });
  const totalReviewCount = reviews.reduce((s, r) => s + r.count, 0);

  const hook = language === "en" ? business.hook_en : language === "ar" ? business.hook_ar : business.hook_fr;
  const hasContact = !!(business.address || business.phone || business.email || business.website || business.whatsapp || business.skype || business.menu_url || business.reserve_now_url || business.online_shop_url || (business.show_opening_hours !== false && (business.is_open_24h || business.opening_hours)));

  // Build TTS synthesis text (~30 seconds)
  const buildTtsSynthesis = () => {
    const parts: string[] = [];
    parts.push(`${business.name}, situé à ${business.city}${business.neighborhood ? `, quartier ${business.neighborhood}` : ""}.`);
    if (business.default_service) {
      parts.push(`Leur spécialité : ${business.default_service}.`);
    }
    // Description nettoyée
    if (business.description) {
      const clean = business.description.replace(/<[^>]+>/g, "").trim();
      if (clean.length > 0) {
        parts.push(clean.length > 250 ? clean.slice(0, 250) + "…" : clean);
      }
    }
    // Synthèse IA des avis (multilingual: picks fr/en based on interface language)
    const rawSummary = business.ai_review_summary as any;
    const langSummary = rawSummary?.[language] || rawSummary; // fallback to legacy top-level
    const prosLabel = language === "en" ? "Customers appreciate" : "Les clients apprécient";
    const consLabel = language === "en" ? "Areas for improvement" : "Points à améliorer";
    if (langSummary?.pros && langSummary.pros.length > 0) {
      parts.push(`${prosLabel} : ${langSummary.pros.slice(0, 3).join(", ")}.`);
    }
    if (langSummary?.cons && langSummary.cons.length > 0) {
      parts.push(`${consLabel} : ${langSummary.cons.slice(0, 2).join(", ")}.`);
    }
    // Avis individuel si pas de synthèse IA
    if (!langSummary?.pros) {
      const bestReview = reviewTexts.find(r => r.text && r.text.length > 20);
      if (bestReview) {
        const snippet = bestReview.text!.slice(0, 150).replace(/<[^>]+>/g, "");
        parts.push(`Un client témoigne : "${snippet}".`);
      }
    }
    if (avgOn20) {
      parts.push(`Note globale : ${avgOn20} sur 20, basée sur ${totalReviewCount} avis.`);
    }
    return parts.join(" ");
  };

  // Opening hours — same logic as BusinessCard badge
  const canShowOpenBadge = !!business.show_opening_hours || !!business.is_open_24h;
  let openBadgeText: string | null = null;
  let openBadgeIsOpen = false;

  if (canShowOpenBadge) {
    if (business.is_open_24h) {
      openBadgeText = "Ouvert 24h";
      openBadgeIsOpen = true;
    } else if (business.opening_hours) {
      const oh = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const now = new Date();
      const todayKey = days[now.getDay()];

      // Check if currently open
      const currentlyOpen = isCurrentlyOpenCheck(oh[todayKey]);
      if (currentlyOpen) {
        openBadgeText = "Ouvert";
        openBadgeIsOpen = true;
      } else {
        // Find next opening time
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const dh = oh[todayKey];
        let foundToday = false;

        if (dh && !dh.closed && dh.open) {
          const [oH, oM] = dh.open.split(":").map(Number);
          const openMin = oH * 60 + (oM || 0);
          if (openMin > nowMin) {
            openBadgeText = `Ouvre à ${dh.open}`;
            foundToday = true;
          } else if (dh.open2 && !dh.continuous) {
            const [oH2, oM2] = dh.open2.split(":").map(Number);
            const open2Min = oH2 * 60 + (oM2 || 0);
            if (open2Min > nowMin) {
              openBadgeText = `Ouvre à ${dh.open2}`;
              foundToday = true;
            }
          }
        }

        if (!foundToday) {
          const dayLabels = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
          for (let i = 1; i <= 7; i++) {
            const idx = (now.getDay() + i) % 7;
            const nextDayKey = days[idx];
            const nextDh = oh[nextDayKey];
            if (nextDh && !nextDh.closed && nextDh.open) {
              openBadgeText = `Ouvre ${dayLabels[idx]} à ${nextDh.open}`;
              break;
            }
          }
        }
      }
    }
  }

  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");
  const toolbarLeftPortal = document.getElementById("slide-panel-toolbar-left");
  const bookingUrl = business.reserve_now_url || business.booking_url || business.other_booking_url || null;
  const hasLiteApiMapping = !!liteApiHotelId;
  const showFloatingButton = (business.reserve_now_url || hasLiteApiMapping) && !isBookingOpen && !isExpanded;
  const floatingLabel = "RÉSERVER";

  return (
    <div className="flex flex-col h-full">
      {/* Floating vertical button */}
      {showFloatingButton && (
        <button
          onClick={() => {
            if (hasLiteApiMapping) {
              setAvailabilityOverlayCtx({
                liteApiHotelId: liteApiHotelId!,
                businessName: business.name,
                businessCity: business.city || undefined,
                backgroundImage: business.images?.[0] || undefined,
              });
              setIsBookingOpen(true);
            } else if (bookingUrl && /^https?:\/\/(api\.)?whatsapp\.com/i.test(bookingUrl)) {
              window.open(bookingUrl, "_blank", "noopener,noreferrer");
            } else {
              setIsBookingOpen(true);
              setForceBookingOverlay(true);
            }
          }}
          className="absolute right-0 top-[65%] -translate-y-1/2 z-50 flex flex-col items-center justify-center bg-black/90 hover:bg-black transition-all duration-300 rounded-l-2xl shadow-lg cursor-pointer gap-[6px] py-5 px-2 group"
          title={hasLiteApiMapping ? "Vérifier la disponibilité" : "Réserver"}
        >
          {floatingLabel.split("").map((letter, i) => (
            <span
              key={i}
              className="text-white text-sm font-bold leading-none opacity-0 animate-[fadeInLetter_0.4s_ease-out_forwards]"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
          <svg
            width="14"
            viewBox="0 0 20 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mt-2"
          >
            <path d="M20 4.92163L12.5 0.591505L12.5 9.25176L20 4.92163ZM0 5.67163L13.25 5.67163L13.25 4.17163L0 4.17163L0 5.67163Z" fill="white" />
          </svg>
        </button>
      )}
      {/* Booking / Availability overlay */}
      {availabilityOverlayCtx && (
        <HotelAvailabilityOverlay
          liteApiHotelId={availabilityOverlayCtx.liteApiHotelId}
          businessName={availabilityOverlayCtx.businessName}
          businessCity={availabilityOverlayCtx.businessCity}
          backgroundImage={availabilityOverlayCtx.backgroundImage}
          onClose={() => { setAvailabilityOverlayCtx(null); setIsBookingOpen(false); }}
          onSelectBusiness={(id) => { setInternalBusinessId(id); }}
          onOpenFallbackPanel={(data) => {
            setFallbackPanelData(data);
            setSelectedFallbackHotelId(null);
            setFallbackHiddenOnMobile(false);
            setAvailabilityOverlayCtx(null);
            setIsBookingOpen(false);
          }}
        />
      )}
      {isBookingOpen && !hasLiteApiMapping && !availabilityOverlayCtx && bookingUrl && (
        <BookingOverlay
          bookingUrl={bookingUrl}
          onClose={() => setIsBookingOpen(false)}
        />
      )}
      {forceBookingOverlay && business.reserve_now_url && (
        <BookingOverlay
          bookingUrl={business.reserve_now_url}
          onClose={() => setForceBookingOverlay(false)}
        />
      )}
      {/* Directions Overlay */}
      {showDirectionsOverlay && business && (() => {
        const dest = business.latitude && business.longitude
          ? `${business.latitude},${business.longitude}`
          : encodeURIComponent(business.address || business.name);
        const destRaw = business.latitude && business.longitude
          ? `${business.latitude},${business.longitude}`
          : business.address || business.name;
        return (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-fade-in">
           <div className="flex items-center px-4 py-2 border-b bg-white">
              <button
                onClick={() => setShowDirectionsOverlay(false)}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
                title="Fermer"
                aria-label="Fermer l'itinéraire"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center bg-muted rounded-full p-0.5">
                  <button
                    onClick={() => setDirectionsMode("walking")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚶 À pied
                  </button>
                  <button
                    onClick={() => setDirectionsMode("driving")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚗 Voiture
                  </button>
                </div>
              </div>
            <div className="flex items-center gap-2">
               <a
                 href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="p-1 rounded-full hover:bg-muted transition-colors"
                 title="Google Maps"
               >
                 <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
               </a>
               <a
                 href={business.latitude && business.longitude
                   ? `https://waze.com/ul?ll=${business.latitude},${business.longitude}&navigate=yes`
                   : `https://waze.com/ul?q=${encodeURIComponent(destRaw)}&navigate=yes`
                 }
                 target="_blank"
                 rel="noopener noreferrer"
                 className="p-1 rounded-full hover:bg-muted transition-colors"
                 title="Waze"
               >
                 <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
               </a>
               <a
                 href={business.latitude && business.longitude
                   ? `https://maps.apple.com/?daddr=${business.latitude},${business.longitude}&dirflg=d`
                   : `https://maps.apple.com/?daddr=${encodeURIComponent(destRaw)}&dirflg=d`
                 }
                 target="_blank"
                 rel="noopener noreferrer"
                 className="p-1 rounded-full hover:bg-muted transition-colors"
                 title="Apple Plans"
               >
                 <img src="https://www.apple.com/favicon.ico" alt="Apple Plans" className="h-7 w-7 object-contain" />
               </a>
             </div>
           </div>
           <div className="flex-1 relative min-h-0">
             <iframe
               src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userOrigin || 'My+location'}&destination=${dest}&mode=${directionsMode}`}
               className="absolute inset-0 w-full h-full border-0"
               allowFullScreen
               loading="lazy"
               referrerPolicy="no-referrer-when-downgrade"
               title={`Itinéraire vers ${business.name}`}
             />
             {showInfoCard && (
               <MapBusinessInfoCard
                 business={business}
                 onClose={() => setShowInfoCard(false)}
                 hideDirections
                 hideClose
               />
             )}
             {!showInfoCard && (
               <button
                 onClick={() => setShowInfoCard(true)}
                 className="absolute top-2 left-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90 transition-opacity"
                 title="Infos établissement"
               >
                 <Info className="h-4 w-4" />
               </button>
             )}
           </div>
         </div>
        );
      })()}
      {/* Document Overlay (PDF, Flipbook or Website) */}
      {docOverlay && docOverlay.name === 'Site web' && createPortal(
        <div className="fixed inset-x-0 bottom-0 top-[53px] z-[9998] bg-background flex flex-col animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
            <span className="text-sm font-semibold truncate">{business?.name || 'Site web'}</span>
            <div className="flex items-center gap-2">
              <a href={docOverlay.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Ouvrir dans un nouvel onglet">
                <ExternalLink className="h-5 w-5" />
              </a>
              <button
                onClick={() => setDocOverlay(null)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-background">
            <iframe
              src={docOverlay.url}
              className="h-full w-full border-0"
              title={docOverlay.name}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>,
        document.body
      )}
      {docOverlay && docOverlay.name !== 'Site web' && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDocOverlay(null)}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
                title="Fermer"
                aria-label="Fermer le document"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold truncate">{docOverlay.name}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center pb-16 bg-background">
            {docOverlay.type === 'flipbook' ? (
              <iframe
                src={getFlipbookEmbedUrl(docOverlay.url)}
                className="h-full w-full border-0"
                allow="clipboard-write; fullscreen"
                title={docOverlay.name}
              />
            ) : docOverlay.type === 'webpage' ? (
              <iframe
                src={docOverlay.url}
                className="h-full w-full border-0"
                title={docOverlay.name}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            ) : (
              <iframe
                key={`${docOverlay.url}-gview`}
                src={`https://docs.google.com/gview?url=${encodeURIComponent(docOverlay.url)}&embedded=true`}
                className="h-full w-full border-0"
                title={docOverlay.name}
              />
            )}
          </div>
        </div>
      )}
      {/* Portal contact icons into center of fixed bar */}
      {toolbarCenterPortal && createPortal(
        <div className="flex items-center gap-6">
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: "#25D366" }}>
              <span className="absolute w-10 h-10 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
              <span className="absolute w-14 h-14 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
              <span className="absolute w-[4.5rem] h-[4.5rem] rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
              <WhatsAppIcon className="h-6 w-6 relative z-10" />
            </a>
          )}
          {!isExpanded && !isWebOnly && (business.latitude || business.google_maps_url) && (
            <button
              onClick={() => setShowDirectionsOverlay(true)}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "#404040" }}
              title="Itinéraire"
            >
              <Route className="h-6 w-6" />
            </button>
          )}
        </div>,
        toolbarCenterPortal
      )}
      {/* Portal media button into left of fixed bar */}
      {toolbarLeftPortal && mediaCount > 0 && createPortal(
        <button
          onClick={() => { onToggleExpand?.(); }}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors"
          title="Voir tous les médias"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />
          )}
        </button>,
        toolbarLeftPortal
      )}
      {/* Portal action icons into right of fixed bar */}
      {toolbarPortal && createPortal(
        <>
          <ShareButton title={business.name} variant="dark" className="toolbar-icon" />
          <BookmarkButton businessId={business.id} variant="gold" onLoginRequired={() => setShowClubCard(true)} />
        </>,
        toolbarPortal
      )}
      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative z-0 bg-white">
        {/* EXPANDED MODE: Full media mosaic gallery */}
        {isExpanded ? (
          <div className="p-2" style={{ columns: "250px 3", columnGap: 6 }}>
              {/* Video tile */}
              {hasVideo && (
                <div
                  className="relative cursor-pointer overflow-hidden rounded-lg mb-1.5 break-inside-avoid"
                  style={{ aspectRatio: "16/10" }}
                  onClick={() => { setCurrentImageIndex(0); setIsLightboxOpen(true); }}
                >
                  {(() => {
                    const url = business.video_1_url!;
                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                    if (ytMatch) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=1&controls=0&modestbranding=1&rel=0`}
                          className="w-full h-full pointer-events-none"
                          allow="encrypted-media"
                          frameBorder="0"
                        />
                      );
                    }
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                      return (
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?muted=1&background=1`}
                          className="w-full h-full pointer-events-none"
                          allow="encrypted-media"
                          frameBorder="0"
                        />
                      );
                    }
                    return <video src={url} muted loop playsInline className="w-full h-full object-cover" />;
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="p-3 rounded-full bg-background/70">
                      <Play className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </div>
              )}
              {/* Image tiles — CSS columns masonry, natural proportions */}
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${business.name} - ${i + 1}`}
                  className="w-full rounded-lg cursor-pointer hover:scale-[1.03] transition-transform duration-300 mb-1.5 break-inside-avoid"
                  onClick={() => { setCurrentImageIndex(videoOffset + i); setIsLightboxOpen(true); }}
                />
              ))}
              {/* Matterport tile */}
              {hasMatterport && (
                <div
                  className="cursor-pointer overflow-hidden rounded-lg flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/60 hover:from-primary/10 hover:to-primary/5 transition-colors mb-1.5 break-inside-avoid"
                  style={{ aspectRatio: "16/10" }}
                  onClick={() => { setCurrentImageIndex(matterportIndex); setIsLightboxOpen(true); }}
                >
                  <Box className="h-10 w-10 text-primary" />
                  <span className="text-sm font-semibold text-primary">Visite 3D</span>
                </div>
              )}
              {/* Flipbook tile removed — now accessible via document icons */}
          </div>
        ) : (
        <>
        {/* Image display */}
        {mediaCount > 0 && (
          <div className="relative">
            {(
              /* Standard carousel for non-expanded or few images */
              <div ref={mediaContainerRef} className={`relative w-full aspect-square sm:aspect-[16/9] bg-muted ${mediaCount > 1 ? "cursor-pointer" : ""}`} onClick={() => { if (mediaCount > 1 && !(hasVideo && currentImageIndex === 0)) setIsLightboxOpen(true); }}>
                {hasVideo && currentImageIndex === 0 ? (
                  (() => {
                    const url = business.video_1_url!;
                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                    if (ytMatch) {
                       return (
                        <iframe
                          key={`yt-${isVideoMuted}`}
                          src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=${isVideoMuted ? 1 : 0}&loop=1&playlist=${ytMatch[1]}&controls=0&modestbranding=1&rel=0`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          frameBorder="0"
                          onError={() => setVideoError(true)}
                        />
                      );
                    }
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                       return (
                        <iframe
                          key={`vi-${isVideoMuted}`}
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=${isVideoMuted ? 1 : 0}&loop=1&background=${isVideoMuted ? 1 : 0}`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          frameBorder="0"
                          onError={() => setVideoError(true)}
                        />
                      );
                    }
                    return (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Blurred background fill — only for portrait/vertical videos */}
                        {!isVideoLandscape && (
                          <video
                            src={url}
                            muted
                            loop
                            playsInline
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-60"
                          />
                        )}
                        <video
                          ref={videoRef}
                          src={url}
                          autoPlay
                          muted={isVideoMuted}
                          loop
                          playsInline
                          className={`relative w-full h-full ${isVideoLandscape ? "object-cover" : "object-contain"}`}
                          onError={() => setVideoError(true)}
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            setIsVideoLandscape(v.videoWidth >= v.videoHeight);
                          }}
                        />
                      </div>
                    );
                  })()
                ) : hasMatterport && currentImageIndex === matterportIndex ? (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex flex-col items-center justify-center gap-3">
                    <Box className="h-12 w-12 text-primary" />
                    <span className="text-sm font-semibold text-primary">Visite 3D</span>
                    <span className="text-xs text-muted-foreground">Cliquez pour lancer</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full overflow-hidden">
                    {/* Blurred background fill — only for portrait images */}
                    {!isCurrentImageLandscape && (
                      <img
                        src={images[currentImageIndex - videoOffset]}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-60"
                      />
                    )}
                    {/* Sharp image */}
                    <img
                      src={images[currentImageIndex - videoOffset]}
                      alt={`${business.name} - ${currentImageIndex - videoOffset + 1}`}
                      className={`relative w-full h-full ${isCurrentImageLandscape ? "object-cover" : "object-contain"}`}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setIsCurrentImageLandscape(img.naturalWidth >= img.naturalHeight);
                      }}
                    />
                  </div>
                )}
                {/* Video controls: Mute + Fullscreen */}
                {hasVideo && currentImageIndex === 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    {business.video_1_url && !business.video_1_url.match(/youtube\.com|youtu\.be|vimeo\.com/) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current?.paused) {
                            videoRef.current.play();
                            setIsVideoPaused(false);
                          } else {
                            videoRef.current?.pause();
                            setIsVideoPaused(true);
                          }
                        }}
                        className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                        title={isVideoPaused ? "Lecture" : "Pause"}
                      >
                        {isVideoPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                      className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                      title="Plein écran"
                    >
                      <Maximize className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsVideoMuted(m => !m); }}
                      className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                    >
                      {isVideoMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                )}
                {/* Default service badge on mobile — centered top of photo */}
                {business.default_service && (
                  <div className="sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="text-xs bg-gold text-black hover:bg-gold/90 border-gold shadow-md">{business.default_service}</Badge>
                  </div>
                )}
                {isVerified && !isInstitution && (
                  <img src={logoGold} alt="WTUCE" className="absolute top-3 right-3 w-[4.5rem] h-[4.5rem] md:w-[7rem] md:h-[7rem] lg:w-[7.5rem] lg:h-[7.5rem] object-contain opacity-90 pointer-events-none drop-shadow-lg" />
                )}
                {mediaCount > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? mediaCount - 1 : i - 1); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === mediaCount - 1 ? 0 : i + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/80 text-xs text-foreground">
                      {currentImageIndex + 1} / {mediaCount}
                    </div>
                    {mediaCount > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                        className="hidden sm:block absolute bottom-2 left-2 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-md hover:bg-background transition-colors"
                      >
                        {language === "en" ? `View all ${mediaCount} photos` : language === "ar" ? `عرض ${mediaCount} صور` : `Voir les ${mediaCount} photos`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sentinel to detect when images are scrolled past */}
        <div ref={mediaEndSentinelRef} className="h-0 w-full" />

        {/* Sticky sub-header: name, rating, logo, open badge */}
        {showStickyHeader && (
          <div className="sticky top-0 z-20 bg-white border-b border-border">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{business.name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {avgOn20 !== null && (
                    <>
                      <Star className="h-3 w-3 text-gold fill-gold" />
                      <span className="font-bold text-gold">{avgOn20}/20</span>
                      {totalReviewCount > 0 && <span>· {totalReviewCount.toLocaleString("fr-FR")} avis</span>}
                    </>
                  )}
                  {openBadgeText && (
                    <span className="hidden md:contents">
                      <span>·</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${openBadgeIsOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        {openBadgeText}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              {business.default_service && (
                <Badge className="hidden sm:inline-flex shrink-0 text-xs bg-gold text-black hover:bg-gold/90 border-gold">{business.default_service}</Badge>
              )}
              {/* Social media icons */}
              {(() => {
                const socials = [
                  { url: business.facebook_url, color: "#1877F2", icon: <FacebookIcon className="h-6 w-6" /> },
                  { url: business.instagram_url, color: "#E4405F", icon: <InstagramIcon className="h-6 w-6" /> },
                  { url: business.linkedin_url, color: "#0A66C2", icon: <LinkedInIcon className="h-6 w-6" /> },
                  { url: business.youtube_url, color: "#FF0000", icon: <YouTubeIcon className="h-6 w-6" /> },
                  { url: business.tiktok_url, color: "#000000", icon: <TikTokIcon className="h-6 w-6" /> },
                  { url: business.twitter_url, color: "#000000", icon: <TwitterIcon className="h-6 w-6" /> },
                  { url: business.pinterest_url, color: "#E60023", icon: <PinterestIcon className="h-6 w-6" /> },
                  { url: business.vimeo_url, color: "#1AB7EA", icon: <VimeoIcon className="h-6 w-6" /> },
                ].filter(s => s.url);
                return socials.length > 0 ? (
                  <div className="flex items-center gap-3 shrink-0">
                    {socials.map((s, i) => (
                      <a key={i} href={s.url!} target="_blank" rel="noopener noreferrer" className="text-foreground hover:opacity-70 transition-opacity grayscale">
                        {s.icon}
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            {/* Sticky tabs bar */}
            {showStickyTabs && (
              <div className={`flex gap-1 overflow-x-auto no-scrollbar border-t border-border px-5 ${bookingUrl ? 'pr-16' : ''}`}>
                {[
                  { id: "apercu", label: "Aperçu", show: !!business.description },
                  { id: "contact", label: "Contact", show: !!(business.address || business.phone || business.email || business.whatsapp) },
                  { id: "avis", label: "Avis clients", show: !!(reviews.length > 0 || avgOn20) },
                  { id: "localiser", label: "Localiser", show: !isWebOnly && !!business.google_maps_url },
                  { id: "services", label: "Services", show: !!(business.services && activeServiceNames && business.services.some(s => activeServiceNames.has(s))) },
                  { id: "social", label: "Social", show: socialPostCount !== null && socialPostCount > 0 },
                  { id: "similaires", label: "Similaires", show: true },
                  { id: "acote", label: "À côté", show: !!(business.latitude && business.longitude) },
                ].filter(t => t.show).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`p-5 space-y-5 relative z-10 bg-white ${bookingUrl ? 'pr-10' : ''}`}>
          {/* Name + badges */}
          <div>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-foreground leading-tight">{business.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {avgOn20 !== null && (
                    <>
                      <Star className="h-4 w-4 text-gold fill-gold" />
                      <span className="font-bold text-gold">{avgOn20}/20</span>
                      {totalReviewCount > 0 && <span>· {totalReviewCount.toLocaleString("fr-FR")} avis</span>}
                      <span>·</span>
                    </>
                  )}
                  {isVerified && !isInstitution && (
                    <>
                      <BadgeCheck className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-gold">Vérifié</span>
                      <span>·</span>
                    </>
                  )}
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{business.city}{business.neighborhood ? `, ${business.neighborhood}` : ""}</span>
                </div>
              </div>
              <div className={`flex items-center gap-2 shrink-0 ${bookingUrl ? 'mr-14' : ''}`}>
                {business.default_service && (
                  <Badge className="hidden sm:inline-flex text-xs bg-gold text-black hover:bg-gold/90 border-gold">{business.default_service}</Badge>
                )}
                {voiceStatus === "recording" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium animate-pulse">
                    <Mic className="h-3.5 w-3.5" />
                    <span>Je vous écoute…</span>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Opening status */}
          {openBadgeText && (
            <div className={`flex items-center gap-2 text-sm font-medium ${openBadgeIsOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Clock className="h-4 w-4" />
              {openBadgeText}
            </div>
          )}


          {/* Hook */}
          {hook && (
            <p className="text-lg sm:text-2xl italic leading-relaxed text-muted-foreground" style={{ fontFamily: "'Libre Baskerville', serif" }}>
              {hook}
            </p>
          )}

          {/* Tabs navigation */}
          <div ref={descriptionRef} className={`flex gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-5 px-5 scroll-mt-28 ${bookingUrl ? 'pr-16' : ''}`}>
            {[
              { id: "apercu", label: "Aperçu", show: !!business.description },
              { id: "contact", label: "Contact", show: hasContact },
              { id: "avis", label: "Avis clients", show: !!(reviews.length > 0 || avgOn20) },
              { id: "localiser", label: "Localiser", show: !isWebOnly && !!business.google_maps_url },
              { id: "services", label: "Services", show: !!(business.services && activeServiceNames && business.services.some(s => activeServiceNames.has(s))) },
              { id: "social", label: "Social", show: socialPostCount !== null && socialPostCount > 0 },
              { id: "similaires", label: "Similaires", show: similarCount === null || similarCount > 0 },
              { id: "acote", label: "À côté", show: nearbyCount === null || nearbyCount > 0 },
            ].filter(t => t.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sentinel: triggers sticky tabs when inline tabs scroll out */}
          <div ref={tabsSentinelRef} className="h-0 w-full" />

          {/* Description */}
          {business.description && (
            <>
              <div className="relative">
                <div
                  className={`text-sm text-foreground leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>br]:content-[''] [&>br]:block [&>br]:mb-2 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-5 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-3 [&>h3]:mt-4 overflow-hidden transition-all duration-300 ${isDescriptionExpanded ? "" : "max-h-[21em]"}`}
                  dangerouslySetInnerHTML={{ __html: business.description }}
                />
                {!isDescriptionExpanded && (business.description?.length ?? 0) >= 1000 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {!isDescriptionExpanded && (business.description?.length ?? 0) > 500 && (
                <button
                  onClick={() => setIsDescriptionExpanded(true)}
                  className="w-[20%] py-2 rounded-lg border border-border bg-muted/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Voir +
                </button>
              )}
            </>
          )}


          {hasContact && (
          <div ref={contactSectionRef} className="border-t border-border py-5 scroll-mt-28 space-y-4">

            {/* Address — full width */}
            {business.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Adresse</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{business.address}</p>
                </div>
              </div>
            )}

            {/* Nous joindre — Phone + WhatsApp + Skype grouped */}
            {(business.phone || business.whatsapp || business.skype) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
                <div className="space-y-2">
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 text-sm hover:text-foreground transition-colors group">
                      <Phone className="h-4 w-4 shrink-0 text-foreground" />
                      <span className="text-muted-foreground group-hover:text-foreground">{business.phone}</span>
                    </a>
                  )}
                  {business.whatsapp && (
                    <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm hover:text-foreground transition-colors group">
                      <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
                      <span className="text-muted-foreground group-hover:text-foreground">{business.whatsapp}</span>
                    </a>
                  )}
                  {business.skype && (
                    <a href={`skype:${business.skype}?chat`} className="flex items-center gap-2.5 text-sm hover:text-foreground transition-colors group">
                      <svg className="h-4 w-4 shrink-0 text-[#00AFF0]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324M23.153 13.534c.227-.9.345-1.836.345-2.798 0-3.151-1.24-6.105-3.494-8.319C17.79.193 14.791-1.027 11.591-1.027c-.866 0-1.72.086-2.553.252C7.688-.186 6.126-.638 4.469-.638c-4.687 0-8.5 3.813-8.5 8.5 0 1.599.442 3.095 1.209 4.376-.27.939-.414 1.922-.414 2.931 0 3.151 1.24 6.105 3.494 8.319 2.214 2.175 5.213 3.395 8.413 3.395.866 0 1.72-.086 2.553-.252 1.351.911 2.913 1.363 4.57 1.363 4.687 0 8.5-3.813 8.5-8.5 0-1.599-.442-3.095-1.209-4.376"/></svg>
                      <span className="text-muted-foreground group-hover:text-foreground">{business.skype}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Liens — Web, Email, Réservation, Boutique */}
            {(business.website || business.email || business.reserve_now_url || business.online_shop_url) && (
              <div className="space-y-1.5">
                {business.website && (
                  <button
                    onClick={() => setDocOverlay({ url: business.website!.replace(/^http:\/\//i, 'https://'), name: 'Site web', type: 'webpage' })}
                    className="text-sm hover:text-foreground transition-colors flex items-center gap-2 text-left"
                  >
                    <Globe className="h-4 w-4 shrink-0 text-foreground/60" />
                    <span className="text-foreground/70 font-medium">Site web</span>
                  </button>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`} className="text-sm hover:text-foreground transition-colors flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-foreground/60" />
                    <span className="text-foreground/70 font-medium">Email</span>
                  </a>
                )}
                {business.reserve_now_url && (
                  <button
                    onClick={() => {
                      if (/^https?:\/\/(api\.)?whatsapp\.com/i.test(business.reserve_now_url!)) {
                        window.open(business.reserve_now_url!, "_blank", "noopener,noreferrer");
                      } else {
                        setForceBookingOverlay(true);
                      }
                    }}
                    className="text-sm hover:text-foreground transition-colors flex items-center gap-2 text-left"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-foreground/60" />
                    <span className="text-foreground/70 font-medium">Réservation</span>
                  </button>
                )}
                {business.online_shop_url && (
                  <a href={business.online_shop_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-foreground transition-colors flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 shrink-0 text-foreground/60" />
                    <span className="text-foreground/70 font-medium">Boutique en ligne</span>
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Opening Hours */}
              {canShowOpenBadge && (
                <div className={businessDocs.length > 0 ? "" : "col-span-2"}>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground mb-1.5">
                        Horaires
                        {openBadgeText && (
                          <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${openBadgeIsOpen ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                            {openBadgeText}
                          </span>
                        )}
                      </p>
                      {business.is_open_24h ? (
                        <p className="text-sm text-muted-foreground">Ouvert 24h/24</p>
                      ) : business.opening_hours ? (
                        <div className="space-y-0.5">
                          {(() => {
                            const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                            const dayNames: Record<string, string> = { monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim" };
                            const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                            const hours = business.opening_hours as Record<string, any>;
                            const now = new Date();
                            const todayKey = dayOrder[now.getDay()];
                            return displayOrder.map(day => {
                              const dh = hours[day];
                              if (!dh) return null;
                              const isToday = day === todayKey;
                              return (
                                <div key={day} className={`flex gap-3 text-sm ${isToday ? 'font-bold' : ''}`}>
                                  <span className={`font-medium ${isToday ? 'text-foreground' : ''}`}>
                                    {dayNames[day]}{isToday ? ' ●' : ''}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatDayHoursDisplay(dh, { language })}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Document icons — max 4, aligned left under Téléphone */}
              {businessDocs.length > 0 && (
                <div className={`flex items-start justify-start ${!canShowOpenBadge ? 'col-span-2' : ''}`}>
                  <div className="grid grid-cols-2 gap-3">
                    {businessDocs.slice(0, 4).map((doc) => {
                      const iconFile = doc.icon || 'icon_menu';
                      // Try exact match with known extensions
                      const knownExtensions: Record<string, string> = {
                        'icon_cocktails': '.avif',
                        'icon_cocktails2': '.png',
                        'icon_menu': '.png',
                        'icon_wine': '.png',
                      };
                      const ext = knownExtensions[iconFile] || '.png';
                      const iconSrc = `/images/doc-icons/${iconFile}${ext}`;
                      const isPdf = doc.url?.toLowerCase().endsWith('.pdf') || doc.url?.includes('/pdfs/');
                      const isFlipbook = /issuu\.com|calameo\.com/i.test(doc.url || '');
                      // Open every document inside the internal overlay
                      const isInlineDoc = true;
                      const handleClick = (e: React.MouseEvent) => {
                        if (isInlineDoc) {
                          e.preventDefault();
                          const docType = isFlipbook ? 'flipbook' : isPdf ? 'pdf' : 'webpage';
                          setDocOverlay({ url: doc.url, name: doc.name || (doc.type === "flipbook" ? "Flipbook" : "Menu"), type: docType });
                        }
                      };
                      return (
                        <a
                          key={doc.id}
                          href={doc.url}
                          target={isInlineDoc ? undefined : "_blank"}
                          rel={isInlineDoc ? undefined : "noopener noreferrer"}
                          onClick={handleClick}
                          className="flex flex-col items-center gap-1 group cursor-pointer"
                          title={doc.name || (doc.type === "flipbook" ? "Flipbook" : "Menu")}
                        >
                          <img
                            src={iconSrc}
                            alt={doc.name || doc.type}
                            className="h-[72px] w-[72px] object-contain group-hover:scale-110 transition-transform"
                            onError={(e) => { (e.target as HTMLImageElement).src = `/images/doc-icons/icon_menu.png`; }}
                          />
                          <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[72px] truncate">
                            {doc.name || (doc.type === "flipbook" ? "Flipbook" : "Menu")}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reserve now CTA — or availability check if LiteAPI mapped */}
              {(business.reserve_now_url || hasLiteApiMapping) && (
                <div className="col-span-2 flex justify-center mt-2">
                  {hasLiteApiMapping ? (
                    <button
                    onClick={() => {
                        if (hasLiteApiMapping) {
                          setAvailabilityOverlayCtx({
                            liteApiHotelId: liteApiHotelId!,
                            businessName: business.name,
                            businessCity: business.city || undefined,
                            backgroundImage: business.images?.[0] || undefined,
                          });
                        }
                        setIsBookingOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 w-full sm:w-[60%] py-3 rounded-xl bg-gold text-gold-foreground font-semibold text-sm hover:bg-gold/90 transition-colors"
                    >
                      {language === "en" ? "Check availability" : language === "ar" ? "تحقق من التوفر" : "Vérifier la disponibilité"}
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const url = business.reserve_now_url || bookingUrl || "";
                        if (/^https?:\/\/(api\.)?whatsapp\.com/i.test(url)) {
                          window.open(url, "_blank", "noopener,noreferrer");
                        } else {
                          setIsBookingOpen(true);
                          setForceBookingOverlay(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 w-auto px-6 md:w-[60%] md:px-0 py-3 rounded-xl bg-gold text-gold-foreground font-semibold text-sm hover:bg-gold/90 transition-colors whitespace-nowrap"
                    >
                      {language === "en" ? "Book now" : language === "ar" ? "احجز الآن" : "Réserver maintenant"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
          )}


          {menuSummaries.length > 0 && (
            <div className="space-y-4 border-t border-border pt-6 pb-2">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                {language === "en" ? "Find out more" : language === "ar" ? "اكتشف المزيد" : "En savoir plus"}
              </h3>
              {menuSummaries.length === 1 ? (
                <div className="space-y-2">
                  {(() => { const summary = menuSummaries[0]; return (<>
                    {summary.title && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-semibold text-base">{summary.title}</h4>
                        {summary.avg_price_range && (
                          <div className="flex flex-col items-start gap-0.5">
                            <Badge variant="outline" className="bg-muted/30">
                              * {language === "en" ? "Average price excl. drinks" : language === "ar" ? "متوسط السعر بدون مشروبات" : "Prix moyen hors boissons"} :{" "}
                              <span className="font-semibold ml-1">
                                {summary.avg_price_range.min && summary.avg_price_range.max && summary.avg_price_range.min !== summary.avg_price_range.max
                                  ? `${summary.avg_price_range.min} - ${summary.avg_price_range.max}`
                                  : summary.avg_price_range.min || summary.avg_price_range.max} {summary.avg_price_range.currency || "MAD"}
                              </span>
                            </Badge>
                            <span className="text-[10px] text-muted-foreground italic ml-1">* {language === "en" ? "one starter + one main" : language === "ar" ? "مقبلة + طبق رئيسي" : "une entrée + un plat"}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!summary.title && summary.avg_price_range && (
                      <div className="flex flex-col items-start gap-0.5">
                        <Badge variant="outline" className="bg-muted/30">
                          * {language === "en" ? "Average price excl. drinks" : language === "ar" ? "متوسط السعر بدون مشروبات" : "Prix moyen hors boissons"} :{" "}
                          <span className="font-semibold ml-1">
                            {summary.avg_price_range.min && summary.avg_price_range.max && summary.avg_price_range.min !== summary.avg_price_range.max
                              ? `${summary.avg_price_range.min} - ${summary.avg_price_range.max}`
                              : summary.avg_price_range.min || summary.avg_price_range.max} {summary.avg_price_range.currency || "MAD"}
                          </span>
                        </Badge>
                        <span className="text-[10px] text-muted-foreground italic ml-1">* {language === "en" ? "one starter + one main" : language === "ar" ? "مقبلة + طبق رئيسي" : "une entrée + un plat"}</span>
                      </div>
                    )}
                    {summary.content && (
                      <div className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_li]:mb-0.5 [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: summary.content }} />
                    )}
                    {summary.price_details && (
                      <div className="text-xs text-muted-foreground italic mt-1 [&>p]:mb-0 [&>p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: summary.price_details }} />
                    )}
                  </>); })()}
                </div>
              ) : (
                <div
                  ref={menuScrollRef}
                  className="w-full overflow-x-auto scrollbar-hide"
                  style={{ touchAction: "pan-y" }}
                  onMouseDown={handleMenuMouseDown}
                  onMouseUp={resetMenuMouseDrag}
                  onMouseLeave={resetMenuMouseDrag}
                  onDragStart={(event) => event.preventDefault()}
                >
                  <div className="flex gap-2 pr-2 select-none cursor-grab active:cursor-grabbing">
                    {menuSummaries.map((summary, idx) => (
                      <div key={summary.id} className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-[80%]">
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                          {summary.title && (
                            <div className="flex items-center gap-3 flex-wrap">
                              <h4 className="font-semibold text-base">{summary.title}</h4>
                              {summary.avg_price_range && (
                                <div className="flex flex-col items-start gap-0.5">
                                  <Badge variant="outline" className="bg-muted/30">
                                    * {language === "en" ? "Average price excl. drinks" : language === "ar" ? "متوسط السعر بدون مشروبات" : "Prix moyen hors boissons"} :{" "}
                                    <span className="font-semibold ml-1">
                                      {summary.avg_price_range.min && summary.avg_price_range.max && summary.avg_price_range.min !== summary.avg_price_range.max
                                        ? `${summary.avg_price_range.min} - ${summary.avg_price_range.max}`
                                        : summary.avg_price_range.min || summary.avg_price_range.max} {summary.avg_price_range.currency || "MAD"}
                                    </span>
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground italic ml-1">* {language === "en" ? "one starter + one main" : language === "ar" ? "مقبلة + طبق رئيسي" : "une entrée + un plat"}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!summary.title && summary.avg_price_range && (
                            <div className="flex flex-col items-start gap-0.5">
                              <Badge variant="outline" className="bg-muted/30">
                                * {language === "en" ? "Average price excl. drinks" : language === "ar" ? "متوسط السعر بدون مشروبات" : "Prix moyen hors boissons"} :{" "}
                                <span className="font-semibold ml-1">
                                  {summary.avg_price_range.min && summary.avg_price_range.max && summary.avg_price_range.min !== summary.avg_price_range.max
                                    ? `${summary.avg_price_range.min} - ${summary.avg_price_range.max}`
                                    : summary.avg_price_range.min || summary.avg_price_range.max} {summary.avg_price_range.currency || "MAD"}
                                </span>
                              </Badge>
                              <span className="text-[10px] text-muted-foreground italic ml-1">* {language === "en" ? "one starter + one main" : language === "ar" ? "مقبلة + طبق رئيسي" : "une entrée + un plat"}</span>
                            </div>
                          )}
                          {summary.content && (
                            <div className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_li]:mb-0.5 [&_strong]:font-semibold"
                              dangerouslySetInnerHTML={{ __html: summary.content }} />
                          )}
                          {summary.price_details && (
                            <div className="text-xs text-muted-foreground italic mt-1 [&>p]:mb-0 [&>p:last-child]:mb-0"
                              dangerouslySetInnerHTML={{ __html: summary.price_details }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(reviews.length > 0 || avgOn20) && (
            <div ref={reviewsSectionRef} className="space-y-4 scroll-mt-28 border-t pt-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{language === "en" ? "Customer reviews" : language === "ar" ? "آراء العملاء" : "Avis clients"}</h3>
              {/* Global score */}
              {avgOn20 && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gold">{avgOn20}/20</span>
                  {totalReviewCount > 0 && (
                    <span className="text-sm text-muted-foreground">{language === "en" ? `on ${totalReviewCount.toLocaleString('en')} reviews` : language === "ar" ? `على ${totalReviewCount.toLocaleString('ar')} تقييم` : `sur ${totalReviewCount.toLocaleString('fr-FR')} avis`}</span>
                  )}
                </div>
              )}

              {/* Platform cards */}
              {reviews.length > 0 && (
                <div className="space-y-2">
                  {reviews.map(r => {
                    const reviewUrl = r.label === "Google"
                      ? (business.google_reviews_url || business.google_maps_url)
                      : r.label === "TripAdvisor"
                      ? (business.tripadvisor_review_url || business.tripadvisor_url)
                      : r.label === "Restaurant Guru"
                      ? business.restaurant_guru_url
                      : null;
                    return (
                      <div key={r.label} className="flex items-center justify-between p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          {r.label === 'Google' && (
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            </div>
                          )}
                          {r.label === 'TripAdvisor' && (
                            <img src={tripadvisorLogo} alt="TripAdvisor" className="w-10 h-10 rounded-full object-cover shrink-0" />
                          )}
                          {r.label === 'Restaurant Guru' && (
                            <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-10 h-10 rounded-full object-contain shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.label}</p>
                            <p className="text-sm">
                              <span className="font-semibold text-gold">{r.rating}/5</span>
                              <span className="text-muted-foreground"> · {r.count.toLocaleString(language === "en" ? 'en' : language === "ar" ? 'ar' : 'fr-FR')} {language === "en" ? "reviews" : language === "ar" ? "تقييم" : "avis"}</span>
                            </p>
                          </div>
                        </div>
                        {reviewUrl && (
                          <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline flex items-center gap-1 shrink-0">
                            {language === "en" ? "See reviews" : language === "ar" ? "عرض التقييمات" : "Voir les avis"} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Review comments */}
              {reviewTexts.length > 0 && (
                <div>
                  {!showReviewComments ? (
                    <button
                      onClick={() => setShowReviewComments(true)}
                      className="w-full py-2.5 px-4 rounded-xl border border-border bg-muted/30 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Star className="h-4 w-4 text-amber-400" />
                      {language === "en" ? "Read reviews" : language === "ar" ? "قراءة الآراء" : "Lire les avis"}
                      <span className="text-muted-foreground">({reviewTexts.length})</span>
                    </button>
                  ) : (
                    <>
                      {isTranslatingReviews && (
                        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {language === "en" ? "Translating reviews..." : language === "ar" ? "جارٍ ترجمة الآراء..." : "Traduction des avis..."}
                        </div>
                      )}
                      <div className="space-y-2.5">
                        {reviewTexts.map((review, idx) => {
                          const displayText = translatedReviewTexts[idx] || review.text;
                          const langCode = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
                          const wasTranslated = translatedReviewTexts[idx] && review.language && review.language !== langCode;
                          return (
                            <div key={idx} className="p-3 rounded-xl border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                {review.rating && (
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3.5 w-3.5 ${i < review.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                                      />
                                    ))}
                                  </div>
                                )}
                                <span className="text-sm font-semibold text-foreground">
                                  {review.author_name || (language === "en" ? "Anonymous" : language === "ar" ? "مجهول" : "Anonyme")}
                                </span>
                                {review.relative_time && (
                                  <span className="text-xs text-muted-foreground">
                                    · {review.relative_time}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {displayText}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {review.source === 'google' ? 'Google' : review.source === 'tripadvisor' ? 'TripAdvisor' : review.source}
                                </Badge>
                                {wasTranslated && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    {language === "en" ? "Translated" : language === "ar" ? "مترجم" : "Traduit"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google Maps - map only */}
          {!isWebOnly && business.google_maps_url && (() => {
            const extractPlaceName = (url: string) => {
              const m = url.match(/\/place\/([^/@]+)/);
              return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
            };
            const extractCoords = (url: string) => {
              const m = url.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
              if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
              const all = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
              return all.length > 0 ? { lat: parseFloat(all[all.length-1][1]), lng: parseFloat(all[all.length-1][2]) } : null;
            };
            const coords = business.google_maps_url ? extractCoords(business.google_maps_url) : null;
            const placeName = business.google_maps_url ? extractPlaceName(business.google_maps_url) : null;
            const lat = coords?.lat ?? business.latitude ?? null;
            const lng = coords?.lng ?? business.longitude ?? null;
            const fallbackAddr = business.address || (business.neighborhood ? `${business.neighborhood}, ${business.city}` : `${business.city}, ${business.region}`);
            const embedQuery = lat && lng
              ? `${lat},${lng}`
              : placeName || (business.name + (fallbackAddr ? `, ${fallbackAddr}` : ""));
            const mapUrl = lat && lng
              ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}&zoom=17`
              : `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(embedQuery)}&zoom=17`;
            const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(`${business.name}, ${fallbackAddr}`);
            
            return (
              <div ref={mapSectionRef} className="space-y-2 scroll-mt-28">
                <hr className="border-border" />
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation"}</h3>
                <div className="space-y-1.5 text-sm">
                  {business.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      <span>{business.address}</span>
                    </div>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden border border-border relative">
                  <div className="relative">
                    <iframe
                      src={mapUrl}
                      className={`w-full border-0 ${isExpanded ? "h-[500px]" : "h-[350px]"}`}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Carte de ${business.name}`}
                      style={{ pointerEvents: "none" }}
                    />
                    <div
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, "_blank")}
                    />
                  </div>
                  <div className="p-2 flex gap-2">
                    <button
                      onClick={() => setShowDirectionsOverlay(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {language === "en" ? "Directions" : language === "ar" ? "الاتجاهات" : "Itinéraire"}
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Maps
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Services – grouped by subcategory with accordion */}
          {(() => {
            const filteredServices = business.services && activeServiceNames
              ? business.services.filter(s => activeServiceNames.has(s))
              : business.services || [];
            if (filteredServices.length === 0) return null;
            return (
              <>
                <Separator />
                <div ref={servicesSectionRef} className="space-y-3 scroll-mt-28">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Services</h3>
                  {groupedServices.length > 0 ? (
                    <div className="space-y-3">
                      {groupedServices.map((group) => {
                        const isOpen = openServiceGroups.has(group.subcategoryName);
                        const showHeader = groupedServices.length > 1 || group.description;
                        return (
                          <div key={group.subcategoryName} className="rounded-xl overflow-hidden bg-card border border-border">
                            {showHeader && (
                              <button
                                onClick={() => {
                                  setOpenServiceGroups(prev => {
                                    const next = new Set(prev);
                                    if (next.has(group.subcategoryName)) next.delete(group.subcategoryName);
                                    else next.add(group.subcategoryName);
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  {group.icon && (
                                    <DynamicIcon name={group.icon} className="h-5 w-5 text-primary" />
                                  )}
                                  <span className="text-sm font-medium text-foreground capitalize">
                                    {group.subcategoryName.toLowerCase()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({group.services.length})
                                  </span>
                                </div>
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                            {(isOpen || !showHeader) && (
                              <div className={`px-4 pb-4 ${showHeader ? 'pt-0' : 'pt-4'}`}>
                                <ul className="list-disc ml-4 space-y-1.5 marker:text-foreground">
                                  {group.services.map((service, index) => (
                                    <li key={index} className="text-sm">
                                      <span>{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      {[...filteredServices].sort((a, b) => a.localeCompare(b, 'fr')).map(s => (
                        <span key={s} className="text-base text-foreground">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
              </>
            );
          })()}

          {/* Presse – logos from knowledge base */}
          {pressEntries.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Presse</h3>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {pressEntries.map((entry, idx) => {
                    const flag = langToFlag(entry.language);
                    return (
                      <button
                        key={idx}
                        onClick={async () => {
                          if (!entry.url) return;
                          setIsLoadingArticle(true);
                          setArticlePreview(null);
                          try {
                            const { data, error } = await supabase.functions.invoke('scrape-article-summary', {
                              body: { url: entry.url, businessName: business?.name },
                            });
                            if (error || !data?.success) {
                              // Fallback: just open the link
                              window.open(entry.url, '_blank');
                            } else {
                              setArticlePreview({
                                title: data.title || entry.name,
                                summary: data.summary || '',
                                screenshot: data.screenshot || '',
                                url: entry.url,
                                name: entry.name,
                                publishedDate: data.publishedDate || '',
                              });
                            }
                          } catch {
                            window.open(entry.url, '_blank');
                          } finally {
                            setIsLoadingArticle(false);
                          }
                        }}
                        className="hover:opacity-70 transition-opacity flex flex-col items-center gap-1.5 cursor-pointer"
                        disabled={isLoadingArticle}
                      >
                        <div className="h-12 w-24 flex items-center justify-center">
                          <img src={entry.logo_url} alt={entry.name} className="max-h-12 max-w-24 object-contain" />
                        </div>
                        {flag && <span className="text-base leading-none">{flag}</span>}
                      </button>
                    );
                  })}
                </div>
                {isLoadingArticle && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Article preview modal */}
              {articlePreview && (
                <div className="rounded-lg border bg-card p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-foreground leading-tight">{articlePreview.title}</h4>
                    <button onClick={() => setArticlePreview(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {articlePreview.screenshot && (
                    <img src={articlePreview.screenshot} alt="" className="w-full rounded-md border" />
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">{articlePreview.summary}</p>
                  <a
                    href={articlePreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Lire l'article complet <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {articlePreview.publishedDate && (
                    <p className="text-xs text-muted-foreground">
                      Publié le {(() => {
                        try {
                          const d = new Date(articlePreview.publishedDate);
                          if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                        } catch {}
                        return articlePreview.publishedDate;
                      })()}
                    </p>
                  )}
                </div>
              )}

              <Separator />
            </>
          )}

          {/* LiteAPI Availability Section */}
          {liteApiData && liteApiData.offers.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">
                    {language === "en" ? "Live Availability" : "Disponibilités en temps réel"}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(liteApiData.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" → "}
                    {new Date(liteApiData.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                  {liteApiData.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {liteApiData.rating}/10
                      {liteApiData.reviewCount != null && (
                        <span className="text-muted-foreground">({liteApiData.reviewCount})</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {liteApiData.offers.slice(0, 5).map((offer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{offer.roomName}</p>
                        {offer.paymentType && (
                          <Badge variant="outline" className="text-[10px] mt-1">{offer.paymentType}</Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary ml-3 shrink-0">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: offer.currency, minimumFractionDigits: 0 }).format(parseFloat(offer.price))}
                      </p>
                    </div>
                  ))}
                  {liteApiData.offers.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{liteApiData.offers.length - 5} {language === "en" ? "more offers" : "autres offres"}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Social embeds */}
          <div ref={socialSectionRef} className="scroll-mt-28" />
          <SocialEmbedsTab businessId={business.id} onPostCount={setSocialPostCount} />
          {socialPostCount !== null && socialPostCount > 0 && <Separator />}

          {/* Similar businesses */}
          <div ref={similarSectionRef} className="scroll-mt-28" />
          <SimilarBusinesses
            currentBusinessId={business.id}
            categories={business.categories}
            city={business.city}
            onNavigate={(id) => { setAvailabilityOverlayCtx(null); setIsBookingOpen(false); setInternalBusinessId(id); scrollContainerRef.current?.scrollTo({ top: 0 }); if (isExpanded) onToggleExpand?.(); }}
            onLoginRequired={() => setShowClubCard(true)}
            scrollRef={similarSectionRef}
            onResultCount={setSimilarCount}
          />
          {similarCount !== 0 && nearbyCount !== 0 && <Separator />}

          {/* Nearby businesses */}
          <div ref={nearbySectionRef} className="scroll-mt-28" />
          <NearbyBusinesses
            currentBusinessId={business.id}
            businessName={business.name}
            latitude={business.latitude}
            longitude={business.longitude}
            currentSubcategory={business.categories?.[0] ?? null}
            currentCategories={business.categories}
            onNavigate={(id) => { setAvailabilityOverlayCtx(null); setIsBookingOpen(false); setInternalBusinessId(id); scrollContainerRef.current?.scrollTo({ top: 0 }); if (isExpanded) onToggleExpand?.(); }}
            onLoginRequired={() => setShowClubCard(true)}
            scrollRef={nearbySectionRef}
            onResultCount={setNearbyCount}
          />
          {nearbyCount !== 0 && <Separator />}

          {/* Bottom spacer for floating bar */}
          <div className="h-24" />
        </div>
        </>
        )}
      </div>

      {/* Fullscreen lightbox — rendered via portal to escape panel stacking context */}
      {isLightboxOpen && mediaCount > 0 && (() => {
        const items: MediaItem[] = [];
        if (hasVideo) items.push({ type: "video", src: business.video_1_url!, alt: business.name });
        images.forEach((src, i) => items.push({ type: "image", src, alt: `${business.name} - ${i + 1}` }));
        if (hasMatterport) items.push({ type: "matterport", src: business.matterport_url!, alt: `Visite 3D - ${business.name}` });
        return (
          <FullscreenLightbox
            items={items}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
            onClose={() => { setIsLightboxOpen(false); if (isExpanded) onToggleExpand?.(); scrollContainerRef.current?.scrollTo({ top: 0 }); }}
          />
        );
      })()}
      {/* Club signup floating overlay - centered in panel */}
      {showClubCard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in-0">
          <div className="w-3/4 max-w-xs rounded-2xl overflow-hidden shadow-xl border border-border animate-in slide-in-from-top-4">
            <div style={{ backgroundColor: "#6050DC" }} className="p-5 text-white relative">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowClubCard(false); }}
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
              <p className="text-sm opacity-90">{language === "en" ? "Welcome to" : language === "ar" ? "مرحباً بكم في" : "Bienvenue dans"}</p>
              <h3 className="text-xl font-bold mt-1">{language === "en" ? "the OWM Club" : language === "ar" ? "نادي OWM" : "le Club OWM"}</h3>
            </div>
            <div className="bg-card p-5 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {language === "en"
                  ? "Sign up to save your favorite addresses and access exclusive benefits."
                  : language === "ar"
                    ? "سجّل لحفظ عناوينك المفضلة والحصول على مزايا حصرية."
                    : "Inscrivez-vous pour sauvegarder vos adresses favorites et accéder à des avantages exclusifs."}
              </p>
              <a
                href="/club"
                style={{ backgroundColor: "#6050DC" }}
                className="inline-block rounded-full px-8 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md"
              >
                {language === "en" ? "Join now" : language === "ar" ? "سجّل الآن" : "Je m'inscris"}
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                {language === "en" ? "Already have an account? " : language === "ar" ? "لديك حساب بالفعل؟ " : "Vous avez déjà un compte ? "}
                <a href="/club" className="font-semibold hover:underline" style={{ color: "#6050DC" }}>
                  {language === "en" ? "Sign in" : language === "ar" ? "تسجيل الدخول" : "Connectez-vous"}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fallback hotels left panel – lives outside the overlay */}
      {fallbackPanelData && !fallbackHiddenOnMobile && createPortal(
        <div className={leftPanelPortalRef?.current ? "absolute inset-0 z-10 flex" : "fixed inset-0 z-[220] lg:z-[200] flex flex-col lg:justify-start lg:right-auto lg:w-1/2 lg:top-[53px]"}>
          {/* Desktop backdrop only */}
          {!leftPanelPortalRef?.current && (
            <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={() => setFallbackPanelData(null)} />
          )}
          <div className="
            relative bg-black/90 backdrop-blur-md flex flex-col overflow-hidden
            w-full
            h-full
            lg:rounded-none
            animate-fade-in lg:animate-slide-in-left
          ">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div>
                <p className="text-sm font-bold text-white">
                  {language === "en" ? `Hotels in ${fallbackPanelData.city}` : `Hôtels à ${fallbackPanelData.city}`}
                </p>
                <p className="text-xs text-white/60">
                  {fallbackPanelData.checkIn} → {fallbackPanelData.checkOut} · {fallbackPanelData.adults} {language === "en" ? "adult(s)" : "adulte(s)"}
                </p>
              </div>
              <button
                onClick={() => setFallbackPanelData(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 pb-24">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...fallbackPanelData.hotels.filter(h => h.hotelId !== selectedFallbackHotelId)].sort((a, b) => {
                  const aV = a.wtuce_status === "verified" ? 1 : 0;
                  const bV = b.wtuce_status === "verified" ? 1 : 0;
                  if (bV !== aV) return bV - aV;
                  const computeRating = (h: typeof a) => {
                    const src: { rating: number; count: number }[] = [];
                    if (h.dbGoogleRating && h.dbGoogleReviewCount) src.push({ rating: h.dbGoogleRating, count: h.dbGoogleReviewCount });
                    if (h.dbTripadvisorRating && h.dbTripadvisorReviewCount) src.push({ rating: h.dbTripadvisorRating, count: h.dbTripadvisorReviewCount });
                    const total = src.reduce((s, r) => s + r.count, 0);
                    if (total === 0) return 0;
                    return src.reduce((s, r) => s + (r.rating / 5) * 20 * r.count, 0) / total;
                  };
                  return computeRating(b) - computeRating(a);
                }).map((hotel) => {
                  const cheapest = hotel.offers.length > 0
                    ? hotel.offers.reduce((a, b) => parseFloat(a.price.total) < parseFloat(b.price.total) ? a : b)
                    : null;
                  const img = hotel.dbImage || hotel.mainImage;
                  // Compute our weighted rating from DB data
                  const sources: { rating: number; count: number }[] = [];
                  if (hotel.dbGoogleRating && hotel.dbGoogleReviewCount) sources.push({ rating: hotel.dbGoogleRating, count: hotel.dbGoogleReviewCount });
                  if (hotel.dbTripadvisorRating && hotel.dbTripadvisorReviewCount) sources.push({ rating: hotel.dbTripadvisorRating, count: hotel.dbTripadvisorReviewCount });
                  const totalReviews = sources.reduce((s, r) => s + r.count, 0);
                  let avgOn20: number | null = null;
                  if (sources.length > 0) {
                    const weighted = sources.reduce((s, r) => s + (r.rating / 5) * 20 * r.count, 0);
                    avgOn20 = Math.round((weighted / totalReviews) * 10) / 10;
                  }

                  return (
                    <div
                      key={hotel.hotelId}
                      className="group overflow-hidden rounded-xl border border-white/15 shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hotel.businessId) {
                          setSelectedFallbackHotelId(hotel.hotelId);
                          setInternalBusinessId(hotel.businessId);
                          scrollContainerRef.current?.scrollTo({ top: 0 });
                          if (isExpanded) onToggleExpand?.();
                          // On mobile/tablet, hide fallback panel so BusinessSlidePanel is visible (can be restored on close)
                          if (window.innerWidth < 1024) {
                            setFallbackHiddenOnMobile(true);
                          }
                        }
                      }}
                    >
                      {img ? (
                        <img src={img} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                          <BedDouble className="h-10 w-10 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      {hotel.wtuce_status === "verified" && (
                        <div className="absolute top-2 right-2 z-10">
                          <img src={logoGold} alt="WTUCE" className="w-[5.25rem] h-[5.25rem] object-contain" />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                        <p className="font-semibold text-sm text-white leading-tight line-clamp-2">{hotel.name}</p>
                        
                        {avgOn20 && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Star className="h-3 w-3 text-gold fill-gold" />
                            <span className="font-medium text-white">{avgOn20}/20</span>
                            {totalReviews > 0 && (
                              <span className="text-white/70">· {totalReviews} {language === "en" ? "reviews" : "avis"}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          {cheapest && (
                            <p className="text-base font-bold text-white">
                              {new Intl.NumberFormat(language === "ar" ? "ar-MA" : language === "en" ? "en-US" : "fr-FR", {
                                style: "currency", currency: cheapest.price.currency, minimumFractionDigits: 0,
                              }).format(parseFloat(cheapest.price.total))}
                            </p>
                          )}
                          <span className="text-[10px] text-white/50">
                            {hotel.offers.length} {language === "en" ? "room(s)" : "chambre(s)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>,
        leftPanelPortalRef?.current || document.body
      )}
    </div>
  );
});

BusinessSlidePanel.displayName = "BusinessSlidePanel";

export default BusinessSlidePanel;
