import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, X, ExternalLink, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CityWeather from "@/components/CityWeather";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  city: string;
  region: string;
  address: string | null;
  main_category: string | null;
  categories: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wtuce_status: "verified" | "pending" | null;
  services: string[] | null;
}

interface CityInfo {
  description: string | null;
  official_site_1_name: string | null;
  official_site_1_url: string | null;
  official_site_2_name: string | null;
  official_site_2_url: string | null;
  official_site_3_name: string | null;
  official_site_3_url: string | null;
  official_site_4_name: string | null;
  official_site_4_url: string | null;
  official_site_5_name: string | null;
  official_site_5_url: string | null;
  official_site_6_name: string | null;
  official_site_6_url: string | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
}

const CityMap = () => {
  const { city } = useParams<{ city: string }>();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const decodedCity = city ? decodeURIComponent(city) : "";

  // Extract unique main categories from businesses
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    businesses.forEach((business) => {
      if (business.main_category) categories.add(business.main_category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses]);

  // Extract unique subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    const filteredByCategory = selectedCategory
      ? businesses.filter((b) => b.main_category === selectedCategory)
      : businesses;
    
    filteredByCategory.forEach((business) => {
      business.categories?.forEach((cat) => subcategories.add(cat));
    });
    return Array.from(subcategories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory]);

  // Extract unique activities from filtered businesses
  const availableActivities = useMemo(() => {
    const activities = new Set<string>();
    let filtered = businesses;
    
    if (selectedCategory) {
      filtered = filtered.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    
    filtered.forEach((business) => {
      business.services?.forEach((service) => activities.add(service));
    });
    return Array.from(activities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory, selectedSubcategory]);

  // Filter businesses by all criteria
  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    
    if (selectedCategory) {
      result = result.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedActivities.length > 0) {
      result = result.filter((business) =>
        selectedActivities.some((activity) => business.services?.includes(activity))
      );
    }
    
    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedActivities]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCity) return;

      // Fetch businesses
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, city, region, address, main_category, categories, latitude, longitude, wtuce_status, services")
        .eq("is_active", true)
        .ilike("city", decodedCity);

      if (businessError) {
        console.error("Error fetching businesses:", businessError);
      } else {
        setBusinesses(businessData || []);
      }

      // Fetch city info
      const { data: cityData, error: cityError } = await supabase
        .from("cities")
        .select("description, official_site_1_name, official_site_1_url, official_site_2_name, official_site_2_url, official_site_3_name, official_site_3_url, official_site_4_name, official_site_4_url, official_site_5_name, official_site_5_url, official_site_6_name, official_site_6_url, wikipedia_fr, wikipedia_en, wikipedia_ar")
        .ilike("name_fr", decodedCity)
        .maybeSingle();

      if (cityError) {
        console.error("Error fetching city info:", cityError);
      } else if (cityData) {
        setCityInfo(cityData);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [decodedCity]);

  // Build Google Maps embed URL with all business markers
  const getMapEmbedUrl = () => {
    if (businesses.length === 0) {
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
    }

    // If we have businesses with coordinates, center on the first one
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=entreprises+${encodeURIComponent(decodedCity)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=14`;
    }

    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=entreprises+${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
  };

  const handleOpenInMaps = (business: Business) => {
    const query = business.latitude && business.longitude
      ? `${business.latitude},${business.longitude}`
      : encodeURIComponent(`${business.name}, ${business.address || business.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-morocco-red to-morocco-green">
      <Header variant="morocco" />

      <main className="container mx-auto px-4 py-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white hover:text-gold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        {/* Title + Weather */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              Entreprises à {decodedCity}
            </h1>
            <p className="text-muted-foreground mt-2">
              {businesses.length} entreprise{businesses.length > 1 ? "s" : ""} dans l'annuaire WTUCE
            </p>
          </div>
          <div className="lg:w-72">
            <CityWeather city={decodedCity} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <iframe
                  src={getMapEmbedUrl()}
                  className="w-full h-[500px] border-0 rounded-lg"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Carte des entreprises à ${decodedCity}`}
                />
              </CardContent>
            </Card>

            {/* City Description */}
            {cityInfo?.description && (
              <Card>
                <CardContent className="p-6">
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: cityInfo.description }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters + Business list */}
          <div className="space-y-4">
            {/* Category & Subcategory Filters */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Main Category Filter */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Catégorie</label>
                  <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory Filter */}
                {availableSubcategories.length > 0 && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Sous-catégorie</label>
                    <Select value={selectedSubcategory || "all"} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory} value={subcategory}>
                            {subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Clear All Button */}
              {(selectedCategory || selectedSubcategory || selectedActivities.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}

              {/* Activity Filters */}
              {availableActivities.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Activités</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableActivities.slice(0, 8).map((activity) => (
                      <label
                        key={activity}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer transition-colors text-xs ${
                          selectedActivities.includes(activity)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedActivities.includes(activity)}
                          onCheckedChange={() => toggleActivity(activity)}
                          className="h-3 w-3"
                        />
                        {activity}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Business list */}
            <div className="max-h-[800px] overflow-y-auto space-y-3">
              <h2 className="text-lg font-semibold text-foreground sticky top-0 bg-background py-2 z-10">
                Entreprises ({filteredBusinesses.length})
              </h2>
              {filteredBusinesses.map((business) => (
                <Link key={business.id} to={`/business/${business.id}`}>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-foreground hover:text-primary transition-colors">
                            {business.name}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {business.address || business.city}
                          </p>
                          {business.main_category && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {business.main_category}
                            </Badge>
                          )}
                        </div>
                        {business.wtuce_status === "verified" && (
                          <Badge className="bg-primary/10 text-primary text-xs shrink-0">
                            Vérifié
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {filteredBusinesses.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  {selectedActivities.length > 0
                    ? "Aucune entreprise pour ces activités"
                    : `Aucune entreprise trouvée à ${decodedCity}`}
                </p>
              )}
            </div>

            {/* Official Sites */}
            {cityInfo && (
              <div className="mt-6">
                {[1, 2, 3, 4, 5, 6].some((num) => {
                  const name = cityInfo[`official_site_${num}_name` as keyof CityInfo];
                  const url = cityInfo[`official_site_${num}_url` as keyof CityInfo];
                  return name && url;
                }) && (
                  <>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Sites officiels</h3>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5, 6].map((num) => {
                        const name = cityInfo[`official_site_${num}_name` as keyof CityInfo] as string | null;
                        const url = cityInfo[`official_site_${num}_url` as keyof CityInfo] as string | null;
                        if (!name || !url) return null;
                        return (
                          <a
                            key={num}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {name}
                          </a>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Wikipedia Link */}
            {cityInfo && (() => {
              const wikipediaUrl = language === "ar" 
                ? cityInfo.wikipedia_ar 
                : language === "en" 
                  ? cityInfo.wikipedia_en 
                  : cityInfo.wikipedia_fr;
              
              if (!wikipediaUrl) return null;
              
              const label = language === "ar" 
                ? "ويكيبيديا" 
                : language === "en" 
                  ? "Wikipedia" 
                  : "Wikipédia";
              
              return (
                <div className="mt-4">
                  <a
                    href={wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {label}
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      <Footer variant="morocco" />
    </div>
  );
};

export default CityMap;
