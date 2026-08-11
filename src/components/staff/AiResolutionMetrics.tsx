import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Row = {
  query: string | null;
  effective_query?: string | null;
  surface?: string | null;
  resolved_types: string[] | null;
  resolution_unresolved: boolean | null;
  resolution_service_only: boolean | null;
};


const PERIODS = [7, 14, 30, 90];

const pct = (n: number, d: number) => (d === 0 ? "—" : `${((n / d) * 100).toFixed(1)} %`);

export default function AiResolutionMetrics() {
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<Row[]>([]);
  const [ai, setAi] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const [s, a] = await Promise.all([
        supabase
          .from("search_logs")
          .select("query,effective_query,resolved_types,resolution_unresolved,resolution_service_only")
          .gte("created_at", since)
          .eq("is_autocomplete", false)
          .not("resolved_types", "is", null)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("ai_conversation_turns")
          .select("message,resolved_types,resolution_unresolved,resolution_service_only")
          .gte("created_at", since)
          .not("resolved_types", "is", null)
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);
      if (s.error) console.error(s.error);
      if (a.error) console.error(a.error);
      setSearch((s.data || []) as Row[]);
      setAi(((a.data || []) as any[]).map((r) => ({ ...r, query: r.message })) as Row[]);
      setLoading(false);
    })();
  }, [days]);

  const all = useMemo(() => [...search, ...ai], [search, ai]);

  const stats = (rows: Row[]) => {
    const total = rows.length;
    const unresolved = rows.filter((r) => r.resolution_unresolved).length;
    const serviceOnly = rows.filter((r) => r.resolution_service_only).length;
    const byType = new Map<string, number>();
    for (const r of rows) for (const t of r.resolved_types || []) byType.set(t, (byType.get(t) || 0) + 1);
    return { total, unresolved, serviceOnly, byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]) };
  };

  const globalStats = useMemo(() => stats(all), [all]);
  const searchStats = useMemo(() => stats(search), [search]);
  const aiStats = useMemo(() => stats(ai), [ai]);

  const topUnresolved = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of all) {
      if (!r.resolution_unresolved) continue;
      const q = (r.effective_query || r.query || "").trim().toLowerCase();
      if (!q) continue;
      map.set(q, (map.get(q) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [all]);

  const topServiceOnly = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of all) {
      if (!r.resolution_service_only) continue;
      const q = (r.effective_query || r.query || "").trim().toLowerCase();
      if (!q) continue;
      map.set(q, (map.get(q) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [all]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Résolution taxonomique</h3>
          <p className="text-sm text-muted-foreground">
            Observation seule : le résolveur mesure la couverture « terme → cible », il ne modifie aucun résultat.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((d) => <SelectItem key={d} value={String(d)}>{d} derniers jours</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold">{globalStats.total.toLocaleString("fr-FR")}</div>
              <p className="text-sm text-muted-foreground">Requêtes mesurées</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{pct(globalStats.unresolved, globalStats.total)}</div>
              <p className="text-sm text-muted-foreground">Non résolues ({globalStats.unresolved})</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold">{pct(globalStats.serviceOnly, globalStats.total)}</div>
              <p className="text-sm text-muted-foreground">Service seul ({globalStats.serviceOnly}) — trou silencieux</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold">{searchStats.total.toLocaleString("fr-FR")} / {aiStats.total.toLocaleString("fr-FR")}</div>
              <p className="text-sm text-muted-foreground">Recherche / Moteur IA</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Types de cibles résolues</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {globalStats.byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
              ) : globalStats.byType.map(([t, n]) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t} · {n.toLocaleString("fr-FR")} ({pct(n, globalStats.total)})
                </Badge>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <TermTable title="Top termes non résolus" rows={topUnresolved} />
            <TermTable title="Top termes résolus par service seul" rows={topServiceOnly} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Détail par surface</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead className="text-right">Requêtes</TableHead>
                  <TableHead className="text-right">Non résolues</TableHead>
                  <TableHead className="text-right">Service seul</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[["Recherche (business-search)", searchStats], ["Moteur IA (turns)", aiStats]].map(([label, st]: any) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell className="text-right">{st.total.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">{pct(st.unresolved, st.total)}</TableCell>
                      <TableCell className="text-right">{pct(st.serviceOnly, st.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TermTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Terme</TableHead><TableHead className="text-right">Occurrences</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(([term, n]) => (
                <TableRow key={term}>
                  <TableCell className="font-medium">{term}</TableCell>
                  <TableCell className="text-right">{n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
