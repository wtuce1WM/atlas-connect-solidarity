import React from "react";
import { MapPin, Star } from "lucide-react";

interface BusinessHeaderProps {
  business: any;
  businessId: string;
  hookText: string | null;
  showHook: boolean;
  hasReviewsCard: boolean;
  avgOn20: number | null;
  totalReviewCount: number;
  onOpenReviews: () => void;
  openBadgeInfo?: { text: string; isOpen: boolean } | null;
  /** Compact mode: background hugs content, name centered (used by YouTube tab opener) */
  compact?: boolean;
}


const BusinessHeader = React.memo(function BusinessHeader({
  business,
  businessId,
  hookText,
  showHook,
  hasReviewsCard,
  avgOn20,
  totalReviewCount,
  onOpenReviews,
  openBadgeInfo,
}: BusinessHeaderProps) {
  return (
    <div key={businessId} className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[4.5rem] md:h-[5.5rem] pointer-events-auto -mt-1 md:mt-0 animate-slide-in-right">
      <div
        className="absolute inset-0 flex items-center gap-4 px-4 md:px-6"
      >
        {business.logo_url && business.id === businessId && (
          <div
            className={`shrink-0 w-20 h-20 overflow-hidden hidden md:block ${business.logo_bg === "transparent" ? "" : "rounded-xl border-2 border-white/20 shadow-lg"}`}
            style={{ backgroundColor: business.logo_bg === "transparent" ? "transparent" : (business.logo_bg || "#fff") }}
          >
            <img src={business.logo_url} alt="" className={`w-full h-full object-contain ${business.logo_bg === "transparent" ? "" : "p-1"}`} />
          </div>
        )}
        <div className={`min-w-0 flex-1 text-center md:text-left ${hasReviewsCard ? "md:pr-28" : ""}`}>
          <div className="flex items-start gap-2">
            <h2
              className={`text-base md:text-xl font-bold uppercase min-w-0 flex-1 ${hasReviewsCard ? "line-clamp-2" : "line-clamp-3 md:line-clamp-2"}`}
              style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em", WebkitTextStroke: "0.8px currentColor", textShadow: "0 0 0 currentColor" }}
            >
              {business.name}
            </h2>
          </div>
          {(business.city || business.neighborhood || business.address) && (
            <p className={`text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center md:justify-start truncate${business.name.length > 18 ? " hidden lg:flex" : ""}`}>
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {[business.city, business.neighborhood, business.address].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default BusinessHeader;
