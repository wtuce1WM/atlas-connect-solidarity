import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown, Play } from "lucide-react";
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

/** Extract a YouTube thumbnail fallback from URL */
function getYouTubeThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * Overlay style C: vertical carousel of long-form (horizontal 16:9) external videos.
 * Navigation: vertical snap scroll, chevrons (desktop), thumbnail strip (right), keyboard arrows, dot indicators (mobile).
 */
const ExternalVideosOverlay = ({ videos, businessName, onClose }: ExternalVideosOverlayProps) => {
  const { language } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Track which slide is in view (snap-based)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActiveIndex(idx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(videos.length - 1, i));
    el.scrollTo({ top: clamped * el.clientHeight, behavior: "smooth" });
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowRight") {
        e.preventDefault();
        goTo(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ArrowLeft") {
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

  // Pre-compute embeds
  const embeds = useMemo(
    () => videos.map((v) => getVideoEmbed(v.url, origin, { background: false, autoplay: true })),
    [videos, origin]
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
            {videos[activeIndex]?.name?.trim() || businessName || (language === "en" ? "Videos" : "Vidéos")}
          </p>
          <span className="text-[11px] text-white/60 tabular-nums shrink-0">
            {activeIndex + 1}/{videos.length}
          </span>
        </div>
      </div>

      {/* Vertical snap scroller */}
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {videos.map((v, i) => {
          const embed = embeds[i];
          const shouldMount = Math.abs(i - activeIndex) <= 1;
          return (
            <div
              key={`${v.url}-${i}`}
              className="w-full h-full snap-start flex items-center justify-center px-4 py-4 md:pr-32"
              style={{ height: "100%" }}
            >
              <div className="w-full max-w-5xl aspect-video relative rounded-xl overflow-hidden bg-black shadow-2xl">
                {shouldMount ? (
                  <iframe
                    key={v.url}
                    src={i === activeIndex ? embed.embedUrl : embed.embedUrl.replace("autoplay=1", "autoplay=0")}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    frameBorder={0}
                    title={v.name || `video-${i}`}
                  />
                ) : v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.name || ""} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical nav buttons (desktop) */}
      {videos.length > 1 && (
        <>
          <button
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-20 transition-colors"
            aria-label={language === "en" ? "Previous video" : "Vidéo précédente"}
          >
            <ChevronUp className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === videos.length - 1}
            className="hidden md:flex absolute left-6 top-1/2 translate-y-[calc(50%+12px)] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-20 transition-colors"
            aria-label={language === "en" ? "Next video" : "Vidéo suivante"}
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </button>

          {/* Thumbnail strip (desktop, right side) */}
          <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 flex-col gap-2 max-h-[80vh] overflow-y-auto scrollbar-none z-20 p-2 rounded-xl bg-black/40 backdrop-blur-sm">
            {videos.map((v, i) => {
              const thumb = v.thumbnail_url || getYouTubeThumb(v.url);
              const isActive = i === activeIndex;
              return (
                <button
                  key={`thumb-${v.url}-${i}`}
                  onClick={() => goTo(i)}
                  className={`relative w-24 aspect-video rounded-md overflow-hidden flex-shrink-0 transition-all ${
                    isActive ? "ring-2 ring-white scale-105" : "ring-1 ring-white/20 opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`${language === "en" ? "Go to video" : "Aller à la vidéo"} ${i + 1}`}
                >
                  {thumb ? (
                    <img src={thumb} alt={v.name || `video-${i}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded tabular-nums">
                    {i + 1}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dots indicator (mobile) */}
          <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-3 py-2 rounded-full bg-black/50 backdrop-blur-sm">
            {videos.map((_, i) => (
              <button
                key={`dot-${i}`}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all ${
                  i === activeIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
                }`}
                aria-label={`${language === "en" ? "Go to video" : "Aller à la vidéo"} ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </OverlayShell>
  );
};

export default ExternalVideosOverlay;
