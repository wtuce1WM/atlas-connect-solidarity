import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Navigation, Minimize2, Map } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
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

const PoiSlidePanel = ({ businessId, onClose, slideFrom = "bottom" }: PoiSlidePanelProps) => {
  const { language } = useLanguage();
  const slideAnim = slideFrom === "bottom" ? "animate-slide-up-from-bottom" : "animate-slide-in-right";
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

  // Fetch businesses linked to this POI
  useEffect(() => {
    const fetchLinked = async () => {
      // Get business IDs linked to this POI via business_poi_businesses
      const { data: links } = await supabase
        .from("business_poi_businesses")
        .select("business_id")
        .eq("poi_business_id", businessId);
      if (!links || links.length === 0) return;
      const ids = [...new Set(links.map((l) => l.business_id))];
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, images, city, neighborhood, rating, main_category")
        .in("id", ids)
        .eq("is_active", true);
      if (businesses) {
        setLinkedBusinesses(
          businesses.map((b) => ({
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
    fetchLinked();
  }, [businessId]);

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
                className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 flex flex-col gap-5 text-white overflow-hidden max-h-full"
                style={{ backfaceVisibility: "hidden" }}
              >
                {/* Name + toggle */}
                <div className="flex items-end gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold truncate drop-shadow-lg">{poi.name}</h2>
                    {poi.poi_hook && (
                      <p className="text-sm text-white/70 mt-1 line-clamp-2">{poi.poi_hook}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {linkedBusinesses.length > 0 && (
                      <button
                        onClick={() => setFlipped(true)}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label="Voir la carte"
                        title="Voir sur la carte"
                      >
                        <Map className="h-4 w-4" />
                      </button>
                    )}
                    {displayDescription && (
                      <button
                        onClick={() => setDescExpanded((p) => !p)}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label={descExpanded ? "Replier" : "Déplier"}
                      >
                        {descExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {displayDescription && descExpanded && (
                  <div
                    className="min-h-0 max-h-[460px] md:max-h-[600px] lg:max-h-[730px] overflow-y-auto pr-1 text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                    dangerouslySetInnerHTML={{ __html: displayDescription }}
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
                    onClick={() => setFlipped(false)}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label="Retourner"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h3 className="text-sm font-semibold truncate">
                    {language === "en" ? "Nearby businesses" : "Établissements à proximité"}
                  </h3>
                </div>
                {/* Map */}
                <div className="flex-1 min-h-0">
                  {flipped && (
                    <PoiGoogleMap
                      pois={[
                        ...(poi.latitude && poi.longitude ? [{
                          id: poi.id,
                          name: poi.name,
                          latitude: poi.latitude,
                          longitude: poi.longitude,
                          city: poi.city,
                          neighborhood: poi.neighborhood,
                          images: poi.images,
                          markerColor: { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" },
                        }] : []),
                        ...linkedBusinesses,
                      ]}
                      selectedPoiId={poi.id}
                      highlightColor={{ bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" }}
                      center={poi.latitude && poi.longitude ? { lat: poi.latitude, lng: poi.longitude } : undefined}
                      fitToMarkers
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Itinéraire */}
          {poi.latitude && poi.longitude && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2">
              <button
                onClick={() => setShowDirections(true)}
                className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2.5 rounded-lg text-white font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity normal-case tracking-normal"
                style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: "#C04F17" }}
              >
                <Navigation className="h-4 w-4" />
                {language === "en" ? "Directions" : "Itinéraire"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoiSlidePanel;
