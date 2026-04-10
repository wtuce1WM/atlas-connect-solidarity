import { useState } from "react";
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
  onOpenWebsite,
  openBadgeInfo,
}: ContactFlipCardProps) => {
  const isEn = language === "en";
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

  const showHours = hasOpeningHours && !business.is_open_24h;
  const showHotel = hasHotelMapping;

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] ${tallHeight ? 'h-[21.6em] md:h-[28.8em]' : 'h-[15em] md:h-[20em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 ${className}`}
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="h-full rounded-2xl p-3 text-white overflow-y-auto flex flex-col">
        {/* Opening hours */}
        {showHours && <OpeningHoursBlock business={business} language={language} />}
        {openBadgeInfo?.text && (
          <div className="flex justify-center mt-2">
            <div className={`flex items-center gap-1 rounded-full py-1 px-3 text-[10px] font-bold uppercase tracking-wider ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              {openBadgeInfo.text}
            </div>
          </div>
        )}

        {/* Hotel availability — calendar directly on front */}
        {showHotel && (
          <div className={`flex flex-col flex-1 min-h-0 ${showHours ? "mt-2 pt-2 border-t border-white/20" : ""}`}>
            {/* Field tabs */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setSelectingField("checkin")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  selectingField === "checkin" ? "bg-white text-black" : "bg-white/10 text-white/70"
                }`}
              >
                <span className="block text-[8px] uppercase tracking-wider opacity-60">
                  {isEn ? "CHECK-IN" : "ARRIVÉE"}
                </span>
                {checkIn.split("-").reverse().join("/")}
              </button>
              <button
                onClick={() => setSelectingField("checkout")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  selectingField === "checkout" ? "bg-white text-black" : "bg-white/10 text-white/70"
                }`}
              >
                <span className="block text-[8px] uppercase tracking-wider opacity-60">
                  {isEn ? "CHECK-OUT" : "DÉPART"}
                </span>
                {checkOut.split("-").reverse().join("/")}
              </button>
              <div className="bg-white/10 rounded-lg px-2 py-1.5 flex flex-col items-center">
                <span className="block text-[8px] uppercase tracking-wider opacity-60">
                  <Users className="h-3 w-3 inline" />
                </span>
                <select
                  value={adults}
                  onChange={e => setAdults(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs cursor-pointer text-center outline-none [color-scheme:dark] w-8"
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Calendar header */}
            <div className="flex items-center justify-between mb-1">
              <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold">
                {monthNames[calendarMonth.month]} {calendarMonth.year}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-0 mb-0.5">
              {dayLabels.map(d => (
                <div key={d} className="text-center text-[9px] text-white/40 font-medium">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0 flex-1 content-start">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isPast = dateStr <= todayStr;
                const isCheckIn = dateStr === checkIn;
                const isCheckOut = dateStr === checkOut;
                const inRange = isInRange(dateStr);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={isPast}
                    className={`aspect-square flex items-center justify-center text-[11px] rounded-md transition-colors
                      ${isPast ? "text-white/20 cursor-not-allowed" : "hover:bg-white/20 cursor-pointer"}
                      ${isCheckIn ? "bg-white text-black font-bold" : ""}
                      ${isCheckOut ? "bg-white text-black font-bold" : ""}
                      ${inRange ? "bg-white/15" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* CTA — directly triggers availability search */}
            <button
              onClick={() => onCheckAvailability?.(checkIn, checkOut, adults)}
              disabled={isSearchingAvailability}
              className="mt-2 w-fit mx-auto px-5 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 normal-case tracking-normal font-['Roboto',sans-serif] shrink-0"
            >
              {isSearchingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isEn ? "Check availability" : "Vérifier la disponibilité"}
            </button>
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
      <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1.5">
        <Clock className="h-3 w-3 inline mr-1" />
        {language === "en" ? "Hours" : "Horaires"}
      </p>
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
