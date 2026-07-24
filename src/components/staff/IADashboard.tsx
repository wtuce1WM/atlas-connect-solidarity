import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, MessageSquare, BarChart3, BookOpen, Brain, ArrowRight,
  Loader2, DollarSign, Activity, AlertTriangle, Zap, CheckCircle2, TrendingUp,
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

type PerfRow = {
  created_at: string;
  route_taken: string | null;
  latency_ms_total: number | null;
  had_error: boolean;
};

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtNum = (n: number) => n.toLocaleString("fr-FR");

const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

export default function IADashboard({ onNavigateTab }: Props) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [perf, setPerf] = useState<PerfRow[]>([]);
  const [counts, setCounts] = useState({ aiConfig: 0, suggestions: 0, kb: 0, knowledge: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [u, p, aiCfg, sug, kb, know] = await Promise.all([
        supabase.from("ai_usage_events")
          .select("created_at,context,status,total_tokens,estimated_cost_usd")
          .gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        supabase.from("ai_conversation_turns")
          .select("created_at,route_taken,latency_ms_total,had_error")
          .gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
        supabase.from("ai_config").select("id", { count: "exact", head: true }),
        supabase.from("club_ai_suggestions").select("id", { count: "exact", head: true }),
        supabase.from("knowledge_entries").select("id", { count: "exact", head: true })
          .in("category", ["search-engine", "voice-search", "opening-hours", "UI", "architecture", "business-rules", "bug-fix", "tech"]),
        supabase.from("knowledge_entries").select("id", { count: "exact", head: true })
          .in("category", ["general", "tourisme", "culture", "gastronomie"]),
      ]);
      setUsage((u.data as any) || []);
      setPerf((p.data as any) || []);
      setCounts({
        aiConfig: aiCfg.count || 0,
        suggestions: sug.count || 0,
        kb: kb.count || 0,
        knowledge: know.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const cost = usage.reduce((s, r) => s + (Number(r.estimated_cost_usd) || 0), 0);
    const tokens = usage.reduce((s, r) => s + (r.total_tokens || 0), 0);
    const errors = usage.filter(r => r.status === "error").length;
    const errRate = usage.length ? (errors / usage.length) * 100 : 0;

    const latencies = perf.map(r => r.latency_ms_total || 0).filter(x => x > 0);
    const perfErrors = perf.filter(r => r.had_error).length;
    const perfErrRate = perf.length ? (perfErrors / perf.length) * 100 : 0;

    return {
      cost, tokens,
      calls: usage.length,
      errors, errRate,
      turns: perf.length,
      p50: pct(latencies, 50),
      p95: pct(latencies, 95),
      perfErrors, perfErrRate,
    };
  }, [usage, perf]);

  const byContext = useMemo(() => {
    const map = new Map<string, { calls: number; cost: number }>();
    for (const r of usage) {
      const c = map.get(r.context) || { calls: 0, cost: 0 };
      c.calls++; c.cost += Number(r.estimated_cost_usd) || 0;
      map.set(r.context, c);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost).slice(0, 6);
  }, [usage]);

  const byRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of perf) {
      const k = r.route_taken || "unknown";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [perf]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const alerts: { message: string; tab: string; severity: "warning" | "info" }[] = [];
  if (kpis.errRate > 5) alerts.push({ message: `Taux d'erreur IA élevé : ${kpis.errRate.toFixed(1)}% sur 7j`, tab: "ai-usage", severity: "warning" });
  if (kpis.p95 > 8000) alerts.push({ message: `Latence P95 dégradée : ${(kpis.p95 / 1000).toFixed(1)}s`, tab: "ai-perf", severity: "warning" });
  if (kpis.cost > 20) alerts.push({ message: `Coût 7j supérieur à $20 : ${fmtUsd(kpis.cost)}`, tab: "ai-usage", severity: "info" });

  const shortcuts = [
    { label: "IA", tab: "ai-config", icon: Sparkles, count: `${counts.aiConfig} clés` },
    { label: "Suggestions Chat IA du Club", tab: "club-ai-suggestions", icon: MessageSquare, count: `${counts.suggestions} suggestions` },
    { label: "Utilisation IA", tab: "ai-usage", icon: Zap, count: `${fmtNum(kpis.calls)} appels · ${fmtUsd(kpis.cost)}` },
    { label: "Perf IA", tab: "ai-perf", icon: BarChart3, count: `${fmtNum(kpis.turns)} tours · P95 ${(kpis.p95 / 1000).toFixed(1)}s` },
    { label: "KB IA", tab: "kb", icon: BookOpen, count: `${counts.kb} notes` },
    { label: "Base IA", tab: "ai-knowledge", icon: Brain, count: `${counts.knowledge} entrées` },
  ];

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Santé IA (7 derniers jours)
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
      )}

      {alerts.length === 0 && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Tous les indicateurs IA sont dans le vert sur 7 jours.
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-usage")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{fmtUsd(kpis.cost)}</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Coût 7j</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-usage")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{fmtNum(kpis.calls)}</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Appels IA 7j</p>
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
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("ai-usage")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis.errRate.toFixed(1)}%</div>
              <AlertTriangle className={`h-4 w-4 ${kpis.errRate > 5 ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
            <p className="text-sm text-muted-foreground">Taux d'erreur</p>
          </CardContent>
        </Card>
      </div>

      {/* Contexts + Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coût par contexte (7j)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byContext.length === 0 && <div className="text-sm text-muted-foreground">Aucune donnée</div>}
            {byContext.map(([ctx, v]) => {
              const max = byContext[0][1].cost || 1;
              return (
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
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routes déterministes (7j)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byRoute.length === 0 && <div className="text-sm text-muted-foreground">Aucune donnée</div>}
            {byRoute.map(([route, n]) => {
              const max = byRoute[0][1] || 1;
              return (
                <button key={route} onClick={() => onNavigateTab("ai-perf")}
                  className="w-full text-left hover:bg-muted/50 rounded p-1.5 transition-colors">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate flex items-center gap-2">
                      {route}
                      {route === "llm_synth" && <Badge variant="outline" className="text-xs">LLM</Badge>}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">{fmtNum(n)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {shortcuts.map((s) => (
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
  );
}
