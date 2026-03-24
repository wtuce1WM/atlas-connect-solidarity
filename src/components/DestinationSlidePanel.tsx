import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Navigation, Minimize2 } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";


interface DestinationSlidePanelProps {
  destinationId: string;
  onClose: () => void;
  slideFrom?: "right" | "bottom";
}

interface DestinationFull {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  matterport_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

const DestinationSlidePanel = ({ destinationId, onClose, slideFrom = "right" }: DestinationSlidePanelProps) => {
  const { language } = useLanguage();
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
  }, [destinationId]);

  useEffect(() => {
    const fetchDestination = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, description, image_url, images, videos, matterport_url, latitude, longitude")
        .eq("id", destinationId)
        .maybeSingle();
      setDestination(data as DestinationFull | null);
      setIsLoading(false);
    };
    fetchDestination();
  }, [destinationId]);

  const destName = destination
    ? (language === "en" && destination.name_en ? destination.name_en : destination.name_fr)
    : "";

  const images = destination?.images?.filter(Boolean) || [];
  const mainImage = destination?.image_url;
  const allImages = mainImage && !images.includes(mainImage) ? [mainImage, ...images] : images;
  const videos = destination?.videos?.filter(Boolean) || [];
  const description = destination?.description || null;

  const matterportUrl = destination?.matterport_url || null;

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string } | { kind: "matterport"; url: string };
  const mediaItems: MediaItem[] = [
    ...allImages.map((i) => ({ kind: "image" as const, url: i })),
  ];
  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  // Build full lightbox items (images + videos + matterport)
  const lightboxItems: LightboxMediaItem[] = [
    ...allImages.map((url) => ({ type: "image" as const, src: url, alt: destName })),
    ...videos.map((url) => ({ type: "video" as const, src: url, alt: destName })),
    ...(matterportUrl ? [{ type: "matterport" as const, src: matterportUrl, alt: `${destName} – Visite 3D` }] : []),
  ];

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

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
            onClick={onClose}
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
                      // Open in lightbox at the correct index
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
          {currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={destName} className="w-full h-full object-cover" />
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
          {/* Media counter + arrows on mobile */}
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

          {/* Centered content block */}
          <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0">
            <div className="w-[95%] md:w-[90%] lg:w-[70%] max-h-full overflow-hidden rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 flex flex-col gap-5 text-white">
              {/* Name + toggle */}
              <div className="flex items-end gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate drop-shadow-lg">{destName}</h2>
                </div>
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

              {/* Description — collapsible */}
              {description && descExpanded && (
                <div
                  className="min-h-0 max-h-[460px] md:max-h-[600px] lg:max-h-[730px] overflow-y-auto pr-1 text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
          </div>

          {/* Videos horizontal scroll */}
          {videos.length > 0 && (
            <div className="shrink-0 mb-4">
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {videos.map((videoUrl, index) => {
                  const info = getVideoInfo(videoUrl);
                  return (
                    <div
                      key={index}
                      className="shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "forwards" }}
                      onClick={() => setFullscreenVideo(videoUrl)}
                    >
                      {info.thumbnail ? (
                        <div className="relative w-full h-28">
                          <img src={info.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                              <span className="text-white text-lg">▶</span>
                            </div>
                          </div>
                        </div>
                      ) : info.type === "file" ? (
                        <video
                          src={videoUrl}
                          className="w-full h-28 object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-28 bg-white/10 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-white text-lg">▶</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA Localiser */}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationSlidePanel;
