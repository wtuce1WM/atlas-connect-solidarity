import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Clock, X, Mic, MicOff, Loader, TrendingUp, MapPin, MapPinOff, Sparkles, Navigation } from "lucide-react";
import { businessUrl } from "@/lib/businessUrl";

interface GeoDisplayState {
  isEnabled: boolean;
  isDetecting: boolean;
  detectedCity?: string | null;
  detectedNeighborhood?: string | null;
  confirmedAddress?: string | null;
  accept?: () => void;
  toggle?: () => void;
  setManualCity?: (cityName: string) => void;
}

interface MobileSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Called when user taps a recently viewed business — parent should open the slide panel */
  onBusinessSelect?: (businessId: string) => void;
  /** Called when user submits a search — allows parent (SearchPage) to use setSearchParams instead of navigate */
  onSearch?: (params: Record<string, string>) => void;
  /** Called when user taps the mic — parent should start its own voice recording and this overlay will close */
  onVoiceStart?: () => void;
  /** Desktop-only: render overlay docked in the left search panel instead of fullscreen */
  desktopDocked?: boolean;
  /** Desktop-only: when docked, constrain width to left half (split layout) */
  desktopHalfWidth?: boolean;
  /** When true, use absolute positioning to stay contained within its parent element */
  contained?: boolean;
  /** Called when user taps AI suggestion button */
  onAiSuggestionClick?: () => void;
  /** Called when user taps location button */
  onLocationClick?: () => void;
  /** Geo state for displaying location button */
  geoState?: GeoDisplayState;
}

