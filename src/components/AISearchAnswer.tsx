import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { Sparkles, Loader2, MapPin, Star, X, Maximize2, Minimize2, AArrowUp, AArrowDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";

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
  highlightWordIndex?: number;
  externalRegenerateKey?: number;
}

interface BusinessHoverCardProps {
  name: string;
  business: BusinessData;
  onClickBusiness: (b: BusinessData) => void;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['`]/g, "'").trim();

const findBusiness = (name: string, businesses: BusinessData[]): BusinessData | null => {
  const n = normalize(name);
  const exact = businesses.find(b => normalize(b.name) === n);
  if (exact) return exact;
  const cityPattern = /(.+?)(?:\s+[àa]\s+|\s*[-–—]\s*)(.+)$/i;
  const cityMatch = n.match(cityPattern);
  if (cityMatch) {
    const namePart = cityMatch[1].trim();
    const cityPart = cityMatch[2].trim();
    const withCity = businesses.find(b => normalize(b.name) === namePart && normalize(b.city) === cityPart);
    if (withCity) return withCity;
    const withCityPartial = businesses.find(b =>
      (normalize(b.name) === namePart || normalize(b.name).includes(namePart)) &&
      normalize(b.city).includes(cityPart)
    );
    if (withCityPartial) return withCityPartial;
  }
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
          className="text-sm sm:text-base font-semibold text-foreground underline decoration-gold/40 underline-offset-2 hover:decoration-gold transition-colors cursor-pointer !normal-case !tracking-normal"
          style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}
        >
          {business.name}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="center" avoidCollisions sideOffset={8} className="z-[9995] w-72 p-0 overflow-hidden rounded-xl border border-gold/20 shadow-xl !bg-white dark:!bg-zinc-900">
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

interface HighlightState {
  wordIndex: number;
  target: number;
  /** "reveal" = fade-in words up to target; "karaoke" = gold highlight on current word */
  mode?: "reveal" | "karaoke";
}

/** Parse inline markdown with optional word-level highlighting */
const parseInline = (
  text: string,
  businesses: BusinessData[],
  onClickBusiness: (b: BusinessData) => void,
  keyPrefix: string,
  hl?: HighlightState
): ReactNode[] => {
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  const nodes: ReactNode[] = [];
  const isKaraoke = hl?.mode === "karaoke";

  boldParts.forEach((part, j) => {
    if (j % 2 === 1) {
      const wordCount = part.split(/\s+/).filter(Boolean).length;
      const startWordIdx = hl ? hl.wordIndex : 0;
      if (hl) hl.wordIndex += wordCount;
      const highlighted = hl ? startWordIdx <= hl.target : false;

      const match = findBusiness(part, businesses);
      if (match) {
        const card = <BusinessHoverCard key={`${keyPrefix}-${j}`} name={part} business={match} onClickBusiness={onClickBusiness} />;
          if (hl) {
            if (isKaraoke) {
              const isSpoken = startWordIdx <= hl.target;
              nodes.push(
                <span key={`${keyPrefix}-hl-${j}`} className={`inline transition-colors duration-150 rounded-sm ${isSpoken ? "bg-gold/25" : ""}`}>
                  {card}
                </span>
              );
            } else {
              nodes.push(
                <span key={`${keyPrefix}-hl-${j}`} className={`inline transition-all duration-300 rounded-sm ${highlighted ? "opacity-100 blur-0 translate-y-0" : "opacity-0 blur-[2px] translate-y-1 pointer-events-none"}`}>
                  {card}
                </span>
              );
            }
          } else {
            nodes.push(card);
          }
        } else {
          if (hl && isKaraoke) {
            const isSpoken = startWordIdx <= hl.target;
            nodes.push(
              <strong key={`${keyPrefix}-${j}`} className={`font-semibold text-foreground inline-block transition-colors duration-150 rounded-sm ${isSpoken ? "bg-gold/25" : ""}`}>
                {part}
              </strong>
            );
          } else {
            nodes.push(
              <strong key={`${keyPrefix}-${j}`} className={`font-semibold text-foreground${hl ? ` inline-block transition-all duration-300 rounded-sm ${highlighted ? "opacity-100 blur-0 translate-y-0" : "opacity-0 blur-[2px] translate-y-1"}` : ""}`}>
                {part}
              </strong>
            );
          }
      }
    } else {
      const italicParts = part.split(/\*(.+?)\*/g);
      italicParts.forEach((ip, k) => {
        if (k % 2 === 1) {
          if (hl) {
            renderWordTokens(ip, nodes, hl, `${keyPrefix}-${j}-i${k}`, true);
          } else {
            nodes.push(<em key={`${keyPrefix}-${j}-i${k}`}>{ip}</em>);
          }
        } else if (ip) {
          if (hl) {
            renderWordTokens(ip, nodes, hl, `${keyPrefix}-${j}-${k}`, false);
          } else {
            nodes.push(<span key={`${keyPrefix}-${j}-${k}`}>{ip}</span>);
          }
        }
      });
    }
  });

  return nodes;
};

/** Render text split into word-level spans with highlighting */
const renderWordTokens = (
  text: string,
  nodes: ReactNode[],
  hl: HighlightState,
  keyPrefix: string,
  italic: boolean
) => {
  const isKaraoke = hl.mode === "karaoke";
  const tokens = text.split(/(\s+)/);
  tokens.forEach((token, t) => {
    if (!token) return;
    if (!token.trim()) {
      nodes.push(<span key={`${keyPrefix}-ws-${t}`}>{token}</span>);
      return;
    }
    const wordIdx = hl.wordIndex++;
    const highlighted = wordIdx <= hl.target;

    if (isKaraoke) {
      const karaokeClass = `transition-colors duration-150 inline-block rounded-sm ${highlighted ? "bg-gold/25 text-foreground" : ""}`;
      if (italic) {
        nodes.push(<em key={`${keyPrefix}-w-${t}`} className={karaokeClass}>{token}</em>);
      } else {
        nodes.push(<span key={`${keyPrefix}-w-${t}`} className={karaokeClass}>{token}</span>);
      }
    } else {
      const hlClass = `transition-all duration-300 inline-block rounded-sm ${highlighted ? "opacity-100 blur-0 translate-y-0" : "opacity-0 blur-[2px] translate-y-1"}`;
      if (italic) {
        nodes.push(<em key={`${keyPrefix}-w-${t}`} className={hlClass}>{token}</em>);
      } else {
        nodes.push(<span key={`${keyPrefix}-w-${t}`} className={hlClass}>{token}</span>);
      }
    }
  });
};

/** Convert markdown text to React elements with paragraphs, lists, and inline formatting */
const formatAnswer = (
  text: string,
  businesses: BusinessData[],
  onClickBusiness: (b: BusinessData) => void,
  highlightWordIndex?: number
): ReactNode[] => {
  const hl: HighlightState | undefined =
    highlightWordIndex !== undefined && highlightWordIndex >= 0
      ? { wordIndex: 0, target: highlightWordIndex }
      : undefined;

  // Normalize bold markers spanning newlines
  const normalized = text.replace(/\*\*([^*]*?)\*\*/gs, (_, inner) =>
    `**${inner.replace(/\n/g, " ")}**`
  );

  const lines = normalized.split(/\n/);
  const elements: ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentParagraph: string[] = [];
  let blockIdx = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        elements.push(
          <p key={`p-${blockIdx}`} className="mb-3 last:mb-0 leading-[1.8]">
            {parseInline(text, businesses, onClickBusiness, `p-${blockIdx}`, hl)}
          </p>
        );
        blockIdx++;
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const Tag = currentList.type === "ul" ? "ul" : "ol";
      const listClass = currentList.type === "ul"
        ? "list-disc pl-6 mb-3 space-y-1"
        : "list-decimal pl-6 mb-3 space-y-1";
      elements.push(
        <Tag key={`list-${blockIdx}`} className={listClass}>
          {currentList.items.map((item, i) => (
            <li key={i} className="leading-[1.8]">
              {parseInline(item, businesses, onClickBusiness, `li-${blockIdx}-${i}`, hl)}
            </li>
          ))}
        </Tag>
      );
      blockIdx++;
      currentList = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const ulMatch = trimmed.match(/^[-•]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ul") flushList();
      if (!currentList) currentList = { type: "ul", items: [] };
      currentList.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ol") flushList();
      if (!currentList) currentList = { type: "ol", items: [] };
      currentList.items.push(olMatch[1]);
      continue;
    }

    if (currentList) flushList();
    currentParagraph.push(trimmed);
  }

  flushList();
  flushParagraph();

  return elements;
};

const AISearchAnswer = ({ query, spokenText, businesses, isSearchLoading, onAnswerReady, highlightWordIndex, externalRegenerateKey }: AISearchAnswerProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [fontSize, setFontSize] = useState(0);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [answerKey, setAnswerKey] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const fetchIdRef = useRef(0);
  const lastFetchKeyRef = useRef("");
  const aiPanelRef = useRef<HTMLDivElement>(null);
  const answerRevealRafRef = useRef<number | null>(null);

  const revealAnswer = () => {
    if (answerRevealRafRef.current !== null) {
      cancelAnimationFrame(answerRevealRafRef.current);
    }
    setIsAnswerVisible(false);
    answerRevealRafRef.current = requestAnimationFrame(() => {
      answerRevealRafRef.current = requestAnimationFrame(() => {
        setIsAnswerVisible(true);
      });
    });
  };

  const fetchKey = useMemo(() => {
    if (!query || !businesses.length) return "";
    const names = businesses.slice(0, 10).map(b => b.name).join("|");
    return `${query}::${names}::${regenerateCount}::${externalRegenerateKey ?? 0}`;
  }, [query, businesses, regenerateCount, externalRegenerateKey]);

  useEffect(() => {
    setIsDismissed(false);
    setAnswer("");
    setError(null);
    setSelectedBusiness(null);
    setIsAnswerVisible(false);
  }, [query]);


  // When search finishes with 0 results, stop any loading state
  useEffect(() => {
    if (!isSearchLoading && businesses.length === 0 && isLoading) {
      setIsLoading(false);
      setAnswer("");
      onAnswerReady?.("");
      setIsAnswerVisible(false);
    }
  }, [isSearchLoading, businesses.length, isLoading]);

  useEffect(() => {
    if (!fetchKey || isSearchLoading || isDismissed) return;
    if (fetchKey === lastFetchKeyRef.current && answer) return;

    const currentFetchId = ++fetchIdRef.current;
    lastFetchKeyRef.current = fetchKey;
    setIsLoading(true);
    setAnswer("");
    onAnswerReady?.("");
    setError(null);
    setIsAnswerVisible(false);

    const fetchAnswer = async () => {
      try {
        const top10 = businesses.slice(0, 10);
        const cityCounts: Record<string, number> = {};
        top10.forEach(b => { if (b.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1; });
        const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
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
            vary: (regenerateCount + (externalRegenerateKey ?? 0)) > 0 ? regenerateCount + (externalRegenerateKey ?? 0) : undefined,
          },
        });

        if (currentFetchId !== fetchIdRef.current) return;

        if (fnError) {
          console.error("AI answer error:", fnError);
          setError(fnError.message);
          return;
        }

        if (data?.answer) {
          setAnswerKey(k => k + 1);
          setAnswer(data.answer);
          onAnswerReady?.(data.answer);
          revealAnswer();
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

  useEffect(() => {
    return () => {
      if (answerRevealRafRef.current !== null) {
        cancelAnimationFrame(answerRevealRafRef.current);
      }
    };
  }, []);

  const isPanelOpen = !!selectedBusiness;
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        aiPanelRef.current?.scrollTo({ top: 0 });
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isPanelOpen]);

  // Panel rendering fully disabled — component only generates AI text via onAnswerReady
  return null;

  return (
    <>
      {isPanelOpen && (
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm" onClick={() => setSelectedBusiness(null)} />
      )}

      <div
        ref={aiPanelRef}
        className={`mb-6 transition-all duration-500 ease-out ${
          isPanelOpen
            ? "hidden"
            : "w-[70%] mx-auto"
        }`}
      >
        <div className="relative isolate rounded-2xl border border-gold/30 bg-white dark:bg-zinc-900 backdrop-blur-sm">
          <div className="flex items-center px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {language === "en" ? "AI Suggestion" : language === "ar" ? "اقتراح ذكي" : "Suggestion IA"}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setRegenerateCount(c => c + 1)}
                disabled={isLoading}
                className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                title={language === "en" ? "Generate another suggestion" : "Générer une autre suggestion"}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
              </button>
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

          <div className="px-5 py-4">
            {isLoading ? (
              <div className="flex items-center gap-3 text-gold/90">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                <span className="text-sm italic">
                  {language === "en" ? "Thinking..." : language === "ar" ? "جاري التفكير..." : "Réflexion en cours..."}
                </span>
              </div>
            ) : (
              <div
                key={`answer-fade-${answerKey}`}
                className={`leading-relaxed text-foreground transition-all duration-700 ease-out ${
                  isAnswerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                } ${fontSize === -1 ? "text-xs" : fontSize === 1 ? "text-base" : "text-sm"}`}
              >
                {formatAnswer(answer, businesses, setSelectedBusiness, highlightWordIndex)}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPanelOpen && (
        <div className={`fixed top-[62px] right-0 z-[100] bg-background shadow-2xl border-l border-border overflow-hidden transition-all duration-500 ease-out animate-slide-in-right flex flex-col ${isPanelExpanded ? "w-[80%]" : "w-1/2"}`} style={{ height: "calc(100vh - 62px)" }}>
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
            <div id="slide-panel-toolbar-center" className="flex-1 flex items-center justify-center gap-4" />
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
export { parseInline, findBusiness, BusinessHoverCard };
export type { BusinessData };
