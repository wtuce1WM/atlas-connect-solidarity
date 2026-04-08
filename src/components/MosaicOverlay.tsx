import { X } from "lucide-react";

type MediaItem = { kind: "video"; url: string; thumbnailUrl?: string | null } | { kind: "image"; url: string } | { kind: "matterport"; url: string };

interface MosaicOverlayProps {
  mediaItems: MediaItem[];
  onClose: () => void;
  onOpenLightbox: (index: number) => void;
}

const MosaicOverlay = ({ mediaItems, onClose, onOpenLightbox }: MosaicOverlayProps) => {
  const imageItems = mediaItems.filter(item => item.kind === "image");

  return (
    <div className="absolute inset-0 -top-[3.3rem] z-[76] overflow-hidden">
    <div className="absolute inset-0 bg-black overflow-y-auto animate-slide-in-left">
      <div className="sticky top-0 z-10 p-2 pt-2">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg"
          aria-label="Fermer la mosaïque"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 -mt-2">
        {imageItems.map((item, i) => {
          const originalIdx = mediaItems.indexOf(item);
          return (
            <div
              key={`mi-${i}`}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
              onClick={() => onOpenLightbox(originalIdx)}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default MosaicOverlay;
