import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import OverlayShell from "@/components/overlays/OverlayShell";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ExternalVideoItem {
  url: string;
  name?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
}

interface ExternalVideosOverlayProps {
  videos: ExternalVideoItem[];
  businessName?: string;
  onClose: () => void;
}

function getYouTubeThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * Long-form external videos (mostly YouTube 16:9). Single player on top,
 * horizontal thumbnail carousel pinned to bottom (same pattern as YouTubeOverlay).
 */
const ExternalVideosOverlay = ({ videos, businessName, onClose }: ExternalVideosOverlayProps) => {
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(videos.length - 1, i));
    setActiveIndex(clamped);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goTo(activeIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(activeIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(videos.length - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, videos.length, onClose]);

  // Auto-scroll thumbnail strip to keep active centered
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeEl = strip.querySelector<HTMLElement>(`[data-thumb-idx="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeIndex]);

  const activeVideo = videos[activeIndex];
  const activeEmbed = useMemo(
    () => (activeVideo ? getVideoEmbed(activeVideo.url, origin, { background: false, autoplay: true }) : null),
    [activeVideo, origin]
  );

  if (!videos.length) return null;

  return (
    <OverlayShell zClass="z-[76]" animClass="animate-slide-up-from-bottom" bg="bg-black" className="flex flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 flex-shrink-0 z-20">
        <button
          onClick={onClose}
          className="absolute left-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label={language === "en" ? "Close" : "Fermer"}
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <p className="text-xs text-white font-medium truncate" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {activeVideo?.name?.trim() || businessName || (language === "en" ? "Videos" : "Vidéos")}
          </p>
          <span className="text-[11px] text-white/60 tabular-nums shrink-0">
            {activeIndex + 1}/{videos.length}
          </span>
        </div>
      </div>

      {/* Player area */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 relative">
        <div className={`relative rounded-xl overflow-hidden bg-black shadow-2xl ${activeEmbed?.isVertical ? "h-full aspect-[9/16]" : "w-full max-w-5xl aspect-video"}`}>
          {activeEmbed && (
            <iframe
              key={activeVideo.url}
              src={activeEmbed.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              frameBorder={0}
              title={activeVideo.name || `video-${activeIndex}`}
            />
          )}
        </div>

        {/* Side chevrons (desktop) */}
        {videos.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-10 transition-colors"
              aria-label={language === "en" ? "Previous video" : "Vidéo précédente"}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === videos.length - 1}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-10 transition-colors"
              aria-label={language === "en" ? "Next video" : "Vidéo suivante"}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail carousel — pinned to bottom, grouped: Shorts then Vidéos */}
      {videos.length > 1 && (() => {
        const isShortUrl = (u: string) => /\/shorts\//.test(u);
        const shorts: Array<{ v: ExternalVideoItem; i: number }> = [];
        const longs: Array<{ v: ExternalVideoItem; i: number }> = [];
        videos.forEach((v, i) => (isShortUrl(v.url) ? shorts : longs).push({ v, i }));

        const renderStrip = (items: Array<{ v: ExternalVideoItem; i: number }>, vertical: boolean) => (
          <div
            className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {items.map(({ v, i }) => {
              const thumb = v.thumbnail_url || getYouTubeThumb(v.url);
              const isActive = i === activeIndex;
              return (
                <button
                  key={`thumb-${v.url}-${i}`}
                  data-thumb-idx={i}
                  onClick={() => goTo(i)}
                  className={`relative ${vertical ? "h-20 aspect-[9/16]" : "w-32 md:w-40 aspect-video"} rounded-lg overflow-hidden flex-shrink-0 snap-start transition-all ${
                    isActive ? "ring-2 ring-white scale-[1.02]" : "ring-1 ring-white/20 opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`${language === "en" ? "Go to video" : "Aller à la vidéo"} ${i + 1}`}
                >
                  {thumb ? (
                    <img src={thumb} alt={v.name || `video-${i}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded tabular-nums">
                    {i + 1}
                  </div>
                  {v.name && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1">
                      <p className="text-[10px] text-white truncate" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                        {v.name}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );

        return (
          <div ref={stripRef} className="shrink-0 overflow-hidden px-3 pb-16 pt-2 border-t border-white/10 space-y-3">
            {shorts.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/60 mb-1.5 font-medium" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                  {language === "en" ? "Shorts" : "Shorts"}
                </p>
                {renderStrip(shorts, true)}
              </div>
            )}
            {longs.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/60 mb-1.5 font-medium" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                  {language === "en" ? "Videos" : "Vidéos"}
                </p>
                {renderStrip(longs, false)}
              </div>
            )}
          </div>
        );
      })()}

    </OverlayShell>
  );
};

export default ExternalVideosOverlay;
