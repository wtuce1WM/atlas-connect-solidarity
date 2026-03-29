import { createPortal } from "react-dom";
import { X } from "lucide-react";
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

  return createPortal(
    <div className="fixed inset-0 z-[220] lg:z-[200] flex flex-col lg:justify-start lg:right-auto lg:w-1/2 lg:top-[53px]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-black/90 backdrop-blur-md flex flex-col overflow-hidden w-full h-full lg:rounded-none animate-fade-in lg:animate-slide-in-left">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <p className="text-sm font-bold text-white">
              {language === "en" ? `Hotels in ${data.city}` : `Hôtels à ${data.city}`}
            </p>
            <p className="text-xs text-white/60">
              {data.checkIn} → {data.checkOut} · {data.adults} {language === "en" ? "adult(s)" : "adulte(s)"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...data.hotels.filter(h => h.hotelId !== selectedHotelId)].sort((a, b) => {
              const aV = a.wtuce_status === "verified" ? 1 : 0;
              const bV = b.wtuce_status === "verified" ? 1 : 0;
              if (bV !== aV) return bV - aV;
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-bold leading-tight truncate">{hotel.name}</p>
                    {cheapest && (
                      <p className="text-white/80 text-[10px] mt-0.5">
                        {language === "en" ? "from" : "à partir de"} {parseFloat(cheapest.price.total).toFixed(0)} {cheapest.price.currency}
                      </p>
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
