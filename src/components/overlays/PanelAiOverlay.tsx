import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Sparkles, Loader2, Volume2, VolumeX, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { parseInline, type BusinessData } from "@/components/AISearchAnswer";

interface PanelAiOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Current business city for context */
  city?: string | null;
  /** Current business category for context */
  category?: string | null;
  /** Current business name for context */
  businessName?: string | null;
  /** Called when user clicks the "Ask AI assistant" CTA (opens fulltext + voice search) */
  onAskAssistant?: () => void;
}

const PanelAiOverlay = ({ open, onClose, city, category, businessName, onAskAssistant }: PanelAiOverlayProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setAnswer(""); setBusinesses([]); return; }

    // Try to reuse previously generated AI text from search results
    try {
      const cached = sessionStorage.getItem("ai_suggestion_text");
      const cachedBiz = sessionStorage.getItem("ai_suggestion_businesses");
      if (cached) {
        setAnswer(cached);
        if (cachedBiz) setBusinesses(JSON.parse(cachedBiz));
        return;
      }
    } catch {}

    const generate = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("businesses")
          .select("id, name, city, main_category, categories, hook_fr, rating, images, logo_url, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, neighborhood, wtuce_status")
          .eq("is_active", true)
          .limit(10);

        if (city) query = query.eq("city", city);
        const { data: fetchedBusinesses } = await query;

        if (fetchedBusinesses) setBusinesses(fetchedBusinesses as unknown as BusinessData[]);

        const prompt = city
          ? `${language === "fr" ? "Que faire à" : language === "ar" ? "ماذا تفعل في" : "What to do in"} ${city}${category ? ` (${category})` : ""}`
          : businessName
          ? `${language === "fr" ? "Établissements similaires à" : "Similar to"} ${businessName}`
          : language === "fr" ? "Meilleures adresses" : "Best places";

        const { data, error } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query: prompt,
            businesses: fetchedBusinesses || [],
            language,
          },
        });

        if (error) throw error;
        setAnswer(data?.answer || (language === "fr" ? "Aucune suggestion disponible." : "No suggestion available."));
      } catch (err) {
        console.error("AI suggestion error:", err);
        setAnswer(language === "fr" ? "Impossible de générer une suggestion pour le moment." : "Unable to generate a suggestion at this time.");
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [open, city, category, businessName, language]);

  const renderedContent = useMemo(() => {
    if (!answer) return null;
    return parseInline(
      answer,
      businesses,
      () => {
        // Business click in panel context — just close overlay
        onClose();
      },
      "panel-ai"
    );
  }, [answer, businesses, onClose]);

  const [closing, setClosing] = useState(false);
  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech();
  const handleClose = useCallback(() => {
    ttsStop();
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose, ttsStop]);

  if (!open && !closing) return null;

  return (
    <div className={`absolute inset-0 z-[80] bg-background flex flex-col ${closing ? "animate-out slide-out-to-bottom duration-200" : "animate-in slide-in-from-bottom duration-200"}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="font-semibold text-sm">
            {language === "fr" ? "Suggestion IA" : language === "ar" ? "اقتراح الذكاء" : "AI Suggestion"}
          </span>
        </div>
        {/* TTS speaker */}
        {answer && !loading && (
          <button
            type="button"
            onClick={() => {
              if (ttsStatus === "playing" || ttsStatus === "loading") {
                ttsStop();
              } else {
                const cleanText = answer.replace(/\*{1,2}/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "");
                ttsSpeak(cleanText);
              }
            }}
            className="ml-auto w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
            title={language === "fr" ? "Écouter" : language === "ar" ? "استمع" : "Listen"}
          >
            {ttsStatus === "loading" ? <Loader className="h-4 w-4 animate-spin" /> : ttsStatus === "playing" ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Content — same styling as fullscreen overlay */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
            <span className="text-sm text-muted-foreground">
              {language === "fr" ? "Génération en cours…" : language === "ar" ? "جارٍ التحميل…" : "Generating…"}
            </span>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
              {renderedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelAiOverlay;
