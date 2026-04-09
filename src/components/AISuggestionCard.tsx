import { Sparkles, Loader2 } from "lucide-react";

interface AISuggestionCardProps {
  stickyAiText: string;
  language: string;
  onOpen: () => void;
}

export default function AISuggestionCard({ stickyAiText, language, onOpen }: AISuggestionCardProps) {
  const isReady = !!stickyAiText;

  return (
    <div
      className={`overflow-hidden rounded-xl border-2 shadow-md relative aspect-square bg-gradient-to-br from-gold/5 via-background to-gold/10 flex flex-col transition-colors transition-shadow ${
        isReady ? "border-gold/60 cursor-pointer hover:shadow-lg hover:border-gold" : "border-gold/30"
      }`}
      onClick={isReady ? onOpen : undefined}
    >
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold text-gold-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Suggestion IA
        </span>
      </div>

      {isReady ? (
        <>
          <div className="flex-1 flex items-center p-4 pt-10 overflow-hidden">
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-[10]">{stickyAiText}</p>
          </div>
          <div className="p-3 pt-0">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5 text-gold" />
              <span>{language === "fr" ? "Généré par IA à partir de vos résultats" : language === "ar" ? "تم إنشاؤه بالذكاء الاصطناعي" : "AI-generated from your results"}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Loader2 className="h-6 w-6 animate-spin text-gold mb-2" />
          <span className="text-xs text-muted-foreground text-center">
            {language === "fr" ? "Suggestion IA en cours…" : language === "ar" ? "جارٍ التحميل…" : "Loading AI suggestion…"}
          </span>
        </div>
      )}
    </div>
  );
}
