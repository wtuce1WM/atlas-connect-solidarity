import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEmbedIframeHeight } from "@/hooks/useEmbedIframeHeight";
import { DesktopMediaArrows, useOwnerLogo } from "@/components/CardsVisibilityToggle";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import { YoutubeScrubBar } from "@/components/video/YoutubeScrubBar";
import { createPortal } from "react-dom";
import { MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, CalendarCheck, Star, Loader2, Expand, Plus, Image as ImageIcon, Sparkles, Newspaper, ExternalLink, MessageCircle, Film, Globe, Clock, Play, Pause, Volume2, VolumeX, Building2, Compass, ShoppingCart, SlidersHorizontal, CheckCircle2, Circle, Navigation, Heart, BookOpen, Award, Leaf, Truck, Accessibility, Package } from "lucide-react";
import { GiWalkingBoot } from "react-icons/gi";
import { BsCalendarDay, BsCarFrontFill } from "react-icons/bs";
import HScroll from "@/components/HScroll";
import ShareButton from "@/components/ShareButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { haversineKm } from "@/lib/haversine";
import { AirbnbIcon, BookingIcon, FacebookIcon, InstagramIcon, TikTokIcon, TripAdvisorIcon, YouTubeIcon, TwitterIcon, LinkedInIcon, PinterestIcon, VimeoIcon, SnapchatIcon } from "@/components/staff/SocialMediaIcons";
import DynamicIcon from "@/components/DynamicIcon";
import HotelAvailabilityOverlay, { type FallbackPanelData, type FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import { supabase } from "@/integrations/supabase/client";

import wooshSfx from "@/assets/woosh.wav";
import { playWoosh } from "@/lib/overlayConstants";
import poiNearbyImg from "@/assets/poi-nearby.webp";
import glovoLogo from "@/assets/glovo-logo.png";
import FullscreenLightbox from "@/components/FullscreenLightbox";

import { whatsappUrl } from "@/lib/phoneUtils";
import { groupImagesWithHeadings } from "@/lib/groupImagesWithHeadings";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import PanelHashtagsOverlay from "@/components/overlays/PanelHashtagsOverlay";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import VideoSlidePanel from "@/components/VideoSlidePanel";
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
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import PoiFilterChoiceOverlay from "@/components/PoiFilterChoiceOverlay";

import { useBookOnlineData } from "@/hooks/useBookOnlineData";
import type { Destination, PoiBusiness } from "@/hooks/useBookOnlineData";
import VideoDocumentOverlay from "@/components/overlays/VideoDocumentOverlay";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import ExternalVideosOverlay from "@/components/overlays/ExternalVideosOverlay";
import { isExternalVideoUrl } from "@/lib/videoSourceFilter";
import DocumentOverlay from "@/components/overlays/DocumentOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import OverlayShell from "@/components/overlays/OverlayShell";
import RevealScrollArea from "@/components/slidepanel/RevealScrollArea";
import DescAnchorBar from "@/components/slidepanel/DescAnchorBar";
import WidgetCodeEmbed from "@/components/widgets/WidgetCodeEmbed";
import SpotifyOverlay from "@/components/overlays/SpotifyOverlay";
import SubstackArticlesOverlay from "@/components/overlays/SubstackArticlesOverlay";
import SubstackIcon from "@/components/icons/SubstackIcon";
import InlineSubstackWidget from "@/components/InlineSubstackWidget";
import InlineYouTubeSection from "@/components/InlineYouTubeSection";
import PhoneMockupFrame from "@/components/PhoneMockupFrame";
import SoundCloudOverlay from "@/components/overlays/SoundCloudOverlay";
import SerpApiHotelOverlay from "@/components/SerpApiHotelOverlay";
import PanelSearchBar from "@/components/PanelSearchBar";


import { useHotelAvailability } from "@/hooks/useHotelAvailability";
import { useOpenStatus } from "@/hooks/useOpenStatus";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFrontStructureTabs } from "@/hooks/useFrontStructureTabs";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";
import { translateFrontStructure } from "@/lib/frontStructureTranslations";
import { withLangPrefix } from "@/lib/localizedPath";
import { ToolbarPortals } from "@/components/slidepanel/ToolbarPortals";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import { CtaBar, CTA_MODE_LABELS } from "@/components/slidepanel/CtaBar";
import VideoSocialBadge, { getVideoSocial } from "@/components/slidepanel/VideoSocialBadge";
import { HotelAvailabilityResult } from "@/components/slidepanel/HotelAvailabilityResult";
import AvailabilitySearchOverlay from "@/components/overlays/AvailabilitySearchOverlay";

// Extracted hooks & components
import { useCtaConfig, resolveCtaLabel } from "@/hooks/useCtaConfig";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { useMediaItems, useVideoInfo } from "@/hooks/useMediaItems";
import { useVimeoOEmbedThumbnails } from "@/hooks/useVimeoOEmbedThumbnails";
import MediaBackground from "@/components/slidepanel/MediaBackground";
import BusinessHeader from "@/components/slidepanel/BusinessHeader";
import MediaViewerInfo from "@/components/slidepanel/MediaViewerInfo";
import BusinessPromotionsList from "@/components/slidepanel/BusinessPromotionsList";
import ImageGallerySection from "@/components/slidepanel/ImageGallerySection";
import { useBusinessPromotions } from "@/hooks/useBusinessPromotions";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildReviewHtml } from "@/lib/reviewHtmlBuilder";
import InlineReviewsSection from "@/components/InlineReviewsSection";
import { translateEngagementLabel } from "@/lib/engagementLabels";

import VideoThumbnail from "@/components/VideoThumbnail";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

