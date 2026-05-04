import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Clock, X, Mic, MicOff, Loader, TrendingUp, MapPin, MapPinOff, Sparkles } from "lucide-react";
import { businessUrl } from "@/lib/businessUrl";
import PanelLocationOverlay from "@/components/overlays/PanelLocationOverlay";

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
  const [showLocationOverlay, setShowLocationOverlay] = useState(false);
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
      className={`${contained ? 'absolute' : 'fixed'} inset-0 ${contained ? 'z-[78]' : 'z-[10000]'} bg-white flex flex-col animate-in slide-in-from-bottom duration-200 ${
        desktopDocked
          ? `lg:inset-auto lg:top-0 lg:bottom-0 lg:left-0 lg:right-auto lg:border-r lg:border-border ${desktopHalfWidth ? "lg:w-1/2" : "lg:w-full"}`
          : ""
      }`}
    >
      {/* Header with search bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border bg-white">
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
              onVoiceStart();
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
                    <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "capitalize", letterSpacing: "0.02em" }}>{entry.query}</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-2">
              {recentBusinesses.slice(0, 8).map((biz, i) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => {
                    if (onBusinessSelect) {
                      onBusinessSelect(biz.id);
                    } else {
                      onClose();
                      navigate(`/search?openBusiness=${biz.id}`);
                    }
                  }}
                  className="relative group animate-slide-in-right"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                    {biz.image ? (
                      <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-1.5 pb-1.5 pt-4">
                    <span
                      className="block text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:underline"
                      style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}
                    >
                      {biz.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestion + Location buttons */}
        {(!query || query.trim().length < 2) && (
          <div className="mb-6 w-4/5 md:w-3/4 mx-auto flex justify-center gap-2">
            <div className="flex-1 md:flex-none md:w-1/3">
              <a
                href="https://wa.me/212661439221"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-up-from-bottom"
                style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}
              >
                <svg className="h-4 w-4 hidden md:block" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="truncate">WhatsApp</span>
              </a>
            </div>
            <div className="flex-1 md:flex-none md:w-1/3">
              <button
                type="button"
                onClick={() => {
                  if (onAiSuggestionClick) {
                    onAiSuggestionClick();
                  } else {
                    onClose();
                    navigate("/search?showAi=true");
                  }
                }}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-up-from-bottom"
                style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}
              >
                <Sparkles className="h-4 w-4 hidden md:block" />
                <span className="truncate">{language === "fr" ? "Suggestion IA" : language === "ar" ? "اقتراح الذكاء" : "AI Suggestion"}</span>
              </button>
            </div>
            <div className="flex-1 md:flex-none md:w-1/3">
              <button
                type="button"
                onClick={() => {
                  if (geoState?.accept && geoState?.toggle && geoState?.setManualCity) {
                    setShowLocationOverlay(true);
                  } else {
                    onClose();
                    if (onLocationClick) {
                      onLocationClick();
                    } else {
                      navigate("/search?showLocation=true");
                    }
                  }
                }}
                className={`flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg transition-colors normal-case tracking-normal animate-slide-up-from-bottom ${
                  geoState?.isEnabled && (geoState.detectedNeighborhood || geoState.detectedCity || geoState.confirmedAddress)
                    ? "bg-gold/20 text-gold border border-gold/40"
                    : "bg-[#C04F17] text-white hover:bg-[#C04F17]/90"
                }`}
                style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}
              >
                {geoState?.isDetecting ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : geoState?.isEnabled ? (
                  <MapPin className="h-3.5 w-3.5" />
                ) : (
                  <MapPinOff className="h-3.5 w-3.5 hidden md:block" />
                )}
                <span className="truncate">
                  {geoState?.isDetecting
                    ? "…"
                    : geoState?.isEnabled && (geoState.detectedNeighborhood || geoState.detectedCity)
                    ? `📍 ${[geoState.detectedNeighborhood, geoState.detectedCity].filter(Boolean).join(", ")}`
                    : geoState?.isEnabled && geoState.confirmedAddress
                    ? `📍 ${geoState.confirmedAddress}`
                    : (language === "fr" ? "Localisation" : language === "ar" ? "الموقع" : "Location")
                  }
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Location overlay */}
        {geoState && (
          <PanelLocationOverlay
            open={showLocationOverlay}
            onClose={() => setShowLocationOverlay(false)}
          />
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
                  <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "capitalize", letterSpacing: "0.02em" }}>{s.query}</span>
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
