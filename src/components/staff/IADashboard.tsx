import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, MessageSquare, BarChart3, BookOpen, Brain, ArrowRight,
  Loader2, DollarSign, Activity, AlertTriangle, Zap, CheckCircle2, TrendingUp,
  Cpu, Bot, Search, LayoutGrid, Timer,
} from "lucide-react";

interface Props {
  onNavigateTab: (tab: string) => void;
}

type UsageRow = {
  created_at: string;
  context: string;
  status: string;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
};

type TurnRow = {
  id: string;
  created_at: string;
  surface: string | null;
  ai_class: "A" | "B" | "C" | null;
  route_taken: string | null;
  intent_classified: string | null;
  classifier_confidence: number | null;
  latency_ms_total: number | null;
  latency_ms_first_token: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  had_error: boolean;
  stream_completed: boolean | null;
  user_message: string | null;
};

const PERIODS = [
  { label: "24 heures", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
];

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtUsd4 = (n: number) => `$${n.toFixed(4)}`;
const fmtNum = (n: number) => n.toLocaleString("fr-FR");

const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const CLASS_META: Record<string, { label: string; color: string; desc: string }> = {
  A: { label: "Classe A", color: "bg-green-500", desc: "Déterministe, zéro token" },
  B: { label: "Classe B", color: "bg-amber-500", desc: "Classifieur LLM" },
  C: { label: "Classe C", color: "bg-rose-500", desc: "Synthèse LLM" },
};

const SURFACE_META: Record<string, { label: string; icon: any }> = {
  club: { label: "Club", icon: MessageSquare },
  embed: { label: "Embed", icon: LayoutGrid },
  search: { label: "Search", icon: Search },
};

export default function IADashboard({ onNavigateTab }: Props) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [days, setDays] = useState(7);
  const [counts, setCounts] = useState({ aiConfig: 0, suggestions: 0, kb: 0, knowledge: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [u, t, aiCfg, sug, kb, know] = await Promise.all([
        supabase.from("ai_usage_events")
          .select("created_at,context,status,total_tokens,estimated_cost_usd")
          .gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        supabase.from("ai_conversation_turns")
          .select("id,created_at,surface,ai_class,route_taken,intent_classified,classifier_confidence,latency_ms_total,latency_ms_first_token,tokens_in,tokens_out,cost_usd,had_error,stream_completed,user_message")
          .gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        supabase.from("ai_config").select("id", { count: "exact", head: true }),
        supabase.from("ai_suggestions").select("id", { count: "exact", head: true }),
        supabase.from("knowledge_entries").select("id", { count: "exact", head: true })
          .in("category", ["search-engine", "voice-search", "opening-hours", "UI", "architecture", "business-rules", "bug-fix", "tech"]),
        supabase.from("knowledge_entries").select("id", { count: "exact", head: true })
          .in("category", ["general", "tourisme", "culture", "gastronomie"]),
      ]);
      setUsage((u.data as any) || []);
      setTurns((t.data as any) || []);
      setCounts({
        aiConfig: aiCfg.count || 0,
        suggestions: sug.count || 0,
        kb: kb.count || 0,
        knowledge: know.count || 0,
      });
      setLoading(false);
    })();
  }, [days]);

  const kpis = useMemo(() => {
    const cost = usage.reduce((s, r) => s + (Number(r.estimated_cost_usd) || 0), 0);
    const tokens = usage.reduce((s, r) => s + (r.total_tokens || 0), 0);
    const errors = usage.filter(r => r.status === "error").length;
    const errRate = usage.length ? (errors / usage.length) * 100 : 0;

    const latencies = turns.map(r => r.latency_ms_total || 0).filter(x => x > 0);
    const perfErrors = turns.filter(r => r.had_error).length;
    const perfErrRate = turns.length ? (perfErrors / turns.length) * 100 : 0;
    const turnCost = turns.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const turnTokens = turns.reduce((s, r) => s + (r.tokens_in || 0) + (r.tokens_out || 0), 0);

    return {
      cost, tokens,
      calls: usage.length,
      errors, errRate,
      turns: turns.length,
      turnCost,
      turnTokens,
      p50: pct(latencies, 50),
      p95: pct(latencies, 95),
      perfErrors, perfErrRate,
    };
  }, [usage, turns]);

  const byClass = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; tokens: number; errors: number; latencies: number[]; ttft: number[] }>();
    for (const r of turns) {
      const k = r.ai_class || "unknown";
      const cur = map.get(k) || { count: 0, cost: 0, tokens: 0, errors: 0, latencies: [], ttft: [] };
      cur.count++;
      cur.cost += Number(r.cost_usd) || 0;
      cur.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      if (r.had_error) cur.errors++;
      if (r.latency_ms_total) cur.latencies.push(r.latency_ms_total);
      if (r.latency_ms_first_token) cur.ttft.push(r.latency_ms_first_token);
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({
        key: k,
        ...v,
        p50: pct(v.latencies, 50),
        errRate: v.count ? (v.errors / v.count) * 100 : 0,
        avgCost: v.count ? v.cost / v.count : 0,
        avgTokens: v.count ? v.tokens / v.count : 0,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [turns]);

  const bySurface = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; tokens: number; errors: number; latencies: number[]; aCount: number; bCount: number; cCount: number }>();
    for (const r of turns) {
      const k = r.surface || "unknown";
      const cur = map.get(k) || { count: 0, cost: 0, tokens: 0, errors: 0, latencies: [], aCount: 0, bCount: 0, cCount: 0 };
      cur.count++;
      cur.cost += Number(r.cost_usd) || 0;
      cur.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      if (r.had_error) cur.errors++;
      if (r.latency_ms_total) cur.latencies.push(r.latency_ms_total);
      if (r.ai_class === "A") cur.aCount++;
      else if (r.ai_class === "B") cur.bCount++;
      else if (r.ai_class === "C") cur.cCount++;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({
        key: k,
        ...v,
        p50: pct(v.latencies, 50),
        errRate: v.count ? (v.errors / v.count) * 100 : 0,
        coverageA: v.count ? (v.aCount / v.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [turns]);

  const byRoute = useMemo(() => {
    const map = new Map<string, { count: number; aiClass: string | null; cost: number; tokens: number; errors: number; latencies: number[] }>();
    for (const r of turns) {
      const k = r.route_taken || "unknown";
      const cur = map.get(k) || { count: 0, aiClass: r.ai_class, cost: 0, tokens: 0, errors: 0, latencies: [] };
      cur.count++;
      cur.cost += Number(r.cost_usd) || 0;
      cur.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      if (r.had_error) cur.errors++;
      if (r.latency_ms_total) cur.latencies.push(r.latency_ms_total);
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({
        route: k,
        ...v,
        p50: pct(v.latencies, 50),
        errRate: v.count ? (v.errors / v.count) * 100 : 0,
        avgCost: v.count ? v.cost / v.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [turns]);

  const byDay = useMemo(() => {
    const map = new Map<string, { A: number; B: number; C: number; cost: number; tokens: number }>();
    for (const r of turns) {
      const d = r.created_at.slice(0, 10);
      const cur = map.get(d) || { A: 0, B: 0, C: 0, cost: 0, tokens: 0 };
      if (r.ai_class === "A" || r.ai_class === "B" || r.ai_class === "C") cur[r.ai_class]++;
      cur.cost += Number(r.cost_usd) || 0;
      cur.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      map.set(d, cur);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [turns]);

  const abCoverage = useMemo(() => {
    const total = turns.length || 1;
    const ab = turns.filter(r => r.ai_class === "A" || r.ai_class === "B").length;
    return (ab / total) * 100;
  }, [turns]);

  const alerts = useMemo(() => {
    const list: { message: string; tab: string; severity: "warning" | "info" }[] = [];
    if (kpis.errRate > 5) list.push({ message: `Taux d'erreur IA élevé : ${kpis.errRate.toFixed(1)}% sur ${days}j`, tab: "ai-usage", severity: "warning" });
    if (kpis.p95 > 8000) list.push({ message: `Latence P95 dégradée : ${(kpis.p95 / 1000).toFixed(1)}s`, tab: "ai-perf", severity: "warning" });
    if (kpis.cost > 20) list.push({ message: `Coût ${days}j supérieur à $20 : ${fmtUsd(kpis.cost)}`, tab: "ai-usage", severity: "info" });
    if (abCoverage < 40) list.push({ message: `Couverture A/B faible : ${abCoverage.toFixed(1)}% — opportunité d'économiser du Classe C`, tab: "ai-perf", severity: "info" });
    return list;
  }, [kpis, days, abCoverage]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard IA</h2>
          <p className="text-sm text-muted-foreground">Vue consolidée des coûts, routes et classes A/B/C.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Santé IA ({days} derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <button key={i} onClick={() => onNavigateTab(a.tab)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${a.severity === "warning" ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className="text-sm flex-1">{a.message}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Tous les indicateurs IA sont dans le vert sur {days} jours.
          </CardContent>
        </Card>
      )}

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-usage")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{fmtUsd(kpis.cost)}</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Coût IA (events)</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-perf")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{fmtUsd4(kpis.turnCost)}</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Coût conversations</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-perf")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{fmtNum(kpis.turns)}</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Tours A/B/C</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-perf")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{(kpis.p95 / 1000).toFixed(1)}s</div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Latence P95</p>
          </CardContent>
        </Card>
      </div>

      {/* Matrice A/B/C */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {["A", "B", "C"].map(cls => {
          const row = byClass.find(x => x.key === cls) || { count: 0, cost: 0, tokens: 0, errors: 0, p50: 0, errRate: 0, avgCost: 0, avgTokens: 0 };
          const meta = CLASS_META[cls];
          return (
            <Card key={cls} className="overflow-hidden">
              <div className={`h-1 ${meta.color}`} />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {cls === "A" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : cls === "B" ? <Cpu className="h-4 w-4 text-amber-600" /> : <Bot className="h-4 w-4 text-rose-600" />}
                    <span className="font-semibold">{meta.label}</span>
                  </div>
                  <Badge variant={cls === "A" ? "default" : "outline"}>{row.count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{meta.desc}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><div className="text-xs text-muted-foreground">Coût</div><div className="font-medium">{fmtUsd4(row.cost)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Tokens</div><div className="font-medium">{fmtNum(row.tokens)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Coût moy.</div><div className="font-medium">{fmtUsd4(row.avgCost)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Tokens moy.</div><div className="font-medium">{Math.round(row.avgTokens)}</div></div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>p50 latence : {row.p50 ? `${(row.p50 / 1000).toFixed(2)}s` : "—"}</span>
                  <span className={row.errRate > 5 ? "text-destructive" : ""}>erreurs : {row.errRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Par surface */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Par surface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bySurface.length === 0 && <div className="text-sm text-muted-foreground">Aucune donnée.</div>}
            {bySurface.map(s => {
              const meta = SURFACE_META[s.key] || { label: s.key, icon: Activity };
              const Icon = meta.icon;
              return (
                <button key={s.key} onClick={() => onNavigateTab("ai-perf")} className="w-full text-left hover:bg-muted/50 rounded p-2 transition-colors">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {meta.label}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{fmtUsd4(s.cost)} · {fmtNum(s.tokens)} tokens</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <span>{s.count} tours</span>
                    <span>•</span>
                    <span className="text-green-600">A {s.aCount}</span>
                    <span className="text-amber-600">B {s.bCount}</span>
                    <span className="text-rose-600">C {s.cCount}</span>
                    <span>•</span>
                    <span>couverture A/B {s.coverageA.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden flex">
                    {s.count > 0 && (
                      <>
                        <div className="h-full bg-green-500" style={{ width: `${(s.aCount / s.count) * 100}%` }} />
                        <div className="h-full bg-amber-500" style={{ width: `${(s.bCount / s.count) * 100}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${(s.cCount / s.count) * 100}%` }} />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Par route */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Par route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byRoute.length === 0 && <div className="text-sm text-muted-foreground">Aucune donnée.</div>}
            {byRoute.map(r => {
              const meta = r.aiClass ? CLASS_META[r.aiClass] : null;
              const max = byRoute[0]?.count || 1;
              return (
                <button key={r.route} onClick={() => onNavigateTab("ai-perf")} className="w-full text-left hover:bg-muted/50 rounded p-1.5 transition-colors">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate flex items-center gap-2">
                      {r.route}
                      {meta && <span className={`inline-block w-2 h-2 rounded-full ${meta.color}`} />}
                      {r.aiClass && <Badge variant="outline" className="text-[10px]">{r.aiClass}</Badge>}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">{fmtNum(r.count)} · {fmtUsd4(r.avgCost)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Évolution par jour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution par jour (A/B/C)</CardTitle>
        </CardHeader>
        <CardContent>
          {byDay.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune donnée.</div>
          ) : (
            <div className="space-y-2">
              {byDay.map(([d, v]) => {
                const total = v.A + v.B + v.C || 1;
                return (
                  <div key={d} className="flex items-center gap-3 text-sm">
                    <div className="w-24 shrink-0 text-muted-foreground">{d}</div>
                    <div className="flex-1 h-2 bg-muted rounded overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${(v.A / total) * 100}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${(v.B / total) * 100}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${(v.C / total) * 100}%` }} />
                    </div>
                    <div className="w-32 shrink-0 text-right text-muted-foreground">{fmtUsd4(v.cost)}</div>
                    <div className="w-24 shrink-0 text-right text-muted-foreground">{fmtNum(v.tokens)}</div>
                    <div className="w-28 shrink-0 text-right text-xs">
                      <span className="text-green-600">A {v.A}</span>{" "}
                      <span className="text-amber-600">B {v.B}</span>{" "}
                      <span className="text-rose-600">C {v.C}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contextes + Accès rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Coût par contexte (events)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const map = new Map<string, { calls: number; cost: number }>();
              for (const r of usage) {
                const c = map.get(r.context) || { calls: 0, cost: 0 };
                c.calls++; c.cost += Number(r.estimated_cost_usd) || 0;
                map.set(r.context, c);
              }
              const list = Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost).slice(0, 6);
              const max = list[0]?.[1].cost || 1;
              return list.length === 0 ? <div className="text-sm text-muted-foreground">Aucune donnée</div> : list.map(([ctx, v]) => (
                <button key={ctx} onClick={() => onNavigateTab("ai-usage")}
                  className="w-full text-left hover:bg-muted/50 rounded p-1.5 transition-colors">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate">{ctx}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{fmtUsd(v.cost)} · {fmtNum(v.calls)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v.cost / max) * 100}%` }} />
                  </div>
                </button>
              ));
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Accès rapide</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: "Config IA", tab: "ai-config", icon: Sparkles, count: `${counts.aiConfig} clés` },
                { label: "Suggestions Club", tab: "club-ai-suggestions", icon: MessageSquare, count: `${counts.suggestions} suggestions` },
                { label: "Utilisation IA", tab: "ai-usage", icon: Zap, count: `${fmtNum(kpis.calls)} appels · ${fmtUsd(kpis.cost)}` },
                { label: "Perf IA", tab: "ai-perf", icon: BarChart3, count: `${fmtNum(kpis.turns)} tours · P95 ${(kpis.p95 / 1000).toFixed(1)}s` },
                { label: "KB IA", tab: "kb", icon: BookOpen, count: `${counts.kb} notes` },
                { label: "Base IA", tab: "ai-knowledge", icon: Brain, count: `${counts.knowledge} entrées` },
              ].map((s) => (
                <button key={s.tab} onClick={() => onNavigateTab(s.tab)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left">
                  <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.count}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
