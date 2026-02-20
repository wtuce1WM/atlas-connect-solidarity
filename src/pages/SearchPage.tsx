import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoriesCarouselSection from "@/components/CategoriesCarouselSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, MicOff, Loader, MapPin, MapPinOff, X } from "lucide-react";
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

const isSosMedecinQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("sos médecin") ||
    normalized.includes("sos medecin") ||
    normalized.includes("sos docteur") ||
    normalized.includes("besoin d'un docteur") ||
    normalized.includes("besoin d un docteur") ||
    normalized.includes("besoin d'un médecin") ||
    normalized.includes("besoin d un medecin") ||
    normalized.includes("médecin urgence") ||
    normalized.includes("medecin urgence") ||
    normalized.includes("docteur urgence") ||
    normalized.includes("urgence médicale") ||
    normalized.includes("urgence medicale") ||
    normalized.includes("appeler un médecin") ||
    normalized.includes("appeler un medecin") ||
    normalized.includes("appeler un docteur") ||
    normalized.includes("je suis malade") ||
    normalized.includes("mal en point")
  );
};

const isPompiersQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("pompier") ||
    normalized.includes("incendie") ||
    normalized.includes("feu de") ||
    normalized.includes("il y a le feu") ||
    normalized.includes("ça brûle") ||
    normalized.includes("ca brule") ||
    normalized.includes("tout brûle") ||
    normalized.includes("maison en feu") ||
    normalized.includes("voiture en feu") ||
    normalized.includes("feu de forêt") ||
    normalized.includes("feu de foret") ||
    normalized.includes("appeler les pompiers") ||
    normalized.includes("sapeurs") ||
    normalized.includes("brigade") ||
    normalized.includes("protection civile feu")
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

