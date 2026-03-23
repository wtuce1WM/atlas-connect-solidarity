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
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
      if (ytMatch) {
        return (
          <div className="relative w-[90%] max-h-[90vh] aspect-video overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
            <div className="absolute right-0 bottom-0 w-[280px] h-[54px] bg-gradient-to-l from-black via-black to-transparent z-10 pointer-events-none" />
            <div className="absolute left-0 bottom-0 w-[60px] h-[54px] bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${ytMatch[1]}&rel=0&controls=1&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&disablekb=1&fs=0&showinfo=0&autohide=1`}
              className="w-full h-[calc(100%+80px)] -mt-16"
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
        className="absolute top-6 left-6 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/80 text-white hover:bg-black transition-colors shadow-2xl"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
      {renderMedia()}
      {count > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-sm text-white">
            {currentIndex + 1} / {count}
          </div>
        </>
      )}
    </div>,
    document.body
  );
};

export default FullscreenLightbox;
export type { MediaItem };
