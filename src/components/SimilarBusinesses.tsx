import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import BookmarkButton from "@/components/BookmarkButton";

interface SimilarBusiness {
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
  categories: string[] | null;
}

interface SimilarBusinessesProps {
  currentBusinessId: string;
  categories: string[] | null;
  city: string | null;
  onNavigate?: (businessId: string) => void;
}

const SimilarBusinesses = ({ currentBusinessId, categories, city, onNavigate }: SimilarBusinessesProps) => {
  const [businesses, setBusinesses] = useState<SimilarBusiness[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!categories || categories.length === 0 || !city) {
        setIsLoading(false);
        return;
      }

      const subcategory = categories[0];

      const { data, count, error } = await supabase
        .from("businesses")
        .select("id, name, city, neighborhood, images, rating, wtuce_status, categories, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count", { count: "exact" })
        .eq("is_active", true)
        .eq("city", city)
        .contains("categories", [subcategory])
        .neq("id", currentBusinessId)
        .order("priority_score", { ascending: false })
        .limit(50);

      if (!error && data) {
        const sorted = (data as SimilarBusiness[]).sort((a, b) => {
          const aV = a.wtuce_status === "verified" ? 1 : 0;
          const bV = b.wtuce_status === "verified" ? 1 : 0;
          if (bV !== aV) return bV - aV;
          const aRating = a.rating ?? computeWeightedRatingOn20(collectRatingSources(a)) ?? 0;
          const bRating = b.rating ?? computeWeightedRatingOn20(collectRatingSources(b)) ?? 0;
          return bRating - aRating;
        });
        setBusinesses(sorted.slice(0, 12));
        setTotalCount(count ?? data.length);
      }
      setIsLoading(false);
    };

    fetchSimilar();
  }, [currentBusinessId, categories, city]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  if (businesses.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Similaires</h3>
        <span className="text-xs text-muted-foreground">
          {businesses.length} sur {totalCount}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {businesses.map((biz) => {
          const img = biz.images && biz.images.length > 0 ? biz.images[0] : null;
          const sources = collectRatingSources(biz);
          const avgOn20 = biz.rating ?? computeWeightedRatingOn20(sources);
          const totalReviews = sources.reduce((s, r) => s + r.count, 0);

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
              {/* Background image */}
              {img && (
                <img src={img} alt={biz.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Bookmark heart - top right */}
              <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.preventDefault()}>
                <BookmarkButton businessId={biz.id} />
              </div>
              {/* Info at bottom */}
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
    </div>
  );
};

export default SimilarBusinesses;
