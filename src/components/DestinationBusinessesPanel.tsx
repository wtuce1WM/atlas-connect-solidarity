import { useEffect, useState, useRef } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2, ChevronLeft, ChevronRight, X, Navigation } from "lucide-react";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem } from "@/components/FullscreenLightbox";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";

import BookmarkButton from "@/components/BookmarkButton";
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
}

const SELECT_FIELDS = "id, name, city, neighborhood, images, rating, computed_rating, total_review_count, wtuce_status";

const DestinationBusinessesPanel = ({ destination, language, onClose, onBusinessClick, onLoginRequired }: DestinationBusinessesPanelProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "providers">("info");
  const [showDirections, setShowDirections] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const providersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setCurrentImageIndex(0);
      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("business_id")
        .eq("destination_id", destination.id) as any);

      if (!links || links.length === 0) {
        setBusinesses([]);
        setIsLoading(false);
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

      setBusinesses(all);
      setIsLoading(false);
    };
    fetchData();
  }, [destination.id]);

  // Auto-highlight "Prestataires" tab when providers section is visible
  useEffect(() => {
    const el = providersRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActiveTab(entry.isIntersecting ? "providers" : "info"),
      { root: container, threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [businesses]);

  // Geolocate user once when directions overlay opens
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

  return (
    <>
    {/* Backdrop 20% left — click to collapse (only when expanded) */}
    {isExpanded && (
       <div
        className="fixed inset-0 top-[53px] z-[39] bg-black/40 backdrop-blur-[2px]"
        style={{ opacity: 0, animation: "panelFadeIn 0.2s ease-out 0.1s forwards" }}
        onClick={() => setIsExpanded(false)}
      />
    )}

    {/* Single panel — transitions between 50% and 80% like POI */}
    <div className={`fixed top-0 left-0 right-0 bottom-0 z-40 bg-background flex flex-col shadow-2xl overflow-hidden animate-slide-in-right lg:top-[53px] lg:left-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${isExpanded ? "lg:w-full border-l-2 border-border shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "lg:w-1/2"}`}>
      <SlidePanelHeader
        onClose={() => { onClose(); setIsExpanded(false); }}
        centerContent={
          isExpanded ? getName() : (
            <div className="flex items-center justify-center gap-0">
              <button
                onClick={() => { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`px-4 py-1.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "info" ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {getName()}
              </button>
              <button
                onClick={() => { providersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className={`px-4 py-1.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "providers" ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {language === "en" ? "Providers" : language === "ar" ? "مزودون" : "Prestataires"}
                {!isLoading && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{businesses.length}</span>}
              </button>
            </div>
          )
        }
      />

      {/* Content switches between expanded gallery and normal view */}
      {isExpanded ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div style={{ columns: "300px 3", columnGap: 8 }}>
            {imgs.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${getName()} - ${i + 1}`}
                className="w-full rounded-lg cursor-pointer hover:scale-[1.02] transition-transform duration-300 mb-2 break-inside-avoid"
                loading="lazy"
                onClick={() => { setCurrentImageIndex(i); setIsLightboxOpen(true); }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-24" ref={scrollRef}>
          {/* Image carousel */}
          {imgs.length > 0 && (
            <div className="mb-4 -mx-4 -mt-4 relative">
              <div
                className={`relative w-full aspect-[16/9] bg-muted ${imgs.length > 1 ? "cursor-pointer" : ""}`}
                onClick={() => { if (imgs.length > 1) setIsLightboxOpen(true); }}
              >
                <img
                  src={imgs[currentImageIndex]}
                  alt={`${getName()} - ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {imgs.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? imgs.length - 1 : i - 1); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === imgs.length - 1 ? 0 : i + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/80 text-xs text-foreground">
                      {currentImageIndex + 1} / {imgs.length}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                      className="absolute bottom-2 left-2 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-md hover:bg-background transition-colors"
                    >
                      {language === "en" ? `View all ${imgs.length} photos` : language === "ar" ? `عرض ${imgs.length} صور` : `Voir les ${imgs.length} photos`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Title & region */}
          <div className="mb-4 space-y-1">
            <h2 className="text-lg font-bold text-foreground">{getName()}</h2>
            {destination.region && destination.region.length > 0 && (
              <p className="text-sm text-muted-foreground">{destination.region.join(", ")}</p>
            )}
          </div>

          {/* CTA Itinéraire */}
          {destination.latitude && destination.longitude && (
            <button
              onClick={() => setShowDirections(true)}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors mb-4"
              style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}
            >
              <Navigation className="h-4 w-4" />
              <span className="truncate">{language === "en" ? "Directions" : language === "ar" ? "الاتجاهات" : "Itinéraire"}</span>
            </button>
          )}

          {/* Description */}
          {destination.description && (
            <div className="text-sm text-muted-foreground leading-relaxed mb-6">
              <div dangerouslySetInnerHTML={{ __html: destination.description }} className="prose prose-sm max-w-none text-muted-foreground [&>p]:mb-2" />
            </div>
          )}

          {/* Providers */}
          <div ref={providersRef} className="border-t border-border pt-4">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {language === "en" ? `These providers will take you to ${getName()}` : language === "ar" ? `هؤلاء المزودون سيأخذونك إلى ${getName()}` : `Ces prestataires vous emmèneront à ${getName()}`}
              {!isLoading && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({businesses.length})</span>}
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
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
                      onClick={(e) => {
                        if (onBusinessClick) {
                          e.preventDefault();
                          onBusinessClick(biz.id);
                        }
                      }}
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
                            {totalReviews > 0 && (
                              <span className="text-white/70">· {totalReviews} avis</span>
                            )}
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
    </div>

    {isLightboxOpen && (() => {
      if (imgs.length === 0) return null;
      const items: MediaItem[] = imgs.map((src, i) => ({ type: "image" as const, src, alt: `${getName()} - ${i + 1}` }));
      return (
        <FullscreenLightbox
          items={items}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      );
    })()}
    </>
  );
};

export default DestinationBusinessesPanel;
