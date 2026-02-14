import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MapPin, Building2, ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import DynamicIcon from "@/components/DynamicIcon";
import AnimatedBusinessStrip from "@/components/AnimatedBusinessStrip";

import BusinessCard, { Gamme } from "@/components/BusinessCard";
import DynamicLabelSections from "@/components/DynamicLabelSections";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  services: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  rating: number | null;
  gamme_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
}

// Gamme interface is imported from BusinessCard

interface CategoryInfo {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  front_color: string;
}

// No static icon map - icons are fetched from DB via categoryInfo.icon

const ITEMS_PER_PAGE = 20;

const CategoryPage = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);

  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : "";

  // Get cities available in this category, sorted by priority score
  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    // Filter cities that have businesses, then sort by priority
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

  // Get available subcategories based on selected city
  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    const businessesToCheck = selectedCity === "all" 
      ? allBusinesses 
      : allBusinesses.filter(b => b.city === selectedCity);
    
    businessesToCheck.forEach((business) => {
      business.categories?.forEach((cat) => subcategories.add(cat));
    });
    return Array.from(subcategories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [allBusinesses, selectedCity]);

  // Get available services based on selected city and subcategories
  const availableServices = useMemo(() => {
    const services = new Set<string>();
    let businessesToCheck = selectedCity === "all" 
      ? allBusinesses 
      : allBusinesses.filter(b => b.city === selectedCity);
    
    // Further filter by subcategories if any selected
    if (selectedSubcategories.length > 0) {
      businessesToCheck = businessesToCheck.filter((business) =>
        selectedSubcategories.some((subcat) => business.categories?.includes(subcat))
      );
    }
    
    businessesToCheck.forEach((business) => {
      business.services?.forEach((service) => services.add(service));
    });
    return Array.from(services).sort((a, b) => a.localeCompare(b, "fr"));
  }, [allBusinesses, selectedCity, selectedSubcategories]);

  // Filter businesses by city, subcategories and services
  const filteredBusinesses = useMemo(() => {
    let result = allBusinesses;
    
    if (selectedCity !== "all") {
      result = result.filter(b => b.city === selectedCity);
    }
    
    if (selectedSubcategories.length > 0) {
      result = result.filter((business) =>
        selectedSubcategories.some((subcat) => business.categories?.includes(subcat))
      );
    }
    
    if (selectedServices.length > 0) {
      result = result.filter((business) =>
        selectedServices.some((service) => business.services?.includes(service))
      );
    }
    
    return result;
  }, [allBusinesses, selectedCity, selectedSubcategories, selectedServices]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedSubcategories, selectedServices]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCategoryName) return;
      
      setIsLoading(true);
      try {
        // Fetch category info
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name_fr, name_en, name_ar, icon, front_color")
          .eq("name_fr", decodedCategoryName)
          .maybeSingle();

        if (catData) {
          setCategoryInfo(catData);
        }

        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0 }))
          );
        }

        // Fetch gammes
        const { data: gammesData } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex")
          .order("sort_order", { ascending: true });

        if (gammesData) {
          setGammes(gammesData);
        }

        // Fetch ALL businesses in this category (no limit)
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, gamme_id, neighborhood, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, hook_fr")
          .eq("is_active", true)
          .or(`main_category.eq.${decodedCategoryName},categories.cs.{${decodedCategoryName}}`)
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false });

        if (error) throw error;
        
        setAllBusinesses(businessData || []);
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedCategoryName]);

  const getCategoryName = () => {
    if (!categoryInfo) return decodedCategoryName;
    if (language === "ar" && categoryInfo.name_ar) return categoryInfo.name_ar;
    if (language === "en" && categoryInfo.name_en) return categoryInfo.name_en;
    return categoryInfo.name_fr;
  };

  // getBusinessImage is now handled by BusinessCard component

  const translations = {
    fr: {
      establishments: "établissements",
      inCategory: "dans cette catégorie",
      noResults: "Aucun établissement trouvé dans cette catégorie",
      verified: "Vérifié",
      regulated: "Réglementé",
      allCities: "Toutes les villes",
      filterByCity: "Filtrer par ville",
      page: "Page",
      of: "sur",
      previous: "Précédent",
      next: "Suivant",
      showing: "Affichage de",
      to: "à",
      results: "résultats"
    },
    en: {
      establishments: "establishments",
      inCategory: "in this category",
      noResults: "No establishments found in this category",
      verified: "Verified",
      regulated: "Regulated",
      allCities: "All cities",
      filterByCity: "Filter by city",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      to: "to",
      results: "results"
    },
    ar: {
      establishments: "مؤسسة",
      inCategory: "في هذه الفئة",
      noResults: "لم يتم العثور على مؤسسات في هذه الفئة",
      verified: "موثق",
      regulated: "منظم",
      allCities: "جميع المدن",
      filterByCity: "تصفية حسب المدينة",
      page: "صفحة",
      of: "من",
      previous: "السابق",
      next: "التالي",
      showing: "عرض",
      to: "إلى",
      results: "نتائج"
    }
  };

  const t = translations[language] || translations.fr;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedBusiness(null);
    setSelectedSubcategories([]);
    setSelectedServices([]);
  };

  const handleSubcategoryChange = (subcategory: string) => {
    if (subcategory === "all") {
      setSelectedSubcategories([]);
    } else {
      setSelectedSubcategories([subcategory]);
    }
    setSelectedServices([]);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setSelectedServices([]);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

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
        : `${selectedBusiness.name}, ${selectedBusiness.city}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }
    // Center on Morocco (lat: 31.7917, lng: -7.0926) when no city selected
    const centerParam = selectedCity !== "all" ? "" : "&center=31.7917,-7.0926";
    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(decodedCategoryName)}+${selectedCity !== "all" ? encodeURIComponent(selectedCity) : "Maroc"}${centerParam}&zoom=${selectedCity !== "all" ? 13 : 6}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);
  const isWhiteBg = categoryInfo?.front_color === "white";
  const bgClass = isWhiteBg ? "bg-white" : "bg-black";
  const textClass = isWhiteBg ? "text-black" : "text-white";
  const textMutedClass = isWhiteBg ? "text-black/60" : "text-white/80";

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <Header />
      
      {/* Hero Section */}
      <section className={`${bgClass} pt-28 pb-8 lg:pb-16 relative overflow-hidden`}>
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-2 ${textMutedClass} hover:text-gold mb-4 transition-colors text-sm`}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <h1 className={`text-3xl font-bold ${textClass} flex items-center gap-3`}>
              {categoryInfo?.icon ? (
                <DynamicIcon name={categoryInfo.icon} className="h-8 w-8 text-gold" fallback={<Building2 className="h-8 w-8 text-gold" />} />
              ) : (
                <Building2 className="h-8 w-8 text-gold" />
              )}
              {getCategoryName()}
            </h1>
            <p className={`${textMutedClass} mt-2`}>
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.inCategory}
            </p>
          </div>
        </div>
      </section>

      {/* Animated Business Strip */}
      <AnimatedBusinessStrip
        title={language === "fr" ? "{count} adresses à découvrir" : language === "ar" ? "{count} عنوانًا للاكتشاف" : "{count} addresses to discover"}
        category={decodedCategoryName}
        showMapLink
        onSelectBusiness={(biz) => handleSelectBusiness(biz as any)}
        lightMode={isWhiteBg}
      />

      {/* Map & Filters & Results */}
      <section className={`py-6 lg:py-12 ${bgClass}`}>
        <div className="container mx-auto px-4">
          {/* Google Maps */}
          <Card className="mb-8 relative">
            <CardContent className="p-0">
              {/* Selected business indicator */}
              {selectedBusiness && (
                <MapBusinessInfoCard
                  business={selectedBusiness}
                  onClose={clearSelectedBusiness}
                />
              )}
              <iframe
                src={getMapEmbedUrl()}
                className="w-full h-[400px] border-0 rounded-lg"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${getCategoryName()}${selectedCity !== "all" ? ` à ${selectedCity}` : ""}`}
              />
            </CardContent>
          </Card>

          {/* City & Subcategory Filters */}
          <div className="space-y-3 mb-8">
            <div className="flex flex-wrap gap-3">
              {/* City Filter */}
              {availableCities.length > 1 && (
                <div className="flex-1 min-w-[140px]">
                   <label className={`text-sm font-medium ${textClass} mb-1.5 block`}>
                    {t.filterByCity}
                  </label>
                  <Select value={selectedCity} onValueChange={handleCityChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.allCities} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allCities}</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subcategory Filter */}
              {availableSubcategories.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <label className={`text-sm font-medium ${textClass} mb-1.5 block`}>
                    {language === "fr" ? "Sous-catégorie" : language === "ar" ? "الفئة الفرعية" : "Subcategory"}
                  </label>
                  <Select value={selectedSubcategories[0] || "all"} onValueChange={handleSubcategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={language === "fr" ? "Toutes" : language === "ar" ? "الكل" : "All"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "fr" ? "Toutes les sous-catégories" : language === "ar" ? "كل الفئات الفرعية" : "All subcategories"}</SelectItem>
                      {availableSubcategories.map((subcat) => (
                        <SelectItem key={subcat} value={subcat}>
                          {subcat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(selectedSubcategories.length > 0 || selectedServices.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                {language === "fr" ? "Effacer les filtres" : language === "ar" ? "مسح الفلاتر" : "Clear filters"}
              </button>
            )}
          </div>

          {/* Services Filter - Only shown when a subcategory is selected */}
          {selectedSubcategories.length > 0 && availableServices.length > 0 && (
            <div className="mb-8">
              <div className="mb-3">
                <label className="text-sm text-gray-400">
                  {language === "fr" ? "Services" : language === "ar" ? "الخدمات" : "Services"}:
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => (
                  <label
                    key={service}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${
                      selectedServices.includes(service)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedServices.includes(service)}
                      onCheckedChange={() => toggleService(service)}
                      className="h-3 w-3"
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>
          )}

          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">{t.noResults}</p>
            </div>
          ) : (
            <>
              {/* Results count + Grid */}
              <h2 className={`text-lg font-semibold ${textClass} mb-3`}>
                {t.establishments} ({filteredBusinesses.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    gammes={gammes}
                    verifiedLabel={t.verified}
                    selectedBusinessId={selectedBusiness?.id}
                    onSelectBusiness={handleSelectBusiness}
                    showMapButton={true}
                    mapButtonLabels={{
                      view: "Voir sur la carte",
                      shown: "Affiché sur la carte"
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  {/* Results count */}
                  <p className="text-sm text-gray-400">
                    {t.showing} {startResult} {t.to} {endResult} {t.of} {filteredBusinesses.length} {t.results}
                  </p>
                  
                  {/* Pagination controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t.previous}
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
                      {t.next}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Page indicator */}
                  <p className="text-xs text-gray-500">
                    {t.page} {currentPage} {t.of} {totalPages}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <DynamicLabelSections pageType="category" />

      <Footer />
    </div>
  );
};

export default CategoryPage;
