import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Building2, ChevronLeft, ChevronRight, Sun, X, ArrowLeft } from "lucide-react";
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
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number; latitude: number | null; longitude: number | null }[]>([]);
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

  // Extract service name from URL path (handles special characters like /, &, etc.)
  const decodedServiceName = useMemo(() => {
    const path = location.pathname;
    const prefix = "/service/";
    if (path.startsWith(prefix)) {
      return decodeURIComponent(path.slice(prefix.length));
    }
    return "";
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
      cityFiltered = cityFiltered.filter(b => selectedServices.some(s => b.services?.includes(s) || b.categories?.includes(s)));
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
    businessesToCheck.forEach(b => {
      b.services?.forEach(s => services.add(s));
      b.categories?.forEach(c => services.add(c));
    });
    return Array.from(services).sort((a, b) => a.localeCompare(b, "fr"));
  }, [allBusinesses, selectedCity, selectedGammeFilter]);

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    if (b.rating) return Number(b.rating);
    const sources: { r: number; c: number }[] = [];
    if (b.google_rating && b.google_review_count) sources.push({ r: Number(b.google_rating) * 4, c: b.google_review_count });
    if (b.tripadvisor_rating && b.tripadvisor_review_count) sources.push({ r: Number(b.tripadvisor_rating) * 4, c: b.tripadvisor_review_count });
    if (b.restaurant_guru_rating && b.restaurant_guru_review_count) sources.push({ r: Number(b.restaurant_guru_rating) * 4, c: b.restaurant_guru_review_count });
    if (sources.length === 0) return null;
    const total = sources.reduce((s, x) => s + x.c, 0);
    return Math.round((sources.reduce((s, x) => s + x.r * x.c, 0) / total) * 10) / 10;
  };

  // Filter businesses by city, service, and gamme, then sort by rating
  const filteredBusinesses = useMemo(() => {
    let result = selectedCity === "all" ? [...allBusinesses] : allBusinesses.filter(b => b.city === selectedCity);
    
    if (selectedServices.length > 0) {
      result = result.filter(b =>
        selectedServices.some(s => b.services?.includes(s) || b.categories?.includes(s))
      );
    }

    if (selectedGammeFilter !== "all") {
      result = result.filter(b => b.gamme_id === selectedGammeFilter);
    }
    
    const dir = sortAsc ? 1 : -1;
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

  // Update document title with service name and city
  useEffect(() => {
    const cityLabel = selectedCity !== "all" ? ` à ${selectedCity}` : "";
    document.title = `${decodedServiceName}${cityLabel} | WTUCE`;
  }, [decodedServiceName, selectedCity]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedServiceName) return;
      
      setIsLoading(true);
      try {
        // Check if the name matches a subcategory first
        const { data: subcategoryMatch } = await supabase
          .from("subcategories")
          .select("icon, name_fr")
          .eq("name_fr", decodedServiceName)
          .limit(1)
          .maybeSingle();

        const isSubcategory = !!subcategoryMatch;

        // Fetch icon: from subcategory or service
        if (subcategoryMatch?.icon) {
          setServiceIcon(subcategoryMatch.icon);
        } else {
          const { data: serviceData } = await supabase
            .from("services")
            .select("icon")
            .eq("name_fr", decodedServiceName)
            .not("icon", "is", null)
            .limit(1)
            .maybeSingle();

          if (serviceData?.icon) {
            setServiceIcon(serviceData.icon);
          } else {
            const { data: fallbackData } = await supabase
              .from("services")
              .select("icon")
              .eq("name_fr", decodedServiceName)
              .limit(1)
              .maybeSingle();
            
            if (fallbackData?.icon) {
              setServiceIcon(fallbackData.icon);
            }
          }
        }

        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score, latitude, longitude")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0, latitude: c.latitude, longitude: c.longitude }))
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

        // Fetch businesses: by subcategory (categories array) OR by service
        let businessData: Business[] | null = null;
        let fetchError: Error | null = null;

        const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, default_service, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, gamme_id, badge_id, neighborhood, hook_fr, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count";

        if (isSubcategory) {
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

          // Merge and deduplicate
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
        setSelectedServices([decodedServiceName]);
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
      results: "résultats"
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
      results: "results"
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
      results: "نتائج"
    }
  };

  const t = translations[language] || translations.fr;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedBusiness(null);
    setSelectedGammeFilter("all");
    setSelectedServices([decodedServiceName]);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
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
    // When a city is selected, center on the city; otherwise center on Morocco
    if (selectedCity !== "all") {
      const cityData = citiesWithPriority.find(c => c.name === selectedCity);
      if (cityData?.latitude && cityData?.longitude) {
        return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${cityData.latitude},${cityData.longitude}&zoom=13&maptype=roadmap`;
      }
      // Fallback: search by city name
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(selectedCity + ", Maroc")}&zoom=13`;
    }
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=31.7917,-7.0926&zoom=6&maptype=roadmap`;
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
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black pt-28 pb-8 lg:pb-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {serviceIcon ? (
                <DynamicIcon name={serviceIcon} className="h-8 w-8 text-gold" fallback={<Sun className="h-8 w-8 text-gold" />} />
              ) : (
                <Sun className="h-8 w-8 text-gold" />
              )}
              {decodedServiceName}
              {selectedCity !== "all" && (
                <span className="text-gold"> à {selectedCity}</span>
              )}
            </h1>
            <p className="text-white/80 mt-2">
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.withService}
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-6 lg:py-12 bg-black">
        <div className="container mx-auto px-4">
          {/* City cards horizontal scroll with auto-scroll */}
          {availableCities.length > 1 && (
            <div className="mb-6 -mx-4 overflow-hidden relative">
              {/* Fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
              <div
                className="flex gap-4 py-3 px-4 animate-marquee hover:[animation-play-state:paused]"
                style={{ width: "max-content" }}
              >
                {/* Duplicate items for seamless loop */}
                {[...availableCities, ...availableCities].map((city, i) => {
                  const count = allBusinesses.filter(b => b.city === city).length;
                  return (
                    <button
                      key={`${city}-${i}`}
                      onClick={() => handleCityChange(city)}
                      className={`flex flex-col items-center justify-center px-6 py-4 rounded-xl border transition-all min-w-[150px] shrink-0 ${
                        selectedCity === city
                          ? "bg-gold/20 border-gold text-gold"
                          : "bg-white/5 border-white/10 text-white/80 hover:border-gold/50 hover:text-gold"
                      }`}
                    >
                      <span className="text-base font-semibold">{city}</span>
                      <span className="text-sm opacity-70 mt-1">{count} {t.establishments}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Maps */}
          <Card className="mb-8 relative">
            <CardContent className="p-0">
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
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${decodedServiceName}${selectedCity !== "all" ? ` à ${selectedCity}` : ""}`}
              />
            </CardContent>
          </Card>

          {/* Dropdown Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ville */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">{t.filterByCity}</label>
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
                <label className="block text-sm font-medium text-white mb-1">Standing</label>
                <Select value={selectedGammeFilter} onValueChange={setSelectedGammeFilter}>
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
            <div className="mb-8">
              <div className="mb-3">
                <label className="text-sm text-gray-400">
                  {language === "fr" ? "Services / Activités" : language === "ar" ? "الخدمات" : "Services"}:
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
              {/* Results count + Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-white">
                  {t.establishments} ({filteredBusinesses.length})
                </h2>
                <div className="flex items-center gap-2">
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
                      view: language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map",
                      shown: language === "fr" ? "Affiché sur la carte" : language === "ar" ? "معروض على الخريطة" : "Shown on map"
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

      <DynamicLabelSections pageType="service" />
      <Footer />
    </div>
  );
};

export default ServicePage;
