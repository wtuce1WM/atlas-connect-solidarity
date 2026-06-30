import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import { useLanguage } from "@/contexts/LanguageContext";

interface MapCardProps {
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl?: string | null;
  businessName: string;
  tallHeight?: boolean;
  animationDelay?: string;
  className?: string;
  onClick?: () => void;
}

const LABELS = {
  fr: { map_of: "Carte de" },
  en: { map_of: "Map of" },
  ar: { map_of: "خريطة" },
};

const extractMarkerCoordsFromMapsUrl = (url: string): { lat: number; lng: number } | null => {
  const dataBlockMatch = url.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (dataBlockMatch) return { lat: parseFloat(dataBlockMatch[1]), lng: parseFloat(dataBlockMatch[2]) };
  const allMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
  }
  return null;
};

const MapCard = ({
  latitude,
  longitude,
  googleMapsUrl,
  businessName,
  tallHeight = false,
  animationDelay = "0ms",
  className = "",
  onClick,
}: MapCardProps) => {
  const { language } = useLanguage();
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;

  const markerCoords = googleMapsUrl ? extractMarkerCoordsFromMapsUrl(googleMapsUrl) : null;
  const lat = markerCoords?.lat ?? latitude;
  const lng = markerCoords?.lng ?? longitude;

  if (!lat || !lng) return null;

  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${lat},${lng}&zoom=15`;

  return (
    <div
      className={`snap-start shrink-0 w-[16rem] ${tallHeight ? 'h-[21.6em] md:h-[28.8em]' : 'h-[6.5em]'} mb-4 rounded-2xl overflow-hidden border border-white/10 animate-slide-in-left opacity-0 relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ animationDelay, animationFillMode: "forwards" }}
      onClick={onClick}
    >
      <iframe
        src={embedUrl}
        className={`w-full h-full border-0 ${onClick ? 'pointer-events-none' : ''}`}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${L.map_of} ${businessName}`}
      />
    </div>
  );
};

export default MapCard;
