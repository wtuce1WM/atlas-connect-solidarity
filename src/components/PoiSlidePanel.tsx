import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { MapPin, ChevronUp, X, Navigation, Minimize2, Play, Pause, Volume2, VolumeX, CalendarCheck, ShoppingBag, ExternalLink } from "lucide-react";
import BookingOverlay from "@/components/BookingOverlay";
import { MediaCounterBar, DesktopMediaArrows, CardsToggleButton, useOwnerLogo, OwnerLogoOverlay, OwnerBadge } from "@/components/CardsVisibilityToggle";
import { useNavigate } from "react-router-dom";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import BottomTabsCarousel, { TabScrollRail, TabVideoCard, TabCard, type BottomTabConfig } from "@/components/BottomTabsCarousel";
import { useDragToHide } from "@/hooks/useDragToHide";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GOLD, getVideoInfo, playWoosh } from "@/lib/overlayConstants";
import OverlayFlipCard from "@/components/overlays/OverlayFlipCard";
import { LazyDirectionsOverlay, LazyMosaicOverlay, LazyFullscreenLightbox } from "@/components/overlays/LazyOverlays";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import { businessUrl } from "@/lib/businessUrl";

interface PoiSlidePanelProps {
  businessId: string;
  onClose: () => void;
  slideFrom?: "right" | "bottom";
}

interface PoiFull {
  id: string;
  name: string;
  description: string | null;
  poi_description: string | null;
  poi_hook: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  images: string[] | null;
  video_1_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  logo_url: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  reserve_now_url: string | null;
  reserve_now_force_external: boolean;
  presentation_mode: string;
  online_shop_url: string | null;
  online_shop_force_external: boolean;
  online_shop_presentation_mode: string;
  website: string | null;
  website_force_external: boolean;
  website_presentation_mode: string;
}

