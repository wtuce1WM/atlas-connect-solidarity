import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, X, TrendingUp, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRecentlyViewedBusinesses } from "@/hooks/useRecentlyViewedBusinesses";

interface Props {
  placeholder: string;
  onSearch: (params: Record<string, string>) => void;
  onBusinessSelect: (businessId: string) => void;
}

const HeroInlineSearch = ({ placeholder, onSearch, onBusinessSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const { suggestions: popularSuggestions } = usePopularSearches(query, true);
  const { history, deleteEntry, clearHistory } = useSearchHistory();
  const { recentBusinesses } = useRecentlyViewedBusinesses();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submit = useCallback((text: string) => {
    if (!text.trim()) return;
    setFocused(false);
    onSearch({ q: text.trim(), _t: String(Date.now()) });
  }, [onSearch]);

  const recentLabel = language === "fr" ? "Recherches récentes" : language === "ar" ? "عمليات البحث الأخيرة" : "Recent searches";
  const clearLabel = language === "fr" ? "Effacer tout" : language === "ar" ? "مسح الكل" : "Clear all";
  const popularLabel = language === "fr" ? "Recherches populaires" : language === "ar" ? "عمليات البحث الشائعة" : "Popular searches";
  const viewedLabel = language === "fr" ? "Consultés récemment" : language === "ar" ? "تمت مشاهدتها مؤخرًا" : "Recently viewed";

  const showRecent = (!query || query.trim().length < 2) && history.length > 0;
  const showRecentlyViewed = (!query || query.trim().length < 2) && recentBusinesses.length > 0;
  const showPopular = popularSuggestions.length > 0;
  const showPanel = focused && (showRecent || showRecentlyViewed || showPopular);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(query); } }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-12 pr-10 py-6 md:py-7 text-base md:text-lg bg-white/90 backdrop-blur-sm border border-gold/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
            aria-label="Clear"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-border max-h-[60vh] overflow-y-auto px-4 py-4">
          {showRecent && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {recentLabel}
                </span>
                <button type="button" onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground">
                  {clearLabel}
                </button>
              </div>
              <div className="space-y-0.5">
                {history.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="group flex items-center rounded-lg hover:bg-muted/50">
                    <button type="button" onClick={() => submit(entry.query)} className="flex-1 flex items-center gap-3 px-3 py-2 text-left">
                      <Clock className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.02em" }}>{entry.query}</span>
                    </button>
                    <button type="button" onClick={() => deleteEntry(entry.id)} className="pr-3 opacity-60" title="Supprimer">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showRecentlyViewed && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                {viewedLabel}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {recentBusinesses.slice(0, 6).map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => { setFocused(false); onBusinessSelect(biz.id); }}
                    className="relative group"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                      {biz.image ? (
                        <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <MapPin className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg px-1.5 pb-1 pt-3">
                      <span className="block text-[11px] font-semibold text-white line-clamp-2 leading-tight" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                        {biz.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPopular && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                {query.trim().length >= 2 ? (language === "fr" ? "Suggestions" : "Suggestions") : popularLabel}
              </span>
              <div className="space-y-0.5">
                {popularSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => submit(s.query)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-left"
                  >
                    <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.02em" }}>{s.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroInlineSearch;
