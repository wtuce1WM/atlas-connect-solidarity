import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import BookmarkButton from "@/components/BookmarkButton";

interface NearbyBusiness {
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
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

interface NearbyBusinessesProps {
  currentBusinessId: string;
  latitude: number | null;
  longitude: number | null;
  onNavigate?: (businessId: string) => void;
  onLoginRequired?: () => void;
}

const PAGE_SIZE = 6;
const RADIUS_KM = 1;

/** Haversine distance in km */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NearbyBusinesses = ({ currentBusinessId, latitude, longitude, onNavigate, onLoginRequired }: NearbyBusinessesProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [allBusinesses, setAllBusinesses] = useState<NearbyBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [currentBusinessId]);

  useEffect(() => {
    const fetchNearby = async () => {
      if (!latitude || !longitude) {
        setIsLoading(false);
        return;
      }

      // Bounding box ~1km ≈ 0.009 degrees lat, ~0.011 degrees lng at Morocco's latitude
      const latDelta = RADIUS_KM / 111;
      const lngDelta = RADIUS_KM / (111 * Math.cos((latitude * Math.PI) / 180));

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, neighborhood, images, rating, wtuce_status, latitude, longitude, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count")
        .eq("is_active", true)
        .neq("id", currentBusinessId)
        .gte("latitude", latitude - latDelta)
        .lte("latitude", latitude + latDelta)
        .gte("longitude", longitude - lngDelta)
        .lte("longitude", longitude + lngDelta)
        .order("priority_score", { ascending: false })
        .limit(200);

      if (!error && data) {
        const withDistance = (data as NearbyBusiness[])
          .map((b) => ({
            ...b,
            distance: b.latitude && b.longitude ? haversine(latitude, longitude, b.latitude, b.longitude) : Infinity,
          }))
          .filter((b) => b.distance <= RADIUS_KM)
          .sort((a, b) => a.distance - b.distance);

        setAllBusinesses(withDistance);
      }
      setIsLoading(false);
    };

    fetchNearby();
  }, [currentBusinessId, latitude, longitude]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  if (allBusinesses.length === 0) return null;

  const totalPages = Math.ceil(allBusinesses.length / PAGE_SIZE);
  const businesses = allBusinesses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div ref={sectionRef} className="scroll-mt-2" />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">À côté</h3>
        <span className="text-xs text-muted-foreground">
          {allBusinesses.length} résultats
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {businesses.map((biz) => {
          const img = biz.images && biz.images.length > 0 ? biz.images[0] : null;
          const sources = collectRatingSources(biz);
          const avgOn20 = biz.rating ?? computeWeightedRatingOn20(sources);
          const totalReviews = sources.reduce((s, r) => s + r.count, 0);
          const distLabel = biz.distance != null && biz.distance < Infinity
            ? biz.distance < 0.1
              ? `${Math.round(biz.distance * 1000)}m`
              : `${biz.distance.toFixed(1)}km`
            : null;

          return (
            <Link
              key={biz.id}
              to={`/business/${biz.id}`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(biz.id);
                }
              }}
              className="group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative"
            >
              {img && (
                <img src={img} alt={biz.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.preventDefault()}>
                <BookmarkButton businessId={biz.id} onLoginRequired={onLoginRequired} />
              </div>

              {/* Distance badge */}
              {distLabel && (
                <div className="absolute top-1.5 left-1.5 bg-background/80 backdrop-blur-sm text-[9px] font-semibold text-foreground px-1.5 py-0.5 rounded-md">
                  {distLabel}
                </div>
              )}

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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-1">
          <button
            onClick={() => { setPage(p => Math.max(0, p - 1)); sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            disabled={page === 0}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => { setPage(i); sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${
                i === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            disabled={page === totalPages - 1}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NearbyBusinesses;
