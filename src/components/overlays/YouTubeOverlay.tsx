import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import YouTubeShortsCarousel, { type YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import type { BookOnlineBusiness } from "@/hooks/useBookOnlineData";

interface YouTubeOverlayProps {
  business: BookOnlineBusiness;
  activeVideo: YouTubeVideo | null;
  onSelectVideo: (v: YouTubeVideo | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onClose: () => void;
}

const YouTubeOverlay = ({ business, activeVideo, onSelectVideo, onPlayingChange, onClose }: YouTubeOverlayProps) => {
  const { language } = useLanguage();

  return (
    <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex flex-col animate-slide-up-from-bottom overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          {activeVideo ? (
            <p className="text-xs text-white font-medium truncate" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              {activeVideo.title}
            </p>
          ) : (
            <p className="text-xs text-white/70 font-medium" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              {language === "en" ? "Select a video" : "Sélectionnez une vidéo"}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0 ml-2"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Video player area */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        {activeVideo ? (
          <div className={`flex items-center justify-center ${activeVideo.isShort ? "h-full" : "w-full"}`}>
            <div className={`${activeVideo.isShort ? "h-full aspect-[9/16]" : "w-full aspect-video"}`}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full rounded-xl"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/50 py-8" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {language === "en" ? "Select a video" : "Sélectionnez une vidéo"}
          </p>
        )}
      </div>

      {/* Carousel — pinned to bottom */}
      {business.youtube_url && business.youtube_force_external && (
        <div className="shrink-0 overflow-y-auto px-3 pb-6 pt-2 border-t border-white/10 max-h-[45%]">
          <YouTubeShortsCarousel
            youtubeUrl={business.youtube_url}
            onVideoCount={() => {}}
            onPlayingChange={onPlayingChange}
            onSelectVideo={onSelectVideo}
            activeVideoId={activeVideo?.videoId ?? null}
            size="large"
          />
        </div>
      )}
    </div>
  );
};

export default YouTubeOverlay;
