import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  affiliate_id: string | null;
  business_id: string | null;
  context: string;
  model: string | null;
  status: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
};

const PERIODS = [
  { label: "7 derniers jours", days: 7 },
  { label: "30 derniers jours", days: 30 },
  { label: "90 derniers jours", days: 90 },
];

const fmtUsd = (n: number) => `$${n.toFixed(4)}`;
const fmtNum = (n: number) => n.toLocaleString("fr-FR");

export default function AiUsageManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(7);
  const [affiliates, setAffiliates] = useState<Record<string, string>>({});
  const [businesses, setBusinesses] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ai_usage_events")
        .select("id,created_at,user_id,affiliate_id,business_id,context,model,status,input_tokens,output_tokens,total_tokens,estimated_cost_usd")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) console.error(error);
      const list = (data || []) as Row[];
      setRows(list);

      const affIds = Array.from(new Set(list.map(r => r.affiliate_id).filter(Boolean))) as string[];
      const bizIds = Array.from(new Set(list.map(r => r.business_id).filter(Boolean))) as string[];
      const [affRes, bizRes] = await Promise.all([
        affIds.length ? supabase.from("affiliates").select("id,email,contact_name").in("id", affIds) : Promise.resolve({ data: [] as any[] }),
        bizIds.length ? supabase.from("businesses").select("id,name").in("id", bizIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      setAffiliates(Object.fromEntries((affRes.data || []).map((a: any) => [a.id, a.contact_name || a.email || a.id.slice(0, 8)])));
      setBusinesses(Object.fromEntries((bizRes.data || []).map((b: any) => [b.id, b.name])));
      setLoading(false);
    })();
  }, [days]);

  const totals = useMemo(() => {
    let cost = 0, tokens = 0, calls = rows.length, errors = 0;
    for (const r of rows) {
      cost += Number(r.estimated_cost_usd) || 0;
      tokens += r.total_tokens || 0;
      if (r.status === "error") errors++;
    }
    return { cost, tokens, calls, errors };
  }, [rows]);

  const byContext = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const r of rows) {
      const cur = map.get(r.context) || { calls: 0, tokens: 0, cost: 0 };
      cur.calls++; cur.tokens += r.total_tokens || 0; cur.cost += Number(r.estimated_cost_usd) || 0;
      map.set(r.context, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [rows]);

  const byAffiliate = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const r of rows) {
      if (!r.affiliate_id) continue;
      const cur = map.get(r.affiliate_id) || { calls: 0, tokens: 0, cost: 0 };
      cur.calls++; cur.tokens += r.total_tokens || 0; cur.cost += Number(r.estimated_cost_usd) || 0;
      map.set(r.affiliate_id, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [rows]);

  const byBusiness = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const r of rows) {
      if (!r.business_id) continue;
      const cur = map.get(r.business_id) || { calls: 0, tokens: 0, cost: 0 };
      cur.calls++; cur.tokens += r.total_tokens || 0; cur.cost += Number(r.estimated_cost_usd) || 0;
      map.set(r.business_id, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [rows]);

  const byUser = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const r of rows) {
      if (!r.user_id) continue;
      const cur = map.get(r.user_id) || { calls: 0, tokens: 0, cost: 0 };
      cur.calls++; cur.tokens += r.total_tokens || 0; cur.cost += Number(r.estimated_cost_usd) || 0;
      map.set(r.user_id, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost).slice(0, 30);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Utilisation IA</h2>
          <p className="text-sm text-muted-foreground">Coût et tokens par contexte, affilié, établissement, utilisateur.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtUsd(totals.cost)}</div><p className="text-sm text-muted-foreground">Coût estimé</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.tokens)}</div><p className="text-sm text-muted-foreground">Tokens totaux</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.calls)}</div><p className="text-sm text-muted-foreground">Appels</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-destructive">{totals.errors}</div><p className="text-sm text-muted-foreground">Erreurs</p></CardContent></Card>
          </div>

          <StatsTable title="Par contexte" rows={byContext.map(([k, v]) => ({ key: k, label: k, ...v }))} />
          <StatsTable title="Par affilié" rows={byAffiliate.map(([k, v]) => ({ key: k, label: affiliates[k] || k.slice(0, 8), ...v }))} />
          <StatsTable title="Par établissement" rows={byBusiness.map(([k, v]) => ({ key: k, label: businesses[k] || k.slice(0, 8), ...v }))} />
          <StatsTable title="Top 30 utilisateurs (Club)" rows={byUser.map(([k, v]) => ({ key: k, label: k.slice(0, 8), ...v }))} />
        </>
      )}
    </div>
  );
}

function StatsTable({ title, rows }: { title: string; rows: { key: string; label: string; calls: number; tokens: number; cost: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Appels</TableHead><TableHead className="text-right">Tokens</TableHead><TableHead className="text-right">Coût</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right">{r.calls.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right">{r.tokens.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right">${r.cost.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
