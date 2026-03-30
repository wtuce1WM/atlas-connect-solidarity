import { useState, useCallback } from "react";
import { X, Search, Loader2, Star, ExternalLink, Calendar, Users, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface SerpApiHotelOverlayProps {
  serpHotelName: string;
  serpCity: string;
  businessName: string;
  reserveNowUrl?: string | null;
  onClose: () => void;
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

const SerpApiHotelOverlay = ({ serpHotelName, serpCity, businessName, reserveNowUrl, onClose }: SerpApiHotelOverlayProps) => {
  const { language } = useLanguage();

  // Default dates
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

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMatchedHotel(null);
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
      const match = hotels.find(h => (h.name as string).toLowerCase().trim() === normalizedTarget);
      setMatchedHotel(match || null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
    }
  }, [serpCity, checkIn, checkOut, adults, currency, sort, rating, minPrice, maxPrice, language, serpHotelName]);

  const isEn = language === "en";

  return (
    <div
      className="absolute -top-[3.25rem] left-0 right-0 bottom-0 z-[60] bg-background flex flex-col animate-slide-down-from-top"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-foreground" />
        </button>
        <span className="font-semibold text-foreground text-sm">
          {isEn ? "Hotel Prices" : "Prix Hôtels"} — {businessName}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">SerpAPI</span>
      </div>

      {/* Search params */}
      <div className="px-4 py-3 border-b border-border bg-card/50 space-y-3 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Check-in */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isEn ? "Check-in" : "Arrivée"}
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
          {/* Check-out */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isEn ? "Check-out" : "Départ"}
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
          {/* Adults */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Users className="h-3 w-3" />
              {isEn ? "Adults" : "Adultes"}
            </label>
            <select
              value={adults}
              onChange={e => setAdults(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {/* Currency */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isEn ? "Currency" : "Devise"}
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              {["EUR", "USD", "MAD", "GBP"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle filters */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {isEn ? "More filters" : "Plus de filtres"}
        </button>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {/* Sort */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Sort by" : "Trier par"}
              </label>
              <select
                value={sort}
                onChange={e => setSort(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{isEn ? o.labelEn : o.labelFr}</option>
                ))}
              </select>
            </div>
            {/* Rating */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Min rating" : "Note min."}
              </label>
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                {RATING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{isEn ? o.labelEn : o.labelFr}</option>
                ))}
              </select>
            </div>
            {/* Min price */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Min price" : "Prix min"}
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            {/* Max price */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isEn ? "Max price" : "Prix max"}
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="∞"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>
        )}

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
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

        {/* Matched hotel highlight */}
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

        {/* All results */}
        {hasSearched && !isLoading && (
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

        {hasSearched && !isLoading && results.length === 0 && !error && (
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
      {/* Thumbnail */}
      {hotel.thumbnail && (
        <img
          src={hotel.thumbnail}
          alt={hotel.name}
          className="w-24 h-24 sm:w-28 sm:h-28 object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 py-2 pr-3 space-y-1 min-w-0">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{hotel.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hotel.overallRating && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-gold fill-gold" />
              {hotel.overallRating}
            </span>
          )}
          {hotel.reviewCount && (
            <span>({hotel.reviewCount})</span>
          )}
          {hotel.hotelClass && (
            <span>{"★".repeat(hotel.hotelClass as number)}</span>
          )}
        </div>
        {hotel.ratePerNight && (
          <p className="text-base font-bold text-foreground">
            {hotel.ratePerNight.amount}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {isEn ? "night" : "nuit"}
            </span>
          </p>
        )}
        {hotel.dealDescription && (
          <p className="text-[10px] text-green-600 font-medium">{hotel.dealDescription}</p>
        )}
        {bookUrl && (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline mt-1"
          >
            {isEn ? "Book" : "Réserver"} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default SerpApiHotelOverlay;
