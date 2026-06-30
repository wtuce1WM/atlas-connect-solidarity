import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Languages, RefreshCw } from "lucide-react";

type Job = {
  id: string;
  table_name: string;
  source_lang: string;
  target_lang: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  last_error: string | null;
  created_at: string;
  finished_at: string | null;
};

const CONFIGS: { key: string; label: string }[] = [
  { key: "blog_posts", label: "Articles de blog (titres + entries JSONB)" },
  { key: "categories", label: "Catégories" },
  { key: "subcategories", label: "Sous-catégories" },
  { key: "services", label: "Services" },
  { key: "badges", label: "Badges (nom + description)" },
  { key: "labels", label: "Labels (nom + description)" },
  { key: "cities", label: "Villes (nom + description)" },
  { key: "destinations", label: "Destinations (nom + description)" },
  { key: "points_of_interest", label: "Points d'intérêt (nom + description)" },
  { key: "businesses_hook", label: "Établissements — accroche (hook)" },
];

export default function StaffTranslations() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [configKey, setConfigKey] = useState("blog_posts");
  const [targetLang, setTargetLang] = useState<"en" | "ar">("en");
  const [limit, setLimit] = useState(10);
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsStaff(false); return; }
      const { data } = await supabase.rpc("is_staff", { _user_id: session.user.id });
      setIsStaff(!!data);
    })();
  }, []);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("translation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setJobs((data as Job[]) ?? []);
  };

  useEffect(() => {
    if (isStaff) loadJobs();
  }, [isStaff]);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: { config_key: configKey, target_lang: targetLang, limit, dry_run: dryRun },
      });
      if (error) throw error;
      toast.success(`Job terminé — ${data.success} OK, ${data.errors} erreurs (${data.processed} lignes)`);
      await loadJobs();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setRunning(false);
    }
  };

  if (isStaff === null) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;
  }
  if (!isStaff) {
    return <div className="p-8 text-center text-muted-foreground">Accès staff requis.</div>;
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex items-center gap-3">
        <Languages className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Traduction batch (FR → EN/AR)</h1>
      </header>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Table / contenu</label>
            <Select value={configKey} onValueChange={setConfigKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONFIGS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Langue cible</label>
            <Select value={targetLang} onValueChange={(v) => setTargetLang(v as "en" | "ar")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English 🇬🇧</SelectItem>
                <SelectItem value="ar">العربية 🇲🇦</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Lignes max / batch</label>
            <Input type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 10)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry run (ne pas écrire en base)
          </label>
          <Button onClick={run} disabled={running} className="ml-auto">
            {running ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Traduction en cours…</> : "Lancer la traduction"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Le job traduit uniquement les lignes dont le champ cible est vide. Relance plusieurs fois pour avancer par batchs.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Historique des jobs</h2>
          <Button variant="ghost" size="sm" onClick={loadJobs}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-2">
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">Aucun job pour le moment.</p>}
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "secondary"}>
                  {j.status}
                </Badge>
                <span className="font-medium">{j.table_name}</span>
                <span className="text-muted-foreground">→ {j.target_lang}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{j.success_count} OK · {j.error_count} err</span>
                <span>{new Date(j.created_at).toLocaleString("fr-FR")}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
