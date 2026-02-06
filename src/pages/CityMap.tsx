import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

const CityMap = () => {
  const { city } = useParams<{ city: string }>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
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
    const fetchBusinesses = async () => {
      if (!decodedCity) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, region, address, main_category, categories, latitude, longitude, wtuce_status, services")
        .ilike("city", decodedCity);

      if (error) {
        console.error("Error fetching businesses:", error);
      } else {
        setBusinesses(data || []);
      }
      setIsLoading(false);
    };

    fetchBusinesses();
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            Entreprises à {decodedCity}
          </h1>
          <p className="text-muted-foreground mt-2">
            {businesses.length} entreprise{businesses.length > 1 ? "s" : ""} dans l'annuaire WTUCE
          </p>
        </div>

        {/* Category & Subcategory Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Main Category Filter */}
            <div className="w-full sm:w-auto">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Catégorie</label>
              <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Toutes les catégories" />
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
              <div className="w-full sm:w-auto">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Sous-catégorie</label>
                <Select value={selectedSubcategory || "all"} onValueChange={handleSubcategoryChange}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Toutes les sous-catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sous-catégories</SelectItem>
                    {availableSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clear All Button */}
            {(selectedCategory || selectedSubcategory || selectedActivities.length > 0) && (
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 h-10 px-3"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              </div>
            )}
          </div>

          {/* Activity Filters */}
          {availableActivities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Filtrer par activité</h3>
              <div className="flex flex-wrap gap-2">
                {availableActivities.slice(0, 10).map((activity) => (
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
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
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
          </div>

          {/* Business list */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground sticky top-0 bg-background py-2">
              Liste des entreprises ({filteredBusinesses.length})
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CityMap;