const CelebrityEntry = ({ name, desc, id }: { name: string; desc: string; id?: string }) => (
  <div className="flex gap-3">
    {id ? (
      <Link
        to={`/business/${id}`}
        className="text-gold font-semibold text-sm min-w-[160px] shrink-0 hover:text-gold/70 underline underline-offset-2 decoration-gold/40 transition-colors"
      >
        {name} ↗
      </Link>
    ) : (
      <span className="text-gold/50 font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
    )}
    <span className="text-white/60 text-sm">{desc}</span>
  </div>
);

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
          <CelebrityEntry name="La Mamounia" id="3bb71910-c17e-4ce1-a130-42c369a645a7" desc="Le grand classique — jardins légendaires, histoire glamour, incontournable du Festival du Film." />
          <CelebrityEntry name="Royal Mansour" id="0961b2f5-c259-483a-b877-3d251acdbbd9" desc="Ultra-exclusif — chaque client dans son propre riad privé. Intimité maximale." />
          <CelebrityEntry name="Amanjena" id="e7019579-408a-4b3c-90d7-41c6dbff9063" desc="Refuge de stars en quête de calme absolu. Minimalisme chic, loin de l'agitation." />
          <CelebrityEntry name="Mandarin Oriental" id="590225e3-0887-4d79-a8f6-571ac148cca5" desc="Villas avec piscines privées, spa d'exception, discrétion totale." />
          <CelebrityEntry name="El Fenn" id="641ab942-63a5-499e-999a-e09915b1d02f" desc="Bohème & arty. Rooftop mythique, clientèle mode et cinéma." />
          <CelebrityEntry name="Selman Marrakech" id="5b09bebd-7cb5-4698-b447-bf5f198811f4" desc="Chic contemporain, haras privé de chevaux arabes, atmosphère glamour." />
          <CelebrityEntry name="Riad Kniza" id="307aa4e4-03b7-4006-808c-6df07c6b5eab" desc="Riad de charme discret, prisé par les célébrités en quête d'authenticité et de confidentialité en médina." />
        </div>
      </div>

      {/* Restaurants */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🍽️ Où dînent les célébrités</p>
        <div className="space-y-2">
          <CelebrityEntry name="Nobu Marrakech" id="c5a21f81-94fc-4b5e-8f89-822a43dabdec" desc="Cuisine japonaise iconique, rooftop vibrant, clientèle ultra-glam." />
          <CelebrityEntry name="Dar Yacout" id="da42a132-4948-4c5f-afa3-f0b37df6811e" desc="Institution marocaine théâtrale. Stars du cinéma et invités du Festival adorent." />
          <CelebrityEntry name="Restaurant Le Jardin" id="c6af063a-0636-4746-bd14-50060721e5f5" desc="Déjeuner chic et discret dans un riad végétal. Très apprécié des artistes." />
          <CelebrityEntry name="Rooftop Bar El Fenn" id="d04e2a2b-faa4-4675-b861-c8f90df30c7f" desc="Arty, solaire, intime. Un repaire créatif pour les célébrités low profile." />
        </div>
      </div>

      {/* Nightlife */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌙 Où elles sortent la nuit</p>
        <div className="space-y-2">
          <CelebrityEntry name="Theatro Marrakech" id="be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d" desc="Le club iconique — shows spectaculaires, DJ internationaux, ambiance VIP." />
          <CelebrityEntry name="So Lounge" desc="Glamour chic en Palmeraie, parfait pour soirées sélectes." />
          <CelebrityEntry name="Comptoir Darna" id="21dfaabb-56fe-4da0-9942-34b2803465cf" desc="Dîner-spectacle, danse orientale et jazz lounge. Très apprécié du cinéma français." />
          <CelebrityEntry name="555 Famous Club" desc="Ambiance internationale, soirées tardives, clientèle people." />
        </div>
      </div>
    </div>

    <div className="px-6 py-3 border-t border-gold/20 bg-gold/5">
      <p className="text-white/30 text-xs italic">Présence maximale : janvier–février (Couture Week), mai (Festival du Film), décembre–janvier.</p>
    </div>
  </div>
);

// IDs des établissements du guide célébrités (dans l'ordre d'affichage souhaité)
const CELEBRITY_IDS = [
  "3bb71910-c17e-4ce1-a130-42c369a645a7", // La Mamounia
  "0961b2f5-c259-483a-b877-3d251acdbbd9", // Royal Mansour
  "e7019579-408a-4b3c-90d7-41c6dbff9063", // Amanjena
  "590225e3-0887-4d79-a8f6-571ac148cca5", // Mandarin Oriental
  "641ab942-63a5-499e-999a-e09915b1d02f", // Boutique El Fenn
  "5b09bebd-7cb5-4698-b447-bf5f198811f4", // Selman Marrakech
  "307aa4e4-03b7-4006-808c-6df07c6b5eab", // Riad Kniza
  "c5a21f81-94fc-4b5e-8f89-822a43dabdec", // Nobu Marrakech
  "da42a132-4948-4c5f-afa3-f0b37df6811e", // Dar Yacout
  "c6af063a-0636-4746-bd14-50060721e5f5", // Restaurant Le Jardin
  "d04e2a2b-faa4-4675-b861-c8f90df30c7f", // Rooftop Bar El Fenn
  "be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d", // Theatro Marrakech
  "21dfaabb-56fe-4da0-9942-34b2803465cf", // Comptoir Darna
];

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
  const categoryFromUrl = searchParams.get("category") || "";
  const [celebrityBusinesses, setCelebrityBusinesses] = useState<Business[]>([]);

  const spokenText = searchParams.get("spoken") || "";

  const geo = useGeolocation();

  // Auto-select city when geolocation detects one
  useEffect(() => {
    if (geo.isEnabled && geo.detectedCity && selectedCity === "all") {
      setSelectedCity(geo.detectedCity);
    }
  }, [geo.isEnabled, geo.detectedCity]);

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
    return computeWeightedRatingOn20(collectRatingSources(b));
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
      if (!searchQuery.trim() && !categoryFromUrl) {
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
            query: searchQuery.trim() || undefined,
            category: categoryFromUrl || undefined,
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
  }, [searchQuery, categoryFromUrl, language]);

  // Fetch celebrity businesses on mount (used when celebrity query detected)
  useEffect(() => {
    supabase
      .from("businesses")
      .select("*")
      .in("id", CELEBRITY_IDS)
      .then(({ data }) => {
        if (data) {
          // Preserve the manual ordering from CELEBRITY_IDS
          const ordered = CELEBRITY_IDS
            .map(id => data.find(b => b.id === id))
            .filter(Boolean)
            .map(b => ({ ...b, distance_km: null })) as Business[];
          setCelebrityBusinesses(ordered);
        }
      });
  }, []);


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

  const navigate = useNavigate();

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
  };

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  const showZitounEasterEgg = !isLoading && isZitounMask(spokenText || searchQuery);
  const showCelebrityGuide = !isLoading && isCelebrityQuery(spokenText || searchQuery);
  const showSosMedecin = isSosMedecinQuery(spokenText || searchQuery);
  const showPompiers = isPompiersQuery(spokenText || searchQuery);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Geolocation consent banner */}
      {geo.showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto bg-card border border-gold/30 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {language === "en" ? "Use your location to see nearby results?" : language === "ar" ? "استخدم موقعك لعرض النتائج القريبة؟" : "Utiliser votre position pour affiner les résultats ?"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "en" ? "You can change this anytime." : language === "ar" ? "يمكنك تغيير هذا في أي وقت." : "Vous pouvez changer ce choix à tout moment."}
              </p>
            </div>
            <button onClick={geo.dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <Button variant="ghost" size="sm" onClick={geo.decline} className="text-muted-foreground">
              {language === "en" ? "No thanks" : language === "ar" ? "لا شكرا" : "Non merci"}
            </Button>
            <Button size="sm" onClick={geo.accept} className="bg-gold text-black hover:bg-gold/90">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {language === "en" ? "Enable" : language === "ar" ? "تفعيل" : "Activer"}
            </Button>
          </div>
        </div>
      )}
      
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

          {(searchQuery || categoryFromUrl) && (
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                {searchQuery ? (
                  <>{t.searchResults} {t.for} "<span className="text-gold">{spokenText || searchQuery}</span>"</>
                ) : (() => {
                  const categoryLabels: Record<string, { fr: string; en: string; ar: string }> = {
                    "Hôtellerie": { fr: "Hôtels", en: "Hotels", ar: "الفنادق" },
                    "Restauration": { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
                    "Tourisme": { fr: "Activités & Tourisme", en: "Activities & Tourism", ar: "الأنشطة والسياحة" },
                    "Commerce": { fr: "Commerce & Shopping", en: "Shopping", ar: "التسوق" },
                    "Bien-être": { fr: "Bien-être & Spa", en: "Wellness & Spa", ar: "العافية والسبا" },
                    "Santé": { fr: "Santé", en: "Health", ar: "الصحة" },
                    "Culture": { fr: "Culture", en: "Culture", ar: "الثقافة" },
                    "Transport": { fr: "Transport", en: "Transport", ar: "النقل" },
                    "Sport & Loisirs": { fr: "Sport & Loisirs", en: "Sports & Leisure", ar: "الرياضة والترفيه" },
                  };
                  const label = categoryLabels[categoryFromUrl];
                  const catName = label
                    ? (language === "en" ? label.en : language === "ar" ? label.ar : label.fr)
                    : categoryFromUrl;
                  const prefix = language === "en" ? "Best" : language === "ar" ? "أفضل" : "Meilleurs";
                  const suffix = language === "en" ? "in Morocco" : language === "ar" ? "في المغرب" : "au Maroc";
                  return <><span className="text-gold">{prefix} {catName}</span> {suffix}</>;
                })()}
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
          {/* Filters: City + Geo toggle */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            {/* Geo toggle */}
            <button
              onClick={geo.toggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                geo.isEnabled
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-card text-muted-foreground border border-border hover:border-gold/30"
              }`}
              title={geo.isEnabled ? "Désactiver la géolocalisation" : "Activer la géolocalisation"}
            >
              {geo.isDetecting ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : geo.isEnabled ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <MapPinOff className="h-3.5 w-3.5" />
              )}
              {geo.isDetecting
                ? (language === "en" ? "Detecting..." : "Détection...")
                : geo.isEnabled && geo.detectedCity
                ? `📍 ${geo.detectedCity}`
                : geo.isEnabled
                ? (language === "en" ? "No city nearby" : "Aucune ville proche")
                : (language === "en" ? "Location off" : "Position désactivée")
              }
            </button>

            {/* City filter dropdown */}
            {availableCities.length > 1 && (
              <>
                <label className="text-sm text-muted-foreground">{t.filterByCity}:</label>
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
              </>
            )}
          </div>

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
          {showCelebrityGuide && (
            <>
              <CelebrityGuide />
              {celebrityBusinesses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                  {celebrityBusinesses.map((business) => (
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
              )}
            </>
          )}

          {/* Easter egg: SOS Médecin */}
          {showSosMedecin && (
            <div className="max-w-lg mx-auto mb-10 rounded-2xl overflow-hidden border border-red-500/40 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
              <div className="px-6 py-5 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
                <p className="text-red-400 font-semibold text-lg flex items-center gap-2">
                  🚨 SOS Médecin — Numéros d'urgence au Maroc
                </p>
                <p className="text-white/50 text-sm mt-0.5">Appelez immédiatement si besoin d'aide médicale</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <a href="tel:150" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Pompiers / Secours</p>
                    <p className="text-white/40 text-xs">Incendie, accidents, sauvetage</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">150</span>
                </a>
                <a href="tel:190" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Protection Civile</p>
                    <p className="text-white/40 text-xs">Secours et premiers soins</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">190</span>
                </a>
                <a href="tel:19" className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 hover:bg-blue-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Police Secours</p>
                    <p className="text-white/40 text-xs">Urgences police</p>
                  </div>
                  <span className="text-blue-400 font-bold text-2xl group-hover:scale-110 transition-transform">19</span>
                </a>
                <a href="tel:177" className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 hover:bg-yellow-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Gendarmerie Royale</p>
                    <p className="text-white/40 text-xs">Zones rurales et périurbaines</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-2xl group-hover:scale-110 transition-transform">177</span>
                </a>
              </div>
              <div className="px-6 py-3 border-t border-red-500/20 bg-red-500/5">
                <p className="text-white/30 text-xs italic">En cas d'urgence grave, composez le 150 (SAMU) ou rendez-vous aux urgences de l'hôpital le plus proche.</p>
              </div>
            </div>
          )}

          {/* Easter egg: Pompiers */}
          {showPompiers && (
            <div className="max-w-lg mx-auto mb-10 rounded-2xl overflow-hidden border border-orange-500/40 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
              <div className="px-6 py-5 border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent">
                <p className="text-orange-400 font-semibold text-lg flex items-center gap-2">
                  🔥 Pompiers — Numéros d'urgence au Maroc
                </p>
                <p className="text-white/50 text-sm mt-0.5">Appelez immédiatement en cas d'incendie ou de danger</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <a href="tel:150" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Sapeurs-Pompiers</p>
                    <p className="text-white/40 text-xs">Incendie, secours et sauvetage</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">150</span>
                </a>
                <a href="tel:190" className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 hover:bg-red-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Protection Civile</p>
                    <p className="text-white/40 text-xs">Secours d'urgence et catastrophes</p>
                  </div>
                  <span className="text-red-400 font-bold text-2xl group-hover:scale-110 transition-transform">190</span>
                </a>
                <a href="tel:19" className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 hover:bg-blue-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Police Secours</p>
                    <p className="text-white/40 text-xs">Urgences police</p>
                  </div>
                  <span className="text-blue-400 font-bold text-2xl group-hover:scale-110 transition-transform">19</span>
                </a>
                <a href="tel:177" className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 hover:bg-yellow-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Gendarmerie Royale</p>
                    <p className="text-white/40 text-xs">Zones rurales et périurbaines</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-2xl group-hover:scale-110 transition-transform">177</span>
                </a>
              </div>
              <div className="px-6 py-3 border-t border-orange-500/20 bg-orange-500/5">
                <p className="text-white/30 text-xs italic">En cas d'incendie, évacuez immédiatement et composez le 15. N'essayez pas d'éteindre un feu important seul.</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
            </div>
          ) : filteredBusinesses.length === 0 && !showZitounEasterEgg && !showCelebrityGuide && !showSosMedecin && !showPompiers ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">{t.noResults}</p>
              <p className="text-sm text-gray-500">{t.tryAnother}</p>
            </div>
          ) : !showCelebrityGuide && !showSosMedecin && !showPompiers && filteredBusinesses.length > 0 ? (
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
