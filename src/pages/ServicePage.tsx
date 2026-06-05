import { useLocation, useNavigate, Link } from "react-router-dom";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";

import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import heroMarrakech from "@/assets/hero-marrakech.jpg";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Building2, ChevronLeft, ChevronRight, Sun, X, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import DynamicIcon from "@/components/DynamicIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import BusinessCard, { BusinessCardData, Gamme, Badge } from "@/components/BusinessCard";
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
  services?: string[] | null;
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
  neighborhood?: string | null;
  hook_fr?: string | null;
  google_rating?: number | null;
  tripadvisor_rating?: number | null;
  restaurant_guru_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
}

// Gamme interface is imported from BusinessCard

const ITEMS_PER_PAGE = 20;

const ServicePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number; latitude: number | null; longitude: number | null; region: string | null }[]>([]);
  const citiesScrollRef = useRef<HTMLDivElement>(null);
  const [serviceIcon, setServiceIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("city") || "all";
  });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);
  const [selectedGammeFilter, setSelectedGammeFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"rating" | "reviews">("rating");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  // Extract subcategory and service name from URL path
  // Supports: /service/SubcategoryName/ServiceName OR /service/ServiceName
  const { subcategoryName, serviceName, decodedServiceName } = useMemo(() => {
    const path = location.pathname;
    const prefix = "/service/";
    if (!path.startsWith(prefix)) return { subcategoryName: null, serviceName: "", decodedServiceName: "" };
    
    const rest = path.slice(prefix.length);
    // Split on "/" but respect encoded %2F within segments
    const segments = rest.split("/").map(s => decodeURIComponent(s));
    
    if (segments.length >= 2) {
      // /service/{subcategory}/{service}
      const subcat = segments[0];
      const svc = segments.slice(1).join("/"); // in case service name contains /
      return { subcategoryName: subcat, serviceName: svc, decodedServiceName: svc };
    }
    // /service/{name} — could be subcategory or service
    const name = segments[0];
    return { subcategoryName: null, serviceName: name, decodedServiceName: name };
  }, [location.pathname]);

  // Icon rendering is now handled by DynamicIcon component

  // Get cities available for this service, sorted by priority score
  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

  // Get gammes available in current businesses (filtered by city and services)
  const availableGammes = useMemo(() => {
    let cityFiltered = selectedCity === "all" ? allBusinesses : allBusinesses.filter(b => b.city === selectedCity);
    if (selectedServices.length > 0) {
      cityFiltered = cityFiltered.filter(b => selectedServices.some(s => b.services?.includes(s)));
    }
    const gammeIds = new Set(cityFiltered.map(b => b.gamme_id).filter(Boolean));
    return gammes.filter(g => gammeIds.has(g.id));
  }, [allBusinesses, gammes, selectedCity, selectedServices]);

  // Get all available services from businesses (filtered by city and gamme)
  const availableServices = useMemo(() => {
    const services = new Set<string>();
    let businessesToCheck = selectedCity === "all" ? allBusinesses : allBusinesses.filter(b => b.city === selectedCity);
    if (selectedGammeFilter !== "all") {
      businessesToCheck = businessesToCheck.filter(b => b.gamme_id === selectedGammeFilter);
    }
    businessesToCheck.forEach(b => b.services?.forEach(s => services.add(s)));
    return Array.from(services).sort((a, b) => a.localeCompare(b, "fr"));
  }, [allBusinesses, selectedCity, selectedGammeFilter]);

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    return (b as any).computed_rating ?? (b.rating ? Number(b.rating) : null);
  };

  // Filter businesses by city, service, and gamme, then sort by rating
  const filteredBusinesses = useMemo(() => {
    let result = selectedCity === "all" ? [...allBusinesses] : allBusinesses.filter(b => b.city === selectedCity);
    
    if (selectedServices.length > 0) {
      result = result.filter(b =>
        selectedServices.some(s => b.services?.includes(s))
      );
    }

    if (selectedGammeFilter !== "all") {
      result = result.filter(b => b.gamme_id === selectedGammeFilter);
    }
    
    const dir = sortAsc ? -1 : 1;
    result.sort((a, b) => {
      if (sortMode === "reviews") {
        const countA = (a.google_review_count || 0) + (a.tripadvisor_review_count || 0) + (a.restaurant_guru_review_count || 0);
        const countB = (b.google_review_count || 0) + (b.tripadvisor_review_count || 0) + (b.restaurant_guru_review_count || 0);
        return (countB - countA) * dir;
      }
      const rA = getEffectiveRating(a);
      const rB = getEffectiveRating(b);
      if (rA === null && rB === null) return 0;
      if (rA === null) return 1;
      if (rB === null) return -1;
      return (rB - rA) * dir;
    });
    
    return result;
  }, [allBusinesses, selectedCity, selectedGammeFilter, selectedServices, sortMode, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedGammeFilter]);

  // Build display title
  const displayTitle = subcategoryName ? `${subcategoryName} / ${serviceName}` : decodedServiceName;
  const cityLabel = selectedCity !== "all" ? ` à ${selectedCity}` : "";

  useSEO({
    title: `${displayTitle}${cityLabel}`,
    description: `Trouvez les meilleurs ${decodedServiceName.toLowerCase()}${cityLabel} au Maroc. Adresses sélectionnées par ONE WORLD MOROCCO.`,
    canonical: `/service/${encodeURIComponent(decodedServiceName)}`,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedServiceName) return;
      
      setIsLoading(true);
      try {
        // Determine what to search for
        const hasExplicitSubcategory = !!subcategoryName;
        
        // Check if the name matches a subcategory first (only when no explicit subcategory)
        let isSubcategory = false;
        if (!hasExplicitSubcategory) {
          const { data: subcategoryMatch } = await supabase
            .from("subcategories")
            .select("icon, name_fr")
            .eq("name_fr", decodedServiceName)
            .limit(1)
            .maybeSingle();

          isSubcategory = !!subcategoryMatch;

          if (subcategoryMatch?.icon) {
            setServiceIcon(subcategoryMatch.icon);
          }
        }

        // Fetch icon
        if (!serviceIcon) {
          // Try subcategory icon first if we have explicit subcategory
          if (hasExplicitSubcategory) {
            const { data: subIcon } = await supabase
              .from("subcategories")
              .select("icon")
              .eq("name_fr", subcategoryName)
              .not("icon", "is", null)
              .limit(1)
              .maybeSingle();
            if (subIcon?.icon) setServiceIcon(subIcon.icon);
          }
          
          // Then try service icon
          if (!serviceIcon) {
            const { data: serviceData } = await supabase
              .from("services")
              .select("icon")
              .eq("name_fr", serviceName)
              .not("icon", "is", null)
              .limit(1)
              .maybeSingle();

            if (serviceData?.icon) {
              setServiceIcon(serviceData.icon);
            } else if (!hasExplicitSubcategory) {
              const { data: fallbackData } = await supabase
                .from("services")
                .select("icon")
                .eq("name_fr", decodedServiceName)
                .limit(1)
                .maybeSingle();
              if (fallbackData?.icon) setServiceIcon(fallbackData.icon);
            }
          }
        }

        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score, latitude, longitude, region")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0, latitude: c.latitude, longitude: c.longitude, region: c.region }))
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
          supabase.from("subcategories").select("id, name_fr"),
          supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
        ]);

        if (badgesRes.data) setBadges(badgesRes.data);
        if (subcatsRes.data) setSubcategories(subcatsRes.data);
        if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);

        // Fetch businesses
        const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, default_service, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, computed_rating, total_review_count, gamme_id, badge_id, neighborhood, hook_fr";

        let businessData: Business[] | null = null;
        let fetchError: Error | null = null;

        if (hasExplicitSubcategory) {
          // Two-segment URL: /service/{subcategory}/{service}
          // Fetch businesses matching subcategory in categories AND service in services
          const { data, error } = await supabase
            .from("businesses")
            .select(selectFields)
            .eq("is_active", true)
            .contains("categories", [subcategoryName])
            .contains("services", [serviceName])
            .order("wtuce_status", { ascending: true })
            .order("priority_score", { ascending: false });

          if (error) fetchError = error;
          businessData = data || [];
        } else if (isSubcategory) {
          // Search in BOTH categories and services arrays, then merge
          const [catResult, svcResult] = await Promise.all([
            supabase
              .from("businesses")
              .select(selectFields)
              .eq("is_active", true)
              .contains("categories", [decodedServiceName])
              .order("wtuce_status", { ascending: true })
              .order("priority_score", { ascending: false }),
            supabase
              .from("businesses")
              .select(selectFields)
              .eq("is_active", true)
              .contains("services", [decodedServiceName])
              .order("wtuce_status", { ascending: true })
              .order("priority_score", { ascending: false }),
          ]);

          if (catResult.error) fetchError = catResult.error;
          if (svcResult.error) fetchError = svcResult.error;

          const merged = new Map<string, Business>();
          for (const b of (catResult.data || [])) merged.set(b.id, b);
          for (const b of (svcResult.data || [])) {
            if (!merged.has(b.id)) merged.set(b.id, b);
          }
          businessData = Array.from(merged.values());
        } else {
          // Search by service only
          const { data, error } = await supabase
            .from("businesses")
            .select(selectFields)
            .eq("is_active", true)
            .contains("services", [decodedServiceName])
            .order("wtuce_status", { ascending: true })
            .order("priority_score", { ascending: false });
          
          businessData = data;
          if (error) fetchError = error;
        }

        if (fetchError) throw fetchError;
        
        setAllBusinesses(businessData || []);
        // Pre-select current service in filters
        setSelectedServices([serviceName]);
      } catch (error) {
        console.error("Error fetching service data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedServiceName]);

  // getBusinessImage and getBusinessGamme are now handled by BusinessCard component

  const translations = {
    fr: {
      establishments: "établissements",
      withService: "proposant ce service",
      noResults: "Aucun établissement trouvé pour ce service",
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
      inEveryCity: "dans chaque ville",
      viewOnMap: "Voir sur la carte",
      shownOnMap: "Affiché sur la carte",
      discover: "Découvrez",
      yumYum: "Miam, Miam !",
    },
    en: {
      establishments: "establishments",
      withService: "offering this service",
      noResults: "No establishments found for this service",
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
      inEveryCity: "in every city",
      viewOnMap: "View on map",
      shownOnMap: "Shown on map",
      discover: "Discover",
      yumYum: "Yum, Yum!",
    },
    ar: {
      establishments: "مؤسسة",
      withService: "تقدم هذه الخدمة",
      noResults: "لم يتم العثور على مؤسسات لهذه الخدمة",
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
      inEveryCity: "في كل مدينة",
      viewOnMap: "عرض على الخريطة",
      shownOnMap: "معروض على الخريطة",
      discover: "اكتشف",
      yumYum: "!يم يم",
    }
  };

  const t = translations[language] || translations.fr;

  const scrollToFilterToggle = () => {
    if (window.innerWidth < 640) {
      setTimeout(() => {
        document.getElementById("service-filter-toggle")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedBusiness(null);
    setSelectedGammeFilter("all");
    setSelectedServices([serviceName]);
    scrollToFilterToggle();
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? [] : [service]
    );
    // On mobile, close filters after selecting a service and scroll to toggle anchor
    if (window.innerWidth < 640) {
      setShowFilters(false);
      scrollToFilterToggle();
    } else {
      setTimeout(() => {
        document.getElementById("service-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setTimeout(() => {
      document.getElementById("service-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(query)}&zoom=17`;
    }
    // When a city is selected, center on the city; otherwise center on Morocco
    if (selectedCity !== "all") {
      const cityData = citiesWithPriority.find(c => c.name === selectedCity);
      if (cityData?.latitude && cityData?.longitude) {
        return `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_EMBED_KEY}&center=${cityData.latitude},${cityData.longitude}&zoom=13&maptype=roadmap`;
      }
      // Fallback: search by city name
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(selectedCity + ", Maroc")}&zoom=13`;
    }
    return `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_EMBED_KEY}&center=31.7917,-7.0926&zoom=6&maptype=roadmap`;
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <div className="min-h-screen bg-fixed bg-cover bg-center" style={{ backgroundImage: `url(${heroMarrakech})` }}>
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-8 lg:pb-16 relative overflow-hidden" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)" }}>
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              {serviceIcon ? (
                <DynamicIcon name={serviceIcon} className="h-8 w-8 text-gold" fallback={<Sun className="h-8 w-8 text-gold" />} />
              ) : (
                <Sun className="h-8 w-8 text-gold" />
              )}
              {displayTitle}
              {selectedCity !== "all" && (
                <span className="text-gold"> à {selectedCity}</span>
              )}
              <ShareButton title={displayTitle} />
            </h1>
            <p className="text-white/80 mt-2">
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.withService}
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-6 lg:py-12 bg-transparent">
        <div className="container mx-auto px-4">


          {availableCities.length > 0 && (
            <div className="mb-8 bg-black/50 rounded-xl p-6">
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-xl sm:text-3xl font-bold text-white">
                  {`${t.discover} ${displayTitle} `}
                  <span className="text-gold">{t.inEveryCity}</span>
                </h2>
                <p className="mx-auto max-w-2xl text-gray-400">
                  {t.yumYum}
                </p>
              </div>
              <div className="relative px-10 sm:px-0">
                {/* Scroll Buttons */}
                <button
                  onClick={() => {
                    const container = citiesScrollRef.current;
                    if (!container) return;
                    const cardWidth = container.querySelector('button')?.offsetWidth || 224;
                    container.scrollBy({ left: -(cardWidth + 16), behavior: "smooth" });
                  }}
                  className="absolute left-0 sm:-left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-2 sm:p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const container = citiesScrollRef.current;
                    if (!container) return;
                    const cardWidth = container.querySelector('button')?.offsetWidth || 224;
                    container.scrollBy({ left: cardWidth + 16, behavior: "smooth" });
                  }}
                  className="absolute right-0 sm:-right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-2 sm:p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div
                  ref={citiesScrollRef}
                  className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-4 px-2 snap-x snap-mandatory sm:snap-none"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {availableCities.map((city) => {
                    const count = allBusinesses.filter(b => b.city === city).length;
                    const cityData = citiesWithPriority.find(c => c.name === city);
                    return (
                      <button
                        key={city}
                        onClick={() => handleCityChange(city)}
                        className="flex-shrink-0 py-2 snap-center w-[55vw] sm:w-auto"
                      >
                        <Card className={`group w-full sm:w-56 overflow-hidden transition-all hover:shadow-lg hover:scale-105 border border-white/20 bg-white/10 backdrop-blur-sm ${selectedCity === city ? "ring-2 ring-gold" : ""}`}>
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <MapPin className="h-5 w-5 text-gold mb-2" />
                            <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{city}</h3>
                            {cityData?.region && (
                              <p className="text-xs text-gray-400 mt-1 truncate">{cityData.region}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                              <Building2 className="h-3 w-3" />
                              <span>{count} {t.establishments}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Google Maps */}
          <div id="service-map" className="scroll-mt-24" />
          <Card className="mb-8 relative overflow-hidden h-[400px]">
            <CardContent className="p-0 relative h-full">
              {selectedBusiness && (
                <MapBusinessInfoCard
                  business={selectedBusiness}
                  onClose={clearSelectedBusiness}
                />
              )}
              <iframe
                src={getMapEmbedUrl()}
                className={`w-full border-0 rounded-lg ${selectedBusiness ? 'h-[520px] sm:h-full' : 'h-full'}`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${displayTitle}${selectedCity !== "all" ? ` à ${selectedCity}` : ""}`}
              />
            </CardContent>
          </Card>

          {/* Mobile filter toggle */}
          <div id="service-filter-toggle" className="sm:hidden mb-4 scroll-mt-24">
            <button
              onClick={() => { const wasOpen = showFilters; setShowFilters(!showFilters); if (wasOpen) scrollToFilterToggle(); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white border border-border text-foreground text-sm font-medium transition-colors hover:bg-white/90"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.filterResults}
              {(selectedGammeFilter !== "all" || selectedServices.length > 1) && (
                <span className="ml-auto bg-gold text-black text-xs font-bold rounded-full px-2 py-0.5">
                  {(selectedGammeFilter !== "all" ? 1 : 0) + (selectedServices.length > 1 ? selectedServices.length - 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Dropdown Filters */}
          <div id="service-filters" className={`mb-6 grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-24 ${showFilters ? 'grid' : 'hidden'} sm:grid`}>
            {/* Ville */}
            <div>
              <label className="block text-sm font-bold text-white mb-1">{t.filterByCity}</label>
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-full bg-popover border-border text-popover-foreground">
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCities}</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gamme */}
            {availableGammes.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-white mb-1">Standing</label>
                <Select value={selectedGammeFilter} onValueChange={(v) => { setSelectedGammeFilter(v); scrollToFilterToggle(); }}>
                  <SelectTrigger className="w-full bg-popover border-border text-popover-foreground">
                    <SelectValue placeholder="Gamme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les standings</SelectItem>
                    {availableGammes.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Services Filter */}
          {availableServices.length > 1 && (
            <div className={`mb-8 ${showFilters ? 'block' : 'hidden'} sm:block`}>
              <div className="mb-3">
                <label className="text-sm font-bold text-white">
                  {t.selectService}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => (
                  <label
                    key={service}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${
                      selectedServices.includes(service)
                        ? "bg-gold border-gold text-black font-semibold"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedServices.includes(service)}
                      onCheckedChange={() => toggleService(service)}
                      className="h-3 w-3 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Clear filters link - hidden on mobile when filters panel is closed */}
          {(selectedCity !== "all" || selectedGammeFilter !== "all" || selectedServices.length > 1) && (
            <div className="mb-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              <button
                onClick={() => {
                  setSelectedCity("all");
                  setSelectedGammeFilter("all");
                  setSelectedServices([serviceName]);
                  scrollToFilterToggle();
                }}
                className="text-sm text-gold underline hover:text-gold/80 transition-colors"
              >
                {t.clearFilters}
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
              {/* Results count + Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-white">
                  {filteredBusinesses.length} {t.establishments} {t.forLabel} {displayTitle}
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
              {/* Results Grid */}
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
                      view: t.viewOnMap,
                      shown: t.shownOnMap
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

      <DynamicLabelSections pageType="service" lightMode />
      <Footer variant="morocco" />
    </div>
  );
};

export default ServicePage;
