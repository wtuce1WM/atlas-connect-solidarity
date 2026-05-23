import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, BookMarked, CheckCircle2, Palette, Mic, Pin } from "lucide-react";

import architectureMd from "@/content/kb/architecture.md?raw";
import glossaireMd from "@/content/kb/glossaire.md?raw";
import decisionsMd from "@/content/kb/decisions.md?raw";
import conventionsMd from "@/content/kb/conventions-ui.md?raw";
import rechercheVocaleMd from "@/content/kb/recherche-vocale.md?raw";
import modePinIdsMd from "@/content/kb/mode-pinids.md?raw";

const SECTIONS = [
  { id: "architecture", label: "Règles d'architecture", icon: Building2, content: architectureMd },
  { id: "glossaire", label: "Glossaire projet", icon: BookMarked, content: glossaireMd },
  { id: "decisions", label: "Décisions techniques", icon: CheckCircle2, content: decisionsMd },
  { id: "conventions", label: "Conventions UI", icon: Palette, content: conventionsMd },
  { id: "recherche-vocale", label: "Recherche vocale", icon: Mic, content: rechercheVocaleMd },
  { id: "mode-pinids", label: "Mode pinIds (Search)", icon: Pin, content: modePinIdsMd },
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
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:text-foreground prose-a:text-primary">
                <ReactMarkdown>{s.content}</ReactMarkdown>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KBViewer;
