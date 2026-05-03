import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Globe, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayedLink?: string;
  snippet?: string;
  favicon?: string | null;
  source?: string | null;
}

interface AnswerBox {
  type?: string;
  title?: string;
  answer?: string;
  snippet?: string;
  link?: string;
}

interface KnowledgeGraph {
  title?: string;
  description?: string;
  thumbnail?: string;
  source?: { name?: string; link?: string };
}

interface WebSearchOverlayProps {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
}

const WebSearchOverlay = ({ open, initialQuery, onClose }: WebSearchOverlayProps) => {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "en" ? en : fr);

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OrganicResult[] | null>(null);
  const [answerBox, setAnswerBox] = useState<AnswerBox | null>(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);

  const runSearch = useCallback(async (q?: string) => {
    const finalQuery = (q ?? query).trim();
    if (!finalQuery) return;
    setLoading(true);
    setResults(null);
    setAnswerBox(null);
    setKnowledgeGraph(null);
    try {
      const { data, error } = await supabase.functions.invoke("serpapi-web", {
        body: { query: finalQuery, language: language === "en" ? "en" : "fr" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResults(data.organic || []);
      setAnswerBox(data.answerBox || null);
      setKnowledgeGraph(data.knowledgeGraph || null);
    } catch (err) {
      console.error("Web search error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [query, language]);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      if (initialQuery) {
        const timer = setTimeout(() => runSearch(initialQuery), 200);
        return () => clearTimeout(timer);
      }
    }
  }, [open, initialQuery]); // eslint-disable-line

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{t("Recherche web", "Web search")}</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-muted/30 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder={t("Rechercher sur Google...", "Search Google...")}
          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <Button onClick={() => runSearch()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {answerBox && (answerBox.answer || answerBox.snippet) && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              {answerBox.title && <div className="text-xs uppercase text-primary font-semibold mb-1">{answerBox.title}</div>}
              <div className="text-sm text-foreground">{answerBox.answer || answerBox.snippet}</div>
              {answerBox.link && (
                <a href={answerBox.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                  {answerBox.link} <ExternalLink className="inline h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {knowledgeGraph && (
            <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
              {knowledgeGraph.thumbnail && (
                <img src={knowledgeGraph.thumbnail} alt="" className="h-20 w-20 object-cover rounded-lg shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm">{knowledgeGraph.title}</div>
                {knowledgeGraph.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{knowledgeGraph.description}</div>}
                {knowledgeGraph.source?.link && (
                  <a href={knowledgeGraph.source.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                    {knowledgeGraph.source.name || knowledgeGraph.source.link}
                  </a>
                )}
              </div>
            </div>
          )}

          {loading && !results && (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          )}

          {results && results.map((r, idx) => (
            <a
              key={idx}
              href={r.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                {r.favicon && <img src={r.favicon} alt="" className="h-4 w-4" />}
                <div className="text-xs text-muted-foreground truncate">{r.displayedLink || r.link}</div>
              </div>
              <div className="text-sm font-semibold text-primary line-clamp-2">{r.title}</div>
              {r.snippet && <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{r.snippet}</div>}
            </a>
          ))}

          {results && results.length === 0 && !loading && (
            <div className="text-center text-sm text-muted-foreground py-12">{t("Aucun résultat", "No results")}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WebSearchOverlay;
