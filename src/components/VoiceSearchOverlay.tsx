import { Mic, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LABELS = {
  fr: {
    speakNow: "Parlez maintenant",
    waitSignal: "Attendez le signal sonore avant de parler",
    hintLine1: "Cliquez sur le micro",
    hintLine2: "ou attendez 2s pour lancer la recherche",
  },
  en: {
    speakNow: "Speak now",
    waitSignal: "Wait for the beep before speaking",
    hintLine1: "Tap the mic",
    hintLine2: "or wait 2s to launch the search",
  },
  ar: {
    speakNow: "تحدث الآن",
    waitSignal: "انتظر الإشارة الصوتية قبل التحدث",
    hintLine1: "اضغط على الميكروفون",
    hintLine2: "أو انتظر 2 ثانية لبدء البحث",
  },
} as const;



interface VoiceSearchOverlayProps {
  isOpen: boolean;
  liveTranscript: string;
  /** Niveau audio 0..1 du micro pour animer le ring autour du bouton. */
  audioLevel?: number;
  /** True quand le micro est réellement ouvert (Android: après le signal sonore). */
  micReady?: boolean;
  onClose: () => void;
  onFinish?: () => void;
  /** When true, use absolute positioning to stay contained within its parent element */
  contained?: boolean;
  /** Override the background color class (default: bg-[#BED1FF]) */
  bgClassName?: string;
}


const ACCENT = "#194CFF";

const VoiceSearchOverlay = ({ isOpen, liveTranscript, audioLevel = 0, micReady = true, onClose, onFinish, contained = false, bgClassName = "bg-[#BED1FF]" }: VoiceSearchOverlayProps) => {
  const { language } = useLanguage();
  const L = LABELS[language as "fr" | "en" | "ar"] || LABELS.fr;

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
    <div className={`${contained ? 'absolute rounded-xl overflow-hidden' : 'fixed'} inset-0 ${contained ? 'z-[20]' : 'z-[10000]'} flex flex-col items-center justify-between ${bgClassName} backdrop-blur-md animate-in fade-in duration-200`}>
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
          <p className="text-xl md:text-2xl text-black font-bold text-center leading-relaxed">
            {micReady ? L.speakNow : L.waitSignal}
          </p>
        )}
      </div>

      {/* Mic with liquid glass animated rings (perfectly centered in the viewport height) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
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

      {/* Hint (positioned in the bottom area) */}
      <div className="absolute bottom-[12%] left-0 right-0 px-6 text-center z-10">
        <p className="text-base md:text-lg text-black/80 font-medium leading-relaxed max-w-sm mx-auto">
          {L.hintLine1}<br />{L.hintLine2}
        </p>
      </div>
    </div>
  );
};

export default VoiceSearchOverlay;
