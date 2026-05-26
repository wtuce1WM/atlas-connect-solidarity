import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Sparkles, Loader2, Volume2, VolumeX, Loader, Heart, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
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
  /** Called when user clicks the "See results" CTA — should return to the search list+map view */
  onSeeResults?: () => void;
}

const PanelAiOverlay = ({ open, onClose, city, category, businessName, onAskAssistant, onSeeResults }: PanelAiOverlayProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedQuery, setCachedQuery] = useState<string>("");
  const [cachedCount, setCachedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) { setAnswer(""); setBusinesses([]); setCachedQuery(""); setCachedCount(null); return; }

    // Try to reuse previously generated AI text from search results
    try {
      const cached = sessionStorage.getItem("ai_suggestion_text");
      const cachedBiz = sessionStorage.getItem("ai_suggestion_businesses");
      const cachedQ = sessionStorage.getItem("ai_suggestion_query");
      const cachedC = sessionStorage.getItem("ai_suggestion_count");
      if (cachedQ) setCachedQuery(cachedQ);
      if (cachedC) setCachedCount(Number(cachedC));
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
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const handleClose = useCallback(() => {
    ttsStop();
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose, ttsStop]);

  const handleSaveToClub = useCallback(async () => {
    if (!businesses.length) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.dispatchEvent(new Event("open-generic-club-popup"));
        return;
      }

      const rows = businesses.map((b) => ({ user_id: session.user.id, business_id: b.id }));
      const { error } = await supabase
        .from("bookmarks" as any)
        .upsert(rows as any, { onConflict: "user_id,business_id", ignoreDuplicates: true });
      if (error) throw error;
      toast({
        title: language === "fr" ? "Sauvegardé dans Club OWM" : language === "ar" ? "تم الحفظ في نادي OWM" : "Saved to Club OWM",
        description: `${businesses.length} ${language === "fr" ? "adresse(s) ajoutée(s) à vos favoris." : language === "ar" ? "عنوان (عناوين) أُضيفت." : "place(s) added to your favorites."}`,
      });
    } catch (err) {
      console.error("Save to Club failed:", err);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" ? "Impossible de sauvegarder pour le moment." : "Unable to save right now.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [businesses, language, toast]);

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
        {/* Save to Club OWM */}
        {businesses.length > 0 && (
          <button
            type="button"
            onClick={handleSaveToClub}
            disabled={saving}
            className="ml-auto w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
            title={language === "fr" ? "Sauvegarder dans Club OWM" : language === "ar" ? "حفظ في نادي OWM" : "Save to Club OWM"}
            aria-label={language === "fr" ? "Sauvegarder dans Club OWM" : "Save to Club OWM"}
          >
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
          </button>
        )}
      </div>


      {/* Actions block — directly below "Suggestion IA" header */}
      {((cachedQuery || cachedCount !== null) || onAskAssistant) && (
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
          <div className="max-w-3xl mx-auto text-center">
            {cachedCount !== null && (
              <p className="text-gold font-semibold mb-1">
                {cachedCount}{" "}
                {language === "en" ? "results for" : language === "ar" ? "نتيجة لـ" : "résultats à"}
              </p>
            )}
            {cachedQuery && (
              <p className="text-sm text-foreground/80 italic mb-3 line-clamp-3">« {cachedQuery} »</p>
            )}
            {(cachedQuery || cachedCount !== null) && (
              <button
                type="button"
                onClick={() => { ttsStop(); (onSeeResults ?? onClose)(); }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors uppercase"
              >
                {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
              </button>
            )}
            {answer && !loading && (
              <div className="mt-3 flex justify-center">
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
                  className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                  title={language === "fr" ? "Écouter" : language === "ar" ? "استمع" : "Listen"}
                >
                  {ttsStatus === "loading" ? <Loader className="h-4 w-4 animate-spin" /> : ttsStatus === "playing" ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            )}
            {onAskAssistant && (
              <button
                type="button"
                onClick={() => { ttsStop(); onAskAssistant(); }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {language === "fr"
                    ? "Demandez à l'assistant IA"
                    : language === "ar"
                    ? "اسأل المساعد الذكي"
                    : "Ask the AI assistant"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

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
