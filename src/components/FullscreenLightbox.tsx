import { createPortal } from "react-dom";
import { useRef } from "react";
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

  const prev = () => onIndexChange(currentIndex === 0 ? count - 1 : currentIndex - 1);
  const next = () => onIndexChange(currentIndex === count - 1 ? 0 : currentIndex + 1);

  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); prev(); };
  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); next(); };

  // Horizontal swipe (thumb) — mobile/tablet
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const handled = useRef(false);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    handled.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (handled.current || startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (count > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      handled.current = true;
      if (dx < 0) next(); else prev();
    } else if (count > 1 && Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      handled.current = true;
      if (dy < 0) next(); else prev();
    }
  };
  const onTouchEnd = () => { startX.current = null; startY.current = null; handled.current = false; };

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
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-6 left-6 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-lg"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
      {renderMedia()}
      {count > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-lg"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-lg"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
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
