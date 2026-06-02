import { X } from "lucide-react";
import { getVideoInfo } from "@/lib/overlayConstants";

interface FullscreenVideoOverlayProps {
  videoUrl: string;
  onClose: () => void;
}

const FullscreenVideoOverlay = ({ videoUrl, onClose }: FullscreenVideoOverlayProps) => {
  const info = getVideoInfo(videoUrl);
  let embedSrc = videoUrl;
  if (info.type === "youtube") embedSrc = `https://www.youtube-nocookie.com/embed/${info.id}?autoplay=1&rel=0&controls=1&modestbranding=1`;
  else if (info.type === "vimeo") embedSrc = `https://player.vimeo.com/video/${info.id}?autoplay=1`;

  return (
    <div className="absolute inset-0 z-[76] bg-black flex flex-col animate-slide-in-left">
      <div className="shrink-0 flex items-center px-3 py-2">
        <button
          onClick={onClose}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {info.type === "file" ? (
          <video src={videoUrl} className="w-full h-full object-contain" autoPlay controls playsInline />
        ) : (
          <iframe
            src={embedSrc}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            frameBorder="0"
            style={{ border: 0 }}
          />
        )}
      </div>
    </div>
  );
};

export default FullscreenVideoOverlay;
