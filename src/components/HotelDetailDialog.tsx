import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, BedDouble, ExternalLink, Building2 } from "lucide-react";

interface HotelOffer {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  room: {
    type: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
    description?: { text?: string };
  };
  price: { currency: string; total: string; base?: string };
  policies?: { paymentType?: string; cancellations?: { description?: { text?: string }; deadline?: string }[] };
}

export interface HotelResult {
  hotel: {
    hotelId: string;
    name: string;
    cityCode: string;
    latitude?: number;
    longitude?: number;
    rating?: string;
    address?: string;
    city?: string;
    mainImage?: string;
    amenities?: string[];
  };
  available: boolean;
  offers?: HotelOffer[];
}

interface Props {
  hotel: HotelResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatPrice: (price: string, currency: string) => string;
}

export default function HotelDetailDialog({ hotel, open, onOpenChange, formatPrice }: Props) {
  const { language } = useLanguage();
  const [dbBusiness, setDbBusiness] = useState<{ id: string; name: string; slug?: string } | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    if (!hotel || !open) { setDbBusiness(null); return; }
    const search = async () => {
      setLoadingDb(true);
      try {
        const name = hotel.hotel.name;
        const { data } = await supabase
          .from("businesses")
          .select("id, name")
          .ilike("name", `%${name.split(" ").slice(0, 3).join(" ")}%`)
          .eq("is_active", true)
          .limit(1);
        setDbBusiness(data?.[0] || null);
      } catch { setDbBusiness(null); }
      setLoadingDb(false);
    };
    search();
  }, [hotel, open]);

  if (!hotel) return null;

  const h = hotel.hotel;
  const offers = hotel.offers || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {h.name}
            {h.rating && (
              <Badge variant="secondary" className="ml-1">
                {"★".repeat(parseInt(h.rating))}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {h.address || h.city || h.cityCode}
          </DialogDescription>
        </DialogHeader>

        {/* Image */}
        {h.mainImage && (
          <img
            src={h.mainImage}
            alt={h.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        {/* DB cross-reference */}
        {dbBusiness && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === "en" ? "Listed on our platform" : "Référencé sur notre plateforme"}
              </p>
              <p className="text-xs text-muted-foreground">{dbBusiness.name}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={`/business/${dbBusiness.id}`}>
                {language === "en" ? "View" : "Voir"}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        )}

        {/* Amenities */}
        {h.amenities && h.amenities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {language === "en" ? "Amenities" : "Équipements"}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {h.amenities.slice(0, 15).map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {a}
                </Badge>
              ))}
              {h.amenities.length > 15 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{h.amenities.length - 15}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* All offers */}
        <div>
          <h3 className="text-sm font-semibold mb-2">
            {offers.length} {language === "en" ? "room offers" : "offres de chambres"}
          </h3>
          <div className="space-y-2">
            {offers.map((offer, idx) => (
              <div
                key={offer.id || idx}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {offer.room?.typeEstimated?.category?.replace(/_/g, " ") || offer.room?.type || "Standard"}
                  </p>
                  {offer.room?.description?.text && offer.room.description.text !== offer.room?.typeEstimated?.category && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {offer.room.description.text}
                    </p>
                  )}
                  {offer.policies?.paymentType && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {offer.policies.paymentType}
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-bold text-primary ml-3 shrink-0">
                  {formatPrice(offer.price.total, offer.price.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}