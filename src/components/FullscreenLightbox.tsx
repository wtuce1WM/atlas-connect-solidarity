import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaItem {
  type: "image" | "video" | "matterport";
  src: string;
  alt?: string;
}

interface FullscreenLightboxProps {
  items: MediaItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const FullscreenLightbox = ({ items, currentIndex, onIndexChange, onClose }: FullscreenLightboxProps) => {
  if (items.length === 0) return null;

  const count = items.length;
  const current = items[currentIndex] || items[0];

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(currentIndex === 0 ? count - 1 : currentIndex - 1);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(currentIndex === count - 1 ? 0 : currentIndex + 1);
  };

  const renderMedia = () => {
    if (current.type === "matterport") {
      return (
        <iframe
          src={current.src}
          className="w-[95%] h-[90vh]"
          allow="fullscreen; vr; xr"
          allowFullScreen
          frameBorder="0"
          title={current.alt || "Visite 3D"}
          onClick={(e: any) => e.stopPropagation()}
        />
      );
    }

    if (current.type === "video") {
      const url = current.src;
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
      if (ytMatch) {
        const isShort = /\/shorts\//.test(url);
        return (
          <div
            className={`relative overflow-hidden ${isShort ? "h-[70vh] aspect-[9/16]" : "w-[90%] max-h-[90vh] aspect-video"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${ytMatch[1]}&rel=0&controls=1&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&fs=0`}
              className="w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        );
      }
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1`}
            className="w-[90%] max-h-[90vh] aspect-video"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            frameBorder="0"
            onClick={(e: any) => e.stopPropagation()}
          />
        );
      }
      return (
        <video src={url} autoPlay controls loop playsInline className="max-w-[90%] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
      );
    }

    return (
      <img
        src={current.src}
        alt={current.alt || ""}
        className="max-w-[90%] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-6 left-6 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-lg"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
      {renderMedia()}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-sm text-white">
          {currentIndex + 1} / {count}
        </div>
      )}
    </div>,
    document.body
  );
};

export default FullscreenLightbox;
export type { MediaItem };
