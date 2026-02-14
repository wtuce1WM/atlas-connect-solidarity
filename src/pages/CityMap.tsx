import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, X, ExternalLink, BookOpen, Phone, ChevronLeft, ChevronRight, Clock, ArrowUpDown, ArrowDown, ArrowUp, Navigation, Star } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import CityWeather from "@/components/CityWeather";
import TopCityBusinesses from "@/components/TopCityBusinesses";
import symboleMaroc from "@/assets/symbole-maroc.webp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BusinessCard, { Gamme } from "@/components/BusinessCard";

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
  google_rating: number | null;
  tripadvisor_rating: number | null;
  restaurant_guru_rating: number | null;
  google_review_count: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_review_count: number | null;
  priority_score: number | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  logo_url: string | null;
  gamme_id: string | null;
  neighborhood: string | null;
  hook_fr: string | null;
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
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [gammeCategories, setGammeCategories] = useState<{ gamme_id: string; category_id: string }[]>([]);
  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, string>>({});
  const [selectedGamme, setSelectedGamme] = useState<string>("");
  
  const [sortByRating, setSortByRating] = useState<"none" | "desc" | "asc">("none");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  const decodedCity = city ? decodeURIComponent(city) : "";
  
  // Initialize selectedActivities from URL parameter on mount
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam) {
      setSelectedActivities([decodeURIComponent(serviceParam)]);
    }
  }, [searchParams]);

  // Extract unique main categories from businesses, ordered by sort_order from categories table
  const [categorySortMap, setCategorySortMap] = useState<Record<string, number>>({});

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    businesses.forEach((business) => {
      if (business.main_category) categories.add(business.main_category);
    });
    return Array.from(categories).sort((a, b) => {
      const orderA = categorySortMap[a] ?? 9999;
      const orderB = categorySortMap[b] ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b, "fr");
    });
  }, [businesses, categorySortMap]);

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

  // Filter gammes based on selected category
  const filteredGammes = useMemo(() => {
    if (!selectedCategory) return gammes;
    const categoryId = categoryIdMap[selectedCategory];
    if (!categoryId) return gammes;
    const allowedGammeIds = new Set(
      gammeCategories.filter((gc) => gc.category_id === categoryId).map((gc) => gc.gamme_id)
    );
    return gammes.filter((g) => allowedGammeIds.has(g.id));
  }, [gammes, gammeCategories, categoryIdMap, selectedCategory]);

  const getCalcRating = (b: Business): number | null => {
    if (b.rating) return Number(b.rating);
    const sources: { r: number; c: number }[] = [];
    if (b.google_rating && b.google_review_count) sources.push({ r: b.google_rating * 4, c: b.google_review_count });
    if (b.tripadvisor_rating && b.tripadvisor_review_count) sources.push({ r: b.tripadvisor_rating * 4, c: b.tripadvisor_review_count });
    if (b.restaurant_guru_rating && b.restaurant_guru_review_count) sources.push({ r: b.restaurant_guru_rating * 4, c: b.restaurant_guru_review_count });
    if (sources.length === 0) return null;
    const total = sources.reduce((s, x) => s + x.c, 0);
    return Math.round((sources.reduce((s, x) => s + x.r * x.c, 0) / total) * 10) / 10;
  };

  // Filter businesses by all criteria
  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    
    if (selectedCategory) {
      result = result.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedGamme) {
      result = result.filter((b) => b.gamme_id === selectedGamme);
    }
    if (selectedActivities.length > 0) {
      result = result.filter((business) =>
        selectedActivities.some((activity) => business.services?.includes(activity))
      );
    }
    
    if (sortByRating !== "none") {
      result = [...result].sort((a, b) => {
        const ratingA = getCalcRating(a);
        const ratingB = getCalcRating(b);
        if (ratingA === null && ratingB === null) return 0;
        if (ratingA === null) return 1;
        if (ratingB === null) return 1;
        return sortByRating === "desc" ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedGamme, selectedActivities, sortByRating]);

  // Pagination
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, selectedGamme, selectedActivities, sortByRating]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    setSelectedGamme("");
    setSelectedActivities([]);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedGamme("");
    setSelectedActivities([]);
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCity) return;

      // Fetch gammes
      const { data: gammesData } = await supabase
        .from("gammes")
        .select("id, name_fr, color_hex, text_color_hex")
        .order("sort_order", { ascending: true });

      if (gammesData) {
        setGammes(gammesData);
      }

      // Fetch gamme_categories mapping
      const { data: gcData } = await supabase
        .from("gamme_categories")
        .select("gamme_id, category_id");
      if (gcData) {
        setGammeCategories(gcData);
      }

      // Fetch categories for name→id mapping and sort order
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name_fr, sort_order");
      if (catData) {
        const map: Record<string, string> = {};
        const sortMap: Record<string, number> = {};
        catData.forEach((c) => {
          map[c.name_fr] = c.id;
          sortMap[c.name_fr] = c.sort_order ?? 9999;
        });
        setCategoryIdMap(map);
        setCategorySortMap(sortMap);
      }

      // Fetch businesses - ordered by verified status then priority score
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, city, region, address, phone, whatsapp, skype, main_category, categories, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, google_rating, tripadvisor_rating, restaurant_guru_rating, google_review_count, tripadvisor_review_count, restaurant_guru_review_count, priority_score, opening_hours, show_opening_hours, is_open_24h, logo_url, gamme_id, neighborhood, hook_fr")
        .eq("is_active", true)
        .ilike("city", decodedCity)
        .order("wtuce_status", { ascending: true, nullsFirst: false })
        .order("priority_score", { ascending: false });

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

  // Build Google Maps embed URL - dynamic based on selected business
  const getMapEmbedUrl = () => {
    // If a business is selected, show its location
    if (selectedBusiness) {
      // Try to extract place ID or coordinates from google_maps_url
      if (selectedBusiness.google_maps_url) {
        // If URL contains place/, use place mode
        const placeMatch = selectedBusiness.google_maps_url.match(/place\/([^\/]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(placeName)}&zoom=17`;
        }
        // If URL contains coordinates (@lat,lng)
        const coordMatch = selectedBusiness.google_maps_url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${coordMatch[1]},${coordMatch[2]}&zoom=17&maptype=roadmap`;
        }
      }
      // Fallback to lat/lng if available
      if (selectedBusiness.latitude && selectedBusiness.longitude) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedBusiness.latitude},${selectedBusiness.longitude}&zoom=17`;
      }
      // Last fallback: search by name and address
      const query = selectedBusiness.address 
        ? `${selectedBusiness.name}, ${selectedBusiness.address}`
        : `${selectedBusiness.name}, ${selectedBusiness.city}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }

    // Default: show city overview
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

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    
    // Scroll to map
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
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
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: '#c1272d' }}>
      {/* Diagonal green overlay starting below header */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to bottom left, transparent 50%, #006233 50%)',
        top: '72px',
      }} />
      {/* Background decorative emblem */}
      <div 
        className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-40 pointer-events-none hidden lg:block"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <Header variant="morocco" />

      <main className="container mx-auto px-4 py-24 relative z-10">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-white hover:text-gold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapPin className="h-8 w-8 text-gold" />
            Établissements à {decodedCity}
          </h1>
          <p className="text-white/80 mt-2">
            {businesses.length} établissement{businesses.length > 1 ? "s" : ""} dans l'annuaire WTUCE
          </p>
        </div>

        {/* Top City Businesses */}
        <TopCityBusinesses 
          businesses={businesses} 
          cityName={decodedCity} 
          gammes={gammes}
          onSelectBusiness={handleSelectBusiness}
          selectedBusinessId={selectedBusiness?.id}
        />

        {/* Map + Business list - Full width */}
        <div className="space-y-6">
          {selectedBusiness ? (
            <div className="overflow-hidden rounded-lg shadow-xl shadow-gold/20 ring-2 ring-gold/30 animate-map-unfold">
            <Card className="relative border-0">
              <CardContent className="p-0">
                {/* Selected business indicator */}
                <MapBusinessInfoCard
                  business={selectedBusiness}
                  onClose={clearSelectedBusiness}
                />
                <div className="overflow-hidden rounded-lg">
                  <iframe
                    src={getMapEmbedUrl()}
                    className="w-full h-[500px] border-0 ring-[5px] ring-gold"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Localisation de ${selectedBusiness.name}`}
                  />
                </div>
              </CardContent>
            </Card>
            </div>
          ) : null}

          {/* Filters + Business list */}
          <div className="space-y-4">
            {/* Category & Subcategory Filters */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Main Category Filter */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-base font-semibold text-white mb-1.5 block">Catégorie</label>
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
                    <label className="text-base font-semibold text-white mb-1.5 block">Sous-catégorie</label>
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

                {/* Standing (Gamme) Filter - Only show when category is selected */}
                {selectedCategory && (
                <div className="flex-1 min-w-[140px]">
                  <label className="text-base font-semibold text-white mb-1.5 block">Standing</label>
                  <Select value={selectedGamme || "all"} onValueChange={(v) => setSelectedGamme(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les standings</SelectItem>
                      {filteredGammes.map((gamme) => (
                        <SelectItem key={gamme.id} value={gamme.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-black/20 inline-block" style={{ backgroundColor: gamme.color_hex || '#000' }} />
                            {gamme.name_fr}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}
              </div>

              {/* Clear All Button */}
              {(selectedCategory || selectedSubcategory || selectedGamme || selectedActivities.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}

              {/* Activity Filters - Only show when category is selected */}
              {selectedCategory && availableActivities.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">Activités</h3>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Établissements ({filteredBusinesses.length})
              </h2>
              <button
                onClick={() => setSortByRating(prev => prev === "none" ? "desc" : prev === "desc" ? "asc" : "none")}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                  sortByRating !== "none" 
                    ? "bg-gold/20 text-gold border border-gold/40" 
                    : "bg-white/10 text-white/70 hover:text-white border border-white/20"
                }`}
              >
                {sortByRating === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : sortByRating === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
                {sortByRating === "desc" ? "Meilleures notes" : sortByRating === "asc" ? "Notes croissantes" : "Trier par note"}
              </button>
            </div>
            {filteredBusinesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {selectedActivities.length > 0
                  ? "Aucun établissement pour ces activités"
                  : `Aucun établissement trouvé à ${decodedCity}`}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedBusinesses.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                      gammes={gammes}
                      verifiedLabel="Vérifié"
                      selectedBusinessId={selectedBusiness?.id}
                      onSelectBusiness={handleSelectBusiness}
                      showMapButton={true}
                      mapButtonVariant="text"
                      mapButtonLabels={{
                        view: "Voir sur la carte",
                        shown: "Affiché sur la carte"
                      }}
                      showAddress={false}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-400">
                      Affichage de {startResult} à {endResult} sur {filteredBusinesses.length} résultats
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="gap-1"
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500">
                      Page {currentPage} sur {totalPages}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* City Info Section - Full width below directory */}
        <div className="mt-12 space-y-8">
          {/* City Description - Full width */}
          {cityInfo?.description && (
            <Card className="border-gold border-[5px]">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">À propos de {decodedCity}</h3>
                <div 
                  className="prose prose-sm max-w-none text-foreground max-h-[300px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: cityInfo.description }}
                />
              </CardContent>
            </Card>
          )}

          {/* Weather, Official Sites, Wikipedia - 3 columns */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Weather */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Météo</h3>
              <CityWeather city={decodedCity} />
            </div>

            {/* Official Sites */}
            {cityInfo && [1, 2, 3, 4, 5, 6].some((num) => {
              const name = cityInfo[`official_site_${num}_name` as keyof CityInfo];
              const url = cityInfo[`official_site_${num}_url` as keyof CityInfo];
              return name && url;
            }) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sites officiels</h3>
                <Card className="bg-morocco-red/90 border-gold border-[5px]">
                  <CardContent className="p-4 space-y-2">
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
                          className="flex items-center gap-2 text-sm text-white hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {name}
                        </a>
                      );
                    })}
                  </CardContent>
                </Card>
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
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">En savoir plus</h3>
                  <Card className="bg-morocco-red border-gold border-[5px]">
                    <CardContent className="p-4">
                      <a
                        href={wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-white hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {label}
                      </a>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {/* Bottom decorative emblem */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-10 pointer-events-none hidden lg:block"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="relative z-10">
        <DynamicLabelSections pageType="city" />
        <Footer variant="morocco" />
      </div>
    </div>
  );
};

export default CityMap;
