import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TOGGLE_LABELS = {
  fr: { show: "Afficher", hide: "Masquer", showAria: "Afficher les cartes", hideAria: "Masquer les cartes" },
  en: { show: "Show", hide: "Hide", showAria: "Show cards", hideAria: "Hide cards" },
  ar: { show: "عرض", hide: "إخفاء", showAria: "عرض البطاقات", hideAria: "إخفاء البطاقات" },
} as const;

/* ------------------------------------------------------------------ */
/*  MediaCounterBar – media index counter with optional nav chevrons  */
/* ------------------------------------------------------------------ */

interface MediaCounterBarProps {
  currentIndex: number;
  totalMedia: number;
  cardsHidden: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Optional content rendered between the chevrons (e.g. a toggle button). When provided, replaces the default counter pill. */
  children?: React.ReactNode;
}

export const MediaCounterBar = ({ currentIndex, totalMedia, cardsHidden, onPrev, onNext, children }: MediaCounterBarProps) => {
  if (totalMedia <= 1 && !children) return null;
  return (
    <div className="flex items-center justify-center gap-3 pb-2">
      {children || (
        <span className="text-white/80 text-xs font-medium bg-black/30 rounded-full px-3 py-1">
          {currentIndex + 1} / {totalMedia}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DesktopMediaArrows – left/right arrows on desktop (cardsHidden)   */
/* ------------------------------------------------------------------ */

interface DesktopMediaArrowsProps {
  totalMedia: number;
  cardsHidden: boolean;
  onPrev: () => void;
  onNext: () => void;
  hideOnMobile?: boolean;
}

export const DesktopMediaArrows = ({ totalMedia, cardsHidden, onPrev, onNext, hideOnMobile }: DesktopMediaArrowsProps) => {
  if (totalMedia <= 1 || !cardsHidden) return null;
  const visibility = hideOnMobile ? "hidden lg:flex" : "flex";
  return (
    <>
      <button onClick={onPrev} className={`${visibility} absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-white items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg`} aria-label="Previous">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={onNext} className={`${visibility} absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-white items-center justify-center text-black hover:bg-white/80 transition-colors shadow-lg`} aria-label="Next">
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  CardsToggleButton – Afficher / Masquer toggle                     */
/* ------------------------------------------------------------------ */

interface CardsToggleButtonProps {
  cardsHidden: boolean;
  showCards: () => void;
  hideCards: () => void;
  onMouseDownDrag: (e: React.MouseEvent) => void;
  /** Optional content rendered to the left in "Afficher" (show) mode — e.g. language flags */
  leftSlot?: React.ReactNode;
  /** Optional content rendered to the right of the Masquer button — e.g. rating badge */
  rightSlot?: React.ReactNode;
  /** Optional content rendered between the flags row and the toggle button — e.g. hook text on mobile */
  middleSlot?: React.ReactNode;
  /** Open/closed badge — rendered absolutely below the toggle so it doesn't push cards down */
  openBadgeInfo?: { text: string; isOpen: boolean } | null;
}

export const CardsToggleButton = ({ cardsHidden, showCards, hideCards, onMouseDownDrag, leftSlot, rightSlot, middleSlot, openBadgeInfo }: CardsToggleButtonProps) => {
  const { language } = useLanguage();
  const L = TOGGLE_LABELS[language as "fr" | "en" | "ar"] ?? TOGGLE_LABELS.fr;
  return (
    <div className={`w-full shrink-0 pointer-events-auto relative z-20 ${openBadgeInfo?.text ? (middleSlot ? "pb-2 md:pb-0" : "pb-9 md:pb-0") : ""}`}>
      <div className="flex w-full items-center justify-center gap-3 h-[32px] mb-2 relative">
        {cardsHidden ? (
          <button
            type="button"
            className="btn-shimmer relative overflow-hidden inline-flex items-center gap-2 rounded-full px-3 h-[32px] text-black shadow-lg backdrop-blur-sm hover:opacity-90 transition-colors before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/30 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/30 after:to-transparent after:blur-[1px] after:pointer-events-none [&>*]:relative [&>*]:z-10"
            style={{
              backgroundColor: '#25D366',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 4px 14px -2px rgba(0,0,0,0.35)',
            }}
            aria-label={L.showAria}
            onClick={(e) => { e.stopPropagation(); showCards(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <ChevronUp className="hidden md:inline-block h-3.5 w-3.5" />
            <span className="text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">{L.show}</span>
            <span className="hidden md:block h-1.5 w-8 rounded-full bg-black/60" />
          </button>
        ) : (
          <button
            type="button"
            className="btn-shimmer relative overflow-hidden inline-flex items-center gap-2 rounded-full px-3 h-[32px] text-white shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing select-none hover:opacity-90 transition-colors before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/30 after:to-transparent after:blur-[1px] after:pointer-events-none [&>*]:relative [&>*]:z-10"
            style={{
              backgroundColor: '#25D366',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 4px 14px -2px rgba(0,0,0,0.35)',
            }}
            aria-label="Masquer les cartes"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                hideCards();
              }
            }}
            onClick={(e) => { e.stopPropagation(); hideCards(); }}
            onMouseDown={(e) => { e.stopPropagation(); onMouseDownDrag(e); }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="text-[11px] !font-extrabold uppercase whitespace-nowrap font-['Montserrat',sans-serif]">Masquer</span>
            <span className="hidden md:block h-1.5 w-8 rounded-full bg-white/60" />
          </button>
        )}
        {!cardsHidden && rightSlot && (
          <div className="flex items-center">{rightSlot}</div>
        )}
      </div>
      {/* Optional middle slot (e.g. hook text on mobile) */}
      {!cardsHidden && middleSlot && (
        <div className="flex justify-center mt-0">
          {middleSlot}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  useOwnerLogo – manages the cinematic logo overlay state           */
/* ------------------------------------------------------------------ */

interface VideoDocInfo {
  url: string;
  owner_business_id?: string | null;
  owner_logo?: string | null;
  owner_name?: string | null;
  generic_video_account?: string | null;
}

interface LogoBigState {
  src: string;
  name: string;
  ownerId: string;
}

export function useOwnerLogo(
  cardsHidden: boolean,
  currentMediaIndex: number,
  mediaItems: { kind: string; url: string }[],
  videoDocs: VideoDocInfo[],
  currentBusinessId: string,
) {
  const [logoBigOverlay, setLogoBigOverlay] = useState<LogoBigState | null>(null);
  const [logoBigFadingOut, setLogoBigFadingOut] = useState(false);
  const logoBigShownForRef = useRef<Set<string>>(new Set());
  const logoBigTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!cardsHidden) {
      logoBigShownForRef.current.clear();
      setLogoBigOverlay(null);
      setLogoBigFadingOut(false);
      logoBigTimersRef.current.forEach(clearTimeout);
      logoBigTimersRef.current = [];
      return;
    }
    const cm = mediaItems[currentMediaIndex];
    if (cm?.kind !== "video") { setLogoBigOverlay(null); return; }
    const doc = videoDocs.find((d) => d.url === cm.url);
    if (!doc?.owner_business_id || doc.owner_business_id === currentBusinessId) { setLogoBigOverlay(null); return; }
    if (!doc.owner_logo) { setLogoBigOverlay(null); return; }
    setLogoBigFadingOut(false);
    setLogoBigOverlay({ src: doc.owner_logo, name: doc.owner_name || "", ownerId: doc.owner_business_id });
    logoBigTimersRef.current.forEach(clearTimeout);
    const fadeTimer = setTimeout(() => setLogoBigFadingOut(true), 4400);
    const hideTimer = setTimeout(() => {
      setLogoBigOverlay(null);
      setLogoBigFadingOut(false);
      logoBigTimersRef.current = [];
    }, 5000);
    logoBigTimersRef.current = [fadeTimer, hideTimer];
    return () => {
      logoBigTimersRef.current.forEach(clearTimeout);
      logoBigTimersRef.current = [];
    };
  }, [cardsHidden, currentMediaIndex, mediaItems, videoDocs, currentBusinessId]);

  return { logoBigOverlay, logoBigFadingOut };
}

/* ------------------------------------------------------------------ */
/*  OwnerLogoOverlay – the cinematic animated logo                    */
/* ------------------------------------------------------------------ */

interface OwnerLogoOverlayProps {
  logoBigOverlay: LogoBigState | null;
  logoBigFadingOut: boolean;
  cardsHidden: boolean;
  /** Current media must be a video from a different owner to show */
  currentMediaUrl?: string;
  videoDocs: VideoDocInfo[];
  currentBusinessId: string;
}

export const OwnerLogoOverlay = ({ logoBigOverlay, logoBigFadingOut, cardsHidden, currentMediaUrl, videoDocs, currentBusinessId }: OwnerLogoOverlayProps) => {
  if (!cardsHidden || !logoBigOverlay || logoBigFadingOut) return null;
  const currentVideoDoc = videoDocs.find((d) => d.url === currentMediaUrl);
  if (!currentVideoDoc?.owner_business_id || currentVideoDoc.owner_business_id === currentBusinessId) return null;
  return (
    <div className="shrink-0 flex justify-center pointer-events-none pb-4">
      <div className="animate-logo-big-full-reveal max-w-[140px] max-h-[110px] md:max-w-[240px] md:max-h-[160px]">
        <img
          src={logoBigOverlay.src}
          alt={logoBigOverlay.name}
          className="w-full h-auto max-w-full max-h-[110px] md:max-h-[160px] object-contain"
          style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  OwnerBadge – the © navigation badge above CTAs                    */
/* ------------------------------------------------------------------ */

interface OwnerBadgeProps {
  cardsHidden: boolean;
  currentMediaKind?: string;
  currentMediaUrl?: string;
  videoDocs: VideoDocInfo[];
  currentBusinessId: string;
  onNavigateToOwner: (ownerId: string) => void;
}

export const OwnerBadge = ({ cardsHidden, currentMediaKind, currentMediaUrl, videoDocs, currentBusinessId, onNavigateToOwner }: OwnerBadgeProps) => {
  if (!cardsHidden || currentMediaKind !== "video") return null;
  const currentVideoDoc = videoDocs.find((d) => d.url === currentMediaUrl);

  // Generic video: show account name badge without link
  if (currentVideoDoc?.generic_video_account) {
    return (
      <div className="shrink-0 flex justify-center pointer-events-none pb-4">
        <div className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 animate-cta-zoom-in">
          <span className="text-xs font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {currentVideoDoc.generic_video_account} <span className="text-base">©</span>
          </span>
        </div>
      </div>
    );
  }

  if (!currentVideoDoc?.owner_business_id || currentVideoDoc.owner_business_id === currentBusinessId) return null;
  if (!currentVideoDoc.owner_name) return null;
  return (
    <div className="shrink-0 flex justify-center pointer-events-auto pb-4">
      <button
        onClick={() => onNavigateToOwner(currentVideoDoc.owner_business_id!)}
        className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-3 py-1.5 hover:bg-black/85 transition-colors animate-cta-zoom-in"
      >
        <span className="text-xs font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {currentVideoDoc.owner_name} <span className="text-base">©</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0" />
      </button>
    </div>
  );
};
