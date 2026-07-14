import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Calendar, Users, BedDouble, Search, ArrowRight, Star, MapPin, Wifi, Coffee, Accessibility, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logoWatermark from "@/assets/logoGOLDsimple.webp";

export interface RoomOffer {
  id: string;
  room: {
    type?: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
    description?: { text?: string };
  };
  price: { currency: string; total: string };
  policies?: { paymentType?: string; boardName?: string };
}

export interface FallbackHotel {
  hotelId: string;
  businessId?: string;
  name: string;
  rating?: string;
  guestRating?: number | string;
  reviewCount?: number;
  wtuce_status?: string;
  accessibilityAttributes?: { attributes?: string[]; [key: string]: unknown } | null;
  address?: string;
  mainImage?: string;
  amenities?: string[];
  offers: RoomOffer[];
  // Our DB data
  dbImage?: string;
  dbGoogleRating?: number | null;
  dbGoogleReviewCount?: number | null;
  dbTripadvisorRating?: number | null;
  dbTripadvisorReviewCount?: number | null;
  // SerpAPI enrichment
  serpPrice?: { amount: string; currency: string } | null;
  reserveNowUrl?: string | null;
  manualPriceRange?: string | null;
  gamme?: { name_fr: string; color_hex: string | null; text_color_hex: string | null } | null;
  isCurrentHotel?: boolean;
  dealDescription?: string | null;
  dbBusiness?: Record<string, any> | null;
}

export interface FallbackPanelData {
  hotels: FallbackHotel[];
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  source?: "serpapi" | "db";
  gammes?: { id: string; name_fr: string; color_hex: string | null; text_color_hex: string | null; sort_order?: number | null }[];
}

interface HotelAvailabilityOverlayProps {
  liteApiHotelId: string;
  businessName: string;
  businessCity?: string;
  backgroundImage?: string;
  onClose: () => void;
  onSelectBusiness?: (businessId: string) => void;
  onOpenFallbackPanel?: (data: FallbackPanelData) => void;
}

