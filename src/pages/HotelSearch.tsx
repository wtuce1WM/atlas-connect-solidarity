import { useState } from "react";
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

interface HotelOffer {
  hotel: {
    hotelId: string;
    name: string;
    cityCode: string;
    latitude?: number;
    longitude?: number;
    rating?: string;
  };
  available: boolean;
  offers?: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    room: {
      type: string;
      typeEstimated?: {
        category?: string;
        beds?: number;
        bedType?: string;
      };
      description?: { text?: string };
    };
    guests?: { adults: number };
    price: {
      currency: string;
      base?: string;
      total: string;
    };
    policies?: {
      cancellations?: { description?: { text?: string }; deadline?: string }[];
      paymentType?: string;
    };
  }[];
}

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
  const [cityCode, setCityCode] = useState("RAK");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [stars, setStars] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelOffer[]>([]);
  const [searchDone, setSearchDone] = useState(false);

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
      // Step 1: Get hotel IDs for the city
      const listParams: Record<string, unknown> = { action: "hotel-list", cityCode, radius: "5", radiusUnit: "KM" };
      if (stars && stars !== "all") listParams.ratings = stars;

      const { data: listData, error: listError } = await supabase.functions.invoke("amadeus-hotels", {
        body: listParams,
      });

      if (listError) throw new Error(listError.message);
      if (listData?.error) throw new Error(listData.error);

      const hotels = listData?.data || [];
      if (hotels.length === 0) {
        toast.info("Aucun hôtel trouvé pour cette ville");
        setSearchDone(true);
        setLoading(false);
        return;
      }

      // Take first 20 hotel IDs (API limit)
      const hotelIds = hotels
        .slice(0, 20)
        .map((h: { hotelId: string }) => h.hotelId)
        .join(",");

      // Step 2: Get offers/pricing
      const { data: offersData, error: offersError } = await supabase.functions.invoke("amadeus-hotels", {
        body: {
          action: "hotel-offers",
          hotelIds,
          checkInDate: ci,
          checkOutDate: co,
          adults: parseInt(adults),
          roomQuantity: parseInt(rooms),
          currency,
        },
      });

      if (offersError) throw new Error(offersError.message);
      if (offersData?.error) throw new Error(offersData.error);

      const offers: HotelOffer[] = offersData?.data || [];
      setResults(offers.filter((o) => o.available && o.offers && o.offers.length > 0));
      setSearchDone(true);

      if (offers.length === 0) {
        toast.info("Aucune disponibilité trouvée pour ces dates");
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
                  <Card key={hotel.hotel.hotelId} className="hover:shadow-lg transition-shadow">
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
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {MOROCCAN_CITIES.find((c) => c.code === hotel.hotel.cityCode)?.name ||
                          hotel.hotel.cityCode}
                      </p>
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
      </main>

      <Footer />
    </div>
  );
};

export default HotelSearch;