const spotifyEmbedUrl = (raw: string): string | null => {
  const match = raw.match(/open\.spotify\.com\/(?:embed\/)?(playlist|album|track|episode|show|artist)\/([a-zA-Z0-9]+)/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=oneworldmorocco` : null;
};

const soundcloudEmbedUrl = (raw: string): string | null => {
  if (!/soundcloud\.com\//i.test(raw)) return null;
  const params = new URLSearchParams({
    url: raw,
    color: "#ff5500",
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "false",
    visual: "true",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
};

/* Convertit un texte HTML (issu du backoffice) en texte lisible, entités décodées */
const htmlToPlainText = (raw: string): string => {
  if (!raw) return "";
  const withBreaks = raw
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  const el = document.createElement("textarea");
  el.innerHTML = withBreaks;
  return el.value.replace(/\n{3,}/g, "\n\n").trim();
};

/* Static hook text component */
const TypewriterHook = ({ text }: { text: string }) => {
  return (
    <div className="hidden md:block rounded-2xl bg-black/45 backdrop-blur-[3px] border border-white/10 px-6 py-3 max-w-[85%] md:max-w-xl text-center pointer-events-none transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
      <p
        className="text-base md:text-lg text-white/95 font-semibold leading-relaxed [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        {text}
      </p>
    </div>
  );
};

/** Social account info (used by SlidePanelHome migration path) */
interface BookSocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

interface BookOnlineSlidePanelProps {
  businessId?: string;
  /** Display name used when delegating to VideoSlidePanel (no business resolved) */
  businessName?: string;
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
  /** Navigate to previous/next business in the result list (Search page) */
  onPrevBusiness?: () => void;
  onNextBusiness?: () => void;
  hasPrevBusiness?: boolean;
  hasNextBusiness?: boolean;
  // --- Aliases for SlidePanelHome migration (same as onPrev/Next Business) ---
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // --- Video-first entry props (SlidePanelHome migration, not yet wired in render) ---
  /** Forces this video URL as the background, regardless of business video list */
  videoUrl?: string | null;
  videoId?: string | null;
  /** When true, the video is "generic" (no specific business attached) */
  isGeneric?: boolean;
  /** Video owner business (when video has linked_business_id) */
  owner?: { id: string; name: string; logo_url: string | null; logo_bg?: string | null } | null;
  /** Social account behind the video (when no business attached) */
  social?: BookSocialInfo | null;
  showSocialBadge?: boolean;
  /** Description shown on the "+" overlay */
  description?: string | null;
  /** Video title to display at the top */
  videoName?: string | null;
  /** Si défini, affiche ce titre dans le rectangle BusinessHeader à la place du nom+adresse (mode vidéo uniquement) */
  headerVideoTitle?: string | null;
  /** When set, displays the Agenda card for this city */
  agendaCity?: string | null;
  /** When set, displays CTAs for the event's linked business */
  eventId?: string | null;
  /** Override pageBusinessName/Id when video document is on a POI page */
  pageBusinessName?: string | null;
  pageBusinessId?: string | null;
  /** Compact business header (background hugs the name, centered) */
  compactBusinessHeader?: boolean;
  /** Serialized Test/Home page context for restoring previous state on close */
  returnContext?: string | null;
  /** Currently playing media time (sync between vignette and panel) */
  currentTime?: number;
  onTimeUpdate?: (t: number) => void;
  /** Controls open state externally (parent unmounts when closed) */
  open?: boolean;
  /** Whether to hide directions button (Itinéraire) */
  hideDirections?: boolean;
  /** Whether to hide secondary CTAs (URLs 2-5) */
  hideSecondaryCtas?: boolean;
  /** Hide the entire left-side CTAs column (e.g. YouTube button) */
  hideLeftCtas?: boolean;
  /** Editorial label coming from the thumbnail manualCard badge */
  manualCardLabel?: string | null;
  /** Price value for the price badge */
  price?: string | null;
  /** Auto-opens an overlay as soon as the data is ready (embed usage) */
  initialOverlay?: "poi";
  /** Embed mode: hides the internal close/Club affordances of the auto-opened overlay */
  embedMode?: boolean;
  /** Widget only: custom hex base color for the Google map background */
  mapBaseColor?: string | null;
  /** Widget only: map theme override (default-light = native Google Maps colors) */
  mapTheme?: "light" | "dark" | "default-light" | "default-dark";
  /** Widget only: appelé quand les tuiles de la carte POI sont réellement peintes */
  onMapReady?: () => void;
  /** Corpus fermé imposé (réponse IA) : ids d'établissements, dans l'ordre exact à afficher */
  poiOverrideIds?: string[] | null;
  /** Titre de l'overlay POI quand un corpus fermé est imposé */
  poiOverrideTitle?: string | null;
}


const BookOnlineSlidePanelInner = ({
  businessId: propBusinessId, onClose, externalOverlayActive, forceMuted, interceptCloseRef,
  showSearchBar, onSearch, onSearchBusinessSelect, onHotelSearch,
  initialAvailabilityCheckIn, initialAvailabilityCheckOut, initialAvailabilityAdults,
  onMosaicStateChange, closeTrigger, propagateMosaicState = false, toolbarPortalPrefix, initialVideoUrl,
  onPrevBusiness, onNextBusiness, hasPrevBusiness, hasNextBusiness,
  onPrev, onNext, hasPrev, hasNext,
  hideDirections, hideSecondaryCtas, initialOverlay, embedMode, mapBaseColor, mapTheme, onMapReady,
  poiOverrideIds, poiOverrideTitle,
}: BookOnlineSlidePanelProps) => {
  // Aliases: callers from SlidePanelHome migration use onPrev/onNext naming.
  const rateIframeHeight = useEmbedIframeHeight("owm-rate-height", 380);
  const effectiveOnPrev = onPrevBusiness ?? onPrev;
  // Chrome navigateur (barres iOS) en noir tant que le panneau est monté hors embed
  useDarkBrowserChrome(!embedMode);

  const effectiveOnNext = onNextBusiness ?? onNext;
  const effectiveHasPrev = hasPrevBusiness ?? hasPrev;
  const effectiveHasNext = hasNextBusiness ?? hasNext;
  const [activeBusinessId, setActiveBusinessIdRaw] = useState(propBusinessId);

  // Analytics: overlay_open au mount du panel booking
  useEffect(() => {
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("overlay_open", { overlay: "booking", business_id: propBusinessId })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    business, woDescription, destinations, poiBusinesses, isLoading,
    reviewTexts, externalLinks, menuSummaries, menuDocs, videoDocs,
    allVideoUrls, categoryIcon, showGoogleMap, kpRelated, kpSubcategoryItems, kpSubcategoryLabel, isKp1Only, liteApiHotelId, serpApiMapping, isHotelWithPrice,
  } = useBookOnlineData(businessId, !!embedMode);

  // Codes de widgets (par intention) — servent de widget de réservation prioritaire
  // sur l'iframe de l'URL quand le CTA de l'URL correspond à une intention du widget.
  const [widgetCodes, setWidgetCodes] = useState<{ id: string; code: string; name: string | null; intents: string[] }[]>([]);
  useEffect(() => {
    if (!businessId) { setWidgetCodes([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, name, description, sort_order")
        .eq("business_id", businessId)
        .eq("type", "widget_code")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setWidgetCodes(
        ((data || []) as any[])
          .filter((d) => typeof d.url === "string" && d.url.trim())
          // Pas de widget YouTube dans l'overlay
          .filter((d) => !/youtube\.com|youtu\.be/i.test(d.url))
          .map((d) => ({
            id: d.id,
            code: d.url as string,
            name: d.name || null,
            intents: String(d.description || "").split("|").map((s) => s.trim()).filter(Boolean),
          }))
      );
    })();
    return () => { cancelled = true; };
  }, [businessId]);



  // --- Extracted hooks ---
  // Fetch YouTube videos for this business to drive background ordering:
  // latest short first, then other YT videos by published_at desc.
  const [ytOrderedUrls, setYtOrderedUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!businessId) { setYtOrderedUrls([]); return; }
    let cancelled = false;
    (async () => {
      const directP = supabase
        .from("business_youtube_videos")
        .select("video_id, published_at, is_short")
        .eq("business_id", businessId)
        .eq("is_visible", true)
        .eq("business_is_active", true);
      const poiP = supabase
        .from("business_youtube_video_pois")
        .select("business_youtube_videos!inner(video_id, published_at, is_short)")
        .eq("point_of_interest_id", businessId)
        .eq("business_youtube_videos.is_visible", true)
        .eq("business_youtube_videos.business_is_active", true);
      const [{ data: direct }, { data: poi }] = await Promise.all([directP, poiP]);
      const map = new Map<string, { video_id: string; published_at: string | null; is_short: boolean }>();
      (direct || []).forEach((v: any) => map.set(v.video_id, v));
      (poi || []).forEach((row: any) => {
        const v = row.business_youtube_videos;
        if (v && !map.has(v.video_id)) map.set(v.video_id, v);
      });
      const sorted = Array.from(map.values()).sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
      const latestShortIdx = sorted.findIndex((v) => v.is_short);
      if (latestShortIdx > 0) {
        const [s] = sorted.splice(latestShortIdx, 1);
        sorted.unshift(s);
      }
      const urls = sorted.map((v) =>
        v.is_short
          ? `https://www.youtube.com/shorts/${v.video_id}`
          : `https://www.youtube.com/watch?v=${v.video_id}`
      );
      if (!cancelled) setYtOrderedUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  // Keep the grid in internal sort_order. The pin (initialVideoUrl) is honored
  // via currentMediaIndex below — it selects which video plays first without
  // mutating the grid ordering.
  const orderedVideoUrls = useMemo(() => {
    const ytIdOf = (u: string) => {
      const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
      return m?.[1] || null;
    };
    const ytIds = new Set(ytOrderedUrls.map(ytIdOf).filter(Boolean) as string[]);
    const nonYt = (allVideoUrls || []).filter((u) => {
      const id = ytIdOf(u);
      return !id || !ytIds.has(id);
    });
    return [...nonYt, ...ytOrderedUrls];
  }, [allVideoUrls, ytOrderedUrls]);

  const { images, videos, mediaItems, totalMedia, matterportIndex, matterportItem, lightboxItems } = useMediaItems(business, orderedVideoUrls, videoDocs);

  const ctaConfig = useCtaConfig(business, language);

  // --- Cosmetic URL rewriting ---
  const savedUrlRef = useRef(window.location.pathname + window.location.search);

  // UI state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Seed the initial media index from a pinned video (initialVideoUrl) without
  // mutating the grid order. Runs once per (businessId, initialVideoUrl).
  const seededPinRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialVideoUrl) return;
    const key = `${businessId || ""}::${initialVideoUrl}`;
    if (seededPinRef.current === key) return;
    if (!mediaItems || mediaItems.length === 0) return;
    const idx = mediaItems.findIndex((m) => m.kind === "video" && m.url === initialVideoUrl);
    if (idx >= 0) {
      setCurrentMediaIndex(idx);
      seededPinRef.current = key;
    }
  }, [initialVideoUrl, businessId, mediaItems]);

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
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showPromosPopup, setShowPromosPopup] = useState(false);
  // Delayed reveal after video playback starts (2s) to avoid hitting the user too early.
  const [videoPlaybackStartedAt, setVideoPlaybackStartedAt] = useState<number | null>(null);
  const [pendingPopup, setPendingPopup] = useState<"welcome" | "promos" | null>(null);

  const [popupSlide, setPopupSlide] = useState(0);
  const [descPromoSlide, setDescPromoSlide] = useState(0);

  const [popupMeta, setPopupMeta] = useState<{ title: string | null; description: string | null }>({ title: null, description: null });
  const welcomePopupShownRef = useRef<string | null>(null);
  const promosPopupShownRef = useRef<string | null>(null);
  const businessPromotions = useBusinessPromotions(business?.id);
  /** Vrai quand l'overlay Full Description est ouvert : neutralise l'ouverture des popups/offres. */
  const descOverlayOpenRef = useRef(false);
  useEffect(() => {
    const url = (business as any)?.popup_image_url;
    // Defensive: only trigger the popup if the URL is still part of the business images
    // (avoids broken popups on stale references after an image was removed).
    const stillValid = !!url && Array.isArray((business as any)?.images) && (business as any).images.includes(url);
    if (embedMode) return; // widget embarqué : pas de popup d'accueil par-dessus l'overlay
    if (business?.id && stillValid && welcomePopupShownRef.current !== business.id) {
      welcomePopupShownRef.current = business.id;
      setPopupSlide(0);
      setPopupMeta({ title: null, description: null });
      setPendingPopup("welcome");
      supabase
        .from("business_image_titles")
        .select("title, description, title_fr, title_en, title_ar, description_fr, description_en, description_ar")
        .eq("business_id", business.id)
        .eq("image_url", url)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const d = data as any;
            const t = language === "en" ? (d.title_en || d.title_fr || d.title)
              : language === "ar" ? (d.title_ar || d.title_fr || d.title)
              : (d.title_fr || d.title);
            const desc = language === "en" ? (d.description_en || d.description_fr || d.description)
              : language === "ar" ? (d.description_ar || d.description_fr || d.description)
              : (d.description_fr || d.description);
            setPopupMeta({ title: t ?? null, description: desc ?? null });
          }
        });
    }
  }, [business?.id, (business as any)?.popup_image_url, (business as any)?.images, language]);

  // Schedule the actual reveal 2s after video playback starts (or 2s after mount if no video).
  useEffect(() => {
    if (!pendingPopup) return;
    // Overlay Full Description ouvert → on annule l'ouverture du popup/offres.
    if (descOverlayOpenRef.current) { setPendingPopup(null); return; }
    const start = videoPlaybackStartedAt ?? performance.now();
    const delay = Math.max(0, 2000 - (performance.now() - start));
    const id = setTimeout(() => {
      if (descOverlayOpenRef.current) { setPendingPopup(null); return; }
      if (pendingPopup === "welcome") setShowWelcomePopup(true);
      else if (pendingPopup === "promos") setShowPromosPopup(true);
      setPendingPopup(null);
    }, delay);
    return () => clearTimeout(id);
  }, [pendingPopup, videoPlaybackStartedAt]);


  // Reset playback timer when switching business so the popup delay is tied to the current video.
  useEffect(() => {
    setVideoPlaybackStartedAt(null);
    setPendingPopup(null);
    setShowWelcomePopup(false);
    setShowPromosPopup(false);
  }, [businessId]);

  // Auto-open the promotions popup when a business has offers but no welcome popup image.
  // Mirrors the welcome popup behavior: shown once per business, mutes background video.
  useEffect(() => {
    if (!business?.id || embedMode) return;
    const hasWelcomePopup = !!(business as any)?.popup_image_url
      && Array.isArray((business as any)?.images)
      && (business as any).images.includes((business as any).popup_image_url);
    if (hasWelcomePopup) return;
    if (businessPromotions.length === 0) return;
    if (promosPopupShownRef.current === business.id) return;
    promosPopupShownRef.current = business.id;
    setPopupSlide(0);
    setPendingPopup("promos");
  }, [business?.id, businessPromotions.length, (business as any)?.popup_image_url, (business as any)?.images]);


  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedPoiBusinessId, setSelectedPoiBusinessId] = useState<string | null>(null);
  const [selectedKpBusinessId, setSelectedKpBusinessId] = useState<string | null>(null);
  const [showPoiMapOverlay, setShowPoiMapOverlay] = useState(initialOverlay === "poi");
  const [poiMapMode, setPoiMapMode] = useState<"poi" | "destinations">("poi");
  const [poiSubcatFilter, setPoiSubcatFilter] = useState<string | null>(null);
  // Sous-catégorie choisie dans le Pill Catégories — état totalement distinct du Pill POI
  const [catSubcatFilter, setCatSubcatFilter] = useState<string | null>(null);
  const [poiPillOverlay, setPoiPillOverlay] = useState<"poi" | "cat" | null>(null);
  // Pills POI / Catégories : menu déroulant sur desktop, overlay plein écran sur mobile
  const isMobileView = useIsMobile();
  const isEmbedMapWidget = embedMode && initialOverlay === "poi";
  // En embed, les breakpoints Tailwind se basent sur la largeur de l'iframe (souvent < 1024px)
  // alors que l'hôte est un desktop. On mesure donc la largeur réelle du widget.
  const [embedWideView, setEmbedWideView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 700 : false
  );
  useEffect(() => {
    if (!isEmbedMapWidget) return;
    const onResize = () => setEmbedWideView(window.innerWidth >= 700);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isEmbedMapWidget]);
  const embedHalfSheet = isEmbedMapWidget && embedWideView;
  const usePillDropdown = embedMode || !isMobileView;

  const [poiSubcatOpen, setPoiSubcatOpen] = useState(false);
  const [poiShowAll, setPoiShowAll] = useState(false);
  const [poiProximityKm, setPoiProximityKm] = useState<number | null>(null);
  const poiProximityInitRef = useRef<string | null>(null);
  const [poiCatFilter, setPoiCatFilter] = useState<string | null>(null);
  const [poiMapTypeId, setPoiMapTypeId] = useState<"roadmap" | "satellite" | "terrain">("terrain");
  // Rayon par défaut du Pill "À proximité" = champ Rayon de l'établissement (10 km par défaut)
  useEffect(() => {
    const bid = (business as any)?.id;
    if (!bid || poiProximityInitRef.current === bid) return;
    poiProximityInitRef.current = bid;
    const raw = Number((business as any)?.poi_radius_km);
    const allowed = [0.5, 1, 5, 10, 20, 50, 100];
    setPoiProximityKm(allowed.includes(raw) ? raw : 10);
  }, [business]);

  /* ─── Widget "Adresses à proximité" : pills Regroupements KP + Lieu d'intérêt par défaut ─── */
  type WidgetKpGroup = { slot: 1 | 2; code: string; title: string; members: any[] };
  const [widgetKpGroups, setWidgetKpGroups] = useState<WidgetKpGroup[]>([]);
  const [widgetDefaultPoi, setWidgetDefaultPoi] = useState<any | null>(null);
  const [widgetMapView, setWidgetMapView] = useState<"nearby" | "kp1" | "kp2" | "poi">("nearby");
  useEffect(() => { setWidgetMapView("nearby"); }, [businessId]);
  // Un clic dans un Pill du haut (POI / Catégories / Top20 / Proximité) remet la carte
  // en vue "À proximité" : les pills du bas (KP1/KP2/POI) ne bloquent jamais ceux du haut.
  const resetWidgetMapView = useCallback(() => setWidgetMapView("nearby"), []);

  useEffect(() => {
    if (!isEmbedMapWidget || !businessId) return;
    let cancelled = false;
    (async () => {
      const { data: b } = await (supabase as any)
        .from("businesses")
        .select("kp_regroupement,kp_regroupement_2,default_poi_business_id,kp_city,kp_city_2")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled || !b) return;
      const kp1 = (b.kp_regroupement || "").trim();
      const kp2 = (b.kp_regroupement_2 || "").trim();
      const kpCity1 = (b.kp_city || "").trim();
      const kpCity2 = (b.kp_city_2 || "").trim();
      const sel = "id,name,city,neighborhood,latitude,longitude,images,computed_rating,total_review_count";
      const [m1, m2, titlesRes, poiRes] = await Promise.all([
        kp1 ? (supabase as any).from("businesses").select(sel).eq("kp_regroupement", kp1).eq("is_active", true).order("name") : Promise.resolve({ data: [] }),
        kp2 ? (supabase as any).from("businesses").select(sel).eq("kp_regroupement_2", kp2).eq("is_active", true).order("name") : Promise.resolve({ data: [] }),
        (kp1 || kp2) ? (supabase as any).from("kp_group_titles").select("kp_code,kp_type,title") : Promise.resolve({ data: [] }),
        b.default_poi_business_id
          ? (supabase as any).from("businesses").select(sel).eq("id", b.default_poi_business_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const titleMap = new Map<string, string>();
      ((titlesRes as any)?.data ?? []).forEach((t: any) => titleMap.set(`${t.kp_type}:${t.kp_code}`, t.title || ""));
      const groups: WidgetKpGroup[] = [];
      // "Limiter à une ville" (kp_city / kp_city_2) : le Master reste toujours affiché,
      // seuls les membres de la ville choisie sont retenus.
      const byCity = (list: any[], city: string) =>
        city ? list.filter((m) => m.id === businessId || (m.city || "").trim() === city) : list;
      const mem1 = byCity(((m1 as any)?.data ?? []) as any[], kpCity1);
      const mem2 = byCity(((m2 as any)?.data ?? []) as any[], kpCity2);
      if (kp1 && mem1.length > 1) groups.push({ slot: 1, code: kp1, title: titleMap.get(`kp1:${kp1}`) || kp1, members: mem1 });
      if (kp2 && mem2.length > 1) groups.push({ slot: 2, code: kp2, title: titleMap.get(`kp2:${kp2}`) || kp2, members: mem2 });
      setWidgetKpGroups(groups);
      setWidgetDefaultPoi((poiRes as any)?.data ?? null);
    })();
    return () => { cancelled = true; };
  }, [isEmbedMapWidget, businessId]);


  const [poiCategoryBusinesses, setPoiCategoryBusinesses] = useState<PoiBusiness[]>([]);
  const [poiCategoryBusinessCatId, setPoiCategoryBusinessCatId] = useState<string | null>(null);
  // Vivier ville complet (toutes catégories) : sert au calcul des compteurs
  // catégories / sous-catégories dans le rayon du Pill "À proximité".
  const [poiCityBusinesses, setPoiCityBusinesses] = useState<PoiBusiness[]>([]);
  // Corpus fermé imposé par une réponse IA : mêmes champs que les POI, ordre conservé.
  const poiOverrideKey = (poiOverrideIds || []).join(",");
  const [poiOverrideRows, setPoiOverrideRows] = useState<PoiBusiness[]>([]);
  useEffect(() => {
    const ids = poiOverrideKey ? poiOverrideKey.split(",").filter(Boolean) : [];
    if (!ids.length) { setPoiOverrideRows([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, images, logo_url, latitude, longitude, city, neighborhood, categories, default_service, main_category, computed_rating, total_review_count")
        .in("id", ids)
        .eq("is_active", true);
      if (cancelled) return;
      const byId = new Map(((data || []) as any[]).map((r) => [r.id, r]));
      setPoiOverrideRows(ids.map((id) => byId.get(id)).filter(Boolean) as PoiBusiness[]);
    })();
    return () => { cancelled = true; };
  }, [poiOverrideKey]);
  const poiOpenedFromMapRef = useRef(false);
  // Embed: auto-open the "À proximité" overlay once the business is resolved.
  const autoPoiOpenedRef = useRef(false);
  useEffect(() => {
    if (initialOverlay !== "poi") return;
    // Widget embed : l'overlay POI doit rester ouvert en permanence (jamais d'affichage des infos du Master).
    if (!showPoiMapOverlay) setShowPoiMapOverlay(true);
    autoPoiOpenedRef.current = true;
  }, [initialOverlay, business?.id, showPoiMapOverlay]);


  const geo = useGeolocation();
  const { coords: userCoords } = geo;
  // Marqueur "Vous êtes ici" : jamais dans le widget embed (site tiers), et
  // uniquement si la géoloc est réellement active (pas de coords résiduelles).
  const showUserMarker = !embedMode && geo.isEnabled;
  // LocationPicker is mounted globally on SearchPage; no local instance here to avoid double-open.
  const { tabs: frontTabs } = useFrontStructureTabs(business?.city || null);
  const { translateSubcategory } = useTaxonomyTranslations();
  const activePoiCategoryBusinesses = poiCatFilter && poiCategoryBusinessCatId === poiCatFilter ? poiCategoryBusinesses : [];

  useEffect(() => {
    if (!poiCatFilter || !business?.city) {
      setPoiCategoryBusinesses([]);
      setPoiCategoryBusinessCatId(null);
      return;
    }

    const activeFrontTab = frontTabs.find((t) => t.id === poiCatFilter) || null;
    if (!activeFrontTab) {
      setPoiCategoryBusinesses([]);
      setPoiCategoryBusinessCatId(poiCatFilter);
      return;
    }

    let cancelled = false;
    const subcategoryNames = activeFrontTab.subcategoryNames;

    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, images, logo_url, latitude, longitude, city, neighborhood, categories, default_service, main_category, priority_score, computed_rating, total_review_count")
        .eq("is_active", true)
        .ilike("city", business.city)
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(1000);

      if (cancelled) return;

      const rows = ((data || []) as any[])
        .filter((p) => p.id !== businessId)
        .filter((p) => {
          const inMain = p.main_category && subcategoryNames.has(p.main_category);
          const inCats = Array.isArray(p.categories) && p.categories.some((c: string) => subcategoryNames.has(c));
          return inMain || inCats;
        })
        .map((p) => ({
          id: p.id,
          name: p.name,
          images: p.images,
          logo_url: p.logo_url,
          latitude: p.latitude,
          longitude: p.longitude,
          city: p.city,
          neighborhood: p.neighborhood,
          categories: p.categories,
          default_service: p.default_service ?? null,
          computed_rating: p.computed_rating ?? null,
          total_review_count: p.total_review_count ?? null,
        }));

      setPoiCategoryBusinesses(rows as PoiBusiness[]);
      setPoiCategoryBusinessCatId(poiCatFilter);
    })();

    return () => { cancelled = true; };
  }, [poiCatFilter, business?.city, businessId, frontTabs]);

  // Vivier ville (toutes catégories) chargé quand l'overlay POI/Map est ouvert
  useEffect(() => {
    if (!showPoiMapOverlay || !business?.city) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, images, logo_url, latitude, longitude, city, neighborhood, categories, default_service, main_category, priority_score, computed_rating, total_review_count")
        .eq("is_active", true)
        .ilike("city", business.city)
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(1000);
      if (cancelled) return;
      const rows = ((data || []) as any[])
        .filter((p) => p.id !== businessId)
        .map((p) => ({
          id: p.id,
          name: p.name,
          images: p.images,
          logo_url: p.logo_url,
          latitude: p.latitude,
          longitude: p.longitude,
          city: p.city,
          neighborhood: p.neighborhood,
          categories: p.categories,
          main_category: p.main_category,
          default_service: p.default_service ?? null,
          computed_rating: p.computed_rating ?? null,
          total_review_count: p.total_review_count ?? null,
        }));
      setPoiCityBusinesses(rows as PoiBusiness[]);
    })();
    return () => { cancelled = true; };
  }, [showPoiMapOverlay, business?.city, businessId]);


  
  const [showDescriptionOverlay, setShowDescriptionOverlay] = useState(false);
  useEffect(() => {
    descOverlayOpenRef.current = showDescriptionOverlay;
    if (showDescriptionOverlay) {
      // Neutralise tout popup/offre en attente ou déjà ouvert sous l'overlay.
      setPendingPopup(null);
      setShowWelcomePopup(false);
      setShowPromosPopup(false);
    }
  }, [showDescriptionOverlay]);
  const [descOverlayDirect, setDescOverlayDirect] = useState(false);
  // Transition morphée : la barre info viewer sert de « graine » à l'overlay Full Description.
  // La classe d'animation est pilotée par un state React (sinon un re-render du panneau
  // réécrit className et supprime la classe ajoutée en DOM). Le ref ne fait que poser
  // les variables CSS du rectangle de départ.
  const [descMorphRect, setDescMorphRect] = useState<DOMRect | null>(null);
  const [descMorphDone, setDescMorphDone] = useState(false);
  const startDescMorph = useCallback((rect?: DOMRect) => {
    setDescMorphRect(rect ?? null);
    setDescMorphDone(false);
    setShowDescriptionOverlay(true);
    if (rect) window.setTimeout(() => { setDescMorphDone(true); setDescMorphRect(null); }, 700);
  }, []);
  const applyDescMorph = useCallback((el: HTMLDivElement | null) => {
    if (!el || !descMorphRect) return;
    const r = descMorphRect;
    const o = el.getBoundingClientRect();
    if (!o.width || !o.height) return;
    el.style.setProperty("--owm-mt", `${Math.max(0, r.top - o.top)}px`);
    el.style.setProperty("--owm-ml", `${Math.max(0, r.left - o.left)}px`);
    el.style.setProperty("--owm-mr", `${Math.max(0, o.right - r.right)}px`);
    el.style.setProperty("--owm-mb", `${Math.max(0, o.bottom - r.bottom)}px`);
  }, [descMorphRect]);



  const [descGridSection, setDescGridSection] = useState<"images" | "videos" | "poi" | "dest" | "kp" | "kp_subcat" | null>(null);
   const [descGridPage, setDescGridPage] = useState(0);
   const [sidebarOpenGroup, setSidebarOpenGroup] = useState<string | null>(null);
   const [descOverlayContent, setDescOverlayContent] = useState<{ html: string; title: string; priceDetails?: string | null; avgPriceRange?: unknown } | null>(null);
  const [activeVideoOverlay, setActiveVideoOverlay] = useState<{ url: string; name: string | null; description: string | null } | null>(null);
  const [videoOverlayClosing, setVideoOverlayClosing] = useState(false);
  const [overlayControlsApi, setOverlayControlsApi] = useState<import("@/components/overlays/VideoDocumentOverlay").VideoOverlayControlsApi | null>(null);
   // initialVideoUrl is consumed by the videoDocs reorder (above) so that the
   // forced video plays in the background. Do NOT auto-open a video overlay on
   // top of the panel — the user only wants the background to reflect the choice.
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
  const [youtubeThumbnailMap, setYoutubeThumbnailMap] = useState<Record<string, string>>({});
  const [kpGroupTitle, setKpGroupTitle] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<{ id: string; icon: string; title: string; description: string; image_url: string | null; metric_title: string | null; metric_value: string | null }[]>([]);
  const [highlightsSection, setHighlightsSection] = useState<{ title: string | null; intro: string | null; columns: number }>({ title: null, intro: null, columns: 2 });

  useEffect(() => {
    if (!businessId) { setHighlights([]); setHighlightsSection({ title: null, intro: null, columns: 2 }); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("front_highlights")
        .select("id, icon, title, description, image_url, sort_order, section_title, section_intro, section_columns, metric_title, metric_value")
        .eq("business_id", businessId)
        .order("sort_order");
      if (cancelled || !data) return;
      const rows = data as any[];
      setHighlights(rows.map(r => ({ id: r.id, icon: r.icon, title: r.title || "", description: r.description || "", image_url: r.image_url, metric_title: r.metric_title || null, metric_value: r.metric_value || null })));
      setHighlightsSection({ title: rows[0]?.section_title || null, intro: rows[0]?.section_intro || null, columns: Number(rows[0]?.section_columns) || 2 });
    })();
    return () => { cancelled = true; };
  }, [businessId]);


  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    const loadYoutubeVideos = async () => {
      const directPromise = supabase
        .from("business_youtube_videos")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_visible", true)
        .eq("business_is_active", true);

      const poiPromise = supabase
        .from("business_youtube_video_pois")
        .select("business_youtube_videos!inner(*)")
        .eq("point_of_interest_id", businessId)
        .eq("business_youtube_videos.is_visible", true)
        .eq("business_youtube_videos.business_is_active", true);

      const docsPromise = supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, sort_order")
        .eq("business_id", businessId)
        .eq("type", "video")
        .eq("business_is_active", true);

      const [{ data: directVideos }, { data: poiLinks }, { data: docVideos }] = await Promise.all([directPromise, poiPromise, docsPromise]);
      if (cancelled) return;

      const merged = new Map<string, any>();
      const thumbMap = new Map<string, string>();
      const bestYouTubeThumb = (v: any) =>
        v.custom_thumbnail_url || v.thumbnail || v.thumbnail_url || `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`;

      (directVideos || []).forEach((v: any) => {
        merged.set(v.video_id, v);
        thumbMap.set(v.video_id, bestYouTubeThumb(v));
      });
      (poiLinks || []).forEach((row: any) => {
        const v = row.business_youtube_videos;
        if (!v) return;
        if (!merged.has(v.video_id)) {
          merged.set(v.video_id, v);
          thumbMap.set(v.video_id, bestYouTubeThumb(v));
        }
      });
      (docVideos || []).forEach((d: any) => {
        const url: string = d.url || "";
        const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
        if (!m) return;
        const videoId = m[1];
        if (merged.has(videoId)) return;
        const thumb = d.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        thumbMap.set(videoId, thumb);
        merged.set(videoId, {
          video_id: videoId,
          title: d.name || "",
          thumbnail: thumb,
          published_at: "",
          is_short: /\/shorts\//.test(url),
          duration_seconds: 0,
          sort_order: d.sort_order ?? 9999,
          _needs_title: !d.name,
          _url: url,
        });
      });

      // Fetch missing titles via YouTube oEmbed (CORS-enabled, no API key)
      const needTitles = Array.from(merged.values()).filter((v: any) => v._needs_title);
      await Promise.all(
        needTitles.map(async (v: any) => {
          try {
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(v._url)}&format=json`);
            if (res.ok) {
              const json = await res.json();
              if (json?.title) v.title = json.title;
            }
          } catch {}
        })
      );
      if (cancelled) return;

      const items: YouTubeVideo[] = Array.from(merged.values())
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((v: any) => ({
          videoId: v.video_id,
          title: v.title,
          thumbnail: v.thumbnail,
          publishedAt: v.published_at || "",
          isShort: v.is_short,
          durationSeconds: v.duration_seconds,
        }));

      setAllYoutubeVideos(items);
      setYoutubeVideoCount(items.length);
      setYoutubeThumbnailMap(Object.fromEntries(thumbMap));
    };

    loadYoutubeVideos().catch(() => {
      if (!cancelled) {
        setAllYoutubeVideos([]);
        setYoutubeVideoCount(0);
        setYoutubeThumbnailMap({});
      }
    });

    return () => { cancelled = true; };
  }, [businessId]);

  // --- Shareable YouTube tab URL sync ---------------------------------------
  // Read ?tab=youtube[&video=<id>] from the URL once videos are loaded,
  // and reflect overlay state back into the URL (cosmetic replaceState).
  const ytUrlAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!businessId) return;
    if (ytUrlAppliedRef.current === businessId) return;
    if (allYoutubeVideos.length === 0) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      if ((sp.get("tab") || "").toLowerCase() === "youtube") {
        const videoId = sp.get("video");
        const target = videoId ? allYoutubeVideos.find(v => v.videoId === videoId) : null;
        const fallback = allYoutubeVideos.find(v => v.isShort) || allYoutubeVideos[0] || null;
        const picked = target || fallback;
        if (picked) {
          setActiveYoutubeVideo(picked);
          setShowYoutubeOverlay(true);
          setYoutubeIsPlaying(true);
        }
      }
    } catch {}
    ytUrlAppliedRef.current = businessId;
  }, [businessId, allYoutubeVideos]);

  useEffect(() => {
    if (!businessId) return;
    try {
      const url = new URL(window.location.href);
      const before = url.search;
      if (showYoutubeOverlay) {
        url.searchParams.set("tab", "youtube");
        if (activeYoutubeVideo?.videoId) url.searchParams.set("video", activeYoutubeVideo.videoId);
        else url.searchParams.delete("video");
      } else {
        if (url.searchParams.get("tab") === "youtube") url.searchParams.delete("tab");
        url.searchParams.delete("video");
      }
      if (url.search !== before) {
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    } catch {}
  }, [businessId, showYoutubeOverlay, activeYoutubeVideo?.videoId]);
  // -------------------------------------------------------------------------

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
  const [hashtagsOverlayActive, setHashtagsOverlayActive] = useState(false);
  const [aiOverlayActive, setAiOverlayActive] = useState(false);
  const [showAvailabilitySearch, setShowAvailabilitySearch] = useState(false);
  // Réservations embarquées : chargement à la demande (évite tout son/auto-play involontaire)
  
  const [showHoursOverlay, setShowHoursOverlay] = useState(false);
  const [showSpotifyOverlay, setShowSpotifyOverlay] = useState(false);
  const [showSubstackOverlay, setShowSubstackOverlay] = useState(false);
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
      // Only rewrite for /fiche/ canonical paths. For vanity URLs (or any other
      // path), keep the current URL intact — do NOT force /business/<slug>.
      if (currentPath.startsWith("/fiche/")) {
        window.history.replaceState(null, "", `/fiche/${business.slug}` + window.location.search);
      }
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
      // Only restore the saved URL if the current path is a cosmetically-
      // rewritten one (/fiche/ or /destination/). If the user navigated
      // somewhere else entirely (home, /club, /test, etc.), respect that
      // navigation and do NOT overwrite it with the previous /search URL.
      const currentPath = window.location.pathname;
      const isCosmetic = currentPath.startsWith("/fiche/") || currentPath.startsWith("/destination/");
      if (isCosmetic) {
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

  // Desktop: Esc closes the Full Description overlay (same cascade as the header X)
  useEffect(() => {
    if (!showDescriptionOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (typeof window !== "undefined" && window.innerWidth < 1024) return;
      e.stopPropagation();
      if (descGridSection && !descOverlayDirect) { setDescGridSection(null); setDescGridPage(0); return; }
      if (descOverlayContent && !descOverlayDirect) { setDescOverlayContent(null); return; }
      setShowDescriptionOverlay(false);
      setDescOverlayContent(null);
      setDescOverlayDirect(false);
      setDescGridSection(null);
      setDescGridPage(0);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showDescriptionOverlay, descGridSection, descOverlayContent, descOverlayDirect]);

  // À l'ouverture de l'overlay Full Description : toujours démarrer en haut
  // (des sections comme "Réservez" / iframes peuvent forcer un scroll auto)
  useEffect(() => {
    if (!showDescriptionOverlay) return;
    const timers: number[] = [];
    const reset = () => {
      const el = document.getElementById("owm-desc-scroll");
      if (el) el.scrollTop = 0;
    };
    reset();
    requestAnimationFrame(reset);
    [50, 150, 300, 600, 1000].forEach((d) => timers.push(window.setTimeout(reset, d)));

    // Garde anti-scroll parasite : certaines iframes tierces (ex. moteur de réservation
    // "Réservez" du Royal Mansour) déplacent le conteneur au chargement (prise de focus,
    // scroll anchoring lors du redimensionnement de leur contenu…).
    // Principe : pendant les premières secondes suivant l'ouverture, tout déplacement de
    // scroll qui n'est pas précédé d'un geste utilisateur récent est annulé.
    const el = document.getElementById("owm-desc-scroll");
    let lastGesture = 0;
    let anchor = 0;
    let guardUntil = Date.now() + 15000;
    let reverting = false;
    const markGesture = () => { lastGesture = Date.now(); };
    const onScroll = () => {
      if (!el || reverting) return;
      const userDriven = Date.now() - lastGesture < 700;
      if (userDriven || Date.now() > guardUntil) { anchor = el.scrollTop; return; }
      if (Math.abs(el.scrollTop - anchor) < 4) return;
      reverting = true;
      el.scrollTop = anchor;
      requestAnimationFrame(() => { reverting = false; });
    };
    if (el) {
      el.style.overflowAnchor = "none";
      el.addEventListener("wheel", markGesture, { passive: true });
      el.addEventListener("touchstart", markGesture, { passive: true });
      el.addEventListener("touchmove", markGesture, { passive: true });
      el.addEventListener("pointerdown", markGesture, { passive: true });
      el.addEventListener("keydown", markGesture);
      el.addEventListener("scroll", onScroll, { passive: true });
    }
    // Un clic/appui ailleurs (barre d'ancres, sommaire) reste un geste utilisateur légitime
    document.addEventListener("pointerdown", markGesture, true);
    document.addEventListener("keydown", markGesture, true);

    return () => {
      timers.forEach(clearTimeout);
      if (el) {
        el.removeEventListener("wheel", markGesture);
        el.removeEventListener("touchstart", markGesture);
        el.removeEventListener("touchmove", markGesture);
        el.removeEventListener("pointerdown", markGesture);
        el.removeEventListener("keydown", markGesture);
        el.removeEventListener("scroll", onScroll);
      }
      document.removeEventListener("pointerdown", markGesture, true);
      document.removeEventListener("keydown", markGesture, true);
    };

  }, [showDescriptionOverlay, descGridSection, descOverlayContent]);


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

  // Cascading peek effect on the left CTAs when the panel opens for a business.
  // If a welcome popup is showing, defer until it closes.
  const [peekCta, setPeekCta] = useState<boolean[]>([]);
  const [peekDispo, setPeekDispo] = useState(false);
  const [peekHoraires, setPeekHoraires] = useState(false);
  const [peekItin, setPeekItin] = useState(false);
  const peekPlayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!businessId) return;
    if (showWelcomePopup) return;
    if (peekPlayedRef.current === businessId) return;
    peekPlayedRef.current = businessId;

    // Set Horaires and Disponibilités to peek immediately, then close after 5 seconds
    setPeekDispo(true);
    setPeekHoraires(true);
    const mainTimer = window.setTimeout(() => {
      setPeekDispo(false);
      setPeekHoraires(false);
    }, 5000);

    const count = 4;
    const start = 450;
    const open = 1500;
    const stagger = 180;
    const timers: number[] = [mainTimer];
    setPeekCta(Array(count).fill(false));
    for (let i = 0; i < count; i++) {
      timers.push(window.setTimeout(() => setPeekCta(p => { const n = [...p]; n[i] = true; return n; }), start + i * stagger));
      timers.push(window.setTimeout(() => setPeekCta(p => { const n = [...p]; n[i] = false; return n; }), start + i * stagger + open));
    }
    // Peek the Itinéraire CTA last, after the main rail cascade.
    timers.push(window.setTimeout(() => setPeekItin(true), start + count * stagger + 120));
    timers.push(window.setTimeout(() => setPeekItin(false), start + count * stagger + 120 + open));
    return () => timers.forEach(clearTimeout);
  }, [businessId, showWelcomePopup]);
  useEffect(() => { peekPlayedRef.current = null; }, [businessId]);

  // Tap-to-reveal label on touch devices for left CTAs: first tap expands, second tap triggers.
  const [tappedCta, setTappedCta] = useState<string | null>(null);
  const isHoverDevice = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;
  useEffect(() => {
    if (!tappedCta) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest('[data-cta-tap]')) setTappedCta(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    const timer = window.setTimeout(() => setTappedCta(null), 4000);
    return () => { document.removeEventListener('pointerdown', onDown, true); clearTimeout(timer); };
  }, [tappedCta]);
  const handleCtaTap = (key: string, fn: () => void) => (e: React.MouseEvent) => {
    if (!isHoverDevice && tappedCta !== key) {
      e.preventDefault(); e.stopPropagation();
      setTappedCta(key);
      return;
    }
    setTappedCta(null);
    fn();
  };



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
    setShowPoiMapOverlay(initialOverlay === "poi");

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
  // Global sound preference must be resolved BEFORE the overlay mute/unmute effect
  // so the effect can restore the correct muted state when overlays close.
  const { soundOn: globalSoundOn, setSoundOn: setGlobalSoundOn } = useVideoSoundPreference();

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
      const onPlay = () => {
        setVideoPaused(false);
        setVideoPlaybackStartedAt((prev) => prev ?? performance.now());
      };
      const onPause = () => setVideoPaused(true);

      const onVolChange = () => {
        setVideoMuted(v.muted);
        // Ne pas écraser la préférence utilisateur avec un mute automatique
        // (fallback autoplay bloqué par le navigateur).
        if (v.dataset.owmAutoMute) return;
        setGlobalSoundOn(!v.muted);
      };
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

  // Unified flag: true when any overlay or welcome popup is open on top of the slidepanel.
  // Used to disable swipe/wheel navigation and expose overlay state to ancestors.
  const anyOverlayOpen =
    showDirections || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId ||
    !!docOverlay || showBookingOverlay || showYoutubeOverlay || showExternalVideosOverlay || showMosaic ||
    !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay ||
    showFallbackOverlay || searchOverlayActive || hashtagsOverlayActive || aiOverlayActive || showDescriptionOverlay || !!forceMuted || showWelcomePopup || showPromosPopup;

  // Same as anyOverlayOpen but excluding welcome/promo popups so the background video
  // keeps playing and sound stays on while the popup is visible.
  const mediaBlockingOverlayOpen =
    showDirections || !!selectedDestinationId || !!selectedPoiBusinessId || !!selectedKpBusinessId ||
    !!docOverlay || showBookingOverlay || showYoutubeOverlay || showExternalVideosOverlay || showMosaic ||
    !!externalOverlayActive || showPoiMapOverlay || !!activeVideoOverlay ||
    showFallbackOverlay || searchOverlayActive || hashtagsOverlayActive || aiOverlayActive || showDescriptionOverlay || !!forceMuted;


  // Expose overlay state to ancestors (e.g. SearchPage wheel/swipe handlers)
  // so they can disable business navigation while an overlay is open above the panel.
  useEffect(() => {
    if (anyOverlayOpen) {
      document.body.dataset.slidepanelOverlayOpen = "1";
    } else {
      delete document.body.dataset.slidepanelOverlayOpen;
    }
    return () => { delete document.body.dataset.slidepanelOverlayOpen; };
  }, [anyOverlayOpen]);

  // Expose popup state so we can remove the slide panel container's shadow when a welcome popup is active
  useEffect(() => {
    if (showWelcomePopup || showPromosPopup) {
      document.body.dataset.slidepanelPopupOpen = "1";
    } else {
      delete document.body.dataset.slidepanelPopupOpen;
    }
    return () => { delete document.body.dataset.slidepanelPopupOpen; };
  }, [showWelcomePopup, showPromosPopup]);


  // Pause/mute background media when a blocking overlay is open — same mute gate as the Search overlay.
  // The refs are read inside the retry loop because YouTube iframes can mount after the state flip.
  useEffect(() => {
    const overlayOpen = mediaBlockingOverlayOpen;



    const ytPost = (func: string, args: any[] = []) => {
      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    };

    if (overlayOpen) {
      const muteBackground = () => {
        const v = videoRef.current;
        if (v) {
          // Ce mute est technique (overlay ouvert) : il ne doit JAMAIS être interprété
          // comme un choix utilisateur par le listener volumechange, sinon la préférence
          // globale passe à OFF et tout panel monté ensuite (ex : sous-fiche POI/Map)
          // démarre sans son.
          v.dataset.owmAutoMute = "1";
          v.muted = true;
          v.volume = 0;
          v.pause();
        }
        setVideoMuted(true);
        setYtBgMuted(true);
        setYtBgPlaying(false);
        ytPost("mute");
        ytPost("setVolume", [0]);
        ytPost("pauseVideo");
      };

      muteBackground();
      const id = window.setInterval(muteBackground, 150);
      const stop = window.setTimeout(() => window.clearInterval(id), 3000);
      return () => {
        window.clearInterval(id);
        window.clearTimeout(stop);
      }
;
    }

    // Overlay closed → restore playback and re-apply the user's global sound preference
    // (previously the video always resumed muted, so the sound stayed OFF after closing
    // e.g. the Filters overlay even when the user had turned it ON before).
    const shouldBeMuted = !globalSoundOn;
    const v = videoRef.current;
    if (v) {
      v.dataset.owmAutoMute = "1";
      v.muted = shouldBeMuted;
      v.volume = shouldBeMuted ? 0 : 1;
      if (v.paused) v.play().catch(() => {});
      window.setTimeout(() => { delete v.dataset.owmAutoMute; }, 800);
    }
    setVideoMuted(shouldBeMuted);
    setYtBgMuted(shouldBeMuted);
    if (shouldBeMuted) {
      ytPost("mute");
      ytPost("setVolume", [0]);
    } else {
      ytPost("unMute");
      ytPost("setVolume", [100]);
    }
    ytPost("playVideo");


  }, [mediaBlockingOverlayOpen, globalSoundOn]);


  // ── External bridge: window events to control Play/Mute from an outer bar
  //   dispatch "book-panel:toggle-play"  → play/pause current media
  //   dispatch "book-panel:toggle-mute"  → mute/unmute current media
  //   dispatch "book-panel:request-state" → panel emits "book-panel:state"
  //   listen to "book-panel:state" → { playing, muted }
  useEffect(() => {
    const ytPost = (func: string, args: any[] = []) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    };
    const emitState = () => {
      const v = videoRef.current;
      const playing = v ? !v.paused : !videoPaused;
      const muted = !globalSoundOn;
      window.dispatchEvent(new CustomEvent("book-panel:state", { detail: { playing, muted } }));
    };
    const onTogglePlay = () => {
      const v = videoRef.current;
      if (v) {
        if (v.paused) { v.play().catch(() => {}); ytPost("playVideo"); }
        else { v.pause(); ytPost("pauseVideo"); }
      } else {
        // YT-only media
        if (videoPaused) { ytPost("playVideo"); setVideoPaused(false); }
        else { ytPost("pauseVideo"); setVideoPaused(true); }
      }
      setTimeout(emitState, 50);
    };
    const onToggleMute = () => {
      const nextOn = !globalSoundOn;
      setGlobalSoundOn(nextOn);
      const v = videoRef.current;
      if (v) { v.muted = !nextOn; v.volume = nextOn ? 1 : 0; }
      if (nextOn) { ytPost("unMute"); ytPost("setVolume", [100]); }
      else { ytPost("mute"); ytPost("setVolume", [0]); }
      setTimeout(emitState, 50);
    };
    window.addEventListener("book-panel:toggle-play", onTogglePlay);
    window.addEventListener("book-panel:toggle-mute", onToggleMute);
    window.addEventListener("book-panel:request-state", emitState);
    emitState();
    return () => {
      window.removeEventListener("book-panel:toggle-play", onTogglePlay);
      window.removeEventListener("book-panel:toggle-mute", onToggleMute);
      window.removeEventListener("book-panel:request-state", emitState);
    };
  }, [videoPaused, globalSoundOn, setGlobalSoundOn]);



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

  /* ─── Marqueur master de l'overlay POI ───
     Si l'établissement a coché "Marqueur par défaut sur la Map" sur son Lieu
     d'intérêt par défaut, c'est ce POI qui devient le marqueur master. */
  const [poiMasterOverride, setPoiMasterOverride] = useState<any | null>(null);
  useEffect(() => {
    setPoiMasterOverride(null);
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data: b } = await (supabase as any)
        .from("businesses")
        .select("default_poi_business_id,default_poi_is_master")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled || !b?.default_poi_is_master || !b?.default_poi_business_id) return;
      const { data: poi } = await (supabase as any)
        .from("businesses")
        .select("id,name,city,neighborhood,latitude,longitude,images,computed_rating,total_review_count")
        .eq("id", b.default_poi_business_id)
        .maybeSingle();
      if (cancelled || !poi?.latitude || !poi?.longitude) return;
      setPoiMasterOverride(poi);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  /** Marqueur master effectif (POI par défaut si coché, sinon l'établissement). */
  const poiMasterItem = useMemo(() => {
    const src = poiMasterOverride ?? business;
    if (!src?.latitude || !src?.longitude) return null;
    return {
      id: `self-${src.id}`,
      name: src.name,
      latitude: Number(src.latitude),
      longitude: Number(src.longitude),
      images: src.images,
      city: src.city ?? null,
      neighborhood: src.neighborhood ?? null,
      avgOn20: poiMasterOverride ? (poiMasterOverride.computed_rating ?? null) : avgOn20,
      totalReviews: poiMasterOverride ? (poiMasterOverride.total_review_count ?? 0) : totalReviewCount,
      markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
    } as PoiMapItem;
  }, [poiMasterOverride, business, avgOn20, totalReviewCount]);

  const poiMasterCenter = poiMasterItem ? { lat: poiMasterItem.latitude, lng: poiMasterItem.longitude } : undefined;



  const hasHighlights = useMemo(
    () => highlights.some((h) => h.title?.trim() || h.description?.trim()),
    [highlights]
  );

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

  // Widgets « par intention » (codes de widget) correspondant à un CTA de réservation
  const normIntent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const isBookingIntentLabel = (label?: string | null) => {
    const n = normIntent(label || "");
    return n === "reservez" || n === "reserver en ligne" || n === "day pass"
      || n === "reserver une table" || n === "reserver une chambre";
  };
  const bookingIntentWidgets = useMemo(() => {
    const labels = [
      business?.reserve_now_cta,
      business?.online_shop_cta,
      (business as any)?.url_4_cta,
      (business as any)?.url_5_cta,
    ].filter((l): l is string => !!l && isBookingIntentLabel(l));
    const out: { id: string; code: string; label: string }[] = [];
    labels.forEach((label) => {
      const w = widgetCodes.find((wc) => wc.intents.some((i) => normIntent(i) === normIntent(label)));
      if (w && !out.some((o) => o.id === w.id)) out.push({ id: w.id, code: w.code, label });
    });
    return out;
  }, [widgetCodes, business?.reserve_now_cta, business?.online_shop_cta, (business as any)?.url_4_cta, (business as any)?.url_5_cta]);
  const hasBookingIntentWidget = bookingIntentWidgets.length > 0;

  // Un champ url 1 à 5 avec un CTA de réservation (Réservez, Réserver une chambre/table, Réserver en ligne…)
  // signifie que l'établissement gère déjà sa réservation : on n'affiche pas notre widget de disponibilité.
  // Exception : si le lien est marqué comme « externe » (force_external), on conserve notre widget car
  // l'établissement redirige simplement vers un tiers sans embarquer son propre système de réservation.
  const hasOwnBookingCtaUrl = useMemo(() => {
    const pairs: Array<[any, any, any]> = [
      [business?.reserve_now_cta, (business as any)?.reserve_now_url, (business as any)?.reserve_now_force_external],
      [business?.online_shop_cta, (business as any)?.online_shop_url, (business as any)?.online_shop_force_external],
      [(business as any)?.url_4_cta, (business as any)?.url_4, (business as any)?.url_4_force_external],
      [(business as any)?.url_5_cta, (business as any)?.url_5, (business as any)?.url_5_force_external],
    ];
    return pairs.some(([label, url, forceExternal]) => !!url && !forceExternal && isBookingIntentLabel(label));
  }, [business]);



  const renderIntentWidgets = (keyPrefix: string) => {
    if (!hasBookingIntentWidget) return null;
    return (
      <div key={keyPrefix} className="mb-6 flex flex-col gap-6">
        {bookingIntentWidgets.map((w) => (
          <div key={`${keyPrefix}-${w.id}`} className="w-full">
            <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">{w.label}</h2>
            <div className="w-full rounded-xl overflow-hidden bg-white/95 border border-white/10 p-2">
              <WidgetCodeEmbed code={w.code} className="w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Widgets inline (Disponibilité / Horaires) affichés dans l'overlay Full Description
  const renderInlineDescWidgets = (keyPrefix: string) => {
    // Même logique exclusive que le CTA de gauche : Disponibilité sinon Horaires.
    // Si l'établissement expose son propre widget de réservation (code par intention),
    // on n'affiche pas notre widget de disponibilité — et pas de repli sur les horaires.
    const showAvail = !!isHotelWithPrice && !hasBookingIntentWidget && !hasOwnBookingCtaUrl;
    const showHours = !isHotelWithPrice && !!hasOpeningHours && !business?.is_open_24h;
    if (!showAvail && !showHours) return null;

    return (
      <div key={keyPrefix} className="my-10 w-full flex flex-col items-center gap-4">
        {showAvail && (
          <div className="w-full max-w-none md:max-w-[27rem] mx-auto text-[0.88em]">
            <AvailabilitySearchOverlay

              inline
              transparent
              language={language}
              isSearching={hotelSearchLoading}
              initialCheckIn={fallbackPanelData?.checkIn ?? initialAvailabilityCheckIn}
              initialCheckOut={fallbackPanelData?.checkOut ?? initialAvailabilityCheckOut}
              initialAdults={fallbackPanelData?.adults ?? initialAvailabilityAdults}
              onSearch={(checkIn, checkOut, adults) => {
                setShowDescriptionOverlay(false);
                setShowAvailabilitySearch(false);
                handleCheckAvailability(checkIn, checkOut, adults);
              }}
              onClose={() => {}}
            />
          </div>
        )}

        {showHours && business && (
          <div className="w-auto max-w-full mx-auto inline-block bg-transparent border border-white/20 rounded-2xl p-5 text-white text-center">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-4">
              <Clock className="h-4 w-4" />
              {language === "en" ? "Opening hours" : language === "ar" ? "أوقات العمل" : "Horaires d'ouverture"}
            </p>
            <HoursOverlayContent business={business} language={language} />
          </div>
        )}
      </div>
    );
  };

  // Bottom tabs
  // Non-YouTube/Vimeo videos (own hosted files + generic videos linked to the POI)
  const nonExternalVideoDocs = useMemo(
    () => (videoDocs || []).filter((d: any) => !isExternalVideoUrl(d.url)),
    [videoDocs]
  );
  const hasVideosCarousel = nonExternalVideoDocs.length > 0;
  const hasYoutubeChannel = !!(business?.youtube_url && ((business as any)?.n_tab ?? (business as any)?.show_youtube_tab));
  // External (YouTube/Vimeo/etc.) videos attached to this business or POI — used when the business has no YouTube channel
  const externalVideoDocs = useMemo(
    () => (videoDocs || []).filter((d: any) => isExternalVideoUrl(d.url)),
    [videoDocs]
  );
  const hasExternalVideos = externalVideoDocs.length > 0;
  // Vidéos annonces Location / Vente (immobilier) — prioritaires sous Avis Clients
  const rentalSaleVideos = useMemo(
    () => (videoDocs || [])
      .filter((d: any) => {
        const pt = (d.price_type || "").toString().toLowerCase();
        return (pt === "location" || pt === "vente") && typeof d.url === "string" && d.url.length > 0 && (!d.business_id || d.business_id === businessId);
      })
      .sort((a: any, b: any) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
      .slice(0, 4),
    [videoDocs, businessId]
  );
  const hasRentalSaleVideos = rentalSaleVideos.length > 0;
  // Single YouTube button: opens channel overlay if channel exists, else external videos overlay
  const hasYoutubeReady = !!(youtubeVideoCount && youtubeVideoCount > 0);
  const hasYoutubeBottomCarousel = hasYoutubeReady || hasYoutubeChannel || hasExternalVideos;
  const hasKpCarousel = kpRelated.length > 0;
  const hasKpSubcatCarousel = kpSubcategoryItems.length > 0;
  const hasDestCarousel = destinations.length > 1;
  const hasPoiCarousel = poiBusinesses.length >= 2;

  // Fetch KP group title (try kp1 first, then fall back to kp2)
  useEffect(() => {
    const kp1 = business?.kp_regroupement?.trim();
    const kp2 = business?.kp_regroupement_2?.trim();
    if ((!kp1 && !kp2) || !hasKpCarousel) { setKpGroupTitle(null); return; }
    let cancelled = false;
    (async () => {
      let title: string | null = null;
      if (kp1) {
        const { data } = await supabase.from("kp_group_titles").select("title").eq("kp_code", kp1).eq("kp_type", "kp1").maybeSingle();
        title = data?.title || null;
      }
      if (!title && kp2) {
        const { data } = await supabase.from("kp_group_titles").select("title").eq("kp_code", kp2).eq("kp_type", "kp2").maybeSingle();
        title = data?.title || null;
      }
      if (!cancelled) setKpGroupTitle(title);
    })();
    return () => { cancelled = true; };
  }, [business?.kp_regroupement, business?.kp_regroupement_2, hasKpCarousel]);

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
      tabs.push({ id: "kp", label: kpGroupTitle || (language === "en" ? "Other establishments" : language === "ar" ? "مؤسسات أخرى" : "Autres établissements"), hasContent: true });
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

  // Teaser de la zone viewer : hook, sinon début de la description en texte brut
  const viewerTeaser = useMemo(() => {
    if (hookText) return hookText;
    const plain = (woDescription || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    return plain ? plain.slice(0, 300) : null;
  }, [hookText, woDescription]);


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
  // (globalSoundOn / setGlobalSoundOn hoisted earlier — see top of component)
  // Force sound ON at slide panel mount (overrides any stored "off" preference).
  // Defer while a blocking overlay is open — sound activates only once the card is closed,
  // mirroring how video autoplay is neutralized during overlays.
  useEffect(() => {
    if (mediaBlockingOverlayOpen) return;
    setGlobalSoundOn(true);
  }, [setGlobalSoundOn, mediaBlockingOverlayOpen]);

  const { videoInfo, isVerticalVideo, isSquareVideo, setIsFileVideoVertical, setIsFileVideoSquare } = useVideoInfo(effectiveMedia || null, globalSoundOn);
  const activeInternalVideoLikeId = activeVideoOverlay?.url || (
    effectiveMedia?.kind === "video" && videoInfo?.type !== "youtube" ? effectiveMedia.url : null
  );
  const setYoutubeOverlayOpen = useCallback((open: boolean) => {
    if (open) setGlobalSoundOn(true);
    setShowYoutubeOverlay(open);
  }, [setGlobalSoundOn]);
  const externalVideoInteractiveMode = cardsHidden && effectiveMedia?.kind === "video" && videoInfo?.type !== "file";
  const availabilityConfirmationShown = cardsHidden && (hotelSearchLoading || !!fallbackPanelData);

  // Plein écran de la vidéo de fond :
  // - fichier hébergé → lecteur natif (contrôles liquid glass iOS)
  // - YouTube/Vimeo → overlay vidéo existant
  const expandBackgroundVideo = useCallback(() => {
    if (effectiveMedia?.kind !== "video") return;
    if (videoInfo?.type === "file") {
      const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
      if (!v) return;
      v.controls = true;
      if (typeof v.webkitEnterFullscreen === "function") {
        const onEnd = () => { v.controls = false; v.removeEventListener("webkitendfullscreen", onEnd); };
        v.addEventListener("webkitendfullscreen", onEnd);
        v.webkitEnterFullscreen();
        return;
      }
      if (typeof v.requestFullscreen === "function") {
        const onFs = () => {
          if (document.fullscreenElement) return;
          v.controls = false;
          document.removeEventListener("fullscreenchange", onFs);
        };
        document.addEventListener("fullscreenchange", onFs);
        v.requestFullscreen().catch(() => { v.controls = false; });
      }
      return;
    }
    setActiveVideoOverlay({
      url: effectiveMedia.url,
      name: (effectiveMedia as any).name ?? null,
      description: null,
    });
  }, [effectiveMedia, videoInfo?.type]);


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
  // Ignore touches that originate from interactive controls (buttons/links/inputs),
  // otherwise the drag-to-hide re-render swallows the synthetic click on iOS,
  // requiring multiple taps to trigger CTAs.
  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest('button, a, input, textarea, select, label, [role="button"], [data-cta]');
  };
  const handleMediaTouchStart = useCallback((e: React.TouchEvent) => {
    if (anyOverlayOpen) { swipeStartRef.current = null; return; }
    if (isInteractiveTarget(e.target)) {
      swipeStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
    onTouchStart?.(e);
  }, [onTouchStart, anyOverlayOpen]);
  const handleMediaTouchMove = useCallback((e: React.TouchEvent) => {
    if (anyOverlayOpen) return;
    if (!swipeStartRef.current) return;
    onTouchMove?.(e);
  }, [onTouchMove, anyOverlayOpen]);
  const handleMediaTouchEnd = useCallback((e: React.TouchEvent) => {
    if (anyOverlayOpen) { swipeStartRef.current = null; return; }
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > 60 && absX > absY * 1.5) {
      goMedia(dx < 0 ? 1 : -1);
    } else if (absY > 60 && absY > absX * 1.5) {
      if (dy < 0 && effectiveHasNext) {
        effectiveOnNext?.();
      } else if (dy > 0 && effectiveHasPrev) {
        effectiveOnPrev?.();
      }
    }
    onTouchEnd?.();
  }, [onTouchEnd, goMedia, effectiveHasNext, effectiveHasPrev, effectiveOnNext, effectiveOnPrev, anyOverlayOpen]);


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
    const isFlipbook = /issuu\.com|calameo\.com|fliphtml5\.com/i.test(url || '');
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

  // Aucune barre liquid-glass du bas quand un overlay Google Map est ouvert (POI / Itinéraire / Carte)
  // ...sauf quand une fiche est ouverte par-dessus la carte (sous-panneau POI / KP)
  const mapOverlayOpen = (showPoiMapOverlay || showDirections) && !selectedPoiBusinessId && !selectedKpBusinessId;
  useEffect(() => {
    if (!mapOverlayOpen) return;
    document.body.dataset.mapOverlay = "1";
    return () => { delete document.body.dataset.mapOverlay; };
  }, [mapOverlayOpen]);


  const handleVideoLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const ratio = v.videoWidth > 0 ? v.videoHeight / v.videoWidth : 1;
    setIsFileVideoVertical(v.videoHeight > v.videoWidth);
    setIsFileVideoSquare(ratio >= 0.9 && ratio <= 1.1);
  }, [setIsFileVideoVertical, setIsFileVideoSquare]);

  if (isLoading) {
    // Widget carte embarqué : pas de squelette de fiche (on n'affiche jamais l'accueil du Master).
    if (isEmbedMapWidget) return <div className="h-full w-full bg-transparent" />;
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

  const bottomBarEl = (() => {
    const socialItems: { name: string; url: string; icon: React.ReactNode; onClick?: () => void }[] = [
      business?.website && { name: "Site web", url: business.website, icon: <Globe className="h-4 w-4" />, onClick: () => {
        const url = business.website!.startsWith("http") ? business.website! : `https://${business.website}`;
        if (business?.website_force_external) window.open(url, "_blank", "noopener");
        else openDocOrBooking(url, "Site web", true);
      } },
      ctaConfig.bookingCta && { name: ctaConfig.bookingCtaLabel, url: ctaConfig.bookingCta.fullUrl, icon: <CalendarCheck className="h-4 w-4" />, onClick: () => {
        if (ctaConfig.bookingCta!.forceExternal) window.open(ctaConfig.bookingCta!.fullUrl, "_blank", "noopener");
        else openDocOrBooking(ctaConfig.bookingCta!.fullUrl, ctaConfig.bookingCtaLabel, true);
      } },
      ctaConfig.shopCta && { name: ctaConfig.shopCtaLabel, url: ctaConfig.shopCta.fullUrl, icon: <ShoppingCart className="h-4 w-4" />, onClick: () => {
        if (ctaConfig.shopCta!.forceExternal) window.open(ctaConfig.shopCta!.fullUrl, "_blank", "noopener");
        else openDocOrBooking(ctaConfig.shopCta!.fullUrl, ctaConfig.shopCtaLabel, true);
      } },
      // Menus & Flipbooks (avant les réseaux sociaux) — un badge par document renseigné
      ...(menuDocs || [])
        .filter((d: any) => d?.url && d.type !== 'flipbook')
        .map((d: any) => ({
          name: d.name || (language === "en" ? "Menu" : "Menu"),
          url: d.url as string,
          icon: <Newspaper className="h-4 w-4" />,
          onClick: () => openDocOrBooking(d.url, d.name || 'Menu'),
        })),
      ...(menuDocs || [])
        .filter((d: any) => d?.url && d.type === 'flipbook')
        .map((d: any) => ({
          name: d.name || 'Flipbook',
          url: d.url as string,
          icon: <BookOpen className="h-4 w-4" />,
          onClick: () => openDocOrBooking(d.url, d.name || 'Flipbook'),
        })),
      business?.instagram_url && { name: "Instagram", url: business.instagram_url, icon: <InstagramIcon className="h-4 w-4" /> },
      business?.facebook_url && { name: "Facebook", url: business.facebook_url, icon: <FacebookIcon className="h-4 w-4 text-[#1877F2]" /> },
      business?.tiktok_url && { name: "TikTok", url: business.tiktok_url, icon: <TikTokIcon className="h-5 w-5" /> },
      business?.youtube_url && { name: "YouTube", url: business.youtube_url, icon: <YouTubeIcon className="h-4 w-4 text-[#FF0000]" /> },
      business?.twitter_url && { name: "X", url: business.twitter_url, icon: <TwitterIcon className="h-5 w-5" /> },
      business?.linkedin_url && { name: "LinkedIn", url: business.linkedin_url, icon: <LinkedInIcon className="h-5 w-5 text-[#0A66C2]" /> },
      business?.pinterest_url && { name: "Pinterest", url: business.pinterest_url, icon: <PinterestIcon className="h-4 w-4 text-[#E60023]" /> },
      business?.vimeo_url && { name: "Vimeo", url: business.vimeo_url, icon: <VimeoIcon className="h-4 w-4 text-[#1AB7EA]" /> },
      business?.snapchat_url && { name: "Snapchat", url: business.snapchat_url, icon: <SnapchatIcon className="h-4 w-4" /> },
      (business as any)?.substack_url && { name: "Substack", url: (business as any).substack_url, icon: <SubstackIcon className="h-4 w-4 text-[#FF6719]" />, onClick: () => setShowSubstackOverlay(true) },
      business?.spotify_url && { name: "Spotify", url: business.spotify_url, icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1DB954" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.224.364-.704.479-1.068.255-2.928-1.789-6.612-2.193-10.95-1.203-.42.096-.84-.168-.936-.588-.096-.42.168-.84.588-.936 4.752-1.085 8.832-.62 12.108 1.404.36.224.479.704.258 1.068zm1.473-3.272c-.282.456-.879.6-1.335.318-3.348-2.058-8.454-2.652-12.42-1.452-.51.156-1.05-.132-1.206-.642-.156-.51.132-1.05.642-1.206 4.53-1.374 10.155-.708 14.022 1.668.456.282.6.879.297 1.314zm.129-3.408c-4.014-2.382-10.638-2.604-14.466-1.44-.612.186-1.26-.162-1.446-.774-.186-.612.162-1.26.774-1.446 4.392-1.332 11.706-1.074 16.32 1.668.546.324.726 1.032.402 1.578-.324.546-1.032.726-1.584.414z"/></svg>, onClick: () => setShowSpotifyOverlay(true) },
      business?.soundcloud_url && { name: "SoundCloud", url: business.soundcloud_url, icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#FF5500" aria-hidden="true"><path d="M11.56 8.87V17h8.76c1.85-.13 3.68-1.5 3.68-3.92 0-2.6-2.13-3.96-4-3.96-.55 0-1.06.1-1.55.27-.55-2.7-2.85-4.4-5.55-4.4-.45 0-.94.07-1.34.18zm-1.5.43c-.36-.13-.74-.2-1.13-.2-.5 0-.96.1-1.4.27V17h2.53V9.3zm-3.92.7c-.27-.07-.55-.1-.84-.1-.3 0-.58.04-.84.1V17h1.68V10zm-2.86.66c-.2-.04-.4-.07-.6-.07-.2 0-.42.03-.62.07V17h1.22v-6.34zM.78 12c-.32.13-.56.5-.56.93 0 .43.24.8.56.93V12zm21.66-2.88z"/></svg>, onClick: () => setShowSoundCloudOverlay(true) },
    ].filter(Boolean) as { name: string; url: string; icon: React.ReactNode; onClick?: () => void }[];
    const bookingItems: { name: string; url: string; icon: React.ReactNode; label?: boolean }[] = [
      business?.tripadvisor_url && { name: "TripAdvisor", url: business.tripadvisor_url, icon: <TripAdvisorIcon className="h-4 w-4 text-[#34E0A1]" /> },
      (business as any)?.booking_url && { name: "Booking.com", url: (business as any).booking_url, icon: <BookingIcon className="h-4 w-4 text-[#003580]" /> },
      (business as any)?.airbnb_url && { name: "Airbnb", url: (business as any).airbnb_url, icon: <AirbnbIcon className="h-4 w-4 text-[#FF5A5F]" /> },
      (business as any)?.glovo_url && { name: "Glovo", url: (business as any).glovo_url, icon: <img src={glovoLogo} alt="Glovo" className="h-4 w-4 object-contain" /> },
      (business as any)?.hotels_com_url && { name: "Hotels.com", url: (business as any).hotels_com_url, icon: null, label: true },
      (business as any)?.trivago_url && { name: "Trivago", url: (business as any).trivago_url, icon: null, label: true },
      business?.getyourguide_url && { name: "GetYourGuide", url: business.getyourguide_url, icon: null, label: true },
      business?.viator_url && { name: "Viator", url: business.viator_url, icon: null, label: true },
      business?.tourradar_url && { name: "TourRadar", url: business.tourradar_url, icon: null, label: true },
      (business as any)?.other_booking_url && { name: (business as any).other_booking_name || "Réservation", url: (business as any).other_booking_url, icon: <ExternalLink className="h-3.5 w-3.5" /> },
    ].filter(Boolean) as { name: string; url: string; icon: React.ReactNode; label?: boolean }[];
    const hasSocialBar = socialItems.length > 0 || bookingItems.length > 0;
    if (!(hasSocialBar || business?.whatsapp)) return null;
    const stripClass = "flex items-center gap-2 py-1 pl-4 overflow-x-auto overflow-y-hidden flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
    const stripWheelRef = (el: HTMLDivElement | null) => {
      if (!el || (el as any).__owmWheelX) return;
      (el as any).__owmWheelX = true;
      el.addEventListener("wheel", (ev: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth) return;
        if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
        ev.preventDefault();
        el.scrollLeft += ev.deltaY;
      }, { passive: false });
    };
    const badgeClass = "shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/15 transition-colors whitespace-nowrap";
    const waHref = business?.whatsapp
      ? whatsappUrl(business.whatsapp, language === "en" ? `Hello ${business?.name || ""}, I found you on One World Morocco.` : language === "ar" ? `مرحبا ${business?.name || ""}` : `Bonjour ${business?.name || ""}, je vous ai trouvé sur One World Morocco.`)
      : null;
    return (
      <div data-owm-video-bottom-bar className="relative z-[70] shrink-0 py-2 bg-transparent flex flex-col gap-2">
        {(hasSocialBar || waHref) && (
          <div dir="ltr" ref={stripWheelRef} className={stripClass}>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-full bg-[#25D366] text-black hover:brightness-110 transition-colors whitespace-nowrap"
                title="WhatsApp"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase font-['Montserrat',sans-serif] whitespace-nowrap">WhatsApp</span>
              </a>
            )}
            {socialItems.map((s, i) => (
              <button key={i} onClick={() => (s.onClick ? s.onClick() : window.open(s.url, "_blank", "noopener"))} className={badgeClass} title={s.name}>
                {s.icon}
                <span className="text-[11px] font-medium uppercase font-['Montserrat',sans-serif] whitespace-nowrap">{s.name}</span>
              </button>
            ))}
            {socialItems.length > 0 && bookingItems.length > 0 && (
              <div className="shrink-0 w-px h-6 bg-white/20" />
            )}
            {bookingItems.map((item) => (
              <button
                key={`${item.name}-${item.url}`}
                onClick={() => {
                  if (item.name === "Booking.com") openDocOrBooking(item.url, item.name, true);
                  else window.open(item.url, "_blank", "noopener");
                }}
                className={badgeClass}
                title={item.name}
              >
                {!item.label && item.icon}
                <span className="text-[11px] font-medium uppercase font-['Montserrat',sans-serif] whitespace-nowrap">{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className={`h-full overflow-visible overscroll-none relative ${isEmbedMapWidget ? "bg-transparent" : "bg-black"}`}>
      {/* Toolbar portals */}
      <ToolbarPortals
        business={business}
        images={images}
        showMosaic={showMosaic}
        setShowMosaic={setShowMosaic}
        youtubeVideoCount={youtubeVideoCount}
        allYoutubeVideos={allYoutubeVideos}
        setActiveYoutubeVideo={setActiveYoutubeVideo}
        setShowYoutubeOverlay={setYoutubeOverlayOpen}
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
        hideToolbarButtons={showDescriptionOverlay}
        activeYoutubeVideo={activeYoutubeVideo}
        activeInternalVideoId={activeInternalVideoLikeId}
      />

      {/* ClubLoginPopup is mounted globally (SearchPage). Avoid duplicate instance here. */}

      {/* Full-bleed background — extracted component.
          Widget embarqué "carte" : pas de média de fond (évite l'écran noir + vidéo avant la carte). */}
      {isEmbedMapWidget ? (
        <div className="absolute inset-0 bg-transparent" />
      ) : (
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
            anyOverlayOpen={mediaBlockingOverlayOpen}
          />

          {effectiveMedia?.kind !== "video" && effectiveMedia?.kind !== "matterport" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          )}

        </div>
      )}




      {/* Left sidebar CTAs — mirrors the Full Description overlay sidebar */}
      {!cardsHidden && !(embedMode && initialOverlay === "poi") && (
        <div data-owm-video-rail="true" dir="ltr" className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
          {(() => {
            const LANG_OPTIONS = [
              { code: "fr" as const, flag: "🇫🇷", label: "Français" },
              { code: "en" as const, flag: "🇬🇧", label: "English" },
              { code: "ar" as const, flag: "🇲🇦", label: "العربية" },
            ];
            const ctaLabel = language === "en" ? "Language" : language === "ar" ? "اللغة" : "Langue";
            const currentLang = LANG_OPTIONS.find((opt) => opt.code === language) || LANG_OPTIONS[0];
            const otherLangs = LANG_OPTIONS.filter((opt) => opt.code !== language);
            return (
              <div className={`group cta-peek ${peekCta[0] ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4`}>
                <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{ctaLabel}</span>
                <span className="flex items-center gap-0 group-hover:gap-1.5 group-hover:ml-2 transition-[margin,gap] duration-300">
                  <button
                    type="button"
                    data-cta-tap
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Current language ${currentLang.label}`}
                    title={currentLang.label}
                    className="relative inline-flex items-center justify-center h-[22px] w-[22px] text-[19px] leading-none shrink-0 opacity-100 transition-all duration-200"
                  >
                    {currentLang.flag}
                  </button>
                  <span className="flex items-center gap-1.5 opacity-0 max-w-0 overflow-hidden group-hover:opacity-100 group-hover:max-w-[120px] transition-all duration-300 ease-out shrink-0">
                    {otherLangs.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        data-cta-tap
                        onClick={(e) => {
                          e.stopPropagation();
                          setLanguage(opt.code);
                          import("@/lib/analytics").then(({ trackEvent }) =>
                            trackEvent("language_switch", { from: language, to: opt.code, source: "slidepanel_cta" })
                          ).catch(() => {});
                        }}
                        aria-label={`Switch to ${opt.label}`}
                        title={opt.label}
                        className="relative inline-flex items-center justify-center text-[22px] leading-none shrink-0 opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-200"
                      >
                        {opt.flag}
                      </button>
                    ))}
                  </span>
                </span>
              </div>
            );
          })()}
          {isHotelWithPrice ? (
            <div data-cta-tap onClick={handleCtaTap('dispo', () => setShowAvailabilitySearch(true))} className={`group cta-peek ${peekDispo || tappedCta === 'dispo' ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4`}>
              <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Availability" : language === "ar" ? "التوفر" : "Disponibilité"}</span>
              <BsCalendarDay className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          ) : hasOpeningHours && !business?.is_open_24h ? (
            <div
              data-cta-tap
              onClick={handleCtaTap('hours', () => setShowHoursOverlay(true))}
              className={`group cta-peek ${peekHoraires || tappedCta === 'hours' ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4 ${openBadgeInfo?.isOpen ? 'bg-[#25D366] hover:bg-[#1fb958]' : 'backdrop-blur-md bg-black/80 hover:bg-black/90'}`}
            >
              <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{openBadgeInfo?.isOpen ? (language === "en" ? "Open" : language === "ar" ? "مفتوح" : "Ouvert") : (language === "en" ? "Hours" : language === "ar" ? "المواعيد" : "Horaires")}</span>
              <Clock className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          ) : null}
          {showGoogleMap && business && (business.latitude || business.google_maps_url) && (
            <div data-cta-tap onClick={handleCtaTap('map', () => setShowPoiMapOverlay(true))} className={`group cta-peek ${peekCta[1] || tappedCta === 'map' ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4`}>
              <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation"}</span>
              <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {hasDestCarousel && (
            <div data-cta-tap onClick={handleCtaTap('dest', () => { setDescGridSection("dest"); setDescGridPage(0); setDescOverlayDirect(true); setShowDescriptionOverlay(true); })} className={`group cta-peek ${peekCta[3] || tappedCta === 'dest' ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4`}>
              <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Destinations" : language === "ar" ? "الوجهات" : "Destinations"}</span>
              <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
            </div>
          )}
          {showGoogleMap && !hideDirections && business?.latitude && business?.longitude && (() => {
            const radiusKm = Number((business as any)?.poi_radius_km);
            const isFar = Number.isFinite(radiusKm) && radiusKm > 10;
            const ItinIcon = isFar ? BsCarFrontFill : GiWalkingBoot;
            return (
              <div data-cta-tap onClick={handleCtaTap('itin', () => setShowDirections(true))} className={`group cta-peek ${peekItin || tappedCta === 'itin' ? 'is-peek' : ''} relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4`}>
                <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Directions" : language === "ar" ? "طريق" : "Itinéraire"}</span>
                <ItinIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
              </div>
            );
          })()}

        </div>

      )}

      {/* Overlaid content */}
      <div
        data-slidepanel-scroll="true"
        className={`relative z-10 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain h-full p-4 pt-16 md:p-6 md:pt-20 lg:pt-16 ${cardsHidden ? 'pb-0' : showSearchBar ? 'pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-[95px]' : 'pb-[calc(2rem+env(safe-area-inset-bottom))]'} ${(effectiveMedia?.kind === "matterport" && cardsHidden) ? "pointer-events-none" : externalVideoInteractiveMode ? "pointer-events-none" : ""} scrollbar-hide-mobile`}
        style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
        onTouchStart={externalVideoInteractiveMode ? undefined : handleMediaTouchStart}
        onTouchMove={externalVideoInteractiveMode ? undefined : handleMediaTouchMove}
        onTouchEnd={externalVideoInteractiveMode ? undefined : handleMediaTouchEnd}
        // Tap sur la zone média vide → masquer / afficher (remplace le Toggle)
        onClick={(e) => {
          if (externalVideoInteractiveMode) return;
          if (e.target !== e.currentTarget) return;
          // Mobile : tap au centre de la vidéo de fond → plein écran natif
          if (effectiveMedia?.kind === "video" && window.matchMedia("(max-width: 767px)").matches) {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            if (x > 0.3 && x < 0.7 && y > 0.3 && y < 0.7) {
              expandBackgroundVideo();
              return;
            }
          }
          if (cardsHidden) showCards(); else hideCards();

        }}

      >

        {/* Block 1 : en-tête rectangle — conservé uniquement quand la zone
            d'information « viewer » n'est pas affichée (description masquée) */}
        {business?.hide_description && (
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
            language={language}
          />
        )}

        {/* Zone d'information « viewer vidéo » déplacée dans la barre de CTAs en bas,
            entre le CTA rectangle (URL 2) et les autres CTAs liquid-glass. */}


        <div
          className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${cardsHidden ? 'translate-x-full opacity-0 pointer-events-none max-h-0 overflow-hidden' : 'translate-x-0 opacity-100'}`}
        >

        {/* Hook desktop retiré : il est désormais dans la zone d'information (MediaViewerInfo) */}


        {/* Note /20 + bouton + : centrés entre carrousel info et tabs */}
        {(avgOn20 != null && totalReviewCount > 0) || woDescription || hasHighlights || (menuDocs || []).some((d: any) => d.type === 'flipbook' && typeof d.icon === 'string' && /^https?:\/\//i.test(d.icon)) ? (
          <div className="slidepanel-center-short relative flex flex-col items-center justify-center pointer-events-auto gap-6 md:gap-8 flex-1">


            {/* Bouton « + » retiré : l'ouverture de la Full Description se fait
                désormais via la zone d'information posée sur le média. */}



            {/* Conteneur 2 : flipbooks OU badge Avis clients */}
            <div className="flex items-center justify-center pointer-events-auto">
              {(() => {
                const flipbookImages = (menuDocs || []).filter(
                  (d: any) => d.type === 'flipbook' && typeof d.icon === 'string' && /^https?:\/\//i.test(d.icon)
                );
                if (flipbookImages.length > 0) {
                  return (
                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-2">
                      {flipbookImages.map((d: any) => (
                        <button
                          key={d.id}
                          onClick={() => openDocOrBooking(d.url, d.name || 'Document')}
                          className="block rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold transition-colors shadow-2xl"
                          style={{ filter: "drop-shadow(0 4px 20px hsla(0,0%,0%,0.5))" }}
                          aria-label={d.name || 'Flipbook'}
                        >
                          <img
                            src={d.icon}
                            alt={d.name || 'Flipbook'}
                            className="block w-28 h-36 md:w-36 md:h-48 object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  );
                }
                if (avgOn20 != null && totalReviewCount > 0) {
                  return null;
                }
                return null;
              })()}
            </div>
          </div>
        ) : null}

        {/* Bottom carousel removed — all sections now accessible via description overlay grid */}
        </div>

        {/* Badge social de la vidéo courante (logo plateforme + Follow @compte) */}
        {effectiveMedia?.kind === "video" && (
          <VideoSocialBadge
            social={getVideoSocial(videoDocs.find((d) => d.url === effectiveMedia?.url))}
            animKey={`${currentMediaIndex}-${effectiveMedia?.url || ""}`}
          />
        )}

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

         {/* Offres B2B — le badge "N Offres" au-dessus des CTAs a été retiré.
             Les offres sont désormais présentées en slides dans le popup d'accueil
             et dans l'overlay Full Description (sous le badge avis). */}
          <BusinessPromotionsList
            businessId={business?.id}
            cardsHidden={cardsHidden || showWelcomePopup || businessPromotions.length > 0}
          />


        {/* YouTube scrubbar — placed above the bottom CTAs so it stays visible */}
        {videoInfo?.type === "youtube" && !anyOverlayOpen && !cardsHidden && (
          <div className="relative z-50 w-full flex justify-center px-4 pb-3 pointer-events-auto">
            <YoutubeScrubBar
              iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>}
              visible={true}
              className="relative z-50 w-full max-w-[min(680px,92%)] mx-auto"
            />
          </div>
        )}

        {/* CTA Bar — hidden when the POI/Map overlay is open to keep the map immersive */}
        {!showPoiMapOverlay && (
        <CtaBar
          business={business}
          language={language}
          cardsHidden={cardsHidden}
          showSearchBar={showSearchBar}
          showGoogleMap={showGoogleMap}
          externalVideoInteractiveMode={externalVideoInteractiveMode}
          effectiveMedia={effectiveMedia}
          // Barre de CTAs rectangle : uniquement l'URL 2 (Réserver). Aucun fallback.
          bookingCta={ctaConfig.bookingCta}
          shopCta={null}
          url4Cta={null}
          url5Cta={null}


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
          hideDirections={true}
          hideSecondaryCtas={hideSecondaryCtas}
          infoSlot={business && !business.hide_description ? (
            <MediaViewerInfo
              name={business.name}
              city={business.city}
              neighborhood={business.neighborhood}
              avgOn20={avgOn20}
              totalReviewCount={totalReviewCount}
              teaser={viewerTeaser}
              language={language}
              bare
              onOpen={startDescMorph}
            />
          ) : undefined}
        />
        )}

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

      {showSubstackOverlay && (business as any)?.substack_url && (
        <SubstackArticlesOverlay
          substackUrl={(business as any).substack_url}
          businessName={business?.name}
          onClose={() => setShowSubstackOverlay(false)}
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

      {/* YouTube Overlay — rendered inside the slidepanel so it stacks above it */}
      {showYoutubeOverlay && (
        <YouTubeOverlay
          business={business}
          activeVideo={activeYoutubeVideo}
          onSelectVideo={setActiveYoutubeVideo}
          onPlayingChange={setYoutubeIsPlaying}
          onClose={() => { setYoutubeOverlayOpen(false); setActiveYoutubeVideo(null); setYoutubeIsPlaying(false); }}
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
          onControlsApi={setOverlayControlsApi}
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
            onLoad={() => {
              setBookingOverlayLoaded(true);
              import("@/lib/analytics").then(({ trackEvent }) =>
                trackEvent("booking_overlay_loaded", {
                  business_id: businessId,
                  url: finalUrl,
                  title: bookingOverlayTitle ?? "",
                })
              ).catch(() => {});
            }}
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
      {showDescriptionOverlay && (woDescription || hasHighlights || descGridSection || descOverlayContent || !!hookText || (avgOn20 != null && totalReviewCount > 0) || images.length > 0 || (nonExternalVideoDocs.length + externalVideoDocs.length) > 0) && (
        <OverlayShell zClass="z-[80]" animClass={descMorphRect ? "owm-desc-morph" : (descMorphDone ? "" : "animate-zoom-out-center")} outerRef={applyDescMorph} className="flex flex-col" data-owm-video-overlay>
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
          {images[0] && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[42%] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          )}
          {!selectedPoiBusinessId && !selectedKpBusinessId && (
          <div data-owm-video-header className="relative z-30 shrink-0 flex flex-col gap-2 px-4 py-3 bg-transparent backdrop-blur-sm border-b border-white/10 order-[-2]">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => { if (descGridSection && !descOverlayDirect) { setDescGridSection(null); setDescGridPage(0); } else if (descOverlayContent && !descOverlayDirect) { setDescOverlayContent(null); } else { setShowDescriptionOverlay(false); setDescOverlayContent(null); setDescOverlayDirect(false); setDescGridSection(null); setDescGridPage(0); } }} className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold uppercase font-['Montserrat',sans-serif] truncate text-white flex-1">{business?.name}</h2>
            </div>
            {!descGridSection && !descOverlayContent && (
              <div className="w-full min-w-0 h-7">
                <DescAnchorBar containerId="owm-desc-scroll" deps={business?.id} language={language} />
              </div>
            )}
          </div>
          )}
          <div className="relative z-[50] flex-1 min-h-0 order-[-1]" style={{ perspective: "1200px" }}>
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
                const sortedVideoDocs = [...nonExternalVideoDocs].sort(
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
                const activeFrontTabGrid = poiCatFilter ? frontTabs.find(t => t.id === poiCatFilter) || null : null;
                const afterCatGrid = activeFrontTabGrid
                  ? activePoiCategoryBusinesses
                  : poiBusinesses;
                const afterSubcatGrid = (() => {
                  let list = afterCatGrid;
                  if (poiSubcatFilter) list = list.filter((p) => (p.categories || []).includes(poiSubcatFilter));
                  if (catSubcatFilter) list = list.filter((p) => (p.categories || []).includes(catSubcatFilter));
                  return list;
                })();
                const afterProxGrid = poiProximityKm != null
                  ? afterSubcatGrid.filter((p) => {
                      const d = userCoords && p.latitude != null && p.longitude != null
                        ? haversineKm(userCoords.lat, userCoords.lng, p.latitude, p.longitude)
                        : null;
                      return d != null && d <= poiProximityKm;
                    })
                  : afterSubcatGrid;
                gridItems = afterProxGrid.map((poi) => ({
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
                      <span className="text-white text-xs font-medium font-['Montserrat',sans-serif] min-w-[2rem] text-center">
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
                      key={`${descGridSection}-${poiCatFilter || "all"}-${poiSubcatFilter || "all"}-${catSubcatFilter || "all"}-${poiProximityKm ?? "all"}-${descGridPage}`}
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
                                    <p className="text-[11px] font-medium text-white truncate font-['Montserrat',sans-serif]">
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
              <RevealScrollArea id="owm-desc-scroll" innerClassName="px-4 pt-4 pb-6 md:pl-6 md:pt-6 pr-4 md:pr-6">

                  {descOverlayContent && (
                    <>
                      {!(descOverlayContent.title?.toLowerCase().startsWith("avis") || descOverlayContent.title?.toLowerCase().startsWith("customer")) && (
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="h-4 w-4 text-gold shrink-0" />
                          <h3 className="text-sm font-bold uppercase font-['Montserrat',sans-serif] text-white">{descOverlayContent.title}</h3>
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
                                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-gold/70 font-['Montserrat',sans-serif] mb-1">Budget moyen / pers.</span>
                                <span className="text-lg font-normal text-gold font-['Montserrat',sans-serif]">
                                  {min != null && max != null ? `${min} – ${max} ${currency}` : `${min ?? max} ${currency}`}
                                </span>
                              </div>
                            );
                          })()}
                          {descOverlayContent.priceDetails && (
                            <div className="flex-1 min-w-[140px] rounded-xl border border-terracotta/20 backdrop-blur-md px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.80)' }}>
                              <span className="block text-[10px] font-extrabold uppercase tracking-widest font-['Montserrat',sans-serif] text-terracotta/70 mb-1">Détail des prix</span>
                              <div className="rich-price-html text-sm font-normal leading-relaxed whitespace-pre-line text-terracotta [&_li]:text-base [&_p]:text-base" style={{ fontSize: '0.925rem' }} dangerouslySetInnerHTML={{ __html: descOverlayContent.priceDetails.replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:2em;line-height:1">$1</span>') }} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {!descOverlayContent && hookText && (
                    <p
                      className="text-xl md:text-3xl leading-snug tracking-[0.02em] text-white/90 mb-2 text-center"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {hookText}
                    </p>
                  )}
                  {!descOverlayContent && hookText && (business?.city || business?.neighborhood || business?.address) && (
                    <div className="mb-4 flex items-center justify-center gap-1.5 text-xs md:text-sm text-white/80 text-center">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[business?.city, business?.neighborhood, business?.address].filter(Boolean).join(" • ")}
                      </span>
                    </div>
                  )}
                  {!descOverlayContent && avgOn20 != null && totalReviewCount > 0 && (
                    <div className="mb-4 flex items-center justify-center gap-1.5 text-xs md:text-sm text-white/80">
                      <Star className="h-3.5 w-3.5 shrink-0 text-gold fill-gold" />
                      <span className="!font-extrabold text-gold" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        {avgOn20}<span className="font-bold text-gold/80">/20</span>
                      </span>
                      <span className="!font-bold text-gold/90 tabular-nums">{totalReviewCount.toLocaleString("fr-FR")}</span>
                      <span className="text-gold/80 font-medium">{language === "en" ? "reviews" : language === "ar" ? "آراء" : "avis"}</span>
                    </div>
                  )}
                  {!descOverlayContent && openBadgeInfo?.text && (
                    <div className="mb-4 flex items-center justify-center text-sm md:text-base">
                      <span
                        className={`font-bold ${openBadgeInfo.isOpen ? "text-[#25D366]" : "text-primary"}`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {openBadgeInfo.text}
                      </span>
                    </div>
                  )}
                  {/* Engagements / Certifications / Commodités — en colonne au-dessus de popup/offres */}
                  {!descOverlayContent && (() => {
                    const engs: string[] = ((business as any)?.engagements || []) as string[];
                    if (engs.length === 0) return null;
                    const standards = engs.filter((e) => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
                    const certifications = engs.filter((e) => e.startsWith("Certification:")).map((e) => e.replace("Certification:", "").trim());
                    const logistics = engs.filter((e) => e.startsWith("Logistique:")).map((e) => e.replace("Logistique:", "").trim());
                    if (standards.length + certifications.length + logistics.length === 0) return null;
                    const chip = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs md:text-sm font-medium backdrop-blur-sm w-fit";
                    return (
                      <div className="mb-5 flex flex-col items-center gap-1.5">
                        {certifications.map((c, i) => (
                          <span key={`fd-c-${i}`} className={`${chip} bg-amber-500/30 text-amber-200`}>
                            <Award className="h-3.5 w-3.5 shrink-0" />{translateEngagementLabel(c, language)}
                          </span>
                        ))}
                        {standards.map((e, i) => (
                          <span key={`fd-e-${i}`} className={`${chip} bg-green-500/30 text-green-200`}>
                            <Leaf className="h-3.5 w-3.5 shrink-0" />{translateEngagementLabel(e, language)}
                          </span>
                        ))}
                        {logistics.map((l, i) => {
                          const lower = l.toLowerCase();
                          const Icon = lower.includes("livraison")
                            ? Truck
                            : (lower.includes("pmr") || lower.includes("handicap") || lower.includes("accès")) ? Accessibility : Package;
                          return (
                            <span key={`fd-l-${i}`} className={`${chip} bg-blue-500/30 text-blue-200`}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />{translateEngagementLabel(l, language)}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* Cartes Image popup + Offres — sous le badge avis client */}

                  {!descOverlayContent && (() => {
                    const popupUrl = (business as any)?.popup_image_url as string | undefined;
                    const slides: { kind: "popup" | "promo"; promo?: any }[] = [
                      ...(popupUrl ? [{ kind: "popup" as const }] : []),
                      ...businessPromotions.map((p: any) => ({ kind: "promo" as const, promo: p })),
                    ];
                    if (slides.length === 0) return null;
                    const total = slides.length;
                    const safe = Math.min(descPromoSlide, total - 1);
                    const slide = slides[safe];
                    const isPopup = slide.kind === "popup";
                    const promo = slide.promo;
                    const bg = isPopup ? popupUrl : (images[0] || popupUrl);
                    const hasMeta = !!(popupMeta.title || popupMeta.description);
                    const hasMessage = !!promo?.promotion_message && promo.promotion_message.replace(/<[^>]*>/g, "").trim() !== "";
                    const promoAmount = promo ? (() => {
                      if (promo.promotion_type === "percentage" && promo.promotion_value != null) return `-${promo.promotion_value}%`;
                      if (promo.promotion_type === "fixed" && promo.promotion_value != null) return `-${promo.promotion_value} ${promo.promotion_currency || "MAD"}`;
                      if (promo.savings_amount != null) return `-${promo.savings_amount} ${promo.promotion_currency || "MAD"}`;
                      return null;
                    })() : null;
                    return (
                      <div className="mb-6 flex items-center justify-center gap-2">
                        {total > 1 && (
                          <button
                            type="button"
                            onClick={() => setDescPromoSlide((s) => (s - 1 + total) % total)}
                            className="shrink-0 h-11 w-9 rounded-l-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-r-0 border-white/10 backdrop-blur-sm active:scale-95 transition-all"
                            aria-label="Précédent"
                          >
                            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                          </button>
                        )}
                        <div
                          key={`desc-promo-${safe}`}
                          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col h-auto btn-flash-auto animate-scale-in border border-white/10 bg-white/5 backdrop-blur-sm"

                        >

                          {isPopup ? (
                            hasMeta ? (
                              <div className="relative pt-6 px-6 pb-8 text-white">
                                {popupMeta.title && (
                                  <h3 className="text-2xl md:text-3xl font-extrabold leading-tight mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                    {popupMeta.title}
                                  </h3>
                                )}
                                {popupMeta.description && (
                                  <div
                                    className="text-base leading-relaxed text-white/95 font-medium prose prose-invert prose-sm max-w-none [&_*]:!text-white/95 [&_a]:!text-white [&_a]:underline [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_li_p]:my-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
                                    dangerouslySetInnerHTML={{ __html: popupMeta.description }}
                                  />
                                )}
                              </div>
                            ) : (
                              <img src={popupUrl} alt={business?.name || ""} className="relative w-full h-auto" loading="lazy" />
                            )
                          ) : (
                            <div className={`relative ${promoAmount ? "pt-20" : "pt-6"} px-6 pb-8 text-white flex flex-col ${!hasMessage ? "justify-center" : ""}`}>
                              {promoAmount && (
                                <div
                                  className="absolute top-3 left-6 flex items-center gap-2 z-10 text-white bg-black/65 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl min-w-max"
                                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                                >
                                  <span className="text-white font-black text-[11px] tracking-widest uppercase leading-none whitespace-nowrap">{language === "en" ? "save" : language === "ar" ? "وفّر" : "économisez"}</span>
                                  <span className="text-[#D4AF37] font-black text-xl leading-none whitespace-nowrap">{promoAmount}</span>
                                </div>
                              )}
                              <h3
                                className={`text-2xl md:text-3xl font-extrabold ${!hasMessage ? "text-center leading-[1.6]" : "leading-tight mb-3"}`}
                                style={{ fontFamily: "'Montserrat', sans-serif" }}
                              >
                                {promo.title}
                              </h3>
                              {hasMessage && (
                                <div
                                  className="prose prose-invert prose-base max-w-none text-base leading-relaxed text-white font-medium prose-headings:text-white prose-headings:font-bold prose-strong:text-white prose-a:text-[#C04F17] prose-a:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li::marker]:!text-white [&_img]:rounded-md [&_img]:max-w-full [&_p]:!text-white [&_span]:!text-white [&_strong]:!text-white [&_a]:!text-[#C04F17]"
                                  dangerouslySetInnerHTML={{ __html: promo.promotion_message }}
                                />
                              )}
                            </div>
                          )}
                          {total > 1 && (
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                              {Array.from({ length: total }).map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  aria-label={`Slide ${i + 1}`}
                                  onClick={() => setDescPromoSlide(i)}
                                  className={`h-1.5 rounded-full transition-all ${i === safe ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {total > 1 && (
                          <button
                            type="button"
                            onClick={() => setDescPromoSlide((s) => (s + 1) % total)}
                            className="shrink-0 h-11 w-9 rounded-r-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-l-0 border-white/10 backdrop-blur-sm active:scale-95 transition-all"
                            aria-label="Suivant"
                          >
                            <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {/* Widget « par intention » de l'établissement — sous la carte popup / offres */}
                  {!descOverlayContent && renderIntentWidgets("desc-intent-top")}
                  {/* Widgets Disponibilité / Horaires — sous le badge de note */}
                  {renderInlineDescWidgets("desc-widgets-top")}


                  {(() => {
                    const rawHtml = descOverlayContent ? descOverlayContent.html : woDescription;
                    if (!rawHtml) return null;
                    return (
                      <div
                        data-owm-desc-body="1"
                        className="prose prose-invert prose-base max-w-none break-words text-base leading-[1.625] font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] prose-josefin-headings prose-h2:text-base md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h2]:!uppercase [&_h3]:!font-bold [&_p:empty]:min-h-[1em] [&_table]:border-collapse [&_table]:w-full [&_table]:table-fixed [&_td]:border [&_td]:border-white/20 [&_td]:p-4 [&_td]:align-top [&_td]:text-xs [&_td_img]:w-full [&_td_img]:h-36 [&_td_img]:object-cover [&_td_img]:rounded-md [&_td_img]:block [&_th]:border [&_th]:border-white/20 [&_th]:p-2 [&_th]:bg-white/10 [&_th]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_iframe]:max-w-full [&_iframe]:rounded-md [&_mark]:bg-yellow-500/40 [&_mark]:px-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_hr]:border-white/20 prose-strong:!text-white [&_.img-h2-row]:flex [&_.img-h2-row]:items-center [&_.img-h2-row]:gap-3 [&_.img-h2-row]:my-4 [&_.img-h2-row_img]:!my-0 [&_.img-h2-row_img]:h-10 [&_.img-h2-row_img]:w-10 [&_.img-h2-row_img]:object-contain [&_.img-h2-row_img]:shrink-0 [&_.img-h2-row_h2]:!my-0"
                        dangerouslySetInnerHTML={{ __html: groupImagesWithHeadings(rawHtml).replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:1.6em;line-height:1;vertical-align:middle">$1</span>') }}
                      />
                    );
                  })()}

                  {!descOverlayContent && (() => {
                    const visible = highlights.filter(h => h.title?.trim() || h.description?.trim());
                    if (visible.length === 0) return null;
                    return (
                      <div data-owm-no-anchor="1" className="mt-8 pt-6 border-t border-white/10">
                        {(highlightsSection.title || highlightsSection.intro) && (
                          <div className="mb-4">
                            {highlightsSection.title && (
                              <h2 className="text-lg md:text-2xl font-bold uppercase tracking-[0.12em] text-white mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                {highlightsSection.title}
                              </h2>
                            )}

                            {highlightsSection.intro && (
                              <div
                                className="text-sm text-white/80 leading-relaxed font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] prose prose-invert prose-sm max-w-none [&_*]:!text-white/80 [&_a]:!text-white [&_p]:my-1"
                                dangerouslySetInnerHTML={{ __html: highlightsSection.intro }}
                              />
                            )}
                          </div>
                        )}
                        <div className={`grid grid-cols-1 gap-3 ${highlightsSection.columns === 1 ? "" : highlightsSection.columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                          {visible.map((h) => (
                            <div key={h.id} className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-3 flex flex-col gap-2">
                              {h.image_url && (
                                <div className="w-full h-44 md:h-52 rounded-lg overflow-hidden bg-white/5">
                                  <img src={h.image_url} alt={h.title} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {h.icon && <DynamicIcon name={h.icon} className="h-4 w-4 text-gold shrink-0" />}
                                {h.title && (
                                  <h3 className="text-sm md:text-base font-bold uppercase tracking-[0.1em] text-white" style={{ fontFamily: "'Montserrat', sans-serif", WebkitTextStroke: '0.6px currentColor', textShadow: '0 0 0 currentColor' }}>
                                    {h.title}
                                  </h3>
                                )}

                              </div>
                              {(h.metric_title || h.metric_value) && (
                                <div className="flex items-baseline gap-2">
                                  {h.metric_title && (
                                    <span className="text-[10px] uppercase tracking-[0.1em] text-white/70">{h.metric_title}</span>
                                  )}
                                  {h.metric_value && (
                                    <span className="text-lg font-bold text-gold" style={{ fontFamily: "'Montserrat', sans-serif" }}>{h.metric_value}</span>
                                  )}
                                </div>
                              )}
                              {h.description && (
                                <div
                                  className="text-sm text-white/80 leading-relaxed font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] prose prose-invert prose-sm max-w-none [&_*]:!text-white/80 [&_a]:!text-white [&_p]:my-1"
                                  dangerouslySetInnerHTML={{ __html: h.description }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Avis clients — détail texte + widgets « Laisser un avis » (sous les blocs highlights) */}
                  {!descOverlayContent && (
                    <InlineReviewsSection
                      texts={reviewTexts}
                      platforms={reviewPlatforms as any}
                      avgOn20={avgOn20}
                      totalReviewCount={totalReviewCount}
                      language={language}
                      slug={business?.slug || null}
                    />
                  )}

                  {/* Vidéos annonces Location / Vente — sous Avis Clients, pleine largeur */}
                  {!descOverlayContent && hasRentalSaleVideos && (() => {
                    return (
                      <div className="mt-8 flex flex-col gap-6">
                        {rentalSaleVideos.map((d: any) => {
                          const pt = (d.price_type || "").toString().toLowerCase();
                          const ptLabel = pt === "location"
                            ? (language === "en" ? "For rent" : "Location")
                            : (language === "en" ? "For sale" : "Vente");
                          return (
                            <div key={d.url} className="w-full">
                              <h3 className="text-sm font-bold uppercase mb-2 text-white font-['Montserrat',sans-serif]">
                                {[d.name, ptLabel].filter(Boolean).join(" — ")}
                                {d.price ? ` · ${d.price}` : ""}
                              </h3>
                              <div className="w-full flex justify-center">
                                <PhoneMockupFrame frameColor="dark" screenAspect="9 / 16">
                                  {isExternalVideoUrl(d.url) ? (
                                    <iframe
                                      src={getVideoEmbed(d.url, window.location.origin, { autoplay: false, muted: true } as any).embedUrl}
                                      title={d.name || ptLabel}
                                      allow="encrypted-media; fullscreen; picture-in-picture"
                                      allowFullScreen
                                      className="w-full h-full block border-0"
                                    />
                                  ) : (
                                    <video
                                      src={d.url}
                                      poster={d.thumbnail_url || undefined}
                                      controls
                                      muted
                                      playsInline
                                      preload="metadata"
                                      className="w-full h-full block object-cover"
                                    />
                                  )}
                                </PhoneMockupFrame>
                              </div>
                              {d.description && (
                                <p className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-line">{htmlToPlainText(d.description)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Vidéos — grille 3x3 desktop / 2x2 mobile (propriétaires + YouTube/externes) — masquée quand les vidéos Location/Vente sont présentes */}
                  {!descOverlayContent && !hasRentalSaleVideos && (nonExternalVideoDocs.length + externalVideoDocs.length) > 0 && (() => {
                    const urlOrder = new Map(allVideoUrls.map((u, i) => [u, i]));
                    const seen = new Set<string>();
                    const combined = [...nonExternalVideoDocs, ...externalVideoDocs].filter((d: any) => {
                      if (!d?.url || seen.has(d.url)) return false;
                      seen.add(d.url);
                      return true;
                    });
                    const sorted = combined.sort(
                      (a, b) => (urlOrder.get(a.url) ?? 999) - (urlOrder.get(b.url) ?? 999)
                    );
                    const items = sorted.slice(0, 9);
                    return (
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">
                          {language === "en" ? "Videos" : language === "ar" ? "فيديوهات" : "Vidéos"}
                        </h2>
                        <HScroll className="flex md:grid md:grid-cols-3 gap-1.5 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab md:cursor-auto">
                          {items.map((vid, i) => {
                            const ytMatch = vid.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
                            const vimeoMatch = vid.url.match(/vimeo\.com\/(\d+)/);
                            const thumb = vid.thumbnail_url
                              || (ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null)
                              || (vimeoMatch ? `https://vumbnail.com/${vimeoMatch[1]}.jpg` : null);
                            const isHostedFile = !thumb && !ytMatch && !vimeoMatch;
                            return (
                              <div
                                key={`desc-vid-${i}`}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer shrink-0 w-[46%] snap-start md:w-auto md:shrink"
                                onClick={() => setActiveVideoOverlay({ url: vid.url, name: vid.name, description: vid.description })}
                              >
                                {thumb ? (
                                  <img src={thumb} alt={vid.name || `${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                                ) : isHostedFile ? (
                                  <VideoThumbnail src={vid.url} alt={vid.name || undefined} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                    <Play className="h-8 w-8 text-white/40" />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                    <Play className="h-5 w-5 text-white fill-white" />
                                  </div>
                                </div>
                                {vid.name && (
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                                    <p className="text-[10px] text-white font-medium truncate font-['Montserrat',sans-serif]">{vid.name}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </HScroll>

                      </div>
                    );
                  })()}

                  {/* Images — galerie masonry cinématique bord-à-bord */}
                  {!descOverlayContent && images.length > 0 && (
                    <ImageGallerySection
                      images={images}
                      language={language as "fr" | "en" | "ar"}
                      onOpenImage={(url) => {
                        const mi = mediaItems.findIndex((m) => m.kind === "image" && m.url === url);
                        setLightboxIndex(mi >= 0 ? mi : 0);
                        setIsLightboxOpen(true);
                      }}
                    />
                  )}

                  {/* Widget Assistant IA du Master — sous les blocs highlights */}
                  {!descOverlayContent && business?.slug && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">
                        {language === "en" ? "AI Assistant" : language === "ar" ? "المساعد الذكي" : "Assistant IA"}
                      </h2>
                      <div className="w-full mx-auto max-w-[820px] rounded-xl overflow-hidden bg-transparent border border-white/10">
                        <iframe
                          key={`ai-widget-${business.slug}`}
                          src={`/embed/ask/${business.slug}?preset=overlay&lang=${language}&theme=none&bg=transparent&ink=light${
                            (() => {
                              const e = new URLSearchParams(window.location.search).get("engine");
                              return e === "v1" || e === "v2" ? `&engine=${e}` : "";
                            })()
                          }`}

                          title={language === "en" ? "AI Assistant" : "Assistant IA"}
                          allow="clipboard-write; microphone; fullscreen"
                          className="w-full block border-0 bg-transparent"
                          style={{ height: 760, background: "transparent" }}
                          loading="lazy"
                        />

                      </div>

                    </div>
                  )}

                  {/* Widget Adresses à proximité — full width */}
                  {!descOverlayContent && business?.slug && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">
                        {language === "en" ? "Nearby" : language === "ar" ? "بالقرب" : "À proximité"}
                      </h2>

                      <div className="w-full rounded-xl overflow-hidden bg-black/30 border border-white/10">
                        <iframe
                          key={`nearby-widget-${business.slug}`}
                          src={`/embed/nearby/${business.slug}?preset=overlay&lang=${language}`}
                          title={language === "en" ? "Nearby" : "À proximité"}
                          allow="geolocation; fullscreen"
                          className="w-full block border-0"
                          style={{ height: 640 }}
                          loading="lazy"
                        />
                      </div>

                    </div>
                  )}





                  {/* Ils parlent de nous (liens externes avec logos) */}
                  {!descOverlayContent && externalLinks.length > 0 && (() => {
                    const EXT_LABELS: Record<string, Record<string, string>> = {
                      fr: { partenaires: "Ils nous font confiance", recompenses: "Nous sommes reconnus par", certifications: "Nous sommes certifiés par", presse: "Ils parlent de nous", media: "Ils parlent de nous" },
                      en: { partenaires: "They trust us", recompenses: "We are recognised by", certifications: "We are certified by", presse: "They talk about us", media: "They talk about us" },
                      ar: { partenaires: "يثقون بنا", recompenses: "معترف بنا من قِبَل", certifications: "نحن معتمدون من قِبَل", presse: "يتحدثون عنّا", media: "يتحدثون عنّا" },
                    };
                    const L = EXT_LABELS[language as string] ?? EXT_LABELS.fr;
                    const key = (externalLinks[0]?.description || "").toLowerCase().trim();
                    const heading = L[key] || L.presse;
                    const items = externalLinks.filter((l) => (l.name || "").trim());
                    if (items.length === 0) return null;
                    return (
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <h2 className="text-lg md:text-2xl font-bold uppercase tracking-[0.12em] text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {heading}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {items.map((link, i) => {
                            const logo = typeof link.icon === "string" && /^https?:\/\//i.test(link.icon) ? link.icon : null;
                            return (
                              <button
                                key={`${link.name}-${i}`}
                                onClick={() => {
                                  if (link.url && link.url !== "#" && link.url !== "*") openDocOrBooking(link.url, link.name || "Lien", true);
                                }}
                                className="rounded-xl border border-white/10 p-0 flex flex-col items-stretch overflow-hidden transition-opacity hover:opacity-90 text-center"
                                style={{ backgroundColor: 'rgba(150,150,150,0.92)' }}
                              >
                                {/* Logo / icône toujours en haut, hauteur fixe pour alignement entre cartes */}
                                <div className="h-20 md:h-24 w-full flex items-center justify-center p-2">
                                  {logo ? (
                                    <img src={logo} alt={link.name || ""} className="max-h-full w-auto max-w-full object-contain" loading="lazy" />
                                  ) : (
                                    <Newspaper className="h-9 w-9 text-black/60" />
                                  )}
                                </div>
                                {/* Texte en bas, sur le même fond gris que le logo */}
                                <div className="flex-1 flex items-center justify-center p-3 min-h-[48px]">
                                  <span className="text-sm md:text-base font-semibold normal-case tracking-normal text-black/85 leading-snug" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                    {link.name}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Widgets Réseaux & flux (Spotify / SoundCloud / Substack) — CTA WhatsApp uniquement dans la barre fixe du bas */}
                  {!descOverlayContent && (business?.spotify_url || business?.soundcloud_url || (business as any)?.substack_url) && (
                    <div className="mt-8 pt-6 border-t border-white/10 space-y-6 text-center">
                      {business?.slug && (business?.spotify_url || business?.soundcloud_url || (business as any)?.substack_url) && (
                        <div className="mx-auto w-full max-w-[720px] flex flex-col items-center gap-6">
                          {business?.spotify_url && (
                            <iframe
                              key="w-spotify"
                              src={spotifyEmbedUrl(business.spotify_url) || business.spotify_url}
                              title="Spotify"
                              scrolling="no"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              style={{ width: "100%", height: 352, border: 0, background: "transparent", overflow: "hidden", borderRadius: 12 }}
                            />
                          )}
                          {business?.soundcloud_url && (
                            <iframe
                              key="w-soundcloud"
                              src={soundcloudEmbedUrl(business.soundcloud_url) || business.soundcloud_url}
                              title="SoundCloud"
                              scrolling="no"
                              allow="autoplay"
                              style={{ width: "100%", height: 400, border: 0, background: "transparent", overflow: "hidden", borderRadius: 12 }}
                            />
                          )}
                          {(business as any)?.substack_url && (
                            <InlineSubstackWidget
                              url={(business as any).substack_url}
                              language={language}
                            />
                          )}
                        </div>
                      )}
                    </div>

                  )}

                  {/* Réservation embarquée : url 1 à 5 sans « Lien externe » activé et CTA Réservez / Réserver en ligne / Day Pass */}
                  {!descOverlayContent && (() => {
                    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const isBookingLabel = (label: string) => {
                      const n = norm(label || "").trim();
                      return n === "reservez" || n === "reserver en ligne" || n === "day pass"
                        || n === "reserver une table" || n === "reserver une chambre";
                    };
                    // Seuls les CTA explicitement renseignés sur l'URL comptent :
                    // pas de repli sur presentation_mode, et le site web est exclu.
                    const candidates: { url: string; label: string; forceExternal?: boolean }[] = [
                      ctaConfig.bookingCta && business?.reserve_now_cta && { url: ctaConfig.bookingCta.fullUrl, label: business.reserve_now_cta, forceExternal: ctaConfig.bookingCta.forceExternal },
                      ctaConfig.shopCta && business?.online_shop_cta && { url: ctaConfig.shopCta.fullUrl, label: business.online_shop_cta, forceExternal: ctaConfig.shopCta.forceExternal },
                      ctaConfig.url4Cta && (business as any)?.url_4_cta && { url: ctaConfig.url4Cta.fullUrl, label: (business as any).url_4_cta, forceExternal: ctaConfig.url4Cta.forceExternal },
                      ctaConfig.url5Cta && (business as any)?.url_5_cta && { url: ctaConfig.url5Cta.fullUrl, label: (business as any).url_5_cta, forceExternal: ctaConfig.url5Cta.forceExternal },
                    ].filter(Boolean) as { url: string; label: string; forceExternal?: boolean }[];
                    const embeds = candidates.filter(
                      (c) => !c.forceExternal && (/^https?:\/\//i.test(c.url) || widgetCodes.some((w) => w.intents.some((i) => norm(i).trim() === norm(c.label).trim()))) && isBookingLabel(c.label)
                    );
                    const seen = new Set<string>();
                    const unique = embeds.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
                    if (unique.length === 0) return null;
                    // Un code de widget partageant la même intention (CTA) remplace l'iframe de l'URL.
                    const findWidget = (label: string) =>
                      widgetCodes.find((w) => w.intents.some((i) => norm(i).trim() === norm(label).trim())) || null;
                    const usedWidgets = new Set<string>();
                    return (
                      <div className="mt-8 flex flex-col gap-6">
                        {unique.map((c) => {
                          const w = findWidget(c.label);
                          // Le widget par intention est déjà affiché en haut de l'overlay quand
                          // aucun contenu de description ne le remplace : ne pas le dupliquer ici
                          // (les codes tiers ciblent un id DOM unique → le 2e reste "Chargement en cours...").
                          if (w && !descOverlayContent) return null;
                          if (w && !usedWidgets.has(w.id)) {
                            usedWidgets.add(w.id);
                            return (
                              <div key={`w-${w.id}`} className="w-full">
                                <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">{c.label}</h2>
                                <div className="w-full rounded-xl overflow-hidden bg-white/95 border border-white/10 p-2">
                                  <WidgetCodeEmbed code={w.code} className="w-full" />
                                </div>
                              </div>
                            );
                          }
                          if (w) return null; // widget déjà affiché pour une autre intention identique

                          return (
                            <div key={c.url} className="w-full">
                              <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">{c.label}</h2>
                              <div className="w-full rounded-xl overflow-hidden bg-black/30 border border-white/10">
                                <iframe
                                  src={c.url}
                                  title={c.label}
                                  allow="payment; clipboard-write; fullscreen"
                                  className="w-full block border-0"
                                  style={{ aspectRatio: "16 / 10", minHeight: 640 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}



                  {/* Visite virtuelle 3D (Matterport) affichée pleine largeur */}

                  {!descOverlayContent && business?.matterport_url && /^https?:\/\//i.test(business.matterport_url) && (
                    <div className="mt-8 w-full">
                      <h3 className="text-sm font-bold uppercase mb-2 text-white font-['Montserrat',sans-serif]">
                        {language === 'en' ? '3D Virtual Tour' : 'Visite virtuelle 3D'}
                      </h3>
                      <div className="w-full rounded-xl overflow-hidden bg-black/30 border border-white/10">
                        <iframe
                          src={business.matterport_url}
                          title={language === 'en' ? '3D Virtual Tour' : 'Visite virtuelle 3D'}
                          allow="xr-spatial-tracking; fullscreen; gyroscope; accelerometer"
                          allowFullScreen
                          className="w-full block border-0"
                          style={{ aspectRatio: '16 / 10', minHeight: 320 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Flipbooks (Issuu, Calaméo, FlipHTML5…) affichés pleine largeur */}
                  {!descOverlayContent && (() => {
                    const flipbooks = (menuDocs || []).filter((d: any) => d.type === 'flipbook' && typeof d.url === 'string' && /^https?:\/\//i.test(d.url));
                    if (flipbooks.length === 0) return null;
                    return (
                      <div className="mt-8 flex flex-col gap-6">
                        {flipbooks.map((d: any) => (
                          <div key={d.url} className="w-full">
                            {d.name && (
                              <h2 className="text-lg md:text-xl font-bold uppercase mb-3 text-white font-['Montserrat',sans-serif]">{d.name}</h2>
                            )}
                            <div className="w-full rounded-xl overflow-hidden bg-black/30 border border-white/10">
                              <iframe
                                src={getFlipbookEmbedUrl(d.url)}
                                title={d.name || 'Flipbook'}
                                allow="clipboard-write; fullscreen"
                                className="w-full block border-0"
                                style={{ aspectRatio: '16 / 10', minHeight: 320 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}


                  {/* Chaîne YouTube (Shorts prioritaires) — au-dessus des widgets Horaires/Disponibilité */}
                  {!descOverlayContent && business?.id && hasYoutubeChannel && (
                    <InlineYouTubeSection businessId={business.id} language={language} />
                  )}

                  {/* Widgets Disponibilité / Horaires — avant les badges */}
                  {renderInlineDescWidgets("desc-widgets-bottom")}

                  {/* Widget « Laisser un avis » (iframe) — tout en bas de l'overlay */}
                  {!descOverlayContent && business?.slug && hasReviewsCard && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="w-full mx-auto max-w-[820px] rounded-xl overflow-hidden bg-transparent">
                        <iframe
                          key={`rate-widget-bottom-${business.slug}`}
                          src={`/embed/avis/${business.slug}?preset=overlay&platform=all&lang=${language}&variant=card&bg=transparent&theme=dark`}
                          title={language === "en" ? "Leave a review" : language === "ar" ? "اترك تقييماً" : "Laisser un avis"}
                          className="w-full block border-0 bg-transparent"
                          style={{ height: rateIframeHeight, background: "transparent" }}
                          loading="eager"
                        />
                      </div>
                    </div>
                  )}



                  {/* Badges (Menu / Images / Vidéos, liens externes, réseaux & réservation) — moved to a fixed bottom bar outside the scroll area */}
                  {/* bottomBarEl is rendered below the content area so it stays visible */}


              </RevealScrollArea>

            )}
          </div>
          {!descGridSection && bottomBarEl}
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
        <OverlayShell zClass="z-[85]" coverToolbar={false} animClass={isEmbedMapWidget ? "animate-slide-in-right" : "animate-slide-up-from-bottom"} bg="bg-background" className={`flex flex-col ${embedHalfSheet ? "left-1/2 w-1/2" : ""}`}>

          <SlidePanelHeader
            onClose={() => { setSelectedPoiBusinessId(null); setShowDescriptionOverlay(false); setDescGridSection(null); setDescGridPage(0); onMosaicStateChange?.(false); if (poiOpenedFromMapRef.current) poiOpenedFromMapRef.current = false; }}
            alwaysDark
            closeVariant="inverse"
            glassClose
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
            glassClose
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

      {showPoiMapOverlay && (() => {
        const TOP_LIMIT = 20;
        const activeFrontTab = poiCatFilter ? frontTabs.find(t => t.id === poiCatFilter) || null : null;
        // Widget Adresses à proximité : on neutralise la catégorie de Structure du Front
        // qui contient la sous-catégorie par défaut du Master (ex. Hébergement pour Riad El Fenn).
        const masterDefaultSubcat = (() => {
          const list = Array.isArray((business as any)?.categories) ? (business as any).categories : [];
          for (const c of list) if (typeof c === "string" && c.trim()) return c.trim();
          const mc = (business as any)?.main_category;
          return typeof mc === "string" && mc.trim() ? mc.trim() : null;
        })();
        const catPillTabs = isEmbedMapWidget && masterDefaultSubcat
          ? frontTabs.filter((ft) => !ft.subcategoryNames.has(masterDefaultSubcat))
          : frontTabs;
        // Origine unique des distances : l'établissement Master (fallback géoloc)
        const proxOrigin = (business?.latitude != null && business?.longitude != null
          ? { lat: business.latitude, lng: business.longitude }
          : userCoords) ?? null;
        const distOf = (p: { latitude: number | null; longitude: number | null }) =>
          proxOrigin && p.latitude != null && p.longitude != null
            ? haversineKm(proxOrigin.lat, proxOrigin.lng, p.latitude, p.longitude)
            : null;
        const inRadius = (p: { latitude: number | null; longitude: number | null }) => {
          if (poiProximityKm == null) return true;
          const d = distOf(p);
          return d != null && d <= poiProximityKm;
        };
        const matchesNames = (p: any, names: Set<string>) => {
          if (p.main_category && names.has(p.main_category)) return true;
          return Array.isArray(p.categories) && p.categories.some((c: string) => names.has(c));
        };
        // Corpus fermé imposé (réponse IA) : pas de vivier ville, pas de rayon, ordre conservé
        const overridePool: any[] | null = poiOverrideRows.length ? (poiOverrideRows as any[]) : null;
        // Vivier ville restreint au rayon actif → base des compteurs catégories
        const cityInRadius = overridePool ?? (poiCityBusinesses as any[]).filter(inRadius);
        const catCounts = new Map<string, number>();
        for (const ft of catPillTabs) {
          catCounts.set(ft.id, cityInRadius.filter((p) => matchesNames(p, ft.subcategoryNames)).length);
        }

        const afterCat = activeFrontTab
          ? cityInRadius.filter((p) => matchesNames(p, activeFrontTab.subcategoryNames))
          : (overridePool ?? (poiBusinesses as any[]));

        // Pill POI / sous-catégories — le MENU ne liste que les sous-catégories
        // "par défaut" (1ère sous-catégorie de la fiche), mais le FILTRE retenu
        // ramène tous les POI qui utilisent cette sous-catégorie, même en 2e/3e position.
        const subcatsOf = (p: any): string[] => {
          const list = Array.isArray(p.categories) ? p.categories : [];
          const all = [p.main_category, ...list]
            .map((c: any) => (typeof c === "string" ? c.trim() : ""))
            .filter(Boolean);
          return Array.from(new Set(all));
        };
        const defaultSubcatOf = (p: any): string | null => {
          const list = Array.isArray(p.categories) ? p.categories : [];
          for (const c of list) {
            if (typeof c === "string" && c.trim()) return c.trim();
          }
          return null;
        };
        const defaultSubcatsOf = (list: any[]) => {
          const s = new Set<string>();
          for (const p of list) {
            const d = defaultSubcatOf(p);
            if (d) s.add(d);
          }
          return s;
        };

        // Pill POI : totalement indépendant du Pill Catégories.
        // Base = POI de proximité de l'établissement Master, entrées = sous-catégories par défaut.
        const poiPillBase = overridePool ?? (poiBusinesses as any[]).filter(inRadius);
        const poiPillDefaults = defaultSubcatsOf(poiPillBase);
        const poiSubcatCounts = new Map<string, number>();
        for (const p of poiPillBase) {
          for (const sc of subcatsOf(p)) {
            if (poiPillDefaults.has(sc)) poiSubcatCounts.set(sc, (poiSubcatCounts.get(sc) || 0) + 1);
          }
        }
        const poiSubcatList: [string, number][] = Array.from(poiSubcatCounts.entries())
          .filter(([, c]) => c > 0)
          .sort((a, b) => a[0].localeCompare(b[0]));
        // Le filtre POI retenu est ignoré s'il n'a plus d'entrée dans le rayon actif
        const poiSubcatFilterEff = poiSubcatFilter && poiSubcatCounts.has(poiSubcatFilter) ? poiSubcatFilter : null;

        // Pill Catégories : niveau 2 = sous-catégories (par défaut) de la catégorie choisie
        const catSubcatList: [string, number][] = activeFrontTab
          ? (() => {
              const defs = defaultSubcatsOf(afterCat);
              return activeFrontTab.subcategories
                .filter((sd) => defs.has(sd.name))
                .map((sd) => [sd.name, afterCat.filter((p) => matchesNames(p, sd.names)).length] as [string, number])
                .filter(([, c]) => c > 0)
                .sort((a, b) => a[0].localeCompare(b[0]));
            })()
          : [];

        const afterSubcat = (() => {
          let list = afterCat;
          if (poiSubcatFilterEff) list = list.filter((p) => subcatsOf(p).includes(poiSubcatFilterEff));
          if (catSubcatFilter) list = list.filter((p) => subcatsOf(p).includes(catSubcatFilter));
          return list;
        })();

        const afterProx = overridePool ? afterSubcat : afterSubcat.filter(inRadius);
        const total = afterProx.length;
        const displayedPoi = overridePool
          ? afterProx
          : (poiShowAll || total <= TOP_LIMIT) ? afterProx : afterProx.slice(0, TOP_LIMIT);
        // Pas de bascule Top 20 / Tous si le résultat courant tient sous la limite
        const showAllToggle = poiMapMode === "poi" && !overridePool && total > TOP_LIMIT;
        const showCatPill = poiMapMode === "poi" && !overridePool && catPillTabs.length >= 2;
        const showSubcatPill = poiMapMode === "poi" && poiSubcatList.length >= 2;
        const showProxPill = poiMapMode === "poi" && !overridePool;
        const proxOpts: { km: number; label: string }[] = [
          { km: 0.5, label: "- 500 m" },
          { km: 1, label: "- 1 km" },
          { km: 5, label: "- 5 km" },
          { km: 10, label: "- 10 km" },
          { km: 20, label: "- 20 km" },
          { km: 50, label: "- 50 km" },
          { km: 100, label: "- 100 km" },
        ];

        const proxCountsByKm: Record<number, number> = {};
        if (showProxPill) {
          const proxBase = activeFrontTab
            ? (poiCityBusinesses as any[]).filter((p) => matchesNames(p, activeFrontTab.subcategoryNames))
            : afterSubcat;
          for (const o of proxOpts) {
            proxCountsByKm[o.km] = proxBase.filter((p) => { const d = distOf(p); return d != null && d <= o.km; }).length;
          }
        }
        const activeProx = proxOpts.find((o) => o.km === poiProximityKm) || null;
        return (
        <OverlayShell zClass="z-[80]" desktopOnly={false} animClass={isEmbedMapWidget ? "animate-slide-in-right" : "animate-slide-up-from-bottom"} bg={isEmbedMapWidget ? "bg-background" : ""}>
          <div dir="ltr" className="absolute inset-0">
            {!embedMode && (
              <button
                onClick={() => { setShowPoiMapOverlay(false); infoCarouselRef.current?.scrollTo({ left: 0, behavior: "smooth" }); }}
                className="absolute top-[calc(3.3rem+0.75rem)] left-3 z-[15] h-9 w-9 flex items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-black/90 transition-opacity"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="absolute top-[calc(3.3rem+0.75rem)] right-3 z-[15] flex items-center gap-2">
              {!embedMode && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors shadow-lg"
                  aria-label="Le Club OWM"
                >
                  <Heart className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                </button>
              )}

              {(() => {
                let shareUrl: string | undefined;
                try {
                  const params = new URLSearchParams(window.location.search);
                  if (business?.id && params.get("openChannel") === String(business.id)) {
                    shareUrl = `https://oneworldmorocco.com${window.location.pathname}${window.location.search}`;
                  }
                } catch {/* noop */}
                if (!shareUrl) {
                  shareUrl = business?.slug ? `https://oneworldmorocco.com/${business.slug}` : undefined;
                }
                return (
                  <ShareButton
                    title={business?.name || (language === "en" ? "Nearby" : language === "ar" ? "بالقرب" : "À proximité")}
                    variant="dark"
                    className="shrink-0"
                    previewImage={business?.images?.[0] || null}
                    shareUrl={shareUrl}
                  />
                );
              })()}
            </div>
            {(business?.name || activeFrontTab || (overridePool && poiOverrideTitle)) && (
              <div className="absolute top-[calc(3.3rem+0.75rem)] left-14 right-3 z-[10] pointer-events-none flex justify-center">
                <div className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-md text-black text-sm font-semibold truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {overridePool && poiOverrideTitle ? (
                    poiOverrideTitle
                  ) : activeFrontTab ? (
                    <>
                      {translateFrontStructure(activeFrontTab.name, language)}
                      {catSubcatFilter ? <span className="opacity-60"> / {translateSubcategory(catSubcatFilter, language)}</span> : null}
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">
                        {language === "en" ? "Nearby" : language === "ar" ? "بالقرب" : "À proximité"}
                      </span>
                      <span className="hidden sm:inline">
                        {language === "en" ? `Near ${business?.name}` : language === "ar" ? `بالقرب من ${business?.name}` : `À proximité de ${business?.name}`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            {(showAllToggle || showSubcatPill || showProxPill) && (
              <div className="absolute top-[calc(3.3rem+0.75rem+2.75rem)] left-3 right-3 z-[10] flex items-center justify-center gap-2 flex-wrap pointer-events-none">



                {showAllToggle && (
                  <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider pointer-events-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    <button
                      type="button"
                      onClick={() => { resetWidgetMapView(); setPoiShowAll(false); }}
                      className={`px-3 py-1 rounded-full transition-colors ${!poiShowAll ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                    >
                      {language === "en" ? "Top 20" : language === "ar" ? "أفضل 20" : "Top 20"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetWidgetMapView(); setPoiShowAll(true); }}
                      className={`px-3 py-1 rounded-full transition-colors ${poiShowAll ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                    >
                      {language === "en" ? "All" : language === "ar" ? "الكل" : "Tous"} <span className="ml-0.5 opacity-70">{total}</span>
                    </button>
                  </div>
                )}
                <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider pointer-events-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {usePillDropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiSubcatFilterEff ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {poiSubcatFilterEff ? translateSubcategory(poiSubcatFilterEff, language) : (language === "en" ? "Points of interest" : language === "ar" ? "نقاط الاهتمام" : "Points d'intérêt")}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[260] max-h-[70vh] min-w-[15rem] overflow-y-auto">
                        {poiSubcatFilterEff && (
                          <DropdownMenuItem onSelect={() => { resetWidgetMapView(); setPoiSubcatFilter(null); }}>
                            {language === "en" ? "All" : language === "ar" ? "الكل" : "Tous"}
                          </DropdownMenuItem>
                        )}
                        {poiSubcatList.map(([name, count]) => (
                          <DropdownMenuItem key={name} onSelect={() => { resetWidgetMapView(); setPoiCatFilter(null); setCatSubcatFilter(null); setPoiSubcatFilter(name); setPoiShowAll(false); }}>
                            {translateSubcategory(name, language)} <span className="ml-1 opacity-60">({count})</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPoiPillOverlay("poi")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiSubcatFilterEff ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {poiSubcatFilterEff ? translateSubcategory(poiSubcatFilterEff, language) : (language === "en" ? "Points of interest" : language === "ar" ? "نقاط الاهتمام" : "Points d'intérêt")}
                    </button>

                  )}
                </div>
                {showCatPill && (
                  <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider pointer-events-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {usePillDropdown ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiCatFilter ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            {catSubcatFilter
                              ? translateSubcategory(catSubcatFilter, language)
                              : activeFrontTab
                                ? translateFrontStructure(activeFrontTab.name, language)
                                : (language === "en" ? "Categories" : language === "ar" ? "الفئات" : "Catégories")}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[260] max-h-[70vh] min-w-[15rem] overflow-y-auto">
                          {activeFrontTab ? (
                            <>
                              {/* Fallback vers Catégories en haut des sous-catégories */}
                              <DropdownMenuItem onSelect={() => { resetWidgetMapView(); setPoiCatFilter(null); setCatSubcatFilter(null); setPoiShowAll(false); }}>
                                {"\u2039 "}{language === "en" ? "Categories" : language === "ar" ? "الفئات" : "Catégories"}
                              </DropdownMenuItem>
                              {catSubcatFilter && (
                                <DropdownMenuItem onSelect={() => { resetWidgetMapView(); setCatSubcatFilter(null); }}>
                                  {language === "en" ? "All" : language === "ar" ? "الكل" : "Tous"}
                                </DropdownMenuItem>
                              )}
                              {catSubcatList.map(([name, count]) => (
                                <DropdownMenuItem key={name} onSelect={() => { resetWidgetMapView(); setPoiSubcatFilter(null); setCatSubcatFilter(name); setPoiShowAll(false); }}>
                                  {translateSubcategory(name, language)} <span className="ml-1 opacity-60">({count})</span>
                                </DropdownMenuItem>
                              ))}
                            </>
                          ) : (
                            catPillTabs.map((ft) => {
                              const count = catCounts.get(ft.id) ?? 0;
                              const disabled = count === 0;
                              return (
                                <DropdownMenuItem
                                  key={ft.id}
                                  disabled={disabled}
                                  onSelect={(e) => {
                                    if (disabled) { e.preventDefault(); return; }
                                    e.preventDefault();
                                    resetWidgetMapView(); setPoiSubcatFilter(null); setPoiCatFilter(ft.id); setCatSubcatFilter(null); setPoiShowAll(false);
                                  }}
                                  className={disabled ? "opacity-40 pointer-events-none" : ""}
                                >
                                  {translateFrontStructure(ft.name, language)} <span className="ml-1 opacity-60">({count})</span>
                                </DropdownMenuItem>
                              );
                            })
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPoiPillOverlay("cat")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiCatFilter ? "bg-[#F1F1F1] text-black" : "text-white/80 hover:text-white"}`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {catSubcatFilter
                          ? translateSubcategory(catSubcatFilter, language)
                          : activeFrontTab
                            ? translateFrontStructure(activeFrontTab.name, language)
                            : (language === "en" ? "Categories" : language === "ar" ? "الفئات" : "Catégories")}
                      </button>
                    )}
                  </div>
                )}

              </div>
            )}


            {poiPillOverlay === "poi" && (
              <PoiFilterChoiceOverlay
                zClass="z-[250]"
                title={language === "en" ? "Points of interest" : language === "ar" ? "نقاط الاهتمام" : "Points d'intérêt"}
                items={poiSubcatList.map(([name, count]) => ({
                  key: name,
                  label: translateSubcategory(name, language),
                  count,
                }))}
                selectedKey={poiSubcatFilterEff}
                allLabel={language === "en" ? "All" : language === "ar" ? "الكل" : "Tous"}
                onSelectAll={() => { resetWidgetMapView(); setPoiSubcatFilter(null); setPoiPillOverlay(null); }}
                onSelect={(key) => { resetWidgetMapView(); setPoiCatFilter(null); setCatSubcatFilter(null); setPoiSubcatFilter(key); setPoiShowAll(false); setPoiPillOverlay(null); }}
                onClose={() => setPoiPillOverlay(null)}
              />
            )}

            {poiPillOverlay === "cat" && (
              activeFrontTab ? (
                <PoiFilterChoiceOverlay
                  zClass="z-[250]"
                  title={translateFrontStructure(activeFrontTab.name, language)}
                  items={catSubcatList.map(([name, count]) => ({
                    key: name,
                    label: translateSubcategory(name, language),
                    count,
                  }))}
                  selectedKey={catSubcatFilter}
                  allLabel={language === "en" ? "All" : language === "ar" ? "الكل" : "Tous"}
                  backLabel={language === "en" ? "Categories" : language === "ar" ? "الفئات" : "Catégories"}
                  onBack={() => { resetWidgetMapView(); setPoiCatFilter(null); setCatSubcatFilter(null); setPoiShowAll(false); }}
                  onSelectAll={() => { resetWidgetMapView(); setCatSubcatFilter(null); setPoiPillOverlay(null); }}
                  onSelect={(key) => { resetWidgetMapView(); setPoiSubcatFilter(null); setCatSubcatFilter(key); setPoiShowAll(false); setPoiPillOverlay(null); }}
                  onClose={() => setPoiPillOverlay(null)}
                />
              ) : (
                <PoiFilterChoiceOverlay
                  zClass="z-[250]"
                  title={language === "en" ? "Categories" : language === "ar" ? "الفئات" : "Catégories"}
                  items={catPillTabs.map((ft) => ({
                    key: ft.id,
                    label: translateFrontStructure(ft.name, language),
                    count: catCounts.get(ft.id) ?? 0,
                    disabled: (catCounts.get(ft.id) ?? 0) === 0,
                  }))}
                  selectedKey={poiCatFilter}
                  allLabel={language === "en" ? "All categories" : language === "ar" ? "جميع الفئات" : "Toutes les catégories"}
                  onSelectAll={() => {
                    resetWidgetMapView();
                    setPoiCatFilter(null); setCatSubcatFilter(null);
                    setPoiShowAll(false); setPoiPillOverlay(null);
                  }}
                  onSelect={(key) => {
                    // Reste dans l'overlay POI/Map du Master : on ne relance aucune recherche.
                    resetWidgetMapView();
                    setPoiSubcatFilter(null);
                    setPoiCatFilter(key);
                    setCatSubcatFilter(null);
                    setPoiShowAll(false);
                  }}
                  onClose={() => setPoiPillOverlay(null)}
                />
              )
            )}
            {(() => {
              // Widget : vue Regroupement KP / Lieu d'intérêt par défaut (comme l'Aperçu de la carte affilié)
              const widgetMembers: any[] | null =
                !isEmbedMapWidget || widgetMapView === "nearby"
                  ? null
                  : widgetMapView === "poi"
                    ? (widgetDefaultPoi ? [widgetDefaultPoi] : [])
                    : (widgetKpGroups.find(g => g.slot === (widgetMapView === "kp1" ? 1 : 2))?.members ?? []);
              const fmtDist = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
              const poiDistanceKm =
                isEmbedMapWidget && widgetMapView === "poi" && widgetDefaultPoi?.latitude && business?.latitude && business?.longitude
                  ? haversineKm(Number(business.latitude), Number(business.longitude), Number(widgetDefaultPoi.latitude), Number(widgetDefaultPoi.longitude))
                  : null;
              const widgetConnector =
                poiDistanceKm !== null && widgetDefaultPoi
                  ? {
                      from: { lat: Number(business!.latitude), lng: Number(business!.longitude) },
                      to: { lat: Number(widgetDefaultPoi.latitude), lng: Number(widgetDefaultPoi.longitude) },
                      label: fmtDist(poiDistanceKm),
                    }
                  : undefined;
              const widgetFitKm =
                widgetMembers && business?.latitude && business?.longitude
                  ? (poiDistanceKm !== null
                      ? Math.max(0.3, poiDistanceKm * 1.6)
                      : Math.max(1, widgetMembers.reduce((acc, m) => (m.latitude && m.longitude ? Math.max(acc, haversineKm(Number(business.latitude), Number(business.longitude), Number(m.latitude), Number(m.longitude))) : acc), 0) * 1.15))
                  : null;

              const overridePois: PoiMapItem[] | null = widgetMembers
                ? [
                    ...(business?.latitude && business?.longitude ? [{
                      id: `self-${business.id}`, name: business.name,
                      latitude: business.latitude, longitude: business.longitude,
                      images: business.images, city: business.city, neighborhood: business.neighborhood,
                      avgOn20: avgOn20, totalReviews: totalReviewCount,
                      markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
                    } as PoiMapItem] : []),
                    ...widgetMembers
                      .filter((m) => m.id !== business?.id && m.latitude && m.longitude)
                      .map((m) => ({
                        id: m.id, name: m.name, latitude: Number(m.latitude), longitude: Number(m.longitude),
                        images: m.images, city: m.city, neighborhood: m.neighborhood,
                        avgOn20: m.computed_rating ?? null, totalReviews: m.total_review_count ?? 0,
                      } as PoiMapItem)),
                  ]
                : null;
              return (
            <PoiGoogleMap
              pois={overridePois ? overridePois : poiMapMode === "destinations"
                ? [
                    ...(poiMasterItem ? [poiMasterItem] : []),
                    ...destinations.filter(d => d.latitude && d.longitude).map(d => ({
                      id: d.id, name: d.name_fr, latitude: d.latitude!, longitude: d.longitude!,
                      images: (d.images && d.images.length > 0) ? d.images : (d.image_url ? [d.image_url] : null),
                      city: null, neighborhood: null,
                    } as PoiMapItem)),
                  ]
                : [
                    ...(poiMasterItem ? [poiMasterItem] : []),
                    ...(displayedPoi
                      .filter(p => p.id !== poiMasterOverride?.id)
                      .map(p => ({
                        id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude,
                        images: p.images, city: p.city, neighborhood: p.neighborhood,
                        avgOn20: (p as any).computed_rating ?? null,
                        totalReviews: (p as any).total_review_count ?? 0,
                      } as PoiMapItem))),
                  ]
              }
              selectedPoiId={null}
              center={poiMasterCenter}
              distanceOrigin={poiMasterCenter ? { lat: poiMasterCenter.lat, lng: poiMasterCenter.lng } : null}
              onPoiClick={(poiId) => {
                if (poiId.startsWith("self-")) return;
                if (overridePois) {
                  setSelectedKpBusinessId(poiId);
                } else if (poiMapMode === "destinations") {
                  setSelectedDestinationId(poiId);
                } else if (poiBusinesses.length > 0 || poiOverrideRows.length > 0) {
                  poiOpenedFromMapRef.current = true;
                  setSelectedPoiBusinessId(poiId);
                } else {
                  setSelectedKpBusinessId(poiId);
                }
              }}
              fitToMarkers={(!!overridePois && widgetFitKm == null) || !!overridePool}
              centerAtBottomRatio={0.5}
              mapTypeId={poiMapTypeId}
              fitRadiusKm={overridePois ? widgetFitKm : (poiMapMode === "destinations" || overridePool ? null : poiProximityKm)}
              connector={widgetConnector}
              baseColor={mapBaseColor || undefined}
              onReady={onMapReady}
              mapTheme={mapTheme}
              userLocation={showUserMarker && userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : null}
            />
              );
            })()}
            {isEmbedMapWidget && (widgetKpGroups.length > 0 || widgetDefaultPoi) && (
              <div className="absolute bottom-6 left-3 right-3 z-[10] flex items-center justify-center gap-2 flex-wrap pointer-events-none">
                {[
                  ...widgetKpGroups.map((g) => ({ key: (g.slot === 1 ? "kp1" : "kp2") as "kp1" | "kp2", label: g.title })),
                  ...(widgetDefaultPoi ? [{ key: "poi" as const, label: widgetDefaultPoi.name as string }] : []),
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      const next = widgetMapView === p.key ? "nearby" : p.key;
                      setWidgetMapView(next);
                      if (next !== "nearby") {
                        // Reset du Pill Proximité pour un cadrage optimal des marqueurs
                        setPoiProximityKm(null);
                        setPoiSubcatFilter(null);
                        setCatSubcatFilter(null);
                        setPoiCatFilter(null);
                      }
                    }}
                    className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-colors ${
                      widgetMapView === p.key ? "bg-white text-black" : "bg-black/85 text-white hover:bg-black"
                    }`}
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="absolute bottom-16 left-3 right-3 z-[10] flex items-center justify-center gap-2 flex-wrap pointer-events-none">

              {showProxPill && (
                <div className="inline-flex rounded-full bg-white/90 backdrop-blur-sm shadow-lg ring-1 ring-black/10 p-0.5 text-[11px] font-semibold uppercase tracking-wider pointer-events-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiProximityKm != null ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {activeProx ? activeProx.label : (language === "en" ? "Nearby" : language === "ar" ? "بالقرب" : "À proximité")}
                        {poiProximityKm != null && (
                          <span className="ml-0.5 opacity-70">{afterProx.length}</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[260]">
                      {poiProximityKm != null && (
                        <DropdownMenuItem onSelect={() => { resetWidgetMapView(); setPoiProximityKm(null); }}>
                          {language === "en" ? "All distances" : language === "ar" ? "جميع المسافات" : "Toutes distances"}
                        </DropdownMenuItem>
                      )}
                      {proxOpts.map((o) => {
                        const count = proxCountsByKm[o.km] ?? 0;
                        const disabled = count === 0;
                        return (
                          <DropdownMenuItem
                            key={o.km}
                            disabled={disabled}
                            onSelect={(e) => { if (disabled) { e.preventDefault(); return; } resetWidgetMapView(); setPoiProximityKm(o.km); }}
                            className={disabled ? "opacity-40 pointer-events-none" : ""}
                          >
                            {o.label} <span className="ml-1 opacity-60">({count})</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <div className="inline-flex rounded-full bg-white/90 backdrop-blur-sm shadow-lg ring-1 ring-black/10 p-0.5 text-[11px] font-semibold uppercase tracking-wider pointer-events-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <button
                  type="button"
                  onClick={() => setPoiMapTypeId("roadmap")}
                  className={`px-3 py-1 rounded-full transition-colors ${poiMapTypeId === "roadmap" ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                >
                  {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Plan"}
                </button>
                <button
                  type="button"
                  onClick={() => setPoiMapTypeId("terrain")}
                  className={`px-3 py-1 rounded-full transition-colors ${poiMapTypeId === "terrain" ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                >
                  {language === "en" ? "Terrain" : language === "ar" ? "تضاريس" : "Relief"}
                </button>
                <button
                  type="button"
                  onClick={() => setPoiMapTypeId("satellite")}
                  className={`px-3 py-1 rounded-full transition-colors ${poiMapTypeId === "satellite" ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                >
                  {language === "en" ? "Satellite" : language === "ar" ? "قمر صناعي" : "Satellite"}
                </button>
              </div>
            </div>
          </div>
        </OverlayShell>
        );
      })()}

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
      {showSearchBar && !showPoiMapOverlay && !showDirections && !docOverlay && !showDescriptionOverlay && !showBookingOverlay && !showYoutubeOverlay && !selectedPoiBusinessId && (
        <div className={`absolute pointer-events-none ${searchOverlayActive ? "inset-0 left-0 translate-x-0 w-full max-w-none z-[90]" : "bottom-0 left-1/2 -translate-x-1/2 w-[96%] sm:w-[94%] max-w-[540px] z-[85]"}`}>
          <div className="relative w-full h-full pointer-events-auto">
            <PanelSearchBar
              onAiClick={() => window.dispatchEvent(new Event("open-ai-tab"))}
              iconVariant="black"
              onSearch={onSearch}
              onBusinessSelect={onSearchBusinessSelect}
              onHotelSearch={onHotelSearch}
              businessCity={business?.city}
              businessCategory={business?.main_category}
              businessName={business?.name}
              onOverlayChange={setSearchOverlayActive}
              onHashtagsOverlayChange={setHashtagsOverlayActive}
              hashtagsOverlayOpen={hashtagsOverlayActive}
              onAiOverlayChange={setAiOverlayActive}
              darkBackground={true}
              closeTrigger={closeTrigger}
              compact
              onSeeResults={onClose}
              videoControls={
                activeVideoOverlay ? undefined :
                (showPoiMapOverlay || showDirections) ? undefined :
                effectiveMedia?.kind === "video" && videoInfo?.type === "file" ? {
                  type: "file",
                  videoRef: videoRef as React.RefObject<HTMLVideoElement>,
                  paused: videoPaused,
                  muted: videoMuted,
                  onMutedChange: (m: boolean) => { setVideoMuted(m); setGlobalSoundOn(!m); },
                } :
                effectiveMedia?.kind === "video" && videoInfo?.type === "youtube" ? {
                  type: "youtube",
                  iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                  playing: !videoPaused,
                  muted: videoMuted,
                  onPlayingChange: (p: boolean) => setVideoPaused(!p),
                  onMutedChange: (m: boolean) => setVideoMuted(m),
                } : undefined
              }
            />
          </div>
        </div>
      )}

      {showWelcomePopup && (business as any)?.popup_image_url && (() => {
        const hasMeta = !!(popupMeta.title || popupMeta.description);
        const promoSlides = businessPromotions;
        const totalSlides = 1 + promoSlides.length;
        const safeSlide = Math.min(popupSlide, totalSlides - 1);
        const isPopupSlide = safeSlide === 0;
        const currentPromo = isPopupSlide ? null : promoSlides[safeSlide - 1];
        const promoBg = images[0] || (business as any)?.popup_image_url;
        const goPrev = () => setPopupSlide((s) => (s - 1 + totalSlides) % totalSlides);
        const goNext = () => setPopupSlide((s) => (s + 1) % totalSlides);
        const showOverlay = !isPopupSlide || hasMeta;

        const promoAmount = currentPromo ? (() => {
          if (currentPromo.promotion_type === "percentage" && currentPromo.promotion_value != null) return `-${currentPromo.promotion_value}%`;
          if (currentPromo.promotion_type === "fixed" && currentPromo.promotion_value != null) return `-${currentPromo.promotion_value} ${currentPromo.promotion_currency || "MAD"}`;
          if (currentPromo.savings_amount != null) return `-${currentPromo.savings_amount} ${currentPromo.promotion_currency || "MAD"}`;
          return null;
        })() : null;

        return (
        <div
          className="absolute inset-0 z-[150] flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowWelcomePopup(false)}
        >
          <div className={`relative flex items-center justify-center w-full h-full max-h-full px-1 sm:px-16 ${isPopupSlide && !hasMeta ? "max-w-3xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl" : "max-w-lg md:max-w-xl"} owm-popup-appear`} onClick={(e) => e.stopPropagation()}>

            {totalSlides > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 h-11 w-10 rounded-l-md rounded-r-none bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg z-20 active:scale-95 transition-all border border-r-0 border-white/10 backdrop-blur-sm"
                aria-label="Précédent"
              >
                <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
              </button>
            )}

            <div
              className={`relative rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
                isPopupSlide && !hasMeta
                  ? "max-w-full max-h-full"
                  : "w-full h-auto max-w-md max-h-full bg-cover bg-no-repeat bg-center"
              }`}
              style={isPopupSlide && !hasMeta ? undefined : { backgroundImage: `url(${isPopupSlide ? (business as any).popup_image_url : promoBg})` }}
            >

              {/* Image popup sans texte associé : affichée en entier (object-contain),
                  jamais recadrée, quel que soit son ratio. */}
              {isPopupSlide && !hasMeta && (
                <img
                  src={(business as any).popup_image_url}
                  alt={business?.name || ""}
                  className="block max-w-full max-h-[calc(100vh-2rem)] w-auto h-auto object-contain"
                />
              )}

              {showOverlay && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}

              {isPopupSlide && hasMeta && (
                <div className="relative pt-12 px-6 pb-6 text-white overflow-y-auto flex-1 min-h-0">

                  {popupMeta.title && (
                    <h3 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 pr-12" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {popupMeta.title}
                    </h3>
                  )}
                  {popupMeta.description && (
                    <div
                      className="text-base md:text-lg leading-relaxed text-white font-medium prose prose-invert max-w-none [&_*]:!text-white [&_a]:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li_p]:my-0 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
                      dangerouslySetInnerHTML={{ __html: popupMeta.description }}
                    />
                  )}
                </div>
              )}

              {!isPopupSlide && currentPromo && (
                <div className="relative pt-20 px-6 pb-6 text-white flex-1 overflow-y-auto min-h-0">
                  {promoAmount && (
                    <div
                      className="absolute top-3 left-6 flex items-center gap-2 justify-center z-10 text-white bg-black/65 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl min-w-max"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      <span className="text-white font-black text-[11px] sm:text-[12px] tracking-widest uppercase leading-none whitespace-nowrap">{language === 'en' ? 'save' : language === 'ar' ? 'وفّر' : 'économisez'}</span>
                      <span className="text-[#D4AF37] font-black text-xl sm:text-2xl leading-none whitespace-nowrap">{promoAmount}</span>
                    </div>
                  )}
                  <h3 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {currentPromo.title}
                  </h3>
                  {currentPromo.promotion_message && (
                    <div
                      className="prose prose-invert prose-base max-w-none text-base md:text-lg leading-relaxed text-white font-medium prose-headings:text-white prose-headings:font-bold prose-strong:text-white prose-a:text-[#C04F17] prose-a:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li::marker]:!text-white [&_img]:rounded-md [&_img]:max-w-full [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_p]:!text-white [&_span]:!text-white [&_strong]:!text-white [&_a]:!text-[#C04F17]"
                      dangerouslySetInnerHTML={{ __html: currentPromo.promotion_message }}
                    />
                  )}
                </div>
              )}

              <button
                onClick={() => setShowWelcomePopup(false)}
                className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white hover:bg-neutral-100 text-black flex items-center justify-center transition-colors shadow-lg z-10"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>

              {totalSlides > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={(e) => { e.stopPropagation(); setPopupSlide(i); }}
                      className={`h-1.5 rounded-full transition-all ${i === safeSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {totalSlides > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 h-11 w-10 rounded-r-md rounded-l-none bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg z-20 active:scale-95 transition-all border border-l-0 border-white/10 backdrop-blur-sm"
                aria-label="Suivant"
              >
                <ChevronRight className="h-6 w-6 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
        );
      })()}

      {showPromosPopup && businessPromotions.length > 0 && (() => {
        const promoSlides = businessPromotions;
        const totalSlides = promoSlides.length;
        const safeSlide = Math.min(popupSlide, totalSlides - 1);
        const currentPromo = promoSlides[safeSlide];
        const promoBg = images[0];
        const goPrev = () => setPopupSlide((s) => (s - 1 + totalSlides) % totalSlides);
        const goNext = () => setPopupSlide((s) => (s + 1) % totalSlides);

        const promoAmount = (() => {
          if (currentPromo.promotion_type === "percentage" && currentPromo.promotion_value != null) return `-${currentPromo.promotion_value}%`;
          if (currentPromo.promotion_type === "fixed" && currentPromo.promotion_value != null) return `-${currentPromo.promotion_value} ${currentPromo.promotion_currency || "MAD"}`;
          if (currentPromo.savings_amount != null) return `-${currentPromo.savings_amount} ${currentPromo.promotion_currency || "MAD"}`;
          return null;
        })();

        return (
        <div
          className="absolute inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowPromosPopup(false)}
        >
          <div className="relative flex items-center justify-center w-full max-w-lg md:max-w-xl px-10 sm:px-16 owm-popup-appear" onClick={(e) => e.stopPropagation()}>
            {totalSlides > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 h-11 w-10 rounded-l-md rounded-r-none bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg z-20 active:scale-95 transition-all border border-r-0 border-white/10 backdrop-blur-sm"
                aria-label="Précédent"
              >
                <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
              </button>
            )}

            <div
              key={`promo-slide-${safeSlide}`}
              className="relative w-full max-w-md max-h-[90vh] sm:max-h-[84vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-cover bg-no-repeat bg-center h-auto btn-flash-auto"
              style={{ backgroundImage: promoBg ? `url(${promoBg})` : undefined, backgroundColor: promoBg ? undefined : '#1a1a1a' }}
            >

              <div className="absolute inset-0 bg-black/55 pointer-events-none" />

              {(() => {
                const hasMessage = !!currentPromo.promotion_message && currentPromo.promotion_message.replace(/<[^>]*>/g, '').trim() !== "";
                return (
                  <div className={`relative pt-28 px-6 pb-6 text-white flex-1 flex flex-col overflow-y-auto min-h-0 ${!hasMessage ? 'justify-center' : ''}`}>
                    <div className={`flex items-start gap-3 ${!hasMessage ? 'justify-center mb-0' : 'justify-between mb-4'}`}>
                      <h3 
                        className={`text-3xl md:text-4xl font-extrabold ${!hasMessage ? 'text-center leading-[1.6] md:leading-[1.8]' : 'leading-tight'}`} 
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {currentPromo.title}
                      </h3>
                    </div>
                    {hasMessage && (
                      <div
                        className="prose prose-invert prose-base max-w-none text-base md:text-lg leading-relaxed text-white font-medium prose-headings:text-white prose-headings:font-bold prose-strong:text-white prose-a:text-[#C04F17] prose-a:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li::marker]:!text-white [&_img]:rounded-md [&_img]:max-w-full [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_p]:!text-white [&_span]:!text-white [&_strong]:!text-white [&_a]:!text-[#C04F17]"
                        dangerouslySetInnerHTML={{ __html: currentPromo.promotion_message }}
                      />
                    )}
                  </div>
                );
              })()}

              {promoAmount && (
                <div 
                  className="absolute top-3 left-6 flex items-center gap-2 justify-center z-10 text-white bg-black/65 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl min-w-max"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span className="text-white font-black text-[11px] sm:text-[12px] tracking-widest uppercase leading-none whitespace-nowrap">{language === 'en' ? 'save' : language === 'ar' ? 'وفّر' : 'économisez'}</span>
                  <span className="text-[#D4AF37] font-black text-xl sm:text-2xl leading-none whitespace-nowrap">{promoAmount}</span>
                </div>
              )}

              <button
                onClick={() => setShowPromosPopup(false)}
                className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white hover:bg-neutral-100 text-black flex items-center justify-center transition-colors shadow-lg z-10"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>

              {totalSlides > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={(e) => { e.stopPropagation(); setPopupSlide(i); }}
                      className={`h-1.5 rounded-full transition-all ${i === safeSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {totalSlides > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 h-11 w-10 rounded-r-md rounded-l-none bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg z-20 active:scale-95 transition-all border border-l-0 border-white/10 backdrop-blur-sm"
                aria-label="Suivant"
              >
                <ChevronRight className="h-6 w-6 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
        );
      })()}

      {hashtagsOverlayActive && (
        <OverlayShell zClass="z-[92]" coverToolbar={false}>
          <PanelHashtagsOverlay open={hashtagsOverlayActive} onClose={() => setHashtagsOverlayActive(false)} />
        </OverlayShell>
      )}

      {/* LocationPickerDialog mounted globally on SearchPage — removed here to avoid double overlay */}


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

/**
 * Outer wrapper: delegates to VideoSlidePanel when called with a video entry
 * (videoUrl prop provided, even null), otherwise renders the full business panel.
 * This is the unified entry point replacing the legacy SlidePanelHome.
 */
const BookOnlineSlidePanel = (props: BookOnlineSlidePanelProps) => {
  if (props.videoUrl !== undefined) {
    return (
      <VideoSlidePanel
        open={props.open ?? true}
        onClose={props.onClose}
        videoUrl={props.videoUrl ?? null}
        videoId={props.videoId ?? null}
        businessName={props.businessName ?? props.owner?.name ?? ""}
        pageBusinessName={props.pageBusinessName ?? null}
        pageBusinessId={props.pageBusinessId ?? null}
        isGeneric={!!props.isGeneric}
        currentTime={props.currentTime ?? 0}
        onTimeUpdate={props.onTimeUpdate ?? (() => {})}
        onPrev={props.onPrev ?? props.onPrevBusiness}
        onNext={props.onNext ?? props.onNextBusiness}
        hasPrev={props.hasPrev ?? props.hasPrevBusiness}
        hasNext={props.hasNext ?? props.hasNextBusiness}
        owner={props.owner ?? null}
        social={props.social as any}
        showSocialBadge={props.showSocialBadge}
        description={props.description ?? null}
        videoName={props.videoName ?? null}
        headerVideoTitle={props.headerVideoTitle ?? null}
        agendaCity={props.agendaCity ?? null}
        eventId={props.eventId ?? null}
        returnContext={props.returnContext ?? null}
        compactBusinessHeader={props.compactBusinessHeader}
        hideDirections={props.hideDirections}
        hideLeftCtas={props.hideLeftCtas}
        manualCardLabel={props.manualCardLabel}
        price={props.price}
      />
    );
  }
  if (!props.businessId) return null;
  return <BookOnlineSlidePanelInner {...props} businessId={props.businessId} />;
};

export default BookOnlineSlidePanel;
