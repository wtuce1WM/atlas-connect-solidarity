import { useState, useEffect, useRef, useMemo } from "react";
import { Sparkles, Loader2, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Link } from "react-router-dom";

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
}

interface AISearchAnswerProps {
  query: string;
  businesses: BusinessData[];
  isSearchLoading: boolean;
}

// Normalize string for fuzzy matching
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''`]/g, "'").trim();

// Find matching business by name
const findBusiness = (name: string, businesses: BusinessData[]): BusinessData | null => {
  const n = normalize(name);
  return businesses.find(b => normalize(b.name) === n)
    || businesses.find(b => n.includes(normalize(b.name)) || normalize(b.name).includes(n))
    || null;
};

const getImage = (b: BusinessData): string | null => {
  if (b.images && b.images.length > 0) return b.images[0];
  if (b.logo_url) return b.logo_url;
  return null;
};

const BusinessHoverCard = ({ name, business }: { name: string; business: BusinessData }) => {
  const img = getImage(business);
  const slug = business.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          to={`/business/${business.id}`}
          className="text-base font-semibold text-foreground underline decoration-gold/40 underline-offset-2 hover:decoration-gold transition-colors cursor-pointer"
        >
          {name}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-0 overflow-hidden rounded-xl border border-gold/20 shadow-xl">
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
          {business.rating && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 text-gold fill-gold" />
              <span className="font-medium text-foreground">{business.rating}/20</span>
            </div>
          )}
          {business.hook_fr && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">{business.hook_fr}</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// Format AI answer: double line break after each sentence, bold business names with hover
const formatAnswer = (text: string, businesses: BusinessData[]) => {
  const sentences = text.split(/(?<=\.)\s+/).filter(s => s.trim());

  const parseBold = (line: string, lineIdx: number) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, j) => {
      if (j % 2 === 1) {
        const match = findBusiness(part, businesses);
        if (match) {
          return <BusinessHoverCard key={`${lineIdx}-${j}`} name={part} business={match} />;
        }
        return <strong key={`${lineIdx}-${j}`} className="text-base font-semibold text-foreground">{part}</strong>;
      }
      return <span key={`${lineIdx}-${j}`}>{part}</span>;
    });
  };

  return sentences.map((line, i) => (
    <span key={i}>
      {i > 0 && <><br /><br /></>}
      {parseBold(line, i)}
    </span>
  ));
};

const AISearchAnswer = ({ query, businesses, isSearchLoading }: AISearchAnswerProps) => {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const lastFetchKeyRef = useRef("");

  const fetchKey = useMemo(() => {
    if (!query) return "";
    const names = businesses.slice(0, 5).map(b => b.name).join("|");
    return `${query}::${names || "no-results"}`;
  }, [query, businesses]);

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
    <div className="w-[70%] mx-auto mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="relative rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 py-2.5 border-b border-gold/15">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {language === "en" ? "AI Suggestion" : language === "ar" ? "اقتراح ذكي" : "Suggestion IA"}
            </span>
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
            <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {formatAnswer(answer, businesses)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISearchAnswer;
