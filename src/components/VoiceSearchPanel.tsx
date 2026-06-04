import { Mic } from "lucide-react";

interface Props {
  liveTranscript: string;
  onClose: () => void;
  onFinish?: () => void;
}

const ACCENT = "#6050dc";

const VoiceSearchPanel = ({ liveTranscript, onClose, onFinish }: Props) => {
  return (
    <div className="w-full flex flex-col items-start gap-6 py-6">
      {/* Transcript / hint */}
      {liveTranscript ? (
        <p className="text-xl md:text-2xl text-foreground font-light text-left leading-relaxed max-w-2xl px-4">
          {liveTranscript}
        </p>
      ) : (
        <p className="text-lg md:text-xl text-muted-foreground font-light text-left">
          Je vous écoute…
        </p>
      )}

      {/* Mic with liquid glass animated rings */}
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
          onClick={liveTranscript && onFinish ? onFinish : onClose}
          className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border border-white/30 transition-transform hover:scale-105"
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
          <Mic className="relative h-7 w-7 md:h-8 md:w-8" style={{ color: ACCENT }} />
        </button>
      </div>


      <p className="text-sm text-muted-foreground text-center px-4">
        Cliquez sur le micro ou attendez pour lancer la recherche
      </p>
    </div>
  );
};

export default VoiceSearchPanel;
