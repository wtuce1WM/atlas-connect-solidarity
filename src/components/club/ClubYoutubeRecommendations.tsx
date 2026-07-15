import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play } from "lucide-react";


const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));

const MARRAKECH_CITY_ID = "41545fd3-2c2c-4609-8d55-842fd7e2edde";
const ESSAOUIRA_CITY_ID = "3f96c12a-0635-4f70-8de0-2578a66bcc07";
const ESSAOUIRA_COORDS = { lat: 31.5085, lng: -9.7595 };
const ESSAOUIRA_RADIUS_KM = 80;

type Video = {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
};

type DestinationKey = "marrakech" | "essaouira";

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

const normalizeCity = (value?: string | null): DestinationKey | null => {
  const normalized = (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("essaouira")) return "essaouira";
  if (normalized.includes("marrakech")) return "marrakech";
  return null;
};

const ClubYoutubeRecommendations = () => {
  const { language } = useLanguage();
  const geo = useGeolocation();

  const [fallbackDestination, setFallbackDestination] = useState<DestinationKey | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const destination = useMemo<DestinationKey | null>(() => {
    const cityFromGeo = normalizeCity(geo.confirmedAddress) || normalizeCity(geo.detectedCity);
    if (cityFromGeo) return cityFromGeo;
    if (geo.coords) {
      return haversineKm(geo.coords, ESSAOUIRA_COORDS) <= ESSAOUIRA_RADIUS_KM
        ? "essaouira"
        : "marrakech";
    }
    return fallbackDestination;
  }, [fallbackDestination, geo.confirmedAddress, geo.coords, geo.detectedCity]);

  useEffect(() => {
    if (destination) return;

    const tryIpFallback = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const j = await res.json();
        if (typeof j?.latitude === "number" && typeof j?.longitude === "number") {
          const dist = haversineKm(
            { lat: j.latitude, lng: j.longitude },
            ESSAOUIRA_COORDS,
          );
          setFallbackDestination(dist <= ESSAOUIRA_RADIUS_KM ? "essaouira" : "marrakech");
          return;
        }
      } catch {}
      setFallbackDestination("marrakech");
    };
    if (!navigator.geolocation) {
      tryIpFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineKm(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          ESSAOUIRA_COORDS,
        );
        setFallbackDestination(dist <= ESSAOUIRA_RADIUS_KM ? "essaouira" : "marrakech");
      },
      () => {
        tryIpFallback();
      },
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    );
  }, [destination]);


  useEffect(() => {
    let cancelled = false;
    const fetchVideos = async () => {
      if (!destination) return;

      const cityIds = destination === "essaouira"
        ? [ESSAOUIRA_CITY_ID]
        : [MARRAKECH_CITY_ID];

      const { data } = await supabase
        .from("generic_video_cities")
        .select("generic_videos!inner(id, title, name, url, thumbnail_url, sort_order)")
        .in("city_id", cityIds)
        .order("sort_order", { ascending: true, foreignTable: "generic_videos" });
      if (cancelled) return;
      const seen = new Set<string>();
      const items: Video[] = ((data || []) as any[])
        .map((row) => {
          const g = row.generic_videos;
          const url: string | null = g?.url || null;
          if (!url || !/(?:youtube\.com|youtu\.be)/i.test(url)) return null;
          if (seen.has(g.id)) return null;
          seen.add(g.id);
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
  }, [destination]);

  const label = useMemo(
    () => (destination === "essaouira" ? "Essaouira" : "Marrakech"),
    [destination],
  );

  const panelList = useMemo(
    () =>
      videos.map((v) => ({
        id: v.id,
        url: v.url,
        business_name: v.title || (language === "en" ? "Video" : language === "ar" ? "فيديو" : "Vidéo"),
        pageBusinessName: null,
        pageBusinessId: null,

        owner: null,
        social: null,
        showSocialBadge: false,
        description: null,
        manualCard: null,
        title: v.title,
        price: null,
      })),
    [videos],
  );
  const activeVideo = panelList.find((v) => v.id === activeVideoId) || null;

  if (!videos.length) return null;

  return (
    <>
      <section className="w-full px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-white text-xl md:text-2xl font-bold mb-4 !font-sans">
            Vidéos Youtube recommandées
            <span className="text-white/60 text-sm font-normal ml-2">· {label}</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  setActiveVideoId(v.id);
                }}
                className="group relative shrink-0 snap-start w-[220px] md:w-[260px] aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 hover:border-white/30 transition text-left"
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
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeVideoId && (
        <Suspense fallback={null}>
          <HomeVideoSlidePanel
            open={!!activeVideo}
            onClose={() => setActiveVideoId(null)}
            activeVideo={activeVideo as any}
            activeList={panelList as any}
            onActiveVideoChange={(v: any) => {
              setActiveVideoId(v.id);
              setCurrentTime(0);
            }}
            isActiveGeneric={true}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            returnContext={null}
            hideDirections
            hideSecondaryCtas
          />
        </Suspense>
      )}
    </>
  );
};

export default ClubYoutubeRecommendations;
