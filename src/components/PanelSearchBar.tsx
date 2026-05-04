import { useState, useCallback, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import PanelAiOverlay from "@/components/overlays/PanelAiOverlay";
import OverlayShell from "@/components/overlays/OverlayShell";

interface PanelSearchBarProps {
  /** Called when user submits a search */
  onSearch?: (params: Record<string, string>) => void;
  /** Called when user selects a business from suggestions */
  onBusinessSelect?: (businessId: string) => void;
  /** Business context for AI suggestion */
  businessCity?: string | null;
  businessCategory?: string | null;
  businessName?: string | null;
  /** Called when the search overlay opens or closes */
  onOverlayChange?: (open: boolean) => void;
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
}

const PanelSearchBar = ({ onSearch, onBusinessSelect, businessCity, businessCategory, businessName, onOverlayChange, darkBackground, closeTrigger, noToolbarOffset, iconVariant = "white", solidBackground = false }: PanelSearchBarProps) => {
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // Notify parent when search overlay opens/closes
  const setOverlay = useCallback((open: boolean) => {
    setSearchOverlayOpen(open);
    onOverlayChange?.(open);
  }, [onOverlayChange]);
  const [aiOverlayOpen, setAiOverlayOpen] = useState(false);
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
    onError: (msg) => toast({ title: "Erreur", description: msg, variant: "destructive" }),
  });

  const handleVoiceStart = useCallback(() => {
    voice.toggleRecording();
  }, [voice]);

  const isBlack = iconVariant === "black";

  return (
    <>
      {/* Trigger bar fixed at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 z-[85] py-3 px-4 ${darkBackground ? 'bg-black' : ''}`}>
        <button
          type="button"
          onClick={() => setOverlay(true)}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl ${
            solidBackground
              ? 'bg-background border-border shadow-sm'
              : `bg-transparent backdrop-blur-sm ${isBlack ? 'border-black ring-1 ring-white ring-offset-0' : 'border-white/40'}`
          }`}
        >
          <Search className={`h-4 w-4 shrink-0 ${solidBackground ? 'text-foreground' : isBlack ? 'text-black [filter:drop-shadow(0_0_0.5px_white)_drop-shadow(0_0_0.5px_white)_drop-shadow(0_0_0.5px_white)_drop-shadow(0_0_0.5px_white)]' : 'text-white'}`} />
        </button>
      </div>

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
          {/* AI Suggestion overlay — on top of search overlay */}
          <PanelAiOverlay
            open={aiOverlayOpen}
            onClose={() => setAiOverlayOpen(false)}
            city={businessCity}
            category={businessCategory}
            businessName={businessName}
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
