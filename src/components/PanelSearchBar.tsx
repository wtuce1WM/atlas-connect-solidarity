import { useState, useCallback, useRef, useEffect, type ReactNode, type RefObject } from "react";
import { Search, Sparkles, MapPin, User, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

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
  /** Force the hashtags overlay open state from parent */
  hashtagsOverlayOpen?: boolean;
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
    | { type: "file"; videoRef: RefObject<HTMLVideoElement>; paused: boolean; muted: boolean; onMutedChange?: (m: boolean) => void }
    | { type: "youtube"; iframeRef: RefObject<HTMLIFrameElement>; playing: boolean; muted: boolean; onPlayingChange: (p: boolean) => void; onMutedChange: (m: boolean) => void };
  /** When true, hides the Sparkles (Suggestion IA) button from the floating bar */

  hideAiButton?: boolean;
  /** Rend le bouton IA visuellement actif (assistant déjà ouvert derrière la fiche) */
  aiButtonActive?: boolean;
  /** When true, the Profil button always navigates to /club (page club avec login intégré)
   *  instead of dispatching "open-generic-club-popup" for anonymous users — à utiliser
   *  là où ClubLoginPopup n'est pas monté (ex. viewer vidéo). */
  profileToClub?: boolean;
  /** When true, anonymous Profil click opens the video timeline Club popup
   *  ("open-video-timeline-club", popup bleu) au lieu du popup beige global —
   *  à utiliser dans le viewer vidéo où GenericVideoTimelineOverlay est monté. */
  profileToTimelineClub?: boolean;
  /** Événement custom dispatché au clic Profil pour un visiteur anonyme —
   *  permet à l'hôte de choisir son popup club (prioritaire sur
   *  profileToTimelineClub et sur le popup beige global). */
  profileClubEvent?: string;
  /** Pre-generated AI text from /search Sticky 4 — forwarded to PanelAiOverlay to keep both views in sync */
  aiAnswerText?: string | null;
  /** Businesses pool matching aiAnswerText (for thumbnail resolution) */
  aiBusinesses?: any[] | null;
  /** Dock en 3 groupes glass (2+1+2, sans Search) — Play/Mute | IA | Lieu/Profil.
   *  Utilisé par VideoSlidePanel et BookOnlineSlidePanel. */
  dockGroups?: boolean;
}


const KNOWN_CITIES = ["Marrakech", "Essaouira"] as const;
const enrichParamsWithCityFromQuery = (params: Record<string, string>): Record<string, string> => {
  const q = (params.q || "").toLowerCase();
  if (!q) return params;
  const mentioned = KNOWN_CITIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(q));
  if (mentioned) return { ...params, city: mentioned };
  return params;
};

