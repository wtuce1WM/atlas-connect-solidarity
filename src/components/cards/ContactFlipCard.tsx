import { useState } from "react";
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen } from "@/lib/formatOpeningHours";

interface ContactFlipCardProps {
  business: {
    google_maps_url: string | null;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
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
}

const ContactFlipCard = ({
  business,
  language,
  hasOpeningHours,
  animationDelay = "0ms",
  className = "",
}: ContactFlipCardProps) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] h-[18em] md:h-[24em] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 ${className}`}
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
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-white/60" />
                {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`}
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
            {business.website && (
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Globe className="h-4 w-4 shrink-0 text-white/60" />
                {language === "en" ? "Website" : "Site web"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {hasOpeningHours && <OpeningHoursBlock business={business} language={language} />}
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
              className="w-full h-full border-0 pointer-events-none"
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
          <div className="mt-6 flex justify-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                openNow ? "bg-[#25D366] text-white" : "bg-black text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              {openNow
                ? language === "en" ? "Open" : language === "ar" ? "مفتوح" : "Ouvert"
                : language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé"}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ContactFlipCard;
