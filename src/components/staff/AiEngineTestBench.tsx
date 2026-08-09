import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, AlertCircle, CheckCircle2 } from "lucide-react";

const PHRASES = [
  { id: "exclusion", phrase: "un bar avec vue sur la Koutoubia, pas un hotel" },
  { id: "panorama", phrase: "un bar avec vue sur l'Atlas" },
  { id: "proximity", phrase: "Que faire à proximité ?" },
  { id: "booking", phrase: "On peut réserver en ligne ?" },
  { id: "weather", phrase: "Quel temps fait-il à Essaouira ?" },
  { id: "category", phrase: "un restaurant italien" },
  { id: "negation", phrase: "un restaurant, pas français" },
  { id: "city", phrase: "hotel à Essaouira" },
  { id: "price", phrase: "un hotel pas cher à Marrakech" },
  { id: "poi", phrase: "café près de la place Jemaa el-Fna" },
  { id: "ambiguous", phrase: "je cherche un endroit sympa pour ce soir" },
  { id: "fallback", phrase: "conseille-moi une sortie romantique à Marrakech" },
];

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function callEngine(
  slug: string,
  engine: "v1" | "v2",
  phrase: string,
): Promise<{ text: string; latency: number; error: string | null }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${engine === "v2" ? "embed-ai-chat-v2" : "embed-ai-chat"}`;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: phrase }],
        businessSlug: slug,
        language: "fr",
        sessionId: makeSessionId(),
        messageIndex: 0,
        suggestionId: null,
        followupId: null,
        scope: null,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const deltas: string[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      try {
        const obj = JSON.parse(trimmed.slice(5).trim());
        if (obj.type === "text-delta" && typeof obj.delta === "string") deltas.push(obj.delta);
      } catch {
        /* ignore malformed stream frames */
      }
    }
    return { text: deltas.join(""), latency: Math.round(performance.now() - t0), error: null };
  } catch (e) {
    return { text: "", latency: Math.round(performance.now() - t0), error: (e as Error).message };
  }
}

function stripMarkers(text: string) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resultSummary(text: string) {
  const hasMap = /<!--SHOW_ON_MAP:/.test(text);
  const known = text.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?])-->/);
  let count = 0;
  if (known) {
    try {
      const parsed = JSON.parse(known[1]);
      count = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      /* ignore */
    }
  }
  return { hasMap, count };
}

type ResultRow = {
  id: string;
  phrase: string;
  v1: { text: string; latency: number; error: string | null };
  v2: { text: string; latency: number; error: string | null };
};

const AiEngineTestBench = () => {
  const [slug, setSlug] = useState("");
  const [custom, setCustom] = useState("");
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);

  const runOne = async (id: string, phrase: string) => {
    if (!slug.trim()) {
      toast.error("Renseigne le slug de l'établissement hôte");
      return;
    }
    setBusyId(id);
    const [v1, v2] = await Promise.all([
      callEngine(slug.trim(), "v1", phrase),
      callEngine(slug.trim(), "v2", phrase),
    ]);
    setResults((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return [{ id, phrase, v1, v2 }, ...next];
    });
    setBusyId(null);
  };

  const run = async () => {
    if (!slug.trim()) {
      toast.error("Renseigne le slug de l'établissement hôte");
      return;
    }
    setRunning(true);
    setResults([]);
    const out: ResultRow[] = [];
    for (const item of PHRASES) {
      const [v1, v2] = await Promise.all([
        callEngine(slug.trim(), "v1", item.phrase),
        callEngine(slug.trim(), "v2", item.phrase),
      ]);
      out.push({ id: item.id, phrase: item.phrase, v1, v2 });
      setResults([...out]);
    }
    setRunning(false);
    toast.success("Batterie de test terminée");
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test bench V1 vs V2
          </CardTitle>
          <CardDescription>
            Lance les 12 phrases du plan de test contre les deux moteurs. Les appels sont faits directement aux
            edge functions, les réponses sont affichées côte à côte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="test-slug">Slug de l'établissement hôte</Label>
              <Input
                id="test-slug"
                placeholder="ex: riad-dar-najat"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={running}
              />
            </div>
            <Button onClick={run} disabled={running || !slug.trim()} className="w-full sm:w-auto">
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Lancer la batterie
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Plan de test : <code>docs/ai/plan-test-v1v2.md</code>
          </p>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.map((r) => {
              const v1summary = resultSummary(r.v1.text);
              const v2summary = resultSummary(r.v2.text);
              return (
                <div key={r.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.id}</Badge>
                    <span className="font-medium text-sm">{r.phrase}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-blue-600">v1</span>
                        <span className="text-muted-foreground">{r.v1.latency} ms</span>
                        {r.v1.error ? (
                          <span className="text-destructive flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" /> {r.v1.error}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v1summary.count > 0 && `${v1summary.count} établissement(s) mentionné(s)`}
                        {v1summary.hasMap && " · carte incluse"}
                      </div>
                      <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                        {stripMarkers(r.v1.text) || (r.v1.error ? "—" : "(vide)")}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-purple-600">v2</span>
                        <span className="text-muted-foreground">{r.v2.latency} ms</span>
                        {r.v2.error ? (
                          <span className="text-destructive flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" /> {r.v2.error}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v2summary.count > 0 && `${v2summary.count} établissement(s) mentionné(s)`}
                        {v2summary.hasMap && " · carte incluse"}
                      </div>
                      <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                        {stripMarkers(r.v2.text) || (r.v2.error ? "—" : "(vide)")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AiEngineTestBench;
