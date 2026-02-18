import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Eye, ExternalLink } from "lucide-react";

interface GoogleMapEmbedProps {
  address: string;
  businessName: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface GoogleMapEmbedProps {
  address: string;
  businessName: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}

/**
 * Extract the place_id from a Google Maps URL in the format used by the Embed API.
 * Google Maps URLs encode the place_id as !1s<hex_low>:<hex_high>
 * The Embed API accepts place_id in the original format via the maps URL itself.
 */
const extractPlaceIdFromMapsUrl = (url: string): string | null => {
  // Match !1s0x...:0x... pattern (hex place id)
  const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  return match ? match[1] : null;
};

const extractMarkerCoordsFromMapsUrl = (url: string): { lat: number; lng: number } | null => {
  // !3d{lat}...!4d{lng} = actual pin coordinates (NOT viewport center @lat,lng)
  const match = url.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  return null;
};

const GoogleMapEmbed = ({ address, businessName, latitude, longitude, googleMapsUrl }: GoogleMapEmbedProps) => {
  const [activeView, setActiveView] = useState<"map" | "streetview">("map");

  const markerCoords = googleMapsUrl ? extractMarkerCoordsFromMapsUrl(googleMapsUrl) : null;
  const placeId = googleMapsUrl ? extractPlaceIdFromMapsUrl(googleMapsUrl) : null;

  const resolvedLat = markerCoords?.lat ?? latitude ?? null;
  const resolvedLng = markerCoords?.lng ?? longitude ?? null;

  const encodedAddress = encodeURIComponent(`${businessName}, ${address}`);

  // Best: place_id gives exact GMB marker + name. Fallback: coordinates or text search.
  const mapQuery = placeId
    ? `place_id:${placeId}`
    : resolvedLat && resolvedLng
    ? `${resolvedLat},${resolvedLng}`
    : encodedAddress;
  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`;
  const streetViewEmbedUrl = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location=${resolvedLat || 31.6295},${resolvedLng || -7.9811}&heading=0&pitch=0&fov=90`;

  const handleGetDirections = () => {
    const destination = resolvedLat && resolvedLng
      ? `${resolvedLat},${resolvedLng}`
      : encodedAddress;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
  };

  const handleOpenInMaps = () => {
    const query = resolvedLat && resolvedLng
      ? `${resolvedLat},${resolvedLng}`
      : encodedAddress;
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* View Toggle */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveView("map")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeView === "map"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <MapPin className="h-4 w-4" />
            Carte
          </button>
          <button
            onClick={() => setActiveView("streetview")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeView === "streetview"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Eye className="h-4 w-4" />
            Street View
          </button>
        </div>

        {/* Map Container */}
        <div className="relative h-[450px]">
          {activeView === "map" ? (
            <iframe
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Carte de ${businessName}`}
            />
          ) : (
            <iframe
              src={streetViewEmbedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Street View de ${businessName}`}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <Button
            onClick={handleGetDirections}
            className="w-full"
            variant="default"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Obtenir l'itinéraire
          </Button>
          <Button
            onClick={handleOpenInMaps}
            className="w-full"
            variant="outline"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir dans Google Maps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleMapEmbed;
