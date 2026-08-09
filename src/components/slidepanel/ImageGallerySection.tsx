import { useState, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGallerySectionProps {
  images: string[];
  language: "fr" | "en" | "ar";
  onOpenImage: (imageUrl: string) => void;
}

const GROUP_SIZE = 5;

const titleByLang = {
  fr: "Images",
  en: "Images",
  ar: "صور",
};

export default function ImageGallerySection({ images, language, onOpenImage }: ImageGallerySectionProps) {
  if (images.length === 0) return null;

  const [groupIndex, setGroupIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);

  const totalGroups = Math.ceil(images.length / GROUP_SIZE);
  const group = useMemo(() => images.slice(groupIndex * GROUP_SIZE, (groupIndex + 1) * GROUP_SIZE), [images, groupIndex]);

  const goGroup = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(totalGroups - 1, groupIndex + dir));
    setGroupIndex(next);
    desktopScrollRef.current?.scrollTo({ left: next * (desktopScrollRef.current.clientWidth || 0), behavior: "smooth" });
  };

  const handleMobileScroll = () => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const slideWidth = el.firstElementChild?.clientWidth || el.clientWidth * 0.85;
    const next = Math.max(0, Math.round(el.scrollLeft / slideWidth));
    if (next !== mobileIndex && next < images.length) setMobileIndex(next);
  };

  const handleDesktopScroll = () => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / (el.clientWidth || 1));
    if (next !== groupIndex && next >= 0 && next < totalGroups) setGroupIndex(next);
  };

  const ImageCard = ({
    url,
    className,
  }: {
    url: string;
    className: string;
  }) => (
    <div
      className={`relative overflow-hidden cursor-zoom-in rounded-lg group ${className}`}
      onClick={() => onOpenImage(url)}
    >
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg" />
    </div>
  );

  // Desktop grid layout for a group of up to 5 images.
  const DesktopGridGroup = ({ group: g }: { group: string[] }) => {
    const len = g.length;
    if (len === 1) {
      return <ImageCard url={g[0]} className="col-span-12 row-span-6" />;
    }
    if (len === 2) {
      return (
        <>
          <ImageCard url={g[0]} className="col-span-8 row-span-6" />
          <ImageCard url={g[1]} className="col-span-4 row-span-6" />
        </>
      );
    }
    if (len === 3) {
      return (
        <>
          <ImageCard url={g[0]} className="col-span-8 row-span-6" />
          <ImageCard url={g[1]} className="col-span-4 row-span-3" />
          <ImageCard url={g[2]} className="col-span-4 row-span-3" />
        </>
      );
    }
    if (len === 4) {
      return (
        <>
          <ImageCard url={g[0]} className="col-span-8 row-span-6" />
          <ImageCard url={g[1]} className="col-span-4 row-span-4" />
          <ImageCard url={g[2]} className="col-span-4 row-span-2" />
          <ImageCard url={g[3]} className="col-span-12 row-span-2" />
        </>
      );
    }
    // len === 5
    return (
      <>
        <ImageCard url={g[0]} className="col-span-8 row-span-6" />
        <ImageCard url={g[1]} className="col-span-4 row-span-4" />
        <ImageCard url={g[2]} className="col-span-4 row-span-3" />
        <ImageCard url={g[3]} className="col-span-5 row-span-3" />
        <ImageCard url={g[4]} className="col-span-3 row-span-2" />
      </>
    );
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <h2 className="text-lg md:text-xl font-bold uppercase text-white font-['Montserrat',sans-serif]">
          {titleByLang[language] || titleByLang.fr}
        </h2>

        <div className="flex items-center gap-3">
          {totalGroups > 1 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => goGroup(-1)}
                disabled={groupIndex === 0}
                className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Groupe précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => goGroup(1)}
                disabled={groupIndex === totalGroups - 1}
                className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Groupe suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
          <span className="hidden md:inline text-sm font-medium text-white/80 font-['Montserrat',sans-serif] tabular-nums">
            {String(groupIndex + 1).padStart(2, "0")} / {String(totalGroups).padStart(2, "0")}
          </span>
          <span className="md:hidden text-sm font-medium text-white/80 font-['Montserrat',sans-serif] tabular-nums">
            {String(mobileIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Mobile : horizontal scroll, one image per slide, edge-to-edge */}
      <div className="md:hidden -mx-4 px-4">
        <HScroll
          onScroll={handleMobileScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 cursor-grab"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {images.map((img, i) => (
            <div
              key={`img-mob-${i}`}
              className="snap-center shrink-0 w-[85vw] h-[55vw] max-h-[60vh] relative overflow-hidden cursor-zoom-in rounded-lg"
              onClick={() => onOpenImage(img)}
            >
              <img src={img} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
            </div>
          ))}
        </HScroll>

        <div className="flex justify-center mt-3">
          <span className="text-xs font-medium text-white/60 font-['Montserrat',sans-serif] tabular-nums">
            {String(mobileIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Desktop : cinematic masonry groups */}
      <div className="hidden md:block overflow-hidden">
        <div
          ref={desktopScrollRef}
          onScroll={handleDesktopScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {Array.from({ length: totalGroups }).map((_, gi) => (
            <div
              key={`img-group-${gi}`}
              className="snap-start shrink-0 w-full"
            >
              <div className="grid grid-cols-12 gap-3 auto-rows-[100px]">
                <DesktopGridGroup group={images.slice(gi * GROUP_SIZE, (gi + 1) * GROUP_SIZE)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
