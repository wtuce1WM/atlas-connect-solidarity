import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";

interface PanelSearchBarProps {
  /** Called when user submits a search */
  onSearch?: (params: Record<string, string>) => void;
  /** Called when user selects a business from suggestions */
  onBusinessSelect?: (businessId: string) => void;
}

const PanelSearchBar = ({ onSearch, onBusinessSelect }: PanelSearchBarProps) => {
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const { toast } = useToast();

  const voice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      setSearchOverlayOpen(false);
      const params: Record<string, string> = { q: keywords, spoken, _t: String(Date.now()) };
      if (detectedCategory) params.category = detectedCategory;
      if (timeKeyword) params.timeKeyword = timeKeyword;
      onSearch?.(params);
    },
    onError: (msg) => toast({ title: "Erreur", description: msg, variant: "destructive" }),
  });

  const handleVoiceStart = useCallback(() => {
    setSearchOverlayOpen(false);
    setTimeout(() => voice.toggleRecording(), 150);
  }, [voice]);

  return (
    <>
      {/* Trigger bar fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[75] py-3 px-4">
        <button
          type="button"
          onClick={() => setSearchOverlayOpen(true)}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-transparent border border-white/40 rounded-xl backdrop-blur-sm"
        >
          <Search className="h-4 w-4 text-white shrink-0" />
        </button>
      </div>

      {/* Search overlay — covers toolbar */}
      {searchOverlayOpen && (
        <div className="absolute -top-[3.3rem] left-0 right-0 bottom-0 z-[80]">
          <MobileSearchOverlay
            open={searchOverlayOpen}
            onClose={() => setSearchOverlayOpen(false)}
            contained
            onBusinessSelect={(bizId) => {
              setSearchOverlayOpen(false);
              onBusinessSelect?.(bizId);
            }}
            onSearch={(params) => {
              setSearchOverlayOpen(false);
              onSearch?.(params);
            }}
            onVoiceStart={handleVoiceStart}
          />
        </div>
      )}

      {/* Voice overlay — covers toolbar */}
      <VoiceSearchOverlay
        isOpen={voice.status === "recording" || voice.status === "processing"}
        liveTranscript={voice.liveTranscript}
        onClose={() => voice.toggleRecording()}
        onFinish={() => voice.finishRecording()}
        contained
      />
    </>
  );
};

export default PanelSearchBar;
