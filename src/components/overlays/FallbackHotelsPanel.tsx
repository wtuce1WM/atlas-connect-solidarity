import { createPortal } from "react-dom";
import { X, Star, MapPin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FallbackPanelData } from "@/components/HotelAvailabilityOverlay";

interface FallbackHotelsPanelProps {
  data: FallbackPanelData;
  selectedHotelId: string | null;
  onClose: () => void;
  onSelectHotel: (hotelId: string, businessId: string | null) => void;
}

const FallbackHotelsPanel = ({ data, selectedHotelId, onClose, onSelectHotel }: FallbackHotelsPanelProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const isSerpApi = data.source === "serpapi";

  return createPortal(
    <div className="fixed inset-0 z-[220] lg:z-[200] flex flex-col lg:justify-start lg:right-auto lg:w-1/2 lg:top-[53px]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-black/90 backdrop-blur-md flex flex-col overflow-hidden w-full h-full lg:rounded-none animate-fade-in lg:animate-slide-in-left">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <p className="text-sm font-bold text-white">
              {isEn ? `Hotels in ${data.city}` : `Hôtels à ${data.city}`}
            </p>
            <p className="text-xs text-white/60">
              {data.checkIn} → {data.checkOut} · {data.adults} {isEn ? "adult(s)" : "adulte(s)"}
              {isSerpApi && <span className="ml-2 text-gold">SerpAPI</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-24">
          {/* Current hotel (SerpAPI) - highlighted card */}
          {isSerpApi && (() => {
            const currentHotel = data.hotels.find(h => h.isCurrentHotel);
            if (!currentHotel) return null;
            const img = currentHotel.dbImage || currentHotel.mainImage;
            return (
              <div className="mb-4 flex gap-3 rounded-xl border-2 border-gold bg-gold/5 overflow-hidden">
                {img && (
                  <img src={img} alt={currentHotel.name} className="w-24 h-24 sm:w-28 sm:h-28 object-cover shrink-0" loading="lazy" />
                )}
                <div className="flex-1 py-2 pr-3 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-white line-clamp-1">{currentHotel.name}</p>
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider shrink-0">
                      {isEn ? "Your hotel" : "Votre hôtel"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
                    {currentHotel.dbGoogleRating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-gold fill-gold" />
                        {currentHotel.dbGoogleRating}
                        {currentHotel.dbGoogleReviewCount ? ` (${currentHotel.dbGoogleReviewCount})` : ""}
                      </span>
                    )}
                    {currentHotel.dbTripadvisorRating && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-green-500" />
                        {currentHotel.dbTripadvisorRating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentHotel.manualPriceRange && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/30 text-white/70">
                        {currentHotel.manualPriceRange}
                      </Badge>
                    )}
                    {currentHotel.serpPrice && (
                      <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-bold px-2 py-0.5">
                        SerpAPI: {currentHotel.serpPrice.amount} / {isEn ? "night" : "nuit"}
                      </Badge>
                    )}
                    {currentHotel.liteApiPrice && (
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs font-bold px-2 py-0.5">
                        LiteAPI: {currentHotel.liteApiPrice.amount} {currentHotel.liteApiPrice.currency} / {isEn ? "night" : "nuit"}
                      </Badge>
                    )}
                  </div>
                  {currentHotel.dealDescription && (
                    <p className="text-[10px] text-green-400 font-medium">{currentHotel.dealDescription}</p>
                  )}
                  {currentHotel.reserveNowUrl && (
                    <a href={currentHotel.reserveNowUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline mt-1">
                      {isEn ? "Book" : "Réserver"} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...data.hotels.filter(h => h.hotelId !== selectedHotelId && !h.isCurrentHotel)].sort((a, b) => {
              const aV = a.wtuce_status === "verified" ? 1 : 0;
              const bV = b.wtuce_status === "verified" ? 1 : 0;
              if (bV !== aV) return bV - aV;
              // SerpAPI: prioritize hotels with prices
              if (isSerpApi) {
                if (!!a.serpPrice !== !!b.serpPrice) return a.serpPrice ? -1 : 1;
              }
              const computeRating = (h: typeof a) => {
                const src: { rating: number; count: number }[] = [];
                if (h.dbGoogleRating && h.dbGoogleReviewCount) src.push({ rating: h.dbGoogleRating, count: h.dbGoogleReviewCount });
                if (h.dbTripadvisorRating && h.dbTripadvisorReviewCount) src.push({ rating: h.dbTripadvisorRating, count: h.dbTripadvisorReviewCount });
                const total = src.reduce((s, r) => s + r.count, 0);
                if (total === 0) return 0;
                return src.reduce((s, r) => s + (r.rating / 5) * 20 * r.count, 0) / total;
              };
              return computeRating(b) - computeRating(a);
            }).map((hotel) => {
              const cheapest = hotel.offers.length > 0
                ? hotel.offers.reduce((a, b) => parseFloat(a.price.total) < parseFloat(b.price.total) ? a : b)
                : null;
              const img = hotel.dbImage || hotel.mainImage;
              return (
                <div
                  key={hotel.hotelId}
                  className="group overflow-hidden rounded-xl border border-white/15 shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square"
                  onClick={() => {
                    if (hotel.businessId) {
                      onSelectHotel(hotel.hotelId, hotel.businessId);
                    }
                  }}
                >
                  {img ? (
                    <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-black/60 flex items-center justify-center">
                      <span className="text-white/40 text-xs">No image</span>
                    </div>
                  )}
                  {/* Gamme badge - top center */}
                  {hotel.gamme && (
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge
                        className="text-[10px] border border-black whitespace-nowrap px-1.5 py-0"
                        style={{ backgroundColor: hotel.gamme.color_hex || '#666666', color: hotel.gamme.text_color_hex || '#000000' }}
                      >
                        {hotel.gamme.name_fr}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-bold leading-tight truncate">{hotel.name}</p>
                    {/* LiteAPI offer price */}
                    {cheapest && (
                      <p className="text-white/80 text-[10px] mt-0.5">
                        {isEn ? "from" : "à partir de"} {parseFloat(cheapest.price.total).toFixed(0)} {cheapest.price.currency}
                      </p>
                    )}
                    {/* SerpAPI price */}
                    {!cheapest && hotel.serpPrice && (
                      <p className="text-gold text-[10px] font-bold mt-0.5">
                        {hotel.serpPrice.amount} / {isEn ? "night" : "nuit"}
                      </p>
                    )}
                    {/* LiteAPI cached price */}
                    {!cheapest && !hotel.serpPrice && hotel.liteApiPrice && (
                      <p className="text-blue-400 text-[10px] font-bold mt-0.5">
                        LiteAPI: {hotel.liteApiPrice.amount} {hotel.liteApiPrice.currency}
                      </p>
                    )}
                    {/* Manual price range */}
                    {!cheapest && !hotel.serpPrice && !hotel.liteApiPrice && hotel.manualPriceRange && (
                      <p className="text-white/60 text-[10px] mt-0.5">{hotel.manualPriceRange}</p>
                    )}
                    {hotel.dealDescription && (
                      <p className="text-green-400 text-[9px] font-medium mt-0.5 line-clamp-1">{hotel.dealDescription}</p>
                    )}
                    {/* Reserve link */}
                    {hotel.reserveNowUrl && (
                      <a
                        href={hotel.reserveNowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-gold hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        {isEn ? "Book" : "Réserver"} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FallbackHotelsPanel;
