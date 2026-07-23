import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertCircle } from "lucide-react";

type Turn = {
  id: string;
  created_at: string;
  user_id: string | null;
  chat_id: string | null;
  user_message: string | null;
  intent_classified: string | null;
  route_taken: string | null;
  latency_ms_total: number | null;
  latency_ms_first_token: number | null;
  latency_ms_synth: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  city_active: string | null;
  city_detected: string | null;
  results_count: number | null;
  results_shown: number | null;
  had_error: boolean;
  error_message: string | null;
  language: string | null;
};

const RANGES = [
  { value: "1h", label: "1 heure", ms: 60 * 60 * 1000 },
  { value: "24h", label: "24 heures", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 jours", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 jours", ms: 30 * 24 * 60 * 60 * 1000 },
];

function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export default function AiConversationPerf() {
  const [range, setRange] = useState("24h");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [rows, setRows] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const cfg = RANGES.find((r) => r.value === range)!;
    const since = new Date(Date.now() - cfg.ms).toISOString();
    const { data, error } = await supabase
      .from("ai_conversation_turns")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) console.error(error);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const filtered = useMemo(
    () => routeFilter === "all" ? rows : rows.filter((r) => r.route_taken === routeFilter),
    [rows, routeFilter]
  );

  const routes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.route_taken && set.add(r.route_taken));
    return Array.from(set).sort();
  }, [rows]);

  const stats = useMemo(() => {
    const latencies = filtered.map((r) => r.latency_ms_total || 0).filter((n) => n > 0);
    const errors = filtered.filter((r) => r.had_error).length;
    const totalCost = filtered.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const totalTokensIn = filtered.reduce((s, r) => s + (r.tokens_in || 0), 0);
    const totalTokensOut = filtered.reduce((s, r) => s + (r.tokens_out || 0), 0);
    return {
      count: filtered.length,
      p50: pct(latencies, 50),
      p95: pct(latencies, 95),
      errRate: filtered.length ? (errors / filtered.length) * 100 : 0,
      cost: totalCost,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
    };
  }, [filtered]);

  const byRoute = useMemo(() => {
    const map = new Map<string, { count: number; latencies: number[]; errors: number; cost: number; tokens: number }>();
    for (const r of filtered) {
      const k = r.route_taken || "unknown";
      const entry = map.get(k) || { count: 0, latencies: [], errors: 0, cost: 0, tokens: 0 };
      entry.count++;
      if (r.latency_ms_total) entry.latencies.push(r.latency_ms_total);
      if (r.had_error) entry.errors++;
      entry.cost += Number(r.cost_usd) || 0;
      entry.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      map.set(k, entry);
    }
    const total = filtered.length || 1;
    // Fallback = tours où le router déterministe n'a pas traité et l'appel LLM
    // a dû tourner (router_direct = LLM synth d'une recherche déterministe ;
    // tool_loop = boucle outils LLM complète).
    const LLM_ROUTES = new Set(["router_direct", "tool_loop", "unknown"]);
    return Array.from(map.entries())
      .map(([route, v]) => ({
        route,
        count: v.count,
        share: (v.count / total) * 100,
        p50: pct(v.latencies, 50),
        p95: pct(v.latencies, 95),
        errRate: v.count ? (v.errors / v.count) * 100 : 0,
        avgCost: v.count ? v.cost / v.count : 0,
        avgTokens: v.count ? v.tokens / v.count : 0,
        isFallback: LLM_ROUTES.has(route),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const fallbackRate = useMemo(() => {
    const fb = byRoute.filter((r) => r.isFallback).reduce((s, r) => s + r.count, 0);
    return filtered.length ? (fb / filtered.length) * 100 : 0;
  }, [byRoute, filtered]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Performance Conversations IA</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les routes</SelectItem>
                {routes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <Metric label="Tours" value={stats.count.toString()} />
            <Metric label="Latence p50" value={`${stats.p50} ms`} />
            <Metric label="Latence p95" value={`${stats.p95} ms`} />
            <Metric label="Erreurs" value={`${stats.errRate.toFixed(1)}%`} />
            <Metric label="Fallback LLM" value={`${fallbackRate.toFixed(1)}%`} />
            <Metric label="Tokens in/out" value={`${stats.tokensIn}/${stats.tokensOut}`} />
            <Metric label="Coût cumulé" value={`$${stats.cost.toFixed(4)}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Répartition par route</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Route</th>
                <th className="py-2">Tours</th>
                <th className="py-2">Part</th>
                <th className="py-2">p50</th>
                <th className="py-2">p95</th>
                <th className="py-2">Erreurs</th>
                <th className="py-2">Coût moy.</th>
                <th className="py-2">Tokens moy.</th>
                <th className="py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {byRoute.map((r) => (
                <tr key={r.route} className="border-t">
                  <td className="py-2"><Badge variant="outline">{r.route}</Badge></td>
                  <td className="py-2">{r.count}</td>
                  <td className="py-2">{r.share.toFixed(1)}%</td>
                  <td className="py-2">{r.p50} ms</td>
                  <td className="py-2">{r.p95} ms</td>
                  <td className="py-2">{r.errRate.toFixed(1)}%</td>
                  <td className="py-2">${r.avgCost.toFixed(5)}</td>
                  <td className="py-2">{Math.round(r.avgTokens)}</td>
                  <td className="py-2">
                    {r.isFallback
                      ? <Badge variant="destructive">LLM</Badge>
                      : <Badge variant="secondary">Détermin.</Badge>}
                  </td>
                </tr>
              ))}
              {!byRoute.length && (
                <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Aucune donnée sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Derniers tours (100)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Heure</th>
                  <th className="py-2">Intent</th>
                  <th className="py-2">Route</th>
                  <th className="py-2">Ville</th>
                  <th className="py-2">Latence</th>
                  <th className="py-2">Résultats</th>
                  <th className="py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                    <td className="py-2">{r.intent_classified || "—"}</td>
                    <td className="py-2"><Badge variant="outline" className="text-[10px]">{r.route_taken || "—"}</Badge></td>
                    <td className="py-2">{r.city_detected || r.city_active || "—"}</td>
                    <td className="py-2">{r.latency_ms_total || 0} ms</td>
                    <td className="py-2">{r.results_shown ?? "—"}{r.results_count != null ? `/${r.results_count}` : ""}</td>
                    <td className="py-2 max-w-md">
                      <div className="truncate" title={r.user_message || ""}>{r.user_message || "—"}</div>
                      {r.had_error && (
                        <div className="flex items-center gap-1 text-destructive mt-1">
                          <AlertCircle className="h-3 w-3" />
                          <span className="truncate">{r.error_message}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded border bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
