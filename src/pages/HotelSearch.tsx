import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Hotel, Star, MapPin, Calendar, Users, BedDouble } from "lucide-react";
import { toast } from "sonner";
import HotelDetailDialog, { type HotelResult } from "@/components/HotelDetailDialog";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import { useSEO } from "@/hooks/useSEO";

// HotelOffer type is now in HotelDetailDialog

const MOROCCAN_CITIES = [
  { code: "RAK", name: "Marrakech" },
  { code: "CMN", name: "Casablanca" },
  { code: "FEZ", name: "Fès" },
  { code: "TNG", name: "Tanger" },
  { code: "AGA", name: "Agadir" },
  { code: "ESU", name: "Essaouira" },
  { code: "RBA", name: "Rabat" },
  { code: "OUD", name: "Ouarzazate" },
  { code: "NDR", name: "Nador" },
  { code: "OUJ", name: "Oujda" },
];

const HotelSearch = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();

  useSEO({
    title: "Recherche d'hôtels au Maroc",
    description: "Comparez et réservez les meilleurs hôtels au Maroc.",
    canonical: "/hotel-search",
  });

  // Resolve initial city from URL param (city name → code)
  const initialCityCode = useMemo(() => {
    const cityParam = searchParams.get("city");
    if (!cityParam) return "RAK";
    const match = MOROCCAN_CITIES.find(
      (c) => c.name.toLowerCase() === cityParam.toLowerCase() || c.code === cityParam
    );
    return match?.code || "RAK";
  }, [searchParams]);

  const [cityCode, setCityCode] = useState(initialCityCode);
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [adults, setAdults] = useState(searchParams.get("adults") || "2");
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "1");
  const [stars, setStars] = useState(searchParams.get("stars") || "");
  const [currency, setCurrency] = useState(searchParams.get("currency") || "EUR");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [slidePanelBusiness, setSlidePanelBusiness] = useState<{ id: string } | null>(null);

  // Default dates: tomorrow + day after
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

  // Auto-search on page load
  const autoSearchRef = useRef(false);
  useEffect(() => {
    if (!autoSearchRef.current) {
      autoSearchRef.current = true;
      handleSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    const ci = checkIn || getDefaultDates().checkIn;
    const co = checkOut || getDefaultDates().checkOut;

    if (new Date(ci) >= new Date(co)) {
      toast.error("La date de départ doit être après la date d'arrivée");
      return;
    }

    setLoading(true);
    setResults([]);
    setSearchDone(false);

    try {
      const body: Record<string, unknown> = {
        cityCode,
        checkIn: ci,
        checkOut: co,
        adults: parseInt(adults),
        rooms: parseInt(rooms),
        currency,
      };
      if (stars && stars !== "all") body.ratings = stars;

      const { data, error } = await supabase.functions.invoke("liteapi-hotels", { body });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const hotels: HotelResult[] = (data?.data || []).map((h: any) => ({
        hotel: {
          hotelId: h.hotelId,
          name: h.name,
          cityCode: h.cityCode,
          latitude: h.latitude,
          longitude: h.longitude,
          rating: h.rating,
          guestRating: h.guestRating,
          reviewCount: h.reviewCount,
          address: h.address,
          city: h.city,
          mainImage: h.mainImage,
          amenities: h.amenities,
          description: h.description,
          checkinTime: h.checkinTime,
          checkoutTime: h.checkoutTime,
          images: h.images,
          accessibilityAttributes: h.accessibilityAttributes || null,
        },
        available: h.available,
        offers: h.offers,
      }));

      setResults(hotels.filter((o) => o.available && o.offers && o.offers.length > 0));
      setSearchDone(true);

      if (hotels.length === 0) {
        toast.info("Aucune disponibilité trouvée pour ces dates");
      } else {
        toast.success(`${hotels.length} hôtels disponibles trouvés`);
      }
    } catch (err) {
      console.error("Hotel search error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

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

  const defaults = getDefaultDates();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 mt-20">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Hotel className="h-8 w-8 text-primary" />
            {language === "en" ? "Hotel Search" : language === "ar" ? "بحث الفنادق" : "Recherche d'hôtels"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === "en"
              ? "Find available hotels with real-time pricing"
              : language === "ar"
              ? "ابحث عن الفنادق المتاحة مع الأسعار في الوقت الفعلي"
              : "Trouvez des hôtels disponibles avec les prix en temps réel"}
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {language === "en" ? "City" : language === "ar" ? "المدينة" : "Ville"}
                </label>
                <Select value={cityCode} onValueChange={setCityCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOROCCAN_CITIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Check-in */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {language === "en" ? "Check-in" : language === "ar" ? "تاريخ الوصول" : "Arrivée"}
                </label>
                <Input
                  type="date"
                  value={checkIn || defaults.checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={defaults.checkIn}
                />
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {language === "en" ? "Check-out" : language === "ar" ? "تاريخ المغادرة" : "Départ"}
                </label>
                <Input
                  type="date"
                  value={checkOut || defaults.checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || defaults.checkIn}
                />
              </div>

              {/* Adults */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {language === "en" ? "Adults" : language === "ar" ? "البالغون" : "Adultes"}
                </label>
                <Select value={adults} onValueChange={setAdults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rooms */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <BedDouble className="h-4 w-4" />
                  {language === "en" ? "Rooms" : language === "ar" ? "الغرف" : "Chambres"}
                </label>
                <Select value={rooms} onValueChange={setRooms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stars */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {language === "en" ? "Stars" : language === "ar" ? "النجوم" : "Étoiles"}
                </label>
                <Select value={stars} onValueChange={setStars}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "en" ? "All" : "Toutes"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === "en" ? "All" : "Toutes"}
                    </SelectItem>
                    <SelectItem value="5">★★★★★</SelectItem>
                    <SelectItem value="4,5">★★★★ +</SelectItem>
                    <SelectItem value="3,4,5">★★★ +</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === "en" ? "Currency" : language === "ar" ? "العملة" : "Devise"}
                </label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">MAD (Dirham)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="USD">USD (Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search button */}
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading} className="w-full">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {loading
                    ? language === "en"
                      ? "Searching..."
                      : "Recherche..."
                    : language === "en"
                    ? "Search"
                    : "Rechercher"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">
              {language === "en"
                ? "Searching for available hotels..."
                : "Recherche des hôtels disponibles..."}
            </p>
          </div>
        )}

        {searchDone && !loading && results.length === 0 && (
          <div className="text-center py-12">
            <Hotel className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {language === "en"
                ? "No available hotels found for these criteria"
                : "Aucun hôtel disponible trouvé pour ces critères"}
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {results.length} {language === "en" ? "hotels found" : "hôtels trouvés"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((hotel) => {
                const bestOffer = hotel.offers?.[0];
                if (!bestOffer) return null;

                return (
                  <Card key={hotel.hotel.hotelId} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedHotel(hotel)}>
                    {hotel.hotel.mainImage && (
                      <img src={hotel.hotel.mainImage} alt={hotel.hotel.name} className="w-full h-36 object-cover rounded-t-lg" />
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight">
                          {hotel.hotel.name}
                        </CardTitle>
                        {hotel.hotel.rating && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {"★".repeat(parseInt(hotel.hotel.rating))}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {MOROCCAN_CITIES.find((c) => c.code === hotel.hotel.cityCode)?.name ||
                            hotel.hotel.cityCode}
                        </p>
                        {hotel.hotel.accessibilityAttributes?.attributes && hotel.hotel.accessibilityAttributes.attributes.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <span>♿</span>
                            {language === "en" ? "Accessible" : "Accessible"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Room info */}
                      {bestOffer.room?.typeEstimated && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {bestOffer.room.typeEstimated.category &&
                            bestOffer.room.typeEstimated.category.replace(/_/g, " ")}
                          {bestOffer.room.typeEstimated.beds &&
                            ` · ${bestOffer.room.typeEstimated.beds} ${
                              bestOffer.room.typeEstimated.bedType || "lit(s)"
                            }`}
                        </p>
                      )}

                      {bestOffer.room?.description?.text && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {bestOffer.room.description.text}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(bestOffer.price.total, bestOffer.price.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {language === "en" ? "total stay" : "séjour total"}
                          </p>
                        </div>
                        {bestOffer.policies?.paymentType && (
                          <Badge variant="outline" className="text-xs">
                            {bestOffer.policies.paymentType === "deposit"
                              ? language === "en"
                                ? "Deposit"
                                : "Acompte"
                              : bestOffer.policies.paymentType}
                          </Badge>
                        )}
                      </div>

                      {/* Cancellation */}
                      {bestOffer.policies?.cancellations?.[0]?.description?.text && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          {bestOffer.policies.cancellations[0].description.text}
                        </p>
                      )}

                      {/* More offers */}
                      {hotel.offers && hotel.offers.length > 1 && (
                        <p className="text-xs text-primary mt-2">
                          +{hotel.offers.length - 1}{" "}
                          {language === "en" ? "more offers" : "autres offres"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <HotelDetailDialog
          hotel={selectedHotel}
          open={!!selectedHotel}
          onOpenChange={(open) => !open && setSelectedHotel(null)}
          formatPrice={formatPrice}
          onViewBusiness={(businessId, hotelResult) => {
            const ci = checkIn || getDefaultDates().checkIn;
            const co = checkOut || getDefaultDates().checkOut;
            const offers = (hotelResult.offers || []).map(o => ({
              roomName: (() => {
                const raw = o.room?.typeEstimated?.category?.replace(/_/g, " ") || o.room?.type || "Standard";
                // Title-case all-caps names like "STANDARD" → "Standard"
                return raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
              })(),
              price: o.price.total,
              currency: o.price.currency,
              paymentType: o.policies?.paymentType,
            }));
            const h = hotelResult.hotel;
            setSlidePanelBusiness({ id: businessId });
            setSelectedHotel(null);
          }}
        />

        {slidePanelBusiness && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSlidePanelBusiness(null)} />
            <div className="relative w-full max-w-md h-full">
              <BookOnlineSlidePanel
                businessId={slidePanelBusiness.id}
                onClose={() => setSlidePanelBusiness(null)}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HotelSearch;
