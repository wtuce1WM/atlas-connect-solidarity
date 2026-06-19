import { Mic, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  liveTranscript: string;
  /** Niveau audio 0..1 du micro pour animer le ring autour du bouton. */
  audioLevel?: number;
  onClose: () => void;
  onFinish?: () => void;
  /** Custom layout modes based on where the overlay is displayed */
  layoutMode?: "slidepanel" | "halfscreen" | "fullscreen";
}

const ACCENT = "#194CFF";

const VoiceSearchOverlay = ({
  isOpen,
  liveTranscript,
  audioLevel = 0,
  onClose,
  onFinish,
  layoutMode = "fullscreen",
}: VoiceSearchOverlayProps) => {
  // Anti-rebond mobile : ignore les clics synthétisés (ghost click) durant les
  // premières 500ms après l'ouverture, sinon le tap sur le mic qui a déclenché
  // l'ouverture est rejoué sur les boutons de l'overlay et le referme aussitôt.
  const openedAtRef = useRef<number>(0);
  useEffect(() => {
    if (isOpen) openedAtRef.current = Date.now();
  }, [isOpen]);

  if (!isOpen) return null;

  const guardClick = (handler?: () => void) => () => {
    if (Date.now() - openedAtRef.current < 500) return;
    handler?.();
  };

  const renderMic = (isSmall = false) => {
    const sizeClasses = isSmall ? "w-16 h-16" : "w-20 h-20";
    const iconSize = isSmall ? "h-6 w-6" : "h-8 w-8";
    return (
      <div className="relative">
        {/* Ring réactif au niveau audio du micro */}
        <div
          className="absolute rounded-full pointer-events-none transition-transform duration-75 ease-out"
          style={{
            inset: "-12px",
            transform: `scale(${1 + audioLevel * 0.9})`,
            background: `radial-gradient(circle, ${ACCENT}${Math.round(20 + audioLevel * 60).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
            border: `2px solid ${ACCENT}${Math.round(60 + audioLevel * 180).toString(16).padStart(2, "0").slice(0, 2)}`,
            opacity: 0.5 + audioLevel * 0.5,
          }}
        />
        {/* Outer expanding glass ring */}
        <div
          className="absolute rounded-full animate-ping pointer-events-none backdrop-blur-2xl backdrop-saturate-150"
          style={{
            inset: isSmall ? "-20px" : "-28px",
            background: `radial-gradient(circle, ${ACCENT}15 0%, transparent 70%)`,
            border: `1px solid ${ACCENT}30`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 32px ${ACCENT}20`,
            animationDuration: "2.4s",
          }}
        />
        {/* Mid pulse glass ring */}
        <div
          className="absolute rounded-full animate-pulse pointer-events-none backdrop-blur-xl"
          style={{
            inset: isSmall ? "-12px" : "-18px",
            background: `linear-gradient(135deg, rgba(255,255,255,0.15), ${ACCENT}10)`,
            border: `1px solid rgba(255,255,255,0.25)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        />
        {/* Rotating conic accent */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "-8px",
            background: `conic-gradient(from 0deg, transparent 0%, ${ACCENT} 35%, ${ACCENT}80 50%, transparent 70%)`,
            animation: "spin 2s linear infinite",
            filter: "blur(0.5px)",
          }}
        />
        {/* Glass core button */}
        <button
          type="button"
          onClick={guardClick(liveTranscript && onFinish ? onFinish : onClose)}
          className={`relative ${sizeClasses} rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border border-white/30 transition-transform hover:scale-105`}
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))`,
            boxShadow: `0 8px 32px ${ACCENT}30, inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)`,
          }}
        >
          {/* Specular highlight */}
          <span
            className="absolute inset-1 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(160deg, rgba(255,255,255,0.4) 0%, transparent 45%)`,
            }}
          />
          <Mic className={`relative ${iconSize}`} style={{ color: ACCENT }} />
        </button>
      </div>
    );
  };

  if (layoutMode === "slidepanel") {
    return (
      <div className="absolute inset-0 z-[250] flex flex-col items-center justify-between bg-[#BED1FF]/95 backdrop-blur-md animate-in fade-in duration-200 rounded-[inherit] overflow-hidden">
        {/* Close button */}
        <button
          onClick={guardClick(onClose)}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/80 hover:bg-black transition-colors z-10 w-9 h-9 flex items-center justify-center shadow-md"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Transcript area */}
        <div className="absolute top-[12%] left-0 right-0 flex items-center justify-center px-6 w-full z-10">
          {liveTranscript ? (
            <p className="text-lg md:text-xl text-black font-bold text-center leading-relaxed">
              {liveTranscript}
            </p>
          ) : (
            <p className="text-md md:text-lg text-black/70 font-bold text-center">
              Je vous écoute…
            </p>
          )}
        </div>

        {/* Mic */}
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          {renderMic(true)}
        </div>

        {/* Hint */}
        <div className="absolute bottom-[10%] left-0 right-0 px-4 text-center z-10">
          <p className="text-xs text-black/80 font-medium leading-relaxed">
            Cliquez sur le micro ou attendez
          </p>
        </div>
      </div>
    );
  }

  if (layoutMode === "halfscreen") {
    return (
      <>
        {/* Transparent backdrop for top half to handle close on click */}
        <div
          className="fixed inset-0 z-[9999] bg-black/15"
          onClick={guardClick(onClose)}
        />
        <div className="fixed bottom-0 left-0 right-0 h-[50dvh] z-[10000] flex flex-col items-center justify-between bg-[#BED1FF]/95 backdrop-blur-md border-t border-white/30 rounded-t-[24px] md:rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300">
          {/* Close button */}
          <button
            onClick={guardClick(onClose)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black hover:bg-black/80 transition-colors z-10 w-9 h-9 flex items-center justify-center shadow-md"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Transcript area */}
          <div className="absolute top-[10%] left-0 right-0 flex items-center justify-center px-8 w-full max-w-2xl mx-auto z-10">
            {liveTranscript ? (
              <p className="text-xl md:text-2xl text-black font-bold text-center leading-relaxed">
                {liveTranscript}
              </p>
            ) : (
              <p className="text-lg md:text-xl text-black/70 font-bold text-center">
                Je vous écoute…
              </p>
            )}
          </div>

          {/* Mic */}
          <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {renderMic(false)}
          </div>

          {/* Hint */}
          <div className="absolute bottom-[8%] left-0 right-0 px-6 text-center z-10">
            <p className="text-xs md:text-sm text-black/80 font-medium leading-relaxed max-w-sm mx-auto">
              Cliquez sur le micro<br />ou attendez pour lancer la recherche
            </p>
          </div>
        </div>
      </>
    );
  }

  // Fullscreen fallback
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-[#BED1FF] backdrop-blur-md animate-in fade-in duration-200">
      {/* Close button */}
      <button
        onClick={guardClick(onClose)}
        className="absolute top-6 left-6 p-2 rounded-full bg-black hover:bg-black/80 transition-colors z-10 w-10 h-10 flex items-center justify-center shadow-md"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Transcript area (positioned in the top half) */}
      <div className="absolute top-[15%] left-0 right-0 flex items-center justify-center px-8 w-full max-w-2xl mx-auto z-10">
        {liveTranscript ? (
          <p className="text-2xl md:text-3xl text-black font-bold text-center leading-relaxed">
            {liveTranscript}
          </p>
        ) : (
          <p className="text-xl md:text-2xl text-black/70 font-bold text-center">
            Je vous écoute…
          </p>
        )}
      </div>

      {/* Mic with liquid glass animated rings (perfectly centered in the viewport height) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        {renderMic(false)}
      </div>

      {/* Hint (positioned in the bottom area) */}
      <div className="absolute bottom-[12%] left-0 right-0 px-6 text-center z-10">
        <p className="text-base md:text-lg text-black/80 font-medium leading-relaxed max-w-sm mx-auto">
          Cliquez sur le micro<br />ou attendez pour lancer la recherche
        </p>
      </div>
    </div>
  );
};

export default VoiceSearchOverlay;
