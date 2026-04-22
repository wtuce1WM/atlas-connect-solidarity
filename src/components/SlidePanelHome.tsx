import { useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { getVideoEmbed } from "@/lib/videoEmbed";
import PanelSearchBar from "@/components/PanelSearchBar";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { useNavigate } from "react-router-dom";

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
}

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
}: SlidePanelHomeProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

        <div className="relative w-full h-full">
          <div className="relative bg-black overflow-hidden w-full h-full">
            {embed.type === "file" ? (
              <video
                key={videoId || videoUrl}
                src={videoUrl}
                controls
                loop
                playsInline
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              />
            ) : (
              <iframe
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
            {owner && (
              <div
                key={`owner-overlay-${videoId || videoUrl}`}
                className="absolute inset-x-0 bottom-20 z-[6] flex flex-col items-center justify-center gap-3 px-4 pointer-events-none"
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
                <div className="animate-cta-zoom-in flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5">
                  <span className="text-xs font-medium text-white" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                    {owner.name} <span className="text-base">©</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-16 z-10 p-4 flex flex-col items-center gap-2 pointer-events-none">
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

export default SlidePanelHome;
