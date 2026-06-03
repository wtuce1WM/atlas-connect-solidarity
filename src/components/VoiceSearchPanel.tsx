import { Mic } from "lucide-react";

interface Props {
  liveTranscript: string;
  onClose: () => void;
  onFinish?: () => void;
}

const ACCENT = "#6050dc";

const VoiceSearchPanel = ({ liveTranscript, onClose, onFinish }: Props) => {
  return (
    <div className="w-full flex flex-col items-center gap-6 py-6">
      {/* Transcript / hint */}
      {liveTranscript ? (
        <p className="text-xl md:text-2xl text-foreground font-light text-center leading-relaxed max-w-2xl px-4">
          {liveTranscript}
        </p>
      ) : (
        <p className="text-lg md:text-xl text-muted-foreground font-light text-center">
          Je vous écoute…
        </p>
      )}

      {/* Mic with animated ring */}
      <div className="relative">
        <div
          className="absolute rounded-full animate-ping pointer-events-none"
          style={{ inset: "-24px", border: `1.5px solid ${ACCENT}15`, animationDuration: "2.4s" }}
        />
        <div
          className="absolute rounded-full animate-pulse pointer-events-none"
          style={{ inset: "-16px", border: `1px solid ${ACCENT}10` }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "-6px",
            background: `conic-gradient(from 0deg, transparent 0%, ${ACCENT} 35%, ${ACCENT}80 50%, transparent 70%)`,
            animation: "spin 2s linear infinite",
          }}
        />
        <div className="absolute rounded-full bg-background pointer-events-none" style={{ inset: "-2px" }} />
        <button
          type="button"
          onClick={liveTranscript && onFinish ? onFinish : onClose}
          className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: "hsl(var(--background))", boxShadow: `0 0 30px ${ACCENT}20` }}
        >
          <Mic className="h-7 w-7 md:h-8 md:w-8" style={{ color: ACCENT }} />
        </button>
      </div>

      <p className="text-sm text-muted-foreground text-center px-4">
        Cliquez sur le micro ou attendez pour lancer la recherche
      </p>
    </div>
  );
};

export default VoiceSearchPanel;