// Single cell used inside the unified dock pill: round icon + small label below.
// Declared at module scope so React doesn't remount it on every parent render
// (which would otherwise drop click events between mousedown/mouseup).
const Cell = ({ icon, label, onClick, ariaLabel, active }: { icon: ReactNode; label: string; onClick: () => void; ariaLabel: string; active?: boolean; variant?: "media" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex-1 sm:flex-none flex flex-col items-center justify-start gap-1 min-w-[44px] max-w-[56px] sm:w-14 h-14 pt-1 pb-0.5 rounded-2xl hover:bg-white/10 transition-colors"
    >
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          active
            ? "bg-[#C04F17] text-white group-hover:bg-[#C04F17]/90"
            : "bg-black/60 text-white group-hover:bg-black/75"
        }`}
      >
        {icon}
      </span>
      <span className="block w-full text-center text-[9px] font-bold tracking-normal leading-none whitespace-nowrap font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif] text-white">{label}</span>
    </button>
  );
};

const PanelSearchBar = ({ onSearch: onSearchRaw, onBusinessSelect, onHotelSearch, businessCity, businessCategory, businessName, onOverlayChange, onAiOverlayChange, onHashtagsOverlayChange, hashtagsOverlayOpen: hashtagsOverlayOpenProp, darkBackground, closeTrigger, noToolbarOffset, iconVariant = "white", solidBackground = false, compact = false, onSeeResults, onOpenMap, onAiClick, leadingControls, videoControls, hideAiButton = false, aiButtonActive = false, profileToClub = false, profileToTimelineClub = false, profileClubEvent, aiAnswerText, aiBusinesses, dockGroups = false }: PanelSearchBarProps) => {
  const onSearch = onSearchRaw ? (params: Record<string, string>) => onSearchRaw(enrichParamsWithCityFromQuery(params)) : undefined;
  const navigate = useLocalizedNavigate();
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setIsLoggedIn(!!session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleProfileClick = useCallback(async () => {
    // Mode « lien direct » : /club affiche son propre écran login/register
    // pour les visiteurs anonymes — pas besoin du popup club global.
    if (profileToClub) {
      navigate("/club");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // profileClubEvent : l'hôte choisit son popup club (ex. popup bleu interne
      // du slide panel). Sinon viewer vidéo (timeline) ou popup beige global.
      window.dispatchEvent(new Event(profileClubEvent ?? (profileToTimelineClub ? "open-video-timeline-club" : "open-generic-club-popup")));
      return;
    }
    navigate("/club");
  }, [navigate, profileToClub, profileToTimelineClub, profileClubEvent]);

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
  const [hashtagsOverlayOpenLocal, setHashtagsOverlayOpenLocal] = useState(false);
  const hashtagsOverlayOpen = hashtagsOverlayOpenProp !== undefined ? hashtagsOverlayOpenProp : hashtagsOverlayOpenLocal;
  const setHashtagsOverlayOpen = useCallback((open: boolean) => {
    if (hashtagsOverlayOpenProp !== undefined) {
      onHashtagsOverlayChange?.(open);
    } else {
      setHashtagsOverlayOpenLocal(open);
      onHashtagsOverlayChange?.(open);
    }
  }, [hashtagsOverlayOpenProp, onHashtagsOverlayChange]);

  useEffect(() => {
    const handler = () => setHashtagsOverlayOpen(true);
    window.addEventListener("open-hashtags-overlay", handler);
    return () => window.removeEventListener("open-hashtags-overlay", handler);
  }, [setHashtagsOverlayOpen]);
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


  // Render play/mute cells from the typed videoControls prop
  const renderVideoCells = (): ReactNode => {
    if (!videoControls) return null;
    if (videoControls.type === "file") {
      const { videoRef, paused, muted, onMutedChange } = videoControls;
      return (
        <>
          <Cell
            variant="media"
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
            variant="media"
            icon={muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            label={muted ? "Sound" : "Mute"}
            ariaLabel={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const v = videoRef.current;
              const next = v ? !v.muted : !muted;
              if (v) {
                if (!next && v.volume === 0) v.volume = 1;
                v.muted = next;
              }
              // Source de vérité : la préférence son globale
              onMutedChange?.(next);
            }}
          />
        </>
      );
    }
    const { iframeRef, playing, muted, onPlayingChange, onMutedChange } = videoControls;
    return (
      <>
        <Cell
          variant="media"
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
          variant="media"
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
      <div className="owm-panel-searchbar absolute left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 max-w-[440px] mx-auto z-[85]" style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="relative flex items-center justify-between sm:justify-start gap-1 sm:gap-0.5 rounded-[28px] border border-white/20 bg-black/40 px-3 sm:px-2 py-1">
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
              active={aiButtonActive}
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
            icon={<User className="h-5 w-5" />}
            label="Profil"
            ariaLabel="Profil"
            onClick={handleProfileClick}
            active={isLoggedIn}
          />

        </div>
      </div>


      {hashtagsOverlayOpen && hashtagsOverlayOpenProp === undefined && (
        <OverlayShell zClass="z-[92]" coverToolbar={false}>
          <PanelHashtagsOverlay open={hashtagsOverlayOpen} onClose={() => setHashtagsOverlayOpen(false)} />
        </OverlayShell>
      )}


      {/* Search overlay — contained in the current panel/map surface */}
      {searchOverlayOpen && (
        <OverlayShell zClass="z-[90]" coverToolbar={false}>
          <MobileSearchOverlay
            open={searchOverlayOpen}
            onClose={() => setOverlay(false)}
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
            contained
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
        <OverlayShell zClass="z-[91]" coverToolbar={false}>
          <VoiceSearchOverlay
            isOpen
            liveTranscript={voice.liveTranscript}
          audioLevel={voice.audioLevel}
          micReady={voice.micReady}
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
