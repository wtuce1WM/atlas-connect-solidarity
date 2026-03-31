import { useState, useCallback } from "react";
import { X, Search, Loader2, Calendar, Users, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FallbackPanelData, FallbackHotel } from "@/components/HotelAvailabilityOverlay";

interface SerpApiHotel {
  position: number;
  name: string;
  type: string | null;
  hotelClass: number | null;
  description: string | null;
  link: string | null;
  ratePerNight: { amount: string; currency: string } | null;
  totalRate: { amount: string; currency: string } | null;
  dealDescription: string | null;
  overallRating: number | null;
  reviewCount: number | null;
  amenities: string[];
  thumbnail: string | null;
  images: string[];
}

interface SerpApiHotelOverlayProps {
  currentBusinessId: string;
  serpCity: string;
  businessName: string;
  reserveNowUrl?: string | null;
  onClose: () => void;
  onOpenFallbackPanel?: (data: FallbackPanelData) => void;
}

const SORT_OPTIONS = [
  { value: 3, labelFr: "Le moins cher", labelEn: "Lowest price" },
  { value: 4, labelFr: "Le mieux noté", labelEn: "Highest rated" },
  { value: 13, labelFr: "Le plus populaire", labelEn: "Most popular" },
];

const RATING_OPTIONS = [
  { value: 0, labelFr: "Tous", labelEn: "All" },
  { value: 7, labelFr: "3.5+", labelEn: "3.5+" },
  { value: 8, labelFr: "4.0+", labelEn: "4.0+" },
  { value: 9, labelFr: "4.5+", labelEn: "4.5+" },
];

