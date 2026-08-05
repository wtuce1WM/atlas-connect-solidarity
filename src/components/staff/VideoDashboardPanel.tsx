import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, HelpCircle } from "lucide-react";

/** Icône "?" cliquable expliquant une métrique */
function Help({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Définition de la métrique"
          className="inline-flex shrink-0 text-muted-foreground hover:text-primary transition-colors align-middle"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs text-xs leading-relaxed z-[90]">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function Metric({ value, label, help, big, valueClass }: { value: string; label: string; help: string; big?: boolean; valueClass?: string }) {
  return (
    <div>
      <div className={`${big ? "text-3xl" : "text-2xl"} font-bold ${valueClass || ""}`}>{value}</div>
      <p className="text-sm text-muted-foreground flex items-start gap-1.5">
        <span>{label}</span>
        <Help text={help} />
      </p>
    </div>
  );
}


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
  error_message?: string | null;
};

/** Regroupe un message d'erreur brut en famille de cause exploitable */
function errorFamily(msg?: string | null): { family: string; detail: string } {
  const m = (msg || "").trim();
  if (!m) return { family: "Inconnue (aucun message)", detail: "—" };
  const imgMatch = m.match(/Error loading image with src:\s*(\S+)/i);
  if (imgMatch) {
    const url = imgMatch[1];
    if (/youtube\.com|youtu\.be/i.test(url)) return { family: "Média : URL YouTube passée comme image", detail: url };
    return { family: "Média : image/vidéo introuvable ou 404", detail: url };
  }
  if (/Could not find composition/i.test(m)) return { family: "Composition Remotion inexistante (template invalide)", detail: m.slice(0, 160) };
  if (/delayRender\(\)/i.test(m)) return { family: "Timeout delayRender (média trop lent à charger)", detail: m.slice(0, 160) };
  if (/row-level security/i.test(m)) return { family: "RLS : écriture refusée (droits)", detail: m.slice(0, 160) };
  if (/cancelled|Annulé/i.test(m)) return { family: "Annulé / interrompu", detail: m.slice(0, 160) };
  if (/Command failed with exit code/i.test(m)) return { family: "Échec du process de rendu (exit code)", detail: m.slice(0, 160) };
  return { family: "Autre", detail: m.slice(0, 160) };
}


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
  const [allTime, setAllTime] = useState<{
    cost: number; tokens: number; input: number; output: number; calls: number;
    videos: number; done: number; since: string | null;
  } | null>(null);

  // Cumul historique (depuis le début du traçage du coût estimé) — indépendant de la période
  useEffect(() => {
    (async () => {
      const [uRes, jRes] = await Promise.all([
        supabase
          .from("ai_usage_events")
          .select("input_tokens,output_tokens,total_tokens,estimated_cost_usd,created_at")
          .in("context", VIDEO_CONTEXTS)
          .order("created_at", { ascending: true })
          .limit(50000),
        supabase.from("video_jobs").select("status"),
      ]);
      const rows = (uRes.data || []) as any[];
      let cost = 0, tokens = 0, input = 0, output = 0;
      for (const r of rows) {
        cost += Number(r.estimated_cost_usd) || 0;
        tokens += r.total_tokens || 0;
        input += r.input_tokens || 0;
        output += r.output_tokens || 0;
      }
      const jobsAll = (jRes.data || []) as any[];
      setAllTime({
        cost, tokens, input, output, calls: rows.length,
        videos: jobsAll.length,
        done: jobsAll.filter((j) => j.status === "done").length,
        since: rows.length ? rows[0].created_at : null,
      });
    })();
  }, []);


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

      {/* Cumul historique — toujours en premier, indépendant de la période */}
      {allTime && (
        <Card className="border-gold/40 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              Cumul total depuis le début du traçage
              {allTime.since ? ` (${new Date(allTime.since).toLocaleDateString("fr-FR")})` : ""}
              <Help text="Ce bloc ignore le sélecteur de période : il additionne TOUTES les lignes de traçage IA des contextes vidéo (studio-video-scenario / -card) enregistrées depuis la première mesure. Attention : des vidéos ont été générées avant la mise en place du traçage de coût, elles ne sont donc pas comptées dans le coût." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric
                value={fmtUsd(allTime.cost)}
                label="Coût IA total"
                help="Somme de estimated_cost_usd sur tous les appels IA de scénarisation vidéo. Calculé à partir du tarif réel du modèle utilisé (google/gemini-3-flash-preview), input et output séparés. N'inclut PAS le rendu Remotion (minutes GitHub Actions), ni la voix off, ni le stockage."
                big
              />
              <Metric
                value={fmtNum(allTime.tokens)}
                label={`Tokens totaux (${fmtNum(allTime.input)} in / ${fmtNum(allTime.output)} out)`}
                help="Total des tokens facturés. « in » = prompt envoyé au modèle (fiche établissement, avis, médias, documents, consignes) ; « out » = JSON du scénario généré. L'input domine largement car la fiche complète est envoyée à chaque génération."
                big
              />
              <Metric
                value={fmtNum(allTime.calls)}
                label={`Appels IA · ${fmtNum(allTime.videos)} vidéos (${fmtNum(allTime.done)} terminées)`}
                help="Nombre d'appels au modèle IA (1 par clic sur « Générer le scénario »). Il est bien supérieur au nombre de vidéos car on régénère souvent plusieurs scénarios avant de lancer un montage. « vidéos » = lignes dans video_jobs, « terminées » = statut done."
                big
              />
              <Metric
                value={allTime.done > 0 ? fmtUsd(allTime.cost / allTime.done) : "—"}
                label="Coût IA moyen / vidéo réussie"
                help="Coût IA total ÷ nombre de vidéos au statut « done ». C'est le coût réel mesuré, pas une estimation théorique : l'ancienne note interne annonçait ~0,07 $/vidéo sur la base de Claude Sonnet ; le passage à Gemini 3 Flash a divisé ce coût par ~10. À noter : les vidéos antérieures au traçage tirent cette moyenne vers le bas."
                big
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Metric value={fmtUsd(totals.cost)} label="Coût IA scénario" help="Coût IA cumulé sur la période sélectionnée uniquement (pas par vidéo)." /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.tokens)} label={`Tokens (${fmtNum(totals.input)} in / ${fmtNum(totals.output)} out)`} help="Tokens consommés sur la période : prompt envoyé (in) + scénario généré (out)." /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.calls)} label={`Appels IA ${totals.errors > 0 ? `· ${totals.errors} err.` : ""}`} help="Nombre de générations de scénario lancées sur la période. « err. » = appels IA terminés en erreur (statut error dans le traçage)." /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtUsd(totals.costPerVideo)} label="Coût IA / vidéo réussie" help="Coût IA de la période ÷ vidéos terminées sur la même période. Une régénération de scénario sans montage augmente ce ratio." /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.videos)} label="Vidéos lancées" help="Toutes les entrées video_jobs créées sur la période, quel que soit leur statut." /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.done)} label="Terminées" help="Jobs au statut « done » : rendu Remotion terminé et fichier disponible." valueClass="text-green-600" /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.failed)} label="En erreur" help="Jobs au statut « error » : échec du rendu (workflow GitHub Actions, média manquant, durée invalide…). Le coût IA du scénario reste facturé." valueClass="text-destructive" /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metric value={fmtNum(totals.running)} label="En cours / en file" help="Jobs au statut « pending » (en attente du runner) ou « rendering » (rendu en cours)." /></CardContent></Card>
      </div>

      <StatsTable title="Classement affiliés" help="Un affilié est rattaché soit par affiliate_id sur l'appel IA, soit via le user_id du job vidéo. Les générations faites par le staff (non affiliées) n'apparaissent pas ici." rows={byAffiliate.map(([k, v]) => ({ key: k, label: affiliateNames[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Classement établissements" help="Regroupement par business_id. Les vidéos Corporate (sans établissement) sont exclues de ce classement." rows={byBusiness.map(([k, v]) => ({ key: k, label: businessNames[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Top 30 utilisateurs" help="Les 30 comptes ayant lancé le plus de vidéos (puis le plus de coût). Le libellé affiche le nom/email de l'affilié, du membre Club ou le rôle staff." rows={byUser.map(([k, v]) => ({ key: k, label: userLabels[k] || k.slice(0, 8), ...v }))} />
      <StatsTable title="Par modèle IA" help="Coût et tokens ventilés par modèle appelé via la passerelle IA. Sans colonne vidéos : un job vidéo peut mobiliser plusieurs modèles." rows={byModel.map(([k, v]) => ({ key: k, label: k, ...v }))} hideVideos />


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

function StatsTable({ title, help, rows, hideVideos }: { title: string; help?: string; rows: { key: string; label: string; calls: number; tokens: number; cost: number; videos: number }[]; hideVideos?: boolean }) {
  const sum = rows.reduce(
    (acc, r) => ({ videos: acc.videos + r.videos, calls: acc.calls + r.calls, tokens: acc.tokens + r.tokens, cost: acc.cost + r.cost }),
    { videos: 0, calls: 0, tokens: 0, cost: 0 }
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5">
          {title}
          {help && <Help text={help} />}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Coût total = cumul sur la période. Coût / vidéo = coût total ÷ vidéos lancées.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                {!hideVideos && (
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">Vidéos <Help text="Nombre de jobs vidéo (video_jobs) créés sur la période pour cette ligne, tous statuts confondus." /></span>
                  </TableHead>
                )}
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">Appels IA <Help text="Nombre de générations de scénario IA. Souvent supérieur au nombre de vidéos (régénérations avant montage)." /></span>
                </TableHead>

                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">Tokens <Help text="Total tokens input + output facturés par la passerelle IA." /></span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">Coût total <Help text="Cumul en $ sur la période sélectionnée (pas un coût unitaire). Coût IA uniquement, hors rendu Remotion." /></span>
                </TableHead>
                {!hideVideos && (
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">Coût / vidéo <Help text="Coût total ÷ nombre de vidéos lancées de cette ligne. Un scénario régénéré plusieurs fois avant montage fait monter ce ratio." /></span>
                  </TableHead>
                )}

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
                  {!hideVideos && <TableCell className="text-right">{r.videos > 0 ? fmtUsd(r.cost / r.videos) : "—"}</TableCell>}
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell>TOTAL</TableCell>
                {!hideVideos && <TableCell className="text-right">{fmtNum(sum.videos)}</TableCell>}
                <TableCell className="text-right">{fmtNum(sum.calls)}</TableCell>
                <TableCell className="text-right">{fmtNum(sum.tokens)}</TableCell>
                <TableCell className="text-right">{fmtUsd(sum.cost)}</TableCell>
                {!hideVideos && <TableCell className="text-right">{sum.videos > 0 ? fmtUsd(sum.cost / sum.videos) : "—"}</TableCell>}
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

  );
}
