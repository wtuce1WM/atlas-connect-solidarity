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
  businessId?: string;
  onVideoCount?: (count: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onSelectVideo?: (video: YouTubeVideo | null) => void;
  onVideosLoaded?: (videos: YouTubeVideo[]) => void;
  activeVideoId?: string | null;
  shortsOnly?: boolean;
  hideLabel?: boolean;
  hideHeader?: boolean;
  size?: "default" | "large" | "match-tabs";
}

const YouTubeShortsCarousel = ({ youtubeUrl, businessId, onVideoCount, onPlayingChange, onSelectVideo, onVideosLoaded, activeVideoId, shortsOnly, hideLabel, hideHeader, size = "default" }: YouTubeShortsCarouselProps) => {
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
    if (!youtubeUrl && !businessId) return;



    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try DB first if businessId is provided
        if (businessId) {
          // 1) Videos owned directly by this business
          const directPromise = supabase
            .from("business_youtube_videos")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_visible", true)
            .eq("business_is_active", true);

          // 2) Videos linked to this business as a POI (from any other business)
          const poiPromise = supabase
            .from("business_youtube_video_pois")
            .select("business_youtube_videos!inner(*)")
            .eq("point_of_interest_id", businessId)
            .eq("business_youtube_videos.is_visible", true)
            .eq("business_youtube_videos.business_is_active", true);

          // 3) YouTube videos stored as documents on this business
          const docsPromise = supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, sort_order")
            .eq("business_id", businessId)
            .eq("type", "video")
            .eq("business_is_active", true);

          const [{ data: directVideos }, { data: poiLinks }, { data: docVideos }] = await Promise.all([directPromise, poiPromise, docsPromise]);

          const merged = new Map<string, any>();
          (directVideos || []).forEach((v: any) => merged.set(v.video_id, v));
          (poiLinks || []).forEach((row: any) => {
            const v = row.business_youtube_videos;
            if (v && !merged.has(v.video_id)) merged.set(v.video_id, v);
          });
          (docVideos || []).forEach((d: any) => {
            const url: string = d.url || "";
            const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
            if (!m) return;
            const videoId = m[1];
            if (merged.has(videoId)) return;
            const isShort = /\/shorts\//.test(url);
            merged.set(videoId, {
              video_id: videoId,
              title: d.name || "",
              thumbnail: d.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              published_at: "",
              is_short: isShort,
              duration_seconds: 0,
              sort_order: d.sort_order ?? 9999,
            });
          });

          // Fetch missing titles via oEmbed for document-sourced videos
          const itemsWithTitles: YouTubeVideo[] = Array.from(merged.values())
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((v: any) => ({
              videoId: v.video_id,
              title: v.title,
              thumbnail: v.thumbnail,
              publishedAt: v.published_at || "",
              isShort: v.is_short,
              durationSeconds: v.duration_seconds,
            }));

          // Populate missing titles via YouTube oEmbed
          const titlesToFetch = itemsWithTitles.filter((v) => !v.title);
          if (titlesToFetch.length > 0) {
            await Promise.all(
              titlesToFetch.map(async (v) => {
                try {
                  const res = await fetch(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}&format=json`
                  );
                  const json = await res.json();
                  if (json?.title) {
                    const item = itemsWithTitles.find((x) => x.videoId === v.videoId);
                    if (item) item.title = json.title;
                  }
                } catch {
                  // ignore
                }
              })
            );
          }

          setVideos(itemsWithTitles);
          onVideoCount?.(itemsWithTitles.length);
          onVideosLoaded?.(itemsWithTitles);
          setIsLoading(false);
          return;
        }

        // Fallback: fetch from YouTube API
        const { data, error: fnError } = await supabase.functions.invoke("fetch-youtube-channel", {
          body: { channelUrl: youtubeUrl, maxResults: 20 },
        });
        if (fnError) throw fnError;
        const items = data?.videos || [];
        setVideos(items);
        onVideoCount?.(items.length);
        onVideosLoaded?.(items);
      } catch (err: any) {
        console.error("YouTube fetch error:", err);
        setError(err.message || "Erreur");
        onVideoCount?.(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [youtubeUrl, businessId]);

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
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <YouTubeIcon className="h-5 w-5 text-red-600" />
          <h3 className="text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {language === "en" ? "Latest Videos" : "Dernières vidéos"}
          </h3>
        </div>
      )}

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
            size={size}
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
            size={size}
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
  size?: "default" | "large" | "match-tabs";
}

function VideoRow({ videos, scrollRef, activeVideoId, onPlay, onScroll, isShort, size = "default" }: VideoRowProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef || localRef;

  const localScroll = useCallback((dir: number) => {
    (ref as React.RefObject<HTMLDivElement>).current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }, [ref]);

  return (
    <div>

      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pt-1 pb-1 pl-1 -mt-1"
      >
        {videos.map((video) => {
          const isActive = activeVideoId === video.videoId;
          return (
             <div
              key={video.videoId}
              className={`flex-shrink-0 rounded-xl overflow-hidden relative cursor-pointer group/card transition-all ${size === "match-tabs" ? (isShort ? "w-40 h-[7.5rem] md:h-[10rem] lg:h-[14rem]" : "w-52 md:w-60 lg:w-64 h-[6rem] md:h-[8rem] lg:h-[9rem]") : isShort ? "w-40 h-[6rem] md:h-[9rem] lg:h-[13rem]" : "w-52 md:w-60 lg:w-64 h-[6rem] md:h-[8rem] lg:h-[9rem]"} ${isActive ? "ring-2 ring-offset-1 ring-offset-black ring-red-500" : ""}`}
              onClick={() => onPlay(video)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
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
              <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] leading-tight text-white font-medium bg-gradient-to-t from-black/80 to-transparent line-clamp-2">
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
