import { useState, useEffect, useRef, useMemo } from "react";
import { Sparkles, Loader2, MapPin, Star, X, Maximize2, Minimize2, AArrowUp, AArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import BusinessSlidePanel from "@/components/BusinessSlidePanel";

interface BusinessData {
  id: string;
  name: string;
  city: string;
  main_category: string | null;
  categories: string[] | null;
  hook_fr: string | null;
  rating: number | null;
  wtuce_status: string | null;
  images?: string[] | null;
  logo_url?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_rating?: number | null;
  restaurant_guru_review_count?: number | null;
  getyourguide_rating?: number | null;
  getyourguide_review_count?: number | null;
  viator_rating?: number | null;
  viator_review_count?: number | null;
}

interface AISearchAnswerProps {
  query: string;
  spokenText?: string;
  businesses: BusinessData[];
  isSearchLoading: boolean;
  onAnswerReady?: (answer: string) => void;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''`]/g, "'").trim();

const findBusiness = (name: string, businesses: BusinessData[]): BusinessData | null => {
  const n = normalize(name);
  // Try exact match first
  const exact = businesses.find(b => normalize(b.name) === n);
  if (exact) return exact;
  // Check if the bold text includes a city hint (e.g. "Name à City" or "Name - City")
  const cityPattern = /(.+?)(?:\s+[àa]\s+|\s*[-–—]\s*)(.+)$/i;
  const cityMatch = n.match(cityPattern);
  if (cityMatch) {
    const namePart = cityMatch[1].trim();
    const cityPart = cityMatch[2].trim();
    const withCity = businesses.find(b => normalize(b.name) === namePart && normalize(b.city) === cityPart);
    if (withCity) return withCity;
    // Partial city match
    const withCityPartial = businesses.find(b =>
      (normalize(b.name) === namePart || normalize(b.name).includes(namePart)) &&
      normalize(b.city).includes(cityPart)
    );
    if (withCityPartial) return withCityPartial;
  }
  // Fallback: partial name match
  return businesses.find(b => n.includes(normalize(b.name)) || normalize(b.name).includes(n))
    || null;
};

const getImage = (b: BusinessData): string | null => {
  if (b.images && b.images.length > 0) return b.images[0];
  if (b.logo_url) return b.logo_url;
  return null;
};

const BusinessHoverCard = ({ name, business, onClickBusiness }: { name: string; business: BusinessData; onClickBusiness: (b: BusinessData) => void }) => {
  const img = getImage(business);
  const sources = collectRatingSources(business as any);
  const avgOn20 = business.rating ?? computeWeightedRatingOn20(sources);
  const totalReviews = sources.reduce((s, r) => s + r.count, 0);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onClickBusiness(business)}
          className="text-base font-semibold text-foreground underline decoration-gold/40 underline-offset-2 hover:decoration-gold transition-colors cursor-pointer"
        >
          {name}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" avoidCollisions sideOffset={8} className="z-[100] w-72 p-0 overflow-hidden rounded-xl border border-gold/20 shadow-xl">
        {img && (
          <div className="h-32 w-full overflow-hidden">
            <img src={img} alt={business.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3 space-y-1.5">
          <p className="font-semibold text-sm text-foreground leading-tight">{business.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{business.city}{business.neighborhood ? ` · ${business.neighborhood}` : ""}</span>
          </div>
          {avgOn20 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 text-gold fill-gold" />
              <span className="font-medium text-foreground">{avgOn20}/20</span>
              {totalReviews > 0 && (
                <span className="text-muted-foreground">· {totalReviews.toLocaleString("fr-FR")} avis</span>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// Split a flat AI text into visual paragraphs by breaking before each bold business name
const splitIntoParagraphs = (text: string): string[] => {
  // Normalize bold markers that span across newlines
  const normalized = text.replace(/\*\*([^*]*?)\*\*/gs, (_, inner) =>
    `**${inner.replace(/\n/g, " ")}**`
  );

  // If text already has newlines, use those
  if (/\n/.test(normalized)) {
    return normalized.split(/\n+/).filter(s => s.trim());
  }

  // Split on sentence boundaries
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-öø-ÿ])/);
  
  if (sentences.length <= 1) return [normalized];

  // Always break after the first sentence
  const segments: string[] = [sentences[0].trim()];
  
  let currentPara = "";
  for (let i = 1; i < sentences.length; i++) {
    const sentence = sentences[i];
    const isLast = i === sentences.length - 1;
    // Break before the last sentence OR before each sentence that contains a bold marker
    if (isLast && currentPara.length > 0) {
      segments.push(currentPara.trim());
      currentPara = sentence;
    } else if (/\*\*/.test(sentence) && currentPara.length > 0 && /\*\*/.test(currentPara)) {
      segments.push(currentPara.trim());
      currentPara = sentence;
    } else {
      currentPara += (currentPara ? " " : "") + sentence;
    }
  }
  if (currentPara.trim()) segments.push(currentPara.trim());

  return segments;
};

// Format AI answer with paragraph spacing
const formatAnswer = (text: string, businesses: BusinessData[], onClickBusiness: (b: BusinessData) => void) => {
  const paragraphs = splitIntoParagraphs(text);

  const parseLine = (line: string, lineIdx: number) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, j) => {
      if (j % 2 === 1) {
        const match = findBusiness(part, businesses);
        if (match) {
          return <BusinessHoverCard key={`${lineIdx}-${j}`} name={part} business={match} onClickBusiness={onClickBusiness} />;
        }
        return <strong key={`${lineIdx}-${j}`} className="font-semibold text-foreground">{part}</strong>;
      }
      return <span key={`${lineIdx}-${j}`}>{part}</span>;
    });
  };

  return paragraphs.map((para, i) => (
    <p key={i} className="mb-3 last:mb-0 leading-[1.8]">
      {parseLine(para, i)}
    </p>
  ));
};

const AISearchAnswer = ({ query, spokenText, businesses, isSearchLoading, onAnswerReady }: AISearchAnswerProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [fontSize, setFontSize] = useState(0); // -1 = small, 0 = normal, 1 = large
  const fetchIdRef = useRef(0);
  const lastFetchKeyRef = useRef("");

  const fetchKey = useMemo(() => {
    if (!query || !businesses.length) return "";
    const names = businesses.slice(0, 10).map(b => b.name).join("|");
    return `${query}::${names}`;
  }, [query, businesses]);

  useEffect(() => {
    setIsDismissed(false);
    setAnswer("");
    setError(null);
    setSelectedBusiness(null);
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
        // Prioritize businesses from the most relevant city
        const top10 = businesses.slice(0, 10);
        const cityCounts: Record<string, number> = {};
        top10.forEach(b => { if (b.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1; });
        const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        // Sort: businesses from the dominant city first, then others
        const sortedForAI = [...top10].sort((a, b) => {
          const aMatch = a.city === topCity ? 0 : 1;
          const bMatch = b.city === topCity ? 0 : 1;
          return aMatch - bMatch;
        });

        const { data, error: fnError } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query,
            spokenText: spokenText || undefined,
            businesses: sortedForAI.map(b => ({
              name: b.name,
              city: b.city,
              main_category: b.main_category,
              categories: b.categories,
              hook_fr: b.hook_fr,
              wtuce_status: b.wtuce_status,
            })),
            language,
          },
        });

        if (currentFetchId !== fetchIdRef.current) return;

        if (fnError) {
          console.error("AI answer error:", fnError);
          setError(fnError.message);
          return;
        }

        if (data?.answer) {
          setAnswer(data.answer);
          onAnswerReady?.(data.answer);
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

  const isPanelOpen = !!selectedBusiness;
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Disable background scroll when panel is open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isPanelOpen]);

  if (isDismissed || (!isLoading && !answer) || error) return null;

  return (
    <>
      {/* Backdrop when panel is open */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm" onClick={() => setSelectedBusiness(null)} />
      )}

      {/* AI Suggestion — slides to left half when panel opens, hidden when expanded */}
      <div
        className={`mb-6 transition-all duration-500 ease-out ${
          isPanelExpanded
            ? "fixed top-0 left-0 z-[100] w-0 h-full overflow-hidden opacity-0 pointer-events-none"
            : isPanelOpen
              ? "fixed top-[62px] left-0 z-[100] w-1/2 h-[calc(100%-62px)] overflow-y-auto p-6 flex items-start justify-center bg-background animate-slide-down-from-top"
              : "w-[70%] mx-auto"
        }`}
        style={isPanelOpen ? { animationName: undefined } : undefined}
      >
        <div className={`relative isolate rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-background backdrop-blur-sm ${isPanelOpen ? "w-full max-w-2xl" : ""}`}>
          {/* Header */}
          <div className="flex items-center px-4 py-2.5 border-b border-gold/15">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {language === "en" ? "AI Suggestion" : language === "ar" ? "اقتراح ذكي" : "Suggestion IA"}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setFontSize(prev => Math.max(prev - 1, -1))}
                disabled={fontSize <= -1}
                className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                title={language === "en" ? "Smaller text" : "Réduire le texte"}
              >
                <AArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setFontSize(prev => Math.min(prev + 1, 1))}
                disabled={fontSize >= 1}
                className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                title={language === "en" ? "Larger text" : "Agrandir le texte"}
              >
                <AArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {isPanelOpen && (
                <button onClick={() => setSelectedBusiness(null)} className="p-1 rounded-full hover:bg-muted transition-colors ml-1">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
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
              <div className={`leading-relaxed text-foreground transition-all duration-200 ${
                fontSize === -1 ? "text-xs" : fontSize === 1 ? "text-base" : "text-sm"
              }`}>
                {formatAnswer(answer, businesses, setSelectedBusiness)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-in panel — right half or full width */}
      {isPanelOpen && (
        <div className={`fixed top-[62px] right-0 z-[100] bg-background shadow-2xl border-l border-border overflow-hidden transition-all duration-500 ease-out animate-slide-in-right flex flex-col ${isPanelExpanded ? "w-[80%]" : "w-1/2"}`} style={{ height: "calc(100vh - 62px)" }}>
          {/* Fixed button bar above image */}
          <div className="shrink-0 flex items-center px-4 py-2 bg-background border-b border-border z-40">
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setSelectedBusiness(null); setIsPanelExpanded(false); }}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-black text-white border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity"
                title="Fermer"
                aria-label="Fermer le panneau"
              >
                <X className="h-4 w-4" />
              </button>
              {(isPanelExpanded || !(selectedBusiness?.images?.length === 1)) && (
                <button
                  onClick={() => setIsPanelExpanded(prev => !prev)}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-black text-white border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity"
                  title={isPanelExpanded ? "Réduire" : "Agrandir"}
                  aria-label={isPanelExpanded ? "Réduire le panneau" : "Agrandir le panneau"}
                >
                  {isPanelExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              )}
            </div>
            {/* Contact icons - centered */}
            <div id="slide-panel-toolbar-center" className="flex-1 flex items-center justify-center gap-4" />
            {/* Action icons - right */}
            <div id="slide-panel-toolbar" className="flex items-center gap-3 shrink-0" />
          </div>

          <div className="flex-1 min-h-0">
            <BusinessSlidePanel
              businessId={selectedBusiness!.id}
              onClose={() => { setSelectedBusiness(null); setIsPanelExpanded(false); }}
              isExpanded={isPanelExpanded}
              onToggleExpand={() => setIsPanelExpanded(prev => !prev)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AISearchAnswer;
