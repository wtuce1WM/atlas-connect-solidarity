import { useState, useEffect } from "react";
import { Search, MapPin, Loader2, BadgeCheck, Navigation, Building2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const CATEGORIES = [
  { value: "all", labelFr: "Toutes les catégories", labelEn: "All categories", labelAr: "جميع الفئات" },
  { value: "Santé", labelFr: "Santé", labelEn: "Health", labelAr: "صحة" },
  { value: "Hébergement & Tourisme", labelFr: "Hébergement & Tourisme", labelEn: "Accommodation & Tourism", labelAr: "إقامة وسياحة" },
];

const BusinessSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { t, language } = useLanguage();
  const { toast } = useToast();

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
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={language === "fr" ? "Catégorie" : language === "ar" ? "فئة" : "Category"} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {language === "fr" ? cat.labelFr : language === "ar" ? cat.labelAr : cat.labelEn}
                    </SelectItem>
                  ))}
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

            {/* Results Count */}
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {result.totalResults} {t("directory.resultsFound")}
            </p>

            {/* Business Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.businesses.map((business) => (
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
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                        {business.description}
                      </p>
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
                            href={`tel:${business.phone}`}
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
