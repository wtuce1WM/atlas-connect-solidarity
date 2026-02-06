import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Loader2, BadgeCheck, Navigation, Building2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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
import logoGoldOverlay from "@/assets/logoGOLD-overlay.webp";
import heroBackground from "@/assets/hero-marrakech.jpg";

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
  "Transport": { fr: "Transport", en: "Transport", ar: "نقل" },
  "Artisanat": { fr: "Artisanat", en: "Crafts", ar: "حرف يدوية" },
  "Commerce": { fr: "Commerce", en: "Retail", ar: "تجارة" },
  "Services": { fr: "Services", en: "Services", ar: "خدمات" },
  "Tourisme": { fr: "Tourisme", en: "Tourism", ar: "سياحة" },
  "Agriculture": { fr: "Agriculture", en: "Agriculture", ar: "فلاحة" },
  "Industrie": { fr: "Industrie", en: "Industry", ar: "صناعة" },
  "Éducation": { fr: "Éducation", en: "Education", ar: "تعليم" },
  "Santé": { fr: "Santé", en: "Health", ar: "صحة" },
  "Sport & Loisirs": { fr: "Sport & Loisirs", en: "Sports & Leisure", ar: "رياضة وترفيه" },
  "Bien-être": { fr: "Bien-être", en: "Wellness", ar: "رفاهية" },
  "Culture": { fr: "Culture", en: "Culture", ar: "ثقافة" },
  "Technologie": { fr: "Technologie", en: "Technology", ar: "تكنولوجيا" },
};

