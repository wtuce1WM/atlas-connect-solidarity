import { useState, useRef, useLayoutEffect } from "react";
import { Clock, Search } from "lucide-react";
import { formatDayHours as formatDayHoursDisplay } from "@/lib/formatOpeningHours";

interface ContactFlipCardProps {
  business: {
    google_maps_url: string | null;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    website_force_external?: boolean;
    website_presentation_mode?: string;
    latitude: number | null;
    longitude: number | null;
    is_open_24h: boolean;
    opening_hours: unknown;
    show_opening_hours: boolean | null;
    name: string;
  };
  language: string;
  hasOpeningHours: boolean;
  animationDelay?: string;
  tallHeight?: boolean;
  className?: string;
  hasHotelMapping?: boolean;
  isSearchingAvailability?: boolean;
  onCheckAvailability?: (checkIn: string, checkOut: string, adults: number) => void;
  onOpenAvailabilitySearch?: () => void;
  onOpenWebsite?: (url: string) => void;
  openBadgeInfo?: { text: string | null; isOpen: boolean };
}

const LABELS = {
  fr: {
    check_avail: "Vérifier la disponibilité ›",
    view_hours: "Consultez les horaires ›",
    hours: "Horaires",
    back: "← Retour",
    open_24h: "Ouvert 24h/24",
    days: { monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim" },
  },
  en: {
    check_avail: "Check availability ›",
    view_hours: "View hours ›",
    hours: "Hours",
    back: "← Back",
    open_24h: "Open 24/7",
    days: { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" },
  },
  ar: {
    check_avail: "تحقق من التوفر ›",
    view_hours: "عرض أوقات العمل ›",
    hours: "الأوقات",
    back: "→ رجوع",
    open_24h: "مفتوح 24/7",
    days: { monday: "إث", tuesday: "ثل", wednesday: "أر", thursday: "خم", friday: "جم", saturday: "سب", sunday: "أح" },
  },
};

const ContactFlipCard = ({
  business,
  language,
  hasOpeningHours,
  animationDelay = "0ms",
  tallHeight = false,
  className = "",
  hasHotelMapping = false,
  isSearchingAvailability = false,
  onCheckAvailability,
  onOpenAvailabilitySearch,
  onOpenWebsite,
  openBadgeInfo,
}: ContactFlipCardProps) => {
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;
  const [flipped, setFlipped] = useState(false);

  const showHours = hasOpeningHours && !business.is_open_24h && !hasHotelMapping;
  const showHotel = hasHotelMapping;

  const backRef = useRef<HTMLDivElement>(null);
  const [backHeight, setBackHeight] = useState(0);

  useLayoutEffect(() => {
    if (backRef.current) {
      setBackHeight(backRef.current.scrollHeight + 8);
    }
  }, [showHours, business.opening_hours]);

  const frontHeight = "6.5em";

  return (
    <div
      className={`snap-start shrink-0 w-fit min-w-[16rem] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 transition-[height,width] duration-500 ease-in-out ${className}`}
      style={{
        perspective: "1000px",
        animationDelay,
        animationFillMode: "forwards",
        height: flipped && !showHotel && backHeight > 0 ? `${backHeight}px` : frontHeight,
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ─── FRONT ─── */}
        <div
          className="absolute inset-0 rounded-2xl text-white flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          {showHotel ? (
            /* Hotel mode: front shows only CTA */
            <div
              className="h-full flex flex-col items-center justify-center gap-2 cursor-pointer px-4"
              onClick={() => onOpenAvailabilitySearch?.()}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-white/60 uppercase tracking-wider font-extrabold">
                <Search className="h-3.5 w-3.5" />
                {L.check_avail}
              </span>
            </div>
          ) : (
            /* Non-hotel mode: front shows "Consultez les horaires" */
            <div
              className="h-full flex flex-col items-center justify-center gap-2 cursor-pointer px-4"
              onClick={() => showHours && setFlipped(true)}
            >
              {showHours && (
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {L.view_hours}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── BACK — Opening hours detail (non-hotel only) ─── */}
        {showHours && (
          <div
            ref={backRef}
            className="absolute inset-0 rounded-2xl p-3 text-white"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">
                <Clock className="h-3 w-3 inline mr-1" />
                {L.hours}
              </p>
              <button
                onClick={() => setFlipped(false)}
                className="text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider"
              >
                {L.back}
              </button>
            </div>
            <OpeningHoursBlock business={business} language={language} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Inline opening hours display for contact card */
function OpeningHoursBlock({
  business,
  language,
}: {
  business: {
    is_open_24h: boolean;
    opening_hours: unknown;
  };
  language: string;
}) {
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;

  const frToEn: Record<string, string> = {
    lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
    vendredi: "friday", samedi: "saturday", dimanche: "sunday",
  };
  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const rawHours = business.opening_hours as Record<string, any> | null;
  const hours = rawHours ? Object.entries(rawHours).reduce((acc, [k, v]) => {
    acc[frToEn[k] || k] = v;
    return acc;
  }, {} as Record<string, any>) : null;
  const now = new Date();
  const todayKey = dayOrder[now.getDay()];

  return (
    <div className="pt-1">
      {business.is_open_24h ? (
        <p className="text-white/80 text-sm">{L.open_24h}</p>
      ) : hours ? (
        <div className="space-y-0.5">
          {displayOrder.map((day) => {
            const dh = hours[day];
            if (!dh) return null;
            const formatted = formatDayHoursDisplay(dh, { language });
            if (!formatted || formatted.toLowerCase().includes("fermé") || formatted.toLowerCase().includes("closed"))
              return null;
            const isToday = day === todayKey;
            return (
              <div key={day} className={`flex text-xs ${isToday ? "font-bold" : ""}`}>
                <span className={`w-[2.5rem] shrink-0 font-medium ${isToday ? "text-white" : "text-white/70"}`}>
                  {L.days[day as keyof typeof L.days]}{isToday ? " ●" : ""}
                </span>
                <span className="text-white/80">{formatted}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default ContactFlipCard;
