import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, Crown, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoGoldOverlay from "@/assets/logoGOLD-overlay.webp";
import heroBackground from "@/assets/hero-marrakech.jpg";

interface City {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  region: string | null;
  businessCount?: number;
}

interface Category {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  businessCount?: number;
}

const RELAIS_CHATEAUX_NAMES = [
  "La Mamounia",
  "Royal Mansour Marrakech",
  "Heure Bleue Palais",
  "Kasbah Tamadot",
];

const HeroSection = () => {
  const { t, language } = useLanguage();
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relaisCount, setRelaisCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const citiesScrollRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = 320;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch top cities
        const { data: citiesData } = await supabase
          .from("cities")
          .select("id, name_fr, name_en, name_ar, region")
          .order("priority_score", { ascending: false })
          .limit(12);

        // Fetch business counts per city
        const { data: businessCounts } = await supabase
          .from("businesses")
          .select("city, main_category")
          .eq("is_active", true);

        // Count businesses per city
        const cityCountMap: Record<string, number> = {};
        businessCounts?.forEach((b) => {
          if (b.city) {
            cityCountMap[b.city] = (cityCountMap[b.city] || 0) + 1;
          }
        });

        // Merge counts with cities
        const citiesWithCounts = (citiesData || []).map((city) => ({
          ...city,
          businessCount: cityCountMap[city.name_fr] || 0,
        }));

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name_fr, name_en, name_ar")
          .order("sort_order", { ascending: true });

        // Count businesses per main_category
        const categoryCountMap: Record<string, number> = {};
        businessCounts?.forEach((b) => {
          const mainCat = (b as any).main_category;
          if (mainCat) {
            categoryCountMap[mainCat] = (categoryCountMap[mainCat] || 0) + 1;
          }
        });

        // Merge counts with categories (only include categories with businesses)
        const categoriesWithCounts = (categoriesData || [])
          .map((cat) => ({
            ...cat,
            businessCount: categoryCountMap[cat.name_fr] || 0,
          }))
          .filter((cat) => cat.businessCount > 0);

        // Count Relais & Châteaux
        const { count } = await supabase
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .in("name", RELAIS_CHATEAUX_NAMES);

        setCities(citiesWithCounts);
        setCategories(categoriesWithCounts);
        setRelaisCount(count || 0);
      } catch (error) {
        console.error("Error fetching hero data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCityName = (city: City) => {
    if (language === "ar" && city.name_ar) return city.name_ar;
    if (language === "en" && city.name_en) return city.name_en;
    return city.name_fr;
  };

  const getCategoryName = (category: Category) => {
    if (language === "ar" && category.name_ar) return category.name_ar;
    if (language === "en" && category.name_en) return category.name_en;
    return category.name_fr;
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Hero Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />

      {/* Overlay with gradient to black at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />

      {/* Centered Gold Logo Overlay */}
      <div className="absolute inset-x-0 top-32 flex justify-center pointer-events-none">
        <img 
          src={logoGoldOverlay} 
          alt="" 
          className="object-contain opacity-60"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pt-[28rem]">
        {/* Logo/Title - DISABLED
        <div className="mb-12 text-center">
          <h1 className="mb-2 font-serif text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
            <span className="text-gold">ONE WORLD</span> MOROCCO
          </h1>
          <p className="text-lg text-white/90 md:text-xl">
            {t("hero.subtitle")}
          </p>
        </div>
        */}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <div className="w-full max-w-5xl space-y-10">
            {/* Cities Section */}
            <div>
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold text-white">
                  {language === "fr" 
                    ? "Découvrez les meilleures adresses dans chaque ville du Maroc" 
                    : language === "ar" 
                      ? "اكتشف أفضل العناوين في كل مدينة بالمغرب" 
                      : "Discover the best addresses in every city of Morocco"}
                </h2>
              </div>
              <div className="relative">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollContainer(citiesScrollRef, "left")}
                  className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 shadow-lg transition-all hover:bg-gold hover:text-black backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                {/* Right Arrow */}
                <button
                  onClick={() => scrollContainer(citiesScrollRef, "right")}
                  className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 shadow-lg transition-all hover:bg-gold hover:text-black backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>

                <div 
                  ref={citiesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {cities.map((city) => (
                    <Link 
                      key={city.id} 
                      to={`/city/${encodeURIComponent(city.name_fr)}`}
                      className="flex-shrink-0"
                    >
                      <Card className="w-48 bg-white/10 border-white/30 hover:bg-gold/20 hover:border-gold transition-all">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <MapPin className="h-4 w-4 text-gold" />
                            <h3 className="font-semibold text-white">
                              {getCityName(city)}
                            </h3>
                          </div>
                          {city.region && (
                            <p className="text-xs text-gray-400 mb-2">{city.region}</p>
                          )}
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-300">
                            <Building2 className="h-3 w-3" />
                            <span>
                              {city.businessCount || 0}{" "}
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

            {/* Categories Section - DISABLED
            <div>
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold text-white">
                  {language === "fr" 
                    ? "Trouvez les meilleurs professionnels par secteur d'activité" 
                    : language === "ar" 
                      ? "ابحث عن أفضل المهنيين حسب قطاع النشاط" 
                      : "Find the best professionals by industry sector"}
                </h2>
              </div>
              <div className="relative">
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, "left")}
                  className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 shadow-lg transition-all hover:bg-gold hover:text-black backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, "right")}
                  className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 shadow-lg transition-all hover:bg-gold hover:text-black backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>

                <div 
                  ref={categoriesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {categories.map((category) => (
                    <Link 
                      key={category.id} 
                      to={`/category/${encodeURIComponent(category.name_fr)}`}
                      className="flex-shrink-0"
                    >
                      <Card className="w-48 bg-white/10 border-white/30 hover:bg-gold/20 hover:border-gold transition-all">
                        <CardContent className="p-4 text-center">
                          <h3 className="font-semibold text-white mb-2">
                            {getCategoryName(category)}
                          </h3>
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-300">
                            <Building2 className="h-3 w-3" />
                            <span>
                              {category.businessCount || 0}{" "}
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
            */}

            {/* Relais & Châteaux Section - DISABLED
            {relaisCount > 0 && (
              <div className="text-center">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Crown className="h-6 w-6 text-gold" />
                  <h2 className="text-2xl font-bold text-white">
                    {language === "fr" ? "Collection Prestige" : language === "ar" ? "مجموعة برستيج" : "Prestige Collection"}
                  </h2>
                </div>
                <a href="#relais-chateaux">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-gold to-yellow-600 text-black font-semibold hover:from-yellow-600 hover:to-gold transition-all shadow-lg shadow-gold/30"
                  >
                    <Crown className="mr-2 h-5 w-5" />
                    {language === "fr" 
                      ? `Découvrir les ${relaisCount} Relais & Châteaux` 
                      : language === "ar" 
                        ? `اكتشف ${relaisCount} Relais & Châteaux`
                        : `Discover ${relaisCount} Relais & Châteaux`}
                  </Button>
                </a>
              </div>
            )}
            */}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;

/* ============================================
   DISABLED SEARCH FUNCTIONALITY
   The following code is preserved but not used.
   To re-enable, restore the original imports and component logic.
   ============================================

import { Search, Loader2, BadgeCheck, Navigation, Building2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAvailableMainCategories } from "@/hooks/useAvailableMainCategories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoGold from "@/assets/logoGOLD.webp";

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  services: string[];
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  wtuce_status: "verified" | "pending";
  priority_score: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  distance_km: number | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
}

const CATEGORY_LABELS: Record<string, { fr: string; en: string; ar: string }> = {
  "Hôtellerie": { fr: "Hôtellerie", en: "Hospitality", ar: "فندقة" },
  "Restauration": { fr: "Restauration", en: "Restaurants", ar: "مطاعم" },
  // ... rest of category labels
};

============================================ */
