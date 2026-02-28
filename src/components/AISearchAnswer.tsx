import { useState, useEffect, useRef, useMemo } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

// Format AI answer: add line breaks before emojis + bold business names
const formatAnswer = (text: string) => {
  const emojiRegex = /(\s)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{2702}-\u{27B0}])/gu;
  const withBreaks = text.replace(emojiRegex, '\n$2');
  const lines = withBreaks.split('\n').filter(l => l.trim());

  // Parse **bold** segments within a line
  const parseBold = (line: string, lineIdx: number) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, j) =>
      j % 2 === 1 ? (
        <strong key={`${lineIdx}-${j}`} className="text-base font-semibold text-foreground">{part}</strong>
      ) : (
        <span key={`${lineIdx}-${j}`}>{part}</span>
      )
    );
  };

  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {parseBold(line, i)}
    </span>
  ));
};

interface AISearchAnswerProps {
  query: string;
  businesses: Array<{
    name: string;
    city: string;
    main_category: string | null;
    categories: string[] | null;
    hook_fr: string | null;
    rating: number | null;
    wtuce_status: string | null;
  }>;
  isSearchLoading: boolean;
}

const AISearchAnswer = ({ query, businesses, isSearchLoading }: AISearchAnswerProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const lastFetchKeyRef = useRef("");

  // Stable fingerprint of query + first business names
  const fetchKey = useMemo(() => {
    if (!query) return "";
    const names = businesses.slice(0, 5).map(b => b.name).join("|");
    return `${query}::${names || "no-results"}`;
  }, [query, businesses]);

  // Reset dismiss when query changes
  useEffect(() => {
    setIsDismissed(false);
    setAnswer("");
    setError(null);
  }, [query]);

  useEffect(() => {
    if (!fetchKey || isSearchLoading || isDismissed) return;
    if (fetchKey === lastFetchKeyRef.current && answer) return;

    const currentFetchId = ++fetchIdRef.current;
    lastFetchKeyRef.current = fetchKey;
    setIsLoading(true);
    setAnswer("");
    setError(null);

    const fetchAnswer = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query,
            businesses: businesses.slice(0, 10).map(b => ({
              name: b.name,
              city: b.city,
              main_category: b.main_category,
              categories: b.categories,
              hook_fr: b.hook_fr,
              rating: b.rating,
              wtuce_status: b.wtuce_status,
            })),
            language,
          },
        });

        // Ignore stale responses
        if (currentFetchId !== fetchIdRef.current) return;

        if (fnError) {
          console.error("AI answer error:", fnError);
          setError(fnError.message);
          return;
        }

        if (data?.answer) {
          setAnswer(data.answer);
        }
      } catch (err) {
        if (currentFetchId !== fetchIdRef.current) return;
        console.error("AI answer fetch error:", err);
        setError("Erreur lors de la génération de la réponse");
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchAnswer();
  }, [fetchKey, isSearchLoading, isDismissed, language]);

  if (isDismissed || (!isLoading && !answer) || error) return null;

  return (
    <div className="max-w-3xl mx-auto mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="relative rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gold/15">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {language === "en" ? "AI Suggestion" : language === "ar" ? "اقتراح ذكي" : "Suggestion IA"}
            </span>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="flex items-center gap-3 text-gold/90">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              <span className="text-sm italic">
                {language === "en" ? "Thinking..." : language === "ar" ? "جاري التفكير..." : "Réflexion en cours..."}
              </span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {formatAnswer(answer)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISearchAnswer;
