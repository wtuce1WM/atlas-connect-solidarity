import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
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

/**
 * Overlay style C: vertical carousel of long-form (horizontal 16:9) external videos.
 * One video fills the viewport at a time; user scrolls/swipes vertically between videos.
 * Each video gets its own iframe (mounted on demand for the active +/- 1 to limit memory).
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
          // Mount iframes only for active +/- 1 to keep memory/network controlled
          const shouldMount = Math.abs(i - activeIndex) <= 1;
          return (
            <div
              key={`${v.url}-${i}`}
              className="w-full h-full snap-start flex items-center justify-center px-4 py-4"
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
            className="hidden md:flex absolute right-6 top-1/2 -translate-y-[calc(50%+24px)] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-20 transition-colors"
            aria-label={language === "en" ? "Previous video" : "Vidéo précédente"}
          >
            <ChevronUp className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === videos.length - 1}
            className="hidden md:flex absolute right-6 top-1/2 translate-y-[calc(50%-24px)] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center z-20 transition-colors"
            aria-label={language === "en" ? "Next video" : "Vidéo suivante"}
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </button>
        </>
      )}
    </OverlayShell>
  );
};

export default ExternalVideosOverlay;
