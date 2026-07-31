import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, Loader2, Library } from "lucide-react";

interface Entry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  updated_at: string;
}

/* Groupes d'APIs : détection par mots-clés (titre + contenu + tags) */
const API_GROUPS: { key: string; label: string; emoji: string; keywords: string[] }[] = [
  {
    key: "reviews",
    label: "Avis & réputation",
    emoji: "⭐",
    keywords: ["avis", "review", "tripadvisor", "google business", "business profile", "restaurant guru", "trustpilot", "yelp", "booking.com", "note"],
  },
  {
    key: "maps",
    label: "Maps & géolocalisation",
    emoji: "🗺️",
    keywords: ["maps", "google places", "place_id", "géoloc", "geoloc", "geocoding", "carte", "marker", "latitude", "longitude", "gps", "serpapi"],
  },
  {
    key: "translation",
    label: "Traduction & i18n",
    emoji: "🌐",
    keywords: ["traduction", "translate", "translation", "i18n", "multilingue", "arabe", "langue", "deepl"],
  },
  {
    key: "ai",
    label: "IA & modèles",
    emoji: "🤖",
    keywords: ["gemini", "openai", "lovable ai", "gateway", "llm", "embedding", "prompt", "rag", "chat ia"],
  },
  {
    key: "booking",
    label: "Réservation & prix",
    emoji: "🛏️",
    keywords: ["liteapi", "booking", "réserv", "hotel", "hôtel", "prix", "price", "tarif"],
  },
  {
    key: "media",
    label: "Média & vidéo",
    emoji: "🎬",
    keywords: ["youtube", "vidéo", "video", "remotion", "image", "webp", "firecrawl", "screenshot"],
  },
  {
    key: "comms",
    label: "Emails & messagerie",
    emoji: "✉️",
    keywords: ["resend", "email", "whatsapp", "sms", "otp"],
  },
];

const OTHER_KEY = "other";

const ApiKnowledgeIndex = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["reviews"]));
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("knowledge_entries")
        .select("id, title, content, category, tags, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      setEntries((data as Entry[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.content || "").toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (e.category || "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const haystack = `${e.title} ${e.content} ${(e.tags || []).join(" ")}`.toLowerCase();
      const matches = API_GROUPS.filter(g => g.keywords.some(k => haystack.includes(k)));
      if (matches.length === 0) {
        map.set(OTHER_KEY, [...(map.get(OTHER_KEY) || []), e]);
      } else {
        for (const g of matches) map.set(g.key, [...(map.get(g.key) || []), e]);
      }
    }
    return map;
  }, [filtered]);

  const toggleGroup = (key: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const stripHtml = (html: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const renderGroup = (key: string, label: string, emoji: string) => {
    const list = grouped.get(key) || [];
    if (list.length === 0) return null;
    const isOpen = openGroups.has(key) || query.trim().length > 0;
    return (
      <div key={key} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleGroup(key)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <span className="flex items-center gap-2 font-medium text-sm">
            <span>{emoji}</span>
            {label}
            <Badge variant="secondary">{list.length}</Badge>
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isOpen && (
          <div className="divide-y">
            {list.map(e => (
              <div key={`${key}-${e.id}`} className="px-4 py-3">
                <button
                  onClick={() => setOpenEntry(openEntry === `${key}-${e.id}` ? null : `${key}-${e.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{e.title}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">{e.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {stripHtml(e.content).slice(0, 220)}
                  </p>
                </button>
                {openEntry === `${key}-${e.id}` && (
                  <div className="mt-3 text-sm text-foreground/90 prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: e.content || "" }} />
                )}
                {(e.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(e.tags || []).map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Library className="h-4 w-4" />
          Index des notes par API
          <Badge variant="outline">{filtered.length} notes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Recherche interne (titre, contenu, tag, catégorie)…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune note trouvée</p>
        ) : (
          <div className="space-y-2">
            {API_GROUPS.map(g => renderGroup(g.key, g.label, g.emoji))}
            {renderGroup(OTHER_KEY, "Autres notes", "📁")}
          </div>
        )}

        {!loading && query && (
          <Button variant="ghost" size="sm" onClick={() => setQuery("")}>Réinitialiser la recherche</Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKnowledgeIndex;
