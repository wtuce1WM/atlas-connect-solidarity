import { useState } from "react";
import { X, Loader2, Calendar, Users, BedDouble, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface HotelAvailabilityOverlayProps {
  liteApiHotelId: string;
  businessName: string;
  onClose: () => void;
}

interface RoomOffer {
  id: string;
  room: {
    type?: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
    description?: { text?: string };
  };
  price: { currency: string; total: string };
  policies?: { paymentType?: string };
}

const HotelAvailabilityOverlay = ({ liteApiHotelId, businessName, onClose }: HotelAvailabilityOverlayProps) => {
  const { language } = useLanguage();

  const getDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return {
      checkIn: tomorrow.toISOString().split("T")[0],
      checkOut: dayAfter.toISOString().split("T")[0],
    };
  };

  const defaults = getDefaultDates();
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [adults, setAdults] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RoomOffer[] | null>(null);

  const formatPrice = (price: string, cur: string) => {
    try {
      return new Intl.NumberFormat(language === "ar" ? "ar-MA" : language === "en" ? "en-US" : "fr-FR", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 0,
      }).format(parseFloat(price));
    } catch {
      return `${price} ${cur}`;
    }
  };

  const handleSearch = async () => {
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error(language === "en" ? "Check-out must be after check-in" : "La date de départ doit être après la date d'arrivée");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
        body: {
          hotelIds: [liteApiHotelId],
          checkIn,
          checkOut,
          adults: parseInt(adults),
          rooms: parseInt(rooms),
          currency,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const hotels = data?.data || [];
      const allOffers: RoomOffer[] = [];
      for (const h of hotels) {
        if (h.available && h.offers) {
          allOffers.push(...h.offers);
        }
      }

      setResults(allOffers);
      if (allOffers.length === 0) {
        toast.info(language === "en" ? "No availability for these dates" : "Aucune disponibilité pour ces dates");
      } else {
        toast.success(`${allOffers.length} ${language === "en" ? "room(s) available" : "chambre(s) disponible(s)"}`);
      }
    } catch (err) {
      console.error("Availability check error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const titleCase = (s: string) =>
    s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s;

  return (
    <div className="absolute inset-0 z-[60] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0">
        <span className="text-sm font-semibold truncate">
          {language === "en" ? "Check availability" : "Vérifier la disponibilité"}
        </span>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors" title="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search form */}
      <div className="px-4 py-3 border-b space-y-3 shrink-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{businessName}</p>

        <div className="grid grid-cols-2 gap-2">
          {/* Check-in */}
          <div className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {language === "en" ? "Check-in" : "Arrivée"}
            </label>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={defaults.checkIn} className="h-8 text-xs" />
          </div>

          {/* Check-out */}
          <div className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {language === "en" ? "Check-out" : "Départ"}
            </label>
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn} className="h-8 text-xs" />
          </div>

          {/* Adults */}
          <div className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              {language === "en" ? "Adults" : "Adultes"}
            </label>
            <Select value={adults} onValueChange={setAdults}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rooms */}
          <div className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              {language === "en" ? "Rooms" : "Chambres"}
            </label>
            <Select value={rooms} onValueChange={setRooms}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Currency */}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MAD">MAD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>

          {/* Search button */}
          <Button onClick={handleSearch} disabled={loading} className="flex-1 h-8 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
            {loading
              ? (language === "en" ? "Searching..." : "Recherche...")
              : (language === "en" ? "Search" : "Rechercher")}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">
              {language === "en" ? "Checking availability..." : "Vérification de la disponibilité..."}
            </p>
          </div>
        )}

        {results !== null && !loading && results.length === 0 && (
          <div className="text-center py-8">
            <BedDouble className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              {language === "en" ? "No rooms available for these dates" : "Aucune chambre disponible pour ces dates"}
            </p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {results.length} {language === "en" ? "room(s) available" : "chambre(s) disponible(s)"}
            </p>
            {results.map((offer, idx) => {
              const roomName = titleCase(
                offer.room?.typeEstimated?.category?.replace(/_/g, " ") || offer.room?.type || "Standard"
              );
              return (
                <div key={offer.id || idx} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <BedDouble className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {roomName}
                      </p>
                      {offer.room?.description?.text && offer.room.description.text !== offer.room?.typeEstimated?.category && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {offer.room.description.text}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-base font-bold text-primary">
                        {formatPrice(offer.price.total, offer.price.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {language === "en" ? "total stay" : "séjour total"}
                      </p>
                    </div>
                  </div>
                  {offer.policies?.paymentType && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {offer.policies.paymentType === "deposit"
                        ? (language === "en" ? "Deposit" : "Acompte")
                        : offer.policies.paymentType}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelAvailabilityOverlay;
