import { useEffect, useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, X, ExternalLink, BookOpen, Phone, ChevronLeft, ChevronRight, Clock, ArrowUpDown, ArrowDown, ArrowUp, Navigation, Star, SlidersHorizontal } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import CityWeather from "@/components/CityWeather";
import TopCityBusinesses from "@/components/TopCityBusinesses";
import heroBackground from "@/assets/hero-marrakech.jpg";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BusinessCard, { Gamme, Badge } from "@/components/BusinessCard";
import ShareButton from "@/components/ShareButton";

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
  badge_id: string | null;
  neighborhood: string | null;
  hook_fr: string | null;
  is_featured: boolean | null;
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
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategoriesRef, setSubcategoriesRef] = useState<{ id: string; name_fr: string; sort_order: number | null }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);
  const [gammeCategories, setGammeCategories] = useState<{ gamme_id: string; category_id: string }[]>([]);
  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, string>>({});
  const [selectedGamme, setSelectedGamme] = useState<string>("");
  
  const [sortByRating, setSortByRating] = useState<"none" | "desc" | "asc">("desc");
  const [sortByReviews, setSortByReviews] = useState<"none" | "desc" | "asc">("none");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const decodedCity = city ? decodeURIComponent(city) : "";

  useSEO({
    title: decodedCity ? `${decodedCity} – Guide des meilleures adresses` : "Ville",
    description: decodedCity ? `Explorez les meilleurs hôtels, restaurants, activités et services à ${decodedCity}. Guide ONE WORLD MOROCCO.` : undefined,
    canonical: city ? `/city/${city}` : undefined,
  });
  const isMobile = useIsMobile();

  const ITEMS_PER_PAGE = 20;


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
    
    const subcatSortMap: Record<string, number> = {};
    subcategoriesRef.forEach((s) => {
      subcatSortMap[s.name_fr] = (s.sort_order && s.sort_order !== 0) ? s.sort_order : 9999;
    });
    
    return Array.from(subcategories).sort((a, b) => {
      const orderA = subcatSortMap[a] ?? 9999;
      const orderB = subcatSortMap[b] ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b, "fr");
    });
  }, [businesses, selectedCategory, subcategoriesRef]);

  // Extract unique activities from filtered businesses (including gamme filter)
  const availableActivities = useMemo(() => {
    const activities = new Set<string>();
    let filtered = businesses;
    
    if (selectedCategory) {
      filtered = filtered.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedGamme) {
      filtered = filtered.filter((b) => b.gamme_id === selectedGamme);
    }
    
    filtered.forEach((business) => {
      business.services?.forEach((service) => activities.add(service));
    });
    return Array.from(activities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory, selectedSubcategory, selectedGamme]);

  // Filter gammes based on selected category/subcategory and actual business results
  const filteredGammes = useMemo(() => {
    // Start with gammes allowed by category taxonomy
    let allowed = gammes;
    if (selectedCategory) {
      const categoryId = categoryIdMap[selectedCategory];
      if (categoryId) {
        const allowedGammeIds = new Set(
          gammeCategories.filter((gc) => gc.category_id === categoryId).map((gc) => gc.gamme_id)
        );
        allowed = gammes.filter((g) => allowedGammeIds.has(g.id));
      }
    }
    
    // Further filter to only gammes that have businesses in current filters
    let filtered = businesses;
    if (selectedCategory) {
      filtered = filtered.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    const gammeIdsWithResults = new Set(filtered.map((b) => b.gamme_id).filter(Boolean));
    return allowed.filter((g) => gammeIdsWithResults.has(g.id)).sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
  }, [gammes, gammeCategories, categoryIdMap, selectedCategory, selectedSubcategory, businesses]);

  const getCalcRating = (b: Business): number | null => {
    if (b.rating) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  const getTotalReviews = (b: Business): number => {
    return getTotalReviewCount(b);
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
    
    // Sort by reviews if active, otherwise by rating
    if (sortByReviews !== "none") {
      result = [...result].sort((a, b) => {
        const countA = getTotalReviews(a);
        const countB = getTotalReviews(b);
        if (sortByReviews === "asc") return countA - countB;
        return countB - countA;
      });
    } else {
      // Sort by effective rating descending (manual rating overrides calculated)
      result = [...result].sort((a, b) => {
        const ratingA = getCalcRating(a);
        const ratingB = getCalcRating(b);
        if (ratingA === null && ratingB === null) return 0;
        if (ratingA === null) return 1;
        if (ratingB === null) return -1;
        if (sortByRating === "asc") return ratingA - ratingB;
        return ratingB - ratingA;
      });
    }

    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedGamme, selectedActivities, sortByRating, sortByReviews]);

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
  }, [selectedCategory, selectedSubcategory, selectedGamme, selectedActivities, sortByRating, sortByReviews]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToFilterToggle = () => {
    if (window.innerWidth < 640) {
      setTimeout(() => {
        document.getElementById("city-results-signet")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? [] : [activity]
    );
    setTimeout(() => {
      document.getElementById("city-filters-signet")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedGamme("");
    setSelectedActivities([]);
    setTimeout(() => {
      document.getElementById("city-filters-signet")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedGamme("");
    setSelectedActivities([]);
    scrollToFilterToggle();
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
    scrollToFilterToggle();
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCity) return;

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
      if (subcatsRes.data) setSubcategoriesRef(subcatsRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);

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

      // Fetch city ID for zone_city_ids lookup
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .ilike("name_fr", decodedCity)
        .maybeSingle();

      const businessSelectCols = "id, name, city, region, address, phone, whatsapp, skype, main_category, categories, default_service, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, google_rating, tripadvisor_rating, restaurant_guru_rating, google_review_count, tripadvisor_review_count, restaurant_guru_review_count, priority_score, opening_hours, show_opening_hours, is_open_24h, logo_url, gamme_id, badge_id, neighborhood, hook_fr, is_featured";

      // Fetch businesses in this city + businesses with national zone covering this city
      const [cityBizRes, zoneBizRes] = await Promise.all([
        supabase
          .from("businesses")
          .select(businessSelectCols)
          .eq("is_active", true)
          .ilike("city", decodedCity)
          .order("wtuce_status", { ascending: true, nullsFirst: false })
          .order("priority_score", { ascending: false }),
        cityRow?.id
          ? supabase
              .from("businesses")
              .select(businessSelectCols)
              .eq("is_active", true)
              .contains("zone_city_ids", [cityRow.id])
              .order("priority_score", { ascending: false })
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      if (cityBizRes.error) {
        console.error("Error fetching businesses:", cityBizRes.error);
      }

      // Merge & deduplicate
      const cityBiz = cityBizRes.data || [];
      const zoneBiz = (zoneBizRes.data || []) as typeof cityBiz;
      const seenIds = new Set(cityBiz.map((b) => b.id));
      const merged = [...cityBiz, ...zoneBiz.filter((b) => !seenIds.has(b.id))];
      setBusinesses(merged);

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
      // Using business name as query makes Google find the GMB listing and show the labeled red marker.
      // Coordinates-only query (q=lat,lng) returns an unlabeled generic pin without the business name.
      const query = selectedBusiness.name + (selectedBusiness.address ? `, ${selectedBusiness.address}` : "");
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(query)}&zoom=17`;
    }

    // Default: show city overview
    if (businesses.length === 0) {
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
    }

    // If we have businesses with coordinates, center on the first one
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_EMBED_KEY}&q=entreprises+${encodeURIComponent(decodedCity)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=14`;
    }

    return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_EMBED_KEY}&q=entreprises+${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    
    // Scroll to map anchor after re-render
    setTimeout(() => {
      const mapAnchor = document.getElementById('city-map-anchor');
      if (mapAnchor) {
        mapAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    <div className="min-h-screen relative">
      {/* Full-page background */}
      <div className="fixed inset-0 -z-10">
        <img src={heroBackground} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      
      <Header />

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
            {decodedCity}
            <ShareButton title={decodedCity} />
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
        <div id="city-map-anchor" className="scroll-mt-24" />
        <div className="space-y-6">
          <div className={`overflow-hidden rounded-lg ${selectedBusiness ? 'shadow-xl shadow-gold/20 ring-2 ring-gold/30' : ''}`}>
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
                  title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte de ${decodedCity}`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Filters + Business list */}
          <div className="space-y-4">
            {/* Mobile filter toggle */}
            <div id="city-filter-toggle" className="sm:hidden mb-4 scroll-mt-24">
              <button
                onClick={() => {
                  const wasOpen = showFilters;
                  const hasFilters = !!(selectedCategory || selectedSubcategory || selectedGamme || selectedActivities.length > 0);
                  setShowFilters(!showFilters);
                  if (wasOpen) {
                    scrollToFilterToggle();
                  } else if (!hasFilters && window.innerWidth < 640) {
                    setTimeout(() => {
                      document.getElementById("city-filter-toggle")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  }
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium transition-colors hover:bg-white/20"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrer les résultats
                {(selectedCategory || selectedSubcategory || selectedGamme || selectedActivities.length > 0) && (
                  <span className="ml-auto bg-gold text-black text-xs font-bold rounded-full px-2 py-0.5">
                    {[selectedCategory, selectedSubcategory, selectedGamme, ...selectedActivities].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Signet anchor above filters */}
            <div id="city-filters-signet" className="scroll-mt-24" />

            {/* Category & Subcategory Filters */}
            <div className={`space-y-3 ${showFilters ? 'block' : 'hidden'} sm:block`}>
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
                {/* Main Category Filter */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-sm font-bold text-white mb-1.5 block">Catégorie</label>
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
                {selectedCategory && availableSubcategories.length > 0 && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-sm font-bold text-white mb-1.5 block">Sous-catégorie</label>
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

                {/* Standing (Gamme) Filter */}
                {selectedSubcategory && filteredGammes.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <label className="text-sm font-bold text-white mb-1.5 block">Standing</label>
                  <Select value={selectedGamme || "all"} onValueChange={(v) => { setSelectedGamme(v === "all" ? "" : v); scrollToFilterToggle(); }}>
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

              {/* Activity Filters */}
              {selectedSubcategory && availableActivities.length > 0 && (
                <div>
                  <label className="text-sm font-bold text-white mb-1.5 block">Sélectionnez un service</label>
                  <div className="flex flex-wrap gap-2">
                    {availableActivities.map((activity) => (
                      <button
                        key={activity}
                        onClick={() => toggleActivity(activity)}
                        className={`px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-xs ${
                          selectedActivities.includes(activity)
                            ? "bg-gold border-gold text-black font-semibold"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {activity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear All Button */}
              {(selectedCategory || selectedSubcategory || selectedGamme || selectedActivities.length > 0) && (
                <div className="mb-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gold underline hover:text-gold/80 transition-colors"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Business list */}
            <div id="city-results-signet" className="scroll-mt-24" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <h2 className="text-lg font-bold text-white">
                {filteredBusinesses.length} établissement{filteredBusinesses.length > 1 ? "s" : ""} pour {decodedCity}
              </h2>
              <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => {
                  setSortByRating(prev => prev === "none" ? "desc" : prev === "desc" ? "asc" : "none");
                  if (sortByReviews !== "none") setSortByReviews("none");
                }}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                  sortByRating !== "none" 
                    ? "bg-gold/20 text-gold border border-gold/40" 
                    : "bg-white/10 text-white/70 hover:text-white border border-white/20"
                }`}
              >
                {sortByRating === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : sortByRating === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
                {sortByRating === "desc" ? "Meilleures notes" : sortByRating === "asc" ? "Notes croissantes" : "Trier par note"}
              </button>
              <button
                onClick={() => {
                  setSortByReviews(prev => prev === "none" ? "desc" : prev === "desc" ? "asc" : "none");
                  if (sortByRating !== "none") setSortByRating("none");
                }}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                  sortByReviews !== "none" 
                    ? "bg-gold/20 text-gold border border-gold/40" 
                    : "bg-white/10 text-white/70 hover:text-white border border-white/20"
                }`}
              >
                {sortByReviews === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : sortByReviews === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
                {sortByReviews === "desc" ? "Plus d'avis" : sortByReviews === "asc" ? "Moins d'avis" : "Trier par avis"}
              </button>
              </div>
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
                      badges={badges}
                      subcategories={subcategoriesRef}
                      badgeSubcategories={badgeSubcategories}
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

      <DynamicLabelSections pageType="city" />

      <Footer variant="morocco" />
    </div>
  );
};

export default CityMap;
