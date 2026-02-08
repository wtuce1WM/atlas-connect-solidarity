import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface RelatedBusiness {
  id: string;
  name: string;
  city: string;
  images: string[] | null;
  rating: number | null;
  categories: string[] | null;
  wtuce_status: string | null;
}

interface RelatedEstablishmentsProps {
  currentBusinessId: string;
  kpRegroupement: string;
}

const RelatedEstablishments = ({ currentBusinessId, kpRegroupement }: RelatedEstablishmentsProps) => {
  const [relatedBusinesses, setRelatedBusinesses] = useState<RelatedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRelatedBusinesses = async () => {
      if (!kpRegroupement || kpRegroupement.trim() === "") {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, images, rating, categories, wtuce_status")
        .eq("kp_regroupement", kpRegroupement)
        .eq("is_active", true)
        .neq("id", currentBusinessId)
        .order("wtuce_status", { ascending: false })
        .order("priority_score", { ascending: false });

      if (error) {
        console.error("Error fetching related businesses:", error);
      } else if (data && data.length > 0) {
        setRelatedBusinesses(data);
      }
      setIsLoading(false);
    };

    fetchRelatedBusinesses();
  }, [currentBusinessId, kpRegroupement]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading || relatedBusinesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Autres établissements</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Ces établissements font partie de la même entreprise
      </p>

      {/* Scrollable Container with Arrows */}
      <div className="relative">
        {/* Left Arrow */}
        {relatedBusinesses.length > 2 && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
          >
            <ChevronLeft className="h-6 w-6 text-black" />
          </button>
        )}

        {/* Right Arrow */}
        {relatedBusinesses.length > 2 && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
          >
            <ChevronRight className="h-6 w-6 text-black" />
          </button>
        )}

        {/* Business Cards - Horizontal Scroll */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {relatedBusinesses.map((business) => (
            <Link
              key={business.id}
              to={`/business/${business.id}`}
              onClick={() => window.scrollTo(0, 0)}
              className="group flex-shrink-0"
            >
              <Card className="w-72 h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gold/20 border border-gold/30 relative">
                {/* Background Image with overlay */}
                <div className="absolute inset-0">
                  {business.images && business.images.length > 0 ? (
                    <img
                      src={business.images[0]}
                      alt={business.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/70 transition-colors" />
                </div>

                <CardContent className="p-5 relative z-10 flex flex-col items-center justify-end min-h-[220px] text-center">
                  {/* Watermark logo for verified businesses */}
                  {business.wtuce_status === "verified" && (
                    <img 
                      src={logoWatermark} 
                      alt="" 
                      className="absolute bottom-2 right-2 w-10 h-10 object-contain opacity-80 pointer-events-none"
                    />
                  )}

                  {/* Rating */}
                  {business.rating && (
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-base font-semibold text-gold group-hover:text-white transition-colors mb-2 line-clamp-2">
                    {business.name}
                  </h3>

                  {/* Default Subcategory (first in categories array) */}
                  {business.categories && business.categories.length > 0 && (
                    <span className="text-xs text-gray-300">{business.categories[0]}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedEstablishments;
