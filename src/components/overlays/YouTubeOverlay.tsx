import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
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
        onClick={onClose}
        className="absolute top-3 left-4 z-20 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
        aria-label={language === "en" ? "Close" : "Fermer"}
      >
        <X className="h-4 w-4 text-black" />
      </button>

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
              <div className={`relative overflow-hidden rounded-xl ${activeVideo.isShort ? "h-full aspect-[9/16]" : "w-full aspect-video"}`}>
                <iframe
                  ref={iframeRef}
                  key={activeVideo.videoId}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&mute=0&rel=0&controls=1&modestbranding=1&playsinline=1&enablejsapi=1&showinfo=0&iv_load_policy=3`}
                  className="absolute left-0 w-full"
                  style={{ top: "-60px", height: "calc(100% + 60px)" }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
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
