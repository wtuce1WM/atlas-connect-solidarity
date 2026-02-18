import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Eye, ExternalLink } from "lucide-react";

interface GoogleMapEmbedProps {
  address: string;
  businessName: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}

const extractMarkerCoordsFromMapsUrl = (url: string): { lat: number; lng: number } | null => {
  // !8m2!3d{lat}!4d{lng} = actual pin coordinates in GMB data block
  // This avoids false matches on !3m, !4m, !4b segments that precede the real coords
  const dataBlockMatch = url.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (dataBlockMatch) return { lat: parseFloat(dataBlockMatch[1]), lng: parseFloat(dataBlockMatch[2]) };
  // Fallback: last occurrence of !3d...!4d pattern (most specific coordinates)
  const allMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
  }
  return null;
};

const GoogleMapEmbed = ({ address, businessName, latitude, longitude, googleMapsUrl }: GoogleMapEmbedProps) => {
  const [activeView, setActiveView] = useState<"map" | "streetview">("map");

  const markerCoords = googleMapsUrl ? extractMarkerCoordsFromMapsUrl(googleMapsUrl) : null;

  // Priority: !3d!4d coords from URL > explicit GPS > fallback defaults
  const resolvedLat = markerCoords?.lat ?? latitude ?? null;
  const resolvedLng = markerCoords?.lng ?? longitude ?? null;

  const encodedAddress = encodeURIComponent(`${businessName}, ${address}`);

  // If we have coordinates, use them as the query to guarantee correct location.
  // Coordinates-based query shows a pin at the exact spot; name+address can fail with tracking URLs.
  const mapQuery = resolvedLat && resolvedLng
    ? `${resolvedLat},${resolvedLng}`
    : encodeURIComponent(businessName + (address ? `, ${address}` : ""));
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
