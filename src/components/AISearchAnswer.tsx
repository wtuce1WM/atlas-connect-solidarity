import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";

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
  latitude?: number | null;
  longitude?: number | null;
}

interface AISearchAnswerProps {
  query: string;
  spokenText?: string;
  businesses: BusinessData[];
  isSearchLoading: boolean;
  onAnswerReady?: (answer: string, citedBusinesses?: BusinessData[]) => void;
  highlightWordIndex?: number;
  externalRegenerateKey?: number;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`]/g, "'").trim();

const STOPWORDS = new Set([
  "le","la","les","l","un","une","des","de","du","d","au","aux","a","à",
  "et","ou","the","of","el","restaurant","cafe","café","riad","hotel","hôtel",
  "spa","boutique","shop","maison","villa","palais","dar"
]);

const tokenize = (s: string): string[] =>
  normalize(s)
    .replace(/[()[\]{}«»"'`.,;:!?\-–—/\\|]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));

const findBusiness = (name: string, businesses: BusinessData[]): BusinessData | null => {
  const raw = name.replace(/\s+/g, " ").trim();
  const candidates = Array.from(new Set([
    raw,
    raw.replace(/\s+[—–-]\s+.*$/, ""),
    raw.replace(/\s+\([^)]*\)\s*$/, ""),
    raw.replace(/\s+(?:à partir de|from|dès)\s+.*$/i, ""),
    raw.replace(/\s+\d+[\d\s.,]*(?:eur|€|mad|dh|dhs).*/i, ""),
  ].map((s) => s.trim()).filter(Boolean)));

  for (const candidate of candidates) {
    const n = normalize(candidate);
    const exact = businesses.find(b => normalize(b.name) === n);
    if (exact) return exact;
    const cityPattern = /(.+?)(?:\s+[àa]\s+|\s*[-–—]\s*|\s*[(［].+?[)］]\s*$)/i;
    const cityMatch = n.match(cityPattern);
    if (cityMatch) {
      const namePart = cityMatch[1].trim();
      const exactStripped = businesses.find(b => normalize(b.name) === namePart);
      if (exactStripped) return exactStripped;
    }
    const incl = businesses.find(b => n.includes(normalize(b.name)) || normalize(b.name).includes(n));
    if (incl) return incl;
  }

  const businessTokenRows = businesses.map((b) => ({ b, tokens: new Set(tokenize(b.name)) }));
  const tokenFrequency = new Map<string, number>();
  businessTokenRows.forEach(({ tokens }) => tokens.forEach((t) => tokenFrequency.set(t, (tokenFrequency.get(t) || 0) + 1)));

  for (const candidate of candidates) {
    // Token-based fallback (Jaccard on significant words)
    const queryTokens = new Set(tokenize(candidate));
    if (queryTokens.size === 0) continue;
    let best: { b: BusinessData; score: number } | null = null;
    for (const { b, tokens: bTokens } of businessTokenRows) {
      if (bTokens.size === 0) continue;
      let inter = 0;
      queryTokens.forEach(t => { if (bTokens.has(t)) inter++; });
      if (queryTokens.size === 1 && inter > 0 && (tokenFrequency.get(Array.from(queryTokens)[0]) || 0) > 2) continue;
      const union = queryTokens.size + bTokens.size - inter;
      const jaccard = inter / union;
      const queryCoverage = inter / queryTokens.size;
      const nameCoverage = inter / bTokens.size;
      const score = Math.max(jaccard, queryCoverage * 0.92, nameCoverage * 0.9);
      if (score >= 0.6 && (!best || score > best.score)) {
        best = { b, score };
      }
    }
    if (best) return best.b;

    // Distinctive-token fallback for shortened hotel names (e.g. "Mövenpick", "Nobu").
    const distinctiveTokens = Array.from(queryTokens).filter((t) =>
      (t.length >= 4 || /[a-z]+\d|\d+[a-z]/i.test(t)) && (tokenFrequency.get(t) || 0) <= 2
    );
    if (distinctiveTokens.length > 0) {
      const tokenMatches = businessTokenRows.filter(({ tokens }) =>
        distinctiveTokens.some((t) => tokens.has(t) || (t.length >= 5 && Array.from(tokens).some((bt) => bt.startsWith(t) || t.startsWith(bt))))
      );
      if (tokenMatches.length === 1) return tokenMatches[0].b;
    }
  }

  return null;
};

const getImage = (b: BusinessData): string | null => {
  if (b.images && b.images.length > 0) return b.images[0];
  if (b.logo_url) return b.logo_url;
  return null;
};

const BusinessHoverCard = ({ business, onClickBusiness, onHoverBusiness }: { name: string; business: BusinessData; onClickBusiness: (b: BusinessData) => void; onHoverBusiness?: (b: BusinessData | null) => void }) => {
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
          onMouseEnter={() => onHoverBusiness?.(business)}
          onMouseLeave={() => onHoverBusiness?.(null)}
          onFocus={() => onHoverBusiness?.(business)}
          onBlur={() => onHoverBusiness?.(null)}
          className="text-sm sm:text-base font-semibold text-foreground underline decoration-gold/40 underline-offset-2 hover:decoration-gold transition-colors cursor-pointer !normal-case !tracking-normal"
          style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}
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
  mode?: "reveal" | "karaoke";
}

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

