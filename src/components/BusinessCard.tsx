import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

export interface BusinessCardData {
  id: string;
  name: string;
  city: string;
  region: string;
  address?: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  neighborhood?: string | null;
  logo_url: string | null;
  hook_fr?: string | null;
  images: string[] | null;
  categories: string[] | null;
  services?: string[] | null;
  default_service?: string | null;
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  google_rating?: number | null;
  tripadvisor_rating?: number | null;
  restaurant_guru_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
  gamme_id: string | null;
}

export interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

interface BusinessCardProps {
  business: BusinessCardData;
  gammes: Gamme[];
  verifiedLabel: string;
  selectedBusinessId?: string | null;
  onSelectBusiness?: (business: BusinessCardData) => void;
  showMapButton?: boolean;
  mapButtonLabels?: {
    view: string;
    shown: string;
  };
  mapButtonVariant?: "text" | "button";
  showAddress?: boolean;
}

const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SkypeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#00AFF0">
    <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882l-.029.135-.044-.24c.015.045.044.074.059.12.12-.675.181-1.363.181-2.052 0-1.529-.301-3.012-.898-4.42-.569-1.348-1.395-2.562-2.427-3.596-1.049-1.033-2.247-1.856-3.595-2.426-1.318-.631-2.801-.93-4.328-.93-.72 0-1.444.07-2.143.204l.119.06-.239-.033.119-.025C8.91.274 7.829 0 6.731 0c-1.789 0-3.47.698-4.736 1.967C.729 3.235.032 4.923.032 6.716c0 1.143.292 2.265.844 3.258l.02-.124.041.239-.06-.115c-.114.645-.172 1.299-.172 1.955 0 1.53.3 3.017.884 4.416.568 1.362 1.378 2.576 2.427 3.609a11.92 11.92 0 003.58 2.442c1.404.6 2.886.93 4.404.93.599 0 1.229-.06 1.868-.172l-.119-.062.239.033-.119.024c1.002.569 2.126.871 3.294.871 1.783 0 3.459-.69 4.733-1.963 1.259-1.259 1.962-2.951 1.962-4.749 0-1.138-.299-2.262-.853-3.266"/>
  </svg>
);

const getBusinessImage = (business: BusinessCardData): { src: string; isLogo: boolean } => {
  if (business.images && business.images.length > 0) return { src: business.images[0], isLogo: false };
  if (business.logo_url) return { src: business.logo_url, isLogo: true };
  return { src: "/placeholder.svg", isLogo: false };
};

const getBusinessGamme = (business: BusinessCardData, gammes: Gamme[]): Gamme | null => {
  if (!business.gamme_id) return null;
  return gammes.find(g => g.id === business.gamme_id) || null;
};

const getCalculatedRating = (business: BusinessCardData): number | null => {
  const sources: { rating: number; count: number }[] = [];
  
  if (business.google_rating && business.google_review_count) {
    sources.push({ rating: business.google_rating * 4, count: business.google_review_count });
  }
  if (business.tripadvisor_rating && business.tripadvisor_review_count) {
    sources.push({ rating: business.tripadvisor_rating * 4, count: business.tripadvisor_review_count });
  }
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) {
    sources.push({ rating: business.restaurant_guru_rating * 4, count: business.restaurant_guru_review_count });
  }
  
  if (sources.length === 0) return null;
  
  const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
  const weightedSum = sources.reduce((sum, s) => sum + s.rating * s.count, 0);
  return Math.round((weightedSum / totalCount) * 10) / 10;
};

