import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Clock, X, Mic, MicOff, Loader, TrendingUp, MapPin, MapPinOff, Sparkles } from "lucide-react";
import { businessUrl } from "@/lib/businessUrl";
import PanelLocationOverlay from "@/components/overlays/PanelLocationOverlay";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";

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

const TRANSLATIONS = {
  fr: { error: "Erreur", recent: "Recherches récentes", clearAll: "Effacer tout", popular: "Recherches populaires", placeholder: "Rechercher un établissement...", recentlyViewed: "Consultés récemment", suggestions: "Suggestions" },
  en: { error: "Error", recent: "Recent searches", clearAll: "Clear all", popular: "Popular searches", placeholder: "Search for a business...", recentlyViewed: "Recently viewed", suggestions: "Suggestions" },
  ar: { error: "خطأ", recent: "عمليات البحث الأخيرة", clearAll: "مسح الكل", popular: "عمليات البحث الشائعة", placeholder: "ابحث عن مؤسسة...", recentlyViewed: "تمت مشاهدتها مؤخرًا", suggestions: "اقتراحات" },
} as const;



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
  const dictationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSubmitRef = useRef<() => void>(() => {});
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const T = (TRANSLATIONS as any)[language] || TRANSLATIONS.fr;
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
      toast({ title: T.error, description: message, variant: "destructive" });
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

  // Keep a ref to the latest handleSubmit so the dictation timer always uses fresh query
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);
  useEffect(() => () => { if (dictationTimerRef.current) clearTimeout(dictationTimerRef.current); }, []);

  // Auto-submit ~1.2s after iOS dictation stops inserting text
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (dictationTimerRef.current) {
      clearTimeout(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }
    if (inputType === "insertReplacementText" && value.trim().length >= 2) {
      dictationTimerRef.current = setTimeout(() => {
        handleSubmitRef.current();
      }, 1200);
    }
  }, []);

  const handleSelect = useCallback((text: string) => {
    smartNavigate({ q: text, _t: String(Date.now()) });
  }, [smartNavigate]);

  if (!open) return null;

  const recentLabel = T.recent;
  const clearLabel = T.clearAll;
  const popularLabel = T.popular;
  const placeholderText = T.placeholder;


  const showRecent = (!query || query.trim().length < 2) && history.length > 0;
  const showRecentlyViewed = (!query || query.trim().length < 2) && recentBusinesses.length > 0;
  const showPopular = popularSuggestions.length > 0;

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 ${contained ? 'z-[78]' : 'z-[10000]'} flex flex-col animate-in slide-in-from-bottom duration-200 ${
        desktopDocked
          ? `lg:inset-auto lg:top-0 lg:bottom-0 lg:left-0 lg:right-auto lg:border-r lg:border-border ${desktopHalfWidth ? "lg:w-1/2" : "lg:w-full"}`
          : ""
      }`}
      style={{ backgroundColor: "#ECD6B8" }}
    >
      {/* Header with search bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border/30" style={{ backgroundColor: "#ECD6B8" }}>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:bg-black/90 transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
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

        {/* Submit button — visible when query has content (also serves as fallback after iOS dictation) */}
        {query.trim().length >= 2 && (
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center px-4 h-10 rounded-xl shrink-0 bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
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
                    <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "capitalize", letterSpacing: "0.02em" }}>{entry.query}</span>
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
              {T.recentlyViewed}
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
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border relative">
                    {biz.image ? (
                      <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                    {biz.isYoutubeChannel && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-[#FF0000] rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current ml-0.5">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-1.5 pb-1.5 pt-4">
                    <span
                      className="block text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:underline"
                      style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}
                    >
                      {biz.name}
                    </span>
                  </div>
                </button>
              ))}
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
              {query.trim().length >= 2 ? T.suggestions : popularLabel}
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
                  <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "capitalize", letterSpacing: "0.02em" }}>{s.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <VoiceSearchOverlay
        isOpen={voice.status === "recording" || voice.status === "processing"}
        liveTranscript={voice.liveTranscript}
          audioLevel={voice.audioLevel}
          micReady={voice.micReady}
        onClose={voice.toggleRecording}
        onFinish={voice.finishRecording}
      />
    </div>
  );
};

export default MobileSearchOverlay;
