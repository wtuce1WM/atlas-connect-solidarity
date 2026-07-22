import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
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
import { Loader2, Building2, ChevronLeft, ChevronRight, X, ArrowLeft, SlidersHorizontal } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import DynamicIcon from "@/components/DynamicIcon";
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
  badge_id?: string | null;
  neighborhood?: string | null;
  default_service?: string | null;
  hook_fr?: string | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
}

interface SubcategoryInfo {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  category_id: string;
}

interface CategoryInfo {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  front_color: string;
}

const ITEMS_PER_PAGE = 20;

const SubcategoryPage = () => {
  const { subcategoryName } = useParams<{ subcategoryName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [subcategoryInfo, setSubcategoryInfo] = useState<SubcategoryInfo | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number; lat: number | null; lng: number | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>(() => searchParams.get("city") || "all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<"rating" | "reviews">("rating");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedGamme, setSelectedGamme] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);
  const [subcategoryServices, setSubcategoryServices] = useState<string[] | null>(null);

  const decodedSubcategoryName = subcategoryName ? decodeURIComponent(subcategoryName) : "";
  const cityFromUrl = searchParams.get("city");

  useSEO({
    title: decodedSubcategoryName ? `${decodedSubcategoryName}${cityFromUrl ? ` à ${cityFromUrl}` : ""} au Maroc` : "Sous-catégorie",
    description: decodedSubcategoryName ? `Les meilleurs ${decodedSubcategoryName.toLowerCase()}${cityFromUrl ? ` à ${cityFromUrl}` : " au Maroc"}. Adresses sélectionnées par ONE WORLD MOROCCO.` : undefined,
    canonical: subcategoryName ? `/subcategory/${subcategoryName}${cityFromUrl ? `?city=${encodeURIComponent(cityFromUrl)}` : ""}` : undefined,
  });

  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

  // Available services: only services from this subcategory that at least one active business offers
  const availableServices = useMemo(() => {
    if (subcategoryServices === null || subcategoryServices.length === 0) return [];
    const subcategoryServicesSet = new Set(subcategoryServices);
    const servicesWithBusinesses = new Set<string>();
    const businessesToCheck = selectedCity === "all"
      ? allBusinesses
      : allBusinesses.filter(b => b.city === selectedCity);
    businessesToCheck.forEach((business) => {
      business.services?.forEach((service) => {
        if (subcategoryServicesSet.has(service)) {
          servicesWithBusinesses.add(service);
        }
      });
    });
    return Array.from(servicesWithBusinesses).sort((a, b) => a.localeCompare(b, "fr"));
  }, [subcategoryServices, allBusinesses, selectedCity]);

  // Available gammes based on selected city
  const availableGammes = useMemo(() => {
    let businessesToCheck = selectedCity === "all"
      ? allBusinesses
      : allBusinesses.filter(b => b.city === selectedCity);

    const gammeIds = new Set(businessesToCheck.map(b => b.gamme_id).filter(Boolean));
    return gammes.filter(g => gammeIds.has(g.id));
  }, [allBusinesses, selectedCity, gammes]);

  const getEffectiveRating = (b: Business): number | null => {
    return (b as any).computed_rating ?? (b.rating ? Number(b.rating) : null);
  };

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let result = allBusinesses;

    if (selectedCity !== "all") {
      result = result.filter(b => b.city === selectedCity);
    }

    if (selectedServices.length > 0) {
      result = result.filter((business) =>
        selectedServices.some((service) => business.services?.includes(service))
      );
    }

    if (selectedGamme !== "all") {
      result = result.filter(b => b.gamme_id === selectedGamme);
    }

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
  }, [allBusinesses, selectedCity, selectedServices, selectedGamme, sortMode, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedServices, selectedGamme]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedSubcategoryName) return;

      setIsLoading(true);
      try {
        // Fetch ALL subcategories with this name (duplicates may exist)
        const { data: subcatDataArr } = await supabase
          .from("subcategories")
          .select("id, name_fr, name_en, name_ar, icon, category_id")
          .eq("name_fr", decodedSubcategoryName);

        const subcatData = subcatDataArr?.[0] ?? null;

        if (subcatData && subcatDataArr) {
          setSubcategoryInfo(subcatData);
          const subcatIds = subcatDataArr.map(s => s.id);

          // Fetch parent category info + services for ALL matching subcategory IDs
          const [catRes, servicesRes] = await Promise.all([
            supabase
              .from("categories")
              .select("id, name_fr, name_en, name_ar, icon, front_color")
              .eq("id", subcatData.category_id)
              .maybeSingle(),
            supabase
              .from("services")
              .select("name_fr")
              .in("subcategory_id", subcatIds),
          ]);

          if (catRes.data) setCategoryInfo(catRes.data);
          // Always set (even empty array) so null→array signals "loaded"
          setSubcategoryServices(servicesRes.data ? servicesRes.data.map(s => s.name_fr) : []);
        }

        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score, latitude, longitude")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0, lat: c.latitude, lng: c.longitude }))
          );
        }

        // Fetch gammes
        const { data: gammesData } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex, sort_order")
          .order("sort_order", { ascending: true });

        if (gammesData) setGammes(gammesData);

        // Fetch badges, subcategories list, badge_subcategories
        const [badgesRes, subcatsRes, badgeSubcatsRes] = await Promise.all([
          supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
          supabase.from("subcategories").select("id, name_fr"),
          supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
        ]);

        if (badgesRes.data) setBadges(badgesRes.data);
        if (subcatsRes.data) setSubcategories(subcatsRes.data);
        if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);

        // Fetch businesses that have this subcategory in their categories array
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, slug, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, default_service, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, computed_rating, total_review_count, gamme_id, badge_id, neighborhood, hook_fr, priority_score")
          .eq("is_active", true)
          .contains("categories", [decodedSubcategoryName])
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false });

        if (error) throw error;

        setAllBusinesses(businessData || []);
      } catch (error) {
        console.error("Error fetching subcategory data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedSubcategoryName]);

  const getSubcategoryName = () => {
    if (!subcategoryInfo) return decodedSubcategoryName;
    if (language === "ar" && subcategoryInfo.name_ar) return subcategoryInfo.name_ar;
    if (language === "en" && subcategoryInfo.name_en) return subcategoryInfo.name_en;
    return subcategoryInfo.name_fr;
  };

  const getCategoryName = () => {
    if (!categoryInfo) return "";
    if (language === "ar" && categoryInfo.name_ar) return categoryInfo.name_ar;
    if (language === "en" && categoryInfo.name_en) return categoryInfo.name_en;
    return categoryInfo.name_fr;
  };

  const translations = {
    fr: {
      establishments: "établissements",
      inSubcategory: "dans cette sous-catégorie",
      noResults: "Aucun établissement trouvé dans cette sous-catégorie",
      verified: "Vérifié",
      allCities: "Toutes les villes",
      filterByCity: "Filtrer par ville",
      page: "Page",
      of: "sur",
      previous: "Précédent",
      next: "Suivant",
      showing: "Affichage de",
      to: "à",
      results: "résultats",
      filterResults: "Filtrer les résultats",
      standing: "Standing",
      allMasc: "Tous",
      allFem: "Toutes",
      allStandings: "Tous les standings",
      selectService: "Sélectionnez un service",
      clearFilters: "Effacer les filtres",
      forLabel: "pour",
      sortByRating: "Trier par note",
      sortByReviews: "Trier par avis",
      filterByServices: "Filtrer par service(s)",
      inCity: " à ",
    },
    en: {
      establishments: "establishments",
      inSubcategory: "in this subcategory",
      noResults: "No establishments found in this subcategory",
      verified: "Verified",
      allCities: "All cities",
      filterByCity: "Filter by city",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      to: "to",
      results: "results",
      filterResults: "Filter results",
      standing: "Standing",
      allMasc: "All",
      allFem: "All",
      allStandings: "All standings",
      selectService: "Select a service",
      clearFilters: "Clear filters",
      forLabel: "for",
      sortByRating: "Sort by rating",
      sortByReviews: "Sort by reviews",
      filterByServices: "Filter by service(s)",
      inCity: " in ",
    },
    ar: {
      establishments: "مؤسسة",
      inSubcategory: "في هذه الفئة الفرعية",
      noResults: "لم يتم العثور على مؤسسات في هذه الفئة الفرعية",
      verified: "موثق",
      allCities: "جميع المدن",
      filterByCity: "تصفية حسب المدينة",
      page: "صفحة",
      of: "من",
      previous: "السابق",
      next: "التالي",
      showing: "عرض",
      to: "إلى",
      results: "نتائج",
      filterResults: "تصفية النتائج",
      standing: "مستوى",
      allMasc: "الكل",
      allFem: "الكل",
      allStandings: "جميع المستويات",
      selectService: "اختر خدمة",
      clearFilters: "مسح الفلاتر",
      forLabel: "لـ",
      sortByRating: "ترتيب حسب التقييم",
      sortByReviews: "ترتيب حسب التعليقات",
      filterByServices: "تصفية حسب الخدمات",
      inCity: " في ",
    }
  };

  const t = translations[language] || translations.fr;

  const scrollToFilterToggle = () => {
    if (window.innerWidth < 640) {
      setTimeout(() => {
        document.getElementById("subcategory-filter-toggle")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedServices([]);
    setSelectedGamme("all");
    scrollToFilterToggle();
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? [] : [service]
    );
    scrollToFilterToggle();
  };

  const clearFilters = () => {
    setSelectedServices([]);
    setSelectedGamme("all");
    setTimeout(() => {
      const bookmarkEl = document.getElementById("map-bookmark-bottom");
      if (bookmarkEl) {
        bookmarkEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    const anchor = document.getElementById("subcategory-filters");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setTimeout(() => {
      const bookmarkEl = document.getElementById("map-bookmark-top");
      if (bookmarkEl) {
        bookmarkEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  const getMapEmbedUrl = () => {
    if (selectedBusiness) {
      // Using business name as query makes Google find the GMB listing and show the labeled red marker.
      // Coordinates-only query (q=lat,lng) returns an unlabeled generic pin without the business name.
      const query = selectedBusiness.name + (selectedBusiness.address ? `, ${selectedBusiness.address}` : "");
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(query)}&zoom=17`;
    }
    if (selectedCity !== "all") {
      const cityData = citiesWithPriority.find(c => c.name === selectedCity);
      const centerParam = cityData?.lat && cityData?.lng ? `&center=${cityData.lat},${cityData.lng}` : "";
      const searchQuery = `${decodedSubcategoryName} ${selectedCity} Maroc`;
      return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(searchQuery)}${centerParam}&zoom=13`;
    }
    return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(decodedSubcategoryName)}+Maroc&center=31.7917,-7.0926&zoom=6`;
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

  const textClass = "text-white";
  const activeFilterCount = [...selectedServices, ...(selectedGamme !== "all" ? [selectedGamme] : [])].length;
  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  return (
    <div className="min-h-screen relative">
      {/* Full-page background */}
      <div className="fixed inset-0 -z-10">
        <img src={heroBackground} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-8 lg:pb-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          {/* Breadcrumb to parent category */}
          {categoryInfo && (
            <button
              onClick={() => navigate(`/category/${encodeURIComponent(categoryInfo.name_fr)}`)}
              className="flex items-center gap-2 text-gold/80 hover:text-gold mb-3 transition-colors text-sm"
            >
              {categoryInfo.icon ? (
                <DynamicIcon name={categoryInfo.icon} className="h-4 w-4" fallback={<Building2 className="h-4 w-4" />} />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              {getCategoryName()}
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 flex-wrap">
              {subcategoryInfo?.icon ? (
                <DynamicIcon name={subcategoryInfo.icon} className="h-8 w-8 text-gold" fallback={<Building2 className="h-8 w-8 text-gold" />} />
              ) : (
                <Building2 className="h-8 w-8 text-gold" />
              )}
              {getSubcategoryName()}
              {selectedCity !== "all" && (
                <span className="text-gold font-bold">à {selectedCity}</span>
              )}
              <ShareButton title={getSubcategoryName()} />
            </h1>
            <p className="text-white/80 mt-2">
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments}
            </p>
          </div>
        </div>
      </section>

      {/* Map & Filters & Results */}
      <section className="py-6 lg:py-12">
        <div className="container mx-auto px-4">

          {/* Google Maps */}
          {/* Signet supérieur */}
          <div id="map-bookmark-top" className="flex items-center gap-3 mb-4 scroll-mt-24">
            <div className="flex-1 h-px bg-gold/40" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rotate-45 bg-gold" />
              <div className="w-1.5 h-1.5 rotate-45 bg-gold/60" />
              <div className="w-1 h-1 rotate-45 bg-gold/40" />
            </div>
            <div className="flex-1 h-px bg-gold/40" />
          </div>
          <div className="mb-4 overflow-hidden rounded-lg">
            <Card id="subcategory-map" className="relative border-0 h-[400px] sm:h-[500px] overflow-hidden scroll-mt-24">
              <CardContent className="p-0 relative h-full">
                {selectedBusiness && (
                  <MapBusinessInfoCard
                    business={selectedBusiness}
                    onClose={clearSelectedBusiness}
                  />
                )}
                <iframe
                  src={getMapEmbedUrl()}
                  className={`w-full border-0 rounded-lg ${selectedBusiness ? 'h-[520px] sm:h-[500px]' : 'h-full'}`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${getSubcategoryName()}${selectedCity !== "all" ? ` à ${selectedCity}` : ""}`}
                />
              </CardContent>
          </Card>
          </div>
          {/* Signet inférieur */}
          <div id="map-bookmark-bottom" className="flex items-center gap-3 mt-4 mb-6 scroll-mt-24">
            <div className="flex-1 h-px bg-gold/40" />
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rotate-45 bg-gold/40" />
              <div className="w-1.5 h-1.5 rotate-45 bg-gold/60" />
              <div className="w-2 h-2 rotate-45 bg-gold" />
            </div>
            <div className="flex-1 h-px bg-gold/40" />
          </div>

          {/* Mobile filter toggle */}
          <div id="subcategory-filter-toggle" className="sm:hidden mb-4 scroll-mt-24">
            <button
              onClick={() => { const wasOpen = showFilters; setShowFilters(!showFilters); if (wasOpen) scrollToFilterToggle(); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium transition-colors hover:bg-white/20"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.filterResults}
              {activeFilterCount > 0 && (
                <span className="ml-auto bg-gold text-black text-xs font-bold rounded-full px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* City & Standing Filters */}
          <div id="subcategory-filters" className={`space-y-3 mb-8 scroll-mt-24 ${showFilters ? 'block' : 'hidden'} sm:block`}>
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

              {/* Standing Filter - shown when city is selected */}
              {selectedCity !== "all" && availableGammes.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <label className={`text-sm font-bold ${textClass} mb-1.5 block`}>
                    {t.standing}
                  </label>
                  <Select value={selectedGamme} onValueChange={(v) => { setSelectedGamme(v); scrollToFilterToggle(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.allMasc} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allStandings}</SelectItem>
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

          {/* Services Filter */}
          {availableServices.length > 0 && (
            <div className="mb-8">
              <div className="mb-3">
                <label className="text-sm font-bold text-white">
                  {t.filterByServices}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${
                      selectedServices.includes(service)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedServices.includes(service)}
                      className="h-3 w-3 pointer-events-none"
                    />
                    {service}
                  </button>
                ))}
              </div>
              {selectedServices.length > 0 && (
                <div className="mt-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gold underline hover:text-gold/80 transition-colors"
                  >
                    {t.clearFilters}
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">{t.noResults}</p>
            </div>
          ) : (
            <>
              {/* Results count + Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className={`text-lg font-bold ${textClass}`}>
                  {filteredBusinesses.length} {t.establishments} {t.forLabel} {getSubcategoryName()}{selectedCity ? `${t.inCity}${selectedCity}` : ""}
                </h2>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Button
                    variant={sortMode === "rating" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { if (sortMode === "rating") setSortAsc(!sortAsc); else { setSortMode("rating"); setSortAsc(false); } }}
                    className="text-xs"
                  >
                    <span className="mr-1">↑↓</span>
                    {t.sortByRating}
                  </Button>
                  <Button
                    variant={sortMode === "reviews" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { if (sortMode === "reviews") setSortAsc(!sortAsc); else { setSortMode("reviews"); setSortAsc(false); } }}
                    className="text-xs"
                  >
                    <span className="mr-1">↑↓</span>
                    {t.sortByReviews}
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
                  <p className="text-sm text-gray-400">
                    {t.showing} {startResult} {t.to} {endResult} {t.of} {filteredBusinesses.length} {t.results}
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

export default SubcategoryPage;
