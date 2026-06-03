import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import YouTubeShortsCarousel, { type YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import type { BookOnlineBusiness } from "@/hooks/useBookOnlineData";
import OverlayShell from "@/components/overlays/OverlayShell";

interface YouTubeOverlayProps {
  business: BookOnlineBusiness;
  activeVideo: YouTubeVideo | null;
  onSelectVideo: (v: YouTubeVideo | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onClose: () => void;
}

const YouTubeOverlay = ({ business, activeVideo, onSelectVideo, onPlayingChange, onClose }: YouTubeOverlayProps) => {
  const { language } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [allVideos, setAllVideos] = useState<YouTubeVideo[]>([]);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goToOffset = useCallback((offset: number) => {
    if (!activeVideo || allVideos.length === 0) return;
    const idx = allVideos.findIndex((v) => v.videoId === activeVideo.videoId);
    if (idx === -1) return;
    const next = allVideos[idx + offset];
    if (next) onSelectVideo(next);
  }, [activeVideo, allVideos, onSelectVideo]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;
    if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return;
    // Swipe down → next (older), swipe up → previous (newer)
    goToOffset(dy < 0 ? -1 : 1);
  }, [goToOffset]);

  const postCmd = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }, []);

  useEffect(() => {
    if (!activeVideo) return;
    setIsPlaying(true);
    setIsMuted(false);
    const unmute = () => {
      postCmd("unMute");
      postCmd("setVolume", [100]);
      postCmd("playVideo");
    };
    unmute();
    const id = window.setInterval(unmute, 150);
    const stop = window.setTimeout(() => window.clearInterval(id), 2000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [activeVideo?.videoId, postCmd]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      postCmd("pauseVideo");
    } else {
      postCmd("playVideo");
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, postCmd]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      postCmd("unMute");
    } else {
      postCmd("mute");
    }
    setIsMuted((m) => !m);
  }, [isMuted, postCmd]);

  // Reset state when video changes
  const handleSelectVideo = useCallback((v: YouTubeVideo | null) => {
    setIsPlaying(!!v);
    setIsMuted(false);
    onSelectVideo(v);
  }, [onSelectVideo]);

  return (
    <OverlayShell zClass="z-[76]" animClass="animate-slide-up-from-bottom" bg="bg-black" className="flex flex-col">
      {/* Floating close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-3 lg:top-[calc(3.3rem+0.75rem)] z-[100] w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors shadow-lg pointer-events-auto"
        aria-label={language === "en" ? "Close" : "Fermer"}
      >
        <X className="h-5 w-5 text-black" />
      </button>

      {/* Up/Down navigation chevrons (right side) */}
      {activeVideo && allVideos.length > 1 && (() => {
        const idx = allVideos.findIndex((v) => v.videoId === activeVideo.videoId);
        const hasPrev = idx > 0;
        const hasNext = idx >= 0 && idx < allVideos.length - 1;
        return (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 z-[100] flex flex-col gap-2 pointer-events-none">
            <button
              type="button"
              onClick={() => goToOffset(-1)}
              disabled={!hasPrev}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Vidéo précédente"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goToOffset(1)}
              disabled={!hasNext}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Vidéo suivante"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        );
      })()}

      {/* Video title */}
      {activeVideo && (
        <div className="flex-shrink-0 px-16 pt-3 pb-2 flex items-center justify-center">
          <p className="text-xs text-white font-medium text-center line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {activeVideo.title}
          </p>
        </div>
      )}

      {/* Video player area */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {activeVideo ? (
          <>
            <div className={`flex items-center justify-center ${activeVideo.isShort ? "h-full" : "w-full"}`}>
              <div className={`relative ${activeVideo.isShort ? "h-full aspect-[9/16]" : "w-full aspect-video"}`}>
                <iframe
                  ref={iframeRef}
                  key={activeVideo.videoId}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&mute=0&rel=0&controls=1&modestbranding=1&playsinline=1&enablejsapi=1&showinfo=0&iv_load_policy=3`}
                  className="w-full h-full rounded-xl"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                {/* Swipe overlay (mobile/tablet only) — top 75% to leave YT controls usable */}
                <div
                  className="absolute inset-x-0 top-0 h-[75%] lg:hidden z-10"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/50 py-8" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {language === "en" ? "Select a video" : "Sélectionnez une vidéo"}
          </p>
        )}
      </div>


      {/* Carousel — pinned to bottom */}
      <div className="shrink-0 overflow-hidden px-3 pb-3 pt-2 border-t border-white/10">
        <YouTubeShortsCarousel
          youtubeUrl={business.youtube_url ?? ""}
          businessId={business.id}
          onVideoCount={() => {}}
          onPlayingChange={onPlayingChange}
          onSelectVideo={handleSelectVideo}
          onVideosLoaded={(vids) => {
            setAllVideos(vids);
            if (!activeVideo && vids.length > 0) {
              handleSelectVideo(vids[0]);
            }
          }}

          activeVideoId={activeVideo?.videoId ?? null}
          hideHeader
          size="match-tabs"
        />
      </div>
    </OverlayShell>
  );
};

export default YouTubeOverlay;
