import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestionsDropdown from "@/components/SearchSuggestionsDropdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic, MicOff, Loader } from "lucide-react";

const FloatingSearchBar = () => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { suggestions } = useSearchSuggestions(inputValue);

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory) => {
      const params = new URLSearchParams({ q: keywords, spoken });
      if (detectedCategory) params.set("category", detectedCategory);
      navigate(`/search?${params.toString()}`);
    },
    onError: (message) => {
      toast({ title: language === "fr" ? "Erreur" : "Error", description: message, variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      setInputValue("");
    }
  };

  const placeholder = language === "fr"
    ? "Rechercher un établissement..."
    : language === "ar"
      ? "ابحث عن مؤسسة..."
      : "Search for a business...";

  const buttonLabel = language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search";

  return (
    <div className="sticky bottom-0 z-40 bg-black/90 backdrop-blur-md border-t border-gold/20 py-3 px-4">
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="w-full pl-14 pr-36 py-6 text-base bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
            />
            <SearchSuggestionsDropdown
              suggestions={suggestions}
              visible={showSuggestions && suggestions.length > 0}
              position="top"
            />
            <Button
              type="submit"
              size="lg"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-semibold rounded-full px-6 py-4 shadow-md border border-black/10"
              style={{ backgroundColor: "#25D366" }}
            >
              {buttonLabel}
            </Button>
          </div>
          <button
            type="button"
            onClick={toggleRecording}
            disabled={voiceStatus === "processing"}
            className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all ${
              voiceStatus === "recording"
                ? "bg-red-100 animate-pulse"
                : voiceStatus === "processing"
                  ? "bg-white/70"
                  : "bg-white/90 hover:bg-white"
            }`}
            title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
          >
            {voiceStatus === "processing" ? (
              <Loader className="h-5 w-5 text-black animate-spin" />
            ) : voiceStatus === "recording" ? (
              <MicOff className="h-5 w-5 text-red-600" />
            ) : (
              <Mic className="h-5 w-5 text-black" />
            )}
          </button>
        </div>

        {/* Mobile */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="w-full pl-11 pr-4 py-5 text-sm bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
            />
            <SearchSuggestionsDropdown
              suggestions={suggestions}
              visible={showSuggestions && suggestions.length > 0}
              position="top"
            />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              type="submit"
              size="sm"
              className="text-white font-semibold rounded-full px-5 py-2 shadow-md border border-black/10 text-xs"
              style={{ backgroundColor: "#25D366" }}
            >
              {buttonLabel}
            </Button>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={voiceStatus === "processing"}
              className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl shadow-lg transition-all ${
                voiceStatus === "recording"
                  ? "bg-red-100 animate-pulse"
                  : voiceStatus === "processing"
                    ? "bg-white/70"
                    : "bg-white/90 hover:bg-white"
              }`}
              title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
            >
              {voiceStatus === "processing" ? (
                <Loader className="h-4 w-4 text-black animate-spin" />
              ) : voiceStatus === "recording" ? (
                <MicOff className="h-4 w-4 text-red-600" />
              ) : (
                <Mic className="h-4 w-4 text-black" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FloatingSearchBar;
