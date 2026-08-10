import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Code2, Search, Brain, BookOpen, Sparkles, Repeat } from "lucide-react";
import AiSuggestionsManagement from "@/components/staff/AiSuggestionsManagement";
import AiFollowupsManagement from "@/components/staff/AiFollowupsManagement";
import ClubFollowupPromptEditor from "@/components/staff/ClubFollowupPromptEditor";
import EmbedAiHowItWorks from "@/components/staff/EmbedAiHowItWorks";

type Surface = "club" | "embed" | "search";
type Kind = "suggestions" | "followups" | "extra";

const SURFACES: { value: Surface; label: string; icon: React.ElementType }[] = [
  { value: "club", label: "Club", icon: MessageSquare },
  { value: "embed", label: "Embed (widget)", icon: Code2 },
  { value: "search", label: "Search", icon: Search },
];

const AiSuggestionsHub = () => {
  const [surface, setSurface] = useState<Surface>("embed");
  const [kind, setKind] = useState<Kind>("suggestions");

  const extraLabel =
    surface === "club" ? "Prompt follow-ups" : surface === "embed" ? "Fonctionnement" : null;
  const ExtraIcon = surface === "club" ? Brain : BookOpen;
  const effectiveKind: Kind = kind === "extra" && !extraLabel ? "suggestions" : kind;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Surface</span>
            {SURFACES.map((s) => {
              const Icon = s.icon;
              return (
                <Button
                  key={s.value}
                  size="sm"
                  variant={surface === s.value ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setSurface(s.value)}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Contenu</span>
            <Button
              size="sm"
              variant={effectiveKind === "suggestions" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setKind("suggestions")}
            >
              <Sparkles className="h-4 w-4" />
              Suggestions
            </Button>
            <Button
              size="sm"
              variant={effectiveKind === "followups" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setKind("followups")}
            >
              <Repeat className="h-4 w-4" />
              Relances
            </Button>
            {extraLabel && (
              <Button
                size="sm"
                variant={effectiveKind === "extra" ? "default" : "outline"}
                className="gap-2"
                onClick={() => setKind("extra")}
              >
                <ExtraIcon className="h-4 w-4" />
                {extraLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {effectiveKind === "suggestions" && <AiSuggestionsManagement surface={surface} />}
      {effectiveKind === "followups" && <AiFollowupsManagement surface={surface} />}
      {effectiveKind === "extra" && surface === "club" && <ClubFollowupPromptEditor />}
      {effectiveKind === "extra" && surface === "embed" && <EmbedAiHowItWorks />}
    </div>
  );
};

export default AiSuggestionsHub;
