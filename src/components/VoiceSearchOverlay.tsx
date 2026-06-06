import { Mic, X } from "lucide-react";
import { useEffect, useRef } from "react";


interface VoiceSearchOverlayProps {
  isOpen: boolean;
  liveTranscript: string;
  onClose: () => void;
  onFinish?: () => void;
  /** When true, use absolute positioning to stay contained within its parent element */
  contained?: boolean;
}

const ACCENT = "#6050dc";

const VoiceSearchOverlay = ({ isOpen, liveTranscript, onClose, onFinish, contained = false }: VoiceSearchOverlayProps) => {
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

  return (
    <div className={`${contained ? 'absolute' : 'fixed'} inset-0 ${contained ? 'z-[78]' : 'z-[10000]'} flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200`}>
      {/* Close button */}
      <button
        onClick={guardClick(onClose)}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors"
      >
        <X className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Transcript area */}
      <div className="flex-1 flex items-end justify-center pb-8 pt-20 px-8 w-full max-w-2xl">
        {liveTranscript ? (
          <p className="text-2xl md:text-3xl text-foreground font-light text-center leading-relaxed">
            {liveTranscript}
          </p>
        ) : (
          <p className="text-xl md:text-2xl text-muted-foreground font-light text-center">
            Je vous écoute…
          </p>
        )}
      </div>

      {/* Mic with liquid glass animated rings (same as homepage) */}
      <div className="flex-1 flex items-start justify-center pt-12">
        <div className="relative">
          {/* Outer expanding glass ring */}
          <div
            className="absolute rounded-full animate-ping pointer-events-none backdrop-blur-2xl backdrop-saturate-150"
            style={{
              inset: "-28px",
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
              inset: "-18px",
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
            className="relative w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border border-white/30 transition-transform hover:scale-105"
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
            <Mic className="relative h-8 w-8" style={{ color: ACCENT }} />
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="pb-12">
        <p className="text-sm text-muted-foreground">
          Cliquez sur le micro ou attendez pour lancer la recherche
        </p>
      </div>
    </div>
  );
};

export default VoiceSearchOverlay;
