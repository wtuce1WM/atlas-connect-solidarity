import { useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { getVideoEmbed } from "@/lib/videoEmbed";

interface VideoLightboxProps {
  url: string;
  onClose: () => void;
}

const VideoLightbox = ({ url, onClose }: VideoLightboxProps) => {
  const embed = getVideoEmbed(url, window.location.origin);
  const isEmbed = embed.type !== "file";
  const mediaRef = useRef<HTMLVideoElement | HTMLIFrameElement | null>(null);

  // Verrouille le scroll dès la première paint pour éviter le saut du formulaire derrière.
  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  // Empêche le focus automatique de faire défiler la page jusqu'à l'élément média.
  useLayoutEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const preventScroll = (e: Event) => {
      e.preventDefault?.();
      window.scrollTo({ top: window.scrollY });
    };
    el.addEventListener("focus", preventScroll, { passive: false } as EventListenerOptions);
    return () => el.removeEventListener("focus", preventScroll);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white hover:text-white/80 z-10" onClick={onClose}>
        <X className="h-8 w-8" />
      </button>
      <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
        {isEmbed ? (
          <iframe
            ref={mediaRef as React.RefObject<HTMLIFrameElement>}
            src={embed.embedUrl}
            className="w-full h-full rounded-lg"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            tabIndex={-1}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={url}
            controls
            autoPlay
            tabIndex={-1}
            className="w-full h-full object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
};

export default VideoLightbox;
