import { MapPin, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Question en attente : affichée pour rappeler ce qui sera lancé après le choix. */
  question?: string | null;
  /** Géolocalisation acceptée : on attend la position du navigateur. */
  waiting?: boolean;
  onAccept: () => void;
  onLater: () => void;
  theme?: "light" | "dark";
}

/**
 * Version inline (dans la réponse IA) de la proposition de géolocalisation.
 * Remplace le pop-up modal : aucune recherche n'est lancée avant le choix.
 */
const GeoInlinePrompt = ({ question, waiting, onAccept, onLater, theme = "dark" }: Props) => {
  const { language } = useLanguage();

  const t = {
    fr: {
      title: "Où êtes-vous ?",
      desc: "Votre question porte sur ce qui est près de vous, mais je ne connais pas votre position. Activez la géolocalisation pour des résultats vraiment proches.",
      accept: "Activer la géolocalisation",
      waiting: "Localisation en cours…",
      later: "Chercher sans ma position",
    },
    en: {
      title: "Where are you?",
      desc: "Your question is about what's near you, but I don't know your location. Enable geolocation for truly nearby results.",
      accept: "Enable geolocation",
      waiting: "Locating…",
      later: "Search without my location",
    },
    ar: {
      title: "أين أنت؟",
      desc: "سؤالك يتعلق بما هو قريب منك، لكنني لا أعرف موقعك. فعّل تحديد الموقع للحصول على نتائج قريبة فعلاً.",
      accept: "تفعيل تحديد الموقع",
      waiting: "جارٍ تحديد الموقع…",
      later: "البحث بدون موقعي",
    },
  }[language === "en" || language === "ar" ? language : "fr"];

  const light = theme === "light";

  return (
    <div className="w-full max-w-xl mx-auto space-y-2">
      {question && (
        <div className="flex justify-end">
          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${light ? "bg-neutral-100 text-neutral-900" : "bg-white/15 text-white"}`}>
            <div className="whitespace-pre-wrap">{question}</div>
          </div>
        </div>
      )}
      <div
        className={`rounded-2xl border p-4 shadow-lg backdrop-blur-md ${light ? "border-black/10 bg-white/90 text-neutral-900" : "border-white/15 bg-black/50 text-white"}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold" style={{ fontFamily: "'Montserrat', sans-serif" }}>{t.title}</p>
            <p className={`text-sm leading-relaxed mt-1 ${light ? "text-neutral-600" : "text-white/80"}`}>{t.desc}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            onClick={onAccept}
            disabled={waiting}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
            {waiting ? t.waiting : t.accept}
          </button>
          <button
            type="button"
            onClick={onLater}
            className={`w-full h-9 text-sm transition-colors ${light ? "text-neutral-500 hover:text-neutral-900" : "text-white/70 hover:text-white"}`}
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeoInlinePrompt;
