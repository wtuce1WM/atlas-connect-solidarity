import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";

interface StrictSubcategory {
  subcategory_id: string;
  subcategory_name: string;
}

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
  services: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  getyourguide_rating: number | null;
  getyourguide_review_count: number | null;
  viator_rating: number | null;
  viator_review_count: number | null;
  opening_hours: any;
  is_open_24h: boolean;
  vacation_dates: any;
  priority_score: number | null;
  gamme_id: string | null;
  badge_id: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  is_featured: boolean | null;
  is_master: boolean;
  booking_url: string | null;
  reserve_now_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tripadvisor_url: string | null;
  default_service: string | null;
  show_opening_hours: boolean | null;
  neighborhood: string | null;
  email: string | null;
  [key: string]: any;
}

/* ── Grouped row (same as SearchPage) ── */
const GroupedSubcategoryRow = ({
  subcategory,
  businesses,
  gammes,
  badges,
  subcategories: subcategoriesRef,
  badgeSubcategories,
}: {
  subcategory: string;
  businesses: Business[];
  gammes: Gamme[];
  badges: Badge[];
  subcategories: SubcategoryRef[];
  badgeSubcategories: BadgeSubcategoryRef[];
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, businesses.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-foreground">{subcategory}</h2>
        <span className="text-sm text-muted-foreground">({businesses.length})</span>
        <div className="flex-1 h-px bg-border" />
        {(canScrollLeft || canScrollRight) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {businesses.map((business) => (
          <div key={business.id} className="snap-start shrink-0 w-[280px] sm:w-[300px]">
            <BusinessCard
              business={business as unknown as BusinessCardData}
              gammes={gammes}
              badges={badges}
              subcategories={subcategoriesRef}
              badgeSubcategories={badgeSubcategories}
              verifiedLabel="Vérifié"
              distanceKm={null}
              activeTimeSlot={null}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const StrictModePage = () => {
  const [strictSubs, setStrictSubs] = useState<StrictSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  // Reference data for BusinessCard
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategoriesRef, setSubcategoriesRef] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);

  // Fetch strict subcategories + reference data
  useEffect(() => {
    const fetchAll = async () => {
      const [configsRes, gammesRes, badgesRes, subsRes, bsRes] = await Promise.all([
        supabase
          .from("subcategory_search_config")
          .select("subcategory_id, search_mode")
          .eq("search_mode", "strict"),
        supabase.from("gammes").select("*"),
        supabase.from("badges").select("*"),
        supabase.from("subcategories" as any).select("id, name_fr, name_en, name_ar, category_id"),
        supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      ]);

      // Gammes, badges, subcategories ref
      if (gammesRes.data) setGammes(gammesRes.data as Gamme[]);
      if (badgesRes.data) setBadges(badgesRes.data as Badge[]);
      if (subsRes.data) setSubcategoriesRef(subsRes.data as unknown as SubcategoryRef[]);
      if (bsRes.data) setBadgeSubcategories(bsRes.data as BadgeSubcategoryRef[]);

      // Build strict list
      const configs = configsRes.data || [];
      const subIds = configs.map(c => c.subcategory_id);
      const subsMap = new Map(
        ((subsRes.data as any[]) || []).map((s: any) => [s.id, s.name_fr])
      );

      const result: StrictSubcategory[] = configs
        .map(c => ({
          subcategory_id: c.subcategory_id,
          subcategory_name: subsMap.get(c.subcategory_id) || "Inconnu",
        }))
        .filter(s => subIds.includes(s.subcategory_id))
        .sort((a, b) => a.subcategory_name.localeCompare(b.subcategory_name, "fr"));

      setStrictSubs(result);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Search when query selected
  useEffect(() => {
    if (!selectedQuery) {
      setBusinesses([]);
      setSearchMeta(null);
      return;
    }

    const doSearch = async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("business-search", {
          body: { query: selectedQuery, limit: 200, language: "fr" },
        });

        if (error) {
          console.error("Search error:", error);
          setBusinesses([]);
          setSearchMeta(null);
        } else {
          setBusinesses(data?.businesses || []);
          setSearchMeta({
            detectedCity: data?.detectedCity,
            detectedSubcategory: data?.detectedSubcategory,
            detectedNeighborhood: data?.detectedNeighborhood,
            searchLevel: data?.searchLevel,
            totalResults: data?.businesses?.length || 0,
          });
        }
      } catch (e) {
        console.error(e);
      }
      setSearching(false);
    };
    doSearch();
  }, [selectedQuery]);

  // Group businesses by primary subcategory
  const groupedBusinesses = useMemo(() => {
    if (businesses.length === 0) return null;

    const groups: Record<string, Business[]> = {};
    for (const b of businesses) {
      const primary = b.categories?.[0] || "Autre";
      if (!groups[primary]) groups[primary] = [];
      groups[primary].push(b);
    }

    const keys = Object.keys(groups);
    // Sort: most results first
    const sortedKeys = keys.sort((a, b) => (groups[b]?.length || 0) - (groups[a]?.length || 0));
    return sortedKeys.map(key => ({ subcategory: key, businesses: groups[key] }));
  }, [businesses]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-['Playfair_Display'] italic">
            Mode Strict
          </h1>
          <p className="text-white/60 mt-2">
            Toutes les sous-catégories configurées en mode strict — sélectionnez pour visualiser les résultats.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : strictSubs.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">
            Aucune sous-catégorie en mode strict.
          </p>
        ) : (
          <>
            {/* Dropdown */}
            <div className="max-w-md mb-8">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Requête strict ({strictSubs.length})
              </label>
              <Select
                value={selectedQuery || ""}
                onValueChange={(v) => setSelectedQuery(v || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez une sous-catégorie…" />
                </SelectTrigger>
                <SelectContent>
                  {strictSubs.map((s) => (
                    <SelectItem key={s.subcategory_id} value={s.subcategory_name}>
                      {s.subcategory_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search metadata */}
            {searchMeta && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                <div className="flex flex-wrap gap-4">
                  <span><strong>Requête :</strong> {selectedQuery}</span>
                  <span><strong>Résultats :</strong> {searchMeta.totalResults}</span>
                  {searchMeta.detectedCity && (
                    <span><strong>Ville :</strong> {searchMeta.detectedCity}</span>
                  )}
                  {searchMeta.detectedSubcategory && (
                    <span><strong>Sous-catégorie :</strong> {searchMeta.detectedSubcategory}</span>
                  )}
                  {searchMeta.searchLevel && (
                    <span><strong>Niveau :</strong> {searchMeta.searchLevel}</span>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {searching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : groupedBusinesses && groupedBusinesses.length > 0 ? (
              <div className="space-y-10">
                {groupedBusinesses.map((group) => (
                  <GroupedSubcategoryRow
                    key={group.subcategory}
                    subcategory={group.subcategory}
                    businesses={group.businesses}
                    gammes={gammes}
                    badges={badges}
                    subcategories={subcategoriesRef}
                    badgeSubcategories={badgeSubcategories}
                  />
                ))}
              </div>
            ) : selectedQuery && !searching ? (
              <p className="text-center py-12 text-muted-foreground">
                Aucun résultat pour « {selectedQuery} »
              </p>
            ) : null}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default StrictModePage;
