import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useToast } from "@/hooks/use-toast";
import SearchSuggestionsDropdown from "@/components/SearchSuggestionsDropdown";
import TextSuggestionsDropdown from "@/components/TextSuggestionsDropdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic, MicOff, Loader } from "lucide-react";

export type SearchInputVariant = "hero" | "floating";

interface SearchInputProps {
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

const SearchInput = ({
  variant = "floating",
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

  // Autocomplete suggestions — business mode
  const { suggestions: businessSuggestions } = useSearchSuggestions(
    inputValue,
    showSuggestions && isFocused && suggestionMode === "business"
  );
  // Autocomplete suggestions — text mode (popular searches)
  const { suggestions: popularSuggestions } = usePopularSearches(
    inputValue,
    showSuggestions && isFocused && suggestionMode === "text"
  );

  const shouldClear = clearOnSubmit ?? !isControlled;

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    if (onSubmit) {
      onSubmit(inputValue.trim());
    } else {
      go(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
    if (shouldClear) setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder =
    language === "fr"
      ? variant === "hero" ? "Que cherchez-vous ?" : "Rechercher un établissement..."
      : language === "ar"
        ? variant === "hero" ? "ماذا تبحث عنه؟" : "ابحث عن مؤسسة..."
        : variant === "hero" ? "What are you looking for?" : "Search for a business...";

  const buttonLabel = language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search";

  const isHero = variant === "hero";
  const desktopInputClass = isHero ? "pl-14 pr-36 py-7 text-lg" : "pl-14 pr-36 py-6 text-base";
  const mobileInputClass = isHero ? "pl-14 pr-4 py-7 text-lg" : "pl-11 pr-4 py-5 text-sm";
  const desktopMicSize = isHero ? "w-14 h-14" : "w-12 h-12";
  const mobileMicSize = "w-11 h-11";
  const desktopIconSize = isHero ? "h-6 w-6" : "h-5 w-5";
  const mobileIconSize = isHero ? "h-5 w-5" : "h-4 w-4";

  const micButton = (size: string, iconSize: string) => (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={voiceStatus === "processing"}
      className={`flex-shrink-0 flex items-center justify-center ${size} rounded-2xl shadow-lg transition-all ${
        voiceStatus === "recording"
          ? "bg-red-100 animate-pulse"
          : voiceStatus === "processing"
            ? "bg-white/70"
            : "bg-white/90 hover:bg-white"
      }`}
      title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
    >
      {voiceStatus === "processing" ? (
        <Loader className={`${iconSize} text-black animate-spin`} />
      ) : voiceStatus === "recording" ? (
        <MicOff className={`${iconSize} text-red-600`} />
      ) : (
        <Mic className={`${iconSize} text-black`} />
      )}
    </button>
  );

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full ${desktopInputClass} bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg`}
          />
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-semibold rounded-full px-6 py-4 shadow-md border border-black/10"
            style={{ backgroundColor: "#25D366" }}
          >
            {buttonLabel}
          </Button>
          {suggestionMode === "text" ? (
            <TextSuggestionsDropdown
              suggestions={popularSuggestions.map(s => s.query)}
              visible={isFocused && popularSuggestions.length > 0}
              onSelect={(text) => setInputValue(text)}
              position={suggestionsPosition}
            />
          ) : (
            <SearchSuggestionsDropdown
              suggestions={businessSuggestions}
              visible={isFocused && businessSuggestions.length > 0}
              position={suggestionsPosition}
            />
          )}
        </div>
        {micButton(desktopMicSize, desktopIconSize)}
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full ${mobileInputClass} bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg`}
          />
          {suggestionMode === "text" ? (
            <TextSuggestionsDropdown
              suggestions={popularSuggestions.map(s => s.query)}
              visible={isFocused && popularSuggestions.length > 0}
              onSelect={(text) => setInputValue(text)}
              position={suggestionsPosition}
            />
          ) : (
            <SearchSuggestionsDropdown
              suggestions={businessSuggestions}
              visible={isFocused && businessSuggestions.length > 0}
              position={suggestionsPosition}
            />
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-white font-semibold text-sm shadow-lg h-[48px]"
            style={{ backgroundColor: "#25D366" }}
          >
            {isHero ? buttonLabel : <Search className="h-5 w-5" />}
          </button>
          {micButton(mobileMicSize, mobileIconSize)}
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
