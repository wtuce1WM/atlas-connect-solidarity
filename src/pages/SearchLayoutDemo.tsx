import { useEffect, useState, useMemo, useRef } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BusinessCard, {
  type BusinessCardData,
  type Gamme,
  type Badge,
  type SubcategoryRef,
  type BadgeSubcategoryRef,
} from "@/components/BusinessCard";
import { ChevronLeft, ChevronRight, Grid3X3, List, Star, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { isCurrentlyOpen, type DayHoursData } from "@/lib/formatOpeningHours";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

const QUERIES = [
  "passer la nuit à marrakech",
  "manger à marrakech",
  "restaurant à marrakech",
  "acheter du poisson à marrakech",
  "faire la fête ce soir",
  "aller à la piscine",
  "louer une maison",
  "faire la fête cet après-midi",
  "acheter du vin",
  "boire du vin",
  "faire un massage",
  "acheter un tapis",
  "acheter des fleurs",
  "jouer au tennis",
];

/* ─── Compact List Item ─── */
const CompactListItem = ({
  business,
  gammes,
}: {
  business: BusinessCardData;
  gammes: Gamme[];
}) => {
  const gamme = business.gamme_id ? gammes.find((g) => g.id === business.gamme_id) : null;
  const rating = (business as any).computed_rating ?? business.rating ?? null;
  const totalReviews = (business as any).total_review_count ?? 0;
  const imgSrc = business.images?.[0] || business.logo_url || "/placeholder.svg";
  const isLogo = !business.images?.length && !!business.logo_url;

  const openingHoursTyped = (business.opening_hours as Record<string, DayHoursData>) || null;
  const canShowOpen = !!business.show_opening_hours || !!business.is_open_24h;
  const isOpen = canShowOpen && (
    !!business.is_open_24h || (() => {
      if (!openingHoursTyped) return false;
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      return isCurrentlyOpen(openingHoursTyped[days[new Date().getDay()]]);
    })()
  );

  return (
    <Link to={businessUrl(business)} className="group">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-md">
        {/* Thumbnail */}
        <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${isLogo ? "bg-white" : "bg-muted"}`}>
          <img
            src={imgSrc}
            alt={business.name}
            className={`w-full h-full ${isLogo ? "object-contain p-1" : "object-cover"}`}
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {business.name}
            </h4>
            {business.wtuce_status === "verified" && (
              <img src={logoWatermark} alt="" className="w-4 h-4 object-contain opacity-80" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {business.categories?.[0] && (
              <UiBadge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gold text-gold-foreground">
                {business.categories[0]}
              </UiBadge>
            )}
            {gamme && (
              <UiBadge
                className="text-[10px] px-1.5 py-0 border border-black"
                style={{ backgroundColor: gamme.color_hex || "#666", color: gamme.text_color_hex || "#000" }}
              >
                {gamme.name_fr}
              </UiBadge>
            )}
            {canShowOpen && (
              <span className={`text-[10px] font-medium ${isOpen ? "text-[#25D366]" : "text-muted-foreground"}`}>
                {isOpen ? (business.is_open_24h ? "24h" : "Ouvert") : "Fermé"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {(business.city || business.neighborhood) && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3" />
                {business.neighborhood ? `${business.city}, ${business.neighborhood}` : `${business.city}, ${business.region}`}
              </span>
            )}
            {business.phone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-3 w-3" />
                {business.phone}
              </span>
            )}
          </div>
        </div>
        {/* Rating */}
        {rating && (
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="text-gold font-semibold text-sm">{rating}/20</span>
            </div>
            {totalReviews > 0 && (
              <span className="text-[10px] text-muted-foreground">{totalReviews} avis</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

/* ─── Horizontal Carousel ─── */
const HorizontalCarousel = ({
  businesses,
  gammes,
  badges,
  subcategories,
  badgeSubcategories,
  title,
}: {
  businesses: BusinessCardData[];
  gammes: Gamme[];
  badges: Badge[];
  subcategories: SubcategoryRef[];
  badgeSubcategories: BadgeSubcategoryRef[];
  title?: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => { checkScroll(); }, [businesses]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {title && <h3 className="text-lg font-bold text-foreground mb-3">{title}</h3>}
      <div className="relative group/carousel">
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {businesses.map((b) => (
            <div key={b.id} className="w-[280px] flex-shrink-0 snap-start">
              <BusinessCard
                business={b}
                gammes={gammes}
                badges={badges}
                subcategories={subcategories}
                badgeSubcategories={badgeSubcategories}
                verifiedLabel="Vérifié"
              />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const SearchLayoutDemo = () => {
  const [query, setQuery] = useState(QUERIES[0]);
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listView, setListView] = useState(false);
  const [miniPage, setMiniPage] = useState(1);
  const MINI_PER_PAGE = 8;

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
        const [searchRes, gammesRes, badgesRes, subcatsRes, bsRes] = await Promise.all([
          supabase.functions.invoke("business-search", {
            body: { query, limit: 60, mode: "fulltext" },
        }),
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
        supabase.from("badges").select("id, name_fr, color_hex, text_color_hex"),
        supabase.from("subcategories").select("id, name_fr, sort_order"),
        supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      ]);
      if (gammesRes.data) setGammes(gammesRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (bsRes.data) setBadgeSubcategories(bsRes.data);
      if (searchRes.data?.businesses) {
        setBusinesses(searchRes.data.businesses.map((b: any) => ({
          ...b,
          show_opening_hours: b.show_opening_hours ?? false,
        })));
      }
      setIsLoading(false);
    };
    fetchAll();
    setMiniPage(1);
  }, [query]);

  // Group by primary category
  const grouped = useMemo(() => {
    const groups: Record<string, BusinessCardData[]> = {};
    for (const b of businesses) {
      const cat = b.categories?.[0] || "Autre";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [businesses]);

  const miniPageTotal = Math.ceil(businesses.length / MINI_PER_PAGE);
  const miniPaged = businesses.slice((miniPage - 1) * MINI_PER_PAGE, miniPage * MINI_PER_PAGE);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
        </div>
      </div>
    );
  }

  const sectionHeader = (num: number, title: string, desc: string) => (
    <div className="mb-6 border-l-4 border-gold pl-4">
      <h2 className="text-2xl font-bold text-foreground">
        Option {num} — {title}
      </h2>
      <p className="text-muted-foreground text-sm mt-1">{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Démo — Affichage des résultats de Search
          </h1>
          <p className="text-muted-foreground">
            Requête : <span className="text-gold font-semibold">« {query} »</span> — {businesses.length} résultats
          </p>
          <div className="mt-4 flex justify-center">
            <Select value={query} onValueChange={setQuery}>
              <SelectTrigger className="w-[340px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUERIES.map((q) => (
                  <SelectItem key={q} value={q}>« {q} »</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── OPTION 1: Carrousel horizontal ── */}
        <section className="mb-16">
          {sectionHeader(1, "Carrousel horizontal", "Tous les résultats sur une seule ligne scrollable, style Netflix.")}
          <HorizontalCarousel
            businesses={businesses}
            gammes={gammes}
            badges={badges}
            subcategories={subcategories}
            badgeSubcategories={badgeSubcategories}
          />
        </section>

        {/* ── OPTION 2: Groupement par catégorie ── */}
        <section className="mb-16">
          {sectionHeader(2, "Groupement par catégorie", "Les résultats sont séparés par sous-catégorie, chacun avec son propre carrousel.")}
          <div className="space-y-8">
            {grouped.map(([category, items]) => (
              <HorizontalCarousel
                key={category}
                title={`${category} (${items.length})`}
                businesses={items}
                gammes={gammes}
                badges={badges}
                subcategories={subcategories}
                badgeSubcategories={badgeSubcategories}
              />
            ))}
          </div>
        </section>

        {/* ── OPTION 3: Toggle Grille / Liste ── */}
        <section className="mb-16">
          {sectionHeader(3, "Toggle Grille / Liste", "L'utilisateur peut basculer entre la grille classique et une vue liste compacte.")}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={!listView ? "default" : "outline"}
              size="sm"
              onClick={() => setListView(false)}
              className="gap-1.5"
            >
              <Grid3X3 className="h-4 w-4" />
              Grille
            </Button>
            <Button
              variant={listView ? "default" : "outline"}
              size="sm"
              onClick={() => setListView(true)}
              className="gap-1.5"
            >
              <List className="h-4 w-4" />
              Liste
            </Button>
          </div>
          {listView ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {businesses.map((b) => (
                <CompactListItem key={b.id} business={b} gammes={gammes} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[700px] overflow-y-auto pr-1">
              {businesses.map((b) => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  gammes={gammes}
                  badges={badges}
                  subcategories={subcategories}
                  badgeSubcategories={badgeSubcategories}
                  verifiedLabel="Vérifié"
                />
              ))}
            </div>
          )}
        </section>

        {/* ── OPTION 4: Pagination réduite ── */}
        <section className="mb-16">
          {sectionHeader(4, "Pagination réduite (8 par page)", "Même grille mais avec seulement 8 résultats par page au lieu de 20.")}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {miniPaged.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                gammes={gammes}
                badges={badges}
                subcategories={subcategories}
                badgeSubcategories={badgeSubcategories}
                verifiedLabel="Vérifié"
              />
            ))}
          </div>
          {miniPageTotal > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={miniPage <= 1}
                onClick={() => setMiniPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {miniPage} / {miniPageTotal}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={miniPage >= miniPageTotal}
                onClick={() => setMiniPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default SearchLayoutDemo;
