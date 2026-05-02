import { useEffect, useRef, useState, Suspense } from "react";
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
import { businessUrl, buildOgShareUrl } from "@/lib/businessUrl";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import BusinessHeader from "@/components/slidepanel/BusinessHeader";
import ShareButton from "@/components/ShareButton";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import { Phone } from "lucide-react";

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
  /** When set, displays the list of events for this city (Agenda card) */
  agendaCity?: string | null;
  /** When set, displays CTAs for the event's linked business (via event_businesses) */
  eventId?: string | null;
  /** Serialized Test page context used to restore the previous result state after closing an establishment panel */
  returnContext?: string | null;
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
  agendaCity,
  eventId,
  returnContext,
}: SlidePanelHomeProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [directionsBusiness, setDirectionsBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [eventBusiness, setEventBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [businessDescription, setBusinessDescription] = useState<string | null>(null);

  // Fallback: if no per-video description was provided, fetch the linked business description
  // so the green "+" overlay can still render in SlidePanelHome.
  useEffect(() => {
    if (description && description.trim()) { setBusinessDescription(null); return; }
    const ownerId = owner?.id;
    if (!open || !ownerId) { setBusinessDescription(null); return; }
    let cancelled = false;
    (supabase as any)
      .from("businesses")
      .select("description")
      .eq("id", ownerId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled) setBusinessDescription(data?.description ?? null);
      });
    return () => { cancelled = true; };
  }, [open, owner?.id, description]);

  const effectiveDescription = (description && description.trim()) ? description : businessDescription;
  const [descOverlayOpen, setDescOverlayOpen] = useState(false);
  useEffect(() => { if (!open) setDescOverlayOpen(false); }, [open]);
  const [ownerBusiness, setOwnerBusiness] = useState<AgendaEvent["business"] | null>(null);
  const [eventInfo, setEventInfo] = useState<{ name: string; logo_url: string | null } | null>(null);

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
          .select("name, logo_url")
          .eq("id", eventId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setEventInfo(evRow ? { name: (evRow as any).name, logo_url: (evRow as any).logo_url } : null);
      const bizId = ((ebRows as any[]) || [])[0]?.business_id;
      if (!bizId) { setEventBusiness(null); return; }
      const { data: bizRow } = await supabase
        .from("businesses")
        .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg")
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
        .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg")
        .eq("id", owner.id)
        .maybeSingle();
      if (cancelled) return;
      setOwnerBusiness((bizRow as any) || null);
    })();
    return () => { cancelled = true; };
  }, [open, eventId, isGeneric, owner?.id]);

  const ctaBusiness = eventBusiness || ownerBusiness;
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
          .select("id, slug, name, address, latitude, longitude, phone, city, logo_url, neighborhood, whatsapp, logo_bg")
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
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytMuted, setYtMuted] = useState(!soundOn);

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

  if (!open || !videoUrl) return null;

  const visibleSocial = showSocialBadge ? social : null;

  const embed = getVideoEmbed(videoUrl, window.location.origin, { autoplay: false, defaultSoundOn: soundOn });
  let embedUrl = embed.embedUrl;
  if (embed.type === "youtube") {
    const ytId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
    embedUrl = embedUrl.replace("loop=0", `loop=1&playlist=${ytId}`);
    if (soundOn) {
      embedUrl = embedUrl.replace(/[?&]mute=1/, (m) => m[0] + "mute=0");
    }
  } else if (embed.type === "vimeo") {
    embedUrl = embedUrl.replace("loop=0", "loop=1");
    if (soundOn) embedUrl = embedUrl.replace("muted=1", "muted=0");
  } else if (embed.type === "bunny") {
    embedUrl = embedUrl.replace("loop=false", "loop=true");
  }

  return createPortal(
    <div className="fixed inset-y-0 right-0 w-full lg:w-1/2 z-[60]"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full bg-background border-l border-border shadow-2xl animate-slide-in-right overflow-hidden"
      >
        {/* Top toolbar : close + WhatsApp/Phone + Share */}
        {!descOverlayOpen && (
        <div className="absolute top-0 left-0 right-0 z-[70] flex items-center justify-between px-4 py-2 pointer-events-none">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-2xl hover:bg-white/90 transition-opacity"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pointer-events-auto flex items-center gap-6">
            {ctaBusiness?.whatsapp ? (
              <a
                href={whatsappUrl(ctaBusiness.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 flex items-center justify-center rounded-full text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#25D366" }}
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            ) : ctaBusiness?.phone ? (
              <a
                href={`tel:${ctaBusiness.phone}`}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
                aria-label="Appeler"
              >
                <Phone className="h-4 w-4" />
              </a>
            ) : null}
          </div>
          <div className="pointer-events-auto">
            {ctaBusiness && (
              <ShareButton
                title={ctaBusiness.name || businessName}
                variant="dark"
                className="shrink-0"
                shareUrl={ctaBusiness.slug ? buildOgShareUrl(ctaBusiness.slug) : undefined}
              />
            )}
          </div>
        </div>
        )}

        {/* BusinessHeader: Logo + Nom + Ville + Quartier + Adresse */}
        {!descOverlayOpen && ctaBusiness && (
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
            />
          </div>
        )}

        {(onPrev || onNext) && (
          <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10 flex flex-col gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              aria-label="Vidéo précédente"
            >
              <ChevronUp className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              aria-label="Vidéo suivante"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>
        )}

        {effectiveDescription && (
          <DescriptionPlusButton html={effectiveDescription} businessName={businessName} isOpen={descOverlayOpen} onOpenChange={setDescOverlayOpen} />
        )}


        <div className="relative w-full h-full">
          <div className="relative bg-black overflow-hidden w-full h-full">
            {embed.type === "file" ? (
              <video
                ref={videoRef}
                key={videoId || videoUrl}
                src={videoUrl}
                loop
                playsInline
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              />
            ) : (
              <iframe
                ref={iframeRef}
                key={videoId || videoUrl}
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            )}
            {isGeneric && videoId && (
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
                                      onClick={() => {
                                        storeReturnToTest();
                                        navigate(businessUrl(biz));
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
          <div className={`absolute inset-x-0 bottom-0 top-0 z-30 p-4 flex flex-col items-center justify-end gap-3 pointer-events-none ${descOverlayOpen ? "hidden" : ""}`}>
            {effectiveDescription && (
              <DescriptionPlusInlineButton
                key={`desc-plus-${videoId || videoUrl}`}
                onOpen={() => setDescOverlayOpen(true)}
              />
            )}
            {/* Bloc crédit unifié — priorité : social > owner > eventBusiness (mutuellement exclusifs) */}
            {(() => {
              if (visibleSocial) {
                return (
                  <div
                    key={`credit-social-${videoId || videoUrl}`}
                    className="flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
                  >
                    <a
                      href={visibleSocial.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-logo-big-full-reveal pointer-events-auto flex flex-col items-center gap-2 text-white"
                      style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                    >
                      {visibleSocial.platform === "instagram" && <InstagramIcon className="h-16 w-16 md:h-20 md:w-20" />}
                      {visibleSocial.platform === "youtube" && <Youtube className="h-16 w-16 md:h-20 md:w-20" />}
                      {visibleSocial.platform === "tiktok" && <SiTiktok className="h-14 w-14 md:h-[72px] md:w-[72px]" />}
                    </a>
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
                  {owner.logo_url && (
                    <div className="animate-logo-big-full-reveal flex items-center justify-center">
                      <img
                        src={owner.logo_url}
                        alt={owner.name}
                        className="w-auto h-auto max-w-[140px] max-h-[110px] md:max-w-[140px] md:max-h-[110px] object-contain"
                        style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                      />
                    </div>
                  )}
                  <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto select-text">
                    <span className="text-xs font-medium text-white select-text" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                      {businessName || owner.name} <span className="text-base">©</span>
                    </span>
                  </div>
                  </div>
                );
              }
              if (!owner && eventId && (eventBusiness || eventInfo)) {
                const eventName = eventBusiness?.name || eventInfo?.name;
                if (!eventBusiness?.logo_url && !eventName) return null;
                return (
                  <div
                    key={`credit-event-${eventId}`}
                    className="flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
                  >
                    {eventBusiness?.logo_url ? (
                      <div className="animate-logo-big-full-reveal flex items-center justify-center">
                        <img
                          src={eventBusiness.logo_url}
                          alt={eventBusiness.name}
                          className="w-auto h-auto max-w-[140px] max-h-[110px] md:max-w-[140px] md:max-h-[110px] object-contain"
                          style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                        />
                      </div>
                    ) : (
                      <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto select-text">
                        <span className="text-xs font-medium text-white select-text" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                          {eventName} <span className="text-base">©</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            {ctaBusiness && (
              <>
                
                <div className="w-4/5 max-w-md pointer-events-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      storeReturnToTest();
                      navigate(businessUrl(ctaBusiness));
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
              </>
            )}
            {embed.type === "file" && (
              <div className="pointer-events-auto mb-8">
                <VideoControls
                  type="file"
                  videoRef={videoRef}
                  paused={filePaused}
                  muted={fileMuted}
                />
              </div>
            )}
            {embed.type === "youtube" && (
              <div className="pointer-events-auto mb-8">
                <VideoControls
                  type="youtube"
                  iframeRef={iframeRef}
                  playing={ytPlaying}
                  muted={ytMuted}
                  onPlayingChange={setYtPlaying}
                  onMutedChange={(m) => { setYtMuted(m); setSoundOn(!m); }}
                />
              </div>
            )}
            <div className="w-full max-w-xl pointer-events-auto mt-2">
              <PanelSearchBar
                iconVariant="black"
                onSearch={(params) => {
                  const sp = new URLSearchParams(params);
                  navigate(`/search?${sp.toString()}`);
                }}
                onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
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
      className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
      style={{ backgroundColor: '#25D366' }}
    >
      <span className="text-2xl text-white font-light leading-none">+</span>
    </span>
  </button>
);

const DescriptionPlusButton = ({ html, businessName, isOpen, onOpenChange }: { html: string; businessName: string; isOpen: boolean; onOpenChange: (v: boolean) => void }) => {
  const open = isOpen;
  const setOpen = onOpenChange;
  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-[40] flex flex-col bg-black/90 backdrop-blur-sm animate-fade-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent border-b border-white/10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpen(false);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold uppercase truncate text-white flex-1" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              {businessName}
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6">
            <div
              className="prose prose-invert max-w-3xl mx-auto text-white text-base md:text-lg leading-relaxed select-text"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SlidePanelHome;
