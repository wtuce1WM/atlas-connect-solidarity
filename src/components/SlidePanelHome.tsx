import { useEffect, useRef, useState, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronUp, ChevronDown, Youtube, MapPin, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { SiTiktok } from "react-icons/si";
import { createPortal } from "react-dom";
import { getVideoEmbed } from "@/lib/videoEmbed";
import PanelSearchBar from "@/components/PanelSearchBar";
import VideoControls from "@/components/VideoControls";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { useNavigate } from "react-router-dom";
import { LazyDirectionsOverlay } from "@/components/overlays/LazyOverlays";
import { businessUrl } from "@/lib/businessUrl";

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
  owner?: { id: string; name: string; logo_url: string | null } | null;
  social?: SocialInfo | null;
  description?: string | null;
  /** When set, displays the list of events for this city (Agenda card) */
  agendaCity?: string | null;
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
  description,
  agendaCity,
}: SlidePanelHomeProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [directionsBusiness, setDirectionsBusiness] = useState<AgendaEvent["business"] | null>(null);

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
        .select("id, name, start_date, end_date, hook, logo_url, default_business_id")
        .eq("city_id", cityRow.id)
        .or(`end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}),and(start_date.is.null,end_date.is.null)`)
        .order("start_date", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      const rows = (data as any[]) || [];
      const bizIds = Array.from(new Set(rows.map((r) => r.default_business_id).filter(Boolean)));
      const bizMap = new Map<string, AgendaEvent["business"]>();
      if (bizIds.length > 0) {
        const { data: bizRows } = await supabase
          .from("businesses")
          .select("id, slug, name, address, latitude, longitude, phone, city, logo_url")
          .in("id", bizIds);
        ((bizRows as any[]) || []).forEach((b) => bizMap.set(b.id, b as any));
      }
      if (cancelled) return;
      setAgendaEvents(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          start_date: r.start_date,
          end_date: r.end_date,
          hook: r.hook,
          logo_url: r.logo_url,
          business: r.default_business_id ? bizMap.get(r.default_business_id) || null : null,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [open, agendaCity]);

  const [filePaused, setFilePaused] = useState(true);
  const [fileMuted, setFileMuted] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytMuted, setYtMuted] = useState(false);

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
    const onPlay = () => setFilePaused(false);
    const onPause = () => setFilePaused(true);
    const onVol = () => setFileMuted(v.muted);
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
  }, [videoUrl, videoId]);

  if (!open || !videoUrl) return null;

  const embed = getVideoEmbed(videoUrl, window.location.origin, { autoplay: false, defaultSoundOn: true });
  let embedUrl = embed.embedUrl;
  if (embed.type === "youtube") {
    const ytId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
    embedUrl = embedUrl.replace("loop=0", `loop=1&playlist=${ytId}`).replace(/[?&]mute=1/, (m) => m[0] + "mute=0");
  } else if (embed.type === "vimeo") {
    embedUrl = embedUrl.replace("loop=0", "loop=1").replace("muted=1", "muted=0");
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
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

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

        {social && description && (
          <DescriptionPlusButton html={description} businessName={businessName} />
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
            {owner && !social && (
              <div
                key={`owner-overlay-${videoId || videoUrl}`}
                className="absolute inset-x-0 bottom-40 z-[6] flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
              >
                {owner.logo_url && (
                  <div className="animate-logo-big-full-reveal max-w-[140px] max-h-[110px] md:max-w-[240px] md:max-h-[160px]">
                    <img
                      src={owner.logo_url}
                      alt={owner.name}
                      className="w-full h-auto max-w-full max-h-[110px] md:max-h-[160px] object-contain"
                      style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                    />
                  </div>
                )}
                <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto select-text">
                  <span className="text-xs font-medium text-white select-text" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                    {owner.name} <span className="text-base">©</span>
                  </span>
                </div>
              </div>
            )}
            {social && (
              <div
                key={`social-overlay-${videoId || videoUrl}`}
                className="absolute inset-x-0 bottom-40 z-[6] flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
              >
                <a
                  href={social.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="animate-logo-big-full-reveal pointer-events-auto flex flex-col items-center gap-2 text-white"
                  style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                >
                  {social.platform === "instagram" && <InstagramIcon className="h-16 w-16 md:h-20 md:w-20" />}
                  {social.platform === "youtube" && <Youtube className="h-16 w-16 md:h-20 md:w-20" />}
                  {social.platform === "tiktok" && <SiTiktok className="h-14 w-14 md:h-[72px] md:w-[72px]" />}
                </a>
                <a
                  href={social.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 pointer-events-auto hover:bg-black/80 transition-colors"
                >
                  <span className="text-xs font-medium text-white" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                    Follow @{social.account}
                  </span>
                </a>
              </div>
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
                      agendaEvents.map((ev) => (
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
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-0 z-10 p-4 flex flex-col items-center justify-end gap-3 pointer-events-none">
            {embed.type === "file" && (
              <div className="pointer-events-auto">
                <VideoControls
                  type="file"
                  videoRef={videoRef}
                  paused={filePaused}
                  muted={fileMuted}
                />
              </div>
            )}
            {embed.type === "youtube" && (
              <div className="pointer-events-auto">
                <VideoControls
                  type="youtube"
                  iframeRef={iframeRef}
                  playing={ytPlaying}
                  muted={ytMuted}
                  onPlayingChange={setYtPlaying}
                  onMutedChange={setYtMuted}
                />
              </div>
            )}
            <p className="text-sm font-medium text-white pointer-events-auto">{businessName}</p>
            <div className="w-full max-w-xl pointer-events-auto">
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
      </div>
    </div>,
    document.body,
  );
};

const DescriptionPlusButton = ({ html, businessName }: { html: string; businessName: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[18.75rem] z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex flex-col items-center gap-2"
          aria-label="Voir la description"
        >
          <span
            className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
            style={{ backgroundColor: '#25D366' }}
          >
            <span className="text-2xl text-white font-light leading-none">+</span>
          </span>
        </button>
      </div>
      {open && (
        <div className="absolute inset-0 z-[40] flex flex-col bg-black/90 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent border-b border-white/10">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
