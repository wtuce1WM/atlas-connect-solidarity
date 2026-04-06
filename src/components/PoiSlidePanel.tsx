import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Navigation, Minimize2, Map } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import wooshSfx from "@/assets/woosh.wav";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DirectionsOverlay from "@/components/DirectionsOverlay";
import MosaicOverlay from "@/components/MosaicOverlay";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

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
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
}
const GOLD = { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" };

const MemoizedPoiMap = React.memo(({ poi, linkedBusinesses }: { poi: PoiFull; linkedBusinesses: PoiMapItem[] }) => {
  const pois = useMemo(() => [
    ...(poi.latitude && poi.longitude ? [{
      id: poi.id, name: poi.name, latitude: poi.latitude, longitude: poi.longitude,
      city: poi.city, neighborhood: poi.neighborhood, images: poi.images,
      markerColor: GOLD,
    }] : []),
    ...linkedBusinesses,
  ], [poi.id, poi.latitude, poi.longitude, poi.name, poi.city, poi.neighborhood, poi.images, linkedBusinesses]);

  const center = useMemo(
    () => poi.latitude && poi.longitude ? { lat: poi.latitude, lng: poi.longitude } : undefined,
    [poi.latitude, poi.longitude]
  );

  return (
    <PoiGoogleMap
      pois={pois}
      selectedPoiId={poi.id}
      highlightColor={GOLD}
      center={center}
      fitToMarkers
    />
  );
});

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

  // Fetch other POIs in the same city
  useEffect(() => {
    if (!poi?.city) return;
    const fetchCityPois = async () => {
      const { data: pois } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, images, city, neighborhood, rating, main_category")
        .eq("is_poi", true)
        .eq("is_active", true)
        .eq("city", poi.city)
        .neq("id", businessId);
      if (pois) {
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
      }
    };
    fetchCityPois();
  }, [businessId, poi?.city]);

  useEffect(() => {
    const fetchPoi = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, poi_description, poi_hook, images, latitude, longitude, city, neighborhood")
        .eq("id", businessId)
        .maybeSingle();
      setPoi(data as PoiFull | null);
      setIsLoading(false);
    };
    fetchPoi();
  }, [businessId]);

  const images = poi?.images?.filter(Boolean) || [];
  const totalMedia = images.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentImage = totalMedia > 0 ? images[safeIndex] : null;

  const displayDescription = poi?.poi_description || poi?.description || null;

  const lightboxItems: LightboxMediaItem[] = images.map((url) => ({
    type: "image" as const,
    src: url,
    alt: poi?.name || "",
  }));

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  const playWoosh = useCallback(() => {
    try { new Audio(wooshSfx).play(); } catch {}
  }, []);

  if (isLoading) {
    return (
      <div className={`absolute inset-0 z-[70] bg-black flex items-center justify-center ${slideAnim}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!poi) return null;

  // Build a minimal business-like object for DirectionsOverlay
  const directionsTarget = {
    name: poi.name,
    latitude: poi.latitude,
    longitude: poi.longitude,
    city: poi.city,
    neighborhood: poi.neighborhood,
  };

  return (
    <div className={`absolute inset-0 z-[70] bg-black overflow-hidden ${slideAnim}`}>
      {/* Close + mosaic buttons */}
      {!showDirections && !isLightboxOpen && (
        <div className="absolute top-3 left-3 z-[80] flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          {totalMedia > 0 && (
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

      {/* Directions Overlay */}
      {showDirections && poi.latitude && poi.longitude && (
        <DirectionsOverlay
          business={directionsTarget as any}
          onClose={() => setShowDirections(false)}
        />
      )}

      {/* Mosaic overlay */}
      {showMosaic && (
        <MosaicOverlay
          mediaItems={images.map((url) => ({ kind: "image" as const, url }))}
          onClose={() => setShowMosaic(false)}
          onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
        />
      )}

      {/* Fullscreen lightbox */}
      {isLightboxOpen && totalMedia > 0 && (
        <FullscreenLightbox
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

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

          {/* Flip card container */}
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
                    <h2 className="text-xl font-bold uppercase truncate drop-shadow-lg" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>{poi.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {linkedBusinesses.length > 0 && (
                      <button
                        onClick={() => { playWoosh(); setFlipped(true); }}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label="Voir la carte"
                        title="Voir sur la carte"
                      >
                        <Map className="h-4 w-4" />
                      </button>
                    )}
                    {(displayDescription || poi.poi_hook) && (
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

                {/* Hook + description — collapsible */}
                {(poi.poi_hook || displayDescription) && descExpanded && (
                  <div className="min-h-0 overflow-y-auto pr-2" style={{ maxHeight: "min(35vh, 280px)" }}>
                    {poi.poi_hook && (
                      <p
                        className="mb-3 text-sm md:text-lg leading-relaxed tracking-[0.02em] text-white/90"
                        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                      >
                        {poi.poi_hook}
                      </p>
                    )}
                    {displayDescription && (
                      <div
                        className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings card1-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-gold [&_h2]:!font-bold [&_h3]:!font-bold"
                        dangerouslySetInnerHTML={{ __html: displayDescription }}
                      />
                    )}
                  </div>
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
                    {language === "en" ? "Nearby" : "À proximité"}
                  </h3>
                </div>
                {/* Map */}
                <div className="flex-1 min-h-0">
                  {flipped && (
                    <MemoizedPoiMap poi={poi} linkedBusinesses={linkedBusinesses} />
                  )}
                </div>
              </div>
            </div>
          </div>

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
