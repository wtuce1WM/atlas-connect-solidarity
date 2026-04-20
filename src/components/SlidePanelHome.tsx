import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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

  const embed = getVideoEmbed(videoUrl, window.location.origin, { autoplay: true });
  let embedUrl = embed.embedUrl;
  if (embed.type === "youtube") {
    const ytId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
    embedUrl = embedUrl.replace("loop=0", `loop=1&playlist=${ytId}`);
  } else if (embed.type === "vimeo") {
    embedUrl = embedUrl.replace("loop=0", "loop=1");
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
        className="absolute right-0 top-0 h-full w-full bg-background border-l border-border shadow-2xl animate-slide-in-right overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-2 p-6 pb-24">
          <div
            className="relative bg-black rounded-lg overflow-hidden shadow-lg w-full aspect-[9/16]"
            style={{ maxWidth: 720, maxHeight: "calc(100vh - 120px)" }}
          >
            {embed.type === "file" ? (
              <video
                key={videoId || videoUrl}
                src={videoUrl}
                controls
                autoPlay
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
          </div>
          <p className="text-sm font-medium text-foreground">{businessName}</p>

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
    </div>,
    document.body,
  );
};

export default SlidePanelHome;
