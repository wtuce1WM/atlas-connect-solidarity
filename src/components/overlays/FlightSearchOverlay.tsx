import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Plane, Calendar, Users, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface FlightSearchInitial {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  adults?: number;
}

interface FlightSearchOverlayProps {
  open: boolean;
  initial: FlightSearchInitial;
  onClose: () => void;
}

interface FlightLeg {
  departure_airport?: { name?: string; id?: string; time?: string };
  arrival_airport?: { name?: string; id?: string; time?: string };
  duration?: number;
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  travel_class?: string;
}

interface FlightOption {
  flights?: FlightLeg[];
  total_duration?: number;
  price?: number;
  type?: string;
  airline_logo?: string;
  booking_token?: string;
}

const AIRPORT_NAMES: Record<string, string> = {
  CDG: "Paris CDG", ORY: "Paris Orly", LYS: "Lyon", MRS: "Marseille", NCE: "Nice",
  TLS: "Toulouse", BOD: "Bordeaux", NTE: "Nantes",
  RAK: "Marrakech", CMN: "Casablanca", RBA: "Rabat", AGA: "Agadir", TNG: "Tanger",
  FEZ: "Fès", OUD: "Oujda", OZZ: "Ouarzazate", ESU: "Essaouira",
  LHR: "Londres LHR", MAD: "Madrid", BCN: "Barcelone", BRU: "Bruxelles", GVA: "Genève",
  JFK: "New York JFK", DXB: "Dubaï", DOH: "Doha",
};

// Quick reverse lookup of common airports near coords (lat, lon, code)
const AIRPORTS_GEO: { code: string; lat: number; lon: number }[] = [
  { code: "CDG", lat: 49.01, lon: 2.55 },
  { code: "LYS", lat: 45.72, lon: 5.08 },
  { code: "MRS", lat: 43.44, lon: 5.21 },
  { code: "NCE", lat: 43.66, lon: 7.21 },
  { code: "TLS", lat: 43.63, lon: 1.36 },
  { code: "BOD", lat: 44.83, lon: -0.71 },
  { code: "NTE", lat: 47.15, lon: -1.6 },
  { code: "BRU", lat: 50.9, lon: 4.48 },
  { code: "GVA", lat: 46.23, lon: 6.11 },
  { code: "LHR", lat: 51.47, lon: -0.45 },
  { code: "MAD", lat: 40.49, lon: -3.56 },
  { code: "BCN", lat: 41.3, lon: 2.08 },
  { code: "RAK", lat: 31.6, lon: -8.03 },
  { code: "CMN", lat: 33.36, lon: -7.59 },
  { code: "RBA", lat: 34.05, lon: -6.75 },
  { code: "AGA", lat: 30.32, lon: -9.41 },
  { code: "TNG", lat: 35.73, lon: -5.92 },
  { code: "FEZ", lat: 33.93, lon: -4.97 },
];

function nearestAirport(lat: number, lon: number): string | null {
  let best: { code: string; d: number } | null = null;
  for (const a of AIRPORTS_GEO) {
    const dx = a.lat - lat;
    const dy = a.lon - lon;
    const d = dx * dx + dy * dy;
    if (!best || d < best.d) best = { code: a.code, d };
  }
  return best?.code || null;
}

