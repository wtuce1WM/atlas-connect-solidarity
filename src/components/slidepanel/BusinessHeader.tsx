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
  compact = false,
}: BusinessHeaderProps) {
  if (compact) {
    return (
      <div key={businessId} className="mx-auto w-fit max-w-full shrink-0 flex flex-col items-center gap-1 pointer-events-auto animate-slide-in-right">
        <div className="rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 py-2 text-white">
        <div className="flex items-center gap-4">
          <div className="min-w-0 text-center">
            <h2
              className="text-base md:text-xl font-bold uppercase truncate [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
              style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em" }}
            >
              {business.name}
            </h2>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={businessId}
      className="mx-auto w-fit max-w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white h-[4.5rem] md:h-[5.5rem] pointer-events-auto -mt-1 md:mt-0 animate-slide-in-right flex items-center justify-center gap-4"
    >
      <div className="min-w-0 text-center">
        <h2
          className={`text-base md:text-xl font-bold uppercase [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] ${hasReviewsCard ? "line-clamp-2" : "line-clamp-3 md:line-clamp-2"}`}
          style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em" }}
        >
          {business.name}
        </h2>
        {(business.city || business.neighborhood || business.address) && (
          <p className={`text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center truncate${business.name.length > 18 ? " hidden lg:flex" : ""}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {[business.city, business.neighborhood, business.address].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
});

export default BusinessHeader;
