import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useToast } from "@/hooks/use-toast";
import SearchSuggestionsDropdown from "@/components/SearchSuggestionsDropdown";
import TextSuggestionsDropdown from "@/components/TextSuggestionsDropdown";
import { Input } from "@/components/ui/input";
import { Search, Mic, MicOff, Loader } from "lucide-react";

export type SearchInputVariant = "hero" | "floating";

interface SearchInputProps {
  /** Custom placeholder override */
  placeholder?: string;
  variant?: SearchInputVariant;
  /** Pre-fill input value (uncontrolled) */
  defaultValue?: string;
  /** Controlled value */
  value?: string;
  /** Controlled onChange */
  onChange?: (value: string) => void;
  /** Whether to clear input after submit (default: true for uncontrolled) */
  clearOnSubmit?: boolean;
  /** Called on submit with the trimmed query. If omitted, navigates to /search?q=... */
  onSubmit?: (query: string) => void;
  /** Override navigation for voice results */
  onNavigate?: (url: string) => void;
  /** Voice search lang override */
  voiceLang?: string;
  /** Callback when voice transcript is ready */
  onVoiceTranscript?: (keywords: string, spoken: string, detectedCategory?: string, timeKeyword?: string) => void;
  /** Show autocomplete suggestions */
  showSuggestions?: boolean;
  /** "business" = show business cards (default), "text" = show text-only popular searches */
  suggestionMode?: "business" | "text";
  /** Suggestions position */
  suggestionsPosition?: "top" | "bottom";
  /** Voice status and toggle from parent (to share with VoiceSearchOverlay) */
  voiceControl?: {
    status: "idle" | "recording" | "processing" | "error";
    toggleRecording: () => void;
    liveTranscript: string;
  };
}

interface SearchInputSuggestionsProps {
  inputValue: string;
  suggestionMode: "business" | "text";
  position: "top" | "bottom";
  language: "fr" | "en" | "ar";
  onTextSelect: (text: string) => void;
}

const SearchInputSuggestions = ({
  inputValue,
  suggestionMode,
  position,
  language,
  onTextSelect,
}: SearchInputSuggestionsProps) => {
  const { suggestions: businessSuggestions } = useSearchSuggestions(
    inputValue,
    suggestionMode === "business",
  );
  const { suggestions: popularSuggestions } = usePopularSearches(
    inputValue,
    suggestionMode === "text",
  );
  const { history, deleteEntry, clearHistory } = useSearchHistory();

  const recentForDropdown = (!inputValue || inputValue.trim().length < 2)
    ? history.slice(0, 5).map((entry) => ({ id: entry.id, query: entry.query }))
    : [];

  const recentLabel = language === "fr" ? "Recherches récentes" : language === "ar" ? "عمليات البحث الأخيرة" : "Recent searches";
  const clearLabel = language === "fr" ? "Effacer" : language === "ar" ? "مسح" : "Clear";

  if (suggestionMode === "text") {
    return (
      <TextSuggestionsDropdown
        suggestions={popularSuggestions.map((suggestion) => suggestion.query)}
        visible={popularSuggestions.length > 0 || recentForDropdown.length > 0}
        onSelect={onTextSelect}
        position={position}
        recentSearches={recentForDropdown}
        onDeleteRecent={deleteEntry}
        onClearRecent={clearHistory}
        recentLabel={recentLabel}
        clearLabel={clearLabel}
      />
    );
  }

  return (
    <SearchSuggestionsDropdown
      suggestions={businessSuggestions}
      visible={businessSuggestions.length > 0}
      position={position}
    />
  );
};

