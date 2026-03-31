import { useState, useRef, useCallback } from "react";
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink, Search, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen } from "@/lib/formatOpeningHours";
import { cleanPhone, whatsappUrl } from "@/lib/phoneUtils";

interface ContactFlipCardProps {
  business: {
    google_maps_url: string | null;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    website_force_external?: boolean;
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
}: ContactFlipCardProps) => {
  const [activeView, setActiveView] = useState<"contact" | "map" | "dates">("contact");
  const flipped = activeView !== "contact";

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] ${tallHeight ? 'h-[21.6em] md:h-[28.8em]' : 'h-[18em] md:h-[24em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 ${className}`}
      style={{ perspective: "1000px", animationDelay, animationFillMode: "forwards" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT — Contact info */}
        <div
          className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="space-y-2.5 text-sm">
            {business.google_maps_url && (
              <button
                onClick={() => setActiveView("map")}
                className="flex items-center justify-center w-full mb-1"
              >
                <MapPin
                  className="h-10 w-10 drop-shadow-lg hover:scale-110 transition-transform text-white"
                  style={{ animation: "map-pin-drop 0.5s ease-out 0.4s both" }}
                />
              </button>
            )}
            {business.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-white/60" />
                <span className="text-white/80">{business.address}</span>
              </div>
            )}
            {business.phone && (
              <a
                href={`tel:${cleanPhone(business.phone)}`}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-white/60" />
                {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a
                href={whatsappUrl(business.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#25D366] hover:text-[#20bd5a] transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                WhatsApp
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0 text-white/60" />
                Email
              </a>
            )}
            {business.website && (() => {
              const fullWebUrl = business.website.startsWith("http") ? business.website : `https://${business.website}`;
              const forceExt = business.website_force_external;
              return forceExt ? (
                <a
                  href={fullWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors normal-case tracking-normal font-['Roboto',sans-serif]"
                >
                  <Globe className="h-4 w-4 shrink-0 text-white/60" />
                  {language === "en" ? "Website" : "Site web"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  onClick={() => onOpenWebsite?.(fullWebUrl)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors normal-case tracking-normal font-['Roboto',sans-serif]"
                >
                  <Globe className="h-4 w-4 shrink-0 text-white/60" />
                  {language === "en" ? "Website" : "Site web"}
                </button>
              );
            })()}
            {hasOpeningHours && !business.is_open_24h && <OpeningHoursBlock business={business} language={language} />}

            {/* Hotel availability date picker */}
            {hasHotelMapping && (
              <HotelAvailabilityWidget
                language={language}
                isLoading={isSearchingAvailability}
                onCheckAvailability={onCheckAvailability}
                onOpenDatePicker={() => setActiveView("dates")}
              />
            )}
          </div>
        </div>

        {/* BACK — Google Map OR Date Picker */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Back button only for map view */}
          {activeView === "map" && (
            <div className="absolute top-0 right-0 p-3 z-10">
              <button
                onClick={() => setActiveView("contact")}
                className="text-xs text-black font-bold hover:text-black/70 transition-colors uppercase tracking-wider drop-shadow-md"
              >
                ← {language === "en" ? "Back" : "Retour"}
              </button>
            </div>
          )}

          {activeView === "map" && business.latitude && business.longitude && (
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${business.latitude},${business.longitude}&zoom=13`}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}

          {activeView === "dates" && (
            <DatePickerBack
              language={language}
              isLoading={isSearchingAvailability}
              onCheckAvailability={(ci, co, adults) => {
                onCheckAvailability?.(ci, co, adults);
                setActiveView("contact");
              }}
              onBack={() => setActiveView("contact")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/** Hotel availability widget — compact front-side summary */
function HotelAvailabilityWidget({
  language,
  isLoading,
  onCheckAvailability,
  onOpenDatePicker,
}: {
  language: string;
  isLoading?: boolean;
  onCheckAvailability?: (checkIn: string, checkOut: string, adults: number) => void;
  onOpenDatePicker?: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultCheckout = new Date(tomorrow);
  defaultCheckout.setDate(defaultCheckout.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(fmt(tomorrow));
  const [checkOut, setCheckOut] = useState(fmt(defaultCheckout));
  const [adults, setAdults] = useState(2);

  const isEn = language === "en";

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const months = isEn
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
      {/* Date fields + adults on same row */}
      <div className="flex rounded-xl overflow-hidden border border-white/20">
        {/* Check-in — opens date picker on back */}
        <button
          className="relative flex-1 bg-white/10 p-2 text-left hover:bg-white/20 transition-colors"
          onClick={() => onOpenDatePicker?.()}
        >
          <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold block mb-0.5">
            {isEn ? "CHECK-IN" : "ARRIVÉE"}
          </span>
          <span className="text-white font-bold text-sm">{formatDateShort(checkIn)}</span>
        </button>
        {/* Check-out — opens date picker on back */}
        <button
          className="relative flex-1 bg-white/10 p-2 border-l border-white/20 text-left hover:bg-white/20 transition-colors"
          onClick={() => onOpenDatePicker?.()}
        >
          <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold block mb-0.5">
            {isEn ? "CHECK-OUT" : "DÉPART"}
          </span>
          <span className="text-white font-bold text-sm">{formatDateShort(checkOut)}</span>
        </button>
        {/* Adults */}
        <div className="bg-white/10 px-3 py-2 border-l border-white/20 flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold block mb-0.5">
            {isEn ? "GUESTS" : "ADULTES"}
          </span>
          <select
            value={adults}
            onChange={e => setAdults(Number(e.target.value))}
            className="bg-black/50 text-white font-bold text-sm cursor-pointer text-center outline-none rounded px-1 border border-white/20 [color-scheme:dark]"
          >
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => onCheckAvailability?.(checkIn, checkOut, adults)}
        disabled={isLoading}
        className="w-full py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 normal-case tracking-normal font-['Roboto',sans-serif]"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {isEn ? "Check availability" : "Vérifier la disponibilité"}
      </button>
    </div>
  );
}

/** Full date picker on the back of the flip card */
function DatePickerBack({
  language,
  isLoading,
  onCheckAvailability,
  onBack,
}: {
  language: string;
  isLoading?: boolean;
  onCheckAvailability: (checkIn: string, checkOut: string, adults: number) => void;
  onBack: () => void;
}) {
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

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(checkIn + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
  // Adjust for Monday start: 0=Mon..6=Sun
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = isEn
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const dayLabels = isEn ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

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

  const todayStr = fmt(new Date());

  const handleDayClick = (day: number) => {
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr <= todayStr) return; // can't select past dates

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
        // If selected checkout <= checkin, treat as new checkin
        setCheckIn(dateStr);
        setSelectingField("checkout");
      } else {
        setCheckOut(dateStr);
        setSelectingField("checkin");
      }
    }
  };

  const isInRange = (dateStr: string) => dateStr > checkIn && dateStr < checkOut;

  return (
    <div className="h-full bg-black/90 text-white p-3 flex flex-col">
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

      {/* Search button */}
      <button
        onClick={() => onCheckAvailability(checkIn, checkOut, adults)}
        disabled={isLoading}
        className="mt-2 w-full py-2 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {isEn ? "Check availability" : "Vérifier la disponibilité"}
      </button>
    </div>
  );
}

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
  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayNames: Record<string, string> = {
    monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu",
    friday: "Ven", saturday: "Sam", sunday: "Dim",
  };
  const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const hours = business.opening_hours as Record<string, any> | null;
  const now = new Date();
  const todayKey = dayOrder[now.getDay()];
  const todayDh = todayKey && hours ? hours[todayKey] : null;
  const openNow = business.is_open_24h || isCurrentlyOpen(todayDh);

  return (
    <div className="mt-2 pt-2 border-t border-white/20">
      <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1.5">
        <Clock className="h-3 w-3 inline mr-1" />
        {language === "en" ? "Hours" : "Horaires"}
      </p>
      {business.is_open_24h ? (
        <p className="text-white/80 text-sm">Ouvert 24h/24</p>
      ) : hours ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

export default ContactFlipCard;
