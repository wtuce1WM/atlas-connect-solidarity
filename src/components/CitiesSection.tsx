import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

interface City {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CityWithCount extends City {
  businessCount: number;
}

const CS_T = {
  fr: { exploreOur: "Explorez nos ", cities: "Villes", description: "Découvrez les meilleures adresses dans chaque ville du Maroc", businesses: "établissements" },
  en: { exploreOur: "Explore our ", cities: "Cities", description: "Discover the best addresses in every city of Morocco", businesses: "businesses" },
  ar: { exploreOur: "استكشف ", cities: "مدننا", description: "اكتشف أفضل العناوين في كل مدينة مغربية", businesses: "مؤسسة" },
} as const;

const CitiesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const T = (CS_T as any)[language] || CS_T.fr;
  const [cities, setCities] = useState<CityWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      try {
        // Fetch cities ordered by sort_order
        const { data: citiesData, error: citiesError } = await supabase
          .from("cities")
          .select("id, name_fr, name_en, name_ar, region, latitude, longitude")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(20);

        if (citiesError) throw citiesError;

        // Fetch business counts per city
        const { data: businessCounts, error: countError } = await supabase
          .from("businesses")
          .select("city")
          .eq("is_active", true);

        if (countError) throw countError;

        // Count businesses per city
        const countMap: Record<string, number> = {};
        businessCounts?.forEach((b) => {
          const cityName = b.city?.toLowerCase();
          if (cityName) {
            countMap[cityName] = (countMap[cityName] || 0) + 1;
          }
        });

        // Merge counts with cities
        const citiesWithCounts: CityWithCount[] = (citiesData || []).map((city) => ({
          ...city,
          businessCount: countMap[city.name_fr?.toLowerCase()] || 0,
        }));

        setCities(citiesWithCounts);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getCityName = (city: City) => {
    if (language === "ar" && city.name_ar) return city.name_ar;
    if (language === "en" && city.name_en) return city.name_en;
    return city.name_fr;
  };

  const getColorByIndex = (index: number) => {
    const colors = [
      "bg-primary/10 text-primary border-primary/20",
      "bg-secondary/10 text-secondary border-secondary/20",
      "bg-atlas/10 text-atlas border-atlas/20",
      "bg-gold/10 text-gold border-gold/20",
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <section className="bg-background py-12">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (cities.length === 0) return null;

  return (
    <section className="bg-black py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold text-white">
            {language === "fr"
              ? "Explorez nos "
              : language === "ar"
                ? "استكشف "
                : "Explore our "}
            <span className="text-primary">
              {language === "fr" ? "Villes" : language === "ar" ? "مدننا" : "Cities"}
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400">
            {language === "fr"
              ? "Découvrez les meilleures adresses dans chaque ville du Maroc"
              : language === "ar"
                ? "اكتشف أفضل العناوين في كل مدينة مغربية"
                : "Discover the best addresses in every city of Morocco"}
          </p>
        </div>

        {/* Scrollable Cities */}
        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {cities.map((city, index) => (
              <Link
                key={city.id}
                to={`/city/${encodeURIComponent(city.name_fr)}`}
                className="flex-shrink-0"
              >
                <Card
                  className={`group w-56 overflow-hidden transition-all hover:shadow-lg hover:scale-105 border ${getColorByIndex(index)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`rounded-full p-2 ${getColorByIndex(index)}`}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                        {getCityName(city)}
                      </h3>
                    </div>
                    {city.region && (
                      <p className="text-xs text-gray-400 mb-2 truncate">
                        {city.region}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Building2 className="h-3 w-3" />
                      <span>
                        {city.businessCount}{" "}
                        {language === "fr"
                          ? "établissements"
                          : language === "ar"
                            ? "مؤسسة"
                            : "businesses"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