const SerpApiHotelOverlay = ({ currentBusinessId, serpCity, businessName, reserveNowUrl, onClose, onOpenFallbackPanel }: SerpApiHotelOverlayProps) => {
  const { language } = useLanguage();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultCheckout = new Date(tomorrow);
  defaultCheckout.setDate(defaultCheckout.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(fmt(tomorrow));
  const [checkOut, setCheckOut] = useState(fmt(defaultCheckout));
  const [adults, setAdults] = useState(2);
  const [sort, setSort] = useState(3);
  const [rating, setRating] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const isEn = language === "en";

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]/gi, '').trim();

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch all SerpAPI mappings for this city
      const { data: mappings, error: mapErr } = await supabase
        .from("hotel_mappings")
        .select("id, serp_hotel_name, business_id, city")
        .ilike("city", serpCity);

      if (mapErr) throw mapErr;
      if (!mappings || mappings.length === 0) {
        setError(isEn ? "No mapped hotels found for this city" : "Aucun hôtel référencé trouvé pour cette ville");
        setIsLoading(false);
        return;
      }

      // 2. Call SerpAPI edge function
      const { data, error: fnError } = await supabase.functions.invoke("serpapi-hotels", {
        body: {
          cityName: serpCity,
          checkIn,
          checkOut,
          adults,
          currency,
          sort,
          rating: rating || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          language: language === "en" ? "en" : "fr",
          country: "ma",
          maxPages: 3,
        },
      });

      if (fnError) throw fnError;
      const serpHotels: SerpApiHotel[] = data?.data || [];

      // 3. Get business info for all mapped hotels
      const bizIds = mappings.map(m => m.business_id).filter(Boolean);
      const [{ data: businesses }, { data: gammes }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, skype, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, badge_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, online_shop_url, latitude, longitude, google_maps_url, rating, website")
          .in("id", bizIds),
        supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex"),
      ]);

      const bizMap = new Map((businesses || []).map(b => [b.id, b]));
      const gammeMap = new Map((gammes || []).map(g => [g.id, g]));

      // 4. Build FallbackHotel[] from mapped results
      const hotels: FallbackHotel[] = mappings
        .filter(m => bizMap.has(m.business_id))
        .map(m => {
          const biz = bizMap.get(m.business_id)!;
          const mappingNorm = normalize(m.serp_hotel_name || "");
          const serpMatch = serpHotels.find(r => {
            const rNorm = normalize(r.name);
            if (rNorm === mappingNorm) return true;
            const shorter = rNorm.length < mappingNorm.length ? rNorm : mappingNorm;
            const longer = rNorm.length < mappingNorm.length ? mappingNorm : rNorm;
            return shorter.length >= 8 && longer.includes(shorter);
          });
          const isCurrentHotel = m.business_id === currentBusinessId;
          const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;

          return {
            hotelId: m.id,
            businessId: m.business_id,
            name: biz.name,
            wtuce_status: biz.wtuce_status || undefined,
            offers: [],
            dbImage: biz.images?.[0] || undefined,
            mainImage: serpMatch?.thumbnail || undefined,
            dbGoogleRating: biz.google_rating,
            dbGoogleReviewCount: biz.google_review_count,
            dbTripadvisorRating: biz.tripadvisor_rating,
            dbTripadvisorReviewCount: biz.tripadvisor_review_count,
            serpPrice: serpMatch?.ratePerNight || null,
            reserveNowUrl: isCurrentHotel ? (reserveNowUrl || biz.reserve_now_url) : biz.reserve_now_url,
            manualPriceRange: biz.manual_price_range,
            gamme: gammeInfo ? { name_fr: gammeInfo.name_fr, color_hex: gammeInfo.color_hex, text_color_hex: gammeInfo.text_color_hex } : null,
            isCurrentHotel,
            dealDescription: serpMatch?.dealDescription || null,
            dbBusiness: biz,
          } satisfies FallbackHotel;
        });

      // Deduplicate by business_id – keep the entry that has a serpPrice match
      const deduped = new Map<string, FallbackHotel>();
      for (const h of hotels) {
        const existing = deduped.get(h.businessId!);
        if (!existing || (h.serpPrice && !existing.serpPrice)) {
          deduped.set(h.businessId!, h);
        }
      }
      const uniqueHotels = Array.from(deduped.values());

      // Sort: current hotel first, then those with SerpAPI prices, then rest
      uniqueHotels.sort((a, b) => {
        if (a.isCurrentHotel !== b.isCurrentHotel) return a.isCurrentHotel ? -1 : 1;
        if (!!a.serpPrice !== !!b.serpPrice) return a.serpPrice ? -1 : 1;
        return 0;
      });

      // Push to fallbackPanelData and close overlay
      if (onOpenFallbackPanel) {
        onOpenFallbackPanel({
          hotels: uniqueHotels,
          city: serpCity,
          checkIn,
          checkOut,
          adults,
          source: "serpapi",
          gammes: (gammes || []).map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
    }
  }, [serpCity, checkIn, checkOut, adults, currency, sort, rating, minPrice, maxPrice, language, currentBusinessId, reserveNowUrl, onClose, onOpenFallbackPanel]);

  return (
    <div className="absolute -top-[3.25rem] left-0 right-0 bottom-0 z-[60] bg-background flex flex-col animate-slide-down-from-top">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-foreground" />
        </button>
        <span className="font-semibold text-foreground text-sm truncate">
          {isEn ? "Hotel Prices" : "Prix Hôtels"} — {businessName}
        </span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">SerpAPI</span>
      </div>

      {/* Search params */}
      <div className="px-4 py-3 border-b border-border bg-card/50 space-y-3 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isEn ? "Check-in" : "Arrivée"}
            </label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isEn ? "Check-out" : "Départ"}
            </label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Users className="h-3 w-3" />
              {isEn ? "Adults" : "Adultes"}
            </label>
            <select value={adults} onChange={e => setAdults(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm">
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isEn ? "Currency" : "Devise"}
            </label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm">
              {["EUR", "USD", "MAD", "GBP"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button onClick={() => setShowFilters(v => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <SlidersHorizontal className="h-3 w-3" />
          {isEn ? "More filters" : "Plus de filtres"}
        </button>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Sort by" : "Trier par"}
              </label>
              <select value={sort} onChange={e => setSort(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{isEn ? o.labelEn : o.labelFr}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Min rating" : "Note min."}
              </label>
              <select value={rating} onChange={e => setRating(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{isEn ? o.labelEn : o.labelFr}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Min price" : "Prix min"}
              </label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Max price" : "Prix max"}
              </label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
          </div>
        )}

        <button onClick={handleSearch} disabled={isLoading}
          className="w-full py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isEn ? "Search prices" : "Rechercher les prix"}
        </button>
      </div>

      {/* Loading / Error states */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="text-sm text-destructive text-center py-4">{error}</div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        )}
        {!isLoading && !error && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {isEn ? "Set your dates and search for prices" : "Sélectionnez vos dates et recherchez les prix"}
          </div>
        )}
      </div>
    </div>
  );
};

export default SerpApiHotelOverlay;
