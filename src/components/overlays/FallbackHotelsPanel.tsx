import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FallbackPanelData, FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import BusinessCard, { type BusinessCardData, type Gamme } from "@/components/BusinessCard";

interface FallbackHotelsPanelProps {
  data: FallbackPanelData;
  selectedHotelId: string | null;
  onClose: () => void;
  onSelectHotel: (hotelId: string, businessId: string | null) => void;
  inline?: boolean;
}

/** Map a FallbackHotel (with enriched dbBusiness) to BusinessCardData */
const toBusinessCardData = (hotel: FallbackHotel): BusinessCardData | null => {
  const biz = hotel.dbBusiness;
  if (!biz) return null;
  return {
    id: biz.id,
    name: biz.name,
    city: biz.city || "",
    region: biz.region || "",
    address: biz.address,
    phone: biz.phone,
    whatsapp: biz.whatsapp,
    skype: biz.skype,
    neighborhood: biz.neighborhood,
    logo_url: biz.logo_url,
    hook_fr: biz.hook_fr,
    images: biz.images,
    website: biz.website,
    categories: biz.categories,
    default_service: biz.default_service,
    wtuce_status: biz.wtuce_status,
    latitude: biz.latitude,
    longitude: biz.longitude,
    google_maps_url: biz.google_maps_url,
    rating: biz.rating,
    computed_rating: biz.computed_rating,
    total_review_count: biz.total_review_count,
    gamme_id: biz.gamme_id,
    badge_id: biz.badge_id,
    opening_hours: biz.opening_hours,
    is_open_24h: biz.is_open_24h,
    show_opening_hours: biz.show_opening_hours,
    engagements: biz.engagements,
    online_shop_url: biz.online_shop_url,
  };
};

const FallbackHotelsPanel = ({ data, selectedHotelId, onClose, onSelectHotel, inline }: FallbackHotelsPanelProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const gammes: Gamme[] = (data.gammes || []).map(g => ({
    id: g.id,
    name_fr: g.name_fr,
    color_hex: g.color_hex,
    text_color_hex: g.text_color_hex,
    sort_order: g.sort_order ?? null,
  }));

  const sortedHotels = [...data.hotels.filter(h => !h.isCurrentHotel)].sort((a, b) => {
    const aV = a.wtuce_status === "verified" ? 1 : 0;
    const bV = b.wtuce_status === "verified" ? 1 : 0;
    if (bV !== aV) return bV - aV;
    const isSerpApi = data.source === "serpapi";
    if (isSerpApi && (!!a.serpPrice !== !!b.serpPrice)) return a.serpPrice ? -1 : 1;
    const ra = a.dbBusiness?.computed_rating || 0;
    const rb = b.dbBusiness?.computed_rating || 0;
    return rb - ra;
  });

  const content = (
    <div className={inline ? "flex flex-col overflow-hidden w-full h-full" : "relative bg-white flex flex-col overflow-hidden w-full h-full lg:rounded-none animate-fade-in lg:animate-slide-in-left"}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {isEn ? `Hotels in ${data.city}` : `Hôtels à ${data.city}`}
          </p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {data.checkIn} → {data.checkOut} · {data.adults} {isEn ? "adult(s)" : "adulte(s)"}
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
          {sortedHotels.map((hotel) => {
            const cardData = toBusinessCardData(hotel);
            if (!cardData) return null;
            return (
              <div
                key={hotel.hotelId}
                onClick={(e) => {
                  if (hotel.businessId) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectHotel(hotel.hotelId, hotel.businessId);
                  }
                }}
              >
                <BusinessCard
                  business={cardData}
                  gammes={gammes}
                  verifiedLabel={isEn ? "Verified" : "Vérifié"}
                />
              </div>
            );
          })}
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
