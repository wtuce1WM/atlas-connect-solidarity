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
  inline?: boolean;
}

const FallbackHotelsPanel = ({ data, selectedHotelId, onClose, onSelectHotel, inline }: FallbackHotelsPanelProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const isSerpApi = data.source === "serpapi";

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
          {/* Current hotel (SerpAPI) - same vignette style with gold border */}
          {isSerpApi && (() => {
            const currentHotel = data.hotels.find(h => h.isCurrentHotel);
            if (!currentHotel) return null;
            const img = currentHotel.dbImage || currentHotel.mainImage;
            const cheapest = currentHotel.offers.length > 0
              ? currentHotel.offers.reduce((a, b) => parseFloat(a.price.total) < parseFloat(b.price.total) ? a : b)
              : null;
            return (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">
                  {isEn ? "Your hotel" : "Votre hôtel"}
                </p>
                <div
                  className="group overflow-hidden rounded-xl border-2 border-gold shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square"
                  onClick={() => {
                    if (currentHotel.businessId) {
                      onSelectHotel(currentHotel.hotelId, currentHotel.businessId);
                    }
                  }}
                >
                  {img ? (
                    <img src={img} alt={currentHotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No image</span>
                    </div>
                  )}
                  {currentHotel.gamme && (
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge
                        className="text-[10px] border border-black whitespace-nowrap px-1.5 py-0"
                        style={{ backgroundColor: currentHotel.gamme.color_hex || '#666666', color: currentHotel.gamme.text_color_hex || '#000000' }}
                      >
                        {currentHotel.gamme.name_fr}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-bold leading-tight truncate">{currentHotel.name}</p>
                    {cheapest && (
                      <p className="text-white/80 text-[10px] mt-0.5">
                        {isEn ? "from" : "à partir de"} {parseFloat(cheapest.price.total).toFixed(0)} {cheapest.price.currency}
                      </p>
                    )}
                    {!cheapest && currentHotel.serpPrice && (
                      <p className="text-gold text-[10px] font-bold mt-0.5">
                        {currentHotel.serpPrice.amount} / {isEn ? "night" : "nuit"}
                      </p>
                    )}
                    {!cheapest && !currentHotel.serpPrice && currentHotel.liteApiPrice && (
                      <p className="text-blue-300 text-[10px] font-bold mt-0.5">
                        LiteAPI: {currentHotel.liteApiPrice.amount} {currentHotel.liteApiPrice.currency}
                      </p>
                    )}
                    {!cheapest && !currentHotel.serpPrice && !currentHotel.liteApiPrice && currentHotel.manualPriceRange && (
                      <p className="text-white/60 text-[10px] mt-0.5">{currentHotel.manualPriceRange}</p>
                    )}
                    {currentHotel.dealDescription && (
                      <p className="text-green-400 text-[9px] font-medium mt-0.5 line-clamp-1">{currentHotel.dealDescription}</p>
                    )}
                    {currentHotel.reserveNowUrl && (
                      <a
                        href={currentHotel.reserveNowUrl}
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
                  className="group overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square"
                  onClick={() => {
                    if (hotel.businessId) {
                      onSelectHotel(hotel.hotelId, hotel.businessId);
                    }
                  }}
                >
                  {img ? (
                    <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No image</span>
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
                      <p className="text-blue-300 text-[10px] font-bold mt-0.5">
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
