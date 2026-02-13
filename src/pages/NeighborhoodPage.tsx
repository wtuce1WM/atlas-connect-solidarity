import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, ChevronLeft, ChevronRight, X, Phone } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import TopCityBusinesses from "@/components/TopCityBusinesses";
import Footer from "@/components/Footer";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import BusinessCard, { Gamme } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";
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
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  main_category: string | null;
  categories: string[] | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  wtuce_status: "verified" | "pending" | null;
  services: string[] | null;
  images: string[] | null;
  rating: number | null;
  priority_score: number | null;
  logo_url: string | null;
  gamme_id: string | null;
  neighborhood: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
}

const ITEMS_PER_PAGE = 20;

const NeighborhoodPage = () => {
  const { neighborhood } = useParams<{ neighborhood: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const decodedNeighborhood = neighborhood ? decodeURIComponent(neighborhood) : "";
  const cityParam = searchParams.get("city") ? decodeURIComponent(searchParams.get("city")!) : "";

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    businesses.forEach((b) => {
      if (b.main_category) categories.add(b.main_category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses]);

  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    const filtered = selectedCategory
      ? businesses.filter((b) => b.main_category === selectedCategory)
      : businesses;
    filtered.forEach((b) => {
      b.categories?.forEach((cat) => subcategories.add(cat));
    });
    return Array.from(subcategories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory]);

  const availableActivities = useMemo(() => {
    const activities = new Set<string>();
    let filtered = businesses;
    if (selectedCategory) filtered = filtered.filter((b) => b.main_category === selectedCategory);
    if (selectedSubcategory) filtered = filtered.filter((b) => b.categories?.includes(selectedSubcategory));
    filtered.forEach((b) => {
      b.services?.forEach((s) => activities.add(s));
    });
    return Array.from(activities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory, selectedSubcategory]);

  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    if (selectedCategory) result = result.filter((b) => b.main_category === selectedCategory);
    if (selectedSubcategory) result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    if (selectedActivities.length > 0) {
      result = result.filter((b) => selectedActivities.some((a) => b.services?.includes(a)));
    }
    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedActivities]);

  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, selectedActivities]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedNeighborhood) return;

      const { data: gammesData } = await supabase
        .from("gammes")
        .select("id, name_fr, color_hex, text_color_hex")
        .order("sort_order", { ascending: true });

      if (gammesData) setGammes(gammesData);

      // Fetch all cities for the filter
      const { data: citiesData } = await supabase
        .from("cities")
        .select("name_fr, priority_score")
        .order("priority_score", { ascending: false });
      
      if (citiesData) setCities(citiesData.map(c => c.name_fr));

      // Fetch neighborhoods for the same city
      if (cityParam) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("id")
          .ilike("name_fr", cityParam)
          .maybeSingle();
        
        if (cityData) {
          const { data: neighborhoodsData } = await supabase
            .from("neighborhoods")
            .select("name")
            .eq("city_id", cityData.id)
            .order("sort_order", { ascending: true });
          
          if (neighborhoodsData) {
            setNeighborhoods(neighborhoodsData.map(n => n.name));
          }
        }
      }

      let query = supabase
        .from("businesses")
        .select("id, name, city, region, address, phone, whatsapp, skype, main_category, categories, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, priority_score, logo_url, gamme_id, neighborhood, opening_hours, show_opening_hours, is_open_24h")
        .eq("is_active", true)
        .ilike("neighborhood", decodedNeighborhood);

      if (cityParam) {
        query = query.ilike("city", cityParam);
      }

      const { data: businessData, error } = await query
        .order("wtuce_status", { ascending: true, nullsFirst: false })
        .order("priority_score", { ascending: false });

      if (error) {
        console.error("Error fetching businesses:", error);
      } else {
        setBusinesses(businessData || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [decodedNeighborhood, cityParam]);

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

  // Get the city name from the first business (all should share the same neighborhood)
  const cityName = cityParam || (businesses.length > 0 ? businesses[0].city : "");

  const getMapEmbedUrl = () => {
    if (selectedBusiness) {
      if (selectedBusiness.google_maps_url) {
        const preciseMatch = selectedBusiness.google_maps_url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
        const coordMatch = preciseMatch || selectedBusiness.google_maps_url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${coordMatch[1]},${coordMatch[2]}&zoom=17`;
        }
        const placeMatch = selectedBusiness.google_maps_url.match(/place\/([^\/]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(placeName)}&zoom=17`;
        }
      }
      if (selectedBusiness.latitude && selectedBusiness.longitude) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedBusiness.latitude},${selectedBusiness.longitude}&zoom=17`;
      }
      const query = selectedBusiness.address 
        ? `${selectedBusiness.name}, ${selectedBusiness.address}`
        : `${selectedBusiness.name}, ${cityName}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }

    const searchQuery = `${decodedNeighborhood} ${cityName}`;
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(searchQuery)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=15`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(searchQuery + ", Maroc")}&zoom=15`;
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-24">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            {language === "fr"
              ? `Quartier ${decodedNeighborhood}`
              : language === "ar"
                ? `حي ${decodedNeighborhood}`
                : `${decodedNeighborhood} Neighborhood`}
          </h1>
          {cityName && (
            <p className="text-muted-foreground mt-2">
              {cityName} — {filteredBusinesses.length} établissement{filteredBusinesses.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Top Selection Carousel */}
        <TopCityBusinesses 
          businesses={businesses} 
          cityName={cityName}
          neighborhoodName={neighborhood}
          gammes={gammes}
          onSelectBusiness={handleSelectBusiness}
          selectedBusinessId={selectedBusiness?.id}
        />

        {/* Google Maps */}
        <Card className="relative mb-6">
          <CardContent className="p-0">
            {selectedBusiness && (
              <MapBusinessInfoCard
                business={selectedBusiness}
                onClose={clearSelectedBusiness}
              />
            )}
            <iframe
              src={getMapEmbedUrl()}
              className="w-full h-[500px] border-0 rounded-lg"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte du quartier ${decodedNeighborhood}`}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap gap-3">
            {/* City Filter */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Ville</label>
              <Select value={cityParam || "all"} onValueChange={(value) => {
                if (value === "all") {
                  navigate(`/neighborhood/${encodeURIComponent(decodedNeighborhood)}`);
                } else {
                  navigate(`/neighborhood/${encodeURIComponent(decodedNeighborhood)}?city=${encodeURIComponent(value)}`);
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les villes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Neighborhood Filter */}
            {neighborhoods.length > 1 && (
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Quartier</label>
                <Select value={decodedNeighborhood} onValueChange={(value) => navigate(`/neighborhood/${encodeURIComponent(value)}?city=${encodeURIComponent(cityParam)}`)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={decodedNeighborhood} />
                  </SelectTrigger>
                  <SelectContent>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                    <SelectItem key={category} value={category}>{category}</SelectItem>
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
                    {availableSubcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
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
          {selectedCategory && availableActivities.length > 0 && (
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

        {/* Results count */}
        {/* Business count heading */}
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Établissements ({filteredBusinesses.length})
        </h2>

        {/* Business Grid */}
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === "fr"
                ? "Aucun établissement trouvé dans ce quartier"
                : language === "ar"
                  ? "لم يتم العثور على مؤسسات في هذا الحي"
                  : "No businesses found in this neighborhood"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedBusinesses.map((business) => (
                <BusinessCard 
                  key={business.id} 
                  business={business} 
                  gammes={gammes} 
                  verifiedLabel="Vérifié"
                  showMapButton
                  onSelectBusiness={handleSelectBusiness}
                  selectedBusinessId={selectedBusiness?.id}
                  mapButtonLabels={{ view: "Voir sur la carte", shown: "Affiché sur la carte" }}
                />
              ))}
            </div>

            {filteredBusinesses.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                Affichage {startResult}-{endResult} sur {filteredBusinesses.length} résultat{filteredBusinesses.length > 1 ? "s" : ""}
              </p>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <DynamicLabelSections pageType="neighborhood" />
      <Footer />
    </div>
  );
};

export default NeighborhoodPage;
