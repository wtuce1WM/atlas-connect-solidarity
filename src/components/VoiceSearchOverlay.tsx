import { Mic, X } from "lucide-react";

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  liveTranscript: string;
  onClose: () => void;
}

const VoiceSearchOverlay = ({ isOpen, liveTranscript, onClose }: VoiceSearchOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
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

      {/* Mic button with pulsing rings */}
      <div className="flex-1 flex items-start justify-center pt-12">
        <div className="relative">
          {/* Pulsing rings */}
          <div className="absolute inset-0 -m-4 rounded-full bg-destructive/10 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-0 -m-2 rounded-full bg-destructive/5 animate-pulse" />
          
          {/* Main button */}
          <button
            onClick={onClose}
            className="relative w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/30 transition-transform hover:scale-105"
          >
            <Mic className="h-8 w-8 text-white" />
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
