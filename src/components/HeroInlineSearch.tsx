import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Mic, MicOff, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import VoiceSearchPanel from "@/components/VoiceSearchPanel";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  placeholder: string;
  onSearch: (params: Record<string, string>) => void;
  onBusinessSelect?: (businessId: string) => void;
  onMobileSearchClick?: () => void;
  onVoiceActiveChange?: (active: boolean) => void;
  /** Override de la couleur du texte de l'overlay vocal (ex: "text-white" sur fond sombre). */
  voiceTextClassName?: string;
  /** Masque la barre de recherche pendant l'enregistrement vocal (overlay STT seul). */
  hideBarWhenVoiceActive?: boolean;
  /** Élément(s) inséré à gauche des boutons Loupe/Micro sur mobile (ex: CTA Demo). */
  leftActions?: React.ReactNode;
}


const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HeroInlineSearch = ({ placeholder, onSearch, onMobileSearchClick, onVoiceActiveChange, voiceTextClassName, hideBarWhenVoiceActive, leftActions }: Props) => {


  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const { toast } = useToast();

  const { suggestions: popularSuggestions } = usePopularSearches(query, true);

  useEffect(() => {
    supabase
      .from("cities")
      .select("name_fr")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setCities(data.map((c: { name_fr: string }) => c.name_fr));
      });
  }, []);

  /** Find a city name mentioned in `text` (accent-insensitive, word-boundary). */
  const detectCity = useCallback((text: string): string | null => {
    if (!text || cities.length === 0) return null;
    const norm = ` ${normalize(text)} `;
    for (const city of cities) {
      const n = normalize(city);
      if (new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(norm)) {
        return city;
      }
    }
    return null;
  }, [cities]);

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
    const params: Record<string, string> = { q: text.trim(), _t: String(Date.now()) };
    const city = detectCity(text);
    if (city) params.city = city;
    onSearch(params);
  }, [onSearch, detectCity]);

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      const params: Record<string, string> = { q: keywords, spoken, _t: String(Date.now()) };
      if (detectedCategory) params.category = detectedCategory;
      if (timeKeyword) params.timeKeyword = timeKeyword;
      const city = detectCity(spoken) || detectCity(keywords);
      if (city) params.city = city;
      onSearch(params);
    },
    onError: (message) => {
      toast({ title: language === "ar" ? "خطأ" : language === "en" ? "Error" : "Erreur", description: message, variant: "destructive" });
    },
  });

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const isBelowDesktop = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const useMobileOverlay = isBelowDesktop && !!onMobileSearchClick;
  const showDropdown = !isMobile && focused && popularSuggestions.length > 0;

  useEffect(() => {
    onVoiceActiveChange?.(!useMobileOverlay && (voice.status === "recording" || voice.status === "processing"));
  }, [onVoiceActiveChange, useMobileOverlay, voice.status]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="relative flex flex-col md:flex-row md:items-center gap-3 md:gap-2 transition-opacity duration-200"
        style={
          hideBarWhenVoiceActive &&
          !useMobileOverlay &&
          (voice.status === "recording" || voice.status === "processing")
            ? { opacity: 0, pointerEvents: "none" }
            : undefined
        }
      >
        <div className="relative flex-1 btn-flash rounded-xl overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(query); } }}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full h-12 md:h-14 px-4 pr-10 text-left text-base md:text-lg text-black border border-black/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-black/30 placeholder:text-black/60 placeholder:text-left transition-all"
            style={{ backgroundColor: "#F1F1F1" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
              aria-label="Clear"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 md:contents">
        {leftActions}
        <button
          type="button"
          onClick={() => submit(query)}
          aria-label={language === "ar" ? "بحث" : language === "en" ? "Search" : "Rechercher"}
          className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0 transition-all bg-primary hover:bg-primary/90 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] btn-flash"
        >
          <Search className="h-5 w-5 text-primary-foreground" />
        </button>


        <div className="relative flex items-center justify-center shrink-0">
          <span className="hero-search-ripple absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/30 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
          <span className="hero-search-ripple absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
          <span className="hero-search-ripple absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/10 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
          <button
            type="button"
            onClick={() => (useMobileOverlay ? onMobileSearchClick!() : voice.toggleRecording())}
            disabled={voice.status === "processing"}
            aria-label={language === "ar" ? "بحث صوتي" : language === "en" ? "Voice search" : "Recherche vocale"}
            className={`relative z-10 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0 transition-all border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] btn-flash ${
              voice.status === "recording"
                ? "bg-red-500 animate-pulse"
                : voice.status === "processing"
                  ? "bg-[#194CFF]"
                  : "bg-[#194CFF] hover:bg-[#194CFF]/90"
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
              <span className="text-sm text-foreground font-bold capitalize" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.02em" }}>{s.query}</span>
            </button>
          ))}
        </div>
      )}

      {!useMobileOverlay && (voice.status === "recording" || voice.status === "processing") && (
        <VoiceSearchPanel
          liveTranscript={voice.liveTranscript}
          audioLevel={voice.audioLevel}
          micReady={voice.micReady}
          textClassName={voiceTextClassName}
          onClose={voice.toggleRecording}
          onFinish={voice.finishRecording}
        />

      )}
    </div>
  );
};

export default HeroInlineSearch;
