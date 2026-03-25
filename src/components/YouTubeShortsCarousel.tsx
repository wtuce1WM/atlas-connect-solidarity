import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

interface YouTubeVideo {
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
}

const YouTubeShortsCarousel = ({ youtubeUrl, onVideoCount }: YouTubeShortsCarouselProps) => {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const regular = videos.filter((v) => !v.isShort);

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
          <p className="text-xs font-medium text-gold" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>Shorts</p>
          <VideoRow
            videos={shorts}
            scrollRef={scrollRef}
            playingId={playingId}
            onPlay={setPlayingId}
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
            playingId={playingId}
            onPlay={setPlayingId}
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
  playingId: string | null;
  onPlay: (id: string | null) => void;
  onScroll: (dir: number) => void;
  isShort: boolean;
}

function VideoRow({ videos, scrollRef, playingId, onPlay, onScroll, isShort }: VideoRowProps) {
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
        {videos.map((video) => (
          <div
            key={video.videoId}
            className={`flex-shrink-0 rounded-xl overflow-hidden bg-black relative cursor-pointer group/card ${
              isShort ? "w-[140px] aspect-[9/16]" : "w-[200px] aspect-video"
            }`}
            onClick={() => onPlay(playingId === video.videoId ? null : video.videoId)}
          >
            {playingId === video.videoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-100 group-hover/card:bg-black/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] leading-tight text-white font-medium bg-gradient-to-t from-black/80 to-transparent line-clamp-2">
                  {video.title}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default YouTubeShortsCarousel;