const MobileSearchOverlay = ({
  open,
  onClose,
  onBusinessSelect,
  onSearch,
  onVoiceStart,
  desktopDocked = false,
  desktopHalfWidth = false,
  contained = false,
  onAiSuggestionClick,
  onLocationClick,
  geoState,
}: MobileSearchOverlayProps) => {
  const [query, setQuery] = useState("");
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [manualCityInput, setManualCityInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();

  const { suggestions: popularSuggestions } = usePopularSearches(query, true);
  const { history, deleteEntry, clearHistory } = useSearchHistory();
  const { recentBusinesses } = useRecentlyViewedBusinesses();

  // Smart navigation: use onSearch callback if provided (avoids full page navigation),
  // otherwise fall back to navigate
  const smartNavigate = useCallback((params: Record<string, string>) => {
    onClose();
    if (onSearch) {
      onSearch(params);
    } else {
      const sp = new URLSearchParams(params);
      navigate(`/search?${sp.toString()}`);
    }
  }, [onClose, onSearch, navigate]);

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      const params: Record<string, string> = { q: keywords, spoken, _t: String(Date.now()) };
      if (detectedCategory) params.category = detectedCategory;
      if (timeKeyword) params.timeKeyword = timeKeyword;
      smartNavigate(params);
    },
    onError: (message) => {
      toast({ title: language === "fr" ? "Erreur" : "Error", description: message, variant: "destructive" });
    },
  });

  // Auto-focus when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll when open (fullscreen mode only)
  useEffect(() => {
    if (open && !desktopDocked && !contained) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open, desktopDocked]);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    smartNavigate({ q: query.trim(), _t: String(Date.now()) });
  }, [query, smartNavigate]);

  const handleSelect = useCallback((text: string) => {
    smartNavigate({ q: text, _t: String(Date.now()) });
  }, [smartNavigate]);

  if (!open) return null;

  const recentLabel = language === "fr" ? "Recherches récentes" : language === "ar" ? "عمليات البحث الأخيرة" : "Recent searches";
  const clearLabel = language === "fr" ? "Effacer tout" : language === "ar" ? "مسح الكل" : "Clear all";
  const popularLabel = language === "fr" ? "Recherches populaires" : language === "ar" ? "عمليات البحث الشائعة" : "Popular searches";
  const placeholderText = language === "fr" ? "Rechercher un établissement..." : language === "ar" ? "ابحث عن مؤسسة..." : "Search for a business...";

  const showRecent = (!query || query.trim().length < 2) && history.length > 0;
  const showRecentlyViewed = (!query || query.trim().length < 2) && recentBusinesses.length > 0;
  const showPopular = popularSuggestions.length > 0;

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 ${contained ? 'z-[78]' : 'z-[10000]'} bg-background flex flex-col animate-in slide-in-from-bottom duration-200 ${
        desktopDocked
          ? `lg:inset-auto lg:top-0 lg:bottom-0 lg:left-0 lg:right-auto lg:border-r lg:border-border ${desktopHalfWidth ? "lg:w-1/2" : "lg:w-full"}`
          : ""
      }`}
    >
      {/* Header with search bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border bg-background">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            placeholder={placeholderText}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-3 text-base bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Mic button */}
        <button
          type="button"
          onClick={() => {
            if (onVoiceStart) {
              onClose();
              setTimeout(() => onVoiceStart(), 150);
            } else {
              voice.toggleRecording();
            }
          }}
          disabled={voice.status === "processing"}
          className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all ${
            voice.status === "recording"
              ? "bg-red-500 animate-pulse"
              : voice.status === "processing"
                ? "bg-muted"
                : "bg-foreground/80"
          }`}
        >
          {voice.status === "processing" ? (
            <Loader className="h-4 w-4 text-white animate-spin" />
          ) : voice.status === "recording" ? (
            <MicOff className="h-4 w-4 text-white" />
          ) : (
            <Mic className="h-4 w-4 text-white" />
          )}
        </button>
      </div>

      {/* Scrollable suggestions body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Recent searches */}
        {showRecent && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {recentLabel}
              </span>
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {clearLabel}
              </button>
            </div>
            <div className="space-y-0.5">
              {history.slice(0, 8).map((entry) => (
                <div key={entry.id} className="group flex items-center rounded-lg hover:bg-muted/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleSelect(entry.query)}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    <span className="text-sm text-foreground">{entry.query}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    className="pr-3 opacity-60"
                    title="Supprimer"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently viewed businesses */}
        {showRecentlyViewed && (
          <div className="mb-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <MapPin className="h-3.5 w-3.5" />
              {language === "fr" ? "Consultés récemment" : language === "ar" ? "تمت مشاهدتها مؤخرًا" : "Recently viewed"}
            </span>
            <div className="flex flex-wrap gap-3 pb-2">
              {recentBusinesses.slice(0, 10).map((biz, i) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onBusinessSelect) {
                      onBusinessSelect(biz.id);
                    } else {
                      navigate(`/search?openBusiness=${biz.id}`);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[150px] group animate-slide-in-right"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-[150px] h-[150px] rounded-xl overflow-hidden bg-muted border border-border">
                    {biz.image ? (
                      <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs leading-tight text-foreground text-center line-clamp-2 group-hover:underline">
                    {biz.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestion + Location buttons */}
        {(!query || query.trim().length < 2) && (
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onAiSuggestionClick) {
                  onAiSuggestionClick();
                } else {
                  navigate("/search?showAi=true");
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gold text-black text-sm font-medium hover:bg-gold/90 transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              {language === "fr" ? "Suggestion IA" : language === "ar" ? "اقتراح الذكاء" : "AI Suggestion"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (geoState?.accept && geoState?.toggle && geoState?.setManualCity) {
                  setShowLocationPanel((v) => !v);
                } else {
                  onClose();
                  if (onLocationClick) {
                    onLocationClick();
                  } else {
                    navigate("/search?showLocation=true");
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                geoState?.isEnabled && (geoState.detectedNeighborhood || geoState.detectedCity || geoState.confirmedAddress)
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-[#C04F17] text-white border border-[#C04F17] hover:bg-[#C04F17]/90"
              }`}
            >
              {geoState?.isDetecting ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : geoState?.isEnabled ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <MapPinOff className="h-3.5 w-3.5" />
              )}
              {geoState?.isDetecting
                ? "…"
                : geoState?.isEnabled && (geoState.detectedNeighborhood || geoState.detectedCity)
                ? `📍 ${[geoState.detectedNeighborhood, geoState.detectedCity].filter(Boolean).join(", ")}`
                : geoState?.isEnabled && geoState.confirmedAddress
                ? `📍 ${geoState.confirmedAddress}`
                : (language === "fr" ? "Localisation" : language === "ar" ? "الموقع" : "Location")
              }
            </button>
          </div>
        )}

        {/* Inline location panel */}
        {showLocationPanel && geoState && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Current status */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
              {geoState.isDetecting ? (
                <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : geoState.isEnabled ? (
                <MapPin className="h-5 w-5 text-gold" />
              ) : (
                <MapPinOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {geoState.isDetecting
                    ? (language === "fr" ? "Détection en cours…" : "Detecting…")
                    : geoState.isEnabled && (geoState.detectedNeighborhood || geoState.detectedCity)
                    ? `📍 ${[geoState.detectedNeighborhood, geoState.detectedCity].filter(Boolean).join(", ")}`
                    : geoState.isEnabled && geoState.confirmedAddress
                    ? `📍 ${geoState.confirmedAddress}`
                    : (language === "fr" ? "Localisation désactivée" : "Location disabled")
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {geoState.isEnabled
                    ? (language === "fr" ? "Les résultats sont triés par proximité" : "Results sorted by proximity")
                    : (language === "fr" ? "Activez pour trier par proximité" : "Enable to sort by proximity")
                  }
                </p>
              </div>
            </div>

            {/* Toggle button */}
            <button
              type="button"
              onClick={() => {
                if (geoState.isEnabled) {
                  geoState.toggle?.();
                } else {
                  geoState.accept?.();
                }
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                geoState.isEnabled
                  ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  : "bg-[#C04F17] text-white hover:bg-[#C04F17]/90"
              }`}
            >
              <Navigation className="h-4 w-4" />
              {geoState.isEnabled
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
                  value={manualCityInput}
                  onChange={(e) => setManualCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCityInput.trim()) {
                      geoState.setManualCity?.(manualCityInput.trim());
                      setManualCityInput("");
                      setShowLocationPanel(false);
                    }
                  }}
                  placeholder={language === "fr" ? "Ex: Marrakech, Essaouira…" : "E.g. Marrakech, Essaouira…"}
                  className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualCityInput.trim()) {
                      geoState.setManualCity?.(manualCityInput.trim());
                      setManualCityInput("");
                      setShowLocationPanel(false);
                    }
                  }}
                  disabled={!manualCityInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showPopular && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              {query.trim().length >= 2 ? (language === "fr" ? "Suggestions" : "Suggestions") : popularLabel}
            </span>
            <div className="space-y-0.5">
              {popularSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(s.query)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="text-sm text-foreground">{s.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearchOverlay;
