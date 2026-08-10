import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Sparkles, Loader2, Volume2, VolumeX, Loader, Heart, Send, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import { parseInline, extractCitedBusinesses, getImage, type BusinessData } from "@/components/AISearchAnswer";

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
  /** Called when user clicks the "Carte" button — opens the mobile map view */
  onOpenMap?: () => void;
  /** Pre-generated AI text (from Sticky 4 on /search) — when provided, the panel reuses it instead of regenerating */
  presetAnswer?: string | null;
  /** Businesses pool matching presetAnswer (for parseInline thumbnails) */
  presetBusinesses?: BusinessData[] | null;
  /** Called when user clicks a business thumbnail/link inside the AI text */
  onBusinessClick?: (business: BusinessData) => void;
}

const TRANSLATIONS = {
  fr: {
    whatToDoIn: "Que faire à",
    similarTo: "Établissements similaires à",
    bestPlaces: "Meilleures adresses",
    noSuggestion: "Aucune suggestion disponible.",
    suggestionError: "Impossible de générer une suggestion pour le moment.",
    noAnswer: "Désolé, je n'ai pas de réponse.",
    retryError: "Erreur, réessayez.",
    savedToClub: "Sauvegardé dans Club OWM",
    addedToFavorites: "adresse(s) ajoutée(s) à vos favoris.",
    error: "Erreur",
    saveError: "Impossible de sauvegarder pour le moment.",
    aiSuggestion: "Suggestion IA",
    map: "Carte",
    saveToClub: "Sauvegarder dans Club OWM",
    generating: "Génération en cours…",
    assistantThinking: "L'assistant réfléchit…",
    refinePlaceholder: "Affinez votre demande",
    send: "Envoyer",
  },
  en: {
    whatToDoIn: "What to do in",
    similarTo: "Similar to",
    bestPlaces: "Best places",
    noSuggestion: "No suggestion available.",
    suggestionError: "Unable to generate a suggestion at this time.",
    noAnswer: "Sorry, no answer.",
    retryError: "Error, please retry.",
    savedToClub: "Saved to Club OWM",
    addedToFavorites: "place(s) added to your favorites.",
    error: "Error",
    saveError: "Unable to save right now.",
    aiSuggestion: "AI Suggestion",
    map: "Map",
    saveToClub: "Save to Club OWM",
    generating: "Generating…",
    assistantThinking: "Assistant is thinking…",
    refinePlaceholder: "Refine your request",
    send: "Send",
  },
  ar: {
    whatToDoIn: "ماذا تفعل في",
    similarTo: "أماكن مشابهة لـ",
    bestPlaces: "أفضل العناوين",
    noSuggestion: "لا اقتراح متاح.",
    suggestionError: "تعذّر إنشاء اقتراح حالياً.",
    noAnswer: "آسف، لا توجد إجابة.",
    retryError: "خطأ، حاول مجدداً.",
    savedToClub: "تم الحفظ في نادي OWM",
    addedToFavorites: "عنوان (عناوين) أُضيفت.",
    error: "خطأ",
    saveError: "تعذّر الحفظ حالياً.",
    aiSuggestion: "اقتراح الذكاء",
    map: "خريطة",
    saveToClub: "حفظ في نادي OWM",
    generating: "جارٍ التحميل…",
    assistantThinking: "المساعد يفكر…",
    refinePlaceholder: "حسّن طلبك",
    send: "إرسال",
  },
} as const;

