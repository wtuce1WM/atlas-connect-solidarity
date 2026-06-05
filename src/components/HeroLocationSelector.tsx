import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronUp, ChevronDown, Navigation, Map, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeroLocationSelectorProps {
  detectedCity: string | null;
  confirmedAddress: string | null;
  isEnabled: boolean;
  isDetecting: boolean;
  onAcceptGeo: () => void;
  onSelectCity: (city: string) => void;
  onOpenMap: () => void;
}

interface CityOption {
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
}

const TRANSLATIONS = {
  fr: { city: "Ville", detecting: "Détection...", location: "Lieu:", cityOrAttraction: "Ville ou attraction", currentLocation: "Emplacement Actuel", pointOnMap: "Point sur carte", useMyExactLocation: "Utilisez ma position exacte", tooltip: "Veuillez activer la géolocalisation pour trouver les meilleurs établissements près de chez vous. Cela nous permettra de montrer des résultats plus précis." },
  en: { city: "City", detecting: "Detecting...", location: "Location:", cityOrAttraction: "City or attraction", currentLocation: "Current Location", pointOnMap: "Point on map", useMyExactLocation: "Use my exact location", tooltip: "Please enable geolocation to find the best businesses near you. This will allow us to show more accurate results." },
  ar: { city: "مدينة", detecting: "Detecting...", location: "المكان:", cityOrAttraction: "مدينة أو معلم", currentLocation: "الموقع الحالي", pointOnMap: "نقطة على الخريطة", useMyExactLocation: "استخدم موقعي الدقيق", tooltip: "يرجى تفعيل تحديد الموقع الجغرافي للعثور على أفضل المؤسسات بالقرب منك. سيسمح لنا ذلك بعرض نتائج أكثر دقة." },
} as const;

const HeroLocationSelector = ({
  detectedCity,
  confirmedAddress,
  isEnabled,
  isDetecting,
  onAcceptGeo,
  onSelectCity,
  onOpenMap,
}: HeroLocationSelectorProps) => {
  const { language } = useLanguage();
  const T = TRANSLATIONS[language] || TRANSLATIONS.fr;
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  // Load cities
  useEffect(() => {
    supabase
      .from("cities")
      .select("name_fr, name_en, name_ar")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCities(data as CityOption[]);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const cityLabel = detectedCity || T.city;

  const filteredCities = search.trim()
    ? cities.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name_fr.toLowerCase().includes(q) ||
          c.name_en?.toLowerCase().includes(q) ||
          c.name_ar?.includes(q)
        );
      })
    : cities;

  const getCityDisplayName = (c: CityOption) =>
    language === "ar" ? c.name_ar || c.name_fr : language === "en" ? c.name_en || c.name_fr : c.name_fr;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {/* City selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#25D366] bg-white text-foreground font-semibold text-sm shadow-md transition-all"
        >
          <MapPin className="h-5 w-5 text-[#25D366]" />
          <span>{isDetecting ? T.detecting : cityLabel}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Search input */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {T.location}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={T.cityOrAttraction}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Current Location */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onAcceptGeo();
                setOpen(false);
                setSearch("");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Navigation className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">
                {T.currentLocation}
              </span>
            </button>

            {/* Point on map */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onOpenMap();
                setOpen(false);
                setSearch("");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Map className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">
                {T.pointOnMap}
              </span>
            </button>

            {/* City list */}
            {filteredCities.length > 0 && (
              <>
                <div className="border-t border-border" />
                <div className="max-h-48 overflow-y-auto">
                  {filteredCities.map((city) => (
                    <button
                      key={city.name_fr}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectCity(city.name_fr);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm ${
                        detectedCity === city.name_fr ? "bg-muted/30 font-semibold" : ""
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{getCityDisplayName(city)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* "Utilisez ma position exacte" button with info tooltip */}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={onAcceptGeo}
          className="flex items-center gap-2 pl-4 pr-3 py-2 rounded-l-lg text-white font-semibold text-sm shadow-md transition-all"
          style={{ backgroundColor: "#25D366" }}
        >
          <span>{T.useMyExactLocation}</span>

        </button>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center pr-4 pl-2 py-2 rounded-r-lg text-white"
                style={{ backgroundColor: "#25D366" }}
              >
                <Info className="h-5 w-5 opacity-90" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px] text-sm bg-foreground text-background p-3 rounded-lg">
              {T.tooltip}

            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Address/position label below buttons */}
      {isEnabled && (detectedCity || confirmedAddress) && (
        <div className="w-full text-center mt-1">
          <p className="text-xs text-foreground/60">
            📍 {confirmedAddress || detectedCity}
          </p>
        </div>
      )}
    </div>
  );
};

export default HeroLocationSelector;
