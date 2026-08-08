import { useEffect, useMemo, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

export interface InlineYtVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  isShort: boolean;
  durationSeconds: number;
}

interface Props {
  businessId: string;
  language: string;
  className?: string;
}

const fmtDuration = (s?: number) => {
  if (!s || s <= 0) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const InlineYouTubeSection = ({ businessId, language, className }: Props) => {
  const [videos, setVideos] = useState<InlineYtVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"shorts" | "long">("shorts");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: direct }, { data: poiLinks }, { data: docs }] = await Promise.all([
          supabase
            .from("business_youtube_videos")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_visible", true)
            .eq("business_is_active", true),
          supabase
            .from("business_youtube_video_pois")
            .select("business_youtube_videos!inner(*)")
            .eq("point_of_interest_id", businessId)
            .eq("business_youtube_videos.is_visible", true)
            .eq("business_youtube_videos.business_is_active", true),
          supabase
            .from("business_documents")
            .select("id, url, name, thumbnail_url, sort_order")
            .eq("business_id", businessId)
            .eq("type", "video")
            .eq("business_is_active", true),
        ]);

        const merged = new Map<string, any>();
        (direct || []).forEach((v: any) => merged.set(v.video_id, v));
        (poiLinks || []).forEach((row: any) => {
          const v = row.business_youtube_videos;
          if (v && !merged.has(v.video_id)) merged.set(v.video_id, v);
        });
        (docs || []).forEach((d: any) => {
          const url: string = d.url || "";
          const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
          if (!m) return;
          if (merged.has(m[1])) return;
          merged.set(m[1], {
            video_id: m[1],
            title: d.name || "",
            thumbnail: d.thumbnail_url || `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`,
            published_at: "",
            is_short: /\/shorts\//.test(url),
            duration_seconds: 0,
          });
        });

        const items: InlineYtVideo[] = Array.from(merged.values())
          .map((v: any) => ({
            videoId: v.video_id,
            title: v.title || "",
            thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
            publishedAt: v.published_at || "",
            isShort: !!v.is_short || (v.duration_seconds > 0 && v.duration_seconds <= 65),
            durationSeconds: v.duration_seconds || 0,
          }))
          .sort((a, b) => {
            const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return db - da;
          });

        // Titres manquants via oEmbed
        await Promise.all(
          items
            .filter((v) => !v.title)
            .map(async (v) => {
              try {
                const res = await fetch(
                  `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}&format=json`
                );
                const json = await res.json();
                if (json?.title) v.title = json.title;
              } catch {
                /* ignore */
              }
            })
        );

        if (!cancelled) {
          setVideos(items);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const shorts = useMemo(() => videos.filter((v) => v.isShort), [videos]);
  const longs = useMemo(() => videos.filter((v) => !v.isShort), [videos]);

  // Priorité aux Shorts
  useEffect(() => {
    if (loading) return;
    const preferShorts = shorts.length > 0;
    setTab(preferShorts ? "shorts" : "long");
    const first = preferShorts ? shorts[0] : longs[0];
    setActiveId(first ? first.videoId : null);
  }, [loading, shorts, longs]);

  const list = tab === "shorts" ? shorts : longs;
  const active = list.find((v) => v.videoId === activeId) || list[0] || null;

  const t = (fr: string, en: string, ar?: string) =>
    language === "en" ? en : language === "ar" ? ar || en : fr;

  if (loading) {
    return (
      <div className={`mt-8 pt-6 border-t border-white/10 flex justify-center ${className || ""}`}>
        <Loader2 className="h-5 w-5 text-white/50 animate-spin" />
      </div>
    );
  }
  if (videos.length === 0) return null;

  return (
    <div className={`mt-8 pt-6 border-t border-white/10 ${className || ""}`}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg md:text-xl font-bold uppercase text-white font-['Montserrat',sans-serif] flex items-center gap-2">
          <YouTubeIcon className="h-5 w-5" />
          {t("Chaîne YouTube", "YouTube channel", "قناة يوتيوب")}
        </h2>
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/10 backdrop-blur-md">
          {shorts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTab("shorts");
                setActiveId(shorts[0]?.videoId ?? null);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide font-['Montserrat',sans-serif] transition-colors ${
                tab === "shorts" ? "bg-gold text-black" : "text-white/70 hover:text-white"
              }`}
            >
              Shorts · {shorts.length}
            </button>
          )}
          {longs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTab("long");
                setActiveId(longs[0]?.videoId ?? null);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide font-['Montserrat',sans-serif] transition-colors ${
                tab === "long" ? "bg-gold text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {t("Vidéos", "Videos", "فيديوهات")} · {longs.length}
            </button>
          )}
        </div>
      </div>

      {/* Lecteur principal */}
      {active && (
        <div className="w-full flex flex-col items-center">
          <div
            className={`relative w-full overflow-hidden rounded-2xl bg-black/40 border border-white/10 ${
              tab === "shorts" ? "max-w-[300px] aspect-[9/16]" : "max-w-3xl aspect-video"
            }`}
          >
            <iframe
              key={active.videoId}
              src={`https://www.youtube-nocookie.com/embed/${active.videoId}?rel=0&modestbranding=1&playsinline=1&controls=1&iv_load_policy=3`}
              title={active.title || "YouTube"}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {active.title && (
            <p className="mt-3 max-w-3xl text-center text-sm md:text-base font-semibold text-white leading-snug font-['Montserrat',sans-serif]">
              {active.title}
            </p>
          )}
        </div>
      )}

      {/* Sélecteur */}
      {list.length > 1 && (
        <div className="mt-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {list.map((v) => {
            const isActive = active?.videoId === v.videoId;
            const dur = fmtDuration(v.durationSeconds);
            return (
              <button
                key={v.videoId}
                type="button"
                onClick={() => setActiveId(v.videoId)}
                className={`group text-left snap-start shrink-0 grow-0 basis-auto ${tab === "shorts" ? "w-[118px]" : "w-[190px] md:w-[260px]"}`}
              >
                <div
                  className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                    tab === "shorts" ? "aspect-[9/16]" : "aspect-video"
                  } ${isActive ? "border-gold" : "border-transparent group-hover:border-white/40"}`}
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title || v.videoId}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white uppercase tracking-wide font-['Montserrat',sans-serif]">
                    {v.isShort ? "Short" : dur || t("Vidéo", "Video", "فيديو")}
                  </span>
                </div>
                {v.title && (
                  <p className="mt-1.5 text-[11px] md:text-xs text-white/85 leading-snug line-clamp-2 font-['Montserrat',sans-serif]">
                    {v.title}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InlineYouTubeSection;
