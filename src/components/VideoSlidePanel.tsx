import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import MediaViewerInfo, { buildFallbackTeaser } from "@/components/slidepanel/MediaViewerInfo";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";

import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, ChevronUp, ChevronDown, Youtube, MapPin, ExternalLink } from "lucide-react";
import { GiWalkingBoot } from "react-icons/gi";
import { InstagramIcon, YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";
import { createPortal } from "react-dom";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { fetchVideoCityList } from "@/lib/fetchVideoCities";
import PanelSearchBar from "@/components/PanelSearchBar";
import VideoControls from "@/components/VideoControls";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { LazyDirectionsOverlay } from "@/components/overlays/LazyOverlays";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
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
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";
import OverlayShell from "@/components/overlays/OverlayShell";
import { groupImagesWithHeadings } from "@/lib/groupImagesWithHeadings";

import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import type { YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import type { BookOnlineBusiness } from "@/hooks/useBookOnlineData";
import VideoSocialBadge from "@/components/slidepanel/VideoSocialBadge";
import { lazy } from "react";

// Import paresseux (BookOnlineSlidePanel importe ce fichier → évite le cycle au chargement).
const LazyBusinessPanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

interface SocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

/** Libellé de badge affiché avec une majuscule initiale (le reste inchangé : #tags, sigles…). */
const capFirstBadgeLabel = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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
  /** Badges (« Activé sur le front ») affichés en haut de la vidéo en mode feed */
  feedBadges?: { id: string; name: string; color?: string | null; text_color?: string | null }[] | null;
  /** Clic sur une chip badge → relance du feed sur ce badge */
  onFeedBadgeSelect?: (badge: { id: string; name: string }) => void;
  /** Clic sur la chip ville → relance du feed sur cette ville. */
  onFeedCitySelect?: (city: { id: string; name: string }) => void;
  /** ID du badge actuellement sélectionné (affiché texte noir sur fond gold) */
  selectedBadgeId?: string | null;
  /** Layout "feed" : pas de badge copyright, pas d'entête business, pas de chevrons (swipe vertical), nom+description au-dessus de la barre de navigation */
  feedLayout?: boolean;
  /** Variante de l'assistant IA ouvert depuis la barre : business hôte (défaut) ou plateforme 1WM (sans ancrage) */
  aiMode?: "business" | "platform";
}

const LEFT_COLUMN_BADGES = [
  { id: "09c54af9-2263-4ee5-aaf4-43d520a95fdc", label: "Points d'intérêt", color: "#000000", textColor: "#FFFFFF" },
  { id: "226a6dcd-f53b-4408-ac97-16d083cb4f98", label: "Guide", color: "#000000", textColor: "#FFFFFF" },
  { id: "9c1409d9-1213-4a6f-9a2b-5984b9af227c", label: "Famille", color: "#000000", textColor: "#FFFFFF" },
  { id: "645463af-f0a1-41f4-90c0-b79c5c74a09f", label: "Enfants", color: "#000000", textColor: "#FFFFFF" },
  { id: "094e01b8-c2dc-47f8-838d-5bfd01d0eefc", label: "Annonces", color: "#000000", textColor: "#FFFFFF" },
  { id: "c7f7b5dc-791f-4076-a626-e0e0f8b7bb54", label: "Deals", color: "#000000", textColor: "#FFFFFF" },
  { id: "e042e0e8-e188-4f35-9cdd-282f8ddc5106", label: "Day Pass", color: "#000000", textColor: "#FFFFFF" },
  { id: "651cb1af-63ee-4bc5-88cf-aea10a7d68c8", label: "Avis clients", color: "#000000", textColor: "#FFFFFF" },
  { id: "50472b39-d364-497f-afe7-d2aa46eb92c9", label: "Agenda", color: "#000000", textColor: "#FFFFFF" },
  { id: "3454814c-df50-414e-b5e1-70fc3976cb30", label: "Recettes", color: "#000000", textColor: "#FFFFFF" },
];


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
    feedBadges = null,
    onFeedBadgeSelect,
    onFeedCitySelect,
    selectedBadgeId = null,
    feedLayout = false,
    aiMode = "business",
  }: VideoSlidePanelProps) => {

  const navigate = useLocalizedNavigate();
  const rawNavigate = useNavigate();
  const isMobile = useIsMobile();
  const { language, setLanguage } = useLanguage();
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
  /** L'iframe IA signale sa disponibilité via postMessage("owm-ai-ready"). */
  const [aiReady, setAiReady] = useState(false);
  const [aiSessionKey, setAiSessionKey] = useState(0);
  const [aiPlatformIntroPhase, setAiPlatformIntroPhase] = useState<"full" | "exit" | "done">("done");
  const [aiSlug, setAiSlug] = useState<string | null>(null);
  /** Mode plateforme : overlay IA sans hôte ; aiSlug sert alors de contexte `ctx`. */
  const [aiPlatform, setAiPlatform] = useState(false);
  const { recentBusinesses } = useRecentlyViewedBusinesses();
  const [eventBusiness, setEventBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [businessDescription, setBusinessDescription] = useState<string | null>(null);
  const [videoCities, setVideoCities] = useState<{ id: string; name: string }[]>([]);
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

  // Neutralise le geste « retour » d'iOS Safari (swipe horizontal depuis le bord
  // gauche de l'écran) : geste système impossible à bloquer via touch-action.
  // On empile une entrée d'historique (même URL) à l'ouverture ; le swipe la
  // consomme et déclenche popstate → on ferme le viewer au lieu de quitter la
  // page (ex. retour intempestif vers Home sur iPhone).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const url = window.location.pathname + window.location.search + window.location.hash;
    rawNavigate(url, { state: { __videoSlidePanel: true } });
    let active = true;
    const onPop = () => {
      if (!active) return;
      active = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Fermeture via l'UI (croix, clic extérieur) : consommer l'entrée empilée,
      // sauf si une navigation vers une autre page l'a déjà recouverte.
      if (active && window.history.state?.usr?.__videoSlidePanel) {
        active = false;
        rawNavigate(-1);
      }
    };
  }, [open, rawNavigate]);

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

  // Villes liées à la vidéo (un chip par ville active, colonne de badges dynamiques).
  useEffect(() => {
    if (!open || !videoId) { setVideoCities([]); return; }
    let cancelled = false;
    fetchVideoCityList(videoId).then((cities) => {
      if (!cancelled) setVideoCities(cities);
    });
    return () => { cancelled = true; };
  }, [open, videoId]);


  const [descOverlayOpen, setDescOverlayOpen] = useState(false);
  useEffect(() => { if (!open) setDescOverlayOpen(false); }, [open]);
  /** Popup Club ouvert (ClubLoginPopup) : on masque les chips badges qui passeraient au-dessus. */
  const [clubPopupOpen, setClubPopupOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setClubPopupOpen(!!(e as CustomEvent).detail?.open);
    window.addEventListener("club-popup-state", handler);
    return () => window.removeEventListener("club-popup-state", handler);
  }, []);
  /** Popup Club bleu du timeline overlay (GenericVideoTimelineOverlay) : idem. */
  const [timelineClubOpen, setTimelineClubOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setTimelineClubOpen(!!(e as CustomEvent).detail?.open);
    window.addEventListener("video-timeline-club-state", handler);
    return () => window.removeEventListener("video-timeline-club-state", handler);
  }, []);
  // Feed : quand la vidéo est liée à un établissement, la barre info ouvre la
  // Full Description de BookOnlineSlidePanel de cet établissement (pas l'overlay local).
  const [descBusinessId, setDescBusinessId] = useState<string | null>(null);
  /** Quel overlay ouvrir dans le panneau business imbriqué (identique à BookOnlineSlidePanel) */
  const [nestedOverlayKind, setNestedOverlayKind] = useState<"description" | "poi">("description");
  useEffect(() => { setDescBusinessId(null); }, [videoId, videoUrl]);
  useEffect(() => { if (!open) setDescBusinessId(null); }, [open]);
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
    // En mode feed, une vidéo générique/externe peut être liée à un établissement :
    // on charge la fiche pour alimenter la barre info + le rail de CTAs de gauche.
    if (!open || eventId || (isGeneric && !feedLayout) || !pageBusinessId) {
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
  }, [open, eventId, isGeneric, pageBusinessId, feedLayout]);

  const ctaBusiness = eventBusiness || pageBusiness || ownerBusiness;
  const shouldPreloadPlatformAi = aiMode === "platform";
  const platformAiSrc = `/embed/ask?preset=overlay&lang=${language}&theme=none&bg=transparent&panel=1&scope=platform&open=${aiSessionKey}`;

  // Feed layout : note /20 + nombre d'avis clients sous le nom (comme BookOnlineSlidePanel)
  const [ratingRow, setRatingRow] = useState<any | null>(null);
  useEffect(() => {
    if (!open || !feedLayout || !ctaBusiness?.id) { setRatingRow(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select(
          "google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count",
        )
        .eq("id", ctaBusiness.id)
        .maybeSingle();
      if (!cancelled) setRatingRow(data || null);
    })();
    return () => { cancelled = true; };
  }, [open, feedLayout, ctaBusiness?.id]);
  const feedAvgOn20 = useMemo(
    () => (ratingRow ? computeWeightedRatingOn20(collectRatingSources(ratingRow)) : null),
    [ratingRow],
  );
  const feedReviewCount = useMemo(() => (ratingRow ? getTotalReviewCount(ratingRow) : 0), [ratingRow]);
  // Feed layout : titre + teaser de la barre info (description vidéo, sinon établissement lié)
  const feedInfoTitle = (description && description.trim())
    ? (headerVideoTitle || videoName || ctaBusiness?.name || businessName || "")
    : (ctaBusiness?.name || businessName || "");
  const feedInfoTeaser = useMemo(() => {
    const plain = (effectiveDescription || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain) return plain;
    if (feedInfoTitle) return buildFallbackTeaser(feedInfoTitle, language);
    return null;
  }, [effectiveDescription, feedInfoTitle, language]);

  // Navigation verticale à la molette / trackpad (desktop) — même effet que le swipe.
  const wheelNav = useRef({ enabled: false, onPrev, onNext, hasPrev, hasNext });
  wheelNav.current = {
    enabled: !descOverlayOpen && !descBusinessId && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && !agendaCity,
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
  // Pulsation colorée de l'icône Like/coeur à chaque nouvelle entrée de la timeline
  const [timelinePulse, setTimelinePulse] = useState(0);
  const [timelineHasEntries, setTimelineHasEntries] = useState(false);
  useEffect(() => {
    const onEntry = () => {
      setTimelinePulse((p) => p + 1);
      setTimelineHasEntries(true);
    };
    window.addEventListener("video-timeline-entry", onEntry as EventListener);
    return () => window.removeEventListener("video-timeline-entry", onEntry as EventListener);
  }, []);
  useEffect(() => { setTimelineHasEntries(false); }, [videoId]);

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

  // Cible du portal toolbar-right, lue APRÈS commit (jamais getElementById
  // pendant le render). Sans ça, à la fermeture d'un overlay qui masque le
  // header (assistant IA, recherche…), le getElementById en cours de render
  // renvoyait null (DOM pas encore re-commité) et le contenu portalé du
  // header (Like / Bookmark / Partage) ne réapparaissait jamais.
  const headerVisible = !descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !compactBusinessHeader;
  const [toolbarCenterEl, setToolbarCenterEl] = useState<HTMLElement | null>(null);
  const [toolbarRightEl, setToolbarRightEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || !headerVisible) {
      setToolbarCenterEl(null);
      setToolbarRightEl(null);
      return;
    }
    setToolbarCenterEl(document.getElementById("slide-panel-home-toolbar-center"));
    setToolbarRightEl(document.getElementById("slide-panel-home-toolbar-right"));
  }, [open, headerVisible, toolbarMounted]);
  useEffect(() => { if (!open) { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); } }, [open]);
  useEffect(() => { setShowYoutubeOverlay(false); setActiveYoutubeVideo(null); }, [pageBusinessId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // LocationPickerDialog (portal Radix hors du panel) gère sa propre fermeture :
      // Escape ne doit pas fermer le viewer en dessous.
      if (e.key === "Escape" && !locationDialogOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, locationDialogOpen]);

  // Sync file video state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let disposed = false;
    // Apply the user's persisted sound preference to this new video element
    v.muted = !soundOn;
    // Drapeau : un mute technique (autoplay bloqué / lecture interrompue par un
    // swipe) ne doit JAMAIS être persisté comme un choix utilisateur.
    let autoMute = false;
    const attemptPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch((err: unknown) => {
          if (disposed) return;
          const name = (err as { name?: string })?.name;
          // AbortError : la lecture a été interrompue par un nouveau chargement
          // (swipe rapide). Ce n'est PAS un blocage autoplay : on retente sans muter.
          if (name === "AbortError") {
            window.setTimeout(() => { if (!disposed) attemptPlay(); }, 120);
            return;
          }
          // Vrai blocage navigateur : on mute pour démarrer, puis on rétablit
          // le son dès le premier geste utilisateur.
          autoMute = true;
          v.muted = true;
          v.play().catch(() => {});
          if (!soundOn) return;
          const tryUnmute = (ev: Event) => {
            // Si le geste vise le bouton son lui-même, on laisse son handler décider
            // (sinon on dé-mute ici et le clic re-mute juste après).
            const target = ev.target as HTMLElement | null;
            if (target?.closest?.('[data-sound-toggle="true"]')) {
              document.addEventListener("pointerdown", tryUnmute, opts);
              document.addEventListener("touchstart", tryUnmute, opts);
              return;
            }
            if (disposed || !v.muted) return;
            autoMute = false;
            v.muted = false;
            v.play().catch(() => {});
          };
          const opts: AddEventListenerOptions = { once: true, capture: true };
          document.addEventListener("pointerdown", tryUnmute, opts);
          document.addEventListener("touchstart", tryUnmute, opts);
        });
      }
    };
    attemptPlay();
    const onPlay = () => {
      setFilePaused(false);
      // Si la lecture démarre alors que le son est demandé mais que l'élément est
      // resté muté (mute technique), on rétablit le son.
      if (soundOn && v.muted && autoMute) {
        autoMute = false;
        v.muted = false;
      }
    };
    const onPause = () => setFilePaused(true);
    const onVol = () => {
      setFileMuted(v.muted);
      // Persist user's choice so subsequent videos respect it
      if (!autoMute) setSoundOn(!v.muted);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    setFilePaused(v.paused);
    setFileMuted(v.muted);
    return () => {
      disposed = true;
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

  // Pause + mute the background video when the Full Description overlay is open.
  // Resume (with the user's sound preference) when it closes.
  useEffect(() => {
    if (!open) return;
    if (descBusinessId || aiOverlayOpen) {
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.muted = true;
      }
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
      }
    } else {
      const v = videoRef.current;
      if (v) {
        v.muted = !soundOn;
        v.play().catch(() => {});
      }
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        if (soundOn) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
        }
      }
    }
  }, [descBusinessId, aiOverlayOpen, open, soundOn]);

  // Fermeture de l'overlay IA depuis l'intérieur de l'iframe (/embed/ask, mode panneau)
  // + signal de disponibilité. En mode plateforme, l'iframe peut être préchargée
  // avant le clic CTA : on écoute donc le signal même overlay fermé.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const t = (e.data as any)?.type;
      if (t === "owm-embed-close") setAiOverlayOpen(false);
      if (t === "owm-ai-ready") setAiReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (aiOverlayOpen && !aiPlatform) setAiReady(false);
  }, [aiOverlayOpen, aiPlatform, aiSessionKey]);

  // Filet de sécurité hôte seulement en mode business.
  useEffect(() => {
    if (!aiOverlayOpen || aiReady || aiPlatform) return;
    const t = setTimeout(() => setAiReady(true), 8000);
    return () => clearTimeout(t);
  }, [aiOverlayOpen, aiReady, aiPlatform]);

  // Mode plateforme : aucune séquence d'intro côté parent.
  useEffect(() => {
    setAiPlatformIntroPhase("done");
  }, [aiOverlayOpen, aiPlatform, aiSessionKey]);




  if (!open || !videoUrl) return null;

  const visibleSocial = (showSocialBadge || feedLayout) ? social : null;
  // Badge « Nom © » = attribution EXTERNE uniquement :
  //  - vidéo avec compte social → badge « Follow @… » (géré via visibleSocial) ;
  //  - vidéo dont le propriétaire (owner) est un AUTRE business que
  //    l'établissement en cours (pageBusinessId) → badge noir cliquable ;
  //  - JAMAIS pour une vidéo interne de l'établissement en cours
  //    (owner absent, ou owner.id === pageBusinessId, ou pas de contexte page).
  // Les vidéos génériques ne sont jamais « internes » : leur owner est une
  // attribution externe par nature → badge affiché dès qu'il existe.
  const isOwnInternalVideo =
    !isGeneric && (!owner?.id || !pageBusinessId || owner.id === pageBusinessId);
  const swipeNavigationEnabled = isMobile && !descOverlayOpen && !descBusinessId && !searchOverlayOpen && !directionsBusiness && !poiOverlayBusinessId && !agendaCity;

  const resetSwipe = () => {
    swipeStartY.current = null;
    swipeStartX.current = null;
    swipeHandled.current = false;
  };

  const embed = getVideoEmbed(videoUrl, window.location.origin, { autoplay: true, defaultSoundOn: soundOn, controls: false });
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
        // Les contenus Radix (LocationPickerDialog, DropdownMenu des chips de la
        // carte POI, etc.) sont rendus dans un portal sur document.body : DOM-ment
        // hors de panelRef, mais React fait remonter leurs clics jusqu'ici.
        // On ne ferme donc QUE si le clic vise réellement ce conteneur (zone vide
        // à côté du panneau), jamais un descendant portalisé.
        if (locationDialogOpen) return;
        if (e.target !== e.currentTarget) return;
        onClose();
      }}

    >
      <div
        ref={panelRef}
        className={`absolute right-0 top-0 h-full w-full bg-black shadow-2xl overflow-hidden${feedLayout ? "" : " lg:bg-background border-l border-border"}`}
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
            closeButtonContainerClassName={!feedLayout && shouldShowOwnerLogoInHeader && ctaBusiness ? "md:ml-10" : ""}
          />
        )}
        {/* Center header CTA : Tel / WhatsApp (identique à BookOnlineSlidePanel) */}
        {!descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !compactBusinessHeader && toolbarCenterEl && ctaBusiness && (ctaBusiness.whatsapp || ctaBusiness.phone) && createPortal(
          <div className="flex items-center gap-6 relative z-[90] md:z-auto">
            {ctaBusiness.whatsapp ? (
              <a href={whatsappUrl(ctaBusiness.whatsapp)} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
                <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
                <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
                <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
                <span
                  className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full text-white overflow-hidden before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/30 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/35 after:to-transparent after:blur-[1px] after:pointer-events-none [&>svg]:relative [&>svg]:z-10"
                  style={{ backgroundColor: "#25D366", boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 4px 14px -2px rgba(0,0,0,0.35)' }}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
              </a>
            ) : (
              <a href={`tel:${ctaBusiness.phone}`} className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
                <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(0,0,0,0.25)" }} />
                <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
                <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
                <span
                  className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background overflow-hidden before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/30 after:to-transparent after:blur-[1px] after:pointer-events-none [&>svg]:relative [&>svg]:z-10"
                  style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -1px 0 0 rgba(0,0,0,0.3), 0 4px 14px -2px rgba(0,0,0,0.35)' }}
                >
                  <Phone className="h-4 w-4" />
                </span>
              </a>
            )}
          </div>,
          toolbarCenterEl
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
                <Heart className="h-4 w-4 !text-black" strokeWidth={2.5} />
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
        {headerVisible && toolbarRightEl && createPortal(
                <div className="flex items-center gap-2 shrink-0">
                  {/* Like vidéo */}
                  <div className="relative flex flex-col items-center">
                    <button
                      key={`heart-btn-${timelinePulse}`}
                      type="button"
                      onClick={async () => {
                        // En feed, dès qu'une entrée de timeline est apparue,
                        // le coeur ouvre le popup « Sauvegardez vos coups de cœur ».
                        if (feedLayout && timelineHasEntries) {
                          window.dispatchEvent(new CustomEvent("open-video-timeline-club"));
                          return;
                        }
                        if (!isVideoLikeLoggedIn) {
                          // Non connecté : en feed, même popup bleu que le Bookmark
                          // du header (jamais le popup beige centré).
                          window.dispatchEvent(new CustomEvent(feedLayout ? "open-video-timeline-club" : "open-generic-club-popup"));
                          return;
                        }
                        if (!videoLikeId) return;
                        setLikeBurst((b) => b + 1);
                        await toggleVideoLike();
                      }}
                      disabled={isVideoLikeLoggedIn && !videoLikeId && !(feedLayout && timelineHasEntries)}
                      style={{
                        boxShadow: timelinePulse > 0 ? "0 0 18px 4px rgba(255,26,26,0.55)" : undefined,
                      }}
                      className={`relative h-9 w-9 flex items-center justify-center rounded-full shadow-2xl transition-all shrink-0 glass-toolbar-btn bg-[#F1F1F1] ${
                        timelinePulse > 0 ? "animate-[heart-bg-pulse_0.9s_ease-out]" : ""
                      } ${
                        isVideoLikeLoggedIn && !videoLikeId && !(feedLayout && timelineHasEntries) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-90"
                      }`}
                      title={feedLayout && timelineHasEntries ? "Sauvegardez vos coups de cœur" : !isVideoLikeLoggedIn ? "Connectez-vous pour liker" : videoLikeId ? (isVideoLiked ? "Retirer le like" : "Liker") : "Indisponible"}
                      aria-label={feedLayout && timelineHasEntries ? "Sauvegardez vos coups de cœur" : "Liker la vidéo"}
                    >
                      <Heart
                        key={`h-${likeBurst}-${timelinePulse}`}
                        className={`h-4 w-4 transition-transform !text-black ${
                          isVideoLiked ? "animate-[heart-pop_0.4s_ease-out]" : ""
                        }`}
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
                      // En feed : le Bookmark ouvre le popup « Sauvegardez vos coups de cœur »
                      // (remplace l'ancien CTA texte Sauvegarder du timeline overlay).
                      if (feedLayout) {
                        window.dispatchEvent(new CustomEvent("open-video-timeline-club"));
                        return;
                      }
                      if (!isBookmarkLoggedIn) {
                        window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
                        return;
                      }
                      if (!ctaBusiness?.id) return;
                      await toggleBookmark();
                    }}
                    disabled={!feedLayout && isBookmarkLoggedIn && !ctaBusiness?.id}
                    style={{ backgroundColor: "#F1F1F1" }}
                    className={`h-9 w-9 flex items-center justify-center rounded-full text-black shadow-2xl transition-opacity shrink-0 glass-toolbar-btn ${
                      !feedLayout && isBookmarkLoggedIn && !ctaBusiness?.id ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
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
                toolbarRightEl
              )}

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

        {/* Tableau de 2 colonnes de chips badges en haut de la vidéo — feed uniquement.
            Colonne de gauche : menu fixe de 9 filtres (Points d'intérêt, Guide, Famille,
            Enfants, Annonces, Deals, Day Pass, Avis clients, Agenda).
            Colonne de droite : badges effectivement liés à la vidéo, les uns au-dessus des autres.
            Clic sur un chip → relance le feed sur ce badge. */}
        {feedLayout && !descOverlayOpen && !directionsBusiness && !searchOverlayOpen
          && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && !showYoutubeOverlay && !clubPopupOpen && !timelineClubOpen && (
          <div className="absolute top-16 left-3 right-3 z-[100] grid grid-cols-2 gap-2 pointer-events-none">
            <div className="flex flex-col items-end gap-1.5">
              {LEFT_COLUMN_BADGES.filter(
                (b) => !(feedBadges?.[0]?.id && b.id === feedBadges[0].id)
              ).map((b) => {
                const isSelected = selectedBadgeId && b.id === selectedBadgeId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!onFeedBadgeSelect}
                    onClick={() => onFeedBadgeSelect?.({ id: b.id, name: b.label })}
                    className={`pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
                      isSelected
                        ? "border-gold bg-gold text-gold-foreground"
                        : "border-white/25"
                    }`}
                    style={
                      isSelected
                        ? { fontFamily: "'Montserrat',system-ui,sans-serif" }
                        : {
                            backgroundColor: b.color || "rgba(0,0,0,0.7)",
                            color: b.textColor || "#FFFFFF",
                            fontFamily: "'Montserrat',system-ui,sans-serif",
                          }
                    }
                    title={onFeedBadgeSelect ? `Voir les vidéos ${b.label}` : b.label}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              {(() => {
                const firstVideoBadge = feedBadges?.[0];
                const dynamicBadges = feedBadges?.slice(1).filter((b) => {
                  const left = LEFT_COLUMN_BADGES.find((lb) => lb.id === b.id);
                  if (left) return false;
                  // Exclure aussi les badges dont le nom est identique à un label de gauche (insensible à la casse et aux accents)
                  return !LEFT_COLUMN_BADGES.some((lb) => lb.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                }) ?? [];
                return (
                  <>
                    {firstVideoBadge && (
                      <button
                        key={firstVideoBadge.id}
                        type="button"
                        disabled={!onFeedBadgeSelect}
                        onClick={() => onFeedBadgeSelect?.({ id: firstVideoBadge.id, name: firstVideoBadge.name })}
                        className="pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                        style={{
                          backgroundColor: "#C04F17",
                          color: "#FFFFFF",
                          fontFamily: "'Montserrat',system-ui,sans-serif",
                        }}
                        title={onFeedBadgeSelect ? `Voir les vidéos ${firstVideoBadge.name}` : firstVideoBadge.name}
                      >
                        {firstVideoBadge.name === "Rooftop Restaurant & Bars" ? (
                          <>Rooftop<br />Restaurant & Bars</>
                        ) : (
                          capFirstBadgeLabel(firstVideoBadge.name)
                        )}
                      </button>
                    )}
                    {dynamicBadges.map((b) => {
                      const isSelected = selectedBadgeId && b.id === selectedBadgeId;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          disabled={!onFeedBadgeSelect}
                          onClick={() => onFeedBadgeSelect?.({ id: b.id, name: b.name })}
                          className={`pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
                            isSelected
                              ? "border-gold bg-gold text-gold-foreground"
                              : "border-white/25 text-white"
                          }`}
                          style={
                            isSelected
                              ? { fontFamily: "'Montserrat',system-ui,sans-serif" }
                              : {
                                  backgroundColor: b.color || "rgba(0,0,0,0.7)",
                                  color: b.text_color || "#FFFFFF",
                                  fontFamily: "'Montserrat',system-ui,sans-serif",
                                }
                          }
                          title={onFeedBadgeSelect ? `Voir les vidéos ${b.name}` : b.name}
                        >
                          {b.name === "Rooftop Restaurant & Bars" ? (
                            <>Rooftop<br />Restaurant & Bars</>
                          ) : (
                            capFirstBadgeLabel(b.name)
                          )}
                        </button>
                      );
                    })}
                    {videoCity && (
                      <button
                        type="button"
                        disabled={!onFeedCitySelect}
                        onClick={() => onFeedCitySelect?.(videoCity)}
                        className="pointer-events-auto inline-flex max-w-full items-center justify-center gap-1 rounded-full border border-white/25 bg-black/70 px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                        style={{ fontFamily: "'Montserrat',system-ui,sans-serif" }}
                        title={onFeedCitySelect ? `Voir les vidéos à ${videoCity.name}` : videoCity.name}
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        {videoCity.name}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Left sidebar CTAs — miroir du rail de BookOnlineSlidePanel.
            Hors feed : uniquement le bouton YouTube (comportement historique).
            En feed : Langue / Localisation / Itinéraire / YouTube dès qu'un
            établissement est lié à la vidéo (y compris générique/externe). */}
        {((feedLayout && !!ctaBusiness) || (!hideLeftCtas && !!ctaBusiness?.youtube_url))
          && !descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && !descBusinessId && !showYoutubeOverlay && (
          <div dir="ltr" className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
            {feedLayout && (() => {
              const LANG_OPTIONS = [
                { code: "fr" as const, flag: "🇫🇷", label: "Français" },
                { code: "en" as const, flag: "🇬🇧", label: "English" },
                { code: "ar" as const, flag: "🇲🇦", label: "العربية" },
              ];
              const ctaLabel = language === "en" ? "Language" : language === "ar" ? "اللغة" : "Langue";
              const currentLang = LANG_OPTIONS.find((opt) => opt.code === language) || LANG_OPTIONS[0];
              const otherLangs = LANG_OPTIONS.filter((opt) => opt.code !== language);
              return (
                <div className="group relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
                  <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{ctaLabel}</span>
                  <span className="flex items-center gap-0 group-hover:gap-1.5 group-hover:ml-2 transition-[margin,gap] duration-300">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Current language ${currentLang.label}`}
                      title={currentLang.label}
                      className="relative inline-flex items-center justify-center h-[22px] w-[22px] text-[19px] leading-none shrink-0"
                    >
                      {currentLang.flag}
                    </button>
                    <span className="flex items-center gap-1.5 opacity-0 max-w-0 overflow-hidden group-hover:opacity-100 group-hover:max-w-[120px] transition-all duration-300 ease-out shrink-0">
                      {otherLangs.map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLanguage(opt.code); }}
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
            {feedLayout && ctaBusiness?.id && ctaBusiness.latitude && ctaBusiness.longitude && (
              <div
                onClick={() => { setNestedOverlayKind("poi"); setDescBusinessId(String(ctaBusiness.id)); }}
                className="group relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4"
              >
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation"}</span>
                <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
              </div>
            )}
            {feedLayout && ctaBusiness?.latitude && ctaBusiness?.longitude && (
              <div
                onClick={() => setDirectionsBusiness(ctaBusiness)}
                className="group relative overflow-hidden flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4"
              >
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{language === "en" ? "Directions" : language === "ar" ? "طريق" : "Itinéraire"}</span>
                <GiWalkingBoot className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
              </div>
            )}
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
                className="w-full h-full bg-black object-cover"
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
            <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-2 pointer-events-none">
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
          <div className={`absolute inset-0 z-30 pointer-events-none ${descOverlayOpen || aiOverlayOpen ? "hidden" : ""}`}>
            <div className="fixed lg:absolute inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] lg:bottom-[5.5rem] z-30 px-4 flex flex-col items-center justify-end gap-3 pointer-events-none">
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
                // Attribution externe sans compte social → badge noir
                // « Nom © » cliquable (fiche business) au-dessus de la barre info.
                // Vidéo interne de l'établissement en cours : rien.
                if (owner && owner.name && !isOwnInternalVideo) {
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
                        className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto hover:bg-black/80 transition-colors disabled:cursor-default disabled:hover:bg-black normal-case tracking-normal"
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
                <div className="relative w-[calc(100%-0.25rem)] max-w-[480px] mx-auto md:w-[calc(100%-1rem)] md:max-w-[450px] rounded-t-2xl border-x border-b-0 border-white/10 bg-gradient-to-b from-black/55 to-black/85 backdrop-blur-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.45)] pointer-events-auto pb-[calc(96px+env(safe-area-inset-bottom))] -mb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-[5.5rem] lg:-mb-[5.5rem]">
                  <MediaViewerInfo
                    name={feedInfoTitle}
                    city={ctaBusiness?.city}
                    neighborhood={(ctaBusiness as any)?.neighborhood}
                    avgOn20={feedAvgOn20}
                    totalReviewCount={feedReviewCount}
                    teaser={feedInfoTeaser}
                    language={language}
                    bare
                    onOpen={(rect) => {
                      // Vidéo liée à un établissement → Full Description de BookOnlineSlidePanel.
                      if (ctaBusiness?.id) { setNestedOverlayKind("description"); setDescBusinessId(String(ctaBusiness.id)); return; }
                      if (effectiveDescription) startDescMorph(rect);
                    }}
                  />
                </div>
              )}


              {/* Feed : plus de CTA sur la vidéo (En savoir + / Itinéraire) — ils vivent dans le rail de gauche */}
              {!feedLayout && ctaBusiness && !compactBusinessHeader && !hideDirections && (
                <div className="w-4/5 max-w-md pointer-events-auto flex gap-2">
                  {/* Feed (HomeVideoSlidePanel) : pas de CTA « En savoir + » (issu des url 2 à 5) */}
                  {!feedLayout && social?.platform !== "youtube" && (
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
                  )}
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
            <div className="absolute pointer-events-none bottom-0 left-1/2 -translate-x-1/2 w-[96%] sm:w-[94%] max-w-[540px] z-[85]">
              <div className="relative w-full h-full pointer-events-auto">
                <PanelSearchBar
                  iconVariant="black"
                  profileToTimelineClub
                  onOverlayChange={setSearchOverlayOpen}
                  onAiClick={() => {
                    // Assistant IA en overlay : business de la vidéo, sinon dernier
                    // business consulté, sinon fallback sur l'onglet IA de /search.
                    // Mode plateforme : assistant 1WM global (sans hôte), le slug
                    // trouvé ne sert que de contexte de suggestions (`ctx`).
                    const slug = ctaBusiness?.slug
                      || recentBusinesses.find((b) => !b.isYoutubeChannel)?.slug
                      || null;
                    if (aiMode === "platform") {
                      setAiSlug(null);
                      setAiPlatform(true);
                      setAiOverlayOpen(true);
                    } else if (slug) {
                      setAiReady(false);
                      setAiSessionKey((k) => k + 1);
                      setAiPlatform(false);
                      setAiSlug(slug);
                      setAiOverlayOpen(true);
                    } else {
                      navigate("/search?tab=ai");
                    }
                  }}
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
        {descBusinessId && (
          <div className="fixed inset-y-0 right-0 w-full lg:w-1/2 z-[240] h-[100dvh] overflow-hidden">
            <Suspense fallback={null}>
              <LazyBusinessPanel
                open
                businessId={descBusinessId}
                initialOverlay={nestedOverlayKind}
                loadingSurface="dark"
                onClose={() => { setDescBusinessId(null); setNestedOverlayKind("description"); }}
              />
            </Suspense>
          </div>
        )}
        {(aiOverlayOpen || shouldPreloadPlatformAi) && (aiPlatform || aiSlug || shouldPreloadPlatformAi) && (
          <div
            /* Préchargement (overlay fermé) : `invisible` + décalage hors écran.
               iOS Safari peint le fond blanc opaque d'une iframe malgré
               `opacity-0`/`-z-10` → flash blanc à l'ouverture de la démo /front.
               `visibility:hidden` supprime toute peinture sans annuler le
               chargement de l'iframe. */
            className={`fixed inset-y-0 right-0 w-full h-[100dvh] overflow-hidden ${aiOverlayOpen ? "z-[240] animate-slide-in-right" : "-z-10 pointer-events-none opacity-0 invisible translate-x-full"}`}
            aria-hidden={!aiOverlayOpen}
          >
            {/* Fond assombri : la vidéo reste visible derrière l'assistant (iframe transparente) */}
            {aiOverlayOpen && (
              <div
                className="absolute inset-0 bg-black/85 backdrop-blur-[6px]"
                onClick={() => setAiOverlayOpen(false)}
              />
            )}
            {/* Animation de recherche pendant le chargement de l'assistant :
                l'iframe reste montée (elle charge) mais masquée jusqu'au signal « prêt ». */}
            {!aiPlatform && !aiReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none">
                <div className="h-14 w-14 rounded-full border-4 border-white/15 border-t-[#D4AF37] animate-spin" />
                <p className="text-white/90 text-lg font-medium tracking-wide animate-pulse text-center px-8">
                  {language === "en"
                    ? "The assistant is searching…"
                    : language === "ar"
                    ? "المساعد يبحث…"
                    : "L'assistant recherche…"}
                </p>
              </div>
            )}
            <iframe
              key={aiSessionKey}
              src={(aiPlatform || shouldPreloadPlatformAi)
                ? platformAiSrc
                : `/embed/ask/${aiSlug}?preset=overlay&lang=${language}&theme=none&bg=transparent&panel=1&open=${aiSessionKey}`}
              title="Assistant IA"
              className={`relative w-full h-full border-0 transition-opacity duration-500 ${aiOverlayOpen && (aiPlatform || aiReady) ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              style={{ background: "transparent" }}
              allow="clipboard-write; microphone"
            />
            {/* Mode plateforme : le message d'accueil est géré à l'intérieur de
                l'iframe (/embed/ask), jamais par le panneau parent. */}

          </div>
        )}
        {/* Popup Club — même mécanisme que BookOnlineSlidePanel : il écoute
            "open-generic-club-popup" (dispatché par le CTA Profil de PanelSearchBar
            pour les anonymes). Monté DANS panelRef pour que ses clics ne soient
            pas pris pour un click-outside qui fermerait le viewer. */}
        <ClubLoginPopup />
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
