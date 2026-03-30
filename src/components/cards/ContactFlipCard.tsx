import { useState } from "react";
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink, Search, Loader2 } from "lucide-react";
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
  const [flipped, setFlipped] = useState(false);

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
                onClick={() => setFlipped(true)}
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
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                  <Globe className="h-4 w-4 shrink-0 text-white/60" />
                  {language === "en" ? "Website" : "Site web"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  onClick={() => onOpenWebsite?.(fullWebUrl)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
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
              />
            )}
          </div>
        </div>

        {/* BACK — Google Map */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="absolute top-0 right-0 p-3 z-10">
            <button
              onClick={() => setFlipped(false)}
              className="text-xs text-black font-bold hover:text-black/70 transition-colors uppercase tracking-wider drop-shadow-md"
            >
              ← {language === "en" ? "Back" : "Retour"}
            </button>
          </div>
          {business.latitude && business.longitude && flipped && (
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${business.latitude},${business.longitude}&zoom=13`}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/** Hotel availability widget — Airbnb-style */
function HotelAvailabilityWidget({
  language,
  hasLiteApiMapping,
  hasSerpApiMapping,
  onCheckAvailabilityLiteApi,
  onCheckAvailabilitySerpApi,
}: {
  language: string;
  hasLiteApiMapping?: boolean;
  hasSerpApiMapping?: boolean;
  onCheckAvailabilityLiteApi?: () => void;
  onCheckAvailabilitySerpApi?: () => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
      {hasLiteApiMapping && (
        <button
          onClick={onCheckAvailabilityLiteApi}
          className="w-full py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          LiteAPI
        </button>
      )}
      {hasSerpApiMapping && (
        <button
          onClick={onCheckAvailabilitySerpApi}
          className="w-full py-2.5 rounded-full bg-gold/90 text-black font-bold text-sm hover:bg-gold transition-colors flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          SerpAPI
        </button>
      )}
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
