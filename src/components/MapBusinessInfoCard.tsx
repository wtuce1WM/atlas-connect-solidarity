import { useState } from "react";
import { MapPin, Phone, Star, Clock, Navigation, X } from "lucide-react";
import { cleanPhone, whatsappUrl } from "@/lib/phoneUtils";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";

export interface MapBusinessInfo {
  name: string;
  address?: string | null;
  city?: string;
  phone?: string | null;
  whatsapp?: string | null;
  skype?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: unknown;
  show_opening_hours?: boolean | null;
  is_open_24h?: boolean;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_rating?: number | null;
  restaurant_guru_review_count?: number | null;
}

interface MapBusinessInfoCardProps {
  business: MapBusinessInfo;
  onClose: () => void;
  hideDirections?: boolean;
  hideClose?: boolean;
}

const MapBusinessInfoCard = ({ business, onClose, hideDirections, hideClose }: MapBusinessInfoCardProps) => {
  const [showHours, setShowHours] = useState(false);

  // Compute weighted average rating
  const ratingDisplay = (() => {
    const sources = collectRatingSources(business);
    const avg = computeWeightedRatingOn20(sources);
    if (avg === null) return null;
    const totalCount = getTotalReviewCount(business);
    return { avg, totalCount };
  })();

  const directionsUrl = (() => {
    const destination = business.latitude && business.longitude
      ? `${business.latitude},${business.longitude}`
      : encodeURIComponent(`${business.name}, ${business.address || business.city || ""}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  })();

  return (
    <div data-info-card className="absolute top-1 left-2 right-2 z-10 bg-white text-black px-4 py-3 rounded shadow-lg sm:top-2 sm:left-2 sm:right-auto sm:min-w-[320px] sm:rounded">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-bold" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{business.name}</span>
        {!hideClose && (
          <button
            onClick={onClose}
            className="hover:bg-black/10 rounded p-1 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {ratingDisplay && (
        <div className="flex items-center gap-1 mb-1">
          <Star className="h-3 w-3 fill-gold text-gold" />
          <span className="text-xs font-bold text-gold">{ratingDisplay.avg}/20</span>
          <span className="text-[10px] text-gray-500">({ratingDisplay.totalCount} avis)</span>
        </div>
      )}

      <div className="space-y-1 text-xs">
        {business.address && (
          <div className="flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{business.address}</span>
          </div>
        )}
        {business.phone && (
          <a href={`tel:${cleanPhone(business.phone)}`} className="flex items-center gap-1 hover:text-primary">
            <Phone className="h-3 w-3 flex-shrink-0" />
            {business.phone}
          </a>
        )}
        {business.whatsapp && (
          <a
            href={whatsappUrl(business.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold"
          >
            <Phone className="h-3 w-3 flex-shrink-0" />
            WhatsApp: {business.whatsapp}
          </a>
        )}
        {business.skype && (
          <a
            href={`skype:${business.skype}?chat`}
            className="flex items-center gap-1 text-[#00AFF0] hover:text-[#00AFF0]/80"
          >
            <Phone className="h-3 w-3 flex-shrink-0" />
            Skype: {business.skype}
          </a>
        )}
        {(business.is_open_24h || (business.show_opening_hours && business.opening_hours)) && (
          <div className="pt-1 border-t border-gray-200 mt-1">
            {business.is_open_24h ? (
              <>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Horaires</span>
                </div>
                <span className="text-primary font-medium mt-0.5 block">Ouvert 24h/24</span>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowHours(!showHours);
                  }}
                  className="flex items-center gap-1 font-medium hover:text-primary transition-colors w-full"
                >
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Horaires</span>
                  <span className="ml-auto text-[10px]">{showHours ? "▲" : "▼"}</span>
                </button>
                {showHours && (
                  <div className="text-[10px] mt-1 animate-fade-in">
                    {(() => {
                      const frToEn: Record<string, string> = {
                        lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
                        vendredi: "friday", samedi: "saturday", dimanche: "sunday",
                      };
                      const rawHours = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
                      const hours = Object.entries(rawHours).reduce((acc, [k, v]) => {
                        acc[frToEn[k] || k] = v;
                        return acc;
                      }, {} as Record<string, any>);
                      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                      const dayLabels: Record<string, string> = {
                        monday: "Lun", tuesday: "Mar", wednesday: "Mer",
                        thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim",
                      };
                      return days.map((day) => {
                        const dayData = hours[day];
                        if (!dayData) return null;
                        const slot1 = dayData.open && dayData.close ? `${dayData.open}-${dayData.close}` : "";
                        const slot2 = dayData.open2 && dayData.close2 && !dayData.continuous ? `${dayData.open2}-${dayData.close2}` : "";
                        const display = dayData.closed ? "Fermé" : slot1 ? (slot2 ? `${slot1} / ${slot2}` : slot1) : "Fermé";
                        return (
                          <div key={day} className="flex justify-between gap-2">
                            <span>{dayLabels[day]}</span>
                            <span>{display}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {!hideDirections && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 text-primary font-bold hover:text-primary/80 transition-colors"
          >
            <Navigation className="h-3 w-3 flex-shrink-0" />
            Itinéraire
          </a>
        )}
      </div>
    </div>
  );
};

export default MapBusinessInfoCard;
