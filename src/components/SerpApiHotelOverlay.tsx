import { useState, useCallback, useEffect } from "react";
import { X, Search, Loader2, Star, ExternalLink, Calendar, Users, SlidersHorizontal, MapPin, Hotel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface FallbackSerpHotel {
  id: string;
  businessId: string;
  serpHotelName: string;
  businessName: string;
  businessSlug: string;
  businessImage: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  tripadvisorRating: number | null;
  tripadvisorReviewCount: number | null;
  reserveNowUrl: string | null;
  manualPriceRange: string | null;
  liteApiPrice: { amount: number; currency: string } | null;
  // SerpAPI result data if found
  serpData?: SerpApiHotel | null;
}

interface SerpApiHotelOverlayProps {
  serpHotelName: string;
  serpCity: string;
  businessName: string;
  reserveNowUrl?: string | null;
  onClose: () => void;
  onSelectBusiness?: (businessId: string) => void;
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

const SerpApiHotelOverlay = ({ serpHotelName, serpCity, businessName, reserveNowUrl, onClose, onSelectBusiness }: SerpApiHotelOverlayProps) => {
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

  const [results, setResults] = useState<SerpApiHotel[]>([]);
  const [matchedHotel, setMatchedHotel] = useState<SerpApiHotel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fallback state
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackHotels, setFallbackHotels] = useState<FallbackSerpHotel[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const isEn = language === "en";

  const loadFallbackHotels = useCallback(async (serpResults: SerpApiHotel[]) => {
    setFallbackLoading(true);
    try {
      // Get all SerpAPI-mapped hotels in the same city (excluding current one)
      const { data: mappings, error: mapErr } = await supabase
        .from("hotel_mappings")
        .select("id, serp_hotel_name, business_id, city")
        .ilike("city", serpCity);

      if (mapErr) throw mapErr;

      const otherMappings = (mappings || []).filter(
        m => m.serp_hotel_name?.toLowerCase().trim() !== serpHotelName.toLowerCase().trim()
      );

      if (otherMappings.length === 0) {
        setFallbackHotels([]);
        setFallbackLoading(false);
        return;
      }

      // Get business info for these mappings
      const bizIds = otherMappings.map(m => m.business_id).filter(Boolean);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, slug, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range")
        .in("id", bizIds);

      const bizMap = new Map((businesses || []).map(b => [b.id, b]));

      // Fetch LiteAPI cached prices for these businesses
      const { data: liteApiPrices } = await supabase
        .from("hotel_price_cache")
        .select("business_id, price_per_night, currency")
        .in("business_id", bizIds)
        .eq("source", "liteapi")
        .eq("check_in", checkIn)
        .eq("check_out", checkOut);

      const liteApiPriceMap = new Map(
        (liteApiPrices || []).map(p => [p.business_id, { amount: p.price_per_night, currency: p.currency }])
      );

      // Match SerpAPI results with mappings
      const fallback: FallbackSerpHotel[] = otherMappings
        .filter(m => bizMap.has(m.business_id))
        .map(m => {
          const biz = bizMap.get(m.business_id)!;
          const serpMatch = serpResults.find(
            r => r.name.toLowerCase().trim() === (m.serp_hotel_name || "").toLowerCase().trim()
          );
          return {
            id: m.id,
            businessId: m.business_id,
            serpHotelName: m.serp_hotel_name || "",
            businessName: biz.name,
            businessSlug: biz.slug,
            businessImage: biz.images?.[0] || null,
            googleRating: biz.google_rating,
            googleReviewCount: biz.google_review_count,
            tripadvisorRating: biz.tripadvisor_rating,
            tripadvisorReviewCount: biz.tripadvisor_review_count,
            reserveNowUrl: biz.reserve_now_url,
            manualPriceRange: biz.manual_price_range,
            liteApiPrice: liteApiPriceMap.get(m.business_id) || null,
            serpData: serpMatch || null,
          };
        });

      setFallbackHotels(fallback);
    } catch (err) {
      console.error("Fallback load error:", err);
    } finally {
      setFallbackLoading(false);
    }
  }, [serpCity, serpHotelName]);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMatchedHotel(null);
    setIsFallback(false);
    setFallbackHotels([]);
    try {
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

      const hotels: SerpApiHotel[] = data?.data || [];
      setResults(hotels);
      setHasSearched(true);

      // Find the matched hotel
      const normalizedTarget = serpHotelName.toLowerCase().trim();
      const match = hotels.find(h => h.name.toLowerCase().trim() === normalizedTarget);
      setMatchedHotel(match || null);

      if (!match) {
        // Hotel not found → fallback mode
        setIsFallback(true);
        await loadFallbackHotels(hotels);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
    }
  }, [serpCity, checkIn, checkOut, adults, currency, sort, rating, minPrice, maxPrice, language, serpHotelName, loadFallbackHotels]);

  // Auto-search on open
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="text-sm text-destructive text-center py-4">{error}</div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        )}

        {/* Matched hotel found */}
        {matchedHotel && (
          <div className="rounded-xl border-2 border-gold bg-gold/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gold uppercase tracking-wider">
                {isEn ? "Your hotel" : "Votre hôtel"}
              </span>
            </div>
            <HotelCard hotel={matchedHotel} reserveUrl={reserveNowUrl} isEn={isEn} isHighlighted />
          </div>
        )}

        {/* Fallback: hotel not found in SerpAPI results */}
        {hasSearched && !isLoading && isFallback && (
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-center space-y-2">
              <Hotel className="h-8 w-8 text-orange-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                {isEn
                  ? `"${serpHotelName}" was not found for these dates`
                  : `"${serpHotelName}" n'a pas été trouvé pour ces dates`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "Here are other hotels available in the area"
                  : "Voici d'autres hôtels disponibles dans la zone"}
              </p>
            </div>

            {fallbackLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            )}

            {!fallbackLoading && fallbackHotels.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {isEn
                    ? `${fallbackHotels.length} hotel(s) available in ${serpCity}`
                    : `${fallbackHotels.length} hôtel(s) disponible(s) à ${serpCity}`}
                </p>
                {fallbackHotels.map(fb => (
                  <FallbackHotelCard
                    key={fb.id}
                    hotel={fb}
                    isEn={isEn}
                    onSelect={onSelectBusiness}
                  />
                ))}
              </div>
            )}

            {!fallbackLoading && fallbackHotels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isEn ? "No other mapped hotels available" : "Aucun autre hôtel référencé disponible"}
              </div>
            )}
          </div>
        )}

        {/* Normal results (non-fallback) */}
        {hasSearched && !isLoading && !isFallback && (
          <>
            <p className="text-xs text-muted-foreground">
              {results.length} {isEn ? "hotels found" : "hôtels trouvés"} — {serpCity}
            </p>
            <div className="space-y-3">
              {results
                .filter(h => h.name.toLowerCase().trim() !== serpHotelName.toLowerCase().trim())
                .map((hotel, i) => (
                  <HotelCard key={i} hotel={hotel} isEn={isEn} />
                ))}
            </div>
          </>
        )}

        {hasSearched && !isLoading && results.length === 0 && !error && !isFallback && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {isEn ? "No hotels found for these criteria" : "Aucun hôtel trouvé pour ces critères"}
          </div>
        )}
      </div>
    </div>
  );
};

