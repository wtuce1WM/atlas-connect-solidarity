import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Mic, MicOff, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import VoiceSearchPanel from "@/components/VoiceSearchPanel";

interface Props {
  placeholder: string;
  onSearch: (params: Record<string, string>) => void;
  onBusinessSelect?: (businessId: string) => void;
}

const HeroInlineSearch = ({ placeholder, onSearch }: Props) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const { toast } = useToast();

  const { suggestions: popularSuggestions } = usePopularSearches(query, true);

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

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      const params: Record<string, string> = { q: keywords, spoken, _t: String(Date.now()) };
      if (detectedCategory) params.category = detectedCategory;
      if (timeKeyword) params.timeKeyword = timeKeyword;
      onSearch(params);
    },
    onError: (message) => {
      toast({ title: language === "fr" ? "Erreur" : "Error", description: message, variant: "destructive" });
    },
  });

  const showDropdown = focused && popularSuggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(query); } }}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full h-12 md:h-14 px-4 pr-10 text-left text-base md:text-lg bg-white/90 backdrop-blur-sm border border-primary/60 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground placeholder:text-left"
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

        <div className="flex items-center justify-center gap-2 md:contents">
        <button
          type="button"
          onClick={() => submit(query)}
          aria-label={language === "fr" ? "Rechercher" : "Search"}
          className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0 transition-all shadow-lg bg-primary hover:bg-primary/90"
        >
          <Search className="h-5 w-5 text-primary-foreground" />
        </button>

        <button
          type="button"
          onClick={() => voice.toggleRecording()}
          disabled={voice.status === "processing"}
          aria-label={language === "fr" ? "Recherche vocale" : "Voice search"}
          className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0 transition-all shadow-lg ${
            voice.status === "recording"
              ? "bg-red-500 animate-pulse"
              : voice.status === "processing"
                ? "bg-muted"
                : "bg-foreground/80 hover:bg-foreground"
          }`}
        >
          {voice.status === "processing" ? (
            <Loader className="h-5 w-5 text-white animate-spin" />
          ) : voice.status === "recording" ? (
            <MicOff className="h-5 w-5 text-white" />
          ) : (
            <Mic className="h-5 w-5 text-white" />
          )}
        </button>
        </div>
      </div>


      {showDropdown && (
        <div className="absolute left-0 right-14 md:right-16 top-full mt-2 z-[60] bg-white rounded-xl shadow-2xl border border-border max-h-72 overflow-y-auto py-2">
          {popularSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => submit(s.query)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 text-left"
            >
              <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.02em" }}>{s.query}</span>
            </button>
          ))}
        </div>
      )}

      <VoiceSearchOverlay
        isOpen={voice.status === "recording" || voice.status === "processing"}
        liveTranscript={voice.liveTranscript}
        onClose={voice.toggleRecording}
        onFinish={voice.finishRecording}
      />
    </div>
  );
};

export default HeroInlineSearch;