/** Parse inline markdown with optional word-level highlighting */
const parseInline = (
  text: string,
  businesses: BusinessData[],
  onClickBusiness: (b: BusinessData) => void,
  keyPrefix: string,
  hl?: HighlightState,
  onHoverBusiness?: (b: BusinessData | null) => void
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
        const card = <BusinessHoverCard key={`${keyPrefix}-${j}`} name={part} business={match} onClickBusiness={onClickBusiness} onHoverBusiness={onHoverBusiness} />;
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

const AISearchAnswer = ({ query, spokenText, businesses, isSearchLoading, onAnswerReady, externalRegenerateKey }: AISearchAnswerProps) => {
  const { language } = useLanguage();
  const geo = useGeolocation();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const fetchIdRef = useRef(0);
  const lastFetchKeyRef = useRef("");
  const regenerateCount = 0;

  const fetchKey = useMemo(() => {
    if (!query || !businesses.length) return "";
    const names = businesses.slice(0, 10).map(b => b.name).join("|");
    const geoKey = geo.isEnabled && geo.coords ? `${geo.coords.lat.toFixed(3)},${geo.coords.lng.toFixed(3)}` : "no-geo";
    return `${language}::${query}::${names}::${regenerateCount}::${externalRegenerateKey ?? 0}::${geoKey}`;
  }, [query, businesses, externalRegenerateKey, geo.isEnabled, geo.coords, language]);


  useEffect(() => {
    setIsDismissed(false);
    setAnswer("");
  }, [query]);

  // When search finishes with 0 results, stop any loading state
  useEffect(() => {
    if (!isSearchLoading && businesses.length === 0 && isLoading) {
      setIsLoading(false);
      setAnswer("");
      onAnswerReady?.("");
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

        const userCoordsPayload = geo.isEnabled && geo.coords
          ? { lat: geo.coords.lat, lng: geo.coords.lng }
          : undefined;

        // Moteur unifié A/B/C (`?engine=v2`) : aucun pool de fiches envoyé,
        // la surface fournit seulement la ville active et la question.
        const engineV2 = typeof window !== "undefined"
          && new URLSearchParams(window.location.search).get("engine") === "v2";
        if (engineV2) {
          try {
            const res = await callAiEngine({
              surface: "search",
              message: spokenText || query,
              activeCity: topCity || null,
              language,
              userCoords: userCoordsPayload ?? null,
              onDelta: (t) => {
                if (currentFetchId !== fetchIdRef.current) return;
                if (t) setAnswer(t);
              },
            });
            if (currentFetchId !== fetchIdRef.current) return;
            if (res.text) {
              const byId = new Map(businesses.map((b) => [b.id, b]));
              const cited = res.known
                .map((k) => byId.get(k.id))
                .filter((b): b is BusinessData => !!b);
              setAnswer(res.text);
              onAnswerReady?.(res.text, cited.length ? cited : undefined);
              return;
            }
            console.warn("ai-engine v2 empty answer — fallback ai-search-answer");
          } catch (e) {
            console.warn("ai-engine v2 failed — fallback ai-search-answer", e);
          }
        }


        const { data, error: fnError } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query,
            spokenText: spokenText || undefined,
            businesses: sortedForAI.map(b => ({
              id: b.id,
              name: b.name,
              city: b.city,
              neighborhood: b.neighborhood ?? null,
              address: b.address ?? null,
              main_category: b.main_category,
              categories: b.categories,
              hook_fr: b.hook_fr,
              wtuce_status: b.wtuce_status,
              latitude: b.latitude ?? null,
              longitude: b.longitude ?? null,
            })),
            language,
            userCoords: userCoordsPayload,
            vary: (regenerateCount + (externalRegenerateKey ?? 0)) > 0 ? regenerateCount + (externalRegenerateKey ?? 0) : undefined,
          },
        });

        if (currentFetchId !== fetchIdRef.current) return;

        if (fnError) {
          console.error("AI answer error:", fnError);
          return;
        }

        if (data?.answer) {
          setAnswer(data.answer);
          onAnswerReady?.(data.answer, Array.isArray(data.citedBusinesses) ? data.citedBusinesses : undefined);
        }
      } catch (err) {
        if (currentFetchId !== fetchIdRef.current) return;
        console.error("AI answer fetch error:", err);
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchAnswer();
  }, [fetchKey, isSearchLoading, isDismissed, language]);

  return null;
};

export default AISearchAnswer;
export { parseInline, findBusiness, getImage };
export type { BusinessData };

/**
 * Extract the businesses cited in an AI answer (text wrapped in **...**),
 * preserving order of appearance and de-duplicating by id.
 */
export const extractCitedBusinesses = (
  text: string,
  businesses: BusinessData[]
): BusinessData[] => {
  if (!text) return [];
  const out: BusinessData[] = [];
  const seen = new Set<string>();
  const re = /\*\*(.+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const match = findBusiness(m[1], businesses);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      out.push(match);
    }
  }
  return out;
};

