import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import OverlayShell from "@/components/overlays/OverlayShell";
import { businessUrl } from "@/lib/businessUrl";
import { MapPin, ChevronUp, ChevronDown, X, Minimize2, Star, Heart } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { MediaCounterBar, DesktopMediaArrows, CardsToggleButton, useOwnerLogo, OwnerLogoOverlay, OwnerBadge } from "@/components/CardsVisibilityToggle";
import { useNavigate } from "react-router-dom";
import BottomTabsCarousel, { TabScrollRail, TabVideoCard, TabYouTubeCard, TabCard, type BottomTabConfig } from "@/components/BottomTabsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import { useVideoSync } from "@/hooks/useVideoSync";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import PanelSearchBar from "@/components/PanelSearchBar";
import { GOLD, getVideoInfo, playWoosh } from "@/lib/overlayConstants";
import OverlayFlipCard from "@/components/overlays/OverlayFlipCard";
import FullscreenVideoOverlay from "@/components/overlays/FullscreenVideoOverlay";
import { useGeolocation } from "@/hooks/useGeolocation";
import { LazyFullscreenLightbox } from "@/components/overlays/LazyOverlays";
import ExternalVideosOverlay from "@/components/overlays/ExternalVideosOverlay";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

interface DestinationSlidePanelProps {
  destinationId: string;
  onClose: () => void;
  slideFrom?: "right" | "bottom";
  interceptCloseRef?: React.MutableRefObject<(() => boolean) | null>;
  showSearchBar?: boolean;
  onSearch?: (params: Record<string, string>) => void;
  onSearchBusinessSelect?: (businessId: string) => void;
  onPrevDestination?: () => void;
  onNextDestination?: () => void;
  hasPrevDestination?: boolean;
  hasNextDestination?: boolean;
}

interface DestinationFull {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  hook: string | null;
  hook_fr?: string | null;
  hook_en?: string | null;
  hook_ar?: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  matterport_url: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string[] | null;
  city_ids: string[] | null;
}

