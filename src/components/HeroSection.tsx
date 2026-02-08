import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Building2, Crown, ChevronRight, ChevronLeft, Loader2, Search, Star } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import logoGoldOverlay from "@/assets/logoGOLDsimple.webp";
import heroBackground from "@/assets/hero-marrakech.jpg";
import relaisLogo from "@/assets/relais-chateaux-logo.png";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface RelaisBusiness {
  id: string;
  name: string;
  city: string;
  images: string[] | null;
  rating: number | null;
  wtuce_status: string | null;
}

interface Sponsor {
  id: string;
  name_fr: string;
  url_fr: string | null;
  url_en: string | null;
  url_ar: string | null;
  logo_small_url_fr: string | null;
  logo_small_url_en: string | null;
  logo_small_url_ar: string | null;
}

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
  icon: string | null;
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
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relaisCount, setRelaisCount] = useState(0);
  const [relaisBusinesses, setRelaisBusinesses] = useState<RelaisBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  
  const citiesScrollRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getSponsorUrl = (sponsor: Sponsor) => {
    if (language === "ar" && sponsor.url_ar) return sponsor.url_ar;
    if (language === "en" && sponsor.url_en) return sponsor.url_en;
    return sponsor.url_fr;
  };

  const getSponsorLogo = (sponsor: Sponsor) => {
    if (language === "ar") {
      return sponsor.logo_small_url_ar || sponsor.logo_small_url_fr;
    }
    if (language === "en") {
      return sponsor.logo_small_url_en || sponsor.logo_small_url_fr;
    }
    return sponsor.logo_small_url_fr;
  };

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
          .select("id, name_fr, name_en, name_ar, icon")
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

        // Fetch Relais & Châteaux businesses
        const { data: relaisData, count } = await supabase
          .from("businesses")
          .select("id, name, city, images, rating, wtuce_status", { count: "exact" })
          .eq("is_active", true)
          .in("name", RELAIS_CHATEAUX_NAMES)
          .order("priority_score", { ascending: false });

        // Fetch sponsors for home zone
        const { data: sponsorsData } = await supabase
          .from("sponsors")
          .select("id, name_fr, url_fr, url_en, url_ar, logo_small_url_fr, logo_small_url_en, logo_small_url_ar")
          .eq("is_active", true)
          .contains("zones", ["home"])
          .order("sort_order", { ascending: true });

        setCities(citiesWithCounts);
        setCategories(categoriesWithCounts);
        setRelaisCount(count || 0);
        setRelaisBusinesses(relaisData || []);
        setSponsors(sponsorsData || []);
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
    <section className="relative min-h-[120vh] w-full overflow-hidden">
      {/* Hero Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />

      {/* Overlay with gradient to black at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />

      {/* Centered Gold Logo Overlay */}
      <div className="absolute inset-x-0 top-32 flex flex-col items-center pointer-events-none">
        <img 
          src={logoGoldOverlay} 
          alt="" 
          className="object-contain opacity-100 w-1/2 max-w-xs"
        />
      </div>

      {/* Search Bar below logo - positioned relative in content flow */}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pt-[30rem]">
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

        {/* Main Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-8 max-w-4xl">
          {language === "fr" 
            ? <>Bienvenue sur la 1<sup>ère</sup> place de marché <a href="#mission" className="text-gold hover:underline">solidaire</a></>
            : language === "ar"
              ? <>مرحبًا بكم في أول سوق <a href="#mission" className="text-gold hover:underline">تضامني</a></>
              : <>Welcome to the 1<sup>st</sup> <a href="#mission" className="text-gold hover:underline">solidarity</a> marketplace</>
          }
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-lg mb-10">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={language === "fr" ? "Que cherchez-vous ?" : language === "ar" ? "ماذا تبحث عنه؟" : "What are you looking for?"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="bg-gold hover:bg-gold/90 text-black font-semibold rounded-full px-6 py-6 shadow-lg"
            >
              <Search className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">
                {language === "fr" ? "Rechercher" : language === "ar" ? "بحث" : "Search"}
              </span>
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <div className="w-full max-w-5xl space-y-10">
            {/* Cities Section */}
            <div className="rounded-xl bg-black/30 backdrop-blur-sm p-4">
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
                  className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5 text-black hover:text-white" />
                </button>
                {/* Right Arrow */}
                <button
                  onClick={() => scrollContainer(citiesScrollRef, "right")}
                  className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5 text-black hover:text-white" />
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

            {/* Categories Section */}
            <div className="rounded-xl bg-black/30 backdrop-blur-sm p-4">
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
                {/* Left Arrow */}
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, "left")}
                  className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5 text-black hover:text-white" />
                </button>
                {/* Right Arrow */}
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, "right")}
                  className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5 text-black hover:text-white" />
                </button>

                <div 
                  ref={categoriesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {categories.map((category) => {
                    // Get the icon component dynamically
                    const IconComponent = category.icon 
                      ? (LucideIcons as any)[category.icon] 
                      : Building2;
                    
                    return (
                      <Link 
                        key={category.id} 
                        to={`/category/${encodeURIComponent(category.name_fr)}`}
                        className="flex-shrink-0"
                      >
                        <Card className="w-48 bg-white/10 border-white/30 hover:bg-gold/20 hover:border-gold transition-all">
                          <CardContent className="p-4 text-center">
                            {IconComponent && (
                              <div className="flex justify-center mb-2">
                                <IconComponent className="h-6 w-6 text-gold" />
                              </div>
                            )}
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
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sponsors Section */}
            {sponsors.length > 0 && (
              <div className="w-full overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex items-center justify-center gap-8 md:gap-12 min-w-max px-4">
                  {sponsors.map((sponsor, index) => {
                    const url = getSponsorUrl(sponsor);
                    const logo = getSponsorLogo(sponsor);

                    if (!logo) return null;

                    const logoElement = (
                      <img
                        src={logo}
                        alt={sponsor.name_fr}
                        className="h-auto w-auto object-contain opacity-100 hover:opacity-80 transition-opacity"
                      />
                    );

                    if (url) {
                      return (
                        <a
                          key={sponsor.id}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          {logoElement}
                        </a>
                      );
                    }

                    return (
                      <div key={sponsor.id} className="flex-shrink-0">
                        {logoElement}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relais & Châteaux Section - MOVED TO SEPARATE COMPONENT */}
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
import logoGold from "@/assets/logoGOLDsimple.webp";

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
