import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LABELS = {
  fr: {
    waitSignal: "Attendez le signal sonore avant de parler",
    speakNow: "Parlez maintenant",
    hintLine1: "Cliquez sur le micro",
    hintLine2: "ou attendez 2s pour lancer la recherche",
  },
  en: {
    waitSignal: "Wait for the beep before speaking",
    speakNow: "Speak now",
    hintLine1: "Tap the mic",
    hintLine2: "or wait 2s to launch the search",
  },
  ar: {
    waitSignal: "انتظر الإشارة الصوتية قبل التحدث",
    speakNow: "تحدث الآن",
    hintLine1: "اضغط على الميكروفون",
    hintLine2: "أو انتظر 2 ثانية لبدء البحث",
  },
} as const;

interface Props {
  liveTranscript: string;
  onClose: () => void;
  onFinish?: () => void;
  align?: "center" | "start";
  audioLevel?: number;
  micReady?: boolean;
  /** Override de la couleur du texte (ex: "text-white" sur fond sombre). */
  textClassName?: string;
}

const ACCENT = "#194CFF";

const VoiceSearchPanel = ({ liveTranscript, onClose, onFinish, align = "center", audioLevel = 0, micReady = true, textClassName }: Props) => {
  const textColor = textClassName ?? "${textColor}";
  const { language } = useLanguage();
  const L = LABELS[language as "fr" | "en" | "ar"] || LABELS.fr;
  const isStart = align === "start";
  const successFiredRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    startedAtRef.current = performance.now();
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("voice_search_used", { surface: align })
    ).catch(() => {});
    return () => {
      // Si l'utilisateur ferme sans transcript, on n'émet rien de plus.
    };
  }, [align]);

  useEffect(() => {
    if (!successFiredRef.current && liveTranscript && liveTranscript.trim().length >= 2) {
      successFiredRef.current = true;
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("voice_search_success", {
          chars: liveTranscript.length,
          latency_ms: Math.round(performance.now() - startedAtRef.current),
          surface: align,
        })
      ).catch(() => {});
    }
  }, [liveTranscript, align]);

  const hint = !micReady
    ? L.waitSignal
    : L.speakNow;
  return (
    <div className={`w-full flex flex-col gap-6 py-6 ${isStart ? "items-start" : "items-center"}`}>
      {/* Transcript / hint */}
      {liveTranscript ? (
        <p className={`text-xl md:text-2xl ${textColor} font-semibold leading-relaxed max-w-2xl px-4 ${isStart ? "text-left" : "text-center"}`}>
          {liveTranscript}
        </p>
      ) : (
        <p className={`text-lg md:text-xl ${textColor} font-semibold ${isStart ? "text-left" : "text-center"}`}>
          {hint}
        </p>
      )}


      {/* Mic with liquid glass animated rings */}
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


      <p className={`text-base md:text-lg ${textColor} font-bold px-4 ${isStart ? "text-left" : "text-center"}`}>
        {L.hintLine1}<br />{L.hintLine2}
      </p>
    </div>
  );
};

export default VoiceSearchPanel;
