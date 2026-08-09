import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookMarked } from "lucide-react";

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

const SECTIONS = [
  { id: "architecture", label: "Règles d'architecture", icon: BookMarked, content: architectureMd },
  { id: "glossaire", label: "Glossaire projet", icon: BookMarked, content: glossaireMd },
  { id: "decisions", label: "Décisions techniques", icon: BookMarked, content: decisionsMd },
  { id: "conventions", label: "Conventions UI", icon: BookMarked, content: conventionsMd },
  { id: "recherche-vocale", label: "Recherche vocale", icon: BookMarked, content: rechercheVocaleMd },
  { id: "mode-pinids", label: "Mode pinIds (Search)", icon: BookMarked, content: modePinIdsMd },
  { id: "collaboration-multi-postes", label: "Multi-postes", icon: BookMarked, content: collaborationMultiPostesMd },
  { id: "domaine-dns", label: "Domaine & DNS", icon: BookMarked, content: domaineDnsMd },
  { id: "seo-meta-tags-lovable", label: "SEO & balises meta", icon: BookMarked, content: seoMetaTagsLovableMd },
  { id: "previews-sociales-bots", label: "Previews sociales /b/", icon: BookMarked, content: previewsSocialesBotsMd },
  { id: "cout-generation-videos", label: "Coût génération vidéos", icon: BookMarked, content: coutGenerationVideosMd },
  { id: "cout-tokens-ia-runtime", label: "Coût tokens IA runtime", icon: BookMarked, content: coutTokensIaRuntimeMd },
  { id: "methode-prompts-economie-credits", label: "Méthode prompts & crédits", icon: BookMarked, content: methodePromptsMd },
  { id: "contexte-et-historique", label: "Contexte & historique", icon: BookMarked, content: contexteHistoriqueMd },
  { id: "lovable-skills", label: "Skills Lovable", icon: BookMarked, content: lovableSkillsMd },
  { id: "connecteur-mcp-claude", label: "Connecteur MCP / Claude", icon: BookMarked, content: connecteurMcpClaudeMd },
  { id: "processus-changement-classe-abc", label: "Classes A/B/C", icon: BookMarked, content: processusChangementClasseAbcMd },
];

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
          Lecture seule — c'est exactement la base que l'IA doit consulter avant chaque action sur le projet.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row min-h-[60vh] max-h-[80vh]">
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r bg-muted/30 flex flex-col">
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
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selected.id === s.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">Aucune entrée trouvée.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-muted/20 lg:hidden">
              <p className="text-sm font-medium truncate">{selected.label}</p>
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
