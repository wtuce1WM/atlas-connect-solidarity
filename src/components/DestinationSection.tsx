import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SearchPagination from "@/components/SearchPagination";

const ITEMS_PER_PAGE = 20;

export interface DestinationItem {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  image_url: string | null;
  images: string[] | null;
  hook: string | null;
  hook_fr?: string | null;
  hook_en?: string | null;
  hook_ar?: string | null;
  description: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string[] | null;
}

interface DestinationSectionProps {
  city: string | null;
  language: string;
  onDestinationClick?: (destId: string) => void;
  columns?: number;
  onMapClick?: (dest: DestinationItem) => void;
  onDestinationsLoaded?: (dests: DestinationItem[]) => void;
  onHover?: (destId: string | null) => void;
}

const DestinationSection = ({ city, language, onDestinationClick, columns, onMapClick, onDestinationsLoaded, onHover }: DestinationSectionProps) => {
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [city]);


  useEffect(() => {
    const fetchDestinations = async () => {
      setIsLoading(true);

      const selectFields = "id, name_fr, name_en, name_ar, image_url, images, hook, hook_fr, hook_en, hook_ar, description, description_fr, description_en, description_ar, latitude, longitude, region, city_ids";

      if (!city) {
        const { data } = await supabase
          .from("destinations")
          .select(selectFields)
          .order("name_fr");
        const result = (data as DestinationItem[]) || [];
        setDestinations(result);
        onDestinationsLoaded?.(result);
        setIsLoading(false);
        return;
      }

      // Look up the city UUID from the cities table
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", city)
        .maybeSingle();

      if (!cityRow) {
        setDestinations([]);
        onDestinationsLoaded?.([]);
        setIsLoading(false);
        return;
      }

      // Fetch destinations whose city_ids array contains this city UUID
      const { data: destsData } = await (supabase
        .from("destinations")
        .select(selectFields)
        .filter("city_ids", "cs", `{${cityRow.id}}`)
        .order("name_fr") as any);

      // Filter out destinations with empty city_ids (PostgREST contains quirk)
      const result = ((destsData as DestinationItem[]) || []).filter(d => {
        const ids = (d as any).city_ids;
        return Array.isArray(ids) && ids.length > 0;
      });
      setDestinations(result);
      onDestinationsLoaded?.(result);
      setIsLoading(false);
    };

    fetchDestinations();
  }, [city]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {language === "en" ? "No destinations found" : language === "ar" ? "لم يتم العثور على وجهات" : "Aucune destination trouvée"}
        {city && <span className="block text-sm mt-1">{city}</span>}
      </div>
    );
  }

  const getName = (d: DestinationItem) => {
    if (language === "en" && d.name_en) return d.name_en;
    if (language === "ar" && d.name_ar) return d.name_ar;
    return d.name_fr;
  };

  const totalPages = Math.ceil(destinations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDestinations = destinations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <>
      <div data-results-grid="true" className={`grid gap-4 pt-10 sm:pt-12 lg:pt-14 pb-6 [overflow-anchor:none] ${columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {paginatedDestinations.map((dest) => {
          const img = dest.image_url || (dest.images && dest.images.length > 0 ? dest.images[0] : null);
          const name = getName(dest);

          const commonClass = "group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative block w-full text-left";
          const inner = (
            <>
              {img ? (
                <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
                }}
                className="absolute top-1.5 right-1.5 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-gold hover:text-black transition-colors shadow-lg cursor-pointer"
                title={language === "en" ? "Save to Club" : "Sauvegarder dans le Club"}
                aria-label="Save"
              >
                <Heart className="h-4 w-4" />
              </span>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                <p className="font-semibold text-base text-white leading-tight line-clamp-2" style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{name}</p>
              </div>
            </>
          );

          if (onDestinationClick) {
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onDestinationClick(dest.id)}
                onMouseEnter={() => onHover?.(dest.id)}
                onMouseLeave={() => onHover?.(null)}
                className={commonClass}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={dest.id}
              to={`/destination/${dest.id}`}
              onMouseEnter={() => onHover?.(dest.id)}
              onMouseLeave={() => onHover?.(null)}
              className={commonClass}
            >
              {inner}
            </Link>
          );
        })}
      </div>
      <SearchPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={destinations.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={(p) => {
          setCurrentPage(p);
        }}
        language={language}
      />
    </>
  );
};

export default DestinationSection;
