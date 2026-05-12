import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Eye, ExternalLink, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GoogleMapEmbedProps {
  address: string;
  businessName: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  fillHeight?: boolean;
}

const extractPlaceNameFromMapsUrl = (url: string): string | null => {
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  return null;
};

const extractMarkerCoordsFromMapsUrl = (url: string): { lat: number; lng: number } | null => {
  // !8m2!3d{lat}!4d{lng} = actual pin coordinates in GMB data block
  const dataBlockMatch = url.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (dataBlockMatch) return { lat: parseFloat(dataBlockMatch[1]), lng: parseFloat(dataBlockMatch[2]) };
  const allMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
  }
  return null;
};

const GoogleMapEmbed = ({ address, businessName, latitude, longitude, googleMapsUrl, fillHeight }: GoogleMapEmbedProps) => {
  const [activeView, setActiveView] = useState<"map" | "streetview">("map");

  const markerCoords = googleMapsUrl ? extractMarkerCoordsFromMapsUrl(googleMapsUrl) : null;
  const placeName = googleMapsUrl ? extractPlaceNameFromMapsUrl(googleMapsUrl) : null;

  // Priority: !3d!4d coords from URL > explicit GPS > fallback defaults
  const resolvedLat = markerCoords?.lat ?? latitude ?? null;
  const resolvedLng = markerCoords?.lng ?? longitude ?? null;

  const encodedAddress = encodeURIComponent(`${businessName}, ${address}`);

  // Build map embed URL: when we have exact coordinates, use them to avoid
  // Google resolving a place name to a different location.
  // Append coordinates to the place name query for precision.
  const embedQuery = resolvedLat && resolvedLng
    ? `${resolvedLat},${resolvedLng}`
    : placeName 
      ? placeName 
      : businessName + (address ? `, ${address}` : "");
  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(embedQuery)}&zoom=17`;
  const streetViewEmbedUrl = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_EMBED_KEY}&location=${resolvedLat || 31.6295},${resolvedLng || -7.9811}&heading=0&pitch=0&fov=90`;

  const handleGetDirections = () => {
    const destination = resolvedLat && resolvedLng
      ? `${resolvedLat},${resolvedLng}`
      : encodedAddress;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
  };

  const handleNavigateWith = (app: "waze" | "apple") => {
    const lat = resolvedLat;
    const lng = resolvedLng;
    if (app === "waze") {
      const url = lat && lng
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
      window.open(url, "_blank");
    } else {
      const url = lat && lng
        ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
        : `https://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
      window.open(url, "_blank");
    }
  };

  const handleOpenInMaps = () => {
    const query = resolvedLat && resolvedLng
      ? `${resolvedLat},${resolvedLng}`
      : encodedAddress;
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <Card className={fillHeight ? "h-full flex flex-col" : ""}>
      <CardContent className={`p-0 ${fillHeight ? "flex-1 flex flex-col" : ""}`}>
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
        <div className={`relative overflow-hidden ${fillHeight ? "flex-1 min-h-0" : "h-[450px]"}`}>
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
          {/* Overlays to hide Google controls */}
          <div className="absolute top-0 left-0 right-0 h-[40px] bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-[26px] bg-background pointer-events-auto" />
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handleGetDirections}
              className="flex-1"
              variant="default"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Obtenir l'itinéraire
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="icon">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleGetDirections}>
                  <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4 mr-2" />
                  Google Maps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigateWith("waze")}>
                  <img src="https://www.waze.com/favicon.ico" alt="" className="h-4 w-4 mr-2" />
                  Waze
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigateWith("apple")}>
                  <img src="https://www.apple.com/favicon.ico" alt="" className="h-4 w-4 mr-2" />
                  Apple Plans
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
