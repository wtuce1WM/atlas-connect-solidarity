import { useState, useEffect, useCallback } from "react";
import { MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

interface DestinationSlidePanelProps {
  destinationId: string;
  onClose: () => void;
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
  latitude: number | null;
  longitude: number | null;
}

const DestinationSlidePanel = ({ destinationId, onClose }: DestinationSlidePanelProps) => {
  const { language } = useLanguage();
  const [destination, setDestination] = useState<DestinationFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setShowMap(false);
  }, [destinationId]);

  useEffect(() => {
    const fetchDestination = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, description, image_url, images, videos, latitude, longitude")
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

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };
  const mediaItems: MediaItem[] = [
    ...allImages.map((i) => ({ kind: "image" as const, url: i })),
  ];
  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  const getVideoEmbed = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      return { type: "youtube" as const, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&rel=0&controls=1&modestbranding=1` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: "vimeo" as const, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1` };
    }
    return { type: "file" as const, embedUrl: url };
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-[70] bg-black flex items-center justify-center animate-slide-in-right">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!destination) return null;

  return (
    <div className="absolute inset-0 z-[70] bg-black overflow-hidden animate-slide-in-right">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-[80] w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Map overlay */}
      {showMap && destination.latitude && destination.longitude && (
        <div className="absolute inset-0 z-[75] bg-white flex flex-col animate-slide-in-right">
          <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
            <button
              onClick={() => setShowMap(false)}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
              aria-label="Retour"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="flex-1 text-center text-sm font-semibold truncate px-4">{destName}</h3>
          </div>
          <div className="flex-1 min-h-0">
            <GoogleMapEmbed
              address={destName}
              businessName={destName}
              latitude={destination.latitude}
              longitude={destination.longitude}
              fillHeight
            />
          </div>
        </div>
      )}

      {/* Full-size image background */}
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
                  className="min-h-0 max-h-[280px] md:max-h-[480px] overflow-y-auto pr-1 text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
          </div>

          {/* Videos horizontal scroll */}
          {videos.length > 0 && (
            <div className="shrink-0 mt-3">
              <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {videos.map((videoUrl, index) => {
                  const embed = getVideoEmbed(videoUrl);
                  return (
                    <div
                      key={index}
                      className="shrink-0 w-36 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "forwards" }}
                      onClick={() => {
                        window.open(videoUrl, "_blank");
                      }}
                    >
                      {embed.type === "file" ? (
                        <video
                          src={embed.embedUrl}
                          className="w-full h-24 object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-24 bg-white/10 flex items-center justify-center relative">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-white text-lg">▶</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        Vidéo {index + 1}
                      </p>
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
                onClick={() => setShowMap(true)}
                className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2.5 rounded-lg text-white font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity normal-case tracking-normal"
                style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: "#C04F17" }}
              >
                <Navigation className="h-4 w-4" />
                {language === "en" ? "Locate" : "Localiser"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationSlidePanel;
