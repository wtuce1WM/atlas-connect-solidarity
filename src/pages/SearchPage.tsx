import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, MicOff, Loader } from "lucide-react";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address?: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  gamme_id: string | null;
  google_rating?: number | null;
  tripadvisor_rating?: number | null;
  restaurant_guru_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
}

const ITEMS_PER_PAGE = 20;

const isZitounMask = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("zitoun mask") ||
    normalized.includes("zitoun musk") ||
    normalized.includes("zitoun mas") ||
    normalized.includes("zitoun mus")
  );
};

const isCelebrityQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("célébrité") ||
    normalized.includes("celebrite") ||
    normalized.includes("célébrités") ||
    normalized.includes("star ") ||
    normalized.includes("stars ") ||
    normalized.includes("people marrakech") ||
    normalized.includes("vip marrakech") ||
    normalized.includes("famous") ||
    normalized.includes("personnalité")
  );
};

const CelebrityGuide = () => (
  <div className="max-w-2xl mx-auto mb-10 rounded-2xl overflow-hidden border border-gold/30 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
    <div className="px-6 py-5 border-b border-gold/20 bg-gradient-to-r from-gold/10 to-transparent">
      <p className="text-gold font-semibold text-lg">👑 Guide insider — Célébrités à Marrakech</p>
      <p className="text-white/50 text-sm mt-0.5">Palaces, tables & nuits — les adresses qui font la légende</p>
    </div>

    <div className="px-6 py-5 space-y-5">
      {/* Hotels */}
      <div>
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌴 Palaces iconiques</p>
        <div className="space-y-2">
          {[
            { name: "La Mamounia", desc: "Le grand classique — jardins légendaires, histoire glamour, incontournable du Festival du Film." },
            { name: "Royal Mansour", desc: "Ultra-exclusif — chaque client dans son propre riad privé. Intimité maximale." },
            { name: "Amanjena", desc: "Refuge de stars en quête de calme absolu. Minimalisme chic, loin de l'agitation." },
            { name: "Mandarin Oriental", desc: "Villas avec piscines privées, spa d'exception, discrétion totale." },
            { name: "El Fenn", desc: "Bohème & arty. Rooftop mythique, clientèle mode et cinéma." },
            { name: "Selman Marrakech", desc: "Chic contemporain, haras privé de chevaux arabes, atmosphère glamour." },
          ].map(({ name, desc }) => (
            <div key={name} className="flex gap-3">
              <span className="text-gold font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
              <span className="text-white/60 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Restaurants */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🍽️ Où dînent les célébrités</p>
        <div className="space-y-2">
          {[
            { name: "Nobu Marrakech", desc: "Cuisine japonaise iconique, rooftop vibrant, clientèle ultra-glam." },
            { name: "Dar Yacout", desc: "Institution marocaine théâtrale. Stars du cinéma et invités du Festival adorent." },
            { name: "Le Jardin", desc: "Déjeuner chic et discret dans un riad végétal. Très apprécié des artistes." },
            { name: "El Fenn Rooftop", desc: "Arty, solaire, intime. Un repaire créatif pour les célébrités low profile." },
          ].map(({ name, desc }) => (
            <div key={name} className="flex gap-3">
              <span className="text-gold font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
              <span className="text-white/60 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nightlife */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌙 Où elles sortent la nuit</p>
        <div className="space-y-2">
          {[
            { name: "Theatro", desc: "Le club iconique — shows spectaculaires, DJ internationaux, ambiance VIP." },
            { name: "So Lounge", desc: "Glamour chic en Palmeraie, parfait pour soirées sélectes." },
            { name: "Le Comptoir Darna", desc: "Dîner-spectacle, danse orientale et jazz lounge. Très apprécié du cinéma français." },
            { name: "555 Famous Club", desc: "Ambiance internationale, soirées tardives, clientèle people." },
          ].map(({ name, desc }) => (
            <div key={name} className="flex gap-3">
              <span className="text-gold font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
              <span className="text-white/60 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="px-6 py-3 border-t border-gold/20 bg-gold/5">
      <p className="text-white/30 text-xs italic">Présence maximale : janvier–février (Couture Week), mai (Festival du Film), décembre–janvier.</p>
    </div>
  </div>
);

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [searchLevel, setSearchLevel] = useState<string>("");
  const [searchMessage, setSearchMessage] = useState<string>("");
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number }[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");

  const spokenText = searchParams.get("spoken") || "";

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (keywords, spoken) => {
      setInputValue(keywords);
      setSearchQuery(keywords);
      setSearchParams({ q: keywords, spoken });
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });

  // Get cities available in results, sorted by priority score
  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

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

  // Filter businesses by city — preserve LLM ranking order from the API
  const filteredBusinesses = useMemo(() => {
    if (selectedCity === "all") return allBusinesses;
    return allBusinesses.filter(b => b.city === selectedCity);
  }, [allBusinesses, selectedCity]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, searchQuery]);

  // Fetch gammes, badges, subcategories, badge_subcategories on mount
  useEffect(() => {
    Promise.all([
      supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("id, name_fr"),
      supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
    ]).then(([gammesRes, badgesRes, subcatsRes, badgeSubcatsRes]) => {
      if (gammesRes.data) setGammes(gammesRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!searchQuery.trim()) {
        setAllBusinesses([]);
        setSearchMessage("");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch cities with sort_order
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.sort_order || 0 }))
          );
        }

        // Use edge function for full-text search
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: { 
            query: searchQuery.trim(),
            language: language,
            limit: 100
          }
        });

        if (error) throw error;
        
        if (data) {
          setSearchLevel(data.searchLevel || "");
          // Pour la recherche vocale, ne pas afficher le fallback "recommended"
          const isVoiceSearch = !!searchParams.get("spoken");
          if (isVoiceSearch && data.searchLevel === "recommended") {
            setAllBusinesses([]);
            setSearchMessage("");
          } else {
            setAllBusinesses(data.businesses || []);
            setSearchMessage(data.message || "");
          }
        }
      } catch (error) {
        console.error("Error fetching search data:", error);
        setAllBusinesses([]);
        setSearchMessage("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, language]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchQuery(inputValue.trim());
      setSearchParams({ q: inputValue.trim() }); // pas de 'spoken' → recherche manuelle
    }
  };

  const translations = {
    fr: {
      searchResults: "Résultats de recherche",
      for: "pour",
      establishments: "établissements",
      found: "trouvés",
      noResults: "Aucun établissement trouvé",
      tryAnother: "Essayez une autre recherche",
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
      placeholder: "Que cherchez-vous ?"
    },
    en: {
      searchResults: "Search results",
      for: "for",
      establishments: "establishments",
      found: "found",
      noResults: "No establishments found",
      tryAnother: "Try another search",
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
      placeholder: "What are you looking for?"
    },
    ar: {
      searchResults: "نتائج البحث",
      for: "عن",
      establishments: "مؤسسة",
      found: "وجدت",
      noResults: "لم يتم العثور على مؤسسات",
      tryAnother: "جرب بحثًا آخر",
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
      placeholder: "ماذا تبحث عنه؟"
    }
  };

  const t = translations[language] || translations.fr;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  const showZitounEasterEgg = !isLoading && isZitounMask(spokenText || searchQuery);
  const showCelebrityGuide = !isLoading && isCelebrityQuery(spokenText || searchQuery);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black pt-28 pb-8 lg:pb-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-12 pr-14 py-6 text-lg bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full"
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={voiceStatus === "processing"}
                title={voiceStatus === "recording" ? "Arrêter l'enregistrement" : "Recherche vocale"}
                className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                  voiceStatus === "recording"
                    ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/40"
                    : voiceStatus === "processing"
                    ? "bg-gold/20 text-gold cursor-wait"
                    : "bg-gold/10 text-gold hover:bg-gold/20"
                }`}
              >
                {voiceStatus === "processing" ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : voiceStatus === "recording" ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>

          {searchQuery && (
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                {t.searchResults} {t.for} "<span className="text-gold">{spokenText || searchQuery}</span>"
              </h1>
              <p className="text-base lg:text-xl text-muted-foreground">
                {isLoading ? (
                  <span className="text-muted-foreground italic">Recherche en cours…</span>
                ) : (
                  <><span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.found}</>
                )}
              </p>
              {searchMessage && (
                <p className="text-sm text-muted-foreground mt-2 italic">{searchMessage}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-6 lg:py-12 bg-black">
        <div className="container mx-auto px-4">
          {/* City Filter */}
          {availableCities.length > 1 && (
            <div className="mb-8 flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm text-gray-400">{t.filterByCity}:</label>
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-[220px] bg-card border-border">
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

          {/* Easter egg: Zitoun Mask/Musk */}
          {showZitounEasterEgg && (
            <div className="flex flex-col items-center mb-10">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gold/30 max-w-md w-full">
                <img
                  src={zitounMaskImg}
                  alt="Zitoun Mask"
                  className="w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                  <p className="text-gold font-semibold text-lg">Zitoun Mask</p>
                  <p className="text-white/70 text-sm">Le légendaire habitué du Zitoun</p>
                </div>
              </div>
            </div>
          )}

          {/* Easter egg: Celebrity Guide */}
          {showCelebrityGuide && <CelebrityGuide />}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
            </div>
          ) : filteredBusinesses.length === 0 && !showZitounEasterEgg && !showCelebrityGuide ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">{t.noResults}</p>
              <p className="text-sm text-gray-500">{t.tryAnother}</p>
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <>
              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business as BusinessCardData}
                    gammes={gammes}
                    badges={badges}
                    subcategories={subcategories}
                    badgeSubcategories={badgeSubcategories}
                    verifiedLabel={t.verified}
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
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SearchPage;
