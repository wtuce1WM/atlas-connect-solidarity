import { useEffect, useState, useMemo } from "react";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import { useSEO } from "@/hooks/useSEO";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { ArrowLeft, Loader2, MapPin, ChevronLeft, ChevronRight, X, Phone, SlidersHorizontal } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { sortWtuceAndRating } from "@/lib/businessRanking";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import TopCityBusinesses from "@/components/TopCityBusinesses";
import Footer from "@/components/Footer";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import BusinessCard, { Gamme, Badge } from "@/components/BusinessCard";
import ShareButton from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroBackground from "@/assets/hero-marrakech.jpg";
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
  hook_fr?: string | null;
  google_rating?: number | null;
  tripadvisor_rating?: number | null;
  restaurant_guru_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
  is_featured: boolean | null;
}

const ITEMS_PER_PAGE = 20;

const NeighborhoodPage = () => {
  const { neighborhood } = useParams<{ neighborhood: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const TRANSLATIONS = {
    fr: {
      filterResults: "Filtrer les résultats",
      clearFilters: "Effacer les filtres",
      selectService: "Sélectionnez un service",
      forLabel: "pour",
      sortByRating: "Trier par note",
      sortByReviews: "Trier par avis",
      neighborhood: "Quartier",
      noResults: "Aucun établissement trouvé dans ce quartier",
    },
    en: {
      filterResults: "Filter results",
      clearFilters: "Clear filters",
      selectService: "Select a service",
      forLabel: "for",
      sortByRating: "Sort by rating",
      sortByReviews: "Sort by reviews",
      neighborhood: "Neighborhood",
      noResults: "No businesses found in this neighborhood",
    },
    ar: {
      filterResults: "تصفية النتائج",
      clearFilters: "مسح الفلاتر",
      selectService: "اختر خدمة",
      forLabel: "لـ",
      sortByRating: "ترتيب حسب التقييم",
      sortByReviews: "ترتيب حسب التعليقات",
      neighborhood: "حي",
      noResults: "لم يتم العثور على مؤسسات في هذا الحي",
    },
  } as const;
  const t = TRANSLATIONS[language] || TRANSLATIONS.fr;

  const navigate = useLocalizedNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<"rating" | "reviews">("rating");
  const [sortAsc, setSortAsc] = useState(false);

  const decodedNeighborhood = neighborhood ? decodeURIComponent(neighborhood) : "";
  const cityParam = searchParams.get("city") ? decodeURIComponent(searchParams.get("city")!) : "";

  useSEO({
    title: decodedNeighborhood ? `${decodedNeighborhood}${cityParam ? ` – ${cityParam}` : ""}` : "Quartier",
    description: decodedNeighborhood ? `Les meilleures adresses du quartier ${decodedNeighborhood}${cityParam ? ` à ${cityParam}` : ""}. Guide ONE WORLD MOROCCO.` : undefined,
    canonical: neighborhood ? `/neighborhood/${neighborhood}${cityParam ? `?city=${encodeURIComponent(cityParam)}` : ""}` : undefined,
  });

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

  const getEffectiveRating = (b: typeof businesses[0]): number | null => {
    if (b.rating) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];
    if (selectedCategory) result = result.filter((b) => b.main_category === selectedCategory);
    if (selectedSubcategory) result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    if (selectedActivities.length > 0) {
      result = result.filter((b) => selectedActivities.some((a) => b.services?.includes(a)));
    }
    
    const dir = sortAsc ? -1 : 1;
    if (sortMode === "reviews") {
      result.sort((a, b) => {
        const countA = (a.google_review_count || 0) + (a.tripadvisor_review_count || 0) + (a.restaurant_guru_review_count || 0);
        const countB = (b.google_review_count || 0) + (b.tripadvisor_review_count || 0) + (b.restaurant_guru_review_count || 0);
        return (countB - countA) * dir;
      });
    } else {
      // Default: WTUCE > priority_score > rating (ignore <10 reviews) — same as SearchPage
      result.sort(sortWtuceAndRating);
      if (sortAsc) result.reverse();
    }
    
    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedActivities, sortMode, sortAsc]);

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

  const scrollToFilterToggle = () => {
    if (window.innerWidth < 640) {
      setTimeout(() => {
        document.getElementById("neighborhood-filter-toggle")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedActivities([]);
    scrollToFilterToggle();
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
    scrollToFilterToggle();
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
    scrollToFilterToggle();
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedActivities([]);
    scrollToFilterToggle();
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
        .select("id, name_fr, color_hex, text_color_hex, sort_order")
        .order("sort_order", { ascending: true });

      if (gammesData) setGammes(gammesData);

      // Fetch badges, subcategories, badge_subcategories
      const [badgesRes, subcatsRes, badgeSubcatsRes] = await Promise.all([
        supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
        supabase.from("subcategories").select("id, name_fr"),
        supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      ]);

      if (badgesRes.data) setBadges(badgesRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);

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

      const selectFields = "id, slug, name, city, region, address, phone, whatsapp, skype, main_category, categories, default_service, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, computed_rating, total_review_count, priority_score, logo_url, gamme_id, badge_id, neighborhood, opening_hours, show_opening_hours, is_open_24h, hook_fr, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, is_featured";

      // Fetch businesses for this neighborhood + "Toute la ville & environs" businesses in same city
      const CITYWIDE_NEIGHBORHOOD = "Toute la ville & environs";
      const isCitywideQuery = decodedNeighborhood === CITYWIDE_NEIGHBORHOOD;

      let query = supabase
        .from("businesses")
        .select(selectFields)
        .eq("is_active", true);

      if (isCitywideQuery) {
        query = query.ilike("neighborhood", decodedNeighborhood);
      } else {
        query = query.in("neighborhood", [decodedNeighborhood, CITYWIDE_NEIGHBORHOOD]);
      }

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
  const activeFilterCount = [selectedCategory, selectedSubcategory, ...selectedActivities].filter(Boolean).length;

  const getMapEmbedUrl = () => {
    if (selectedBusiness) {
      // Using business name as query makes Google find the GMB listing and show the labeled red marker.
      // Coordinates-only query (q=lat,lng) returns an unlabeled generic pin without the business name.
      const query = selectedBusiness.name + (selectedBusiness.address ? `, ${selectedBusiness.address}` : "");
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(query)}&zoom=17`;
    }

    const searchQuery = `${decodedNeighborhood} ${cityName}`;
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(searchQuery)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=15`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(searchQuery + ", Maroc")}&zoom=15`;
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

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
              <MapPin className="h-8 w-8 text-gold" />
              {language === "en" ? `${decodedNeighborhood} ${t.neighborhood}` : `${t.neighborhood} ${decodedNeighborhood}`}
              <ShareButton title={decodedNeighborhood} />
            </h1>
            {cityName && (
              <p className="text-white/80 mt-2">
                {cityName} — <span className="text-gold font-semibold">{filteredBusinesses.length}</span> établissement{filteredBusinesses.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="py-6 lg:py-12">
        <div className="container mx-auto px-4">
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
           <Card className="relative mb-6 h-[400px] sm:h-[500px] overflow-hidden">
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
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte du quartier ${decodedNeighborhood}`}
              />
            </CardContent>
          </Card>

          {/* Mobile filter toggle */}
          <div id="neighborhood-filter-toggle" className="sm:hidden mb-4 scroll-mt-24">
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

          {/* Filters */}
          <div className={`space-y-3 mb-6 ${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* City Filter */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-bold text-white mb-1.5 block">Ville</label>
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
                  <label className="text-sm font-bold text-white mb-1.5 block">Quartier</label>
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
                <label className="text-sm font-bold text-white mb-1.5 block">Catégorie</label>
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
                  <label className="text-sm font-bold text-white mb-1.5 block">Sous-catégorie</label>
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
              <div className="mb-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gold underline hover:text-gold/80 transition-colors"
                >
                  {t.clearFilters}
                </button>
              </div>
            )}

            {/* Activity Filters */}
            {selectedCategory && availableActivities.length > 0 && (
              <div>
                <label className="text-sm font-bold text-white mb-2 block">
                  {t.selectService}
                </label>
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

          {/* Business count heading + Sort */}
          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t.noResults}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-white">
                  {filteredBusinesses.length} établissement{filteredBusinesses.length > 1 ? "s" : ""} {t.forLabel} {decodedNeighborhood}
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedBusinesses.map((business) => (
                  <BusinessCard 
                    key={business.id} 
                    business={business} 
                    gammes={gammes} 
                    badges={badges}
                    subcategories={subcategories}
                    badgeSubcategories={badgeSubcategories}
                    verifiedLabel="Vérifié"
                    showMapButton
                    onSelectBusiness={handleSelectBusiness}
                    selectedBusinessId={selectedBusiness?.id}
                    mapButtonLabels={{ view: "Voir sur la carte", shown: "Affiché sur la carte" }}
                  />
                ))}
              </div>

              {filteredBusinesses.length > 0 && (
                <p className="text-sm text-gray-400 mt-4">
                  Affichage {startResult}-{endResult} sur {filteredBusinesses.length} résultat{filteredBusinesses.length > 1 ? "s" : ""}
                </p>
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
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
        </div>
      </section>

      <DynamicLabelSections pageType="neighborhood" />
      <Footer />
    </div>
  );
};

export default NeighborhoodPage;
