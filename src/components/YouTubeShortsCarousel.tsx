import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  isShort: boolean;
  durationSeconds: number;
}

interface YouTubeShortsCarouselProps {
  youtubeUrl: string;
  onVideoCount?: (count: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onSelectVideo?: (video: YouTubeVideo | null) => void;
  activeVideoId?: string | null;
  shortsOnly?: boolean;
  hideLabel?: boolean;
  size?: "default" | "large";
}

const YouTubeShortsCarousel = ({ youtubeUrl, onVideoCount, onPlayingChange, onSelectVideo, activeVideoId, shortsOnly, hideLabel, size = "default" }: YouTubeShortsCarouselProps) => {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePlay = useCallback((video: YouTubeVideo) => {
    const isToggleOff = activeVideoId === video.videoId;
    onSelectVideo?.(isToggleOff ? null : video);
    onPlayingChange?.(!isToggleOff);
  }, [activeVideoId, onSelectVideo, onPlayingChange]);

  useEffect(() => {
    if (!youtubeUrl) return;

    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-youtube-channel", {
          body: { channelUrl: youtubeUrl, maxResults: 12 },
        });
        if (fnError) throw fnError;
        const items = data?.videos || [];
        setVideos(items);
        onVideoCount?.(items.length);
      } catch (err: any) {
        console.error("YouTube fetch error:", err);
        setError(err.message || "Erreur");
        onVideoCount?.(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [youtubeUrl]);

  const scroll = useCallback((dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || videos.length === 0) return null;

  const shorts = videos.filter((v) => v.isShort);
  const regular = shortsOnly ? [] : videos.filter((v) => !v.isShort);

  return (
    <div className="space-y-3">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <YouTubeIcon className="h-5 w-5 text-red-600" />
        <h3 className="text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
          {language === "en" ? "Latest Videos" : "Dernières vidéos"}
        </h3>
      </div>

      {/* Shorts row */}
      {shorts.length > 0 && (
        <div className="space-y-1.5">
          {!hideLabel && <p className="text-xs font-medium text-gold" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>Shorts</p>}
          <VideoRow
            videos={shorts}
            scrollRef={scrollRef}
            activeVideoId={activeVideoId ?? null}
            onPlay={handlePlay}
            onScroll={scroll}
            isShort
          />
        </div>
      )}

      {/* Regular videos row */}
      {regular.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gold" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {language === "en" ? "Videos" : "Vidéos"}
          </p>
          <VideoRow
            videos={regular}
            scrollRef={shorts.length > 0 ? undefined : scrollRef}
            activeVideoId={activeVideoId ?? null}
            onPlay={handlePlay}
            onScroll={scroll}
            isShort={false}
          />
        </div>
      )}
    </div>
  );
};

interface VideoRowProps {
  videos: YouTubeVideo[];
  scrollRef?: React.RefObject<HTMLDivElement>;
  activeVideoId: string | null;
  onPlay: (video: YouTubeVideo) => void;
  onScroll: (dir: number) => void;
  isShort: boolean;
}

function VideoRow({ videos, scrollRef, activeVideoId, onPlay, onScroll, isShort }: VideoRowProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef || localRef;

  const localScroll = useCallback((dir: number) => {
    (ref as React.RefObject<HTMLDivElement>).current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }, [ref]);

  return (
    <div className="relative group">
      {videos.length > 2 && (
        <>
          <button
            onClick={() => localScroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => localScroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
      >
        {videos.map((video) => {
          const isActive = activeVideoId === video.videoId;
          return (
            <div
              key={video.videoId}
              className={`flex-shrink-0 rounded-xl overflow-hidden bg-black relative cursor-pointer group/card transition-all ${
                isShort ? "w-[140px] aspect-[9/16]" : "w-[200px] aspect-video"
              } ${isActive ? "ring-2 ring-red-500 opacity-100" : "opacity-90 hover:opacity-100"}`}
              onClick={() => onPlay(video)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                isActive ? "bg-black/50" : "bg-black/20 group-hover/card:bg-black/40"
              }`}>
                {isActive ? (
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <span className="w-1 h-4 bg-white rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                  </div>
                )}
              </div>
              <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] leading-tight text-white font-medium bg-gradient-to-t from-black/80 to-transparent line-clamp-2">
                {video.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default YouTubeShortsCarousel;