function formatDuration(min?: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

const FlightSearchOverlay = ({ open, initial, onClose }: FlightSearchOverlayProps) => {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "en" ? en : fr);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  const [origin, setOrigin] = useState(initial.origin || "");
  const [destination, setDestination] = useState(initial.destination || "");
  const [departureDate, setDepartureDate] = useState(initial.departureDate || tomorrow.toISOString().split("T")[0]);
  const [returnDate, setReturnDate] = useState(initial.returnDate || "");
  const [adults, setAdults] = useState(initial.adults || 1);
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<FlightOption[] | null>(null);
  const [destResolvedTo, setDestResolvedTo] = useState<string | null>(null);
  const [originResolvedTo, setOriginResolvedTo] = useState<string | null>(null);

  // Detect origin via geolocation if missing
  useEffect(() => {
    if (origin || !open) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const code = nearestAirport(pos.coords.latitude, pos.coords.longitude);
        if (code) setOrigin(code);
      },
      () => {/* ignore */},
      { timeout: 4000, maximumAge: 60_000 * 30 }
    );
  }, [open, origin]);

  const runSearch = useCallback(async (overrideOrigin?: string) => {
    const finalOrigin = (overrideOrigin ?? origin).trim();
    if (!finalOrigin) {
      toast.error(t("Précisez votre ville de départ", "Please enter origin"));
      return;
    }
    if (!destination.trim()) {
      toast.error(t("Précisez la destination", "Please enter destination"));
      return;
    }
    setLoading(true);
    setFlights(null);
    try {
      const { data, error } = await supabase.functions.invoke("serpapi-flights", {
        body: {
          origin: finalOrigin,
          destination: destination.trim(),
          departureDate,
          returnDate: returnDate || undefined,
          adults,
          language: language === "en" ? "en" : "fr",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || data.error);
      setFlights(data.flights || []);
      setDestResolvedTo(data.searchInfo?.destination || null);
      setOriginResolvedTo(data.searchInfo?.origin || null);
      if (!data.flights?.length) toast.info(t("Aucun vol trouvé", "No flights found"));
    } catch (err) {
      console.error("Flight search error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, departureDate, returnDate, adults, language]);

  // Auto-launch on open if we have destination
  useEffect(() => {
    if (open && initial.destination) {
      const timer = setTimeout(() => runSearch(), 600);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{t("Recherche de vols", "Flight search")}</span>
        </div>
      </div>

      {/* Form */}
      <div className="shrink-0 px-4 py-4 space-y-3 border-b border-border bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Départ", "From")}
              {originResolvedTo && AIRPORT_NAMES[originResolvedTo] && (
                <span className="ml-1 text-foreground">({AIRPORT_NAMES[originResolvedTo]})</span>
              )}
            </label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={t("Ville ou code IATA", "City or IATA code")}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Arrivée", "To")}
              {destResolvedTo && AIRPORT_NAMES[destResolvedTo] && (
                <span className="ml-1 text-foreground">({AIRPORT_NAMES[destResolvedTo]})</span>
              )}
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t("Ville ou code IATA", "City or IATA code")}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>{t("Aller", "Departure")}</label>
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1 [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>{t("Retour", "Return")}</label>
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={departureDate} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1 [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/>{t("Adultes", "Adults")}</label>
            <input type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1" />
          </div>
        </div>
        <Button onClick={() => runSearch()} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plane className="h-4 w-4 mr-2" />}
          {t("Rechercher", "Search")}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : flights && flights.length > 0 ? (
          <div className="space-y-3 max-w-3xl mx-auto">
            {flights.map((f, idx) => {
              const firstLeg = f.flights?.[0];
              const lastLeg = f.flights?.[f.flights.length - 1];
              return (
                <div key={idx} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {f.airline_logo && <img src={f.airline_logo} alt="" className="h-8 w-8 object-contain shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {firstLeg?.airline || "—"} {f.flights && f.flights.length > 1 ? `(${f.flights.length - 1} ${t("escale(s)", "stop(s)")})` : t("direct", "direct")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {firstLeg?.departure_airport?.id} {firstLeg?.departure_airport?.time?.slice(-5)}
                          <ArrowRight className="inline h-3 w-3 mx-1" />
                          {lastLeg?.arrival_airport?.id} {lastLeg?.arrival_airport?.time?.slice(-5)}
                          <span className="ml-2">• {formatDuration(f.total_duration)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-primary">{f.price ? `${f.price} €` : "—"}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">{t("par adulte", "per adult")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <a
              href={`https://www.google.com/travel/flights?q=Flights+from+${originResolvedTo || origin}+to+${destResolvedTo || destination}+on+${departureDate}${returnDate ? `+through+${returnDate}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-primary hover:underline pt-2"
            >
              {t("Voir tous les vols sur Google Flights", "See all flights on Google Flights")} <ExternalLink className="inline h-3 w-3" />
            </a>
          </div>
        ) : flights ? (
          <div className="text-center text-sm text-muted-foreground py-12">{t("Aucun vol trouvé", "No flights found")}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default FlightSearchOverlay;