const HotelAvailabilityOverlay = ({ liteApiHotelId, businessName, businessCity, backgroundImage, onClose, onSelectBusiness, onOpenFallbackPanel }: HotelAvailabilityOverlayProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Detect mobile/tablet (< 1024px) to render as portal above BusinessSlidePanel
  const [isMobileTablet, setIsMobileTablet] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobileTablet(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobileTablet(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

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
  const [directHotelInfo, setDirectHotelInfo] = useState<{
    guestRating?: number | string;
    reviewCount?: number;
    amenities?: string[];
    address?: string;
    accessibilityAttributes?: { attributes?: string[]; [key: string]: unknown } | null;
    rating?: string;
  } | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackHotels, setFallbackHotels] = useState<FallbackHotel[]>([]);
  const [showFallbackPanel, setShowFallbackPanel] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [citySearchLoading, setCitySearchLoading] = useState(false);

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

  const getLowestPrice = (offers: RoomOffer[]) => {
    if (!offers.length) return null;
    let lowest = offers[0];
    for (const o of offers) {
      if (parseFloat(o.price.total) < parseFloat(lowest.price.total)) lowest = o;
    }
    return lowest;
  };

  const handleSearch = async () => {
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error(language === "en" ? "Check-out must be after check-in" : "La date de départ doit être après la date d'arrivée");
      return;
    }

      setLoading(true);
      setResults(null);
      setDirectHotelInfo(null);
      setIsFallback(false);
      setFallbackHotels([]);
    setShowFallbackPanel(false);

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
      const fbHotels: FallbackHotel[] = [];

      for (const h of hotels) {
        if (h.available && h.offers) {
          allOffers.push(...h.offers);
          if (!wasFallback && h.hotelId === liteApiHotelId) {
            setDirectHotelInfo({
              guestRating: h.guestRating,
              reviewCount: h.reviewCount,
              amenities: h.amenities || [],
              address: h.address,
              accessibilityAttributes: h.accessibilityAttributes || null,
              rating: h.rating,
            });
          }
          if (wasFallback) {
            fbHotels.push({
              hotelId: h.hotelId,
              name: h.name || "Hotel",
              rating: h.rating,
              guestRating: h.guestRating,
              reviewCount: h.reviewCount,
              accessibilityAttributes: h.accessibilityAttributes || null,
              address: h.address,
              mainImage: h.mainImage,
              amenities: h.amenities || [],
              offers: h.offers,
            });
          }
        }
      }

      // Filter fallback hotels to only those linked via hotel_api_mappings
      let linkedFbHotels = fbHotels;
      if (wasFallback && fbHotels.length > 0) {
        const fbIds = fbHotels.map(h => h.hotelId);
        const { data: mappings } = await (supabase as any)
          .rpc("get_hotel_mappings_by_liteapi_ids", { _ids: fbIds });
        const mappingMap = new Map(((mappings as any[]) || []).map((m: any) => [m.liteapi_hotel_id, m.business_id]));
        // Enrich with wtuce_status from businesses table
        const businessIds = [...mappingMap.values()].filter(Boolean) as string[];
        let bizDataMap = new Map<string, any>();
        if (businessIds.length > 0) {
          const { data: bizData } = await supabase
            .from("businesses")
            .select("id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, images, name")
            .in("id", businessIds);
          bizDataMap = new Map((bizData || []).map(b => [b.id, b]));
        }
        linkedFbHotels = fbHotels
          .filter(h => mappingMap.has(h.hotelId))
          .map(h => {
            const biz = bizDataMap.get(mappingMap.get(h.hotelId) || "");
            return {
              ...h,
              businessId: mappingMap.get(h.hotelId) || undefined,
              wtuce_status: biz?.wtuce_status || undefined,
              name: biz?.name || h.name,
              dbImage: biz?.images?.[0] || undefined,
              dbGoogleRating: biz?.google_rating,
              dbGoogleReviewCount: biz?.google_review_count,
              dbTripadvisorRating: biz?.tripadvisor_rating,
              dbTripadvisorReviewCount: biz?.tripadvisor_review_count,
            };
          });
        
      }

      setResults(allOffers);
      setFallbackHotels(linkedFbHotels);

      if (allOffers.length === 0) {
        toast.info(language === "en" ? "No availability for these dates" : "Aucune disponibilité pour ces dates");
      } else if (wasFallback) {
        if (linkedFbHotels.length > 0) {
          toast.success(language === "en"
            ? `${linkedFbHotels.length} hotel(s) available nearby`
            : `${linkedFbHotels.length} hôtel(s) disponible(s) à proximité`);
        } else {
          toast.info(language === "en" ? "No linked hotels available" : "Aucun hôtel référencé disponible");
        }
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

  const handleCitySearch = async () => {
    if (citySearchLoading) return;
    setCitySearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
        body: {
          hotelIds: [],
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
      const fbHotels: FallbackHotel[] = [];
      for (const h of hotels) {
        if (h.available && h.offers) {
          fbHotels.push({
            hotelId: h.hotelId,
            name: h.name || "Hotel",
            rating: h.rating,
            guestRating: h.guestRating,
            reviewCount: h.reviewCount,
            accessibilityAttributes: h.accessibilityAttributes || null,
            address: h.address,
            mainImage: h.mainImage,
            amenities: h.amenities || [],
            offers: h.offers,
          });
        }
      }

      // Filter to mapped hotels only
      if (fbHotels.length > 0) {
        const fbIds = fbHotels.map(h => h.hotelId);
        const { data: mappings } = await supabase
          .from("hotel_api_mappings")
          .select("liteapi_hotel_id, business_id")
          .in("liteapi_hotel_id", fbIds);
        const mappingMap = new Map((mappings || []).map(m => [m.liteapi_hotel_id, m.business_id]));
        // Enrich with our DB data
        const businessIds2 = [...mappingMap.values()].filter(Boolean) as string[];
        let bizDataMap2 = new Map<string, any>();
        if (businessIds2.length > 0) {
          const { data: bizData2 } = await supabase
            .from("businesses")
            .select("id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, images, name")
            .in("id", businessIds2);
          bizDataMap2 = new Map((bizData2 || []).map(b => [b.id, b]));
        }
        const linked = fbHotels
          .filter(h => mappingMap.has(h.hotelId) && h.hotelId !== liteApiHotelId)
          .map(h => {
            const biz = bizDataMap2.get(mappingMap.get(h.hotelId) || "");
            return {
              ...h,
              businessId: mappingMap.get(h.hotelId) || undefined,
              wtuce_status: biz?.wtuce_status || undefined,
              name: biz?.name || h.name,
              dbImage: biz?.images?.[0] || undefined,
              dbGoogleRating: biz?.google_rating,
              dbGoogleReviewCount: biz?.google_review_count,
              dbTripadvisorRating: biz?.tripadvisor_rating,
              dbTripadvisorReviewCount: biz?.tripadvisor_review_count,
            };
          });
        setFallbackHotels(linked);
        if (linked.length > 0) {
          if (onOpenFallbackPanel) {
            onOpenFallbackPanel({ hotels: linked, city: businessCity || "", checkIn, checkOut, adults });
            onClose();
          } else {
            setShowFallbackPanel(true);
          }
        } else {
          toast.info(language === "en" ? "No linked hotels available" : "Aucun hôtel référencé disponible");
        }
      } else {
        toast.info(language === "en" ? "No availability found" : "Aucune disponibilité trouvée");
      }
    } catch (err) {
      console.error("City search error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCitySearchLoading(false);
    }
  };

  const titleCase = (s: string) =>
    s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s;

  const currencies = ["EUR", "MAD", "USD"];

  const overlayContent = (
    <div className={`${isMobileTablet ? "fixed inset-0 z-[210]" : "absolute inset-0 z-[60]"} flex flex-col animate-fade-in overflow-hidden`}>
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
        <button onClick={onClose} className="p-1.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-md" title="Fermer">
          <X className="h-5 w-5 text-black" />
        </button>
      </div>

      {/* Search form */}
      <div className="relative px-4 py-4 space-y-4 shrink-0">
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
            className="flex-1 h-11 rounded-xl text-sm font-bold bg-[image:var(--gradient-gold)] text-gold-foreground hover:opacity-90"
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

            {/* CTA: Similar establishments with same criteria */}
            <div
              onClick={handleCitySearch}
              className="bg-[image:var(--gradient-gold)] text-gold-foreground rounded-xl p-2.5 space-y-1 border border-gold/30 cursor-pointer hover:opacity-90 transition-colors flex flex-col items-center justify-center text-center"
            >
              {citySearchLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-black/70 mb-1" />
              ) : (
                <Search className="h-5 w-5 text-black/70 mb-1" />
              )}
              <p className="text-xs font-semibold text-black">
                {language === "en"
                  ? "Similar hotels with the same criteria"
                  : "Établissements similaires avec les mêmes critères"}
              </p>
              <p className="text-[10px] text-black/60 flex items-center gap-1">
                {checkIn} → {checkOut} · {adults} {language === "en" ? "adult(s)" : "adulte(s)"}
                <ArrowRight className="h-3 w-3" />
              </p>
            </div>
            </div>
          </div>
        )}

        {/* Fallback: show CTA to open nearby hotels panel */}
        {results && results.length > 0 && isFallback && fallbackHotels.length > 0 && (
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
                  ? `${fallbackHotels.length} hotel(s) available nearby.`
                  : `${fallbackHotels.length} hôtel(s) disponible(s) à proximité.`}
              </p>
              <button
                onClick={() => {
                  if (onOpenFallbackPanel) {
                    onOpenFallbackPanel({ hotels: fallbackHotels, city: businessCity || "", checkIn, checkOut, adults });
                    onClose();
                  } else {
                    setShowFallbackPanel(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors mt-2"
              >
                {language === "en" ? `Available hotels in ${businessCity}` : `Hôtels disponibles à ${businessCity}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fallback hotels left panel overlay */}
      {showFallbackPanel && createPortal(
        <div className="fixed inset-0 z-[220] flex animate-fade-in" style={{ top: "62px" }}>
          {/* Desktop: left panel, Mobile/Tablet: bottom sheet */}
          <div className="
            w-full lg:w-1/2 bg-black/90 backdrop-blur-md flex flex-col overflow-hidden
            fixed lg:relative
            bottom-0 left-0 lg:bottom-auto lg:left-auto
            h-[85vh] lg:h-full
            rounded-t-2xl lg:rounded-none
            animate-slide-up-from-bottom lg:animate-slide-in-left
          ">
            {/* Drag handle – mobile only */}
            <div className="lg:hidden flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div>
                <p className="text-sm font-bold text-white">
                  {language === "en" ? `Hotels in ${businessCity}` : `Hôtels à ${businessCity}`}
                </p>
                <p className="text-xs text-white/60">
                  {checkIn} → {checkOut} · {adults} {language === "en" ? "adult(s)" : "adulte(s)"}
                </p>
              </div>
              <button
                onClick={() => setShowFallbackPanel(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Hotel grid – 2 per row, square thumbnails */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-3">
                {fallbackHotels.filter(h => h.hotelId !== selectedHotelId).map((hotel) => {
                  const cheapest = getLowestPrice(hotel.offers);
                  const starCount = hotel.rating ? parseInt(hotel.rating) : 0;
                  const guestRatingNum = hotel.guestRating ? Number(hotel.guestRating) : null;
                  const guestRatingLabel = guestRatingNum
                    ? guestRatingNum >= 9 ? (language === "en" ? "Wonderful" : "Merveilleux")
                      : guestRatingNum >= 8 ? (language === "en" ? "Very good" : "Très bien")
                      : guestRatingNum >= 7 ? (language === "en" ? "Good" : "Bon")
                      : (language === "en" ? "Pleasant" : "Agréable")
                    : null;
                  const bestOffer = cheapest;
                  const boardName = bestOffer?.policies?.boardName;
                  // Compute discount: if multiple offers, compare highest to lowest
                  const allPrices = hotel.offers.map(o => parseFloat(o.price.total)).filter(p => !isNaN(p));
                  const highestPrice = allPrices.length > 1 ? Math.max(...allPrices) : null;
                  const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
                  const hasDiscount = highestPrice && lowestPrice && highestPrice > lowestPrice;
                  // Key amenities to show (max 3)
                  const keyAmenities = (hotel.amenities || [])
                    .filter(a => /wi-?fi|pool|piscine|parking|spa|restaurant|breakfast|gym|fitness|air.condition/i.test(a))
                    .slice(0, 3);
                  const hasAccessibility = hotel.accessibilityAttributes?.attributes && 
                    (hotel.accessibilityAttributes.attributes as string[]).length > 0;

                  return (
                    <div
                      key={hotel.hotelId}
                      className="bg-white/10 border border-white/15 rounded-xl overflow-hidden hover:bg-white/15 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hotel.businessId) {
                          setSelectedHotelId(hotel.hotelId);
                          if (onSelectBusiness) {
                            onSelectBusiness(hotel.businessId);
                          } else {
                            navigate(`/business/${hotel.businessId}`);
                          }
                        }
                      }}
                    >
                      {/* Image with verified badge + guest rating badge */}
                      <div className="aspect-square w-full overflow-hidden relative">
                        {hotel.mainImage ? (
                          <img
                            src={hotel.mainImage}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <BedDouble className="h-8 w-8 text-white/20" />
                          </div>
                        )}
                        {hotel.wtuce_status === "verified" && (
                          <img
                            src={logoWatermark}
                            alt="Vérifié"
                            className="absolute top-2 right-2 h-10 w-10 drop-shadow-lg"
                          />
                        )}
                        {/* Guest rating badge (LiteAPI) */}
                        {guestRatingNum && guestRatingNum > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="bg-orange-500 text-white text-xs font-bold rounded-md px-1.5 py-0.5 min-w-[28px] text-center shadow-md">
                              {guestRatingNum.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {/* Discount tag */}
                        {hasDiscount && (
                          <div className="absolute bottom-2 left-2">
                            <span className="bg-green-600 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shadow-md">
                              <Tag className="h-2.5 w-2.5" />
                              -{Math.round(((highestPrice - lowestPrice) / highestPrice) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 space-y-1.5">
                        {/* Name + stars */}
                        <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{hotel.name}</p>
                        <div className="flex items-center gap-2">
                          {starCount > 0 && (
                            <div className="flex">
                              {Array.from({ length: starCount }).map((_, i) => (
                                <Star key={i} className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                          )}
                          {guestRatingLabel && hotel.reviewCount != null && hotel.reviewCount > 0 && (
                            <span className="text-[10px] text-white/60">
                              {guestRatingLabel} · {hotel.reviewCount} {language === "en" ? "reviews" : "avis"}
                            </span>
                          )}
                        </div>

                        {/* Address */}
                        {hotel.address && (
                          <p className="text-[10px] text-white/50 flex items-center gap-0.5 line-clamp-1">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {hotel.address}
                          </p>
                        )}

                        {/* Board type */}
                        {boardName && (
                          <p className="text-[10px] text-green-400 flex items-center gap-0.5">
                            <Coffee className="h-2.5 w-2.5 shrink-0" />
                            {boardName}
                          </p>
                        )}

                        {/* Key amenities */}
                        {keyAmenities.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {keyAmenities.map((a, i) => (
                              <span key={i} className="text-[9px] text-white/50 bg-white/10 rounded px-1 py-0.5">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Our DB ratings */}
                        {(hotel.dbGoogleRating || hotel.dbTripadvisorRating) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {hotel.dbGoogleRating && (
                              <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                                {hotel.dbGoogleRating}/5
                                {hotel.dbGoogleReviewCount ? <span className="text-white/40"> ({hotel.dbGoogleReviewCount})</span> : null}
                              </span>
                            )}
                            {hotel.dbTripadvisorRating && (
                              <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                                TA {hotel.dbTripadvisorRating}/5
                                {hotel.dbTripadvisorReviewCount ? <span className="text-white/40"> ({hotel.dbTripadvisorReviewCount})</span> : null}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price section */}
                        {cheapest && (
                          <div className="flex items-baseline gap-1.5">
                            {hasDiscount && (
                              <span className="text-[10px] text-white/40 line-through">
                                {formatPrice(String(highestPrice), cheapest.price.currency)}
                              </span>
                            )}
                            <span className="text-sm font-bold text-white">
                              {formatPrice(cheapest.price.total, cheapest.price.currency)}
                            </span>
                            <span className="text-[9px] text-white/40">/ {language === "en" ? "night" : "nuit"}</span>
                          </div>
                        )}

                        {/* Footer: rooms + accessibility */}
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-white/40">
                            {hotel.offers.length} {language === "en" ? "room(s)" : "chambre(s)"}
                          </p>
                          {hasAccessibility && (
                            <Accessibility className="h-3 w-3 text-blue-400" aria-label={language === "en" ? "Accessible" : "Accessible PMR"} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right clickable area to close */}
          <div
            className="flex-1 h-full bg-black/40 cursor-pointer"
            onClick={() => setShowFallbackPanel(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );

  if (isMobileTablet) {
    return createPortal(overlayContent, document.body);
  }
  return overlayContent;
};

export default HotelAvailabilityOverlay;
