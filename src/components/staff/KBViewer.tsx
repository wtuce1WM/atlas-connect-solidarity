import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Building2, BookMarked, CheckCircle2, Palette, Mic, Pin, Users, Globe, Search, Share2, Video, Coins, Wallet, History, Plug } from "lucide-react";

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


const SECTIONS = [
  { id: "architecture", label: "Règles d'architecture", icon: Building2, content: architectureMd },
  { id: "glossaire", label: "Glossaire projet", icon: BookMarked, content: glossaireMd },
  { id: "decisions", label: "Décisions techniques", icon: CheckCircle2, content: decisionsMd },
  { id: "conventions", label: "Conventions UI", icon: Palette, content: conventionsMd },
  { id: "recherche-vocale", label: "Recherche vocale", icon: Mic, content: rechercheVocaleMd },
  { id: "mode-pinids", label: "Mode pinIds (Search)", icon: Pin, content: modePinIdsMd },
  { id: "collaboration-multi-postes", label: "Multi-postes", icon: Users, content: collaborationMultiPostesMd },
  { id: "domaine-dns", label: "Domaine & DNS", icon: Globe, content: domaineDnsMd },
  { id: "seo-meta-tags-lovable", label: "SEO & balises meta", icon: Search, content: seoMetaTagsLovableMd },
  { id: "previews-sociales-bots", label: "Previews sociales /b/", icon: Share2, content: previewsSocialesBotsMd },
  { id: "cout-generation-videos", label: "Coût génération vidéos", icon: Video, content: coutGenerationVideosMd },
  { id: "cout-tokens-ia-runtime", label: "Coût tokens IA runtime", icon: Coins, content: coutTokensIaRuntimeMd },
  { id: "methode-prompts-economie-credits", label: "Méthode prompts & crédits", icon: Wallet, content: methodePromptsMd },
  { id: "contexte-et-historique", label: "Contexte & historique", icon: History, content: contexteHistoriqueMd },
  { id: "lovable-skills", label: "Skills Lovable", icon: Bot, content: lovableSkillsMd },
  { id: "connecteur-mcp-claude", label: "Connecteur MCP / Claude", icon: Plug, content: connecteurMcpClaudeMd },
  
];


const KBViewer = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-gold" />
          Base de connaissance partagée (KB)
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Lecture seule — c'est exactement la base que l'IA doit consulter avant chaque action sur le projet.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="architecture">
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            {SECTIONS.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="gap-2">
                <s.icon className="h-4 w-4" />
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SECTIONS.map((s) => (
            <TabsContent key={s.id} value={s.id}>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:text-foreground prose-a:text-primary prose-table:w-full prose-th:text-left prose-th:border prose-th:border-border prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2 overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
              </div>

            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KBViewer;