const BusinessCard = ({
  business,
  gammes,
  verifiedLabel,
  selectedBusinessId,
  onSelectBusiness,
  showMapButton = false,
  mapButtonLabels = { view: "Voir sur la carte", shown: "Affiché sur la carte" },
  mapButtonVariant = "text",
  showAddress = false
}: BusinessCardProps) => {
  const gamme = getBusinessGamme(business, gammes);
  const calculatedRating = getCalculatedRating(business);
  const displayRating = business.rating ?? calculatedRating;
  const displayService = business.default_service || (business.services && business.services.length > 0 ? business.services[0] : null);
  const isSelected = selectedBusinessId === business.id;
  const hasMapData = business.google_maps_url || (business.latitude && business.longitude);
  const businessImage = getBusinessImage(business);

  const locationText = showAddress && business.address 
    ? business.address 
    : business.neighborhood 
      ? `${business.city}, ${business.neighborhood}`
      : `${business.city}, ${business.region}`;

  return (
    <Link to={`/business/${business.id}`}>
      <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative">
        {/* Image - 16:9 aspect ratio */}
        <div className={`aspect-video overflow-hidden relative ${businessImage.isLogo ? 'bg-white' : 'bg-muted'}`}>
          <img
            src={businessImage.src}
            alt={business.name}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${businessImage.isLogo ? 'object-contain p-4' : 'object-cover'}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          {/* Rating - top left */}
          {displayRating && (
            <div className="absolute top-2 left-2 flex flex-col items-center gap-0.5 bg-black/60 rounded-full px-2 py-1 z-10">
              <Star className="h-4 w-4 fill-gold text-gold" />
              <span className="text-gold font-semibold text-xs">{displayRating}/20</span>
            </div>
          )}
          {/* Gamme badge - top center */}
          {gamme && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
              <Badge 
                className="text-xs border border-black whitespace-nowrap"
                style={{ backgroundColor: gamme.color_hex || '#666666', color: gamme.text_color_hex || '#000000' }}
              >
                {gamme.name_fr}
              </Badge>
            </div>
          )}
          {/* Watermark logo for verified businesses - top right of image */}
          {business.wtuce_status === "verified" && (
            <img 
              src={logoWatermark} 
              alt="" 
              className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none"
            />
          )}
          {/* Hook overlay - bottom of image */}
          {business.hook_fr && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-4 pointer-events-none transition-all duration-300 group-hover:from-black/95 group-hover:via-black/60 group-hover:py-6">
              <p className="text-white text-lg group-hover:text-xl italic font-['Cormorant_Garamond'] line-clamp-2 group-hover:line-clamp-4 text-center leading-snug transition-all duration-300">
                {business.hook_fr}
              </p>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {business.categories && business.categories.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {business.categories[0]}
              </Badge>
            )}
            {displayService && (
              <Badge variant="outline" className="text-xs bg-black text-white border-black">
                {displayService}
              </Badge>
            )}
          </div>

          {/* Name */}
          <h3 className={`font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors ${business.wtuce_status === "verified" ? "text-foreground font-bold" : "text-foreground"}`}>
            {business.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{business.phone}</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[#25D366] hover:opacity-80 transition-opacity"
                title="WhatsApp"
              >
                <WhatsAppIcon />
                <span className="text-[#25D366] font-bold">WhatsApp</span>
              </a>
            )}
            {business.skype && (
              <a
                href={`skype:${business.skype}?chat`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[#00AFF0] hover:opacity-80 transition-opacity"
                title="Skype"
              >
                <SkypeIcon />
                <span className="text-[#00AFF0] font-bold">Skype</span>
              </a>
            )}
          </div>

          {/* View on map button */}
          {showMapButton && hasMapData && onSelectBusiness && (
            mapButtonVariant === "button" ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectBusiness(business);
                }}
                className={`w-full mt-3 text-xs py-1.5 px-2 rounded transition-colors flex items-center justify-center gap-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary"
                }`}
              >
                <MapPin className="h-3 w-3" />
                {isSelected ? mapButtonLabels.shown : mapButtonLabels.view}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectBusiness(business);
                }}
                className={`mt-3 flex items-center gap-1 text-xs font-bold transition-colors ${
                  isSelected
                    ? "text-gold"
                    : "text-muted-foreground hover:text-gold"
                }`}
              >
                <MapPin className="h-3 w-3" />
                {isSelected ? mapButtonLabels.shown : mapButtonLabels.view}
              </button>
            )
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default BusinessCard;
