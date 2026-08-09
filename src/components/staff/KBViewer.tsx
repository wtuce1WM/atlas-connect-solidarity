import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookMarked, Calendar } from "lucide-react";

import architectureMd from "@/content/kb/architecture.md?raw";
import glossaireMd from "@/content/kb/glossaire.md?raw";
import decisionsMd from "@/content/kb/decisions.md?raw";
import conventionsMd from "@/content/kb/conventions-ui.md?raw";
import rechercheVocaleMd from "@/content/kb/recherche-vocale.md?raw";
import modePinIdsMd from "@/content/kb/mode-pinids.md?raw";
import collaborationMultiPostesMd from "@/content/kb/collaboration-multi-postes.md?raw";
import domaineDnsMd from "@/content/kb/domaine-dns.md?raw";
import seoMetaTagsLovableMd from "@/content/kb/seo-meta-tags-lovable.md?raw";
import previewsSocialesBotsMd from "@/content/kb/previews-sociales-bots.md?raw";
import coutGenerationVideosMd from "@/content/kb/cout-generation-videos.md?raw";
import coutTokensIaRuntimeMd from "@/content/kb/cout-tokens-ia-runtime.md?raw";
import methodePromptsMd from "@/content/kb/methode-prompts-economie-credits.md?raw";
import contexteHistoriqueMd from "@/content/kb/contexte-et-historique.md?raw";
import lovableSkillsMd from "@/content/kb/lovable-skills.md?raw";
import connecteurMcpClaudeMd from "@/content/kb/connecteur-mcp-claude.md?raw";
import processusChangementClasseAbcMd from "@/content/kb/processus-changement-classe-abc.md?raw";

type Section = {
  id: string;
  label: string;
  icon: typeof BookMarked;
  content: string;
  createdAt: string;
};

const SECTIONS: Section[] = [
  { id: "processus-changement-classe-abc", label: "Classes A/B/C", icon: BookMarked, content: processusChangementClasseAbcMd, createdAt: "2026-08-09" },
  { id: "connecteur-mcp-claude", label: "Connecteur MCP / Claude", icon: BookMarked, content: connecteurMcpClaudeMd, createdAt: "2026-08-01" },
  { id: "lovable-skills", label: "Skills Lovable", icon: BookMarked, content: lovableSkillsMd, createdAt: "2026-07-25" },
  { id: "contexte-et-historique", label: "Contexte & historique", icon: BookMarked, content: contexteHistoriqueMd, createdAt: "2026-07-20" },
  { id: "methode-prompts-economie-credits", label: "Méthode prompts & crédits", icon: BookMarked, content: methodePromptsMd, createdAt: "2026-07-15" },
  { id: "cout-tokens-ia-runtime", label: "Coût tokens IA runtime", icon: BookMarked, content: coutTokensIaRuntimeMd, createdAt: "2026-07-10" },
  { id: "cout-generation-videos", label: "Coût génération vidéos", icon: BookMarked, content: coutGenerationVideosMd, createdAt: "2026-07-05" },
  { id: "previews-sociales-bots", label: "Previews sociales /b/", icon: BookMarked, content: previewsSocialesBotsMd, createdAt: "2026-07-01" },
  { id: "seo-meta-tags-lovable", label: "SEO & balises meta", icon: BookMarked, content: seoMetaTagsLovableMd, createdAt: "2026-06-25" },
  { id: "domaine-dns", label: "Domaine & DNS", icon: BookMarked, content: domaineDnsMd, createdAt: "2026-06-20" },
  { id: "collaboration-multi-postes", label: "Multi-postes", icon: BookMarked, content: collaborationMultiPostesMd, createdAt: "2026-06-15" },
  { id: "mode-pinids", label: "Mode pinIds (Search)", icon: BookMarked, content: modePinIdsMd, createdAt: "2026-06-10" },
  { id: "recherche-vocale", label: "Recherche vocale", icon: BookMarked, content: rechercheVocaleMd, createdAt: "2026-06-05" },
  { id: "conventions-ui", label: "Conventions UI", icon: BookMarked, content: conventionsMd, createdAt: "2026-06-01" },
  { id: "decisions", label: "Décisions techniques", icon: BookMarked, content: decisionsMd, createdAt: "2026-05-25" },
  { id: "glossaire", label: "Glossaire projet", icon: BookMarked, content: glossaireMd, createdAt: "2026-05-20" },
  { id: "architecture", label: "Règles d'architecture", icon: BookMarked, content: architectureMd, createdAt: "2026-05-15" },
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const KBViewer = () => {
  const [selectedId, setSelectedId] = useState<string>(SECTIONS[0].id);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [query]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) || filtered[0] || SECTIONS[0],
    [filtered, selectedId]
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-gold" />
          Base de connaissance partagée (KB)
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Lecture seule — tri par date de création, la plus récente en premier.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row min-h-[60vh] max-h-[80vh]">
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r bg-muted/30 flex flex-col">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une entrée..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 lg:h-auto">
              <div className="p-3 pt-0 space-y-1">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex flex-col gap-0.5 ${
                      selected.id === s.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate font-medium">{s.label}</span>
                    </span>
                    <span className={`text-xs pl-6 ${selected.id === s.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {formatDate(s.createdAt)}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">Aucune entrée trouvée.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between gap-4">
              <p className="text-sm font-medium truncate">{selected.label}</p>
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(selected.createdAt)}
              </span>
            </div>
            <ScrollArea className="flex-1 p-4 lg:p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:text-foreground prose-a:text-primary prose-table:w-full prose-th:text-left prose-th:border prose-th:border-border prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KBViewer;
