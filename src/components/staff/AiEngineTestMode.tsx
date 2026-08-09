import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, FlaskConical } from "lucide-react";

const FLAG_KEY = "embed_ai_engine";

type TurnRow = {
  surface: string | null;
  ai_class: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  latency_ms_total: number | null;
  latency_ms_first_token: number | null;
  had_error: boolean | null;
  results_count: number | null;
};

type Stats = {
  turns: number;
  classA: number;
  classB: number;
  classC: number;
  tokens: number;
  cost: number;
  p50Latency: number;
  errorRate: number;
  zeroResults: number;
};

const emptyStats = (): Stats => ({
  turns: 0, classA: 0, classB: 0, classC: 0, tokens: 0, cost: 0,
  p50Latency: 0, errorRate: 0, zeroResults: 0,
});

function computeStats(rows: TurnRow[]): Stats {
  if (!rows.length) return emptyStats();
  const lat = rows.map((r) => r.latency_ms_total || 0).filter((v) => v > 0).sort((a, b) => a - b);
  return {
    turns: rows.length,
    classA: rows.filter((r) => r.ai_class === "A").length,
    classB: rows.filter((r) => r.ai_class === "B").length,
    classC: rows.filter((r) => r.ai_class === "C").length,
    tokens: rows.reduce((s, r) => s + (r.tokens_in || 0) + (r.tokens_out || 0), 0),
    cost: rows.reduce((s, r) => s + Number(r.cost_usd || 0), 0),
    p50Latency: lat.length ? lat[Math.floor(lat.length / 2)] : 0,
    errorRate: rows.filter((r) => r.had_error).length / rows.length,
    zeroResults: rows.filter((r) => (r.results_count ?? null) === 0).length,
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const AiEngineTestMode = () => {
  const [engine, setEngine] = useState<"v1" | "v2">("v1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<TurnRow[]>([]);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const [{ data: setting }, { data: turns }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", FLAG_KEY).maybeSingle(),
      supabase
        .from("ai_conversation_turns")
        .select("surface, ai_class, tokens_in, tokens_out, cost_usd, latency_ms_total, latency_ms_first_token, had_error, results_count")
        .in("surface", ["embed", "embed_v2"])
        .gte("created_at", since)
        .limit(5000),
    ]);
    setEngine((setting?.value as "v1" | "v2") === "v2" ? "v2" : "v1");
    setRows((turns as TurnRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const v1 = useMemo(() => computeStats(rows.filter((r) => r.surface === "embed")), [rows]);
  const v2 = useMemo(() => computeStats(rows.filter((r) => r.surface === "embed_v2")), [rows]);

  const toggle = async (next: boolean) => {
    const value = next ? "v2" : "v1";
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: FLAG_KEY, value }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEngine(value);
    toast.success(`Widget /embed/ask basculé sur le moteur ${value}`);
  };

  const Row = ({ label, a, b, fmt }: { label: string; a: number; b: number; fmt?: (n: number) => string }) => {
    const f = fmt || ((n: number) => String(Math.round(n)));
    return (
      <tr className="border-t">
        <td className="py-2 pr-4 text-muted-foreground">{label}</td>
        <td className="py-2 pr-4 font-medium">{f(a)}</td>
        <td className="py-2 font-medium">{f(b)}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            Mode test — moteur du widget /embed/ask
          </CardTitle>
          <CardDescription>
            Le moteur v2 est une réécriture complète au-dessus de la matrice A/B/C. Il tourne en parallèle de
            l'existant : la v1 reste intacte, chaque tour est logué sous la surface <code>embed_v2</code> pour
            comparaison. Le paramètre <code>?engine=v2</code> dans l'URL du widget force la v2 sans toucher au réglage global.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Switch id="engine-v2" checked={engine === "v2"} onCheckedChange={toggle} disabled={saving} />
              <Label htmlFor="engine-v2">Activer le moteur v2 pour tous les widgets</Label>
              <Badge variant={engine === "v2" ? "default" : "secondary"}>Actif : {engine}</Badge>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparatif 14 derniers jours</CardTitle>
          <CardDescription>Mêmes métriques, deux moteurs. Zéro résultat et taux d'erreur sont les signaux à surveiller.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Métrique</th>
                <th className="pb-2 pr-4">v1 (embed)</th>
                <th className="pb-2">v2 (embed_v2)</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Tours" a={v1.turns} b={v2.turns} />
              <Row label="Classe A (déterministe)" a={v1.classA} b={v2.classA} />
              <Row label="Classe B (classifieur)" a={v1.classB} b={v2.classB} />
              <Row label="Classe C (génératif)" a={v1.classC} b={v2.classC} />
              <Row label="Tokens totaux" a={v1.tokens} b={v2.tokens} />
              <Row label="Coût USD" a={v1.cost} b={v2.cost} fmt={(n) => `$${n.toFixed(4)}`} />
              <Row label="Latence médiane" a={v1.p50Latency} b={v2.p50Latency} fmt={(n) => `${Math.round(n)} ms`} />
              <Row label="Taux d'erreur" a={v1.errorRate} b={v2.errorRate} fmt={pct} />
              <Row label="Tours à zéro résultat" a={v1.zeroResults} b={v2.zeroResults} />
            </tbody>
          </table>
          {!v2.turns && (
            <p className="mt-3 text-xs text-muted-foreground">
              Aucun tour v2 encore enregistré. Ouvre un widget avec <code>?engine=v2</code> pour générer des données.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AiEngineTestMode;
