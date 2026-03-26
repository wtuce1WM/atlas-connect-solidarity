import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Star, MapPin, Hotel, Image, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiteApiHotel {
  hotelId: string;
  name: string;
  cityCode?: string;
  rating?: string;
  guestRating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  mainImage?: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  available: boolean;
  offers: {
    id: string;
    room: { type: string };
    price: { currency: string; total: string };
  }[];
}

interface SerpApiHotel {
  position: number;
  name: string;
  type?: string;
  hotelClass?: number;
  description?: string;
  link?: string;
  ratePerNight?: { amount: string; currency: string };
  totalRate?: { amount: string; currency: string };
  dealDescription?: string;
  overallRating?: number;
  reviewCount?: number;
  locationRating?: number;
  amenities: string[];
  latitude?: number;
  longitude?: number;
  images: string[];
  thumbnail?: string;
}

const CITY_OPTIONS = [
  { label: "Essaouira", value: "Essaouira", code: "ESU" },
  { label: "Marrakech", value: "Marrakech", code: "RAK" },
  { label: "Casablanca", value: "Casablanca", code: "CMN" },
  { label: "Fès", value: "Fez", code: "FEZ" },
  { label: "Tanger", value: "Tangier", code: "TNG" },
  { label: "Agadir", value: "Agadir", code: "AGA" },
  { label: "Rabat", value: "Rabat", code: "RBA" },
  { label: "Ouarzazate", value: "Ouarzazate", code: "OUD" },
];

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};
const dayAfter = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
};

