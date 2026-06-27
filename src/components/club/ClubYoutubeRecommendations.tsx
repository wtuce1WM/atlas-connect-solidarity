import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

const MARRAKECH_DEST_ID = "d0bb2ac7-9fee-4e1d-8625-b23e1d28aa9e";
const ESSAOUIRA_DEST_ID = "3947db1f-daaa-4f7f-a617-e5988d9d86db";
const ESSAOUIRA_COORDS = { lat: 31.5085, lng: -9.7595 };
const ESSAOUIRA_RADIUS_KM = 80;

type Video = {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
};

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
};

const extractYoutubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return m?.[1] ?? null;
};

const ClubYoutubeRecommendations = () => {
  const [destinationId, setDestinationId] = useState<string>(MARRAKECH_DEST_ID);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineKm(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          ESSAOUIRA_COORDS,
        );
        if (dist <= ESSAOUIRA_RADIUS_KM) setDestinationId(ESSAOUIRA_DEST_ID);
      },
      () => {},
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("generic_video_destinations")
        .select("sort_order, generic_videos!inner(id, title, name, url, thumbnail_url)")
        .eq("destination_id", destinationId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const items: Video[] = ((data || []) as any[])
        .map((row) => {
          const g = row.generic_videos;
          const url: string | null = g?.url || null;
          if (!url || !/(?:youtube\.com|youtu\.be)/i.test(url)) return null;
          return {
            id: g.id as string,
            url,
            title: (g.title || g.name) ?? null,
            thumbnail:
              g.thumbnail_url ||
              (extractYoutubeId(url)
                ? `https://i.ytimg.com/vi/${extractYoutubeId(url)}/hqdefault.jpg`
                : null),
          } as Video;
        })
        .filter(Boolean) as Video[];
      setVideos(items);
    };
    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  const label = useMemo(
    () => (destinationId === ESSAOUIRA_DEST_ID ? "Essaouira" : "Marrakech"),
    [destinationId],
  );

  if (!videos.length) return null;

  return (
    <section className="w-full px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-white text-xl md:text-2xl font-bold mb-4 !font-sans">
          Vidéos Youtube recommandées
          <span className="text-white/60 text-sm font-normal ml-2">· {label}</span>
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative shrink-0 snap-start w-[220px] md:w-[260px] aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 hover:border-white/30 transition"
            >
              {v.thumbnail ? (
                <img
                  src={v.thumbnail}
                  alt={v.title || "Vidéo YouTube"}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-[#C04F17]/90 rounded-full p-3 shadow-lg group-hover:scale-110 transition">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
              {v.title && (
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-xs md:text-sm font-medium line-clamp-2">
                    {v.title}
                  </p>
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClubYoutubeRecommendations;