const RESULTS_PER_PAGE = 12; // 4 rows x 3 columns

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { categories: availableCategories } = useAvailableMainCategories();

  // Extract unique subcategories from results
  const availableSubcategories = result?.businesses
    ? [...new Set(result.businesses.flatMap(b => b.categories || []))]
    : [];

  // Filter businesses by selected subcategory
  const allFilteredBusinesses = selectedSubcategory
    ? result?.businesses.filter(b => b.categories?.includes(selectedSubcategory)) || []
    : result?.businesses || [];

  // Limit displayed results based on visible count
  const displayedBusinesses = allFilteredBusinesses.slice(0, visibleCount);
  const hasMoreResults = allFilteredBusinesses.length > visibleCount;
  const remainingCount = allFilteredBusinesses.length - visibleCount;

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  // Load recommended businesses on mount
  useEffect(() => {
    handleSearch(true);
  }, []);

  const handleSearch = async (isInitial = false) => {
    if (!isInitial && !searchQuery.trim() && !cityQuery.trim() && categoryFilter === "all") {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: {
          query: searchQuery || undefined,
          city: cityQuery || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          language,
        },
      });

      if (error) throw error;
      setResult(data);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: t("directory.error"),
        description: error.message || t("directory.searchFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const getSearchLevelBadge = (level: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode }> = {
      exact: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: <BadgeCheck className="h-3 w-3" /> },
      fuzzy: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: <Search className="h-3 w-3" /> },
      radius: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <Navigation className="h-3 w-3" /> },
      region: { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: <MapPin className="h-3 w-3" /> },
      recommended: { color: "bg-primary/10 text-primary border-primary/20", icon: <Building2 className="h-3 w-3" /> },
    };
    return badges[level] || badges.recommended;
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={logoGoldOverlay} 
          alt="" 
          className="w-[400px] h-[400px] md:w-[500px] md:h-[500px] object-contain opacity-30"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-24">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
            <span className="text-gold">ONE WORLD</span> MOROCCO
          </h1>
          <p className="text-lg text-white/90 md:text-xl">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Directory Section */}
        <div className="w-full max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">
              {t("directory.title")} <span className="text-gold">{t("directory.titleHighlight")}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-white/80 md:text-base">
              {t("directory.description")}
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="mx-auto mb-8 max-w-4xl">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("directory.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border-0 bg-white/95 py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("directory.cityPlaceholder")}
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    className="w-full rounded-xl border-0 bg-white/95 py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-64 bg-white/95 border-0 py-4 h-auto rounded-xl">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={language === "fr" ? "Catégorie" : language === "ar" ? "فئة" : "Category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === "fr"
                        ? "Toutes les catégories"
                        : language === "ar"
                          ? "جميع الفئات"
                          : "All categories"}
                    </SelectItem>
                    {availableCategories.map((catValue) => {
                      const labels = CATEGORY_LABELS[catValue];
                      const label = labels
                        ? language === "fr"
                          ? labels.fr
                          : language === "ar"
                            ? labels.ar
                            : labels.en
                        : catValue;
                      return (
                        <SelectItem key={catValue} value={catValue}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                  {t("directory.searchButton")}
                </button>
              </div>
            </div>
          </form>

          {/* Results */}
          {result && (
            <div className="mx-auto max-w-5xl">
              {/* Search Level Message */}
              {result.searchLevel !== "exact" && result.businesses.length > 0 && (
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Badge
                    className={`flex items-center gap-1.5 px-3 py-1 ${getSearchLevelBadge(result.searchLevel).color}`}
                    variant="outline"
                  >
                    {getSearchLevelBadge(result.searchLevel).icon}
                    {result.message}
                  </Badge>
                </div>
              )}

              {/* Subcategories filter */}
              {availableSubcategories.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant={selectedSubcategory === null ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      selectedSubcategory === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/80 hover:bg-white text-foreground"
                    }`}
                    onClick={() => setSelectedSubcategory(null)}
                  >
                    {language === "fr" ? "Tous" : language === "ar" ? "الكل" : "All"}
                  </Badge>
                  {availableSubcategories.map((subcat) => (
                    <Badge
                      key={subcat}
                      variant={selectedSubcategory === subcat ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedSubcategory === subcat
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/80 hover:bg-white text-foreground"
                      }`}
                      onClick={() => setSelectedSubcategory(subcat)}
                    >
                      {subcat}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Results Count */}
              <p className="mb-4 text-center text-sm text-white/80">
                {allFilteredBusinesses.length} {t("directory.resultsFound")}
              </p>

              {/* Business Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayedBusinesses.map((business) => (
                  <Link to={`/business/${business.id}`} key={business.id}>
                    <Card className="group overflow-hidden bg-white/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-primary/50 h-full relative">
                      {/* Background logo for verified businesses */}
                      {business.wtuce_status === "verified" && (
                        <div 
                          className="absolute inset-0 opacity-40 pointer-events-none"
                          style={{
                            backgroundImage: `url(${logoGold})`,
                            backgroundSize: '120px',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      )}
                      <CardContent className="p-4 relative z-10">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {business.name}
                              </h3>
                              {business.wtuce_status === "verified" && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 text-xs">
                                  <BadgeCheck className="h-3 w-3" />
                                  WTUCE
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {business.city}, {business.region}
                              {business.distance_km !== null && (
                                <span className="ml-1 text-primary font-medium">
                                  ({business.distance_km} km)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {business.description && (
                          <div 
                            className={`mb-2 text-xs text-muted-foreground line-clamp-2 ${business.wtuce_status === "verified" ? "font-bold" : ""}`}
                            dangerouslySetInnerHTML={{ __html: business.description }}
                          />
                        )}

                        {/* Categories */}
                        <div className="mb-2 flex flex-wrap gap-1">
                          {business.categories.slice(0, 2).map((category, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs py-0">
                              {category}
                            </Badge>
                          ))}
                        </div>

                        {/* Contact hint */}
                        {(business.phone || business.website) && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border text-xs">
                            <span className="text-primary">Voir les détails →</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Show More Button */}
              {hasMoreResults && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + RESULTS_PER_PAGE)}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-6 py-3 font-medium text-foreground transition-all hover:bg-white hover:shadow-md"
                  >
                    {language === "fr" 
                      ? `Voir plus (${remainingCount} restants)` 
                      : language === "ar" 
                        ? `عرض المزيد (${remainingCount} متبقي)`
                        : `Show more (${remainingCount} remaining)`}
                  </button>
                </div>
              )}

              {/* Show Less Button */}
              {visibleCount > RESULTS_PER_PAGE && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setVisibleCount(RESULTS_PER_PAGE)}
                    className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {language === "fr" ? "← Réduire" : language === "ar" ? "← تقليص" : "← Show less"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
