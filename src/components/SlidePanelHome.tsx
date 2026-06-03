import { useEffect, useRef, useState, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronUp, ChevronDown, Youtube, MapPin, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";
import { createPortal } from "react-dom";
import { getVideoEmbed } from "@/lib/videoEmbed";
import PanelSearchBar from "@/components/PanelSearchBar";
import VideoControls from "@/components/VideoControls";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { useNavigate } from "react-router-dom";
import { LazyDirectionsOverlay } from "@/components/overlays/LazyOverlays";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import { businessUrl, buildOgShareUrl } from "@/lib/businessUrl";
import { formatEventDateRange, formatDaysOfWeek, formatTimeRange } from "@/lib/homeHelpers";
import { buildKpSearchUrl } from "@/lib/buildKpSearchUrl";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import BusinessHeader from "@/components/slidepanel/BusinessHeader";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import { Phone, Heart } from "lucide-react";
import OverlayShell from "@/components/overlays/OverlayShell";
import { groupImagesWithHeadings } from "@/lib/groupImagesWithHeadings";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import YouTubeOverlay from "@/components/overlays/YouTubeOverlay";
import type { YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import type { BookOnlineBusiness } from "@/hooks/useBookOnlineData";

interface SocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

interface SlidePanelHomeProps {
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
  /** When set, displays the list of events for this city (Agenda card) */
  agendaCity?: string | null;
  /** When set, displays CTAs for the event's linked business (via event_businesses) */
  eventId?: string | null;
  /** Serialized Test page context used to restore the previous result state after closing an establishment panel */
  returnContext?: string | null;
  /** Compact business header (background hugs the name, centered) */
  compactBusinessHeader?: boolean;
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

const SlidePanelHome = ({
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
  agendaCity,
  eventId,
  returnContext,
  compactBusinessHeader = false,
}: SlidePanelHomeProps) => {

  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      .select("description")
      .eq("id", targetId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled) setBusinessDescription(data?.description ?? null);
      });
    return () => { cancelled = true; };
  }, [open, owner?.id, pageBusinessId, description]);

  const [descOverlayOpen, setDescOverlayOpen] = useState(false);
  useEffect(() => { if (!open) setDescOverlayOpen(false); }, [open]);
  const [ownerBusiness, setOwnerBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [eventInfo, setEventInfo] = useState<{ name: string; logo_url: string | null; description: string | null; start_date: string | null; end_date: string | null; days_of_week: string[] | null; start_time: string | null; end_time: string | null } | null>(null);
  const [poiOverlayBusinessId, setPoiOverlayBusinessId] = useState<string | null>(null);
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
  const normalizeHeaderName = (value: string | null | undefined) =>
    (value || "").trim().toLocaleLowerCase("fr-FR");
  const shouldShowOwnerLogoInHeader =
    !!owner?.logo_url &&
    normalizeHeaderName(businessName) === normalizeHeaderName(owner.name);

  const storeReturnToTest = () => {
    try {
      if (videoId) sessionStorage.setItem("returnToTestVideoId", videoId);
      if (returnContext) sessionStorage.setItem("returnToTestContext", returnContext);
    } catch {}
  };

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
  const [filePaused, setFilePaused] = useState(true);
  const [fileMuted, setFileMuted] = useState(!soundOn);
  const [ytPlaying, setYtPlaying] = useState(true);
  const [ytMuted, setYtMuted] = useState(!soundOn);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<YouTubeVideo | null>(null);
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

  // On mobile the embed URL forces mute=1 so autoplay works.
  // Make sure the mute toggle reflects that when the video changes.
  useEffect(() => {
    if (!open || !isMobile) return;
    setYtMuted(true);
    setYtPlaying(true);
  }, [videoUrl, videoId, open, isMobile]);

  // Sync YouTube iframe state with the real player (onStateChange + volume)
  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const subscribe = () => {
      const w = iframe.contentWindow;
      if (!w) return;
      w.postMessage(JSON.stringify({ event: "listening" }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "*");
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
          if (info === 1) setYtPlaying(true);
          else if (info === 2 || info === 0 || info === -1) setYtPlaying(false);
        }
        // infoDelivery: info is an object with playerState/muted
        if (info && typeof info === "object") {
          if (typeof info.playerState === "number") {
            if (info.playerState === 1) setYtPlaying(true);
            else if (info.playerState === 2 || info.playerState === 0) setYtPlaying(false);
          }
          if (typeof info.muted === "boolean") {
            setYtMuted(info.muted);
            setSoundOn(!info.muted);
          }
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);

    return () => {
      iframe.removeEventListener("load", subscribe);
      window.removeEventListener("message", onMessage);
    };
  }, [open, videoUrl, videoId, setSoundOn]);


  if (!open || !videoUrl) return null;

  const visibleSocial = showSocialBadge ? social : null;
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
    if (soundOn && !isMobile) {
      embedUrl = embedUrl.replace(/[?&]mute=1/, (m) => m[0] + "mute=0");
    }
  } else if (embed.type === "vimeo") {
    embedUrl = embedUrl.replace("loop=0", "loop=1");
    if (soundOn && !isMobile) embedUrl = embedUrl.replace("muted=1", "muted=0");
  } else if (embed.type === "bunny") {
    embedUrl = embedUrl.replace("loop=false", "loop=true");
  }

  return createPortal(
    <div className="fixed inset-y-0 right-0 w-full lg:w-1/2 z-[220]"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full bg-background border-l border-border shadow-2xl animate-slide-in-right overflow-hidden"
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
        {compactBusinessHeader && (
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
                shareUrl={ctaBusiness?.slug ? buildOgShareUrl(ctaBusiness.slug) : undefined}
              />
            </div>
          </>
        )}
        {!descOverlayOpen && !searchOverlayOpen && !aiOverlayOpen && !hashtagsOverlayOpen && !compactBusinessHeader && typeof document !== "undefined" && (() => {
          const rightEl = document.getElementById("slide-panel-home-toolbar-right");
          return (
            <>

              {rightEl && createPortal(
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    aria-label="Le Club OWM"
                  >
                    <Heart className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                  </button>
                  <ShareButton
                    title={ctaBusiness?.name || businessName}
                    variant="dark"
                    className="shrink-0"
                    shareUrl={ctaBusiness?.slug ? buildOgShareUrl(ctaBusiness.slug) : undefined}
                  />
                </div>,
                rightEl
              )}
            </>
          );
        })()}

        {/* BusinessHeader: Logo + Nom + Ville + Quartier + Adresse */}
        {!descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && ctaBusiness && (
          <div className="absolute top-16 md:top-14 lg:top-16 left-2 right-2 z-[65] pointer-events-none">
            <BusinessHeader
              business={{
                ...ctaBusiness,
                name: businessName || ctaBusiness.name,
                logo_url: shouldShowOwnerLogoInHeader ? owner.logo_url : null,
                logo_bg: shouldShowOwnerLogoInHeader ? owner.logo_bg ?? null : null,
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

        {!descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && videoName && !(isGeneric && social?.account && videoName === `@${social.account}`) && (() => {
          const dateStr = eventId && eventInfo ? formatEventDateRange(eventInfo.start_date, eventInfo.end_date) : null;
          const daysStr = eventId && eventInfo ? formatDaysOfWeek(eventInfo.days_of_week) : null;
          const timeStr = eventId && eventInfo ? formatTimeRange(eventInfo.start_time, eventInfo.end_time) : null;
          const shadow = "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 5px hsla(0,0%,0%,0.95)) drop-shadow(0 0 10px hsla(0,0%,0%,0.85)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.8)) drop-shadow(0 4px 16px hsla(0,0%,0%,0.7)) drop-shadow(0 6px 28px hsla(0,0%,0%,0.5))";
          return (
            <div className="absolute top-40 md:top-40 lg:top-44 left-4 right-4 z-[60] pointer-events-none flex flex-col items-center gap-1 text-center">
              <p
                className="text-sm md:text-base font-bold text-white line-clamp-3 cursor-pointer pointer-events-auto"
                style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: "0.02em", filter: shadow }}
                onClick={() => {
                  if (videoId) {
                    navigator.clipboard.writeText(videoId).catch(() => {});
                  }
                }}
              >
                {videoName}
              </p>
              {dateStr && <p className="text-xs md:text-sm font-semibold text-white" style={{ filter: shadow }}>{dateStr}</p>}
              {daysStr && <p className="text-xs md:text-sm font-semibold text-white" style={{ filter: shadow }}>{daysStr}</p>}
              {timeStr && <p className="text-xs md:text-sm font-semibold text-white" style={{ filter: shadow }}>{timeStr}</p>}
            </div>
          );
        })()}

        {(onPrev || onNext) && (
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
        {!descOverlayOpen && !directionsBusiness && !searchOverlayOpen && !hashtagsOverlayOpen && !aiOverlayOpen && !poiOverlayBusinessId && !showYoutubeOverlay && ctaBusiness?.youtube_url && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
            <div
              onClick={() => { setShowYoutubeOverlay(true); }}
              className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4"
            >
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Josefin_Sans',sans-serif]">YouTube</span>
              <YouTubeIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300 text-red-600" />
            </div>
          </div>
        )}

        {effectiveDescription && (
          <DescriptionPlusButton html={effectiveDescription} businessName={businessName} isOpen={descOverlayOpen} onOpenChange={setDescOverlayOpen} />
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
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              />
            ) : (
              <iframe
                ref={iframeRef}
                key={videoId || videoUrl}
                src={embedUrl}
                className="w-full h-full pointer-events-none"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            )}
            {videoId && (
              <GenericVideoTimelineOverlay genericVideoId={videoId} currentTime={currentTime} />
            )}
            {agendaCity && (

              <div className="absolute inset-0 z-[20] flex justify-center px-4 py-16 bg-black/85 backdrop-blur-sm">
                <div className="w-full max-w-md bg-black/70 backdrop-blur-md rounded-xl border border-white/15 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
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
                                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
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
                                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
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
          <div className={`absolute inset-0 z-30 pointer-events-none ${descOverlayOpen ? "hidden" : ""}`}>
            <div className="fixed lg:absolute inset-x-0 bottom-[3.75rem] lg:bottom-[5.5rem] z-30 px-4 flex flex-col items-center justify-end gap-3 pointer-events-none">
              {effectiveDescription && (
                <DescriptionPlusInlineButton
                  key={`desc-plus-${videoId || videoUrl}`}
                  onOpen={() => setDescOverlayOpen(true)}
                />
              )}
              {compactBusinessHeader && (
                <YouTubeIcon className="h-10 w-10 text-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              )}
              {/* Bloc crédit unifié — priorité : social > owner > eventBusiness (mutuellement exclusifs) */}
              {(() => {
                if (visibleSocial) {
                  return (
                    <div
                      key={`credit-social-${videoId || videoUrl}`}
                      className="flex flex-col items-center justify-center gap-2 px-4 pointer-events-none"
                    >
                      {visibleSocial.platform === "instagram" && <InstagramIcon className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                      {visibleSocial.platform === "tiktok" && <SiTiktok className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                      {visibleSocial.platform === "youtube" && <Youtube className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
                      <a
                        href={visibleSocial.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto hover:bg-black/80 transition-colors"
                      >
                        <span className="text-xs font-medium text-white" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                          Follow @{visibleSocial.account}
                        </span>
                      </a>
                    </div>
                  );
                }
                if (owner && owner.name) {
                  return (
                    <div
                      key={`credit-owner-${videoId || videoUrl}`}
                      className="flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
                    >
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
                      <span className="text-xs font-medium text-white" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                        {owner.name} ©
                      </span>
                    </button>
                    </div>
                  );
                }
                if (!owner && eventId && (eventBusiness || eventInfo)) {
                  const eventName = eventBusiness?.name || eventInfo?.name;
                  if (!eventName) return null;
                  return (
                    <div
                      key={`credit-event-${eventId}`}
                      className="flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
                    >
                      <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto select-text">
                        <span className="text-xs font-medium text-white select-text" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                          {eventName} <span className="text-base">©</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {ctaBusiness && !compactBusinessHeader && (
                <div className="w-4/5 max-w-md pointer-events-auto flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      storeReturnToTest();
                      const url = await buildKpSearchUrl(ctaBusiness.id);
                      navigate(url);
                    }}
                    className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-white text-black font-medium text-xs shadow-lg hover:bg-white/90 transition-colors normal-case tracking-normal h-9"
                    style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate">En savoir +</span>
                  </button>
                  {ctaBusiness.latitude && ctaBusiness.longitude && (
                    <button
                      type="button"
                      onClick={() => setDirectionsBusiness(ctaBusiness)}
                      className="flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-gold text-gold-foreground font-medium text-xs shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal h-9"
                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
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
                onAiOverlayChange={setAiOverlayOpen}
                onHashtagsOverlayChange={setHashtagsOverlayOpen}
                onSearch={(params) => {
                  const sp = new URLSearchParams(params);
                  navigate(`/search?${sp.toString()}`);
                }}
                onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
                leadingControls={
                  embed.type === "file" ? (
                    <VideoControls
                      type="file"
                      videoRef={videoRef}
                      paused={filePaused}
                      muted={fileMuted}
                    />
                  ) : embed.type === "youtube" ? (
                    <VideoControls
                      type="youtube"
                      iframeRef={iframeRef}
                      playing={ytPlaying}
                      muted={ytMuted}
                      onPlayingChange={setYtPlaying}
                      onMutedChange={(m) => { setYtMuted(m); setSoundOn(!m); }}
                    />
                  ) : undefined
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
    <span
      className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white flex items-center justify-center transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
      style={{ backgroundColor: '#25D366' }}
    >
      <span className="text-xl md:text-2xl text-white font-light leading-none">+</span>
    </span>
  </button>
);

const DescriptionPlusButton = ({ html, businessName, isOpen, onOpenChange }: { html: string; businessName: string; isOpen: boolean; onOpenChange: (v: boolean) => void }) => {
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
    <OverlayShell zClass="z-[80]" animClass="animate-zoom-out-center" className="flex flex-col">
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
        <h2 className="text-sm font-bold font-['Josefin_Sans',sans-serif] truncate text-white flex-1">{businessName}</h2>
      </div>
      <div className="relative z-10 flex-1 min-h-0 order-[-1] overflow-y-auto overscroll-contain">
        <div className="px-4 pt-4 pb-6 md:pl-6 md:pt-6 pr-14 md:pr-16">
          <div
            className="prose prose-invert prose-base max-w-none break-words text-base leading-[1.625] font-['Roboto',sans-serif] prose-josefin-headings prose-h2:text-base md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl card1-headings !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h3]:!font-bold [&_p:empty]:min-h-[1em] [&_img]:max-w-full [&_img]:rounded-md prose-strong:!text-white"
            dangerouslySetInnerHTML={{ __html: groupImagesWithHeadings(html).replace(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}])/gu, '<span style="font-size:1.6em;line-height:1;vertical-align:middle">$1</span>') }}
          />
        </div>
      </div>
    </OverlayShell>
  );
};

export default SlidePanelHome;
