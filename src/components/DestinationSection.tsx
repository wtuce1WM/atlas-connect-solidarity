import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface DestinationItem {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  image_url: string | null;
  images: string[] | null;
  hook: string | null;
  description: string | null;
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

  useEffect(() => {
    const fetchDestinations = async () => {
      setIsLoading(true);

      const selectFields = "id, name_fr, name_en, name_ar, image_url, images, hook, description, latitude, longitude, region";

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

      // Step 1: Get all business_destinations links
      const { data: allLinks } = await (supabase
        .from("business_destinations" as any)
        .select("destination_id, business_id") as any);

      if (!allLinks || allLinks.length === 0) {
        setDestinations([]);
        onDestinationsLoaded?.([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Get unique business IDs from links and check which are in this city
      const bizIdsInLinks = [...new Set((allLinks as any[]).map((l: any) => l.business_id))];
      
      // Batch-check which of these businesses are in the target city
      const cityBizIds = new Set<string>();
      for (let i = 0; i < bizIdsInLinks.length; i += 500) {
        const chunk = bizIdsInLinks.slice(i, i + 500);
        const { data: cityBiz } = await supabase
          .from("businesses")
          .select("id")
          .eq("is_active", true)
          .eq("city", city)
          .in("id", chunk);
        if (cityBiz) cityBiz.forEach(b => cityBizIds.add(b.id));
      }

      if (cityBizIds.size === 0) {
        setDestinations([]);
        onDestinationsLoaded?.([]);
        setIsLoading(false);
        return;
      }

      const destIds = [...new Set(
        (allLinks as any[])
          .filter((l: any) => cityBizIds.has(l.business_id))
          .map((l: any) => l.destination_id)
      )];

      const { data: destsData } = await supabase
        .from("destinations")
        .select(selectFields)
        .in("id", destIds)
        .order("name_fr");

      const result = (destsData as DestinationItem[]) || [];
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

  return (
    <>
      <div className={`grid gap-4 pt-10 sm:pt-8 lg:pt-14 pb-28 [overflow-anchor:none] ${columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {destinations.map((dest) => {
          const img = dest.image_url || (dest.images && dest.images.length > 0 ? dest.images[0] : null);
          const name = getName(dest);

          return (
            <Link
              key={dest.id}
              to={`/destination/${dest.id}`}
              onClick={(e) => {
                if (onDestinationClick) {
                  e.preventDefault();
                  onDestinationClick(dest.id);
                }
              }}
              onMouseEnter={() => onHover?.(dest.id)}
              onMouseLeave={() => onHover?.(null)}
              className="group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative"
            >
              {img ? (
                <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              {onMapClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMapClick(dest);
                  }}
                  className="absolute top-1.5 right-1.5 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-gold hover:text-black transition-colors shadow-lg"
                  title={language === "en" ? "View on map" : "Voir sur la carte"}
                  aria-label="Map"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                <p className="font-semibold text-base text-white leading-tight line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{name}</p>
                {dest.hook && (
                  <p className="text-sm text-white/80 line-clamp-2">{dest.hook}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default DestinationSection;