const PanelAiOverlay = ({ open, onClose, city, category, businessName, onAskAssistant, onSeeResults, onOpenMap, presetAnswer, presetBusinesses, onBusinessClick }: PanelAiOverlayProps) => {
  const { language } = useLanguage();
  const T = TRANSLATIONS[language] || TRANSLATIONS.fr;
  const [answer, setAnswer] = useState("");
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedQuery, setCachedQuery] = useState<string>("");
  const [cachedCount, setCachedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) { setAnswer(""); setBusinesses([]); setCachedQuery(""); setCachedCount(null); return; }

    // When the parent EXPLICITLY drives the AI text via presetAnswer (search page),
    // we must NEVER fall back to sessionStorage (which may still hold the previous
    // search's text after the user refined city/subcategory and regeneration is in
    // flight). Detect "controlled mode" by the prop being defined (incl. empty string).
    const controlled = presetAnswer !== undefined && presetAnswer !== null;

    if (controlled) {
      // Show whatever the parent currently has (may be "" during regeneration → loading state).
      setAnswer(presetAnswer || "");
      // Use EXACTLY the same business pool as the Case 4 popup on /search
      // (allBusinesses passed via presetBusinesses). Do NOT merge sessionStorage cache:
      // a stale cache from a previous query can shadow the current page's items
      // and break thumbnail resolution in parseInline.
      setBusinesses(presetBusinesses && presetBusinesses.length > 0 ? presetBusinesses : []);
      try {
        const cachedQ = sessionStorage.getItem("ai_suggestion_query");
        const cachedC = sessionStorage.getItem("ai_suggestion_count");
        if (cachedQ) setCachedQuery(cachedQ);
        if (cachedC) setCachedCount(Number(cachedC));
      } catch {}
      // Show loader while parent's text is empty — do NOT regenerate or read stale cache.
      setLoading(!presetAnswer);
      return;
    }

    // UNCONTROLLED mode (e.g. business detail overlay): reuse sessionStorage if any.
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
          ? `${T.whatToDoIn} ${city}${category ? ` (${category})` : ""}`
          : businessName
          ? `${T.similarTo} ${businessName}`
          : T.bestPlaces;

        const { data, error } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query: prompt,
            businesses: fetchedBusinesses || [],
            language,
          },
        });

        if (error) throw error;
        setAnswer(data?.answer || T.noSuggestion);
      } catch (err) {
        console.error("AI suggestion error:", err);
        setAnswer(T.suggestionError);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [open, city, category, businessName, language, presetAnswer, presetBusinesses]);

  const renderedContent = useMemo(() => {
    if (!answer) return null;
    return parseInline(
      answer,
      businesses,
      (b) => {
        if (onBusinessClick) {
          onBusinessClick(b);
          onClose();
        } else {
          onClose();
        }
      },
      "panel-ai"
    );
  }, [answer, businesses, onClose, onBusinessClick]);

  const [closing, setClosing] = useState(false);
  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Conversational chat state
  const [chatTurns, setChatTurns] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Persist last proximity context across turns so refinements like
  // "à moins de 500 mètres" reuse the previously resolved target coordinates.
  const lastProximityRef = useRef<{ lat: number; lng: number; radiusKm: number; targetName: string; query: string } | null>(null);

  useEffect(() => {
    if (!open) { setChatTurns([]); setChatInput(""); setChatLoading(false); lastProximityRef.current = null; }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatTurns, chatLoading]);

  const handleClose = useCallback(() => {
    ttsStop();
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose, ttsStop]);

  const sendChat = useCallback(async (opts?: { text?: string; curatedRoute?: string | null; fixedResponse?: string | null }) => {
    const text = (opts?.text ?? chatInput).trim();
    if (!text || chatLoading) return;
    ttsStop();
    if (!opts?.text) setChatInput("");
    // Réponse fixe éditorialisée (classe A, zéro token) → rendu direct.
    if (opts?.fixedResponse) {
      setChatTurns((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: opts.fixedResponse as string },
      ]);
      return;
    }
    // Seed history with the initial AI suggestion so the model keeps context
    const history = answer
      ? [{ role: "assistant" as const, content: answer }, ...chatTurns]
      : [...chatTurns];
    setChatTurns((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      // For the server-side search, use ONLY the current turn's text so a new
      // intent (e.g. switching from "hébergement" to "artisans") isn't polluted
      // by previous turns. Conversational history is still sent to the AI below.
      const currentQuery = text;

      // Distance refinement: "à moins de 500m / 500 mètres / 1 km / 1.5km".
      // If detected, override the radius and reuse the last proximity target.
      const distanceRe = /(?:à\s+)?moins\s+de\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;
      const altDistanceRe = /\b(?:dans\s+un\s+rayon\s+de|rayon\s+de|within)\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;
      const distMatch = currentQuery.match(distanceRe) || currentQuery.match(altDistanceRe);
      let overrideRadiusKm: number | undefined;
      let strippedQuery = currentQuery;
      if (distMatch) {
        const value = parseFloat(distMatch[1].replace(",", "."));
        const unit = distMatch[2].toLowerCase();
        overrideRadiusKm = /^k/i.test(unit) ? value : value / 1000;
        strippedQuery = currentQuery.replace(distMatch[0], "").trim();
      }

      // Proximity intent: "rooftop à côté de riad dar najat" → resolve target
      // business, search within a radius around its coordinates.
      const proximityRe = /\s*(?:à\s+côté\s+de|a\s+cote\s+de|à\s+coté\s+de|près\s+de|pres\s+de|proche\s+de|autour\s+de|aux\s+alentours\s+de|à\s+proximité\s+de|a\s+proximite\s+de|near|around|close\s+to|next\s+to)\s+(.+?)\s*$/i;
      const proxMatch = strippedQuery.match(proximityRe);
      let proxLat: number | undefined;
      let proxLng: number | undefined;
      let proxRadiusKm: number | undefined;
      if (proxMatch) {
        const targetName = proxMatch[1].trim().replace(/[?.!,;:]+$/, "");
        strippedQuery = strippedQuery.replace(proximityRe, "").trim() || lastProximityRef.current?.query || strippedQuery;
        const targetVariants = [...new Set([
          targetName,
          targetName.replace(/^(riad|hôtel|hotel|appartement|villa|maison\s+d['’ ]?hôtes?)\s+/i, "").trim(),
        ].filter(Boolean))];
        try {
          let targets: any[] = [];
          for (const variant of targetVariants) {
            const { data } = await supabase
              .from("businesses")
              .select("id, name, latitude, longitude, city")
              .ilike("name", `%${variant}%`)
              .not("latitude", "is", null)
              .not("longitude", "is", null)
              .limit(5);
            if (data?.length) { targets = data as any[]; break; }
          }
          const target = (targets || []).find((t: any) => !city || (t.city && t.city.toLowerCase() === city.toLowerCase())) || (targets || [])[0];
          if (target?.latitude && target?.longitude) {
            proxLat = Number(target.latitude);
            proxLng = Number(target.longitude);
            proxRadiusKm = overrideRadiusKm ?? 2;
            lastProximityRef.current = { lat: proxLat, lng: proxLng, radiusKm: proxRadiusKm, targetName: target.name, query: strippedQuery };
            
          } else {
            console.warn(`[AI chat] Proximity target not found for: "${targetName}"`);
          }
        } catch (e) {
          console.warn("[AI chat] Proximity lookup failed:", e);
        }
      } else if (lastProximityRef.current) {
        // No new "near X" mentioned — reuse last proximity context (target + previous query).
        // Pure distance refinement ("moins de 500 m de Riad X") → reuse previous query intent (e.g. "artisans").
        proxLat = lastProximityRef.current.lat;
        proxLng = lastProximityRef.current.lng;
        proxRadiusKm = overrideRadiusKm ?? lastProximityRef.current.radiusKm;
        strippedQuery = distMatch
          ? lastProximityRef.current.query
          : (strippedQuery || lastProximityRef.current.query);
        lastProximityRef.current = { ...lastProximityRef.current, radiusKm: proxRadiusKm, query: strippedQuery };
        
      }

      // Strip conversational filler ("quels sont les", "?", articles…) so the
      // search engine sees actual keywords ("artisans") instead of a sentence.
      strippedQuery = strippedQuery
        .replace(/\?+\s*$/g, "")
        .replace(/^\s*(quels?|quelles?|qui|que|quoi|où|ou|comment|combien|liste(?:-moi|moi)?|donne(?:-moi|moi)?|montre(?:-moi|moi)?|trouve(?:-moi|moi)?|cherche(?:-moi|moi)?|peux-tu|peut-on|y\s+a-t-il)\b[\s,]*/i, "")
        .replace(/\b(sont|est|sont-ils|sont-elles|il\s+y\s+a|stp|svp)\b/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim() || currentQuery;

      let refinedBusinesses = businesses;
      try {
        const { data: searchData } = await supabase.functions.invoke("business-search", {
          body: {
            query: strippedQuery,
            city: city ?? undefined,
            page: 1,
            pageSize: 100,
            ...(proxLat !== undefined && proxLng !== undefined
              ? { latitude: proxLat, longitude: proxLng, radiusKm: proxRadiusKm }
              : {}),
          },
        });
        const arr = (searchData as any)?.businesses;
        if (Array.isArray(arr) && arr.length > 0) {
          refinedBusinesses = arr as BusinessData[];
          setBusinesses((prev) => {
            const byId = new Map<string, BusinessData>();
            for (const b of prev) byId.set(b.id, b);
            for (const b of refinedBusinesses) byId.set(b.id, b);
            return Array.from(byId.values());
          });
        }
      } catch (e) {
        console.warn("Refinement search failed, falling back to cached pool:", e);
      }

      const { data, error } = await supabase.functions.invoke("ai-search-answer", {
        body: {
          query: text,
          businesses: refinedBusinesses,
          language,
          history,
          curatedRoute: opts?.curatedRoute ?? null,
          focus: {
            last_business_ids: businesses.slice(0, 3).map((b) => b.id),
            last_business_names: businesses.slice(0, 3).map((b) => b.name),
            last_category: category ?? null,
            active_city: city ?? null,
          },
        },
      });

      if (error) throw error;
      const reply = (data?.answer || "").trim() || T.noAnswer;
      setChatTurns((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatTurns((prev) => [...prev, { role: "assistant", content: T.retryError }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatTurns, answer, businesses, language, city, category, ttsStop]);

  // --- Suggestions Search IA (back-office : ai_suggestions) ---
  type SearchSuggestion = {
    id: string;
    label: string;
    prompt: string | null;
    fixed: string | null;
    mode: string | null;
    category: string | null;
  };
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  const MODE_TO_ROUTE: Record<string, string> = {
    nearby: "nearby",
    booking: "booking",
    opening: "opening",
    reviews: "reviews",
    events: "events",
    weather: "weather",
    pricing: "pricing",
    map: "map",
    compare: "compare",
    itinerary: "itinerary",
    business: "business_qa",
    discover: "discover",
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ai_suggestions")
        .select("id, label_fr, label_en, label_ar, prompt_fr, prompt_en, prompt_ar, fixed_response_fr, fixed_response_en, fixed_response_ar, mode, category, city, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) { console.warn("[PanelAiOverlay] suggestions load failed", error.message); return; }
      const pick = (fr: string | null, en: string | null, ar: string | null) =>
        (language === "en" ? en : language === "ar" ? ar : fr) || fr || en || ar || null;
      const rows = (data || [])
        .filter((r: any) => !r.city || !city || String(r.city).toLowerCase() === String(city).toLowerCase())
        .map((r: any) => ({
          id: r.id,
          label: pick(r.label_fr, r.label_en, r.label_ar) || "",
          prompt: pick(r.prompt_fr, r.prompt_en, r.prompt_ar),
          fixed: pick(r.fixed_response_fr, r.fixed_response_en, r.fixed_response_ar),
          mode: r.mode ?? null,
          category: r.category ?? null,
        }))
        .filter((r: SearchSuggestion) => r.label);
      setSuggestions(rows.slice(0, 8));
    })();
    return () => { cancelled = true; };
  }, [open, language, city]);


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
        title: T.savedToClub,
        description: `${businesses.length} ${T.addedToFavorites}`,
      });
    } catch (err) {
      console.error("Save to Club failed:", err);
      toast({
        title: T.error,
        description: T.saveError,
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
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="font-semibold text-sm">
            {T.aiSuggestion}
          </span>
        </div>
        {/* Carte button — mobile/tablet only, same as Results tab */}
        {onOpenMap && (
          <button
            type="button"
            onClick={() => { onOpenMap(); handleClose(); }}
            className="lg:hidden ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#3B3B3B] text-white text-xs font-medium shadow-lg hover:bg-[#3B3B3B]/90 transition-colors"
          >
            <MapIcon className="h-4 w-4" />
            {T.map}
          </button>
        )}
        {/* Save to Club OWM */}
        {businesses.length > 0 && (
          <button
            type="button"
            onClick={handleSaveToClub}
            disabled={saving}
            className={`${onOpenMap ? "" : "ml-auto"} w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50`}
            title={T.saveToClub}
            aria-label={T.saveToClub}
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
          </div>
        </div>
      )}

      {/* Content — same styling as fullscreen overlay */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
            <span className="text-sm text-muted-foreground">
              {T.generating}
            </span>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
              {renderedContent}
            </div>
            <CitedThumbnails
              answer={answer}
              businesses={businesses}
              onClick={(b) => { if (onBusinessClick) { onBusinessClick(b); } onClose(); }}
            />

            {chatTurns.map((turn, i) => (
              <div key={i} className={turn.role === "user" ? "flex justify-end" : ""}>
                {turn.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm">
                    {turn.content}
                  </div>
                ) : (
                  <>
                    <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                      {parseInline(turn.content, businesses, (b) => { if (onBusinessClick) { onBusinessClick(b); } onClose(); }, `panel-ai-chat-${i}`)}
                    </div>
                    <CitedThumbnails
                      answer={turn.content}
                      businesses={businesses}
                      onClick={(b) => { if (onBusinessClick) { onBusinessClick(b); } onClose(); }}
                    />
                  </>
                )}
              </div>
            ))}


            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                {T.assistantThinking}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky chat composer */}
      {!loading && (
        <div className="shrink-0 border-t border-border bg-background px-4 sm:px-6 py-3">
          {suggestions.length > 0 && chatTurns.length === 0 && (
            <div className="max-w-3xl mx-auto mb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={chatLoading}
                  onClick={() =>
                    sendChat({
                      text: s.prompt || s.label,
                      curatedRoute: s.mode ? (MODE_TO_ROUTE[s.mode] ?? null) : null,
                      fixedResponse: s.fixed || null,
                    })
                  }
                  className="shrink-0 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 hover:border-gold hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="max-w-3xl mx-auto flex items-end gap-2"
          >
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
              }}
              rows={1}
              placeholder={
                T.refinePlaceholder
              }
              className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 max-h-32"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="w-10 h-10 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
              aria-label={T.send}
            >
              {chatLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PanelAiOverlay;

/**
 * Horizontal-scroll strip of square thumbnails for businesses cited
 * (bold-wrapped) inside the AI answer. Mirrors the image style used by
 * SearchResultCard in the Results tab.
 */
const CitedThumbnails = ({
  answer,
  businesses,
  onClick,
}: {
  answer: string;
  businesses: BusinessData[];
  onClick: (b: BusinessData) => void;
}) => {
  const cited = useMemo(
    () => extractCitedBusinesses(answer, businesses),
    [answer, businesses]
  );
  if (!cited.length) return null;
  return (
    <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-none">
      <div className="flex gap-3 pb-1">
        {cited.map((b) => {
          const img = getImage(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onClick(b)}
              className="group shrink-0 w-32 sm:w-40 text-left"
              title={b.name}
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {img ? (
                  <img
                    src={img}
                    alt={b.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs font-medium text-foreground line-clamp-2">
                {b.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