const HotelApiComparison = () => {
  const [city, setCity] = useState("Essaouira");
  const [checkIn, setCheckIn] = useState(tomorrow());
  const [checkOut, setCheckOut] = useState(dayAfter());
  const [adults, setAdults] = useState(2);
  const [loading, setLoading] = useState(false);
  const [liteResults, setLiteResults] = useState<LiteApiHotel[] | null>(null);
  const [serpResults, setSerpResults] = useState<SerpApiHotel[] | null>(null);
  const [liteTime, setLiteTime] = useState(0);
  const [serpTime, setSerpTime] = useState(0);
  const [serpPages, setSerpPages] = useState(0);
  const [liteError, setLiteError] = useState<string | null>(null);
  const [serpError, setSerpError] = useState<string | null>(null);

  const cityOption = CITY_OPTIONS.find((c) => c.value === city) || CITY_OPTIONS[0];

  const handleSearch = async () => {
    setLoading(true);
    setLiteResults(null);
    setSerpResults(null);
    setLiteError(null);
    setSerpError(null);
    setSerpPages(0);

    const litePromise = (async () => {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
          body: {
            fallbackCityName: cityOption.value,
            cityCode: cityOption.code,
            checkIn,
            checkOut,
            adults,
            rooms: 1,
            currency: "EUR",
          },
        });
        setLiteTime(Math.round(performance.now() - t0));
        if (error) throw new Error(String(error));
        if (data?.error) throw new Error(data.error);
        const sorted = (data?.data || []).slice().sort((a: LiteApiHotel, b: LiteApiHotel) => a.name.localeCompare(b.name, 'fr'));
        setLiteResults(sorted);
      } catch (e: any) {
        setLiteTime(Math.round(performance.now() - t0));
        setLiteError(e.message);
        setLiteResults([]);
      }
    })();

    const serpPromise = (async () => {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("serpapi-hotels", {
          body: {
            cityName: cityOption.value,
            checkIn,
            checkOut,
            adults,
            currency: "EUR",
          },
        });
        setSerpTime(Math.round(performance.now() - t0));
        if (error) throw new Error(String(error));
        if (data?.error) throw new Error(data.error);
        const sorted = (data?.data || []).slice().sort((a: SerpApiHotel, b: SerpApiHotel) => a.name.localeCompare(b.name, 'fr'));
        setSerpResults(sorted);
        setSerpPages(data?.pages || 1);
      } catch (e: any) {
        setSerpTime(Math.round(performance.now() - t0));
        setSerpError(e.message);
        setSerpResults([]);
      }
    })();

    await Promise.all([litePromise, serpPromise]);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hotel className="h-5 w-5" />
            Comparaison API Hôtels — LiteAPI vs SerpApi (Google Hotels)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-in</label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-out</label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Adultes</label>
              <Input type="number" min={1} max={6} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-20" />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Comparer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results side by side */}
      {(liteResults !== null || serpResults !== null) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LiteAPI column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">LiteAPI</h3>
              <Badge variant="secondary">{liteResults?.length ?? 0} résultats</Badge>
              <span className="text-xs text-muted-foreground">{liteTime}ms</span>
            </div>
            {liteError && <p className="text-sm text-destructive">{liteError}</p>}
            {liteResults?.slice(0, 20).map((h) => (
              <HotelCardLite key={h.hotelId} hotel={h} />
            ))}
            {liteResults?.length === 0 && !liteError && (
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
            )}
          </div>

          {/* SerpApi column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">SerpApi (Google Hotels)</h3>
              <Badge variant="secondary">{Math.min(serpResults?.length ?? 0, 20)}/{serpResults?.length ?? 0} résultats</Badge>
              <span className="text-xs text-muted-foreground">{serpTime}ms</span>
            </div>
            {serpError && <p className="text-sm text-destructive">{serpError}</p>}
            {serpResults?.slice(0, 20).map((h, i) => (
              <HotelCardSerp key={`${h.name}-${i}`} hotel={h} />
            ))}
            {serpResults?.length === 0 && !serpError && (
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HotelCardLite = ({ hotel }: { hotel: LiteApiHotel }) => {
  const bestOffer = hotel.offers[0];
  const price = bestOffer?.price?.total ? `${bestOffer.price.total} ${bestOffer.price.currency}` : "—";

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {hotel.mainImage && (
          <img src={hotel.mainImage} alt={hotel.name} className="w-20 h-20 rounded-md object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm truncate">{hotel.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {hotel.rating && (
              <Badge variant="outline" className="text-[10px] py-0">
                {hotel.rating}★
              </Badge>
            )}
            {hotel.guestRating != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Star className="h-3 w-3" /> {hotel.guestRating}
                {hotel.reviewCount != null && <span>({hotel.reviewCount})</span>}
              </span>
            )}
          </div>
          {hotel.address && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {hotel.address}
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm font-bold text-primary">{price}/nuit</span>
            <span className="text-[10px] text-muted-foreground">{hotel.offers.length} offre(s)</span>
          </div>
          {hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hotel.amenities.slice(0, 5).map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] py-0 px-1">{a}</Badge>
              ))}
              {hotel.amenities.length > 5 && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1">+{hotel.amenities.length - 5}</Badge>
              )}
            </div>
          )}
          {hotel.images && hotel.images.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{hotel.images.length} photos</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const HotelCardSerp = ({ hotel }: { hotel: SerpApiHotel }) => {
  const price = hotel.ratePerNight?.amount || "—";

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {hotel.thumbnail && (
          <img src={hotel.thumbnail} alt={hotel.name} className="w-20 h-20 rounded-md object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{hotel.name}</h4>
            <Badge variant="outline" className="text-[10px] py-0 shrink-0">#{hotel.position}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {hotel.hotelClass && (
              <Badge variant="outline" className="text-[10px] py-0">
                {hotel.hotelClass}★
              </Badge>
            )}
            {hotel.overallRating != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Star className="h-3 w-3" /> {hotel.overallRating}
                {hotel.reviewCount != null && <span>({hotel.reviewCount})</span>}
              </span>
            )}
            {hotel.locationRating != null && (
              <span className="text-[10px] text-muted-foreground">
                📍 {hotel.locationRating}
              </span>
            )}
          </div>
          {hotel.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{hotel.description}</p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{price}/nuit</span>
              {hotel.dealDescription && (
                <Badge className="text-[9px] py-0 bg-green-600">{hotel.dealDescription}</Badge>
              )}
            </div>
            {hotel.link && (
              <a href={hotel.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hotel.amenities.slice(0, 5).map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] py-0 px-1">{a}</Badge>
              ))}
              {hotel.amenities.length > 5 && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1">+{hotel.amenities.length - 5}</Badge>
              )}
            </div>
          )}
          {hotel.images.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{hotel.images.length} photos</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default HotelApiComparison;
