import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Navigation, Film, Image as ImageIcon, Building2 } from "lucide-react";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import BookmarkButton from "@/components/BookmarkButton";
import ShareButton from "@/components/ShareButton";
import { getVideoEmbed } from "@/lib/videoEmbed";
import type { DestinationItem } from "@/components/DestinationSection";

interface Business {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  rating: number | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  wtuce_status: string | null;
}

interface DestinationBusinessesPanelProps {
  destination: DestinationItem;
  language: string;
  onClose: () => void;
  onBusinessClick?: (businessId: string) => void;
  onLoginRequired?: () => void;
  onPrevDestination?: () => void;
  onNextDestination?: () => void;
  hasPrevDestination?: boolean;
  hasNextDestination?: boolean;
}

const SELECT_FIELDS = "id, name, city, neighborhood, images, rating, computed_rating, total_review_count, wtuce_status";

const RoundCta = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-lg flex items-center justify-center transition-colors"
  >
    <Icon className="h-5 w-5" />
  </button>
);

const DestinationBusinessesPanel = ({
  destination,
  language,
  onClose,
  onBusinessClick,
  onLoginRequired,
  onPrevDestination,
  onNextDestination,
  hasPrevDestination,
  hasNextDestination,
}: DestinationBusinessesPanelProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [showProviders, setShowProviders] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Fetch providers + videos
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setCurrentImageIndex(0);
      setShowProviders(false);
      setShowDescription(false);
      setShowVideos(false);
      setShowDirections(false);

      // Fetch destination videos
      const { data: destFull } = await supabase
        .from("destinations" as any)
        .select("videos")
        .eq("id", destination.id)
        .maybeSingle();
      if (!cancelled) setVideos(((destFull as any)?.videos as string[] | null)?.filter(Boolean) || []);

      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("business_id")
        .eq("destination_id", destination.id) as any);

      if (!links || links.length === 0) {
        if (!cancelled) { setBusinesses([]); setIsLoading(false); }
        return;
      }

      const bizIds = (links as any[]).map((l: any) => l.business_id);
      const all: Business[] = [];
      for (let i = 0; i < bizIds.length; i += 500) {
        const chunk = bizIds.slice(i, i + 500);
        const { data } = await supabase
          .from("businesses")
          .select(SELECT_FIELDS)
          .eq("is_active", true)
          .in("id", chunk);
        if (data) all.push(...(data as Business[]));
      }

      all.sort((a, b) => {
        const aV = a.wtuce_status === "verified" ? 1 : 0;
        const bV = b.wtuce_status === "verified" ? 1 : 0;
        if (bV !== aV) return bV - aV;
        const aRating = a.computed_rating ?? a.rating ?? 0;
        const bRating = b.computed_rating ?? b.rating ?? 0;
        return bRating - aRating;
      });

      if (!cancelled) { setBusinesses(all); setIsLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [destination.id]);

  useEffect(() => {
    if (!showDirections) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => {}
      );
    }
  }, [showDirections]);

  const getName = () => {
    if (language === "en" && destination.name_en) return destination.name_en;
    if (language === "ar" && destination.name_ar) return destination.name_ar;
    return destination.name_fr;
  };

  const imgs = destination.images && destination.images.length > 0
    ? destination.images
    : destination.image_url ? [destination.image_url] : [];

  const hasMap = !!(destination.latitude && destination.longitude);
  const hasVideos = videos.length > 0;
  const hasImages = imgs.length > 1;
  const hasDescription = !!destination.description;
  const providersLabel = language === "en" ? "Providers" : language === "ar" ? "مزودون" : "Prestataires";

  // Unified media list: images then videos
  const mediaItems = useMemo(
    () => [
      ...imgs.map((url) => ({ kind: "image" as const, url })),
      ...videos.map((url) => ({ kind: "video" as const, url })),
    ],
    [imgs, videos]
  );
  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? Math.min(currentImageIndex, totalMedia - 1) : 0;
  const currentMedia = mediaItems[safeIndex];

  const videoInfo = useMemo(() => {
    if (!currentMedia || currentMedia.kind !== "video") return null;
    return getVideoEmbed(currentMedia.url, window.location.origin, { background: true, defaultSoundOn: false, autoplay: true });
  }, [currentMedia]);

  // Toolbar right portal (Share button) — mounted only when portal exists
  const [toolbarReady, setToolbarReady] = useState(false);
  useEffect(() => {
    const check = () => setToolbarReady(!!document.getElementById("slide-panel-toolbar"));
    check();
    const id = window.setInterval(check, 100);
    const stop = window.setTimeout(() => window.clearInterval(id), 1500);
    return () => { window.clearInterval(id); window.clearTimeout(stop); };
  }, [destination.id]);
  const toolbarRightEl = toolbarReady ? document.getElementById("slide-panel-toolbar") : null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-40 bg-black flex flex-col shadow-2xl overflow-hidden animate-slide-in-right lg:top-[53px] lg:left-auto lg:w-1/2 lg:border-l lg:border-border">
        <SlidePanelHeader onClose={onClose} mobileTransparent />

        {toolbarRightEl && createPortal(
          <ShareButton title={getName()} variant="dark" className="shrink-0" />,
          toolbarRightEl
        )}

        {/* Full-bleed background media (image / video file / youtube) */}
        <div className="absolute inset-0 z-0">
          {currentMedia?.kind === "image" && (
            <img
              src={currentMedia.url}
              alt={`${getName()} - ${safeIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            />
          )}
          {currentMedia?.kind === "video" && videoInfo?.type === "file" && (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              className="w-full h-full object-cover bg-black"
              loop
              playsInline
              autoPlay
              muted
            />
          )}
          {currentMedia?.kind === "video" && videoInfo && videoInfo.type !== "file" && (
            <iframe
              key={currentMedia.url}
              src={videoInfo.embedUrl}
              className="w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media"
              allowFullScreen
              frameBorder="0"
              style={{ border: 0 }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40" />
        </div>

        {/* Media prev/next */}
        {totalMedia > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? totalMedia - 1 : i - 1); }}
              className="absolute left-1/2 -translate-x-[calc(50%+60px)] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg"
              aria-label="Média précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === totalMedia - 1 ? 0 : i + 1); }}
              className="absolute left-1/2 translate-x-[calc(50%+20px)] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg"
              aria-label="Média suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-black/60 text-xs text-white">
              {safeIndex + 1} / {totalMedia}
            </div>
          </>
        )}

        {/* Prev/next destinations (right rail) */}
        {(onPrevDestination || onNextDestination) && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 z-30 hidden md:flex flex-col gap-2">
            <button
              onClick={onPrevDestination}
              disabled={!hasPrevDestination}
              className="w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Destination précédente"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <div className="w-9 h-9" />
            <button
              onClick={onNextDestination}
              disabled={!hasNextDestination}
              className="w-9 h-9 rounded-full bg-white hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black shadow-lg transition-colors"
              aria-label="Destination suivante"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Left sidebar CTAs */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 items-start pointer-events-auto">
          {hasMap && (
            <SidebarCta icon={MapPin} label={language === "en" ? "Location" : "Localisation"} onClick={() => setShowDirections(true)} />
          )}
          {hasVideos && (
            <SidebarCta icon={Film} label={language === "en" ? "Videos" : "Vidéos"} onClick={() => { setActiveVideoIndex(0); setShowVideos(true); }} />
          )}
          {hasImages && (
            <SidebarCta icon={ImageIcon} label="Images" onClick={() => setIsLightboxOpen(true)} />
          )}
          <SidebarCta icon={Building2} label={providersLabel} onClick={() => setShowProviders(true)} />
        </div>

        {/* Name card (BookOnlineSlidePanel BusinessHeader style) — pinned at top under toolbar */}
        <div className="absolute top-14 left-3 right-3 z-20 pointer-events-none">
          <div className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[4.5rem] md:h-[5.5rem] pointer-events-auto">
            <div className="absolute inset-0 flex items-center gap-4 px-4 md:px-6">
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h2
                  className="text-base md:text-xl font-bold uppercase min-w-0 flex-1 line-clamp-2"
                  style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em", WebkitTextStroke: "0.8px currentColor", textShadow: "0 0 0 currentColor" }}
                >
                  {getName()}
                </h2>
                {destination.region && destination.region.length > 0 && (
                  <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center md:justify-start truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {destination.region.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center overlay: hook + "+" */}
        {(destination.hook || hasDescription) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-6 pb-32">
            {destination.hook && (
              <p
                className="text-base md:text-lg text-white/90 font-semibold text-center max-w-xl leading-relaxed"
                style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.7))",
                }}
              >
                {destination.hook}
              </p>
            )}
            {hasDescription && (
              <button
                onClick={() => setShowDescription(true)}
                className="mt-6 w-12 h-12 rounded-full border-2 border-white flex items-center justify-center pointer-events-auto transform-gpu transition-transform duration-200 ease-out hover:scale-125"
                style={{ backgroundColor: "#25D366" }}
                aria-label={language === "en" ? "Read more" : "En savoir plus"}
              >
                <span className="text-2xl text-white font-light leading-none">+</span>
              </button>
            )}
          </div>
        )}

        {/* Itinéraire CTA (bottom) */}
        {hasMap && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 w-[min(90%,360px)]">
            <button
              onClick={() => setShowDirections(true)}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors"
              style={{ fontFamily: "'Josefin Sans', sans-serif", height: "40px" }}
            >
              <Navigation className="h-4 w-4" />
              <span className="truncate">{language === "en" ? "Directions" : language === "ar" ? "الاتجاهات" : "Itinéraire"}</span>
            </button>
          </div>
        )}



        {/* Providers overlay */}
        {showProviders && (
          <div className="absolute inset-0 z-[80] bg-background flex flex-col animate-slide-up-from-bottom">
            <div className="shrink-0 flex items-center px-4 py-2 border-b bg-card">
              <button onClick={() => setShowProviders(false)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
              <h2 className="flex-1 text-center text-sm font-bold text-foreground truncate">
                {providersLabel}
                {!isLoading && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({businesses.length})</span>}
              </h2>
              <div className="w-9" />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-base font-bold text-foreground mb-4">
                {language === "en" ? `These providers will take you to ${getName()}` : language === "ar" ? `هؤلاء المزودون سيأخذونك إلى ${getName()}` : `Ces prestataires vous emmèneront à ${getName()}`}
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  {language === "en" ? "No businesses found" : "Aucun établissement trouvé"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {businesses.map((biz) => {
                    const img = biz.images && biz.images.length > 0 ? biz.images[0] : null;
                    const avgOn20 = biz.computed_rating ?? biz.rating;
                    const totalReviews = biz.total_review_count ?? 0;
                    return (
                      <Link
                        key={biz.id}
                        to={businessUrl(biz)}
                        onClick={(e) => { if (onBusinessClick) { e.preventDefault(); onBusinessClick(biz.id); } }}
                        className="group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative"
                      >
                        {img && (
                          <img src={img} alt={biz.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.preventDefault()}>
                          <BookmarkButton businessId={biz.id} onLoginRequired={onLoginRequired} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-0.5">
                          <p className="font-semibold text-[11px] text-white leading-tight line-clamp-2">{biz.name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-white/80">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{biz.city}{biz.neighborhood ? ` · ${biz.neighborhood}` : ""}</span>
                          </div>
                          {avgOn20 && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <Star className="h-2.5 w-2.5 text-gold fill-gold" />
                              <span className="font-medium text-white">{avgOn20}/20</span>
                              {totalReviews > 0 && <span className="text-white/70">· {totalReviews} avis</span>}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description overlay */}
        {showDescription && hasDescription && (
          <div className="absolute inset-0 z-[80] bg-background flex flex-col animate-slide-up-from-bottom">
            <div className="shrink-0 flex items-center px-4 py-2 border-b bg-card">
              <button onClick={() => setShowDescription(false)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
              <h2 className="flex-1 text-center text-sm font-bold text-foreground truncate">{getName()}</h2>
              <div className="w-9" />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose prose-sm max-w-none text-foreground [&>p]:mb-3"
                dangerouslySetInnerHTML={{ __html: destination.description! }}
              />
            </div>
          </div>
        )}

        {/* Videos overlay */}
        {showVideos && hasVideos && (
          <div className="absolute inset-0 z-[80] bg-black flex flex-col animate-slide-up-from-bottom">
            <div className="shrink-0 flex items-center px-4 py-2">
              <button onClick={() => setShowVideos(false)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:opacity-90" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center text-sm font-bold text-white">{activeVideoIndex + 1} / {videos.length}</div>
              <div className="w-9" />
            </div>
            <div className="flex-1 relative min-h-0 flex items-center justify-center px-4 pb-4">
              <video
                key={videos[activeVideoIndex]}
                src={videos[activeVideoIndex]}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
              {videos.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveVideoIndex(i => i === 0 ? videos.length - 1 : i - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg"
                    aria-label="Vidéo précédente"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveVideoIndex(i => i === videos.length - 1 ? 0 : i + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg"
                    aria-label="Vidéo suivante"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Directions overlay */}
        {showDirections && hasMap && (() => {
          const dest = `${destination.latitude},${destination.longitude}`;
          return (
            <div className="absolute inset-0 z-[85] bg-white flex flex-col animate-slide-up-from-bottom">
              <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
                <button onClick={() => setShowDirections(false)} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90" aria-label="Fermer">
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
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted" title="Google Maps">
                    <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
                  </a>
                  <a href={`https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted" title="Waze">
                    <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
                  </a>
                  <a href={`https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=d`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted" title="Apple Plans">
                    <img src="https://www.apple.com/favicon.ico" alt="Apple Plans" className="h-7 w-7 object-contain" />
                  </a>
                </div>
              </div>
              <div className="flex-1 relative min-h-0">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_EMBED_KEY}&origin=${userOrigin || "My+location"}&destination=${dest}&mode=${directionsMode}`}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  title={`Itinéraire vers ${getName()}`}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {isLightboxOpen && totalMedia > 0 && (() => {
        const items: LightboxMediaItem[] = mediaItems.map((m, i) => ({
          type: m.kind === "video" ? ("video" as const) : ("image" as const),
          src: m.url,
          alt: `${getName()} - ${i + 1}`,
        }));
        return (
          <FullscreenLightbox
            items={items}
            currentIndex={safeIndex}
            onIndexChange={setCurrentImageIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        );
      })()}
    </>
  );
};

export default DestinationBusinessesPanel;
