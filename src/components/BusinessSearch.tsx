import { useState, useEffect, useMemo } from "react";
import { 
  Search, MapPin, Loader2, BadgeCheck, Navigation, Building2, Filter, X,
  Hotel, UtensilsCrossed, Car, Palette, ShoppingBag, Briefcase, Plane,
  Wheat, Factory, GraduationCap, Heart, Dumbbell, Sparkles, Theater, Cpu, LayoutGrid
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanPhone } from "@/lib/phoneUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Static category definitions with icons and translations
const CATEGORY_CONFIG: Record<string, { labelFr: string; labelEn: string; labelAr: string; icon: React.ComponentType<any> }> = {
  "Hôtellerie": { labelFr: "Hôtellerie", labelEn: "Hospitality", labelAr: "فندقة", icon: Hotel },
  "Restauration": { labelFr: "Restauration", labelEn: "Restaurants", labelAr: "مطاعم", icon: UtensilsCrossed },
  "Transport": { labelFr: "Transport", labelEn: "Transport", labelAr: "نقل", icon: Car },
  "Artisanat": { labelFr: "Artisanat", labelEn: "Crafts", labelAr: "حرف يدوية", icon: Palette },
  "Commerce": { labelFr: "Commerce", labelEn: "Retail", labelAr: "تجارة", icon: ShoppingBag },
  "Services": { labelFr: "Services", labelEn: "Services", labelAr: "خدمات", icon: Briefcase },
  "Tourisme": { labelFr: "Tourisme", labelEn: "Tourism", labelAr: "سياحة", icon: Plane },
  "Agriculture": { labelFr: "Agriculture", labelEn: "Agriculture", labelAr: "فلاحة", icon: Wheat },
  "Industrie": { labelFr: "Industrie", labelEn: "Industry", labelAr: "صناعة", icon: Factory },
  "Éducation": { labelFr: "Éducation", labelEn: "Education", labelAr: "تعليم", icon: GraduationCap },
  "Santé": { labelFr: "Santé", labelEn: "Health", labelAr: "صحة", icon: Heart },
  "Sport & Loisirs": { labelFr: "Sport & Loisirs", labelEn: "Sports & Leisure", labelAr: "رياضة وترفيه", icon: Dumbbell },
  "Bien-être": { labelFr: "Bien-être", labelEn: "Wellness", labelAr: "رفاهية", icon: Sparkles },
  "Culture": { labelFr: "Culture", labelEn: "Culture", labelAr: "ثقافة", icon: Theater },
  "Technologie": { labelFr: "Technologie", labelEn: "Technology", labelAr: "تكنولوجيا", icon: Cpu },
};

const BusinessSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Load available categories from database using RPC or direct query
  useEffect(() => {
    const fetchCategories = async () => {
      // Use a more efficient approach: select distinct main_category
      // We need to fetch all rows but only the main_category column
      const { data, error } = await supabase
        .from("businesses")
        .select("main_category")
        .eq("is_active", true)
        .not("main_category", "is", null)
        .order("main_category");
      
      if (!error && data) {
        // Get unique values - need Set because Supabase doesn't support DISTINCT in JS client
        const uniqueCategories = [...new Set(data.map(b => b.main_category))] as string[];
        
        // Sort alphabetically with French locale
        uniqueCategories.sort((a, b) => a.localeCompare(b, 'fr'));
        setAvailableCategories(uniqueCategories);
      } else if (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Extract unique activities from results
  const availableActivities = useMemo(() => {
    if (!result?.businesses) return [];
    const activities = new Set<string>();
    result.businesses.forEach((business) => {
      business.services.forEach((service) => activities.add(service));
    });
    return Array.from(activities).sort();
  }, [result?.businesses]);

  // Filter businesses by selected activities
  const filteredBusinesses = useMemo(() => {
    if (!result?.businesses) return [];
    if (selectedActivities.length === 0) return result.businesses;
    return result.businesses.filter((business) =>
      selectedActivities.some((activity) => business.services.includes(activity))
    );
  }, [result?.businesses, selectedActivities]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const clearActivities = () => {
    setSelectedActivities([]);
  };

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
    <section id="directory" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">
            {t("directory.title")} <span className="text-primary">{t("directory.titleHighlight")}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("directory.description")}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mx-auto mb-8 max-w-4xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("directory.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("directory.cityPlaceholder")}
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-72">
                  {(() => {
                    const config = categoryFilter !== "all" ? CATEGORY_CONFIG[categoryFilter] : null;
                    const IconComponent = config?.icon || LayoutGrid;
                    return <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />;
                  })()}
                  <SelectValue placeholder={language === "fr" ? "Catégorie" : language === "ar" ? "فئة" : "Category"} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {/* All categories option */}
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span>{language === "fr" ? "Toutes les catégories" : language === "ar" ? "جميع الفئات" : "All categories"}</span>
                    </div>
                  </SelectItem>
                  {/* Dynamic categories from database */}
                  {availableCategories.map((catValue) => {
                    const config = CATEGORY_CONFIG[catValue];
                    const IconComponent = config?.icon || Filter;
                    const label = config 
                      ? (language === "fr" ? config.labelFr : language === "ar" ? config.labelAr : config.labelEn)
                      : catValue;
                    return (
                      <SelectItem key={catValue} value={catValue}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
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
              <div className="mb-6 flex items-center justify-center gap-2">
                <Badge
                  className={`flex items-center gap-1.5 px-3 py-1 ${getSearchLevelBadge(result.searchLevel).color}`}
                  variant="outline"
                >
                  {getSearchLevelBadge(result.searchLevel).icon}
                  {result.message}
                </Badge>
              </div>
            )}

            {/* Activity Filters */}
            {availableActivities.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">
                    {language === "fr" ? "Filtrer par activité" : language === "ar" ? "تصفية حسب النشاط" : "Filter by activity"}
                  </h3>
                  {selectedActivities.length > 0 && (
                    <button
                      onClick={clearActivities}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      {language === "fr" ? "Effacer" : language === "ar" ? "مسح" : "Clear"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableActivities.slice(0, 12).map((activity) => (
                    <label
                      key={activity}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${
                        selectedActivities.includes(activity)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedActivities.includes(activity)}
                        onCheckedChange={() => toggleActivity(activity)}
                        className="h-3.5 w-3.5"
                      />
                      {activity}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Results Count */}
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {filteredBusinesses.length} {t("directory.resultsFound")}
              {selectedActivities.length > 0 && ` (${result.totalResults} ${language === "fr" ? "au total" : language === "ar" ? "إجمالي" : "total"})`}
            </p>

            {/* Business Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBusinesses.map((business) => (
                <Card
                  key={business.id}
                  className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {business.name}
                          </h3>
                          {business.wtuce_status === "verified" && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                              <BadgeCheck className="h-3 w-3" />
                              WTUCE
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
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
                        className="mb-3 text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none prose-p:m-0 prose-headings:m-0"
                        dangerouslySetInnerHTML={{ __html: business.description }}
                      />
                    )}

                    {/* Categories */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {business.categories.slice(0, 3).map((category, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>

                    {/* Services */}
                    {business.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {business.services.slice(0, 4).map((service, idx) => (
                          <span
                            key={idx}
                            className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                          >
                            {service}
                          </span>
                        ))}
                        {business.services.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{business.services.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Contact */}
                    {(business.phone || business.website) && (
                      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border">
                        {business.phone && (
                          <a
                            href={`tel:${cleanPhone(business.phone)}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {business.phone}
                          </a>
                        )}
                        {business.website && (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {t("directory.visitWebsite")}
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BusinessSearch;
