import { createPortal } from "react-dom";
import { X, Star, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FallbackPanelData, FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import logoGold from "@/assets/logoGOLDsimple.webp";

interface FallbackHotelsPanelProps {
  data: FallbackPanelData;
  selectedHotelId: string | null;
  onClose: () => void;
  onSelectHotel: (hotelId: string, businessId: string | null) => void;
  inline?: boolean;
}

const computeDisplayRating = (hotel: FallbackHotel) => {
  const src: { rating: number; count: number }[] = [];
  if (hotel.dbGoogleRating && hotel.dbGoogleReviewCount) src.push({ rating: hotel.dbGoogleRating, count: hotel.dbGoogleReviewCount });
  if (hotel.dbTripadvisorRating && hotel.dbTripadvisorReviewCount) src.push({ rating: hotel.dbTripadvisorRating, count: hotel.dbTripadvisorReviewCount });
  const total = src.reduce((s, r) => s + r.count, 0);
  if (total === 0) return null;
  const weighted = src.reduce((s, r) => s + (r.rating / 5) * 20 * r.count, 0) / total;
  return { rating: weighted, totalReviews: total };
};

const HotelVignette = ({ hotel, isEn, onSelectHotel }: { hotel: FallbackHotel; isEn: boolean; onSelectHotel: (hotelId: string, businessId: string | null) => void }) => {
  const img = hotel.dbImage || hotel.mainImage;
  const ratingInfo = computeDisplayRating(hotel);

  return (
    <div
      className="group overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
      onClick={() => {
        if (hotel.businessId) {
          onSelectHotel(hotel.hotelId, hotel.businessId);
        }
      }}
    >
      {/* Image - 16:9 aspect ratio */}
      <div className="aspect-video overflow-hidden relative bg-muted">
        {img ? (
          <img src={img} alt={hotel.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-3">
        {/* Name + verified */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3
            className="font-semibold text-sm line-clamp-1 text-foreground flex-1"
            style={{ fontFamily: "'Josefin Sans', sans-serif" }}
          >
            {hotel.name}
          </h3>
          {hotel.wtuce_status === "verified" && (
            <img src={logoGold} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
          )}
        </div>

        {/* Rating */}
        {ratingInfo && (
          <div className="flex items-center gap-1 text-xs mb-1">
            <Star className="h-3 w-3 text-gold fill-gold flex-shrink-0" />
            <span className="font-semibold text-foreground">{ratingInfo.rating.toFixed(1)}/20</span>
            <span className="text-muted-foreground">({ratingInfo.totalReviews} {isEn ? "reviews" : "avis"})</span>
          </div>
        )}

        {/* Location */}
        {hotel.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{hotel.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const FallbackHotelsPanel = ({ data, selectedHotelId, onClose, onSelectHotel, inline }: FallbackHotelsPanelProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const isSerpApi = data.source === "serpapi";

  const sortedHotels = [...data.hotels.filter(h => !h.isCurrentHotel)].sort((a, b) => {
    const aV = a.wtuce_status === "verified" ? 1 : 0;
    const bV = b.wtuce_status === "verified" ? 1 : 0;
    if (bV !== aV) return bV - aV;
    if (isSerpApi && (!!a.serpPrice !== !!b.serpPrice)) return a.serpPrice ? -1 : 1;
    const ra = computeDisplayRating(a);
    const rb = computeDisplayRating(b);
    return (rb?.rating || 0) - (ra?.rating || 0);
  });

  const content = (
    <div className={inline ? "flex flex-col overflow-hidden w-full h-full" : "relative bg-white flex flex-col overflow-hidden w-full h-full lg:rounded-none animate-fade-in lg:animate-slide-in-left"}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isEn ? `Hotels in ${data.city}` : `Hôtels à ${data.city}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.checkIn} → {data.checkOut} · {data.adults} {isEn ? "adult(s)" : "adulte(s)"}
            {isSerpApi && <span className="ml-2 text-gold">SerpAPI</span>}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedHotels.map((hotel) => (
            <HotelVignette
              key={hotel.hotelId}
              hotel={hotel}
              isEn={isEn}
              onSelectHotel={onSelectHotel}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return createPortal(
    <div className="fixed inset-0 z-[220] lg:z-[200] flex flex-col lg:justify-start lg:right-auto lg:w-1/2 lg:top-[53px]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={onClose} />
      {content}
    </div>,
    document.body
  );
};

export default FallbackHotelsPanel;
