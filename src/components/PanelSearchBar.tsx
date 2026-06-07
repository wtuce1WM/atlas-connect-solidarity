import { useState, useCallback, useRef, useEffect, type ReactNode, type RefObject } from "react";
import { Search, Sparkles, MapPin, Hash, Play, Pause, Volume2, VolumeX } from "lucide-react";

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
  /** Called when user clicks the "Carte" button inside the AI suggestion overlay (mobile/tablet) */
  onOpenMap?: () => void;
  /** When provided, the Sparkles button calls this instead of opening the AI overlay (used on /search to switch to the IA tab) */
  onAiClick?: () => void;
  /** Extra controls (e.g. video play/mute) rendered before the 4 default round buttons. Deprecated — prefer `videoControls`. */
  leadingControls?: ReactNode;
  /** Inline video play/mute controls rendered as labelled cells inside the unified dock pill */
  videoControls?:
    | { type: "file"; videoRef: RefObject<HTMLVideoElement>; paused: boolean; muted: boolean }
    | { type: "youtube"; iframeRef: RefObject<HTMLIFrameElement>; playing: boolean; muted: boolean; onPlayingChange: (p: boolean) => void; onMutedChange: (m: boolean) => void };
  /** When true, hides the Sparkles (Suggestion IA) button from the floating bar */
  hideAiButton?: boolean;
  /** Pre-generated AI text from /search Sticky 4 — forwarded to PanelAiOverlay to keep both views in sync */
  aiAnswerText?: string | null;
  /** Businesses pool matching aiAnswerText (for thumbnail resolution) */
  aiBusinesses?: any[] | null;
}


const KNOWN_CITIES = ["Marrakech", "Essaouira"] as const;
const enrichParamsWithCityFromQuery = (params: Record<string, string>): Record<string, string> => {
  const q = (params.q || "").toLowerCase();
  if (!q) return params;
  const mentioned = KNOWN_CITIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(q));
  if (mentioned) return { ...params, city: mentioned };
  return params;
};

const PanelSearchBar = ({ onSearch: onSearchRaw, onBusinessSelect, onHotelSearch, businessCity, businessCategory, businessName, onOverlayChange, onAiOverlayChange, onHashtagsOverlayChange, darkBackground, closeTrigger, noToolbarOffset, iconVariant = "white", solidBackground = false, compact = false, onSeeResults, onOpenMap, onAiClick, leadingControls, videoControls, hideAiButton = false, aiAnswerText, aiBusinesses }: PanelSearchBarProps) => {
  const onSearch = onSearchRaw ? (params: Record<string, string>) => onSearchRaw(enrichParamsWithCityFromQuery(params)) : undefined;
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

  // Single cell used inside the unified dock pill: round icon + small label below
  const Cell = ({ icon, label, onClick, ariaLabel, active }: { icon: ReactNode; label: string; onClick: () => void; ariaLabel: string; active?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group shrink-0 flex flex-col items-center justify-end gap-1 px-1.5 pt-1 pb-0.5 rounded-2xl hover:bg-white/10 transition-colors"
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${
          active ? "bg-[#C04F17] group-hover:bg-[#C04F17]/90" : "bg-black/60 group-hover:bg-black/75"
        }`}
      >
        {icon}
      </span>
      <span className="text-[9px] font-bold tracking-wide text-white leading-none font-['Roboto',sans-serif]">{label}</span>
    </button>
  );

  // Render play/mute cells from the typed videoControls prop
  const renderVideoCells = (): ReactNode => {
    if (!videoControls) return null;
    if (videoControls.type === "file") {
      const { videoRef, paused, muted } = videoControls;
      return (
        <>
          <Cell
            icon={paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            label={paused ? "Play" : "Pause"}
            ariaLabel={paused ? "Play" : "Pause"}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) v.play(); else v.pause();
            }}
          />
          <Cell
            icon={muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            label={muted ? "Sound" : "Mute"}
            ariaLabel={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              const next = !v.muted;
              if (!next && v.volume === 0) v.volume = 1;
              v.muted = next;
            }}
          />
        </>
      );
    }
    const { iframeRef, playing, muted, onPlayingChange, onMutedChange } = videoControls;
    return (
      <>
        <Cell
          icon={playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          label={playing ? "Pause" : "Play"}
          ariaLabel={playing ? "Pause" : "Play"}
          onClick={() => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: playing ? "pauseVideo" : "playVideo" }),
              "*"
            );
            onPlayingChange(!playing);
          }}
        />
        <Cell
          icon={muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          label={muted ? "Sound" : "Mute"}
          ariaLabel={muted ? "Unmute" : "Mute"}
          onClick={() => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: muted ? "unMute" : "mute" }),
              "*"
            );
            onMutedChange(!muted);
          }}
        />
      </>
    );
  };

  return (
    <>
      {/* Unified dock pill at the bottom of the panel */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[85]">
        <div className="relative flex items-end gap-0.5 rounded-[28px] border border-white/20 bg-black/40 px-2 py-1.5">
          {renderVideoCells()}
          {leadingControls}
          <Cell
            icon={<Search className="h-5 w-5" />}
            label="Search"
            ariaLabel="Search"
            onClick={() => setOverlay(true)}
          />
          {!hideAiButton && (
            <Cell
              icon={<Sparkles className="h-5 w-5" />}
              label="IA"
              ariaLabel="Suggestion IA"
              onClick={() => { if (onAiClick) onAiClick(); else setAiOverlayOpen(true); }}
            />
          )}
          <Cell
            icon={<MapPin className="h-5 w-5" />}
            label="Lieu"
            ariaLabel="Géolocalisation"
            active={geo.isEnabled && (!!geo.detectedCity || !!geo.detectedNeighborhood || !!geo.confirmedAddress)}
            onClick={() => window.dispatchEvent(new Event("open-location-picker"))}
          />
          <Cell
            icon={<Hash className="h-5 w-5" />}
            label="Tags"
            ariaLabel="Hashtags"
            onClick={() => setHashtagsOverlayOpen(true)}
          />
        </div>
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
            presetAnswer={aiAnswerText ?? null}
            presetBusinesses={(aiBusinesses ?? null) as any}
            onBusinessClick={(b) => {
              setAiOverlayOpen(false);
              onBusinessSelect?.(b.id);
            }}
            onAskAssistant={() => {
              setAiOverlayOpen(false);
              setOverlay(true);
            }}
            onSeeResults={onSeeResults ? () => {
              setAiOverlayOpen(false);
              onSeeResults();
            } : undefined}
            onOpenMap={onOpenMap ? () => {
              setAiOverlayOpen(false);
              onOpenMap();
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
