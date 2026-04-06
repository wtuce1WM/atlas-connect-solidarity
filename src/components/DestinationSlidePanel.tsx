import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { MapPin, ChevronLeft, ChevronDown, ChevronUp, X, Navigation, Minimize2, Map as MapIcon, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { MediaCounterBar, DesktopMediaArrows, CardsToggleButton, useOwnerLogo, OwnerLogoOverlay, OwnerBadge } from "@/components/CardsVisibilityToggle";
import { useNavigate } from "react-router-dom";
import BottomTabsCarousel, { TabScrollRail, TabVideoCard, TabYouTubeCard, TabCard, type BottomTabConfig } from "@/components/BottomTabsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";


interface DestinationSlidePanelProps {
  destinationId: string;
  onClose: () => void;
  slideFrom?: "right" | "bottom";
  interceptCloseRef?: React.MutableRefObject<(() => boolean) | null>;
}

interface DestinationFull {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  hook: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  matterport_url: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string[] | null;
}

const GOLD = { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" };

const MemoizedDestMap = React.memo(({ destination, regionDestinations }: { destination: DestinationFull; regionDestinations: PoiMapItem[] }) => {
  const pois = useMemo(() => [
    ...(destination.latitude && destination.longitude ? [{
      id: destination.id, name: destination.name_fr, latitude: destination.latitude, longitude: destination.longitude,
      city: null, neighborhood: null, images: destination.images,
      markerColor: GOLD,
    }] : []),
    ...regionDestinations.filter(d => d.id !== destination.id),
  ], [destination.id, destination.latitude, destination.longitude, destination.name_fr, destination.images, regionDestinations]);

  const center = useMemo(
    () => destination.latitude && destination.longitude ? { lat: destination.latitude, lng: destination.longitude } : undefined,
    [destination.latitude, destination.longitude]
  );

  return (
    <PoiGoogleMap
      pois={pois}
      selectedPoiId={destination.id}
      highlightColor={GOLD}
      center={center}
      fitToMarkers
    />
  );
});

const DestinationSlidePanel = ({ destinationId, onClose, slideFrom = "right", interceptCloseRef }: DestinationSlidePanelProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const slideAnim = slideFrom === "bottom" ? "animate-slide-up-from-bottom" : "animate-slide-in-right";
  const [destination, setDestination] = useState<DestinationFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [showMosaic, setShowMosaic] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [regionDestinations, setRegionDestinations] = useState<PoiMapItem[]>([]);
  const [frontTabs, setFrontTabs] = useState<{ id: string; name: string; businesses: { id: string; name: string; slug: string; city: string | null; neighborhood: string | null; images: string[] | null; computed_rating: number | null; rating: number | null }[] }[]>([]);
  const [cityVideos, setCityVideos] = useState<{ url: string; name: string | null; ownerName: string; thumbnailUrl: string | null; businessId: string; ownerLogo: string | null; ownerSlug: string | null }[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<string>("cityVideos");
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const bottomTabInitialRef = React.useRef(true);

  // Expose close interceptor: when a business is open, close it first
  React.useEffect(() => {
    if (!interceptCloseRef) return;
    if (activeBusinessId) {
      interceptCloseRef.current = () => {
        setActiveBusinessId(null);
        return true;
      };
    } else {
      interceptCloseRef.current = null;
    }
  }, [activeBusinessId, interceptCloseRef]);

  // --- Cosmetic URL rewriting (replaceState) ---
  const savedDestUrlRef = useRef(window.location.pathname + window.location.search);

  useEffect(() => {
    if (!destination?.name_fr) return;
    if (!activeBusinessId) {
      window.history.replaceState(null, "", `/destination/${encodeURIComponent(destination.name_fr)}`);
    }
  }, [destination?.name_fr, activeBusinessId]);

  // Restore URL on unmount
  useEffect(() => {
    const saved = savedDestUrlRef.current;
    return () => { window.history.replaceState(null, "", saved); };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);
  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards,
    onTouchStart: onDragTouchStart, onTouchMove: onDragTouchMove, onTouchEnd: onDragTouchEnd, onMouseDownDrag,
  } = useDragToHide();

  useEffect(() => {
    if (!showDirections) return;
    setUserOrigin(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => {}
      );
    }
  }, [showDirections]);

  useEffect(() => {
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setShowDirections(false);
    setFlipped(false);
    setRegionDestinations([]);
    setFrontTabs([]);
    setCityVideos([]);
    bottomTabInitialRef.current = true;
  }, [destinationId]);

  useEffect(() => {
    const fetchDestination = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, description, hook, image_url, images, videos, matterport_url, latitude, longitude, region")
        .eq("id", destinationId)
        .maybeSingle();
      setDestination(data as DestinationFull | null);
      setIsLoading(false);
    };
    fetchDestination();
  }, [destinationId]);

  // Fetch destinations in the same region
  useEffect(() => {
    const fetchRegionDests = async () => {
      if (!destination?.region || destination.region.length === 0) return;
      // Fetch all destinations, then filter by overlapping region
      const { data: allDests } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, latitude, longitude, images, image_url, region")
        .neq("id", destinationId);
      if (!allDests) return;
      const myRegions = new Set(destination.region);
      const matching = allDests.filter((d: any) =>
        d.region && (d.region as string[]).some((r: string) => myRegions.has(r))
      );
      setRegionDestinations(
        matching
          .filter((d: any) => d.latitude && d.longitude)
          .map((d: any) => ({
            id: d.id,
            name: d.name_fr,
            latitude: d.latitude,
            longitude: d.longitude,
            images: (d.images && d.images.length > 0) ? d.images : (d.image_url ? [d.image_url] : null),
            city: null,
            neighborhood: null,
          }))
      );
    };
    fetchRegionDests();
  }, [destination?.region, destinationId]);

  // Fetch businesses linked to this destination, grouped by front_structure entries
  useEffect(() => {
    const fetchFrontTabs = async () => {
      // 1. Get all business_ids linked to this destination
      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("business_id")
        .eq("destination_id", destinationId) as any);
      if (!links || links.length === 0) { setFrontTabs([]); return; }

      const bizIds = (links as any[]).map((l: any) => l.business_id as string);

      // 2. Fetch front_structure entries + their subcategory names
      const [fsRes, fssRes, subsRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
      ]);
      const fsEntries = fsRes.data || [];
      const fssLinks = fssRes.data || [];
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));

      // Build map: front_structure_id -> Set of subcategory names (all langs)
      const fsSubNames = new Map<string, Set<string>>();
      for (const link of fssLinks) {
        const sub = subMap.get(link.subcategory_id);
        if (!sub) continue;
        if (!fsSubNames.has(link.front_structure_id)) fsSubNames.set(link.front_structure_id, new Set());
        const s = fsSubNames.get(link.front_structure_id)!;
        if (sub.name_fr) s.add(sub.name_fr);
        if (sub.name_en) s.add(sub.name_en);
        if (sub.name_ar) s.add(sub.name_ar);
      }

      // 3. Fetch business details (with categories)
      const all: any[] = [];
      for (let i = 0; i < bizIds.length; i += 500) {
        const chunk = bizIds.slice(i, i + 500);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, city, neighborhood, images, computed_rating, rating, total_review_count, categories")
          .eq("is_active", true)
          .in("id", chunk);
        if (data) all.push(...data);
      }

      // 4. Group businesses by front_structure entry
      const tabs: typeof frontTabs = [];
      const usedBizIds = new Set<string>();
      for (const fs of fsEntries) {
        const subNames = fsSubNames.get(fs.id);
        if (!subNames || subNames.size === 0) continue;
        const matching = all.filter(biz =>
          biz.categories?.some((cat: string) => subNames.has(cat))
        );
        if (matching.length === 0) continue;
        matching.sort((a: any, b: any) => {
          const aCount = a.total_review_count ?? 0;
          const bCount = b.total_review_count ?? 0;
          const aRating = aCount >= 10 ? (a.computed_rating ?? a.rating ?? 0) : -1;
          const bRating = bCount >= 10 ? (b.computed_rating ?? b.rating ?? 0) : -1;
          return bRating - aRating;
        });
        matching.forEach((b: any) => usedBizIds.add(b.id));
        tabs.push({ id: fs.id, name: fs.name, businesses: matching });
      }

      setFrontTabs(tabs);
    };
    fetchFrontTabs();
  }, [destinationId]);

  // Fetch city-linked videos from business_documents
  useEffect(() => {
    const fetchCityVideos = async () => {
      if (!destination?.name_fr) return;
      const { data: docs } = await supabase
        .from("business_documents")
        .select("url, name, thumbnail_url, business_id")
        .eq("type", "video")
        .eq("city", destination.name_fr)
        .order("sort_order", { ascending: true });
      if (!docs || docs.length === 0) { setCityVideos([]); return; }
      // Fetch owner names
      const ownerIds = [...new Set(docs.map(d => d.business_id))];
      const { data: owners } = await supabase
        .from("businesses")
        .select("id, name, logo_url, slug")
        .in("id", ownerIds);
      const ownerMap = new Map((owners || []).map(o => [o.id, o]));
      setCityVideos(docs.map(d => {
        const owner = ownerMap.get(d.business_id);
        return {
          url: d.url,
          name: d.name,
          ownerName: owner?.name || "",
          thumbnailUrl: d.thumbnail_url,
          businessId: d.business_id,
          ownerLogo: owner?.logo_url || null,
          ownerSlug: owner?.slug || null,
        };
      }));
    };
    fetchCityVideos();
  }, [destination?.name_fr]);

  const playWoosh = useCallback(() => {
    try { new Audio(wooshSfx).play(); } catch {}
  }, []);

  const destName = destination
    ? (language === "en" && destination.name_en ? destination.name_en : destination.name_fr)
    : "";

  const images = destination?.images?.filter(Boolean) || [];
  const mainImage = destination?.image_url;
  const allImages = mainImage && !images.includes(mainImage) ? [mainImage, ...images] : images;
  const videos = destination?.videos?.filter(Boolean) || [];
  const [ytTitles, setYtTitles] = useState<Record<string, string>>({});
  const description = destination?.description || null;

  // Fetch YouTube video titles via oEmbed (no API key needed)
  useEffect(() => {
    if (videos.length === 0) return;
    const ytIds = videos
      .map((v) => {
        const m = v.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
        return m ? { url: v, id: m[1] } : null;
      })
      .filter(Boolean) as { url: string; id: string }[];
    if (ytIds.length === 0) return;

    let cancelled = false;
    const fetchTitles = async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        ytIds.map(async ({ url, id }) => {
          try {
            const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
            if (res.ok) {
              const data = await res.json();
              if (data.title) results[url] = data.title;
            }
          } catch {}
        })
      );
      if (!cancelled) setYtTitles(results);
    };
    fetchTitles();
    return () => { cancelled = true; };
  }, [videos.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const matterportUrl = destination?.matterport_url || null;

  const getVideoInfo = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      return { type: "youtube" as const, id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: "vimeo" as const, id: vimeoMatch[1], thumbnail: `https://vumbnail.com/${vimeoMatch[1]}.jpg` };
    }
    return { type: "file" as const, id: null, thumbnail: null };
  };

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string } | { kind: "matterport"; url: string };
  const fileVideos = videos.filter((v) => {
    const info = getVideoInfo(v);
    return info.type === "file";
  });
  // City videos (file type) for background
  const cityFileVideos = cityVideos.filter((cv) => getVideoInfo(cv.url).type === "file");
  const mediaItems: MediaItem[] = [
    ...cityFileVideos.map((cv) => ({ kind: "video" as const, url: cv.url })),
    ...fileVideos.map((v) => ({ kind: "video" as const, url: v })),
    ...allImages.map((i) => ({ kind: "image" as const, url: i })),
  ];
  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  // Build videoDocs-compatible array for owner logo/badge
  const ownerVideoDocs = useMemo(() => cityVideos.map(cv => ({
    url: cv.url,
    owner_business_id: cv.businessId,
    owner_logo: cv.ownerLogo,
    owner_name: cv.ownerName || null,
  })), [cityVideos]);

  // Owner logo overlay hook — destinationId acts as "current business" so all city videos show owner info
  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, ownerVideoDocs, destinationId);

  const lightboxItems: LightboxMediaItem[] = [
    ...allImages.map((url) => ({ type: "image" as const, src: url, alt: destName })),
    ...videos.map((url) => ({ type: "video" as const, src: url, alt: destName })),
    ...(matterportUrl ? [{ type: "matterport" as const, src: matterportUrl, alt: `${destName} – Visite 3D` }] : []),
  ];

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  // Sync video state with DOM events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setVideoPaused(false);
    const onPause = () => setVideoPaused(true);
    const onVol = () => setVideoMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    setVideoPaused(v.paused);
    setVideoMuted(v.muted);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, [currentMedia]);


  if (isLoading) {
    return (
      <div className={`absolute inset-0 z-[70] bg-black flex items-center justify-center ${slideAnim}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!destination) return null;

  return (
    <div className={`absolute inset-0 z-[70] bg-black overflow-hidden ${slideAnim}`}>
      {/* Close button — hidden when fullscreen video is open */}
      {!fullscreenVideo && !showDirections && (
        <div className="absolute top-3 left-3 z-[80] flex items-center gap-2">
          <button
            onClick={() => {
              if (activeBusinessId) {
                setActiveBusinessId(null);
                return;
              }
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          {(totalMedia > 0 || videos.length > 0 || matterportUrl) && (
            <button
              onClick={() => setShowMosaic((p) => !p)}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              title={showMosaic ? "Fermer la mosaïque" : "Voir tous les médias"}
            >
              {showMosaic ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Directions overlay */}
      {showDirections && destination.latitude && destination.longitude && (() => {
        const dest = `${destination.latitude},${destination.longitude}`;
        return (
          <div className="absolute inset-0 z-[75] bg-white flex flex-col animate-slide-in-right">
            <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
              <button
                onClick={() => setShowDirections(false)}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
                aria-label="Fermer l'itinéraire"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center bg-muted rounded-full p-0.5">
                  <button
                    onClick={() => setDirectionsMode("walking")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚶 {language === "en" ? "Walking" : "À pied"}
                  </button>
                  <button
                    onClick={() => setDirectionsMode("driving")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚗 {language === "en" ? "Driving" : "Voiture"}
                  </button>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Google Maps">
                  <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
                </a>
                <a href={`https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Waze">
                  <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
                </a>
                <a href={`https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=d`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Apple Plans">
                  <img src="https://www.apple.com/favicon.ico" alt="Apple Plans" className="h-7 w-7 object-contain" />
                </a>
              </div>
            </div>
            <div className="flex-1 relative min-h-0">
              <iframe
                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userOrigin || "My+location"}&destination=${dest}&mode=${directionsMode}`}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Itinéraire vers ${destName}`}
              />
            </div>
          </div>
        );
      })()}

      {/* Fullscreen video overlay */}
      {fullscreenVideo && (() => {
        const fvInfo = getVideoInfo(fullscreenVideo);
        let embedSrc = fullscreenVideo;
        if (fvInfo.type === "youtube") {
          embedSrc = `https://www.youtube.com/embed/${fvInfo.id}?autoplay=1&rel=0&controls=1&modestbranding=1`;
        } else if (fvInfo.type === "vimeo") {
          embedSrc = `https://player.vimeo.com/video/${fvInfo.id}?autoplay=1`;
        }
        return (
          <div className="absolute inset-0 z-[76] bg-black flex flex-col animate-slide-in-left">
            <div className="shrink-0 flex items-center px-3 py-2">
              <button
                onClick={() => setFullscreenVideo(null)}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {fvInfo.type === "file" ? (
                <video src={fullscreenVideo} className="w-full h-full object-contain" autoPlay controls playsInline />
              ) : (
                <iframe src={embedSrc} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen frameBorder="0" style={{ border: 0 }} />
              )}
            </div>
          </div>
        );
      })()}

      {/* Mosaic overlay */}
      {showMosaic && (
        <div className="absolute inset-0 z-[76] bg-black overflow-y-auto animate-slide-in-left">
          <div className="grid grid-cols-2 gap-2 p-2">
            {[
              ...allImages.map((url, i) => ({ kind: "image" as const, url, idx: i })),
              ...videos.map((url, i) => ({ kind: "video" as const, url, idx: allImages.length + i })),
              ...(matterportUrl ? [{ kind: "matterport" as const, url: matterportUrl, idx: allImages.length + videos.length }] : []),
            ].map((item) => {
              if (item.kind === "video") {
                const info = getVideoInfo(item.url);
                return (
                  <div
                    key={`v-${item.idx}`}
                    className="relative aspect-square cursor-pointer overflow-hidden bg-black/40"
                    onClick={() => {
                      const lbIdx = allImages.length + videos.indexOf(item.url);
                      setLightboxIndex(lbIdx);
                    }}
                  >
                    {info.thumbnail ? (
                      <img src={info.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <span className="text-white text-2xl">▶</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <span className="text-white text-lg">▶</span>
                      </div>
                    </div>
                  </div>
                );
              }
              if (item.kind === "matterport") {
                return (
                  <div
                    key="matterport"
                    className="relative aspect-square cursor-pointer overflow-hidden bg-black/40"
                    onClick={() => {
                      const lbIdx = allImages.length + videos.length;
                      setLightboxIndex(lbIdx);
                    }}
                  >
                    <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-2">
                      <span className="text-white text-3xl">🏠</span>
                      <span className="text-white/80 text-xs font-medium">Visite 3D</span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={`i-${item.idx}`}
                  className="relative aspect-square cursor-pointer overflow-hidden"
                  onClick={() => setLightboxIndex(item.idx)}
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen lightbox from mosaic */}
      {lightboxIndex !== null && (
        <FullscreenLightbox
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" ? (
            <video
              ref={videoRef}
              key={currentMedia.url}
              src={currentMedia.url}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={destName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        {/* Left / Right arrows — desktop */}
        <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />

        {/* Overlaid content */}
        <div
          className={`relative z-10 flex flex-col h-full p-4 md:p-6 ${cardsHidden ? 'pb-0' : ''}`}
          style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
          onTouchStart={onDragTouchStart}
          onTouchMove={onDragTouchMove}
          onTouchEnd={onDragTouchEnd}
        >
          {/* Top bar: toggle / counter */}
          <div className="relative z-40 overflow-visible flex flex-col items-center pb-3 pointer-events-auto mt-1 md:mt-0">
            {cardsHidden ? (
              <MediaCounterBar currentIndex={safeIndex} totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors"
                  title="Afficher les cartes"
                  aria-label="Afficher les cartes"
                  onClick={(e) => { e.stopPropagation(); showCards(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Afficher</span>
                  <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
                </button>
              </MediaCounterBar>
            ) : (
              <CardsToggleButton cardsHidden={cardsHidden} showCards={showCards} hideCards={hideCards} onMouseDownDrag={onMouseDownDrag} />
            )}
          </div>

          {/* Flip card container — hidden when cards are hidden */}
          {!cardsHidden && (
          <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0" style={{ perspective: "1200px" }}>

            <div
              className={`w-[95%] md:w-[90%] lg:w-[85%] relative ${flipped ? "h-[calc(100%-2rem)]" : "max-h-full"}`}
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT — Description */}
              <div
                className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 flex h-full min-h-0 flex-col gap-5 text-white"
                style={{ backfaceVisibility: "hidden" }}
              >
                {/* Name + toggle */}
                <div className="flex items-end gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold truncate drop-shadow-lg">{destName}</h2>
                    {destination.hook && (
                      <p className="text-sm text-white mt-1 line-clamp-2">{destination.hook}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {regionDestinations.length > 0 && (
                      <button
                        onClick={() => { playWoosh(); setFlipped(true); }}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label="Voir la carte"
                        title={language === "en" ? "View on map" : "Voir sur la carte"}
                      >
                        <MapIcon className="h-4 w-4" />
                      </button>
                    )}
                    {description && (
                      <button
                        onClick={() => setDescExpanded((p) => !p)}
                        className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label={descExpanded ? "Replier" : "Déplier"}
                      >
                        {descExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Description — collapsible */}
                {description && descExpanded && (
                  <div
                    className="min-h-0 overflow-y-auto pr-2 text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                    style={{ maxHeight: "min(35vh, 280px)" }}
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                )}
              </div>

              {/* BACK — Google Map */}
              <div
                className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm overflow-hidden flex flex-col"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {/* Back header */}
                <div className="flex items-center gap-3 p-4 text-white">
                  <button
                    onClick={() => { playWoosh(); setFlipped(false); }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label="Retourner"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h3 className="text-sm font-semibold truncate">
                    {destination?.region && destination.region.length > 0 ? destination.region.join(" · ") : (language === "en" ? "Region" : "Région")}
                  </h3>
                </div>
                {/* Map */}
                <div className="flex-1 min-h-0">
                  {flipped && destination && (
                    <MemoizedDestMap destination={destination} regionDestinations={regionDestinations} />
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Bottom tabs — same layout as BookOnlineSlidePanel */}
          {!cardsHidden && !flipped && (() => {
            const hasCityVideosTab = cityVideos.length > 0;
            const hasYoutubeTab = videos.length > 0;
            const tabs: BottomTabConfig[] = [];

            if (hasCityVideosTab) tabs.push({
              id: "cityVideos",
              label: language === "en" ? "Videos" : "Vidéos",
              renderContent: (animate, animCls) => (
                <TabScrollRail>
                  {cityVideos.map((cv, index) => {
                    const info = getVideoInfo(cv.url);
                    return (
                      <TabVideoCard
                        key={index}
                        thumbnailUrl={cv.thumbnailUrl}
                        platformThumbnailUrl={info.thumbnail}
                        label={cv.name || cv.ownerName || `${language === "en" ? "Video" : "Vidéo"} ${index + 1}`}
                        onClick={() => setFullscreenVideo(cv.url)}
                        animate={animate}
                        animationClass={animCls}
                        animationDelay={index * 120}
                      />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            if (hasYoutubeTab) tabs.push({
              id: "youtube",
              label: "YouTube",
              tabStyle: "youtube",
              renderContent: (animate, animCls) => (
                <TabScrollRail gap="gap-3">
                  {videos.map((videoUrl, index) => {
                    const info = getVideoInfo(videoUrl);
                    const cardLabel = ytTitles[videoUrl]
                      || (info.type === "youtube"
                        ? `YouTube ${index + 1}`
                        : info.type === "vimeo"
                          ? `Vimeo ${index + 1}`
                          : `${language === "en" ? "Video" : "Vidéo"} ${index + 1}`);
                    return (
                      <TabYouTubeCard
                        key={index}
                        thumbnailUrl={info.thumbnail}
                        videoPreviewUrl={info.type === "file" ? videoUrl : undefined}
                        label={cardLabel}
                        onClick={() => setFullscreenVideo(videoUrl)}
                        animate={animate}
                        animationClass={animCls}
                        animationDelay={index * 120}
                      />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            // One tab per front_structure entry with matching businesses
            for (const ft of frontTabs) {
              tabs.push({
                id: `fs-${ft.id}`,
                label: ft.name,
                renderContent: (animate, animCls) => (
                  <TabScrollRail>
                    {ft.businesses.map((biz, index) => {
                      const bizImg = biz.images && biz.images.length > 0 ? biz.images[0] : null;
                      const ratingValue = biz.computed_rating ?? biz.rating ?? null;
                      const ratingBadge = ratingValue ? (
                        <span className="absolute top-1.5 right-1.5 bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md leading-tight">
                          {(Math.round(Number(ratingValue) * 10) / 10).toFixed(1)}
                        </span>
                      ) : null;
                      return (
                        <TabCard
                          key={biz.id}
                          imageUrl={bizImg}
                          label={biz.name}
                          onClick={() => setActiveBusinessId(biz.id)}
                          animate={animate}
                          animationClass={animCls}
                          animationDelay={index * 120}
                          imageOverlay={ratingBadge}
                        />
                      );
                    })}
                  </TabScrollRail>
                ),
              });
            }

            if (tabs.length === 0) return null;

            return (
              <BottomTabsCarousel
                tabs={tabs}
                activeTab={activeBottomTab}
                onTabChange={(id) => { bottomTabInitialRef.current = false; setActiveBottomTab(id); }}
              />
            );
          })()}

          {/* Owner logo + badge */}
          <OwnerLogoOverlay
            logoBigOverlay={logoBigOverlay}
            logoBigFadingOut={logoBigFadingOut}
            cardsHidden={cardsHidden}
            currentMediaUrl={currentMedia?.url}
            videoDocs={ownerVideoDocs}
            currentBusinessId={destinationId}
          />
          <OwnerBadge
            cardsHidden={cardsHidden}
            currentMediaKind={currentMedia?.kind}
            currentMediaUrl={currentMedia?.url}
            videoDocs={ownerVideoDocs}
            currentBusinessId={destinationId}
            onNavigateToOwner={(ownerId) => {
              const cv = cityVideos.find(v => v.businessId === ownerId);
              if (cv?.ownerSlug) navigate(businessUrl({ id: cv.businessId, slug: cv.ownerSlug }));
            }}
          />

          {destination.latitude && destination.longitude && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2">
              <button
                onClick={() => setShowDirections(true)}
                className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2.5 rounded-lg text-white font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity normal-case tracking-normal"
                style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: "#C04F17" }}
              >
                <Navigation className="h-4 w-4" />
                {language === "en" ? "Directions" : "Itinéraire"}
              </button>
              {/* Video controls — Play/Pause + Sound */}
              {currentMedia?.kind === "video" && (
                <div className="flex items-center gap-6 md:gap-10 mt-1 animate-slide-up-from-bottom">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        if (videoRef.current.paused) videoRef.current.play();
                        else videoRef.current.pause();
                      }
                    }}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    aria-label={videoPaused ? "Play" : "Pause"}
                  >
                    {videoPaused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !videoRef.current.muted;
                      }
                    }}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    aria-label={videoMuted ? "Unmute" : "Mute"}
                  >
                    {videoMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Recursive business overlay */}
          {activeBusinessId && (
            <div className="absolute inset-0 -top-[3.3rem] z-[60]">
              <BookOnlineSlidePanel
                businessId={activeBusinessId}
                onClose={() => setActiveBusinessId(null)}
              />
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default DestinationSlidePanel;