function HotelCard({ hotel, reserveUrl, isEn, isHighlighted }: {
  hotel: SerpApiHotel;
  reserveUrl?: string | null;
  isEn: boolean;
  isHighlighted?: boolean;
}) {
  const bookUrl = isHighlighted && reserveUrl ? reserveUrl : hotel.link;

  return (
    <div className={`flex gap-3 rounded-xl border ${isHighlighted ? "border-gold/30" : "border-border"} bg-card overflow-hidden`}>
      {hotel.thumbnail && (
        <img src={hotel.thumbnail} alt={hotel.name}
          className="w-24 h-24 sm:w-28 sm:h-28 object-cover shrink-0" loading="lazy" />
      )}
      <div className="flex-1 py-2 pr-3 space-y-1 min-w-0">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{hotel.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hotel.overallRating && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-gold fill-gold" />{hotel.overallRating}
            </span>
          )}
          {hotel.reviewCount && <span>({hotel.reviewCount})</span>}
          {hotel.hotelClass && <span>{"★".repeat(hotel.hotelClass as number)}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hotel.ratePerNight && (
            <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-bold px-2 py-0.5">
              {hotel.ratePerNight.amount} / {isEn ? "night" : "nuit"}
            </Badge>
          )}
        </div>
        {hotel.dealDescription && (
          <p className="text-[10px] text-green-600 font-medium">{hotel.dealDescription}</p>
        )}
        {bookUrl && (
          <a href={bookUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline mt-1">
            {isEn ? "Book" : "Réserver"} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function FallbackHotelCard({ hotel, isEn, onSelect }: {
  hotel: FallbackSerpHotel;
  isEn: boolean;
  onSelect?: (businessId: string) => void;
}) {
  const hasPrice = hotel.serpData?.ratePerNight;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card overflow-hidden">
      {/* Image */}
      {(hotel.serpData?.thumbnail || hotel.businessImage) && (
        <img
          src={hotel.serpData?.thumbnail || hotel.businessImage || ""}
          alt={hotel.businessName}
          className="w-24 h-24 sm:w-28 sm:h-28 object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 py-2 pr-3 space-y-1 min-w-0">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{hotel.businessName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {hotel.googleRating && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-gold fill-gold" />
              {hotel.googleRating}
              {hotel.googleReviewCount ? ` (${hotel.googleReviewCount})` : ""}
            </span>
          )}
          {hotel.tripadvisorRating && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3 text-green-500" />
              {hotel.tripadvisorRating}
            </span>
          )}
          {hotel.serpData?.hotelClass && (
            <span>{"★".repeat(hotel.serpData.hotelClass as number)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hotel.manualPriceRange && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
              {hotel.manualPriceRange}
            </Badge>
          )}
          {hasPrice && (
            <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-bold px-2 py-0.5">
              {hotel.serpData!.ratePerNight!.amount} / {isEn ? "night" : "nuit"}
            </Badge>
          )}
        </div>
        {hotel.serpData?.dealDescription && (
          <p className="text-[10px] text-green-600 font-medium">{hotel.serpData.dealDescription}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {hotel.reserveNowUrl && (
            <a href={hotel.reserveNowUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
              {isEn ? "Book" : "Réserver"} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {onSelect && (
            <button
              onClick={() => onSelect(hotel.businessId)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {isEn ? "View" : "Voir"} <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SerpApiHotelOverlay;
