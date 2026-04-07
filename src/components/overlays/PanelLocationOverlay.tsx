import { useState, useCallback } from "react";
import { X, MapPin, MapPinOff, Navigation, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";

interface PanelLocationOverlayProps {
  open: boolean;
  onClose: () => void;
}

const PanelLocationOverlay = ({ open, onClose }: PanelLocationOverlayProps) => {
  const { language } = useLanguage();
  const geo = useGeolocation();
  const [manualInput, setManualInput] = useState("");

  const handleActivate = useCallback(() => {
    if (geo.isEnabled) {
      geo.toggle();
    } else {
      geo.accept();
    }
  }, [geo]);

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) return;
    geo.setManualCity(manualInput.trim());
    onClose();
  }, [manualInput, geo, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 lg:-top-[3.3rem] z-[80] bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">
          {language === "fr" ? "Localisation" : language === "ar" ? "الموقع" : "Location"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Current status */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
          {geo.isDetecting ? (
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : geo.isEnabled ? (
            <MapPin className="h-5 w-5 text-gold" />
          ) : (
            <MapPinOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {geo.isDetecting
                ? (language === "fr" ? "Détection en cours…" : "Detecting…")
                : geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity)
                ? `📍 ${[geo.detectedNeighborhood, geo.detectedCity].filter(Boolean).join(", ")}`
                : geo.isEnabled && geo.confirmedAddress
                ? `📍 ${geo.confirmedAddress}`
                : (language === "fr" ? "Localisation désactivée" : "Location disabled")
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {geo.isEnabled
                ? (language === "fr" ? "Les résultats sont triés par proximité" : "Results sorted by proximity")
                : (language === "fr" ? "Activez pour trier par proximité" : "Enable to sort by proximity")
              }
            </p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={handleActivate}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            geo.isEnabled
              ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
              : "bg-[#C04F17] text-white hover:bg-[#C04F17]/90"
          }`}
        >
          <Navigation className="h-4 w-4" />
          {geo.isEnabled
            ? (language === "fr" ? "Désactiver la localisation" : "Disable location")
            : (language === "fr" ? "Utiliser ma position" : "Use my location")
          }
        </button>

        {/* Manual city input */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            {language === "fr" ? "Ou saisir une ville" : language === "ar" ? "أو أدخل مدينة" : "Or enter a city"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
              placeholder={language === "fr" ? "Ex: Marrakech, Essaouira…" : "E.g. Marrakech, Essaouira…"}
              className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelLocationOverlay;
