import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface SimilarBusiness {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  rating: number | null;
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

      // Use first subcategory for matching
      const subcategory = categories[0];

      const { data, count, error } = await supabase
        .from("businesses")
        .select("id, name, city, neighborhood, images, rating, wtuce_status, categories", { count: "exact" })
        .eq("is_active", true)
        .eq("city", city)
        .contains("categories", [subcategory])
        .neq("id", currentBusinessId)
        .order("priority_score", { ascending: false })
        .limit(9);

      if (!error && data) {
        setBusinesses(data as SimilarBusiness[]);
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
        {businesses.map((biz) => (
          <Link
            key={biz.id}
            to={`/business/${biz.id}`}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate(biz.id);
              }
            }}
            className="group"
          >
            <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-gold/10 border border-border relative">
              {/* Image */}
              {biz.images && biz.images.length > 0 ? (
                <div className="absolute inset-0">
                  <img
                    src={biz.images[0]}
                    alt={biz.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}

              {/* Rating badge */}
              {biz.rating && (
                <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5 z-10">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  <span className="text-gold font-bold text-[10px]">{biz.rating}</span>
                </div>
              )}

              {/* Verified watermark */}
              {biz.wtuce_status === "verified" && (
                <img
                  src={logoWatermark}
                  alt=""
                  className="absolute top-1 right-1 w-6 h-6 object-contain opacity-90 pointer-events-none z-10"
                />
              )}

              <CardContent className="p-2 relative z-10 flex flex-col items-center justify-end min-h-[100px] text-center">
                <h4 className="text-[11px] font-semibold text-white group-hover:text-gold transition-colors line-clamp-2 leading-tight">
                  {biz.name}
                </h4>
                {biz.neighborhood && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <MapPin className="h-2.5 w-2.5 text-gray-300" />
                    <span className="text-[9px] text-gray-300 truncate max-w-[80px]">{biz.neighborhood}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarBusinesses;
