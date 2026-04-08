import { X } from "lucide-react";

type MediaItem = { kind: "video"; url: string; thumbnailUrl?: string | null } | { kind: "image"; url: string } | { kind: "matterport"; url: string };

interface MosaicOverlayProps {
  mediaItems: MediaItem[];
  onClose: () => void;
  onOpenLightbox: (index: number) => void;
  headerVariant?: "standard" | "immersive";
}

const MosaicOverlay = ({
  mediaItems,
  onClose,
  onOpenLightbox,
  headerVariant = "standard",
}: MosaicOverlayProps) => {
  const imageItems = mediaItems.filter(item => item.kind === "image");
  const isImmersiveHeader = headerVariant === "immersive";

  const headerClass = isImmersiveHeader
    ? "sticky top-0 z-10 flex items-center bg-black px-2 py-2"
    : "sticky top-0 z-10 p-2 pt-14 lg:pt-2";

  const buttonClass = isImmersiveHeader
    ? "flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
    : "h-9 w-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg";

  const gridClass = isImmersiveHeader
    ? "grid grid-cols-2 gap-2 p-2 pt-0"
    : "grid grid-cols-2 gap-2 p-2 -mt-2";

  return (
    <div className="absolute inset-0 z-[76] overflow-hidden">
      <div className="absolute inset-0 bg-black overflow-y-auto animate-slide-in-left">
        <div className={headerClass}>
          <button
            onClick={onClose}
            className={buttonClass}
            aria-label="Fermer la mosaïque"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={gridClass}>
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