const DestinationSlidePanel = ({ destinationId, onClose, slideFrom = "right", interceptCloseRef, showSearchBar, onSearch, onSearchBusinessSelect, onPrevDestination, onNextDestination, hasPrevDestination, hasNextDestination }: DestinationSlidePanelProps) => {
  // Analytics: overlay_open au mount
  useEffect(() => {
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("overlay_open", { overlay: "destination", destination_id: destinationId })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const slideAnim = slideFrom === "bottom" ? "animate-slide-up-from-bottom" : "animate-slide-in-right";
  const [destination, setDestination] = useState<DestinationFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [showMosaic, setShowMosaic] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [regionDestinations, setRegionDestinations] = useState<PoiMapItem[]>([]);
  const geo = useGeolocation();
  const userLocation = geo.isEnabled && geo.coords ? geo.coords : null;
  const [frontTabs, setFrontTabs] = useState<{ id: string; name: string; businesses: { id: string; name: string; slug: string; city: string | null; neighborhood: string | null; images: string[] | null; computed_rating: number | null; rating: number | null }[] }[]>([]);
  const [cityVideos, setCityVideos] = useState<{ url: string; name: string | null; ownerName: string; thumbnailUrl: string | null; businessId: string; ownerLogo: string | null; ownerSlug: string | null }[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<string>("cityVideos");
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const bottomTabInitialRef = React.useRef(true);
  const [ytTitles, setYtTitles] = useState<Record<string, string>>({});
  const [destYoutubeVideos, setDestYoutubeVideos] = useState<{ url: string; name: string | null; thumbnail_url: string | null; description: string | null }[]>([]);
  const [defaultReview, setDefaultReview] = useState<{ author_name: string; text: string; rating: number; source: string } | null>(null);
  const [showDescriptionOverlay, setShowDescriptionOverlay] = useState(false);

  // Expose close interceptor
  React.useEffect(() => {
    if (!interceptCloseRef) return;
    interceptCloseRef.current = activeBusinessId
      ? () => { setActiveBusinessId(null); return true; }
      : null;
  }, [activeBusinessId, interceptCloseRef]);

  // NOTE: previously rewrote the URL to /destination/:name via replaceState
  // for cosmetics. This created a bounce loop with React Router: any later
  // setSearchParams call would navigate back to /search?openDestination=...
  // (because router state still thought pathname was /search), which made
  // the preview unstable. The panel is already shareable via
  // /search?openDestination=<id>, so we keep that URL as-is.


  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards,
    onTouchStart: onDragTouchStart, onTouchMove: onDragTouchMove, onTouchEnd: onDragTouchEnd, onMouseDownDrag,
  } = useDragToHide();

  // Geolocation for directions
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

  // Reset on destinationId change
  useEffect(() => {
    setCurrentMediaIndex(0);
    setShowDirections(false);
    setFlipped(false);
    setRegionDestinations([]);
    setFrontTabs([]);
    setCityVideos([]);
    bottomTabInitialRef.current = true;
    setShowDescriptionOverlay(false);
  }, [destinationId]);

  // Fetch destination data
  useEffect(() => {
    let cancelled = false;
    const fetchDestination = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, description, description_fr, description_en, description_ar, hook, hook_fr, hook_en, hook_ar, image_url, images, videos, matterport_url, latitude, longitude, region, city_ids")
        .eq("id", destinationId)
        .maybeSingle();
      if (!cancelled) {
        setDestination(data as DestinationFull | null);
        setIsLoading(false);
      }
    };
    fetchDestination();
    return () => { cancelled = true; };
  }, [destinationId]);

  // Fetch default review
  useEffect(() => {
    let cancelled = false;
    const fetchDefaultReview = async () => {
      const { data } = await supabase
        .from("destination_reviews" as any)
        .select("author_name, text, rating, source")
        .eq("destination_id", destinationId)
        .eq("is_default", true)
        .eq("is_hidden", false)
        .maybeSingle();
      if (!cancelled && data) {
        setDefaultReview(data as any);
      } else if (!cancelled) {
        setDefaultReview(null);
      }
    };
    fetchDefaultReview();
    return () => { cancelled = true; };
  }, [destinationId]);

  // Fetch destinations sharing cities
  useEffect(() => {
    if (!destination?.city_ids || destination.city_ids.length === 0) return;
    let cancelled = false;
    const fetchCityDests = async () => {
      const { data: allDests } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, latitude, longitude, images, image_url, city_ids")
        .neq("id", destinationId);
      if (cancelled || !allDests) return;
      const myCities = new Set(destination.city_ids);
      const matching = allDests.filter((d: any) =>
        d.city_ids && (d.city_ids as string[]).some((c: string) => myCities.has(c))
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
    fetchCityDests();
    return () => { cancelled = true; };
  }, [destination?.city_ids, destinationId]);

  // Fetch front_structure tabs
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    const fetchFrontTabs = async () => {
      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("business_id")
        .eq("destination_id", destinationId) as any);
      if (!links || links.length === 0) { setFrontTabs([]); return; }

      const bizIds = (links as any[]).map((l: any) => l.business_id as string);

      const [fsRes, fssRes, subsRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
      ]);
      const fsEntries = fsRes.data || [];
      const fssLinks = fssRes.data || [];
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));

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

      let destCityNames = new Set<string>();
      if (destination?.city_ids && destination.city_ids.length > 0) {
        const { data: cityRows } = await supabase
          .from("cities")
          .select("name_fr")
          .in("id", destination.city_ids);
        if (cityRows) cityRows.forEach((c: any) => { if (c.name_fr) destCityNames.add(c.name_fr); });
      }

      const all: any[] = [];
      for (let i = 0; i < bizIds.length; i += 500) {
        const chunk = bizIds.slice(i, i + 500);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, city, neighborhood, images, computed_rating, rating, total_review_count, categories, wtuce_status")
          .eq("is_active", true)
          .in("id", chunk);
        if (data) all.push(...data);
      }

      const filtered = destCityNames.size > 0
        ? all.filter(biz => biz.city && destCityNames.has(biz.city))
        : all;

      const tabs: typeof frontTabs = [];
      for (const fs of fsEntries) {
        const subNames = fsSubNames.get(fs.id);
        if (!subNames || subNames.size === 0) continue;
        const matching = filtered.filter(biz =>
          biz.categories?.some((cat: string) => subNames.has(cat))
        );
        if (matching.length === 0) continue;
        matching.sort((a: any, b: any) => {
          const aV = a.wtuce_status === "verified" ? 1 : 0;
          const bV = b.wtuce_status === "verified" ? 1 : 0;
          if (bV !== aV) return bV - aV;
          const aCount = a.total_review_count ?? 0;
          const bCount = b.total_review_count ?? 0;
          const aRating = aCount >= 10 ? (a.computed_rating ?? a.rating ?? 0) : -1;
          const bRating = bCount >= 10 ? (b.computed_rating ?? b.rating ?? 0) : -1;
          return bRating - aRating;
        });
        tabs.push({ id: fs.id, name: fs.name, businesses: matching });
      }

      if (!cancelled) setFrontTabs(tabs);
    };
    fetchFrontTabs();
    return () => { cancelled = true; };
  }, [destinationId, destination?.city_ids]);

  // Fetch destination-linked videos (business_documents + generic_videos)
  // Merged & ordered by sort_order ASC.
  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;
    const fetchDestVideos = async () => {
      const [docsRes, gvLinksRes] = await Promise.all([
        supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, business_id, sort_order")
          .eq("type", "video")
          .eq("business_is_active", true)
          .eq("destination_id", destinationId),
        supabase
          .from("generic_video_destinations" as any)
          .select("generic_video_id, sort_order")
          .eq("destination_id", destinationId) as any,
      ]);
      if (cancelled) return;

      const docs = (docsRes.data || []) as any[];
      const gvLinks = ((gvLinksRes.data || []) as any[]) as { generic_video_id: string; sort_order: number | null }[];

      const ownerIds = [...new Set(docs.map((d: any) => d.business_id))];
      const gvIds = [...new Set(gvLinks.map((l) => l.generic_video_id))];

      const [ownersRes, gvsRes] = await Promise.all([
        ownerIds.length
          ? supabase.from("businesses").select("id, name, logo_url, slug").in("id", ownerIds)
          : Promise.resolve({ data: [] as any[] } as any),
        gvIds.length
          ? (supabase.from("generic_videos" as any).select("id, url, name, thumbnail_url").in("id", gvIds) as any)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);
      if (cancelled) return;

      const ownerMap = new Map(((ownersRes.data as any[]) || []).map((o: any) => [o.id, o]));
      const gvMap = new Map(((gvsRes.data as any[]) || []).map((g: any) => [g.id, g]));

      const docItems = docs.map((d: any) => {
        const owner = ownerMap.get(d.business_id) as any;
        return {
          url: d.url as string,
          name: (d.name as string | null) ?? null,
          ownerName: owner?.name || "",
          thumbnailUrl: (d.thumbnail_url as string | null) ?? null,
          businessId: d.business_id as string,
          ownerLogo: owner?.logo_url || null,
          ownerSlug: owner?.slug || null,
          sortOrder: (d.sort_order as number | null) ?? 0,
          tieKey: `doc-${d.id}`,
        };
      });

      const gvItems = gvLinks
        .map((l) => {
          const gv = gvMap.get(l.generic_video_id) as any;
          if (!gv?.url) return null;
          return {
            url: gv.url as string,
            name: (gv.name as string | null) ?? null,
            ownerName: "",
            thumbnailUrl: (gv.thumbnail_url as string | null) ?? null,
            businessId: `gv-${l.generic_video_id}`,
            ownerLogo: null,
            ownerSlug: null,
            sortOrder: l.sort_order ?? 0,
            tieKey: `gv-${l.generic_video_id}`,
          };
        })
        .filter(Boolean) as typeof docItems;

      const merged = [...docItems, ...gvItems].sort(
        (a, b) => (a.sortOrder - b.sortOrder) || a.tieKey.localeCompare(b.tieKey),
      );
      setCityVideos(merged.map(({ sortOrder, tieKey, ...rest }) => rest));
    };
    fetchDestVideos();
    return () => { cancelled = true; };
  }, [destinationId]);

  // Fetch YouTube videos/shorts linked to this destination
  // (same logic as BookOnlineSlidePanel YouTube overlay for POI tab)
  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;
    const fetchDestYoutube = async () => {
      const [{ data: links }, { data: gvLinks }] = await Promise.all([
        supabase
          .from("business_youtube_video_destinations")
          .select("sort_order, business_youtube_videos!inner(video_id, title, thumbnail, custom_thumbnail_url, is_short, is_visible, business_is_active)")
          .eq("destination_id", destinationId)
          .eq("business_youtube_videos.is_visible", true)
          .eq("business_youtube_videos.business_is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("generic_video_destinations")
          .select("sort_order, generic_videos!inner(id, title, name, url, thumbnail_url)")
          .eq("destination_id", destinationId)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      const byvItems = (links || []).map((row: any) => {
        const v = row.business_youtube_videos;
        if (!v?.video_id) return null;
        return {
          sortOrder: row.sort_order ?? 0,
          url: v.is_short
            ? `https://www.youtube.com/shorts/${v.video_id}`
            : `https://www.youtube.com/watch?v=${v.video_id}`,
          name: v.title || null,
          thumbnail_url: v.custom_thumbnail_url || v.thumbnail || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
          description: null as string | null,
        };
      }).filter(Boolean) as any[];
      const gvItems = (gvLinks || []).map((row: any) => {
        const g = row.generic_videos;
        const url: string | null = g?.url || null;
        if (!url || !/(?:youtube\.com|youtu\.be)/i.test(url)) return null;
        return {
          sortOrder: row.sort_order ?? 0,
          url,
          name: g.title || g.name || null,
          thumbnail_url: g.thumbnail_url || null,
          description: null as string | null,
        };
      }).filter(Boolean) as any[];
      const merged = [...byvItems, ...gvItems]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ sortOrder, ...rest }) => rest);
      setDestYoutubeVideos(merged);
    };
    fetchDestYoutube();
    return () => { cancelled = true; };
  }, [destinationId]);

  // Fetch YouTube titles
  const videos = destination?.videos?.filter(Boolean) || [];
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
            if (res.ok) { const data = await res.json(); if (data.title) results[url] = data.title; }
          } catch {}
        })
      );
      if (!cancelled) setYtTitles(results);
    };
    fetchTitles();
    return () => { cancelled = true; };
  }, [videos.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const destName = destination
    ? (language === "en" && destination.name_en ? destination.name_en : destination.name_fr)
    : "";

  const images = destination?.images?.filter(Boolean) || [];
  const mainImage = destination?.image_url;
  const allImages = mainImage && !images.includes(mainImage) ? [mainImage, ...images] : images;
  const matterportUrl = destination?.matterport_url || null;
  const description = destination
    ? (language === "en" ? (destination.description_en || destination.description_fr || destination.description)
        : language === "ar" ? (destination.description_ar || destination.description_fr || destination.description)
        : (destination.description_fr || destination.description)) || null
    : null;
  const localizedHook = destination
    ? (language === "en" ? (destination.hook_en || destination.hook_fr || destination.hook)
        : language === "ar" ? (destination.hook_ar || destination.hook_fr || destination.hook)
        : (destination.hook_fr || destination.hook)) || null
    : null;

  const fileVideos = videos.filter((v) => getVideoInfo(v).type === "file");
  const cityFileVideos = cityVideos.filter((cv) => getVideoInfo(cv.url).type === "file");

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string } | { kind: "matterport"; url: string };
  const mediaItems: MediaItem[] = useMemo(() => [
    ...cityFileVideos.map((cv) => ({ kind: "video" as const, url: cv.url })),
    ...fileVideos.map((v) => ({ kind: "video" as const, url: v })),
    ...allImages.map((i) => ({ kind: "image" as const, url: i })),
  ], [cityFileVideos, fileVideos, allImages]);

  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  const ownerVideoDocs = useMemo(() => cityVideos.map(cv => ({
    url: cv.url,
    owner_business_id: cv.businessId,
    owner_logo: cv.ownerLogo,
    owner_name: cv.ownerName || null,
  })), [cityVideos]);

  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, ownerVideoDocs, destinationId);

  const lightboxItems: LightboxMediaItem[] = useMemo(() => [
    ...allImages.map((url) => ({ type: "image" as const, src: url, alt: destName })),
    ...videos.map((url) => ({ type: "video" as const, src: url, alt: destName })),
    ...(matterportUrl ? [{ type: "matterport" as const, src: matterportUrl, alt: `${destName} – Visite 3D` }] : []),
  ], [allImages, videos, matterportUrl, destName]);

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  // Horizontal swipe on media → navigate between media; vertical swipe → prev/next destination
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleMediaTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleMediaTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > 60 && absX > absY * 1.5) {
      goMedia(dx < 0 ? 1 : -1);
    } else if (absY > 60 && absY > absX * 1.5) {
      if (dy < 0 && hasNextDestination) onNextDestination?.();
      else if (dy > 0 && hasPrevDestination) onPrevDestination?.();
    }
  }, [goMedia, hasNextDestination, hasPrevDestination, onNextDestination, onPrevDestination]);

  // Shared video sync hook
  const { videoPaused, videoMuted, pauseAndMute } = useVideoSync(videoRef as React.RefObject<HTMLVideoElement>, currentMedia);

  // Pause & mute video when overlay opens
  useEffect(() => {
    const overlayOpen = showDirections || showLocationMap || showYoutubeOverlay || !!fullscreenVideo || !!activeBusinessId;
    if (overlayOpen) pauseAndMute();
  }, [showDirections, showLocationMap, showYoutubeOverlay, fullscreenVideo, activeBusinessId]);

  // Aucune barre liquid-glass du bas quand un overlay Google Map est ouvert
  const mapOverlayOpen = showDirections || showLocationMap;
  useEffect(() => {
    if (!mapOverlayOpen) return;
    document.body.dataset.mapOverlay = "1";
    return () => { delete document.body.dataset.mapOverlay; };
  }, [mapOverlayOpen]);


  if (isLoading) {
    return (
      <OverlayShell zClass="z-[80]" animClass={slideAnim} bg="bg-black" className="flex items-center justify-center" coverToolbar={false}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </OverlayShell>
    );
  }

  if (!destination) return null;

  return (
    <OverlayShell zClass="z-[80]" animClass={slideAnim} bg="bg-black" className="flex flex-col" coverToolbar={false}>
      {/* Close button */}
      {!fullscreenVideo && !showDirections && !showLocationMap && !showYoutubeOverlay && (
        <>
          <div className="absolute top-3 left-3 z-[80] flex items-center gap-2">
            <button
              onClick={() => { if (activeBusinessId) { setActiveBusinessId(null); return; } onClose(); }}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute top-3 right-3 z-[80] flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-2xl hover:bg-white/90 transition-opacity shrink-0"
              title="Le Club OWM"
              aria-label="Le Club OWM"
            >
              <Heart className="h-4 w-4" />
            </button>
            <ShareButton title={destName} variant="dark" className="shrink-0" />
          </div>
        </>
      )}

      {/* Directions overlay */}
      {showDirections && destination.latitude && destination.longitude && (() => {
        const dest = `${destination.latitude},${destination.longitude}`;
        return (
          <div className="absolute inset-0 z-[75] bg-white flex flex-col animate-slide-up-from-bottom">
            <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
              <button onClick={() => setShowDirections(false)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity" aria-label="Fermer l'itinéraire">
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center bg-muted rounded-full p-0.5">
                  <button onClick={() => setDirectionsMode("walking")} className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    🚶 {language === "en" ? "Walking" : "À pied"}
                  </button>
                  <button onClick={() => setDirectionsMode("driving")} className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
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
                src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_EMBED_KEY}&origin=${userOrigin || "My+location"}&destination=${dest}&mode=${directionsMode}`}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                title={`Itinéraire vers ${destName}`}
              />
            </div>
          </div>
        );
      })()}

      {/* Fullscreen video overlay — shared component */}
      {fullscreenVideo && (
        <FullscreenVideoOverlay videoUrl={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}

      {/* Mosaic overlay */}
      {showMosaic && (
        <OverlayShell zClass="z-[76]" coverToolbar={false}>
          <div className="absolute inset-0 bg-black overflow-y-auto animate-slide-in-left">
            <div className="sticky top-0 z-10 flex items-center bg-black px-2 py-2">
              <button
                onClick={() => setShowMosaic(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
                aria-label="Fermer la mosaïque"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 pt-0">
              {allImages.map((url, i) => (
                <div key={`i-${i}`} className="relative aspect-square cursor-pointer overflow-hidden rounded-lg" onClick={() => setLightboxIndex(i)}>
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </OverlayShell>
      )}

      {/* Location map overlay */}
      {showLocationMap && destination.latitude && destination.longitude && (
        <OverlayShell zClass="z-[80]" desktopOnly={false} animClass="animate-slide-up-from-bottom">
          <div className="sticky top-0 z-10 flex items-center px-4 py-2 gap-2 bg-black/30 backdrop-blur-sm">
            <button
              onClick={() => setShowLocationMap(false)}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-opacity"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-white truncate drop-shadow-md">{destName}</span>
          </div>
          <div className="flex-1 min-h-0 -mt-[3.25rem]">
            <PoiGoogleMap
              pois={[
                {
                  id: destination.id,
                  name: destName,
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                  images: (destination.images && destination.images.length > 0) ? destination.images : (destination.image_url ? [destination.image_url] : null),
                  city: null,
                  neighborhood: null,
                  markerColor: { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" },
                } as PoiMapItem,
                ...regionDestinations.filter((d) => d.id !== destination.id),
              ]}
              selectedPoiId={destination.id}
              center={{ lat: destination.latitude, lng: destination.longitude }}
              fitToMarkers
              userLocation={userLocation}
            />
          </div>
        </OverlayShell>
      )}

      {/* YouTube videos overlay — merges destination.videos + videos liées via
          business_youtube_video_destinations (shorts & longues), comme dans
          BookOnlineSlidePanel pour l'onglet POI. */}
      {showYoutubeOverlay && (() => {
        const directItems = (destination.videos || [])
          .filter((u) => /(?:youtube\.com|youtu\.be)/i.test(u))
          .map((url) => ({ url, name: ytTitles[url] || null, thumbnail_url: null as string | null, description: null as string | null }));
        const getId = (u: string) => {
          const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
          return m ? m[1] : u;
        };
        const seen = new Set(directItems.map((v) => getId(v.url)));
        const linked = destYoutubeVideos.filter((v) => !seen.has(getId(v.url)));
        return (
          <ExternalVideosOverlay
            videos={[...directItems, ...linked]}
            businessName={destName}
            onClose={() => setShowYoutubeOverlay(false)}
          />
        );
      })()}


      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && (
        <Suspense fallback={null}>
          <LazyFullscreenLightbox
            items={lightboxItems}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        </Suspense>
      )}

      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0" onTouchStart={handleMediaTouchStart} onTouchEnd={handleMediaTouchEnd}>
          {currentMedia?.kind === "video" ? (
            <video ref={videoRef} key={currentMedia.url} src={currentMedia.url} className="w-full h-full bg-black object-cover" loop muted autoPlay playsInline preload="auto" />

          ) : currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={destName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted"><MapPin className="h-16 w-16 text-muted-foreground/40" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />

        {(onPrevDestination || onNextDestination) && (
          <div className={`absolute top-1/2 -translate-y-1/2 right-3 z-30 ${cardsHidden ? 'flex' : 'hidden md:flex'} flex-col gap-2 pointer-events-none`}>
            <button
              type="button"
              onClick={onPrevDestination}
              disabled={!hasPrevDestination}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Destination précédente"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <div className="w-9 h-9" />
            <button
              type="button"
              onClick={onNextDestination}
              disabled={!hasNextDestination}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Destination suivante"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Left sidebar CTAs */}
        {!cardsHidden && (() => {
          const hasLoc = !!(destination.latitude && destination.longitude);
          const youtubeUrls = (destination.videos || []).filter((u) => /(?:youtube\.com|youtu\.be)/i.test(u));
          const hasYoutube = youtubeUrls.length > 0 || destYoutubeVideos.length > 0;
          if (!hasLoc && !hasYoutube) return null;
          return (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
              {hasLoc && (
                <div onClick={() => setShowLocationMap(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
                  <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Montserrat',sans-serif]">Localisation</span>
                  <MapPin className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300" />
                </div>
              )}
              {hasYoutube && (
                <div onClick={() => setShowYoutubeOverlay(true)} className="group flex items-center h-10 rounded-r-full border border-l-0 border-white/10 text-white backdrop-blur-md bg-black/80 hover:bg-black/90 shadow-[8px_4px_12px_rgba(0,0,0,0.3)] pr-3 transition-all duration-300 ease-out cursor-pointer pl-3 group-hover:pl-4">
                  <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-out text-[11px] font-medium uppercase whitespace-nowrap font-['Montserrat',sans-serif]">YouTube</span>
                  <YouTubeIcon className="h-[22px] w-[22px] shrink-0 group-hover:ml-2 transition-[margin] duration-300 text-red-600" />
                </div>
              )}
            </div>
          );
        })()}


        {/* Overlaid content */}
        <div
          className={`relative z-10 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain h-full p-4 pt-16 md:p-6 md:pt-20 lg:pt-16 ${cardsHidden ? 'pb-0' : showSearchBar ? 'pb-[calc(95px+env(safe-area-inset-bottom))] md:pb-[95px]' : 'pb-[calc(2rem+env(safe-area-inset-bottom))]'} scrollbar-hide-mobile`}
          style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
          onTouchStart={onDragTouchStart} onTouchMove={onDragTouchMove} onTouchEnd={onDragTouchEnd}
        >
          {/* Destination name — dark rounded rectangle (like BookOnlineSlidePanel BusinessHeader) */}
          <div className={`shrink-0 flex justify-center px-4 ${cardsHidden ? 'invisible' : ''}`} aria-hidden={cardsHidden}>
            <div className="rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 text-white pointer-events-auto animate-slide-in-right">
              <h2
                className="text-base md:text-xl font-bold uppercase text-center"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.12em',
                  WebkitTextStroke: '0.8px currentColor',
                  textShadow: '0 0 0 currentColor',
                }}
              >
                {destName}
              </h2>
            </div>
          </div>

          {/* Top bar: toggle — below name (like BookOnlineSlidePanel) */}
          <div className="relative z-40 overflow-visible flex flex-col items-center pt-2 pb-3 pointer-events-auto">
            {cardsHidden ? (
              <MediaCounterBar currentIndex={safeIndex} totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)}>
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors" title="Afficher les cartes" aria-label="Afficher les cartes" onClick={(e) => { e.stopPropagation(); showCards(); }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Afficher</span>
                  <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
                </button>
              </MediaCounterBar>
            ) : (
              <CardsToggleButton cardsHidden={cardsHidden} showCards={showCards} hideCards={hideCards} onMouseDownDrag={onMouseDownDrag} />
            )}
          </div>


          {/* Centered hook + "+" button to open full description overlay */}
          {!cardsHidden && !flipped && (localizedHook || description) && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
              <div className="relative flex items-center justify-center">
                {localizedHook && (
                  <p
                    className="hidden md:block absolute bottom-full mb-6 left-1/2 -translate-x-1/2 w-[85vw] md:w-xl max-w-xl text-lg md:text-xl text-white/90 font-bold text-center leading-relaxed pointer-events-none [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {localizedHook}
                  </p>
                )}
                {description && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDescriptionOverlay(true); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowDescriptionOverlay(true); }}
                    className="pointer-events-auto group flex flex-col items-center gap-2 touch-manipulation"
                    aria-label={language === "en" ? "Read more" : "Lire la suite"}
                  >
                    <div
                      className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transform-gpu transition-transform duration-200 ease-out will-change-transform group-hover:scale-150"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <span className="text-2xl text-white font-light leading-none">+</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Middle & bottom content: carousel, CTA, owner buttons */}
          {!cardsHidden && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1" />



              {/* Bottom tabs removed — kept only on /videos footer */}

              {/* CTA itinéraire — visuel aligné sur BookOnlineSlidePanel/CtaBar */}
              {destination.latitude && destination.longitude && (
                  <div className="shrink-0 pt-6 pb-2 lg:pb-2 flex flex-col items-center gap-2 pointer-events-auto">
                    <div className="w-1/2 md:w-3/4 md:px-0 pointer-events-auto flex justify-center gap-2">
                    <div className="flex-1 md:flex-none md:w-1/3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDirections(true); }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowDirections(true); }}
                        className="relative overflow-hidden flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-in-left touch-manipulation shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.28)] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-white/5 after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-[inherit] after:pointer-events-none after:bg-gradient-to-b after:from-white/25 after:to-transparent after:blur-[1px] [&>*]:relative [&>*]:z-10"
                        style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}
                      >
                        <MapPin className="h-4 w-4 hidden md:block" />
                        <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner logo + badge */}
              <div className="shrink-0 py-2 lg:pb-2 flex flex-col items-center gap-2 pointer-events-auto">
                <OwnerLogoOverlay logoBigOverlay={logoBigOverlay} logoBigFadingOut={logoBigFadingOut} cardsHidden={cardsHidden} currentMediaUrl={currentMedia?.url} videoDocs={ownerVideoDocs} currentBusinessId={destinationId} />
                <OwnerBadge
                  cardsHidden={cardsHidden} currentMediaKind={currentMedia?.kind} currentMediaUrl={currentMedia?.url}
                  videoDocs={ownerVideoDocs} currentBusinessId={destinationId}
                  onNavigateToOwner={(ownerId) => {
                    const cv = cityVideos.find(v => v.businessId === ownerId);
                    if (cv?.ownerSlug) navigate(businessUrl({ id: cv.businessId, slug: cv.ownerSlug }));
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearchBar && !cardsHidden && !showDescriptionOverlay && !showDirections && !showLocationMap && !showYoutubeOverlay && !activeBusinessId && (
      <PanelSearchBar
        onAiClick={() => window.dispatchEvent(new Event("open-ai-tab"))}
        iconVariant="black"
        darkBackground
        compact
        onSearch={onSearch}
        onBusinessSelect={onSearchBusinessSelect}
        videoControls={
          currentMedia?.kind === "video" ? {
            type: "file",
            videoRef: videoRef as React.RefObject<HTMLVideoElement>,
            paused: videoPaused,
            muted: videoMuted,
          } : undefined
        }
      />
      )}

      {/* Full Description Overlay */}
      {showDescriptionOverlay && description && (
        <OverlayShell zClass="z-[85]" animClass="animate-zoom-out-center" className="flex flex-col">
          {allImages[0] ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${allImages[0]})` }}
            >
              <div className="absolute inset-0 bg-black/70" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-background" />
          )}
          <div className="relative z-30 shrink-0 flex items-center gap-3 px-4 py-3 bg-transparent backdrop-blur-sm border-b border-white/10">
            <button
              onClick={() => setShowDescriptionOverlay(false)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors shrink-0"
              aria-label={language === "en" ? "Close" : "Fermer"}
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold uppercase font-['Montserrat',sans-serif] truncate text-white flex-1">{destName}</h2>
          </div>
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="px-4 pt-4 pb-6 md:pl-6 md:pt-6 pr-4 md:pr-6">
              <div
                className="prose prose-invert prose-base max-w-none break-words text-base leading-[1.625] font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] prose-josefin-headings prose-h2:text-base md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl !text-white [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li::marker]:!text-white [&_h2]:!font-bold [&_h2]:!uppercase [&_h3]:!font-bold [&_img]:max-w-full [&_img]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic prose-strong:!text-white"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          </div>
        </OverlayShell>
      )}



      {/* Recursive business overlay */}
      {activeBusinessId && (
        <OverlayShell zClass="z-[60]" coverToolbar={false}>
          <BookOnlineSlidePanel
            businessId={activeBusinessId}
            onClose={() => setActiveBusinessId(null)}
            showSearchBar={showSearchBar}
            onSearch={onSearch}
            onSearchBusinessSelect={onSearchBusinessSelect}
          />
        </OverlayShell>
      )}
    </OverlayShell>
  );
};

export default DestinationSlidePanel;
