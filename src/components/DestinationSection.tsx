import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  image_url: string | null;
  images: string[] | null;
  hook: string | null;
  description: string | null;
}

interface DestinationSectionProps {
  city: string | null;
  language: string;
  onDestinationClick?: (destId: string) => void;
  columns?: number;
}

const DestinationSection = ({ city, language, onDestinationClick, columns }: DestinationSectionProps) => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDestinations = async () => {
      setIsLoading(true);

      if (!city) {
        // No city → show all destinations
        const { data } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, name_ar, image_url, images, hook, description")
          .order("name_fr");
        setDestinations((data as Destination[]) || []);
        setIsLoading(false);
        return;
      }

      // Find destinations linked to businesses in this city
      const { data: bizIds } = await supabase
        .from("businesses")
        .select("id")
        .eq("is_active", true)
        .eq("city", city);

      if (!bizIds || bizIds.length === 0) {
        setDestinations([]);
        setIsLoading(false);
        return;
      }

      const ids = bizIds.map(b => b.id);
      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("destination_id")
        .in("business_id", ids) as any);

      if (!links || links.length === 0) {
        setDestinations([]);
        setIsLoading(false);
        return;
      }

      const destIds = [...new Set((links as any[]).map(l => l.destination_id))];

      const { data: destsData } = await supabase
        .from("destinations")
        .select("id, name_fr, name_en, name_ar, image_url, images, hook, description")
        .in("id", destIds)
        .order("name_fr");

      setDestinations((destsData as Destination[]) || []);
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

  const getName = (d: Destination) => {
    if (language === "en" && d.name_en) return d.name_en;
    if (language === "ar" && d.name_ar) return d.name_ar;
    return d.name_fr;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {language === "en" ? "Destinations" : language === "ar" ? "وجهات" : "Destinations"}
          {city && <span className="text-muted-foreground font-normal text-sm ml-2">— {city}</span>}
        </h2>
        <span className="text-xs text-muted-foreground">{destinations.length} {language === "en" ? "results" : "résultats"}</span>
      </div>

      <div className={columns === 3 ? "grid grid-cols-3 gap-3" : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"}>
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
              className="group overflow-hidden rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow aspect-square relative"
            >
              {img ? (
                <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-2 space-y-0.5">
                <p className="font-semibold text-[11px] text-white leading-tight line-clamp-2">{name}</p>
                {dest.hook && (
                  <p className="text-[9px] text-white/70 line-clamp-2">{dest.hook}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DestinationSection;