const PoiSlidePanel = ({ businessId, onClose, slideFrom = "bottom" }: PoiSlidePanelProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const slideAnim = slideFrom === "bottom" ? "animate-slide-up-from-bottom" : "animate-slide-in-right";
  const savedUrlRef = useRef(window.location.pathname + window.location.search);
  const [poi, setPoi] = useState<PoiFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [showMosaic, setShowMosaic] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [linkedPois, setLinkedPois] = useState<PoiMapItem[]>([]);
  const [cityPoisForTabs, setCityPoisForTabs] = useState<{ id: string; name: string; slug: string; images: string[] | null; rating: number | null }[]>([]);
  const [linkedVideos, setLinkedVideos] = useState<{ url: string; name: string | null; thumbnailUrl: string | null; businessId: string; ownerName: string; ownerLogo: string | null; ownerSlug: string | null }[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<string>("videos");
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [openedPoiBusinessId, setOpenedPoiBusinessId] = useState<string | null>(null);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string | undefined>(undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);
  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards,
    onTouchStart: onDragTouchStart, onTouchMove: onDragTouchMove, onTouchEnd: onDragTouchEnd, onMouseDownDrag,
  } = useDragToHide();

  // Reset state on businessId change
  useEffect(() => {
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setShowDirections(false);
    setShowMosaic(false);
    setIsLightboxOpen(false);
    setFlipped(false);
    setLinkedPois([]);
    setCityPoisForTabs([]);
    setLinkedVideos([]);
  }, [businessId]);

  // Pause/mute background video when an overlay opens (directions, booking, mosaic, lightbox)
  useEffect(() => {
    const overlayOpen = showDirections || showBookingOverlay || showMosaic || isLightboxOpen || !!fullscreenVideo || !!openedPoiBusinessId;
    if (overlayOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      setVideoPaused(true);
      setVideoMuted(true);
    }
  }, [showDirections, showBookingOverlay, showMosaic, isLightboxOpen, fullscreenVideo, openedPoiBusinessId]);

  // Cosmetic URL rewriting
  useEffect(() => {
    if (poi?.name) {
      window.history.replaceState(null, "", `/poi/${encodeURIComponent(poi.name)}`);
    }
  }, [poi?.name]);

  // Restore URL on unmount
  useEffect(() => {
    const saved = savedUrlRef.current;
    return () => { window.history.replaceState(null, "", saved); };
  }, []);

  // Fetch POI data
  useEffect(() => {
    let cancelled = false;
    const fetchPoi = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, poi_description, poi_hook, hook_fr, hook_en, hook_ar, images, video_1_url, latitude, longitude, city, neighborhood, address, phone, whatsapp, skype, logo_url, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, reserve_now_url, reserve_now_force_external, presentation_mode, online_shop_url, online_shop_force_external, online_shop_presentation_mode, website, website_force_external, website_presentation_mode")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      setPoi(data as PoiFull | null);
      setIsLoading(false);
    };
    fetchPoi();
    return () => { cancelled = true; };
  }, [businessId]);

  // Fetch POI businesses linked to this POI
  useEffect(() => {
    let cancelled = false;

    const fetchLinkedPois = async () => {
      const { data: poiLinks } = await supabase
        .from("business_poi_businesses")
        .select("poi_business_id")
        .eq("business_id", businessId);

      const poiIds = ((poiLinks || []) as { poi_business_id: string }[])
        .map((link) => link.poi_business_id)
        .filter((id) => id !== businessId);

      if (cancelled || poiIds.length === 0) {
        if (!cancelled) {
          setLinkedPois([]);
          setCityPoisForTabs([]);
        }
        return;
      }

      const { data: pois } = await supabase
        .from("businesses")
        .select("id, name, slug, latitude, longitude, images, city, neighborhood, rating, main_category")
        .in("id", poiIds)
        .eq("is_active", true);

      if (cancelled || !pois) return;

      setLinkedPois(
        pois.map((b) => ({
          id: b.id,
          name: b.name,
          latitude: b.latitude,
          longitude: b.longitude,
          images: b.images,
          city: b.city,
          neighborhood: b.neighborhood,
          rating: b.rating ? Number(b.rating) : null,
          subcategory: b.main_category,
        }))
      );

      setCityPoisForTabs(
        pois.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          images: b.images,
          rating: b.rating ? Number(b.rating) : null,
        }))
      );
    };

    fetchLinkedPois();
    return () => { cancelled = true; };
  }, [businessId]);

  // Fetch videos linked to this POI (business_documents.poi_id) + POI's own videos (business_documents.business_id)
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const fetchVideos = async () => {
      // Fetch both: videos from owners linked via poi_id AND videos owned by the POI itself
      const [{ data: poiLinkedDocs }, { data: ownDocs }] = await Promise.all([
        supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, business_id")
          .eq("type", "video")
          .eq("poi_id", businessId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, business_id")
          .eq("type", "video")
          .eq("business_id", businessId)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      // Merge & deduplicate by URL
      const seen = new Set<string>();
      const allDocs: typeof poiLinkedDocs = [];
      for (const d of [...(poiLinkedDocs || []), ...(ownDocs || [])]) {
        if (!seen.has(d.url)) { seen.add(d.url); allDocs.push(d); }
      }
      if (allDocs.length === 0) { setLinkedVideos([]); return; }
      const ownerIds = [...new Set(allDocs.map(d => d.business_id))];
      const { data: owners } = await supabase
        .from("businesses")
        .select("id, name, logo_url, slug")
        .in("id", ownerIds);
      if (cancelled) return;
      const ownerMap = new Map((owners || []).map(o => [o.id, o]));
      setLinkedVideos(allDocs.map(d => {
        const owner = ownerMap.get(d.business_id);
        return {
          url: d.url, name: d.name,
          ownerName: owner?.name || "",
          thumbnailUrl: d.thumbnail_url,
          businessId: d.business_id,
          ownerLogo: owner?.logo_url || null,
          ownerSlug: owner?.slug || null,
        };
      }));
    };
    fetchVideos();
    return () => { cancelled = true; };
  }, [businessId]);

  const images = poi?.images?.filter(Boolean) || [];
  const ownVideos = poi?.video_1_url ? [poi.video_1_url] : [];
  const poiFileVideos = linkedVideos.filter((v) => getVideoInfo(v.url).type === "file");

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };
  const mediaItems: MediaItem[] = useMemo(() => [
    ...poiFileVideos.map((cv) => ({ kind: "video" as const, url: cv.url })),
    ...ownVideos.filter(v => getVideoInfo(v).type === "file").map((v) => ({ kind: "video" as const, url: v })),
    ...images.map((i) => ({ kind: "image" as const, url: i })),
  ], [poiFileVideos, ownVideos, images]);

  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  const ownerVideoDocs = useMemo(() => linkedVideos.map(cv => ({
    url: cv.url,
    owner_business_id: cv.businessId,
    owner_logo: cv.ownerLogo,
    owner_name: cv.ownerName || null,
  })), [linkedVideos]);

  const { logoBigOverlay, logoBigFadingOut } = useOwnerLogo(cardsHidden, currentMediaIndex, mediaItems, ownerVideoDocs, businessId);

  const displayDescription = poi?.poi_description || poi?.description || null;
  const displayHook = useMemo(() => {
    const specificPoiHook = poi?.poi_hook?.trim();
    if (specificPoiHook) return specificPoiHook;
    const localizedHook =
      language === "ar" ? poi?.hook_ar?.trim()
        : language === "en" ? poi?.hook_en?.trim()
          : poi?.hook_fr?.trim();
    return localizedHook || poi?.hook_fr?.trim() || poi?.hook_en?.trim() || poi?.hook_ar?.trim() || null;
  }, [language, poi?.hook_ar, poi?.hook_en, poi?.hook_fr, poi?.poi_hook]);

  const lightboxItems: LightboxMediaItem[] = useMemo(
    () => [
      ...images.map((url) => ({ type: "image" as const, src: url, alt: poi?.name || "" })),
      ...ownVideos.map((url) => ({ type: "video" as const, src: url, alt: poi?.name || "" })),
    ],
    [images, ownVideos, poi?.name]
  );

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  // Sync video state
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

  if (!poi) return null;

  return (
    <div className={`absolute inset-0 z-[70] bg-black overflow-hidden ${slideAnim}`}>
      {/* Close + mosaic buttons */}
      {!fullscreenVideo && !showDirections && !isLightboxOpen && (
        <div className="absolute top-3 left-3 z-[80] flex items-center gap-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
          {totalMedia > 0 && (
            <button onClick={() => setShowMosaic((p) => !p)} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors" title={showMosaic ? "Fermer la mosaïque" : "Voir tous les médias"}>
              {showMosaic ? <Minimize2 className="h-4 w-4" /> : <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />}
            </button>
          )}
        </div>
      )}

      {/* Lazy-loaded overlays */}
      <Suspense fallback={null}>
        {showDirections && poi.latitude && poi.longitude && (
          <LazyDirectionsOverlay
            business={{ name: poi.name, address: poi.address, latitude: poi.latitude, longitude: poi.longitude, city: poi.city, phone: poi.phone, whatsapp: poi.whatsapp, skype: poi.skype, logo_url: poi.logo_url, opening_hours: poi.opening_hours, show_opening_hours: poi.show_opening_hours, is_open_24h: poi.is_open_24h, google_rating: poi.google_rating, google_review_count: poi.google_review_count, tripadvisor_rating: poi.tripadvisor_rating, tripadvisor_review_count: poi.tripadvisor_review_count, restaurant_guru_rating: poi.restaurant_guru_rating, restaurant_guru_review_count: poi.restaurant_guru_review_count } as any}
            onClose={() => setShowDirections(false)}
          />
        )}

        {showMosaic && (
          <LazyMosaicOverlay
            mediaItems={mediaItems.map((m) => ({ kind: m.kind, url: m.url }))}
            onClose={() => setShowMosaic(false)}
            onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
          />
        )}

        {isLightboxOpen && lightboxItems.length > 0 && (
          <LazyFullscreenLightbox
            items={lightboxItems}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </Suspense>

      {/* Fullscreen video overlay */}
      {fullscreenVideo && (() => {
        const fvInfo = getVideoInfo(fullscreenVideo);
        let embedSrc = fullscreenVideo;
        if (fvInfo.type === "youtube") embedSrc = `https://www.youtube.com/embed/${fvInfo.id}?autoplay=1&rel=0&controls=1&modestbranding=1`;
        else if (fvInfo.type === "vimeo") embedSrc = `https://player.vimeo.com/video/${fvInfo.id}?autoplay=1`;
        return (
          <div className="absolute inset-0 z-[76] bg-black flex flex-col animate-slide-in-left">
            <div className="shrink-0 flex items-center px-3 py-2">
              <button onClick={() => setFullscreenVideo(null)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors" aria-label="Fermer">
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

      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" ? (
            <video ref={videoRef} key={currentMedia.url} src={currentMedia.url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={poi.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        <DesktopMediaArrows totalMedia={totalMedia} cardsHidden={cardsHidden} onPrev={() => goMedia(-1)} onNext={() => goMedia(1)} />

        {/* Overlaid content */}
        <div
          className={`relative z-10 flex flex-col h-full p-4 md:p-6 ${cardsHidden ? 'pb-0' : ''}`}
          style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
          onTouchStart={onDragTouchStart} onTouchMove={onDragTouchMove} onTouchEnd={onDragTouchEnd}
        >
          {/* Top bar — show/hide toggle */}
          <div className="relative z-40 overflow-visible flex flex-col items-center pb-3 pointer-events-auto mt-1 md:mt-0">
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

          {/* Flip card — shared component */}
          {!cardsHidden && (
            <OverlayFlipCard
              flipped={flipped}
              onFlip={() => { playWoosh(wooshSfx); setFlipped(true); }}
              onUnflip={() => { playWoosh(wooshSfx); setFlipped(false); }}
              name={poi.name}
              hook={displayHook}
              description={displayDescription}
              descExpanded={descExpanded}
              onToggleDesc={() => setDescExpanded((p) => !p)}
              mapMarkers={linkedPois}
              selectedMarkerId={poi.id}
              selectedLat={poi.latitude}
              selectedLng={poi.longitude}
              backLabel={language === "en" ? "Nearby" : "À proximité"}
            />
          )}

          {/* Bottom tabs carousel */}
          {!cardsHidden && !flipped && (() => {
            const hasVideosTab = linkedVideos.length > 0;
            const hasPoisTab = cityPoisForTabs.length > 0;
            const tabs: BottomTabConfig[] = [];

            if (hasVideosTab) tabs.push({
              id: "videos",
              label: language === "en" ? "Videos" : "Vidéos",
              renderContent: (animate, animCls) => (
                <TabScrollRail>
                  {linkedVideos.map((cv, index) => {
                    const info = getVideoInfo(cv.url);
                    return (
                      <TabVideoCard key={index} thumbnailUrl={cv.thumbnailUrl} platformThumbnailUrl={info.thumbnail} label={cv.name || cv.ownerName || `${language === "en" ? "Video" : "Vidéo"} ${index + 1}`} onClick={() => setFullscreenVideo(cv.url)} animate={animate} animationClass={animCls} animationDelay={index * 120} />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            if (hasPoisTab) tabs.push({
              id: "pois",
              label: language === "en" ? "NEARBY" : "À PROXIMITÉ",
              renderContent: (animate, animCls) => (
                <TabScrollRail>
                  {cityPoisForTabs.map((p, index) => {
                    const img = p.images && p.images.length > 0 ? p.images[0] : null;
                    return (
                      <TabCard key={p.id} imageUrl={img} label={p.name} onClick={() => setOpenedPoiBusinessId(p.id)} animate={animate} animationClass={animCls} animationDelay={index * 120} />
                    );
                  })}
                </TabScrollRail>
              ),
            });

            if (tabs.length === 0) return null;
            return <BottomTabsCarousel tabs={tabs} activeTab={activeBottomTab} onTabChange={setActiveBottomTab} />;
          })()}

          {/* Owner logo + badge */}
          <OwnerLogoOverlay logoBigOverlay={logoBigOverlay} logoBigFadingOut={logoBigFadingOut} cardsHidden={cardsHidden} currentMediaUrl={currentMedia?.url} videoDocs={ownerVideoDocs} currentBusinessId={businessId} />
          <OwnerBadge
            cardsHidden={cardsHidden} currentMediaKind={currentMedia?.kind} currentMediaUrl={currentMedia?.url}
            videoDocs={ownerVideoDocs} currentBusinessId={businessId}
            onNavigateToOwner={(ownerId) => {
              const cv = linkedVideos.find(v => v.businessId === ownerId);
              if (cv?.ownerSlug) navigate(businessUrl({ id: cv.businessId, slug: cv.ownerSlug }));
            }}
          />

          {/* CTAs + video controls */}
          {(() => {
            const ctaModeLabels: Record<string, { fr: string; en: string }> = {
              acheter_en_ligne: { fr: 'Acheter en ligne', en: 'Shop Online' },
              reserver_en_ligne: { fr: 'Réserver en ligne', en: 'Book Online' },
              consulter_offre: { fr: 'Consulter notre offre', en: 'View Our Offer' },
              plus_informations: { fr: "Plus d'informations", en: 'More Information' },
              contactez_nous: { fr: 'Contactez nous', en: 'Contact Us' },
            };
            const ctaItems: React.ReactNode[] = [];

            // Booking / Reserve CTA
            if (poi.reserve_now_url) {
              const fullUrl = poi.reserve_now_url.startsWith("http") ? poi.reserve_now_url : `https://${poi.reserve_now_url}`;
              const label = ctaModeLabels[poi.presentation_mode]?.[language === "en" ? "en" : "fr"] || ctaModeLabels.reserver_en_ligne[language === "en" ? "en" : "fr"];
              if (poi.reserve_now_force_external) {
                ctaItems.push(
                  <a key="booking" href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
                    <CalendarCheck className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
                  </a>
                );
              } else {
                ctaItems.push(
                  <button key="booking" onClick={() => { setBookingOverlayUrl(fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }} className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
                    <CalendarCheck className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              }
            }

            // Shop CTA
            if (poi.online_shop_url) {
              const fullUrl = poi.online_shop_url.startsWith("http") ? poi.online_shop_url : `https://${poi.online_shop_url}`;
              const label = ctaModeLabels[poi.online_shop_presentation_mode]?.[language === "en" ? "en" : "fr"] || ctaModeLabels.acheter_en_ligne[language === "en" ? "en" : "fr"];
              if (poi.online_shop_force_external) {
                ctaItems.push(
                  <a key="shop" href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
                    <ShoppingBag className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
                  </a>
                );
              } else {
                ctaItems.push(
                  <button key="shop" onClick={() => { setBookingOverlayUrl(fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }} className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-black [&_*]:text-black normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
                    <ShoppingBag className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              }
            }

            // Directions CTA
            if (poi.latitude && poi.longitude) {
              ctaItems.push(
                <button key="directions" onClick={() => setShowDirections(true)} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-up-from-bottom" style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
                  <Navigation className="h-4 w-4 hidden md:block" />
                  <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
                </button>
              );
            }

            if (ctaItems.length === 0) return null;
            return (
              <div className="shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto">
                <div className="w-full md:w-3/4 md:px-0 flex justify-center gap-2">
                  {ctaItems.map((item, i) => (
                    <div key={i} className="flex-1 md:flex-none md:w-1/3">{item}</div>
                  ))}
                </div>
                {currentMedia?.kind === "video" && (
                  <div className="flex items-center gap-6 md:gap-10 mt-1 animate-slide-up-from-bottom">
                    <button type="button" onClick={() => { if (videoRef.current) { videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); } }} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors" aria-label={videoPaused ? "Play" : "Pause"}>
                      {videoPaused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                    </button>
                    <button type="button" onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors" aria-label={videoMuted ? "Unmute" : "Mute"}>
                      {videoMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Booking overlay (iframe) */}
      {showBookingOverlay && bookingOverlayUrl && (
        <div className="absolute inset-0 -top-[3.3rem] z-[72] animate-slide-down-from-top">
          <BookingOverlay
            bookingUrl={bookingOverlayUrl}
            title={bookingOverlayTitle}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); }}
          />
        </div>
      )}

      {/* Recursive SlidePanel for selected POI */}
      {openedPoiBusinessId && (
        <div className="absolute inset-0 z-[75] animate-slide-up-from-bottom">
          <BookOnlineSlidePanel
            businessId={openedPoiBusinessId}
            onClose={() => setOpenedPoiBusinessId(null)}
          />
        </div>
      )}
    </div>
  );
};

export default PoiSlidePanel;
