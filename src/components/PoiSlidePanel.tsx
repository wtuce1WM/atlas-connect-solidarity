import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { MapPin, ChevronLeft, ChevronRight, X, Navigation, Minimize2 } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GOLD, playWoosh } from "@/lib/overlayConstants";
import OverlayFlipCard from "@/components/overlays/OverlayFlipCard";
import { LazyDirectionsOverlay, LazyMosaicOverlay, LazyFullscreenLightbox } from "@/components/overlays/LazyOverlays";
import type { PoiMapItem } from "@/components/PoiGoogleMap";

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
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
}

const PoiSlidePanel = ({ businessId, onClose, slideFrom = "bottom" }: PoiSlidePanelProps) => {
  const { language } = useLanguage();
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
  const [linkedBusinesses, setLinkedBusinesses] = useState<PoiMapItem[]>([]);

  // Reset state on businessId change
  useEffect(() => {
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setShowDirections(false);
    setShowMosaic(false);
    setIsLightboxOpen(false);
    setFlipped(false);
    setLinkedBusinesses([]);
  }, [businessId]);

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

  // Fetch POI data + city POIs in parallel
  useEffect(() => {
    let cancelled = false;
    const fetchPoi = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, poi_description, poi_hook, hook_fr, hook_en, hook_ar, images, latitude, longitude, city, neighborhood")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      setPoi(data as PoiFull | null);
      setIsLoading(false);
    };
    fetchPoi();
    return () => { cancelled = true; };
  }, [businessId]);

  // Fetch other POIs in the same city
  useEffect(() => {
    if (!poi?.city) return;
    let cancelled = false;
    const fetchCityPois = async () => {
      const { data: pois } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, images, city, neighborhood, rating, main_category")
        .eq("is_poi", true)
        .eq("is_active", true)
        .eq("city", poi.city)
        .neq("id", businessId);
      if (cancelled || !pois) return;
      setLinkedBusinesses(
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
    };
    fetchCityPois();
    return () => { cancelled = true; };
  }, [businessId, poi?.city]);

  const images = poi?.images?.filter(Boolean) || [];
  const totalMedia = images.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentImage = totalMedia > 0 ? images[safeIndex] : null;

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
    () => images.map((url) => ({ type: "image" as const, src: url, alt: poi?.name || "" })),
    [images, poi?.name]
  );

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

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
      {!showDirections && !isLightboxOpen && (
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
            business={{ name: poi.name, latitude: poi.latitude, longitude: poi.longitude, city: poi.city, neighborhood: poi.neighborhood } as any}
            onClose={() => setShowDirections(false)}
          />
        )}

        {showMosaic && (
          <LazyMosaicOverlay
            mediaItems={images.map((url) => ({ kind: "image" as const, url }))}
            onClose={() => setShowMosaic(false)}
            onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
          />
        )}

        {isLightboxOpen && totalMedia > 0 && (
          <LazyFullscreenLightbox
            items={lightboxItems}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </Suspense>

      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentImage ? (
            <img src={currentImage} alt={poi.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        {/* Left / Right arrows — desktop */}
        {totalMedia > 1 && (
          <>
            <button onClick={() => goMedia(-1)} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => goMedia(1)} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Overlaid content */}
        <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
          {/* Media counter on mobile */}
          {totalMedia > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4">
              <button onClick={() => goMedia(-1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white/80 text-xs font-medium bg-black/30 rounded-full px-3 py-1">
                {safeIndex + 1} / {totalMedia}
              </span>
              <button onClick={() => goMedia(1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Flip card — shared component */}
          <OverlayFlipCard
            flipped={flipped}
            onFlip={() => { playWoosh(wooshSfx); setFlipped(true); }}
            onUnflip={() => { playWoosh(wooshSfx); setFlipped(false); }}
            name={poi.name}
            hook={displayHook}
            description={displayDescription}
            descExpanded={descExpanded}
            onToggleDesc={() => setDescExpanded((p) => !p)}
            mapMarkers={linkedBusinesses}
            selectedMarkerId={poi.id}
            selectedLat={poi.latitude}
            selectedLng={poi.longitude}
            backLabel={language === "en" ? "Nearby" : "À proximité"}
          />

          {/* CTA Itinéraire */}
          {poi.latitude && poi.longitude && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2">
              <div className="w-full md:w-3/4 flex justify-center gap-2">
                <div className="flex-1 md:flex-none md:w-1/3">
                  <button
                    onClick={() => setShowDirections(true)}
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-up-from-bottom"
                    style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}
                  >
                    <Navigation className="h-4 w-4 hidden md:block" />
                    <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoiSlidePanel;
