import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";

import { supabase } from "@/integrations/supabase/client";
import { sortWtuceAndRating } from "@/lib/businessRanking";
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
import { Loader2, MapPin, Building2, ChevronLeft, ChevronRight, X, ArrowLeft, SlidersHorizontal } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import DynamicIcon from "@/components/DynamicIcon";
import AnimatedBusinessStrip from "@/components/AnimatedBusinessStrip";
import heroBackground from "@/assets/hero-marrakech.jpg";

import BusinessCard, { Gamme, Badge } from "@/components/BusinessCard";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import ShareButton from "@/components/ShareButton";

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
  computed_rating?: number | null;
  total_review_count?: number | null;
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
  const [sortMode, setSortMode] = useState<"rating" | "reviews">("rating");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedGamme, setSelectedGamme] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string; sort_order: number | null }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);

  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : "";

  useSEO({
    title: decodedCategoryName ? `${decodedCategoryName} au Maroc` : "Catégorie",
    description: decodedCategoryName ? `Trouvez les meilleurs établissements de la catégorie ${decodedCategoryName} au Maroc. Adresses sélectionnées par ONE WORLD MOROCCO.` : undefined,
    canonical: categoryName ? `/category/${categoryName}` : undefined,
  });

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
    const subcatNames = new Set<string>();
    const businessesToCheck = selectedCity === "all" 
      ? allBusinesses 
      : allBusinesses.filter(b => b.city === selectedCity);
    
    businessesToCheck.forEach((business) => {
      business.categories?.forEach((cat) => subcatNames.add(cat));
    });
    
    // Sort by sort_order from the subcategories table (0 or null treated as lowest priority)
    return Array.from(subcatNames).sort((a, b) => {
      const subcatA = subcategories.find(s => s.name_fr === a);
      const subcatB = subcategories.find(s => s.name_fr === b);
      const orderA = (subcatA?.sort_order && subcatA.sort_order !== 0) ? subcatA.sort_order : 9999;
      const orderB = (subcatB?.sort_order && subcatB.sort_order !== 0) ? subcatB.sort_order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b, "fr");
    });
  }, [allBusinesses, selectedCity, subcategories]);

  // Get available services based on selected city, subcategories and gamme
  const availableServices = useMemo(() => {
    const services = new Set<string>();
    let businessesToCheck = selectedCity === "all" 
      ? allBusinesses 
      : allBusinesses.filter(b => b.city === selectedCity);
    
    if (selectedSubcategories.length > 0) {
      businessesToCheck = businessesToCheck.filter((business) =>
        selectedSubcategories.some((subcat) => business.categories?.includes(subcat))
      );
    }

    if (selectedGamme !== "all") {
      businessesToCheck = businessesToCheck.filter(b => b.gamme_id === selectedGamme);
    }
    
    businessesToCheck.forEach((business) => {
      business.services?.forEach((service) => services.add(service));
    });
    return Array.from(services).sort((a, b) => a.localeCompare(b, "fr"));
  }, [allBusinesses, selectedCity, selectedSubcategories, selectedGamme]);

  // Get available gammes based on selected city and subcategories
  const availableGammes = useMemo(() => {
    let businessesToCheck = selectedCity === "all"
      ? allBusinesses
      : allBusinesses.filter(b => b.city === selectedCity);

    if (selectedSubcategories.length > 0) {
      businessesToCheck = businessesToCheck.filter((business) =>
        selectedSubcategories.some((subcat) => business.categories?.includes(subcat))
      );
    }

    const gammeIds = new Set(businessesToCheck.map(b => b.gamme_id).filter(Boolean));
    return gammes.filter(g => gammeIds.has(g.id));
  }, [allBusinesses, selectedCity, selectedSubcategories, gammes]);

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    return b.computed_rating ?? (b.rating ? Number(b.rating) : null);
  };

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

    if (selectedGamme !== "all") {
      result = result.filter(b => b.gamme_id === selectedGamme);
    }
    
    // Sort based on sortMode
    const dir = sortAsc ? -1 : 1;
    if (sortMode === "reviews") {
      result = [...result].sort((a, b) => {
        const countA = a.total_review_count || 0;
        const countB = b.total_review_count || 0;
        return (countB - countA) * dir;
      });
    } else {
      // Default: WTUCE > priority_score > rating (ignore <10 reviews) — same as SearchPage
      result = [...result].sort(sortWtuceAndRating);
      if (sortAsc) result.reverse();
    }
    
    return result;
  }, [allBusinesses, selectedCity, selectedSubcategories, selectedServices, selectedGamme, sortMode, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedSubcategories, selectedServices, selectedGamme]);

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
          .select("id, name_fr, color_hex, text_color_hex, sort_order")
          .order("sort_order", { ascending: true });

        if (gammesData) {
          setGammes(gammesData);
        }

        // Fetch badges, subcategories, badge_subcategories
        const [badgesRes, subcatsRes, badgeSubcatsRes] = await Promise.all([
          supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
          supabase.from("subcategories").select("id, name_fr, sort_order"),
          supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
        ]);

        if (badgesRes.data) setBadges(badgesRes.data);
        if (subcatsRes.data) setSubcategories(subcatsRes.data);
        if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);

        // Fetch ALL businesses in this category (no limit)
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, slug, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, default_service, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, computed_rating, total_review_count, gamme_id, badge_id, neighborhood, hook_fr, priority_score")
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

  const scrollToFilterToggle = () => {
    if (window.innerWidth < 640) {
      setTimeout(() => {
        document.getElementById("category-filter-toggle")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedSubcategories([]);
    setSelectedServices([]);
    setSelectedGamme("all");
    scrollToFilterToggle();
  };

  const handleSubcategoryChange = (subcategory: string) => {
    if (subcategory === "all") {
      setSelectedSubcategories([]);
    } else {
      setSelectedSubcategories([subcategory]);
    }
    setSelectedServices([]);
    setSelectedGamme("all");
    scrollToFilterToggle();
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
    scrollToFilterToggle();
  };

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setSelectedServices([]);
    setSelectedGamme("all");
    scrollToFilterToggle();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    const anchor = document.getElementById("category-filters");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setTimeout(() => {
      document.getElementById("category-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  const getMapEmbedUrl = () => {
    if (selectedBusiness) {
      // Using business name as query makes Google find the GMB listing and show the labeled red marker.
      // Coordinates-only query (q=lat,lng) returns an unlabeled generic pin without the business name.
      const query = selectedBusiness.name + (selectedBusiness.address ? `, ${selectedBusiness.address}` : "");
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
    <div className="min-h-screen relative">
      {/* Full-page background */}
      <div className="fixed inset-0 -z-10">
        <img src={heroBackground} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-8 lg:pb-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {categoryInfo?.icon ? (
                <DynamicIcon name={categoryInfo.icon} className="h-8 w-8 text-gold" fallback={<Building2 className="h-8 w-8 text-gold" />} />
              ) : (
                <Building2 className="h-8 w-8 text-gold" />
              )}
              {getCategoryName()}
              <ShareButton title={getCategoryName()} />
            </h1>
            <p className="text-white/80 mt-2">
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.inCategory}
            </p>
          </div>
        </div>
      </section>


      {/* Map & Filters & Results */}
      <section className="py-6 lg:py-12">
        <div className="container mx-auto px-4">

          <div id="category-map" className="scroll-mt-24" />
          <div className="mb-6 overflow-hidden rounded-lg">
            <Card className="relative border-0 h-[400px] sm:h-[500px] overflow-hidden">
              <CardContent className="p-0 relative h-full">
                {selectedBusiness && (
                  <MapBusinessInfoCard
                    business={selectedBusiness}
                    onClose={clearSelectedBusiness}
                  />
                )}
                <iframe
                  src={getMapEmbedUrl()}
                  className={`w-full border-0 ${selectedBusiness ? 'ring-[5px] ring-gold h-[520px] sm:h-[500px]' : 'h-full'}`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${getCategoryName()}`}
                />
              </CardContent>
            </Card>
          </div>

          <div id="category-filter-toggle" className="sm:hidden mb-4 scroll-mt-24">
            <button
              onClick={() => { const wasOpen = showFilters; setShowFilters(!showFilters); if (wasOpen) scrollToFilterToggle(); }}
              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg ${isWhiteBg ? 'bg-black/5 border border-black/10 text-black' : 'bg-white/10 border border-white/20 text-white'} text-sm font-medium transition-colors ${isWhiteBg ? 'hover:bg-black/10' : 'hover:bg-white/20'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {language === "fr" ? "Filtrer les résultats" : language === "ar" ? "تصفية النتائج" : "Filter results"}
              {(selectedSubcategories.length > 0 || selectedServices.length > 0 || selectedGamme !== "all") && (
                <span className="ml-auto bg-gold text-black text-xs font-bold rounded-full px-2 py-0.5">
                  {[...selectedSubcategories, ...selectedServices, ...(selectedGamme !== "all" ? [selectedGamme] : [])].length}
                </span>
              )}
            </button>
          </div>

          {/* Signet above filters */}
          <div id="category-filters-signet" className="scroll-mt-24" />

          {/* City & Subcategory Filters */}
          <div id="category-filters" className={`space-y-3 mb-8 scroll-mt-24 ${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* City Filter */}
              {availableCities.length > 1 && (
                <div className="flex-1 min-w-[140px]">
                   <label className={`text-sm font-bold ${textClass} mb-1.5 block`}>
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
                  <label className={`text-sm font-bold ${textClass} mb-1.5 block`}>
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

              {/* Standing Filter - only when subcategory is selected */}
              {selectedSubcategories.length > 0 && availableGammes.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <label className={`text-sm font-bold ${textClass} mb-1.5 block`}>
                    {language === "fr" ? "Standing" : language === "ar" ? "مستوى" : "Standing"}
                  </label>
                  <Select value={selectedGamme} onValueChange={(v) => { setSelectedGamme(v); scrollToFilterToggle(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={language === "fr" ? "Tous" : language === "ar" ? "الكل" : "All"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "fr" ? "Tous les standings" : language === "ar" ? "جميع المستويات" : "All standings"}</SelectItem>
                      {availableGammes.map((gamme) => (
                        <SelectItem key={gamme.id} value={gamme.id}>
                          {gamme.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

          </div>

          {/* Services Filter - Only shown when a subcategory is selected */}
          {selectedSubcategories.length > 0 && availableServices.length > 0 && (
            <div className="mb-8">
              <div className="mb-3">
                <label className="text-sm font-bold text-white">
                  {language === "fr" ? "Sélectionnez un service" : language === "ar" ? "اختر خدمة" : "Select a service"}
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

          {/* Clear Filters - after services */}
          {(selectedSubcategories.length > 0 || selectedServices.length > 0 || selectedGamme !== "all") && (
            <div className="mb-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              <button
                onClick={clearFilters}
                className="text-sm text-gold underline hover:text-gold/80 transition-colors"
              >
                {language === "fr" ? "Effacer les filtres" : language === "ar" ? "مسح الفلاتر" : "Clear filters"}
              </button>
            </div>
          )}

          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">{t.noResults}</p>
            </div>
          ) : (
            <>
              {/* Signet above results */}
              <div id="category-results-signet" className="scroll-mt-24" />

              {/* Results count + Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className={`text-lg font-bold ${textClass}`}>
                  {filteredBusinesses.length} {t.establishments} {language === "fr" ? "pour" : language === "ar" ? "لـ" : "for"} {getCategoryName()}
                </h2>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Button
                    variant={sortMode === "rating" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { if (sortMode === "rating") setSortAsc(!sortAsc); else { setSortMode("rating"); setSortAsc(false); } }}
                    className="text-xs"
                  >
                    <span className="mr-1">↑↓</span>
                    {language === "fr" ? "Trier par note" : language === "ar" ? "ترتيب حسب التقييم" : "Sort by rating"}
                  </Button>
                  <Button
                    variant={sortMode === "reviews" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { if (sortMode === "reviews") setSortAsc(!sortAsc); else { setSortMode("reviews"); setSortAsc(false); } }}
                    className="text-xs"
                  >
                    <span className="mr-1">↑↓</span>
                    {language === "fr" ? "Trier par avis" : language === "ar" ? "ترتيب حسب التعليقات" : "Sort by reviews"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    gammes={gammes}
                    badges={badges}
                    subcategories={subcategories}
                    badgeSubcategories={badgeSubcategories}
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

      <DynamicLabelSections pageType="category" lightMode={true} categoryId={categoryInfo?.id} />

      <Footer variant="morocco" />
    </div>
  );
};

export default CategoryPage;
