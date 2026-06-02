import { useEffect, useState } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import SearchPagination from "@/components/SearchPagination";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { haversineKm } from "@/lib/haversine";
import BookmarkButton from "@/components/BookmarkButton";

interface PoiBusiness {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  rating: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  getyourguide_rating: number | null;
  getyourguide_review_count: number | null;
  viator_rating: number | null;
  viator_review_count: number | null;
  categories: string[] | null;
  poi_hook: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  google_maps_url: string | null;
}

interface PoiSectionProps {
  city: string | null;
  language: string;
  onBusinessClick?: (businessId: string) => void;
  columns?: number;
  onMapClick?: (business: PoiBusiness) => void;
  onPoisLoaded?: (pois: PoiBusiness[]) => void;
  onHover?: (businessId: string | null) => void;
  userCoords?: { lat: number; lng: number } | null;
}

const ITEMS_PER_PAGE = 20;

const PoiSection = ({ city, language, onBusinessClick, columns, onMapClick, onPoisLoaded, onHover, userCoords }: PoiSectionProps) => {
  const [pois, setPois] = useState<PoiBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [city]);

  useEffect(() => {
    const fetchPois = async () => {
      setIsLoading(true);
      let query = supabase
        .from("businesses")
        .select("id, name, city, neighborhood, images, rating, categories, poi_hook, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, latitude, longitude, address, google_maps_url")
        .eq("is_active", true)
        .eq("is_poi", true)
        .order("priority_score", { ascending: false });

      if (city) {
        query = query.eq("city", city);
      }

      const { data } = await query;
      const sorted = ((data as PoiBusiness[]) || []).sort((a, b) => {
        const aRating = a.rating ?? computeWeightedRatingOn20(collectRatingSources(a)) ?? 0;
        const bRating = b.rating ?? computeWeightedRatingOn20(collectRatingSources(b)) ?? 0;
        return (bRating || 0) - (aRating || 0);
      });
      setPois(sorted);
      onPoisLoaded?.(sorted);
      setIsLoading(false);
    };

    fetchPois();
  }, [city]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (pois.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {language === "en" ? "No points of interest found" : language === "ar" ? "لم يتم العثور على أماكن مهمة" : "Aucun lieu d'intérêt trouvé"}
        {city && <span className="block text-sm mt-1">{city}</span>}
      </div>
    );
  }

  const totalPages = Math.ceil(pois.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPois = pois.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const pageLabel = language === "en" ? "Page" : language === "ar" ? "الصفحة" : "Page";

  return (
    <>
      <div className={`grid gap-4 pt-10 sm:pt-12 lg:pt-14 pb-6 [overflow-anchor:none] ${columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {paginatedPois.map((biz) => {
          const img = biz.images && biz.images.length > 0 ? biz.images[0] : null;
          const sources = collectRatingSources(biz);
          const avgOn20 = biz.rating ?? computeWeightedRatingOn20(sources);
          const totalReviews = sources.reduce((s, r) => s + r.count, 0);
          const distanceKm = userCoords && biz.latitude && biz.longitude
            ? haversineKm(userCoords.lat, userCoords.lng, biz.latitude, biz.longitude)
            : null;



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
              onMouseEnter={() => onHover?.(biz.id)}
              onMouseLeave={() => onHover?.(null)}
              className="group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative"
            >
              {img ? (
                <img src={img} alt={biz.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              {onMapClick && (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="absolute top-1.5 right-1.5 z-10"
                >
                  <BookmarkButton
                    businessId={biz.id}
                    onLoginRequired={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {distanceKm != null && (
                <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gold bg-black/60 backdrop-blur-sm whitespace-nowrap">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                </span>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                <p className="font-semibold text-base text-white leading-tight line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{biz.name}</p>
                {avgOn20 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Star className="h-3 w-3 text-gold fill-gold" />
                    <span className="font-medium text-white">{avgOn20}/20</span>
                    {totalReviews > 0 && (
                      <span className="text-white/70">· {totalReviews} avis</span>
                    )}
                  </div>
                )}
                {biz.city && (
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{biz.neighborhood ? `${biz.city}, ${biz.neighborhood}` : biz.city}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <SearchPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={pois.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        language={language}
      />
    </>
  );
};

export default PoiSection;
