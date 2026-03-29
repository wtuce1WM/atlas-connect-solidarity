import { X } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";

type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };

interface MosaicOverlayProps {
  mediaItems: MediaItem[];
  onClose: () => void;
  onOpenLightbox: (index: number) => void;
}

const MosaicOverlay = ({ mediaItems, onClose, onOpenLightbox }: MosaicOverlayProps) => {
  return (
    <div className="absolute inset-0 z-[76] bg-black overflow-y-auto animate-slide-in-left">
      <div className="sticky top-0 z-10 p-2">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-500/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-gray-500/90 transition-colors"
          aria-label="Fermer la mosaïque"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 -mt-2">
        {mediaItems.map((item, idx) => {
          if (item.kind === "video") {
            const ytMatch = item.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
            const vimeoMatch = item.url.match(/vimeo\.com\/(\d+)/);
            const thumbnail = ytMatch
              ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
              : vimeoMatch
                ? `https://vumbnail.com/${vimeoMatch[1]}.jpg`
                : null;
            return (
              <div
                key={`mv-${idx}`}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-black/40"
                onClick={() => onOpenLightbox(idx)}
              >
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <VideoThumbnail src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg">▶</span>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div
              key={`mi-${idx}`}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
              onClick={() => onOpenLightbox(idx)}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MosaicOverlay;
