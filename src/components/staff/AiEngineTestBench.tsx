import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, AlertCircle, CheckCircle2, RotateCw, MousePointerClick } from "lucide-react";

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

/** Entrée curatée : suggestion ou relance réellement enregistrée en base. */
type CuratedEntry = {
  kind: "suggestion" | "followup";
  id: string;
  label: string;
  mode: string | null;
};

/** Diagnostic lu dans ai_conversation_turns après l'appel. */
type TurnDiag = {
  route: string | null;
  aiClass: string | null;
  confidence: number | null;
  fallbackReason: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  model: string | null;
  source: string | null;
  toolNames: string[];
};

type EngineCall = {
  text: string;
  latency: number;
  error: string | null;
  sessionId: string;
  diag: TurnDiag | null;
};

async function callEngine(
  slug: string,
  engine: "v1" | "v2",
  phrase: string,
  curated?: CuratedEntry | null,
): Promise<EngineCall> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${engine === "v2" ? "embed-ai-chat-v2" : "embed-ai-chat"}`;
  const sessionId = makeSessionId();
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
        sessionId,
        messageIndex: 0,
        suggestionId: curated?.kind === "suggestion" ? curated.id : null,
        followupId: curated?.kind === "followup" ? curated.id : null,
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
    return { text: deltas.join(""), latency: Math.round(performance.now() - t0), error: null, sessionId, diag: null };
  } catch (e) {
    return {
      text: "",
      latency: Math.round(performance.now() - t0),
      error: (e as Error).message,
      sessionId,
      diag: null,
    };
  }
}

/**
 * Lit le turn instrumenté correspondant à l'appel.
 * V1 stocke le sessionId dans `tools_called.session_id`, V2 dans `chat_id`.
 */
async function fetchDiag(engine: "v1" | "v2", sessionId: string): Promise<TurnDiag | null> {
  const base = supabase
    .from("ai_conversation_turns")
    .select(
      "route_taken,ai_class,classifier_confidence,fallback_reason,tokens_in,tokens_out,model,tools_called,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1);
  const q =
    engine === "v2"
      ? base.eq("chat_id", sessionId)
      : (base as any).filter("tools_called->>session_id", "eq", sessionId);
  const { data } = await (q as any);
  const row = (data as any[])?.[0];
  if (!row) return null;
  const tools = Array.isArray(row.tools_called?.tools) ? row.tools_called.tools : [];
  const withSource = tools.find((t: any) => t?.args?.source);
  return {
    route: row.route_taken ?? null,
    aiClass: row.ai_class ?? null,
    confidence: row.classifier_confidence ?? null,
    fallbackReason: row.fallback_reason ?? null,
    tokensIn: row.tokens_in ?? null,
    tokensOut: row.tokens_out ?? null,
    model: row.model ?? null,
    source: withSource?.args?.source ?? null,
    toolNames: tools.map((t: any) => t?.name).filter(Boolean),
  };
}

async function callWithDiag(
  slug: string,
  engine: "v1" | "v2",
  phrase: string,
  curated?: CuratedEntry | null,
): Promise<EngineCall> {
  const call = await callEngine(slug, engine, phrase, curated);
  // Le log est écrit en fin de stream côté serveur : petite latence de sécurité.
  await new Promise((r) => setTimeout(r, 900));
  let diag: TurnDiag | null = null;
  try {
    diag = await fetchDiag(engine, call.sessionId);
  } catch {
    /* diagnostic best-effort */
  }
  return { ...call, diag };
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

const CLASS_COLORS: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  C: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

const DiagLine = ({ diag }: { diag: TurnDiag | null }) => {
  if (!diag) return <div className="text-xs text-muted-foreground italic">route non loguée (ou log en retard)</div>;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Badge variant="outline" className={CLASS_COLORS[diag.aiClass || ""] || ""}>
        classe {diag.aiClass || "?"}
      </Badge>
      <Badge variant="secondary">route: {diag.route || "?"}</Badge>
      {diag.source && <Badge variant="outline">entrée: {diag.source}</Badge>}
      {diag.confidence != null && <Badge variant="outline">conf. {Number(diag.confidence).toFixed(2)}</Badge>}
      {diag.fallbackReason && (
        <Badge variant="outline" className="text-destructive border-destructive/40">
          {diag.fallbackReason}
        </Badge>
      )}
      <span className="text-muted-foreground">
        {(diag.tokensIn ?? 0) + (diag.tokensOut ?? 0)} tokens
        {diag.model ? ` · ${diag.model}` : " · aucun modèle"}
      </span>
      {diag.toolNames.length > 0 && (
        <span className="text-muted-foreground">· {diag.toolNames.join(", ")}</span>
      )}
    </div>
  );
};

type ResultRow = {
  id: string;
  phrase: string;
  curatedLabel?: string | null;
  v1: EngineCall;
  v2: EngineCall;
};

type SlugOption = { id: string; name: string; slug: string | null; city: string | null };

const AiEngineTestBench = () => {
  const [slug, setSlug] = useState("");
  const [custom, setCustom] = useState("");
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [curated, setCurated] = useState<CuratedEntry[]>([]);
  const [slugOptions, setSlugOptions] = useState<SlugOption[]>([]);
  const [slugOpen, setSlugOpen] = useState(false);

  // Auto-complete du slug hôte (nom ou slug)
  useEffect(() => {
    const term = slug.trim();
    if (term.length < 2) {
      setSlugOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,slug,city")
        .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(8);
      setSlugOptions(((data as any[]) || []).map((b) => ({ id: b.id, name: b.name, slug: b.slug, city: b.city })));
    }, 250);
    return () => clearTimeout(t);
  }, [slug]);


  useEffect(() => {
    (async () => {
      const [{ data: sugg }, { data: fups }] = await Promise.all([
        supabase
          .from("embed_ai_suggestions")
          .select("id,label_fr,mode,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("embed_ai_followups")
          .select("id,label_fr,mode,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      const list: CuratedEntry[] = [
        ...((sugg as any[]) || []).map((s) => ({
          kind: "suggestion" as const,
          id: s.id,
          label: s.label_fr,
          mode: s.mode ?? null,
        })),
        ...((fups as any[]) || []).map((f) => ({
          kind: "followup" as const,
          id: f.id,
          label: f.label_fr,
          mode: f.mode ?? null,
        })),
      ];
      list.sort((a, b) => (a.label || "").localeCompare(b.label || "", "fr", { sensitivity: "base" }));
      setCurated(list);
    })();
  }, []);

  const runOne = async (id: string, phrase: string, entry?: CuratedEntry | null) => {
    if (!slug.trim()) {
      toast.error("Renseigne le slug de l'établissement hôte");
      return;
    }
    setBusyId(id);
    const [v1, v2] = await Promise.all([
      callWithDiag(slug.trim(), "v1", phrase, entry),
      callWithDiag(slug.trim(), "v2", phrase, entry),
    ]);
    setResults((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return [{ id, phrase, curatedLabel: entry ? `${entry.kind} · ${entry.mode || "sans mode"}` : null, v1, v2 }, ...next];
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
        callWithDiag(slug.trim(), "v1", item.phrase),
        callWithDiag(slug.trim(), "v2", item.phrase),
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
            Chaque test affiche la <strong>classe A/B/C</strong>, la <strong>route</strong> réellement exécutée et
            l'<strong>entrée</strong> utilisée (suggestion / relance / intention détectée), lue dans les logs de tours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1.5 relative">
              <Label htmlFor="test-slug">Slug de l'établissement hôte</Label>
              <Input
                id="test-slug"
                placeholder="ex: riad-dar-najat"
                value={slug}
                autoComplete="off"
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugOpen(true);
                }}
                onFocus={() => setSlugOpen(true)}
                onBlur={() => setTimeout(() => setSlugOpen(false), 120)}
                disabled={running}
              />
              {slugOpen && slugOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover text-popover-foreground rounded-md border shadow-lg max-h-64 overflow-y-auto">
                  {slugOptions.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSlug(o.slug || "");
                        setSlugOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{o.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[o.slug, o.city].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={run} disabled={running || !slug.trim()} className="w-full sm:w-auto">
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Lancer la batterie
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end border-t pt-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="test-custom">Phrase libre (texte saisi → route devinée)</Label>
              <Input
                id="test-custom"
                placeholder="ex: un bar avec vue sur la Koutoubia, pas un hotel"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim() && slug.trim() && !busyId && !running) {
                    runOne(`libre · ${new Date().toLocaleTimeString()}`, custom.trim());
                  }
                }}
                disabled={running}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => runOne(`libre · ${new Date().toLocaleTimeString()}`, custom.trim())}
              disabled={running || !!busyId || !slug.trim() || !custom.trim()}
              className="w-full sm:w-auto"
            >
              {busyId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Tester cette phrase
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.id}</Badge>
                    <span className="font-medium text-sm flex-1">{r.phrase}</span>
                    {r.curatedLabel && <Badge variant="secondary">{r.curatedLabel}</Badge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runOne(r.id, r.phrase)}
                      disabled={running || !!busyId}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5 text-xs">Relancer</span>
                    </Button>
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
                      <DiagLine diag={r.v1.diag} />
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
                      <DiagLine diag={r.v2.diag} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            Entrées curatées réelles (suggestions & relances du widget)
          </CardTitle>
          <CardDescription>
            Un clic simule le clic dans le widget : l'<code>id</code> est envoyé au moteur, la route est donc imposée
            (pas de détection par mots-clés). Compare avec la même phrase tapée en texte libre pour mettre en évidence
            Route vs Suggestion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {curated.length === 0 && <span className="text-xs text-muted-foreground">Aucune entrée active.</span>}
            {curated.map((c) => (
              <Button
                key={`${c.kind}-${c.id}`}
                size="sm"
                variant="outline"
                disabled={running || !!busyId || !slug.trim()}
                onClick={() => runOne(`${c.kind} · ${c.label}`, c.label, c)}
                className="h-auto py-1.5 text-xs"
              >
                {busyId === `${c.kind} · ${c.label}` ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : null}
                <span className="mr-1.5 opacity-60">{c.kind === "suggestion" ? "sugg." : "relance"}</span>
                {c.label}
                <span className="ml-1.5 opacity-60">{c.mode ? `→ ${c.mode}` : "→ auto"}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiEngineTestBench;
