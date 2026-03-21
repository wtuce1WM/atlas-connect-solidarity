import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Clock, X, Mic, MicOff, Loader, TrendingUp, MapPin } from "lucide-react";
import { businessUrl } from "@/lib/businessUrl";
interface MobileSearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const MobileSearchOverlay = ({ open, onClose }: MobileSearchOverlayProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();

  const { suggestions: popularSuggestions } = usePopularSearches(query, true);
  const { history, deleteEntry, clearHistory } = useSearchHistory();

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      const params = new URLSearchParams({ q: keywords, spoken });
      if (detectedCategory) params.set("category", detectedCategory);
      if (timeKeyword) params.set("timeKeyword", timeKeyword);
      onClose();
      navigate(`/search?${params.toString()}`);
    },
    onError: (message) => {
      toast({ title: language === "fr" ? "Erreur" : "Error", description: message, variant: "destructive" });
    },
  });

  // Auto-focus when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      // Small delay to ensure the overlay is rendered
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}&_t=${Date.now()}`);
  }, [query, navigate, onClose]);

  const handleSelect = useCallback((text: string) => {
    onClose();
    navigate(`/search?q=${encodeURIComponent(text)}&_t=${Date.now()}`);
  }, [navigate, onClose]);

  if (!open) return null;

  const recentLabel = language === "fr" ? "Recherches récentes" : language === "ar" ? "عمليات البحث الأخيرة" : "Recent searches";
  const clearLabel = language === "fr" ? "Effacer tout" : language === "ar" ? "مسح الكل" : "Clear all";
  const popularLabel = language === "fr" ? "Recherches populaires" : language === "ar" ? "عمليات البحث الشائعة" : "Popular searches";
  const placeholderText = language === "fr" ? "Rechercher un établissement..." : language === "ar" ? "ابحث عن مؤسسة..." : "Search for a business...";

  const showRecent = (!query || query.trim().length < 2) && history.length > 0;
  const showPopular = popularSuggestions.length > 0;

  return (
    <div className="fixed inset-0 z-[10000] bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
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
          onClick={voice.toggleRecording}
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
              {history.slice(0, 5).map((entry) => (
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

        {/* Popular / matching suggestions */}
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
