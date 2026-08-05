import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const PERIODS = [
  { label: "7 derniers jours", days: 7 },
  { label: "30 derniers jours", days: 30 },
  { label: "90 derniers jours", days: 90 },
  { label: "365 derniers jours", days: 365 },
];

// Contextes IA liés à la production vidéo
const VIDEO_CONTEXTS = ["studio-video-scenario", "studio-video-card", "studio-video"];

type UsageRow = {
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

type JobRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  business_id: string | null;
  status: string;
  title: string | null;
  duration_sec: number;
  template_id: string | null;
};

const fmtUsd = (n: number) => `$${n.toFixed(4)}`;
const fmtNum = (n: number) => n.toLocaleString("fr-FR");
const fmtDate = (s: string) => new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

type Agg = { calls: number; tokens: number; cost: number; videos: number };
const emptyAgg = (): Agg => ({ calls: 0, tokens: 0, cost: 0, videos: 0 });

export default function VideoDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [affiliateNames, setAffiliateNames] = useState<Record<string, string>>({});
  const [affiliateByUser, setAffiliateByUser] = useState<Record<string, string>>({});
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [userLabels, setUserLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const [usageRes, jobsRes, affRes] = await Promise.all([
        supabase
          .from("ai_usage_events")
          .select("id,created_at,user_id,affiliate_id,business_id,context,model,status,input_tokens,output_tokens,total_tokens,estimated_cost_usd")
          .in("context", VIDEO_CONTEXTS)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("video_jobs")
          .select("id,created_at,user_id,business_id,status,title,duration_sec,template_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("affiliates").select("id,user_id,name,contact_name,contact_email"),
      ]);

      const usageList = (usageRes.data || []) as UsageRow[];
      const jobList = (jobsRes.data || []) as JobRow[];
      setUsage(usageList);
      setJobs(jobList);

      const affs = (affRes.data || []) as any[];
      setAffiliateNames(Object.fromEntries(affs.map((a) => [a.id, a.name || a.contact_name || a.contact_email || a.id.slice(0, 8)])));
      setAffiliateByUser(Object.fromEntries(affs.filter((a) => a.user_id).map((a) => [a.user_id as string, a.id as string])));

      // Libellés utilisateurs : affiliés d'abord, puis membres du Club / staff
      const labels: Record<string, string> = Object.fromEntries(
        affs.filter((a) => a.user_id).map((a) => [a.user_id as string, a.contact_email || a.name || a.contact_name || (a.user_id as string).slice(0, 8)])
      );
      const userIds = Array.from(new Set([...usageList.map((r) => r.user_id), ...jobList.map((j) => j.user_id)].filter(Boolean))) as string[];
      const missing = userIds.filter((u) => !labels[u]);
      if (missing.length) {
        const [memRes, roleRes] = await Promise.all([
          supabase.from("club_members").select("user_id,email,first_name,last_name,nickname").in("user_id", missing),
          supabase.from("user_roles").select("user_id,role").in("user_id", missing),
        ]);
        const roleByUser: Record<string, string> = {};
        for (const r of (roleRes.data || []) as any[]) roleByUser[r.user_id] = r.role;
        for (const m of (memRes.data || []) as any[]) {
          const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.nickname || m.email;
          labels[m.user_id] = roleByUser[m.user_id] ? `${name} (${roleByUser[m.user_id]})` : name;
        }
        for (const u of missing) {
          if (!labels[u]) labels[u] = roleByUser[u] ? `${u.slice(0, 8)} (${roleByUser[u]})` : u.slice(0, 8);
        }
      }
      setUserLabels(labels);


      const bizIds = Array.from(new Set([...usageList.map((r) => r.business_id), ...jobList.map((j) => j.business_id)].filter(Boolean))) as string[];
      if (bizIds.length) {
        const { data } = await supabase.from("businesses").select("id,name").in("id", bizIds);
        setBusinessNames(Object.fromEntries((data || []).map((b: any) => [b.id, b.name])));
      }
      setLoading(false);
    })();
  }, [days]);

  const totals = useMemo(() => {
    let cost = 0, tokens = 0, input = 0, output = 0, errors = 0;
    for (const r of usage) {
      cost += Number(r.estimated_cost_usd) || 0;
      tokens += r.total_tokens || 0;
      input += r.input_tokens || 0;
      output += r.output_tokens || 0;
      if (r.status === "error") errors++;
    }
    const done = jobs.filter((j) => j.status === "done").length;
    const failed = jobs.filter((j) => j.status === "error").length;
    const running = jobs.filter((j) => j.status === "pending" || j.status === "rendering").length;
    return {
      cost, tokens, input, output, errors,
      calls: usage.length,
      videos: jobs.length, done, failed, running,
      costPerVideo: done > 0 ? cost / done : 0,
    };
  }, [usage, jobs]);

  const affiliateIdOf = (row: { affiliate_id: string | null; user_id: string | null }) =>
    row.affiliate_id || (row.user_id ? affiliateByUser[row.user_id] : null) || null;

  const byAffiliate = useMemo(() => {
    const map = new Map<string, Agg>();
    const get = (k: string) => { const c = map.get(k) || emptyAgg(); map.set(k, c); return c; };
    for (const r of usage) {
      const k = affiliateIdOf(r); if (!k) continue;
      const c = get(k); c.calls++; c.tokens += r.total_tokens || 0; c.cost += Number(r.estimated_cost_usd) || 0;
    }
    for (const j of jobs) {
      const k = j.user_id ? affiliateByUser[j.user_id] : null; if (!k) continue;
      get(k).videos++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [usage, jobs, affiliateByUser]);

  const byBusiness = useMemo(() => {
    const map = new Map<string, Agg>();
    const get = (k: string) => { const c = map.get(k) || emptyAgg(); map.set(k, c); return c; };
    for (const r of usage) {
      if (!r.business_id) continue;
      const c = get(r.business_id); c.calls++; c.tokens += r.total_tokens || 0; c.cost += Number(r.estimated_cost_usd) || 0;
    }
    for (const j of jobs) { if (j.business_id) get(j.business_id).videos++; }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost || b[1].videos - a[1].videos);
  }, [usage, jobs]);

  const byUser = useMemo(() => {
    const map = new Map<string, Agg>();
    const get = (k: string) => { const c = map.get(k) || emptyAgg(); map.set(k, c); return c; };
    for (const r of usage) {
      if (!r.user_id) continue;
      const c = get(r.user_id); c.calls++; c.tokens += r.total_tokens || 0; c.cost += Number(r.estimated_cost_usd) || 0;
    }
    for (const j of jobs) { if (j.user_id) get(j.user_id).videos++; }
    return Array.from(map.entries()).sort((a, b) => b[1].videos - a[1].videos || b[1].cost - a[1].cost).slice(0, 30);
  }, [usage, jobs]);

  const byModel = useMemo(() => {
    const map = new Map<string, Agg>();
    for (const r of usage) {
      const k = r.model || "—";
      const c = map.get(k) || emptyAgg();
      c.calls++; c.tokens += r.total_tokens || 0; c.cost += Number(r.estimated_cost_usd) || 0;
      map.set(k, c);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [usage]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Vidéo</h2>
          <p className="text-sm text-muted-foreground">Tokens, coûts IA et générations vidéo — par affilié, établissement et utilisateur.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtUsd(totals.cost)}</div><p className="text-sm text-muted-foreground">Coût IA scénario</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.tokens)}</div><p className="text-sm text-muted-foreground">Tokens ({fmtNum(totals.input)} in / {fmtNum(totals.output)} out)</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.calls)}</div><p className="text-sm text-muted-foreground">Appels IA {totals.errors > 0 ? `· ${totals.errors} err.` : ""}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtUsd(totals.costPerVideo)}</div><p className="text-sm text-muted-foreground">Coût IA / vidéo réussie</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.videos)}</div><p className="text-sm text-muted-foreground">Vidéos lancées</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{fmtNum(totals.done)}</div><p className="text-sm text-muted-foreground">Terminées</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-destructive">{fmtNum(totals.failed)}</div><p className="text-sm text-muted-foreground">En erreur</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmtNum(totals.running)}</div><p className="text-sm text-muted-foreground">En cours / en file</p></CardContent></Card>
      </div>

      <StatsTable title="Classement affiliés" rows={byAffiliate.map(([k, v]) => ({ key: k, label: affiliateNames[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Classement établissements" rows={byBusiness.map(([k, v]) => ({ key: k, label: businessNames[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Top 30 utilisateurs" rows={byUser.map(([k, v]) => ({ key: k, label: userLabels[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Par modèle IA" rows={byModel.map(([k, v]) => ({ key: k, label: k, ...v }))} hideVideos />

      <Card>
        <CardHeader><CardTitle className="text-base">Dernières générations</CardTitle></CardHeader>
        <CardContent>
          {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Aucune génération sur la période.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Affilié</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 40).map((j) => {
                  const affId = j.user_id ? affiliateByUser[j.user_id] : null;
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(j.created_at)}</TableCell>
                      <TableCell className="font-medium">{j.business_id ? (businessNames[j.business_id] || "—") : "Corporate"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{j.title || "—"}</TableCell>
                      <TableCell>{affId ? (affiliateNames[affId] || "—") : "Staff / —"}</TableCell>
                      <TableCell className="text-right">{j.duration_sec}s</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "secondary"}>{j.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsTable({ title, rows, hideVideos }: { title: string; rows: { key: string; label: string; calls: number; tokens: number; cost: number; videos: number }[]; hideVideos?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                {!hideVideos && <TableHead className="text-right">Vidéos</TableHead>}
                <TableHead className="text-right">Appels IA</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Coût</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  {!hideVideos && <TableCell className="text-right">{fmtNum(r.videos)}</TableCell>}
                  <TableCell className="text-right">{fmtNum(r.calls)}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.tokens)}</TableCell>
                  <TableCell className="text-right">{fmtUsd(r.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
