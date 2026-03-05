import { useState } from "react";
import { X, Loader2, Calendar, Users, BedDouble, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface HotelAvailabilityOverlayProps {
  liteApiHotelId: string;
  businessName: string;
  businessCity?: string;
  backgroundImage?: string;
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
  policies?: { paymentType?: string; boardName?: string };
}

const HotelAvailabilityOverlay = ({ liteApiHotelId, businessName, businessCity, backgroundImage, onClose }: HotelAvailabilityOverlayProps) => {
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
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RoomOffer[] | null>(null);
  const [isFallback, setIsFallback] = useState(false);

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
    setIsFallback(false);

    try {
      const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
        body: {
          hotelIds: [liteApiHotelId],
          checkIn,
          checkOut,
          adults,
          rooms,
          currency,
          fallbackCityName: businessCity || undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const hotels = data?.data || [];
      const wasFallback = !!data?.fallback;
      setIsFallback(wasFallback);
      const allOffers: RoomOffer[] = [];
      for (const h of hotels) {
        if (h.available && h.offers) {
          allOffers.push(...h.offers);
        }
      }

      setResults(allOffers);
      if (allOffers.length === 0) {
        toast.info(language === "en" ? "No availability for these dates" : "Aucune disponibilité pour ces dates");
      } else if (wasFallback) {
        toast.success(language === "en" 
          ? `${allOffers.length} room(s) available nearby` 
          : `${allOffers.length} chambre(s) disponible(s) à proximité`);
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

  const currencies = ["EUR", "MAD", "USD"];

  return (
    <div className="absolute inset-0 z-[60] flex flex-col animate-fade-in overflow-hidden">
      {/* Background image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex flex-col">
          <span className="text-base font-bold text-white">
            {language === "en" ? "Check availability" : "Vérifier la disponibilité"}
          </span>
          <span className="text-sm text-white/80 truncate max-w-[250px]">{businessName}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="Fermer">
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Search form */}
      <div className="relative px-4 py-4 space-y-4 shrink-0">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {language === "en" ? "Check-in" : "Arrivée"}
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={defaults.checkIn}
              className="w-full h-11 rounded-xl border-0 bg-white/20 text-white px-3 text-sm font-medium backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {language === "en" ? "Check-out" : "Départ"}
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn}
              className="w-full h-11 rounded-xl border-0 bg-white/20 text-white px-3 text-sm font-medium backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Adults selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {language === "en" ? "Adults" : "Adultes"}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setAdults(n)}
                className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
                  adults === n
                    ? "bg-white text-black shadow-lg scale-105"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            {language === "en" ? "Rooms" : "Chambres"}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setRooms(n)}
                className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
                  rooms === n
                    ? "bg-white text-black shadow-lg scale-105"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Currency + Search */}
        <div className="flex gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/20">
            {currencies.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 h-11 text-xs font-bold transition-all ${
                  currency === c
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            {loading
              ? (language === "en" ? "Searching..." : "Recherche...")
              : (language === "en" ? "Search" : "Rechercher")}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="relative flex-1 overflow-y-auto px-4 py-3 pb-24">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
            <p className="mt-3 text-sm text-white/70">
              {language === "en" ? "Checking availability..." : "Vérification de la disponibilité..."}
            </p>
          </div>
        )}

        {results !== null && !loading && results.length === 0 && (
          <div className="text-center py-8">
            <BedDouble className="h-10 w-10 mx-auto text-white/40" />
            <p className="mt-3 text-sm text-white/70">
              {language === "en" ? "No rooms available for these dates" : "Aucune chambre disponible pour ces dates"}
            </p>
          </div>
        )}

        {results && results.length > 0 && !isFallback && (
          <div>
            <p className="text-xs font-semibold text-white/70 mb-3">
              {results.length} {language === "en" ? "room(s) available" : "chambre(s) disponible(s)"}
            </p>
            <div className="grid grid-cols-2 gap-2">
            {results.map((offer, idx) => {
              const roomName = titleCase(
                offer.room?.typeEstimated?.category?.replace(/_/g, " ") || offer.room?.type || "Standard"
              );
              return (
                <div key={offer.id || idx} className="bg-white/15 backdrop-blur-md rounded-xl p-2.5 space-y-1 border border-white/10">
                  <p className="text-xs font-semibold text-white flex items-center gap-1">
                    <BedDouble className="h-3 w-3 shrink-0 text-white/60" />
                    <span className="truncate">{roomName}</span>
                  </p>
                  {offer.room?.description?.text && offer.room.description.text !== offer.room?.typeEstimated?.category && (
                    <p className="text-[10px] text-white/60 line-clamp-2">
                      {offer.room.description.text}
                    </p>
                  )}
                  <p className="text-base font-bold text-white">
                    {formatPrice(offer.price.total, offer.price.currency)}
                  </p>
                  <p className="text-[10px] text-white/50">
                    {language === "en" ? "total stay" : "séjour total"}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {offer.policies?.boardName && (
                      <Badge variant="outline" className="text-[10px] border-white/30 text-white/70 px-1.5 py-0">
                        {offer.policies.boardName}
                      </Badge>
                    )}
                    {offer.policies?.paymentType && (
                      <Badge variant="outline" className="text-[10px] border-white/30 text-white/70 px-1.5 py-0">
                        {offer.policies.paymentType === "deposit"
                          ? (language === "en" ? "Deposit" : "Acompte")
                          : offer.policies.paymentType}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Fallback: redirect to hotel search page */}
        {results && results.length > 0 && isFallback && (
          <div className="text-center py-6 space-y-4">
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-4 space-y-3">
              <BedDouble className="h-10 w-10 mx-auto text-white/50" />
              <p className="text-sm text-white/80">
                {language === "en"
                  ? `No availability at ${businessName} for these dates.`
                  : `Pas de disponibilité pour ${businessName} à ces dates.`}
              </p>
              <p className="text-xs text-white/60">
                {language === "en"
                  ? `${results.length} rooms available in other hotels nearby.`
                  : `${results.length} chambres disponibles dans d'autres hôtels à proximité.`}
              </p>
              <a
                href={`/search?q=hotel+${encodeURIComponent(businessCity || '')}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors mt-2"
              >
                {language === "en" ? `Hotels in ${businessCity}` : `Hôtels à ${businessCity}`}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelAvailabilityOverlay;
