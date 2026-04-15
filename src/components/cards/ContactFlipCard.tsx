import { useState, useRef, useLayoutEffect } from "react";
import { Clock, Search, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen } from "@/lib/formatOpeningHours";

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
  const isEn = language === "en";
  const [flipped, setFlipped] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultCheckout = new Date(tomorrow);
  defaultCheckout.setDate(defaultCheckout.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(fmt(tomorrow));
  const [checkOut, setCheckOut] = useState(fmt(defaultCheckout));
  const [adults, setAdults] = useState(2);
  const [selectingField, setSelectingField] = useState<"checkin" | "checkout">("checkin");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(fmt(tomorrow) + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = isEn
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const dayLabels = isEn ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  const todayStr = fmt(new Date());

  const prevMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  };
  const nextMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr <= todayStr) return;

    if (selectingField === "checkin") {
      setCheckIn(dateStr);
      if (dateStr >= checkOut) {
        const next = new Date(dateStr);
        next.setDate(next.getDate() + 1);
        setCheckOut(fmt(next));
      }
      setSelectingField("checkout");
    } else {
      if (dateStr <= checkIn) {
        setCheckIn(dateStr);
        setSelectingField("checkout");
      } else {
        setCheckOut(dateStr);
        setSelectingField("checkin");
      }
    }
  };

  const isInRange = (dateStr: string) => dateStr > checkIn && dateStr < checkOut;

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
      className={`snap-start shrink-0 ${showHotel ? (flipped ? 'w-[20rem]' : 'w-fit min-w-[16rem]') : 'w-fit min-w-[16rem]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 transition-[height,width] duration-500 ease-in-out ${className}`}
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
              {openBadgeInfo?.text && (
                <div className={`flex items-center gap-1 rounded-full py-1 px-3 text-[10px] font-bold uppercase tracking-wider ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  {openBadgeInfo.text}
                </div>
              )}
              <span className="flex items-center gap-1.5 text-[11px] text-white/60 uppercase tracking-wider font-extrabold">
                <Search className="h-3.5 w-3.5" />
                {isEn ? "Check availability ›" : "Vérifier la disponibilité ›"}
              </span>
            </div>
          ) : (
            /* Non-hotel mode: front shows badge + "Consultez les horaires" */
            <div
              className="h-full flex flex-col items-center justify-center gap-2 cursor-pointer px-4"
              onClick={() => showHours && setFlipped(true)}
            >
              {openBadgeInfo?.text && (
                <div className={`flex items-center gap-1 rounded-full py-1 px-3 text-[10px] font-bold uppercase tracking-wider ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  {openBadgeInfo.text}
                </div>
              )}
              {showHours && (
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {isEn ? "View hours ›" : "Consultez les horaires ›"}
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
                {isEn ? "Hours" : "Horaires"}
              </p>
              <button
                onClick={() => setFlipped(false)}
                className="text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider"
              >
                ← {isEn ? "Back" : "Retour"}
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
  const frToEn: Record<string, string> = {
    lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
    vendredi: "friday", samedi: "saturday", dimanche: "sunday",
  };
  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayNames: Record<string, string> = {
    monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu",
    friday: "Ven", saturday: "Sam", sunday: "Dim",
  };
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
        <p className="text-white/80 text-sm">Ouvert 24h/24</p>
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
                  {dayNames[day]}{isToday ? " ●" : ""}
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