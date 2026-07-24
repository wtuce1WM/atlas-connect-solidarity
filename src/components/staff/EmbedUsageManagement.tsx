import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type Turn = {
  id: string;
  created_at: string;
  latency_ms_total: number | null;
  latency_ms_first_token: number | null;
  had_error: boolean | null;
  stream_completed: boolean | null;
  results_shown: number | null;
  language: string | null;
  tools_called: any;
};

const PERIODS = [
  { label: "24 dernières heures", days: 1 },
  { label: "7 derniers jours", days: 7 },
  { label: "30 derniers jours", days: 30 },
  { label: "90 derniers jours", days: 90 },
];

const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`);

export default function EmbedUsageManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Turn[]>([]);
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ai_conversation_turns")
        .select("id,created_at,latency_ms_total,latency_ms_first_token,had_error,stream_completed,results_shown,language,tools_called")
        .eq("route_taken", "embed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) console.error(error);
      setRows((data || []) as Turn[]);
      setLoading(false);
    })();
  }, [days]);

  const totals = useMemo(() => {
    const total = rows.length;
    const errors = rows.filter(r => r.had_error).length;
    const incomplete = rows.filter(r => r.stream_completed === false).length;
    const ttft = rows.map(r => r.latency_ms_first_token || 0).filter(Boolean);
    const totalLat = rows.map(r => r.latency_ms_total || 0).filter(Boolean);
    const perDay = total / Math.max(1, days);
    return {
      total,
      perDay,
      errors,
      errorRate: total ? (errors / total) * 100 : 0,
      incomplete,
      medTtft: median(ttft),
      medTotal: median(totalLat),
    };
  }, [rows, days]);

  const bySlug = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; count: number; errors: number; ttft: number[]; total: number[] }>();
    for (const r of rows) {
      const tc = r.tools_called as any;
      const slug = tc?.business_slug || "unknown";
      const name = tc?.business_name || slug;
      const cur = map.get(slug) || { name, slug, count: 0, errors: 0, ttft: [], total: [] };
      cur.count++;
      if (r.had_error) cur.errors++;
      if (r.latency_ms_first_token) cur.ttft.push(r.latency_ms_first_token);
      if (r.latency_ms_total) cur.total.push(r.latency_ms_total);
      map.set(slug, cur);
    }
    return Array.from(map.values())
      .map(v => ({
        ...v,
        medTtft: median(v.ttft),
        medTotal: median(v.total),
        errorRate: v.count ? (v.errors / v.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const d = r.created_at.slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage embed par établissement</h2>
          <p className="text-sm text-muted-foreground">
            Questions, latence médiane, taux d'erreur — assistant IA embarqué (/embed/ask/*).
          </p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.total}</div><p className="text-sm text-muted-foreground">Questions totales</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.perDay.toFixed(1)}</div><p className="text-sm text-muted-foreground">Questions / jour</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtMs(totals.medTtft)}</div><p className="text-sm text-muted-foreground">TTFT médian</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtMs(totals.medTotal)}</div><p className="text-sm text-muted-foreground">Latence totale médiane</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className={`text-2xl font-bold ${totals.errorRate > 5 ? "text-destructive" : ""}`}>{totals.errorRate.toFixed(1)}%</div><p className="text-sm text-muted-foreground">Taux d'erreur ({totals.errors})</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Top établissements</CardTitle></CardHeader>
            <CardContent>
              {bySlug.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Établissement</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-right">Questions</TableHead>
                      <TableHead className="text-right">TTFT médian</TableHead>
                      <TableHead className="text-right">Latence médiane</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySlug.map(r => (
                      <TableRow key={r.slug}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <a href={`/embed/ask/${r.slug}`} target="_blank" rel="noreferrer" className="hover:underline">{r.slug}</a>
                        </TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.medTtft ? fmtMs(r.medTtft) : "—"}</TableCell>
                        <TableCell className="text-right">{r.medTotal ? fmtMs(r.medTotal) : "—"}</TableCell>
                        <TableCell className={`text-right ${r.errorRate > 5 ? "text-destructive" : ""}`}>
                          {r.errors} ({r.errorRate.toFixed(1)}%)
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Volume par jour</CardTitle></CardHeader>
            <CardContent>
              {perDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Questions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {perDay.map(([d, c]) => (
                      <TableRow key={d}>
                        <TableCell>{d}</TableCell>
                        <TableCell className="text-right">{c}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
