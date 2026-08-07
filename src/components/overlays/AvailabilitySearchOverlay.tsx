import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users, Loader2, X } from "lucide-react";

interface AvailabilitySearchOverlayProps {
  language: string;
  isSearching: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  onSearch: (checkIn: string, checkOut: string, adults: number) => void;
  onClose: () => void;
  /** Rendu inline (sans fond noir plein écran ni bouton fermer) */
  inline?: boolean;
}

export default function AvailabilitySearchOverlay({ language, isSearching, initialCheckIn, initialCheckOut, initialAdults, onSearch, onClose, inline }: AvailabilitySearchOverlayProps) {
  const isEn = language === "en";

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const todayStrInit = fmt(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultCheckout = new Date(tomorrow);
  defaultCheckout.setDate(defaultCheckout.getDate() + 3);

  // Priority: explicit initial props > sessionStorage > defaults
  const STORAGE_KEY = "hotel_availability_last_search";
  const saved = (() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed?.checkIn && parsed?.checkOut && parsed?.adults &&
        parsed.checkIn > todayStrInit && parsed.checkOut > parsed.checkIn
      ) return parsed;
    } catch { /* ignore */ }
    return null;
  })();

  const validInitialCheckIn = initialCheckIn && initialCheckIn > todayStrInit ? initialCheckIn : null;
  const validInitialCheckOut = initialCheckOut && initialCheckOut > (validInitialCheckIn || todayStrInit) ? initialCheckOut : null;

  const [checkIn, setCheckIn] = useState<string>(validInitialCheckIn ?? saved?.checkIn ?? fmt(tomorrow));
  const [checkOut, setCheckOut] = useState<string>(validInitialCheckOut ?? saved?.checkOut ?? fmt(defaultCheckout));
  const [adults, setAdults] = useState<number>(initialAdults ?? saved?.adults ?? 2);
  const [selectingField, setSelectingField] = useState<"checkin" | "checkout">("checkin");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date((validInitialCheckIn ?? saved?.checkIn ?? fmt(tomorrow)) + "T12:00:00");
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

  const card = (
      <div
        className={`backdrop-blur-md border border-white/20 rounded-2xl p-5 text-white ${inline ? "w-full max-w-full" : "w-[22rem] max-w-[95vw] animate-zoom-out-center"}`}
        style={{ backgroundColor: "#3B3B3B" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#ECD6B8" }}>
            <Search className="h-4 w-4" />
            {isEn ? "Check availability" : "Vérifier la disponibilité"}
          </p>
          {!inline && (
            <button onClick={onClose} className="p-1.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-md" title="Fermer">
              <X className="h-4 w-4 text-black" />
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setSelectingField("checkin")}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              selectingField === "checkin" ? "bg-white text-black" : "bg-white/10 text-white/70"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-wider opacity-60">
              {isEn ? "CHECK-IN" : "ARRIVÉE"}
            </span>
            {checkIn.split("-").reverse().join("/")}
          </button>
          <button
            onClick={() => setSelectingField("checkout")}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              selectingField === "checkout" ? "bg-white text-black" : "bg-white/10 text-white/70"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-wider opacity-60">
              {isEn ? "CHECK-OUT" : "DÉPART"}
            </span>
            {checkOut.split("-").reverse().join("/")}
          </button>
          <div className="bg-white/10 rounded-lg px-2 py-2 flex flex-col items-center">
            <span className="block text-[9px] uppercase tracking-wider opacity-60">
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

        <div className="flex items-center justify-between mb-1">
          <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">
            {monthNames[calendarMonth.month]} {calendarMonth.year}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0 mb-1">
          {dayLabels.map(d => (
            <div key={d} className="text-center text-[10px] text-white/40 font-medium">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
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
                className={`aspect-square flex items-center justify-center text-xs rounded-md transition-colors
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

        <button
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ checkIn, checkOut, adults }));
            } catch { /* ignore */ }
            onSearch(checkIn, checkOut, adults);
          }}
          disabled={isSearching}
          className="mt-4 w-full px-4 rounded-lg bg-white text-black font-medium text-xs md:text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 normal-case tracking-normal whitespace-nowrap shrink-0"
          style={{ fontFamily: "'Montserrat', sans-serif", height: '40px' }}
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <Search className="h-4 w-4 text-black" />}
          <span>{isEn ? "Check availability" : "Vérifier la disponibilité"}</span>
        </button>
      </div>
  );

  if (inline) return card;

  return (
    <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      {card}
    </div>
  );
}