const SearchInput = ({
  variant = "floating",
  placeholder: customPlaceholder,
  defaultValue = "",
  value: controlledValue,
  onChange: controlledOnChange,
  clearOnSubmit,
  onSubmit,
  onNavigate,
  voiceLang,
  onVoiceTranscript,
  showSuggestions = true,
  suggestionMode = "business",
  suggestionsPosition = "bottom",
  voiceControl,
}: SearchInputProps) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const inputValue = isControlled ? controlledValue : internalValue;
  const setInputValue = isControlled ? (v: string) => controlledOnChange?.(v) : setInternalValue;
  const [isFocused, setIsFocused] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const go = useCallback((url: string) => (onNavigate ? onNavigate(url) : navigate(url)), [onNavigate, navigate]);

  // Internal voice search (used only when parent doesn't provide voiceControl)
  const internalVoice = useVoiceSearch({
    lang: voiceLang,
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      if (onVoiceTranscript) {
        onVoiceTranscript(keywords, spoken, detectedCategory, timeKeyword);
      } else {
        const params = new URLSearchParams({ q: keywords, spoken });
        if (detectedCategory) params.set("category", detectedCategory);
        if (timeKeyword) params.set("timeKeyword", timeKeyword);
        go(`/search?${params.toString()}`);
      }
    },
    onError: (message) => {
      toast({ title: language === "fr" ? "Erreur" : "Error", description: message, variant: "destructive" });
    },
  });

  const voiceStatus = voiceControl?.status ?? internalVoice.status;
  const toggleRecording = voiceControl?.toggleRecording ?? internalVoice.toggleRecording;
  const liveTranscript = voiceControl?.liveTranscript ?? internalVoice.liveTranscript;
  const isVoiceActive = voiceStatus === "recording" || voiceStatus === "processing";
  const displayValue = isVoiceActive && liveTranscript ? liveTranscript : inputValue;
  const shouldClear = clearOnSubmit ?? !isControlled;

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    if (onSubmit) {
      onSubmit(inputValue.trim());
    } else {
      go(`/search?q=${encodeURIComponent(inputValue.trim())}&_t=${Date.now()}`);
    }
    if (shouldClear) setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder = customPlaceholder ||
    (language === "fr"
      ? variant === "hero" ? "Que cherchez-vous ?" : "Rechercher un établissement..."
      : language === "ar"
        ? variant === "hero" ? "ماذا تبحث عنه؟" : "ابحث عن مؤسسة..."
        : variant === "hero" ? "What are you looking for?" : "Search for a business...");

  const buttonLabel = language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search";

  const isHero = variant === "hero";

  // Mic button inside input (Restaurant Guru style: white icon on dark rounded square)
  const inlineMicButton = (
    <div className="relative flex items-center justify-center">
      {/* Concentric ripple rings — black */}
      <span className="absolute w-10 h-10 rounded-full border border-foreground/30 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
      <span className="absolute w-10 h-10 rounded-full border border-foreground/20 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
      <span className="absolute w-10 h-10 rounded-full border border-foreground/10 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
      <button
        type="button"
        onClick={toggleRecording}
        disabled={voiceStatus === "processing"}
        className={`relative z-10 flex items-center justify-center w-12 h-12 md:w-10 md:h-10 rounded-xl transition-all ${
          voiceStatus === "recording"
            ? "bg-red-500 animate-pulse"
            : voiceStatus === "processing"
              ? "bg-muted"
              : "bg-foreground/80 hover:bg-foreground"
        }`}
        title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
      >
        {voiceStatus === "processing" ? (
          <Loader className="h-5 w-5 text-white animate-spin" />
        ) : voiceStatus === "recording" ? (
          <MicOff className="h-5 w-5 text-white" />
        ) : (
          <Mic className="h-5 w-5 text-white" />
        )}
      </button>
    </div>
  );

  // Search button outside input (Restaurant Guru style: red/green square with magnifying glass)
  const searchButton = (
    <button
      type="button"
      onClick={handleSubmit}
      className="flex items-center justify-center w-14 h-14 rounded-xl shadow-lg transition-all hover:opacity-90 shrink-0"
      style={{ backgroundColor: "hsl(var(--primary))" }}
      title={buttonLabel}
    >
      <Search className="h-6 w-6 text-white" />
    </button>
  );

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full ${isHero ? "pl-5 pr-16 py-7 text-lg" : "pl-5 pr-16 py-6 text-base"} bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-xl shadow-lg`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 overflow-visible">
            {inlineMicButton}
          </div>
          {showSuggestions && isFocused ? (
            <SearchInputSuggestions
              inputValue={inputValue}
              suggestionMode={suggestionMode}
              position={suggestionsPosition}
              language={language}
              onTextSelect={setInputValue}
            />
          ) : null}
        </div>
        {searchButton}
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-6 md:hidden">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full ${isHero ? "pl-4 pr-4 py-6 text-base" : "pl-4 pr-4 py-5 text-sm"} bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-xl shadow-lg`}
          />
          {showSuggestions && isFocused ? (
            <SearchInputSuggestions
              inputValue={inputValue}
              suggestionMode={suggestionMode}
              position={suggestionsPosition}
              language={language}
              onTextSelect={setInputValue}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-6">
          {inlineMicButton}
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg transition-all hover:opacity-90 shrink-0"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            <Search className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
