import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import MediaViewerInfo from "@/components/slidepanel/MediaViewerInfo";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";

import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, ChevronUp, ChevronDown, Youtube, MapPin, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";
import { createPortal } from "react-dom";
import { getVideoEmbed } from "@/lib/videoEmbed";
import PanelSearchBar from "@/components/PanelSearchBar";
import VideoControls from "@/components/VideoControls";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { LazyDirectionsOverlay } from "@/components/overlays/LazyOverlays";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { buildOgShareUrl } from "@/lib/businessUrl";
import { formatEventDateRange, formatDaysOfWeek, formatTimeRange } from "@/lib/homeHelpers";
import { buildKpSearchUrl } from "@/lib/buildKpSearchUrl";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import { useVideoView } from "@/hooks/useVideoView";
import BusinessHeader from "@/components/slidepanel/BusinessHeader";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import { Phone, Heart, Bookmark } from "lucide-react";
import { useBookmark } from "@/hooks/useBookmark";
import { useVideoLike } from "@/hooks/useVideoLike";
import OverlayShell from "@/components/overlays/OverlayShell";
import { groupImagesWithHeadings } from "@/lib/groupImagesWithHeadings";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import type { YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import type { BookOnlineBusiness } from "@/hooks/useBookOnlineData";
import VideoSocialBadge from "@/components/slidepanel/VideoSocialBadge";

interface SocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

interface VideoSlidePanelProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string | null;
  videoId: string | null;
  businessName: string;
  /** Nom de la fiche/document consulté (ex: POI), distinct du owner quand la vidéo a un linked_business_id */
  pageBusinessName?: string | null;
  /** Id du business "racine" du document (pour fallback description) */
  pageBusinessId?: string | null;
  isGeneric: boolean;
  currentTime: number;
  onTimeUpdate: (t: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  owner?: { id: string; name: string; logo_url: string | null; logo_bg?: string | null } | null;
  social?: SocialInfo | null;
  showSocialBadge?: boolean;
  description?: string | null;
  /** Titre/nom de la vidéo à afficher en haut (comme sur la vignette) */
  videoName?: string | null;
  /** Si défini, remplace le nom + adresse dans le rectangle BusinessHeader par ce titre (et masque la caption videoName en dessous) */
  headerVideoTitle?: string | null;
  /** When set, displays the list of events for this city (Agenda card) */
  agendaCity?: string | null;
  /** When set, displays CTAs for the event's linked business (via event_businesses) */
  eventId?: string | null;
  /** Serialized Test page context used to restore the previous result state after closing an establishment panel */
  returnContext?: string | null;
  /** Compact business header (background hugs the name, centered) */
  compactBusinessHeader?: boolean;
  /** Whether to hide directions button (Itinéraire) */
  hideDirections?: boolean;
  /** Hide the entire left-side CTAs column (e.g. YouTube button) */
  hideLeftCtas?: boolean;
  /** Editorial label coming from the thumbnail manualCard badge (e.g. "Offre du moment") */
  manualCardLabel?: string | null;
  /** Price of the item for pricing badge */
  price?: string | null;
  /** Layout "feed" : pas de badge copyright, pas d'entête business, pas de chevrons (swipe vertical), nom+description au-dessus de la barre de navigation */
  feedLayout?: boolean;
}


interface AgendaEvent {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  hook: string | null;
  logo_url: string | null;
  business: {
    id: string;
    slug: string | null;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    city: string | null;
    logo_url: string | null;
    neighborhood?: string | null;
    whatsapp?: string | null;
    logo_bg?: string | null;
    youtube_url?: string | null;
  } | null;
}

const formatDateRange = (start: string | null, end: string | null) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (start && end && start !== end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return "Date à confirmer";
};

const VideoSlidePanel = ({
  open,
  onClose,
  videoUrl,
  videoId,
  businessName,
  pageBusinessName,
  pageBusinessId,
  isGeneric,
  currentTime,
  onTimeUpdate,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  owner,
  social,
  showSocialBadge = false,
  description,
  videoName,
  headerVideoTitle,
  agendaCity,
  eventId,
  returnContext,
  compactBusinessHeader = false,
  hideDirections = false,
  hideLeftCtas = false,
  manualCardLabel = null,
  price = null,
  feedLayout = false,
}: VideoSlidePanelProps) => {

  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  // Chrome navigateur en noir tant que le panneau plein écran est ouvert (supprime les bandes beiges iOS)
  useDarkBrowserChrome(true);


  // Analytics: overlay_open lorsque le panel s'ouvre
  useEffect(() => {
    if (!open) return;
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("overlay_open", { overlay: "video", business: businessName, is_generic: !!isGeneric })
    );
  }, [open, businessName, isGeneric]);
  const panelRef = useRef<HTMLDivElement>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeHandled = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [directionsBusiness, setDirectionsBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [hashtagsOverlayOpen, setHashtagsOverlayOpen] = useState(false);
  const [aiOverlayOpen, setAiOverlayOpen] = useState(false);
  const [eventBusiness, setEventBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [businessDescription, setBusinessDescription] = useState<string | null>(null);
  const [, forceRender] = useState(0);
  useEffect(() => { if (open) forceRender((n) => n + 1); }, [open]);

  // Hide page-level scrollbar when this slide panel is open (all viewports)
  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('hide-scrollbar-panel-open');
    } else {
      document.documentElement.classList.remove('hide-scrollbar-panel-open');
    }
    return () => { document.documentElement.classList.remove('hide-scrollbar-panel-open'); };
  }, [open]);

  // Description source (video text is ALWAYS prioritary):
  // - If the video has its own description, use it.
  // - Otherwise, fall back to the consulted fiche (pageBusinessId) or the owner's description.
  useEffect(() => {
    if (!open) { setBusinessDescription(null); return; }
    if (description && description.trim()) {
      setBusinessDescription(null);
      return;
    }
    const targetId = pageBusinessId || owner?.id;
    if (!targetId) { setBusinessDescription(null); return; }
    let cancelled = false;
    (supabase as any)
      .from("businesses")
      .select("description, description_fr, description_en, description_ar")
      .eq("id", targetId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled) return;
        const d: any = data || {};
        const localized = language === "ar" ? (d.description_ar || d.description_fr || d.description)
          : language === "en" ? (d.description_en || d.description_fr || d.description)
          : (d.description_fr || d.description);
        setBusinessDescription(localized ?? null);
      });
    return () => { cancelled = true; };
  }, [open, owner?.id, pageBusinessId, description, language]);

  const [descOverlayOpen, setDescOverlayOpen] = useState(false);
  useEffect(() => { if (!open) setDescOverlayOpen(false); }, [open]);
  // Transition morphée : la barre info viewer sert de « graine » à l'overlay Full Description
  // (identique à BookOnlineSlidePanel).
  const [descMorphRect, setDescMorphRect] = useState<DOMRect | null>(null);
  const [descMorphDone, setDescMorphDone] = useState(false);
  const startDescMorph = useCallback((rect?: DOMRect) => {
    setDescMorphRect(rect ?? null);
    setDescMorphDone(false);
    setDescOverlayOpen(true);
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

  const [ownerBusiness, setOwnerBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [eventInfo, setEventInfo] = useState<{ name: string; logo_url: string | null; description: string | null; start_date: string | null; end_date: string | null; days_of_week: string[] | null; start_time: string | null; end_time: string | null } | null>(null);
  const [poiOverlayBusinessId, setPoiOverlayBusinessId] = useState<string | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const geo = useGeolocation();
  useEffect(() => {
    const h = () => setLocationDialogOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);
  useEffect(() => { if (!open) setPoiOverlayBusinessId(null); }, [open]);

  const effectiveDescription = (description && description.trim())
    ? description
    : (eventId && eventInfo?.description && eventInfo.description.trim())
      ? eventInfo.description
      : businessDescription;

  // Resolve a business for the CTA bar:
  // - If `eventId` is set, take the first linked business via event_businesses (eventBusiness).
  // - Otherwise, fall back to the video owner (owner.id is a business id for non-generic videos).
  useEffect(() => {
    if (!open || !eventId) {
      setEventBusiness(null);
      setEventInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: ebRows }, { data: evRow }] = await Promise.all([
        (supabase as any)
          .from("event_businesses")
          .select("business_id, created_at")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true })
          .limit(1),
        (supabase as any)
          .from("events")
          .select("name, logo_url, description, start_date, end_date, days_of_week, start_time, end_time")
          .eq("id", eventId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setEventInfo(evRow ? {
        name: (evRow as any).name,
        logo_url: (evRow as any).logo_url,
        description: (evRow as any).description ?? null,
        start_date: (evRow as any).start_date ?? null,
        end_date: (evRow as any).end_date ?? null,
        days_of_week: (evRow as any).days_of_week ?? null,
        start_time: (evRow as any).start_time ?? null,
        end_time: (evRow as any).end_time ?? null,
      } : null);
      const bizId = ((ebRows as any[]) || [])[0]?.business_id;
      if (!bizId) { setEventBusiness(null); return; }
      const { data: bizRow } = await supabase
        .from("businesses")
        .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg, is_poi, youtube_url")
        .eq("id", bizId)
        .maybeSingle();
      if (cancelled) return;
      setEventBusiness((bizRow as any) || null);
    })();
    return () => { cancelled = true; };
  }, [open, eventId]);

  // Fallback owner-based business lookup (used when no eventId is provided)
  useEffect(() => {
    if (!open || eventId || isGeneric || !owner?.id) {
      setOwnerBusiness(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: bizRow } = await supabase
        .from("businesses")
        .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg, is_poi, youtube_url")
        .eq("id", owner.id)
        .maybeSingle();
      if (cancelled) return;
      setOwnerBusiness((bizRow as any) || null);
    })();
    return () => { cancelled = true; };
  }, [open, eventId, isGeneric, owner?.id]);

  // Page business lookup: when pageBusinessId is provided, load the consulted
  // fiche so all CTAs (En savoir +, Itinéraire, WhatsApp, partage) target it
  // instead of the owner.
  const [pageBusiness, setPageBusiness] = useState<AgendaEvent["business"] | null>(null);
  useEffect(() => {
    if (!open || eventId || isGeneric || !pageBusinessId) {
      setPageBusiness(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: bizRow } = await supabase
        .from("businesses")
        .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg, is_poi, youtube_url")
        .eq("id", pageBusinessId)
        .maybeSingle();
      if (cancelled) return;
      setPageBusiness((bizRow as any) || null);
    })();
    return () => { cancelled = true; };
  }, [open, eventId, isGeneric, pageBusinessId]);

  const ctaBusiness = eventBusiness || pageBusiness || ownerBusiness;
  // Feed layout : titre + teaser de la barre info (description vidéo, sinon établissement lié)
  const feedInfoTitle = (description && description.trim())
    ? (headerVideoTitle || videoName || ctaBusiness?.name || businessName || "")
    : (ctaBusiness?.name || businessName || "");
  const feedInfoTeaser = (effectiveDescription || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;

  // Navigation verticale à la molette / trackpad (desktop) — même effet que le swipe.
  const wheelNav = useRef({ enabled: false, onPrev, onNext, hasPrev, hasNext });
  wheelNav.current = {
    enabled: !descOverlayOpen && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && !agendaCity,
    onPrev, onNext, hasPrev, hasNext,
  };
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    let acc = 0;
    let lockedUntil = 0;
    let resetTimer: number | undefined;
    const onWheel = (e: WheelEvent) => {
      const s = wheelNav.current;
      if (!s.enabled) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      const now = Date.now();
      if (now < lockedUntil) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      acc += dy;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { acc = 0; }, 200);
      if (Math.abs(acc) < 60) return;
      const forward = acc > 0;
      acc = 0;
      lockedUntil = now + 550;
      if (forward && s.hasNext) s.onNext?.();
      else if (!forward && s.hasPrev) s.onPrev?.();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); window.clearTimeout(resetTimer); };
  }, [open]);


  const { isBookmarked, isLoggedIn: isBookmarkLoggedIn, toggle: toggleBookmark } = useBookmark(ctaBusiness?.id ? String(ctaBusiness.id) : undefined);
  const videoLikeSource = isGeneric ? "generic" as const : "business" as const;
  const videoLikeId = videoId || null;
  const { isLiked: isVideoLiked, count: videoLikeCount, isLoggedIn: isVideoLikeLoggedIn, toggle: toggleVideoLike } = useVideoLike(videoLikeId, videoLikeSource);
  const [likeBurst, setLikeBurst] = useState(0);
  const ctaShareUrl = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (ctaBusiness?.slug && (params.get("openChannel") === String(ctaBusiness.id) || params.get("tab") === "youtube")) {
        return `https://oneworldmorocco.com/y/${ctaBusiness.slug}`;
      }
    } catch {/* noop */}
    if (ctaBusiness?.slug) return buildOgShareUrl(ctaBusiness.slug);
    // Fallback : reconstruire l'URL canonique sur oneworldmorocco.com (jamais l'host supabase de preview)
    try {
      const { pathname, search } = window.location;
      return `https://oneworldmorocco.com${pathname}${search}`;
    } catch {
      return "https://oneworldmorocco.com/";
    }
  })();
  const normalizeHeaderName = (value: string | null | undefined) =>
    (value || "").trim().toLocaleLowerCase("fr-FR");
  const shouldShowOwnerLogoInHeader =
    !!owner?.logo_url &&
    normalizeHeaderName(businessName) === normalizeHeaderName(owner.name);

  // /test return flow removed — no-op kept to preserve call sites.
  const storeReturnToTest = () => {};


  useEffect(() => {
    if (!open || !agendaCity) {
      setAgendaEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", agendaCity)
        .maybeSingle();
      if (cancelled || !cityRow?.id) return;
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await (supabase as any)
        .from("events")
        .select("id, name, start_date, end_date, hook, logo_url")
        .eq("city_id", cityRow.id)
        .or(`end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}),and(start_date.is.null,end_date.is.null)`)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("start_date", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      const rows = (data as any[]) || [];
      // Always use event_businesses (take first linked business per event)
      const bizByEvent = new Map<string, string>();
      if (rows.length > 0) {
        const { data: ebRows } = await (supabase as any)
          .from("event_businesses")
          .select("event_id, business_id, created_at")
          .in("event_id", rows.map((r) => r.id))
          .order("created_at", { ascending: true });
        ((ebRows as any[]) || []).forEach((eb) => {
          if (!bizByEvent.has(eb.event_id)) bizByEvent.set(eb.event_id, eb.business_id);
        });
      }
      const bizIds = Array.from(new Set(Array.from(bizByEvent.values())));
      const bizMap = new Map<string, AgendaEvent["business"]>();
      if (bizIds.length > 0) {
        const { data: bizRows } = await supabase
          .from("businesses")
          .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg, is_poi, youtube_url")
          .in("id", bizIds);
        ((bizRows as any[]) || []).forEach((b) => bizMap.set(b.id, b as any));
      }
      if (cancelled) return;
      setAgendaEvents(
        rows.map((r) => {
          const bizId = bizByEvent.get(r.id) || null;
          return {
            id: r.id,
            name: r.name,
            start_date: r.start_date,
            end_date: r.end_date,
            hook: r.hook,
            logo_url: r.logo_url,
            business: bizId ? bizMap.get(bizId) || null : null,
          };
        }),
      );
    })();
    return () => { cancelled = true; };
  }, [open, agendaCity]);

  const { soundOn, setSoundOn } = useVideoSoundPreference();

  // Log a view whenever a video becomes active in the panel.
  // Generic videos have an id; for business "internal" videos we fall back to the URL.
  useVideoView(
    open ? (videoId || videoUrl || null) : null,
    isGeneric ? "generic" : "business",
    { autoLog: true },
  );
  const [filePaused, setFilePaused] = useState(true);
  const [fileMuted, setFileMuted] = useState(!soundOn);
  const [ytPlaying, setYtPlaying] = useState(true);
  const [ytMuted, setYtMuted] = useState(!soundOn);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const [toolbarMounted, setToolbarMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setToolbarMounted(prev => !prev);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [open, videoId]);
  useEffect(() => { if (!open) { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); } }, [open]);
  useEffect(() => { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); }, [pageBusinessId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Sync file video state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Apply the user's persisted sound preference to this new video element
    v.muted = !soundOn;
    const tryPlay = v.play();
    if (tryPlay && typeof tryPlay.catch === "function") {
      tryPlay.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
    const onPlay = () => setFilePaused(false);
    const onPause = () => setFilePaused(true);
    const onVol = () => {
      setFileMuted(v.muted);
      // Persist user's choice so subsequent videos respect it
      setSoundOn(!v.muted);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    setFilePaused(v.paused);
    setFileMuted(v.muted);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, [videoUrl, videoId, soundOn, setSoundOn]);

  // L'URL d'embed force toujours mute=1 pour que l'autoplay démarre.
  // Le toggle son reflète cet état de départ à chaque changement de vidéo.
  useEffect(() => {
    if (!open) return;
    setYtMuted(true);
    setYtPlaying(true);
  }, [videoUrl, videoId, open]);


  // Sync YouTube iframe state with the real player (onStateChange + volume)
  // + démutage après démarrage : l'URL d'embed reste toujours mute=1 (sinon
  // l'autoplay est bloqué et la vidéo ne démarre jamais), on rétablit le son
  // via l'API postMessage dès que le player passe en "playing".
  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let unmuteApplied = false;

    const subscribe = () => {
      const w = iframe.contentWindow;
      if (!w) return;
      w.postMessage(JSON.stringify({ event: "listening" }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "*");
    };

    const applyUnmute = () => {
      if (unmuteApplied || !soundOn) return;
      const w = iframe.contentWindow;
      if (!w) return;
      unmuteApplied = true;
      w.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
    };

    // Subscribe once iframe is loaded, and re-subscribe on src change
    iframe.addEventListener("load", subscribe);
    // In case it's already loaded
    subscribe();

    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "string") return;
      if (!e.origin.includes("youtube.com") && !e.origin.includes("youtube-nocookie.com")) return;
      try {
        const data = JSON.parse(e.data);
        const info = data?.info;
        // onStateChange: info is a number (playerState)
        // 1 = playing, 2 = paused, 3 = buffering, 0 = ended, -1 = unstarted
        if (data?.event === "onStateChange" && typeof info === "number") {
          if (info === 1) { setYtPlaying(true); applyUnmute(); }
          else if (info === 2 || info === 0 || info === -1) setYtPlaying(false);
        }
        // infoDelivery: info is an object with playerState/muted
        if (info && typeof info === "object") {
          if (typeof info.playerState === "number") {
            if (info.playerState === 1) { setYtPlaying(true); applyUnmute(); }
            else if (info.playerState === 2 || info.playerState === 0) setYtPlaying(false);
          }
          if (typeof info.muted === "boolean") {
            setYtMuted(info.muted);
            // Ne pas écraser la préférence son avec le mute technique de départ
            if (unmuteApplied || !soundOn) setSoundOn(!info.muted);
          }
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);

    return () => {
      iframe.removeEventListener("load", subscribe);
      window.removeEventListener("message", onMessage);
    };
  }, [open, videoUrl, videoId, soundOn, setSoundOn]);



  if (!open || !videoUrl) return null;

  const visibleSocial = (showSocialBadge || feedLayout) ? social : null;
  const swipeNavigationEnabled = isMobile && !descOverlayOpen && !searchOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && !agendaCity;

  const resetSwipe = () => {
    swipeStartY.current = null;
    swipeStartX.current = null;
    swipeHandled.current = false;
  };

  const embed = getVideoEmbed(videoUrl, window.location.origin, { autoplay: true, defaultSoundOn: soundOn });
  let embedUrl = embed.embedUrl;
  if (embed.type === "youtube") {
    const ytId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
    embedUrl = embedUrl.replace("loop=0", `loop=1&playlist=${ytId}`);
    // On garde toujours mute=1 dans l'URL : un autoplay non muté est bloqué par
    // Chrome/Safari et le lecteur reste alors en "unstarted" (iframe non cliquable).
    // Le démutage est fait après démarrage via postMessage (effet ci-dessus).
  } else if (embed.type === "vimeo") {

    embedUrl = embedUrl.replace("loop=0", "loop=1");
    if (soundOn && !isMobile) embedUrl = embedUrl.replace("muted=1", "muted=0");
  } else if (embed.type === "bunny") {
    embedUrl = embedUrl.replace("loop=false", "loop=true");
  }

  return createPortal(
    <div className="fixed inset-y-0 right-0 w-full lg:w-1/2 z-[220] bg-black h-[100dvh]"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full bg-black lg:bg-background border-l border-border shadow-2xl overflow-hidden"
        style={swipeNavigationEnabled ? { touchAction: "none", overscrollBehavior: "contain" } : undefined}
        onTouchStart={swipeNavigationEnabled ? (e) => {
          if (e.touches.length !== 1) return;
          swipeStartY.current = e.touches[0].clientY;
          swipeStartX.current = e.touches[0].clientX;
          swipeHandled.current = false;
        } : undefined}
        onTouchMove={swipeNavigationEnabled ? (e) => {
          if (swipeHandled.current || swipeStartY.current === null || swipeStartX.current === null) return;
          const dy = e.touches[0].clientY - swipeStartY.current;
          const dx = e.touches[0].clientX - swipeStartX.current;
          // Prevent native scroll once the gesture is clearly vertical
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.5) {
            e.preventDefault();
          }
        } : undefined}
        onTouchEnd={swipeNavigationEnabled ? (e) => {
          if (swipeStartY.current !== null && swipeStartX.current !== null) {
            const t = e.changedTouches[0];
            const dy = t.clientY - swipeStartY.current;
            const dx = t.clientX - swipeStartX.current;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            // Aligné sur BookOnlineSlidePanel : seuil 60px, ratio 1.5, swipe up = next
            if (absY > 60 && absY > absX * 1.5) {
              if (dy < 0 && hasNext) onNext?.();
              else if (dy > 0 && hasPrev) onPrev?.();
            }
          }
          resetSwipe();
        } : undefined}
        onTouchCancel={swipeNavigationEnabled ? resetSwipe : undefined}

      >
        {/* Top toolbar : SlidePanelHeader (même base que SlidePanel de Search) */}
        {!descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !compactBusinessHeader && (
          <SlidePanelHeader
            onClose={onClose}
            alwaysDark
            toolbarLeftId="slide-panel-home-toolbar-left"
            toolbarCenterId="slide-panel-home-toolbar-center"
            toolbarRightId="slide-panel-home-toolbar-right"
            closeButtonContainerClassName={shouldShowOwnerLogoInHeader && ctaBusiness ? "md:ml-10" : ""}
          />
        )}
        {compactBusinessHeader && !searchOverlayOpen && !descOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
              className="absolute left-4 top-3 z-[100] w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors shadow-lg pointer-events-auto"
              aria-label="Fermer"
            >
              <X className="h-5 w-5 text-black" />
            </button>
            <div className="absolute right-4 top-3 z-[100] flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white hover:bg-white/90 transition-colors shadow-lg"
                aria-label="Le Club OWM"
              >
                <Heart className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
              </button>
              <ShareButton
                title={ctaBusiness?.name || businessName}
                variant="dark"
                className="shrink-0"
                shareUrl={ctaShareUrl}
              />
            </div>
          </>
        )}
        {!descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !compactBusinessHeader && typeof document !== "undefined" && (() => {
          const _trigger = toolbarMounted;
          const rightEl = document.getElementById("slide-panel-home-toolbar-right");
          return (
            <>

              {rightEl && createPortal(
                <div className="flex items-center gap-2 shrink-0">
                  {/* Like vidéo */}
                  <div className="relative flex flex-col items-center">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!isVideoLikeLoggedIn) {
                          window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
                          return;
                        }
                        if (!videoLikeId) return;
                        setLikeBurst((b) => b + 1);
                        await toggleVideoLike();
                      }}
                      disabled={isVideoLikeLoggedIn && !videoLikeId}
                      style={{ backgroundColor: "#F1F1F1" }}
                      className={`relative h-9 w-9 flex items-center justify-center rounded-full shadow-2xl transition-all shrink-0 glass-toolbar-btn ${
                        isVideoLikeLoggedIn && !videoLikeId ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-90"
                      }`}
                      title={!isVideoLikeLoggedIn ? "Connectez-vous pour liker" : videoLikeId ? (isVideoLiked ? "Retirer le like" : "Liker") : "Indisponible"}
                      aria-label="Liker la vidéo"
                    >
                      <Heart
                        key={`h-${likeBurst}`}
                        className={`h-4 w-4 transition-transform ${isVideoLiked ? "text-red-500 animate-[heart-pop_0.4s_ease-out]" : "text-black"}`}
                        fill={isVideoLiked ? "currentColor" : "none"}
                        strokeWidth={2.5}
                      />
                      {likeBurst > 0 && isVideoLiked && (
                        <Heart
                          key={`fly-${likeBurst}`}
                          className="pointer-events-none absolute h-4 w-4 text-red-500 animate-[heart-fly_0.8s_ease-out_forwards]"
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      )}
                    </button>
                    {videoLikeCount > 0 && (
                      <span
                        className="absolute -bottom-4 text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {videoLikeCount}
                      </span>
                    )}
                  </div>
                  {/* Bookmark business */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isBookmarkLoggedIn) {
                        window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
                        return;
                      }
                      if (!ctaBusiness?.id) return;
                      await toggleBookmark();
                    }}
                    disabled={isBookmarkLoggedIn && !ctaBusiness?.id}
                    style={{ backgroundColor: "#F1F1F1" }}
                    className={`h-9 w-9 flex items-center justify-center rounded-full text-black shadow-2xl transition-opacity shrink-0 glass-toolbar-btn ${
                      isBookmarkLoggedIn && !ctaBusiness?.id ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                    }`}
                    title={isBookmarked ? "Retirer des favoris" : "Le Club OWM"}
                    aria-label="Le Club OWM"
                  >
                    <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={isBookmarked ? "currentColor" : "none"} />
                  </button>
                  {/* Share */}
                  <ShareButton
                    title={ctaBusiness?.name || businessName}
                    variant="dark"
                    className="shrink-0 [&>button]:!bg-[#F1F1F1] [&>button]:!text-black"
                    buttonClassName="glass-toolbar-btn"
                    shareUrl={ctaShareUrl}
                  />
                </div>,
                rightEl
              )}
            </>
          );
        })()}

        {/* BusinessHeader: Logo + Nom + Ville + Quartier + Adresse */}
        {!feedLayout && !descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && ctaBusiness && (
          <div className="absolute top-16 md:top-14 lg:top-16 left-2 right-2 z-[65] pointer-events-none">
            <BusinessHeader
              business={{
                ...ctaBusiness,
                name: headerVideoTitle || businessName || ctaBusiness.name,
                ...(headerVideoTitle ? { city: null, neighborhood: null, address: null } : {}),
                logo_url: shouldShowOwnerLogoInHeader && !headerVideoTitle ? owner.logo_url : null,
                logo_bg: shouldShowOwnerLogoInHeader && !headerVideoTitle ? owner.logo_bg ?? null : null,
              }}
              businessId={ctaBusiness.id}
              hookText={null}
              showHook={false}
              hasReviewsCard={false}
              avgOn20={null}
              totalReviewCount={0}
              onOpenReviews={() => {}}
              compact={compactBusinessHeader}
            />

          </div>
        )}

        {!descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && ((!headerVideoTitle && (videoName || manualCardLabel)) || price !== undefined && price !== null) && !(isGeneric && social?.account && videoName === `@${social.account}` && !manualCardLabel && (price === undefined || price === null)) && (() => {
          const dateStr = eventId && eventInfo ? formatEventDateRange(eventInfo.start_date, eventInfo.end_date) : null;
          const daysStr = eventId && eventInfo ? formatDaysOfWeek(eventInfo.days_of_week) : null;
          const timeStr = eventId && eventInfo ? formatTimeRange(eventInfo.start_time, eventInfo.end_time) : null;
          const textShadow = "0 1px 2px rgba(0,0,0,0.4)";
          const showVideoName = !!videoName && !(isGeneric && social?.account && videoName === `@${social.account}`);

          let badgeText = manualCardLabel;
          if (price !== undefined && price !== null) {
            const p = price.trim();
            if (!p) {
              badgeText = "Prix : nous consulter";
            } else {
              const lower = p.toLowerCase();
              if (lower === "sur demande" || lower === "prix sur demande") {
                badgeText = "Prix sur demande";
              } else if (lower === "nous consulter" || lower === "prix: nous consulter" || lower === "prix : nous consulter") {
                badgeText = "Prix : nous consulter";
              } else {
                const sentence = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                badgeText = sentence.replace(/\bmad\b/g, "MAD").replace(/\beur\b/g, "EUR");
              }
            }
          }

          return (
            <div className="absolute top-40 md:top-40 lg:top-44 left-4 right-4 z-[60] pointer-events-none flex flex-col items-center gap-1.5 text-center">
              {badgeText && (
                <span
                  className="pointer-events-none inline-flex items-center rounded-full bg-black/70 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] md:text-xs font-extrabold uppercase text-white tracking-wide"
                  style={{ fontFamily: "'Montserrat',system-ui,sans-serif", textShadow }}
                >
                  {badgeText}
                </span>
              )}
              {showVideoName && (
                <p
                  className="text-sm md:text-base font-bold text-white line-clamp-2 cursor-pointer pointer-events-auto"
                  style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", letterSpacing: "0.02em", textShadow }}
                  onClick={() => {
                    if (videoId) {
                      navigator.clipboard.writeText(videoId).catch(() => {});
                    }
                  }}
                >
                  {videoName}
                </p>
              )}
              {dateStr && <p className="text-xs md:text-sm font-bold text-white" style={{ textShadow }}>{dateStr}</p>}
              {daysStr && <p className="text-xs md:text-sm font-bold text-white" style={{ textShadow }}>{daysStr}</p>}
              {timeStr && <p className="text-xs md:text-sm font-bold text-white" style={{ textShadow }}>{timeStr}</p>}
            </div>
          );
        })()}


        {!feedLayout && (onPrev || onNext) && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 z-30 flex flex-col gap-6 pointer-events-none">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Vidéo précédente"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Vidéo suivante"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Left sidebar — YouTube button (hover-expand, mirror of BookOnlineSlidePanel) */}
        {!hideLeftCtas && !descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && !showYoutubeOverlay && ctaBusiness?.youtube_url && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
            <div
              onClick={() => { setShowYoutubeOverlay(true); }}
              className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4"
            >
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Montserrat',sans-serif]">YouTube</span>
              <YouTubeIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300 text-red-600" />
            </div>
          </div>
        )}

        {effectiveDescription && (
          <DescriptionPlusButton
            html={effectiveDescription}
            businessName={feedLayout ? (feedInfoTitle || businessName) : businessName}
            isOpen={descOverlayOpen}
            onOpenChange={(v) => { if (!v) { setDescOverlayOpen(false); setDescMorphRect(null); setDescMorphDone(false); } else setDescOverlayOpen(true); }}
            morphRect={descMorphRect}
            morphDone={descMorphDone}
            applyMorph={applyDescMorph}
            footerSlot={visibleSocial ? <VideoSocialBadge social={visibleSocial} animKey={`desc-${videoId || videoUrl}`} /> : null}
          />
        )}



        <div className="relative w-full h-full">
          <div className="relative bg-black overflow-hidden w-full h-full">
            {showYoutubeOverlay ? (
              <div className="w-full h-full bg-black" />
            ) : embed.type === "file" ? (
              <video
                ref={videoRef}
                key={videoId || videoUrl}
                src={videoUrl}
                loop
                playsInline
                autoPlay
                muted={!soundOn}
                className="w-full h-full bg-black object-cover md:object-contain"
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              />
            ) : (
              (() => {
                const isYouTubeVertical = embed.type === "youtube" && embed.isVertical;
                return (
                  <div
                    className={`w-full h-full overflow-hidden bg-black ${embed.type === "youtube" ? "relative" : ""}`}
                    style={isYouTubeVertical ? { containerType: "size" } : undefined}
                  >
                    {embed.type === "youtube" && !embed.isVertical && (
                      <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
                    )}
                    <iframe
                      ref={iframeRef}
                      key={videoId || videoUrl}
                      src={embedUrl}
                      className={
                        embed.type === "youtube"
                          ? embed.isVertical
                            ? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            : "w-full h-full pointer-events-none"
                          : "w-full h-full pointer-events-none"
                      }
                      allow="autoplay; fullscreen; encrypted-media"
                      allowFullScreen
                      frameBorder={0}
                      style={
                        isYouTubeVertical
                          ? {
                              border: 0,
                              width: "max(100cqw, calc(100cqh * 9 / 16))",
                              height: "max(100cqh, calc(100cqw * 16 / 9))",
                            }
                          : { border: 0 }
                      }
                    />
                  </div>
                );
              })()
            )}
            {videoId && (
              <GenericVideoTimelineOverlay genericVideoId={videoId} currentTime={currentTime} />
            )}
            {agendaCity && (

              <div className="absolute inset-0 z-[20] flex justify-center px-4 py-16 bg-black/85 backdrop-blur-sm">
                <div className="w-full max-w-md bg-black/70 backdrop-blur-md rounded-xl border border-white/15 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      Agenda · {agendaCity}
                    </h3>
                    <p className="text-white/60 text-xs">{agendaEvents.length} événement{agendaEvents.length > 1 ? "s" : ""} à venir</p>
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-white/10">
                    {agendaEvents.length === 0 ? (
                      <p className="p-4 text-white/70 text-sm text-center">Aucun événement à venir.</p>
                    ) : (
                      agendaEvents.map((ev) => {
                        const biz = ev.business;
                        const hasCoords = !!(biz && biz.latitude && biz.longitude);
                        return (
                          <div
                            key={ev.id}
                            className="w-full flex items-start gap-3 p-3 text-left"
                          >
                            {ev.logo_url ? (
                              <img src={ev.logo_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0 bg-white/5" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-gold/20 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold line-clamp-2">{ev.name}</p>
                              <p className="text-gold text-xs mt-0.5">{formatDateRange(ev.start_date, ev.end_date)}</p>
                              {ev.hook && <p className="text-white/60 text-xs mt-1 line-clamp-2">{ev.hook}</p>}
                              {(biz || hasCoords) && (
                                <div className="mt-2 flex gap-2">
                                  {biz && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        storeReturnToTest();
                                        const url = await buildKpSearchUrl(biz.id);
                                        navigate(url);
                                      }}
                                      className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-white text-black font-medium text-xs shadow-lg hover:bg-white/90 transition-colors normal-case tracking-normal h-9"
                                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      <span className="truncate">En savoir +</span>
                                    </button>
                                  )}
                                  {hasCoords && (
                                    <button
                                      type="button"
                                      onClick={() => setDirectionsBusiness(biz)}
                                      className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-gold text-gold-foreground font-medium text-xs shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal h-9"
                                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                                    >
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="truncate">Itinéraire</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {effectiveDescription && !feedLayout && !descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && !showYoutubeOverlay && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <DescriptionPlusInlineButton
                key={`desc-plus-${videoId || videoUrl}`}
                onOpen={() => setDescOverlayOpen(true)}
              />
            </div>
          )}
          {/* TEMPORAIRE (debug) : ID de la vidéo au centre, clic = copie */}
          {feedLayout && videoId && !descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && (
            <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(String(videoId)).then(
                    () => toast.success(`ID copié : ${videoId}`),
                    () => {},
                  );
                }}
                className="pointer-events-auto rounded-full bg-black/60 border border-white/20 px-3 py-1.5 font-mono text-[11px] text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                title="Copier l'ID de la vidéo"
              >
                {videoId}
              </button>
            </div>
          )}
          <div className={`absolute inset-0 z-30 pointer-events-none ${descOverlayOpen ? "hidden" : ""}`}>
            <div className="fixed lg:absolute inset-x-0 bottom-[calc(120px+env(safe-area-inset-bottom))] lg:bottom-[7rem] z-30 px-4 flex flex-col items-center justify-end gap-3 pointer-events-none">
              {compactBusinessHeader && (
                <YouTubeIcon className="h-16 w-16 text-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              )}
              {/* Bloc crédit unifié — priorité : social > owner > eventBusiness (mutuellement exclusifs) */}
              {(() => {
                if (visibleSocial) {
                  return (
                    <VideoSocialBadge
                      social={visibleSocial}
                      animKey={videoId || videoUrl}
                    />
                  );
                }
                if (owner && owner.name && !feedLayout) {
                  return (
                    <div
                      key={`credit-owner-${videoId || videoUrl}`}
                      className="flex flex-col items-center justify-center gap-2 px-4 pointer-events-none"
                    >
                    {isGeneric && social && (
                      <>
                        {social.platform === "instagram" && <InstagramIcon className="w-16 h-16 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                        {social.platform === "tiktok" && <SiTiktok className="w-16 h-16 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                        {social.platform === "youtube" && <Youtube className="w-16 h-16 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                      </>
                    )}
                    {isGeneric && social ? (
                      <a
                        href={social.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto hover:bg-black/80 transition-colors normal-case tracking-normal"
                        aria-label={`Follow @${social.account}`}
                      >
                        <span className="text-xs font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          Follow @{social.account}
                        </span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={!ownerBusiness}
                        onClick={async () => {
                          if (!ownerBusiness) return;
                          storeReturnToTest();
                          const url = await buildKpSearchUrl(ownerBusiness.id);
                          navigate(url);
                        }}
                        className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto hover:bg-black/80 transition-colors disabled:cursor-default disabled:hover:bg-black normal-case tracking-normal"
                        aria-label={`Voir la fiche de ${owner.name}`}
                      >
                        <span className="text-xs font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {owner.name} ©
                        </span>
                      </button>
                    )}
                    </div>
                  );
                }
                if (!owner && !feedLayout && eventId && (eventBusiness || eventInfo)) {
                  const eventName = eventBusiness?.name || eventInfo?.name;
                  if (!eventName) return null;
                  return (
                    <div
                      key={`credit-event-${eventId}`}
                      className="flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
                    >
                      <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto select-text">
                        <span className="text-xs font-medium text-white select-text" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {eventName} <span className="text-base">©</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Feed layout : barre info viewer identique à BookOnlineSlidePanel — fond continu jusqu'au bas du viewer */}
              {feedLayout && (feedInfoTitle || feedInfoTeaser) && (
                <div className="relative w-[calc(100%+2rem)] -mx-4 md:w-[calc(100%-1rem)] md:max-w-[450px] md:mx-auto max-w-none rounded-t-2xl border-x border-b-0 border-white/10 bg-gradient-to-b from-black/25 to-black/60 backdrop-blur-[2px] pointer-events-auto pb-[calc(120px+env(safe-area-inset-bottom))] -mb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-[7rem] lg:-mb-[7rem]">
                  <MediaViewerInfo
                    name={feedInfoTitle}
                    city={ctaBusiness?.city}
                    neighborhood={(ctaBusiness as any)?.neighborhood}
                    avgOn20={null}
                    totalReviewCount={0}
                    teaser={feedInfoTeaser}
                    language={language}
                    bare
                    onOpen={(rect) => { if (effectiveDescription) startDescMorph(rect); }}
                  />
                </div>
              )}


              {ctaBusiness && !compactBusinessHeader && !hideDirections && (
                <div className="w-4/5 max-w-md pointer-events-auto flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      storeReturnToTest();
                      const url = await buildKpSearchUrl(ctaBusiness.id);
                      navigate(url);
                    }}
                    className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-white text-black font-medium text-xs shadow-lg hover:bg-white/90 transition-colors normal-case tracking-normal h-9"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate">En savoir +</span>
                  </button>
                  {ctaBusiness.latitude && ctaBusiness.longitude && (
                    <button
                      type="button"
                      onClick={() => setDirectionsBusiness(ctaBusiness)}
                      className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-gold text-gold-foreground font-medium text-xs shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal h-9"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">Itinéraire</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="pointer-events-auto">
              <PanelSearchBar
                iconVariant="black"
                onOverlayChange={setSearchOverlayOpen}
                onAiClick={() => navigate("/search?tab=ai")}
                onHashtagsOverlayChange={setHashtagsOverlayOpen}
                onSearch={(params) => {
                  const sp = new URLSearchParams(params);
                  navigate(`/search?${sp.toString()}`);
                }}
                onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
                videoControls={
                  embed.type === "file"
                    ? { type: "file", videoRef, paused: filePaused, muted: fileMuted }
                    : embed.type === "youtube"
                      ? {
                          type: "youtube",
                          iframeRef,
                          playing: ytPlaying,
                          muted: ytMuted,
                          onPlayingChange: setYtPlaying,
                          onMutedChange: (m) => { setYtMuted(m); setSoundOn(!m); },
                        }
                      : undefined
                }
              />
            </div>
          </div>
        </div>
        {directionsBusiness && (
          <Suspense fallback={null}>
            <LazyDirectionsOverlay
              business={{
                name: directionsBusiness.name,
                address: directionsBusiness.address,
                latitude: directionsBusiness.latitude,
                longitude: directionsBusiness.longitude,
                phone: directionsBusiness.phone,
                city: directionsBusiness.city,
                logo_url: directionsBusiness.logo_url,
              }}
              onClose={() => setDirectionsBusiness(null)}
            />
          </Suspense>
        )}
        {poiOverlayBusinessId && (
          <div className="absolute inset-0 z-[85]">
            <PoiSlidePanel
              businessId={poiOverlayBusinessId}
              onClose={() => setPoiOverlayBusinessId(null)}
              slideFrom="bottom"
            />
          </div>
        )}
        <LocationPickerDialog
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
          coords={geo.coords}
          detectedCity={geo.confirmedAddress || geo.detectedCity}
          isEnabled={geo.isEnabled}
          isDetecting={geo.isDetecting}
          onUseCurrentPosition={() => { if (!geo.isEnabled) geo.accept(); }}
          onConfirm={(confirmedCoords, address) => {
            geo.setManualLocation(confirmedCoords, address);
          }}
          onDisableGeo={() => {
            try {
              localStorage.removeItem("geo_manual_coords");
              localStorage.removeItem("geo_manual_address");
            } catch { /* noop */ }
            geo.decline();
          }}
        />
        {showYoutubeOverlay && ctaBusiness?.youtube_url && (
          <YouTubeOverlay
            business={{ id: ctaBusiness.id, name: ctaBusiness.name, youtube_url: ctaBusiness.youtube_url } as unknown as BookOnlineBusiness}
            activeVideo={activeYoutubeVideo}
            onSelectVideo={setActiveYoutubeVideo}
            onPlayingChange={() => {}}
            onClose={() => { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};

export const DescriptionPlusInlineButton = ({ onOpen }: { onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="animate-cta-zoom-in group flex flex-col items-center gap-2 pointer-events-auto"
    aria-label="Voir la description"
    style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
  >
    <div
      className="relative w-12 h-12 rounded-full border border-white/30 flex items-center justify-center overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
      style={{ backgroundColor: 'rgba(37, 211, 102, 0.55)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-white/5" />
      <span aria-hidden="true" className="pointer-events-none absolute top-0 left-1.5 right-1.5 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 to-transparent blur-[1px]" />
      <span className="relative text-2xl text-white font-light leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">+</span>
    </div>
  </button>
);

const DescriptionPlusButton = ({ html, businessName, isOpen, onOpenChange, morphRect = null, morphDone = false, applyMorph, footerSlot = null }: { html: string; businessName: string; isOpen: boolean; onOpenChange: (v: boolean) => void; morphRect?: DOMRect | null; morphDone?: boolean; applyMorph?: (el: HTMLDivElement | null) => void; footerSlot?: React.ReactNode }) => {
  const open = isOpen;
  const setOpen = onOpenChange;
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <OverlayShell
      zClass="z-[80]"
      animClass={morphRect ? "owm-desc-morph" : (morphDone ? "" : "animate-zoom-out-center")}
      outerRef={applyMorph}
      className="flex flex-col"
    >

      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-30 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent backdrop-blur-sm border-b border-white/10 order-[-2]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(false); }}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-bold font-['Montserrat',sans-serif] truncate text-white flex-1">{businessName}</h2>
      </div>
      <div className="relative z-10 flex-1 min-h-0 order-[-1] overflow-y-auto overscroll-contain">
        <div className="px-4 pt-4 pb-6 md:pl-6 md:pt-6 pr-14 md:pr-16">
          <div
            className="prose prose-invert prose-base max-w-none break-words text-base leading-[1.625] font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] prose-josefin-headings prose-h2:text-base md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h3]:!font-bold [&_p:empty]:min-h-[1em] [&_img]:max-w-full [&_img]:rounded-md prose-strong:!text-white"
            dangerouslySetInnerHTML={{ __html: groupImagesWithHeadings(html).replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:1.6em;line-height:1;vertical-align:middle">$1</span>') }}
          />
          {footerSlot && <div className="mt-6">{footerSlot}</div>}
        </div>
      </div>
    </OverlayShell>
  );
};

export default VideoSlidePanel;
