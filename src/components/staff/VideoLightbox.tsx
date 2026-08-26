import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getVideoEmbed } from "@/lib/videoEmbed";

interface VideoLightboxProps {
  url: string;
  onClose: () => void;
}

const VideoLightbox = ({ url, onClose }: VideoLightboxProps) => {
  const embed = getVideoEmbed(url, window.location.origin);
  const isEmbed = embed.type !== "file";
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Verrouille le scroll du body sans déplacer la position de défilement du formulaire derrière.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, []);

  // Lecture automatique des fichiers vidéo internes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 text-white hover:text-white/80 z-10"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </button>
      <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
        {isEmbed ? (
          <iframe
            src={embed.embedUrl}
            className="w-full h-full rounded-lg"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            title="Lecteur vidéo"
          />
        ) : (
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay
            className="w-full h-full object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default VideoLightbox;
