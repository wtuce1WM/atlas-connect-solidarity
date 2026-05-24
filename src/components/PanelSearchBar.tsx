import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { Search, Sparkles, MapPin, Hash } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import PanelAiOverlay from "@/components/overlays/PanelAiOverlay";
import PanelHashtagsOverlay from "@/components/overlays/PanelHashtagsOverlay";
import OverlayShell from "@/components/overlays/OverlayShell";

interface PanelSearchBarProps {
  /** Called when user submits a search */
  onSearch?: (params: Record<string, string>) => void;
  /** Called when user selects a business from suggestions */
  onBusinessSelect?: (businessId: string) => void;
  /** Called when voice search detects a city-level hotel availability search */
  onHotelSearch?: (intent: { city: string; checkIn?: string; checkOut?: string; adults?: number }, spokenText: string) => void;
  /** Business context for AI suggestion */
  businessCity?: string | null;
  businessCategory?: string | null;
  businessName?: string | null;
  /** Called when the search overlay opens or closes */
  onOverlayChange?: (open: boolean) => void;
  /** Called when the AI suggestion overlay opens or closes */
  onAiOverlayChange?: (open: boolean) => void;
  /** Called when the hashtags overlay opens or closes */
  onHashtagsOverlayChange?: (open: boolean) => void;
  /** Use a dark (black) background instead of transparent */
  darkBackground?: boolean;
  /** Increment to force-close all overlays from outside */
  closeTrigger?: number;
  /** When true, skip the negative top offset used to cover a toolbar (e.g. inside a map panel) */
  noToolbarOffset?: boolean;
  /** Color of the magnifier icon and border (defaults to white) */
  iconVariant?: "white" | "black";
  /** Render the trigger itself on a solid white surface without blur */
  solidBackground?: boolean;
  /** Minimize horizontal footprint (icon-only width, centered) */
  compact?: boolean;
  /** Called when the user clicks "Voir les résultats" inside the AI suggestion overlay */
  onSeeResults?: () => void;
  /** Extra controls (e.g. video play/mute) rendered before the 4 default round buttons */
  leadingControls?: ReactNode;
}

const PanelSearchBar = ({ onSearch, onBusinessSelect, onHotelSearch, businessCity, businessCategory, businessName, onOverlayChange, onAiOverlayChange, onHashtagsOverlayChange, darkBackground, closeTrigger, noToolbarOffset, iconVariant = "white", solidBackground = false, compact = false, onSeeResults, leadingControls }: PanelSearchBarProps) => {
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // Notify parent when search overlay opens/closes
  const setOverlay = useCallback((open: boolean) => {
    setSearchOverlayOpen(open);
    onOverlayChange?.(open);
  }, [onOverlayChange]);
  const [aiOverlayOpen, _setAiOverlayOpen] = useState(false);
  const setAiOverlayOpen = useCallback((open: boolean) => {
    _setAiOverlayOpen(open);
    onAiOverlayChange?.(open);
  }, [onAiOverlayChange]);
  const [hashtagsOverlayOpen, _setHashtagsOverlayOpen] = useState(false);
  const setHashtagsOverlayOpen = useCallback((open: boolean) => {
    _setHashtagsOverlayOpen(open);
    onHashtagsOverlayChange?.(open);
  }, [onHashtagsOverlayChange]);
  const { toast } = useToast();
  const geo = useGeolocation();

  // Force-close ALL overlays when closeTrigger changes (external card click)
  const prevTrigger = useRef(closeTrigger);
  useEffect(() => {
    if (closeTrigger !== undefined && closeTrigger !== prevTrigger.current) {
      prevTrigger.current = closeTrigger;
      setAiOverlayOpen(false);
      setOverlay(false);
    }
  }, [closeTrigger, setOverlay]);

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      setOverlay(false);
      const params: Record<string, string> = { q: keywords, spoken, _t: String(Date.now()) };
      if (detectedCategory) params.category = detectedCategory;
      if (timeKeyword) params.timeKeyword = timeKeyword;
      onSearch?.(params);
    },
    onHotelSearch: onHotelSearch ? (intent, spoken) => {
      setOverlay(false);
      onHotelSearch(intent, spoken);
    } : undefined,
    onError: (msg) => toast({ title: "Erreur", description: msg, variant: "destructive" }),
  });

  const handleVoiceStart = useCallback(() => {
    voice.toggleRecording();
  }, [voice]);

  const isBlack = iconVariant === "black";

  return (
    <>
      {/* Trigger bar fixed at bottom */}
      <div className={`absolute bottom-0 z-[85] py-3 flex items-center justify-center gap-3 md:gap-10 ${compact && !leadingControls ? 'left-1/2 -translate-x-1/2 px-0' : 'left-0 right-0 px-4'}`}>
        {leadingControls}
        <button
          type="button"
          onClick={() => setOverlay(true)}
          aria-label="Search"
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <Search className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          type="button"
          onClick={() => setAiOverlayOpen(true)}
          aria-label="Suggestion IA"
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-location-picker"))}
          aria-label="Géolocalisation"
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <MapPin className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          type="button"
          onClick={() => setHashtagsOverlayOpen(true)}
          aria-label="Hashtags"
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <Hash className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      {hashtagsOverlayOpen && (
        <OverlayShell zClass="z-[92]" coverToolbar={false}>
          <PanelHashtagsOverlay open={hashtagsOverlayOpen} onClose={() => setHashtagsOverlayOpen(false)} />
        </OverlayShell>
      )}


      {/* Search overlay — covers toolbar */}
      {searchOverlayOpen && (
        <OverlayShell zClass="z-[90]" coverToolbar={false}>
          <MobileSearchOverlay
            open={searchOverlayOpen}
            onClose={() => setOverlay(false)}
            contained
            onBusinessSelect={(bizId) => {
              setAiOverlayOpen(false);
              setOverlay(false);
              onBusinessSelect?.(bizId);
            }}
            onSearch={(params) => {
              setOverlay(false);
              onSearch?.(params);
            }}
            onVoiceStart={handleVoiceStart}
            onAiSuggestionClick={() => {
              setAiOverlayOpen(true);
            }}
            geoState={{
              isEnabled: geo.isEnabled,
              isDetecting: geo.isDetecting,
              detectedCity: geo.detectedCity,
              detectedNeighborhood: geo.detectedNeighborhood,
              confirmedAddress: geo.confirmedAddress,
              accept: geo.accept,
              toggle: geo.toggle,
              setManualCity: geo.setManualCity,
            }}
          />
        </OverlayShell>
      )}

      {/* AI Suggestion overlay — independent, can be triggered standalone */}
      {aiOverlayOpen && (
        <OverlayShell zClass="z-[92]" coverToolbar={false}>
          <PanelAiOverlay
            open={aiOverlayOpen}
            onClose={() => setAiOverlayOpen(false)}
            city={businessCity}
            category={businessCategory}
            businessName={businessName}
            onAskAssistant={() => {
              setAiOverlayOpen(false);
              setOverlay(true);
            }}
            onSeeResults={onSeeResults ? () => {
              setAiOverlayOpen(false);
              onSeeResults();
            } : undefined}
          />
        </OverlayShell>
      )}

      {(voice.status === "recording" || voice.status === "processing") && (
        <OverlayShell zClass="z-[91]" coverToolbar={!noToolbarOffset}>
          <VoiceSearchOverlay
            isOpen
            liveTranscript={voice.liveTranscript}
            onClose={() => voice.toggleRecording()}
            onFinish={() => voice.finishRecording()}
            contained
          />
        </OverlayShell>
      )}
    </>
  );
};

export default PanelSearchBar;
