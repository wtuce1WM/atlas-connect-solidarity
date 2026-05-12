import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X, Star, MapPin, Building2, Leaf, Award, Truck, Package, Accessibility } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FallbackPanelData, FallbackHotel } from "@/components/HotelAvailabilityOverlay";
import logoGold from "@/assets/logoGOLDsimple.webp";
import { isCurrentlyOpen, type DayHoursData } from "@/lib/formatOpeningHours";

interface FallbackHotelsPanelProps {
  data: FallbackPanelData;
  selectedHotelId: string | null;
  onClose: () => void;
  onSelectHotel: (hotelId: string, businessId: string | null) => void;
  inline?: boolean;
}

/** Render a card identical to the search results tab vignettes */
const HotelResultCard = ({ hotel, onSelectHotel }: { hotel: FallbackHotel; onSelectHotel: (hotelId: string, businessId: string | null) => void }) => {
  const biz = hotel.dbBusiness;
  const img = biz?.images?.[0] || biz?.logo_url || hotel.dbImage || hotel.mainImage;
  const avgOn20 = biz?.computed_rating ?? biz?.rating ?? null;
  const totalReviews = biz?.total_review_count ?? 0;
  const subcat = biz?.categories?.[0] || null;
  const name = biz?.name || hotel.name;

  // Open badge logic
  const openBadge = (() => {
    if (biz?.is_open_24h) return "Ouvert 24h";
    if (!biz?.opening_hours) return null;
    const frToEn: Record<string, string> = {
      lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
      vendredi: "friday", samedi: "saturday", dimanche: "sunday",
    };
    const rawOH = biz.opening_hours as Record<string, DayHoursData>;
    const oh = Object.entries(rawOH).reduce((acc, [k, v]) => {
      acc[frToEn[k] || k] = v;
      return acc;
    }, {} as Record<string, DayHoursData>);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const now = new Date();
    const todayKey = days[now.getDay()];
    if (isCurrentlyOpen(oh[todayKey])) return "Ouvert";
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dh = oh[todayKey];
    if (dh && !dh.closed && dh.open) {
      const [oH, oM] = dh.open.split(":").map(Number);
      if (oH * 60 + (oM || 0) > nowMin) return `Ouvre à ${dh.open}`;
      if (dh.open2 && !dh.continuous) {
        const [oH2, oM2] = dh.open2.split(":").map(Number);
        if (oH2 * 60 + (oM2 || 0) > nowMin) return `Ouvre à ${dh.open2}`;
      }
    }
    const dayLabels = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    for (let i = 1; i <= 7; i++) {
      const idx = (now.getDay() + i) % 7;
      const nd = oh[days[idx]];
      if (nd && !nd.closed && nd.open) return `Ouvre ${dayLabels[idx]} à ${nd.open}`;
    }
    return null;
  })();

  return (
    <div
      className="group overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square bg-muted"
      onClick={() => {
        if (hotel.businessId) {
          onSelectHotel(hotel.hotelId, hotel.businessId);
        }
      }}
    >
      {img ? (
        <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Verified badge */}
      {hotel.wtuce_status === "verified" && (
        <div className="absolute top-2 right-2 z-[15]">
          <img src={logoGold} alt="Vérifié" className="w-12 h-12 object-contain" />
        </div>
      )}

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 z-[15] flex flex-wrap gap-1">
        {subcat && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold text-gold-foreground">
            {subcat}
          </span>
        )}
        {biz?.default_service && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black text-white border border-white/20">
            {biz.default_service}
          </span>
        )}
        {openBadge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            openBadge === "Ouvert" || openBadge === "Ouvert 24h"
              ? "bg-[#25D366] text-black"
              : "bg-primary text-primary-foreground"
          }`}>
            {openBadge}
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-[15] p-3 space-y-1">
        <p
          className="font-semibold text-base text-white leading-tight line-clamp-2"
          style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}
        >
          {name}
        </p>
        {avgOn20 !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Star className="h-3 w-3 text-gold fill-gold" />
            <span className="font-medium text-white">{avgOn20}/20</span>
            {totalReviews > 0 && (
              <span className="text-white/70">· {totalReviews} avis</span>
            )}
          </div>
        )}
        {biz?.city && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {biz.neighborhood ? `${biz.city}, ${biz.neighborhood}` : biz.city}
            </span>
          </div>
        )}
        {/* Engagements, Certifications & Logistics badges */}
        {(() => {
          const engs: string[] = biz?.engagements || [];
          const standards = engs.filter(e => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
          const certifications = engs.filter(e => e.startsWith("Certification:")).map(e => e.replace("Certification:", "").trim());
          const logistics = engs.filter(e => e.startsWith("Logistique:")).map(e => e.replace("Logistique:", "").trim());
          if (standards.length === 0 && logistics.length === 0 && certifications.length === 0) return null;
          const getLogIcon = (l: string) => {
            const lower = l.toLowerCase();
            if (lower.includes("livraison")) return Truck;
            if (lower.includes("pmr") || lower.includes("handicap") || lower.includes("accès")) return Accessibility;
            return Package;
          };
          return (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {certifications.map((c, i) => (
                <span key={`c-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/30 text-amber-200 backdrop-blur-sm">
                  <Award className="h-2.5 w-2.5" />{c}
                </span>
              ))}
              {standards.map((e, i) => (
                <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/30 text-green-200 backdrop-blur-sm">
                  <Leaf className="h-2.5 w-2.5" />{e}
                </span>
              ))}
              {logistics.map((l, i) => {
                const Icon = getLogIcon(l);
                return (
                  <span key={`l-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/30 text-blue-200 backdrop-blur-sm">
                    <Icon className="h-2.5 w-2.5" />{l}
                  </span>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const FallbackHotelsPanel = ({ data, selectedHotelId, onClose, onSelectHotel, inline }: FallbackHotelsPanelProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  useEffect(() => {
    if (inline) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inline]);

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
      <div className="flex items-center justify-end px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedHotels.map((hotel) => (
            <HotelResultCard
              key={hotel.hotelId}
              hotel={hotel}
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
