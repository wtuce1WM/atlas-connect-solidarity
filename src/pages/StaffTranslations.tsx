import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Languages, RefreshCw, Play, StopCircle } from "lucide-react";

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
  { key: "businesses_full", label: "Fiches établissements (hook + description + highlights)" },
];

export default function StaffTranslations() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [configKey, setConfigKey] = useState("blog_posts");
  const [targetLang, setTargetLang] = useState<"en" | "ar">("en");
  const [limit, setLimit] = useState(10);
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [autoProgress, setAutoProgress] = useState<string>("");
  const [stopRequested, setStopRequested] = useState(false);
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

  const runAll = async (onlyKey?: string) => {
    setAutoRun(true);
    setStopRequested(false);
    const langs: ("en" | "ar")[] = ["en", "ar"];
    const defaultBatchSize = 10; // plus petit pour rester sous le timeout edge
    const maxIterations = 300;
    const maxRetriesPerBatch = 3;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
    const entryHasContent = (e: any) => {
      if (!e || typeof e !== "object") return false;
      return Object.values(e).some((v) => typeof v === "string" && v.trim().length > 0);
    };
    const isBlogPostComplete = (post: any, lang: "en" | "ar") => {
      const metaFields = [
        "title",
        "excerpt",
        "hero_title_top",
        "hero_title_bottom",
        "hero_subtitle",
        "intro",
      ];
      const hasAllMeta = metaFields.every((field) => {
        const source = post[`${field}_fr`];
        const target = post[`${field}_${lang}`];
        return !hasText(source) || hasText(target);
      });
      // Conditional entries check: only count FR entries that actually have content.
      // An AR/EN translation is only required when the FR source is non-empty.
      const sourceEntries = Array.isArray(post.entries_fr) ? post.entries_fr : [];
      const meaningfulSourceCount = sourceEntries.filter(entryHasContent).length;
      const targetEntries = Array.isArray(post[`entries_${lang}`]) ? post[`entries_${lang}`] : [];
      const meaningfulTargetCount = targetEntries.filter(entryHasContent).length;
      return hasAllMeta && meaningfulTargetCount >= meaningfulSourceCount;
    };
    let stopped = false;
    const checkStop = () => {
      // lit l'état le plus récent via setter (closure piège)
      setStopRequested((s) => { stopped = s; return s; });
      return stopped;
    };

    let totalOk = 0;
    let totalErr = 0;

    try {
      for (const cfg of CONFIGS) {
        for (const lang of langs) {
          // ── Special path for blog_posts: progressive chunks per article ──
          if (cfg.key === "blog_posts") {
            const { data: posts, error: pErr } = await supabase
              .from("blog_posts")
              .select(`slug, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, title_${lang}, excerpt_${lang}, hero_title_top_${lang}, hero_title_bottom_${lang}, hero_subtitle_${lang}, intro_${lang}, entries_${lang}, entries_fr`)
              .order("slug");
            if (pErr) { totalErr++; console.warn("blog_posts list failed", pErr); continue; }

            const pending = (posts ?? []).filter((p: any) => !isBlogPostComplete(p, lang));

            let idx = 0;
            for (const post of pending) {
              if (checkStop()) throw new Error("Arrêt demandé");
              idx++;
              const { data: freshPost, error: freshErr } = await supabase
                .from("blog_posts")
                .select(`slug, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, title_${lang}, excerpt_${lang}, hero_title_top_${lang}, hero_title_bottom_${lang}, hero_subtitle_${lang}, intro_${lang}, entries_${lang}, entries_fr`)
                .eq("slug", post.slug)
                .maybeSingle();
              if (!freshErr && freshPost && isBlogPostComplete(freshPost, lang)) {
                setAutoProgress(`Blog → ${lang.toUpperCase()} · ${post.slug} (${idx}/${pending.length}) · déjà traduit`);
                await sleep(150);
                continue;
              }
              let attempt = 0;
              let ok = false;
              let safety = 0;
              while (!ok && safety < 30) {
                safety++;
                const { data: latestPost, error: latestErr } = await supabase
                  .from("blog_posts")
                  .select(`slug, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, title_${lang}, excerpt_${lang}, hero_title_top_${lang}, hero_title_bottom_${lang}, hero_subtitle_${lang}, intro_${lang}, entries_${lang}, entries_fr`)
                  .eq("slug", post.slug)
                  .maybeSingle();
                if (!latestErr && latestPost && isBlogPostComplete(latestPost, lang)) {
                  setAutoProgress(`Blog → ${lang.toUpperCase()} · ${post.slug} (${idx}/${pending.length}) · déjà traduit`);
                  ok = true;
                  break;
                }
                setAutoProgress(
                  `Blog → ${lang.toUpperCase()} · ${post.slug} (${idx}/${pending.length})${attempt > 0 ? ` retry ${attempt}` : ""}`
                );
                try {
                  const res = await supabase.functions.invoke("translate-blog-post", {
                    body: { slug: post.slug, target: lang },
                  });
                  if (res.error) throw res.error;
                  attempt = 0;
                  const translated = res.data?.entries_count ?? 0;
                  const total = res.data?.entries_total ?? 0;
                  setAutoProgress(`Blog → ${lang.toUpperCase()} · ${post.slug} (${idx}/${pending.length}) · ${translated}/${total}`);
                  ok = !!res.data?.done;
                  if (ok) totalOk++;
                  else await sleep(500);
                } catch (e) {
                  attempt++;
                  console.warn(`[blog ${post.slug} → ${lang}] attempt ${attempt} failed`, e);
                  if (attempt >= maxRetriesPerBatch) break;
                  await sleep(2000 * attempt);
                }
              }
              if (!ok) totalErr++;
              await sleep(300);
            }
            await loadJobs();
            continue;
          }

          // ── Special path for businesses_full: hook + description + highlights, atomic per business ──
          if (cfg.key === "businesses_full") {
            const hookKey = `hook_${lang}` as const;
            const descKey = `description_${lang}` as const;

            // 1) Businesses with FR source content (hook or description) and missing target
            const { data: bizList, error: bErr } = await supabase
              .from("businesses")
              .select(`id, name, hook_fr, description_fr, ${hookKey}, ${descKey}`)
              .or(`hook_fr.not.is.null,description_fr.not.is.null`);
            if (bErr) { totalErr++; console.warn("businesses list failed", bErr); continue; }

            const needsBizMeta = (b: any) => {
              const needHook = !!(b.hook_fr && String(b.hook_fr).trim()) && !(b[hookKey] && String(b[hookKey]).trim());
              const needDesc = !!(b.description_fr && String(b.description_fr).trim()) && !(b[descKey] && String(b[descKey]).trim());
              return needHook || needDesc;
            };

            // 2) Businesses with at least one highlight missing target translation
            const { data: hlMissing, error: hlErr } = await supabase
              .from("front_highlights")
              .select(`business_id, title_fr, description_fr, section_title_fr, section_intro_fr, metric_title_fr, metric_value_fr, title_${lang}, description_${lang}, section_title_${lang}, section_intro_${lang}, metric_title_${lang}, metric_value_${lang}`);
            if (hlErr) { totalErr++; console.warn("highlights list failed", hlErr); continue; }

            const highlightFields = ["title", "description", "section_title", "section_intro", "metric_title", "metric_value"];
            const bizIdsWithMissingHl = new Set<string>();
            for (const h of (hlMissing ?? []) as any[]) {
              if (!h.business_id) continue;
              for (const f of highlightFields) {
                const src = h[`${f}_fr`];
                const dst = h[`${f}_${lang}`];
                if (src && String(src).trim() && !(dst && String(dst).trim())) {
                  bizIdsWithMissingHl.add(h.business_id);
                  break;
                }
              }
            }

            const pending = (bizList ?? []).filter((b: any) => needsBizMeta(b) || bizIdsWithMissingHl.has(b.id));

            let idx = 0;
            for (const biz of pending as any[]) {
              if (checkStop()) throw new Error("Arrêt demandé");
              idx++;
              let attempt = 0;
              let ok = false;
              let safety = 0;
              while (!ok && safety < 30) {
                safety++;
                setAutoProgress(
                  `Fiches → ${lang.toUpperCase()} · ${biz.name ?? biz.id} (${idx}/${pending.length})${attempt > 0 ? ` retry ${attempt}` : ""}`
                );
                try {
                  const res = await supabase.functions.invoke("translate-business", {
                    body: { business_id: biz.id, target: lang },
                  });
                  if (res.error) throw res.error;
                  attempt = 0;
                  const hd = res.data?.highlights_done ?? 0;
                  const ht = res.data?.highlights_total ?? 0;
                  setAutoProgress(`Fiches → ${lang.toUpperCase()} · ${biz.name ?? biz.id} (${idx}/${pending.length}) · highlights ${hd}/${ht}`);
                  ok = !!res.data?.done;
                  if (ok) totalOk++;
                  else await sleep(400);
                } catch (e) {
                  attempt++;
                  console.warn(`[business ${biz.id} → ${lang}] attempt ${attempt} failed`, e);
                  if (attempt >= maxRetriesPerBatch) break;
                  await sleep(2000 * attempt);
                }
              }
              if (!ok) totalErr++;
              await sleep(200);
            }
            await loadJobs();
            continue;
          }


          // ── Default path: batched via translate-content ──
          let iter = 0;
          let consecutiveFailures = 0;
          while (iter < maxIterations) {
            if (checkStop()) throw new Error("Arrêt demandé");
            iter++;

            let attempt = 0;
            let lastError: any = null;
            let data: any = null;
            while (attempt < maxRetriesPerBatch) {
              attempt++;
              setAutoProgress(
                `${cfg.label} → ${lang.toUpperCase()} · batch ${iter}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`
              );
              try {
                const res = await supabase.functions.invoke("translate-content", {
                  body: { config_key: cfg.key, target_lang: lang, limit: defaultBatchSize, dry_run: false },
                });
                if (res.error) throw res.error;
                data = res.data;
                lastError = null;
                break;
              } catch (e: any) {
                lastError = e;
                await sleep(1500 * attempt); // backoff
              }
            }

            if (lastError) {
              totalErr++;
              consecutiveFailures++;
              console.warn(`[translate] ${cfg.key} → ${lang} batch ${iter} failed:`, lastError);
              if (consecutiveFailures >= 3) {
                toast.error(`${cfg.label} → ${lang.toUpperCase()} : 3 échecs consécutifs, on passe au suivant.`);
                break;
              }
              continue; // on tente la batch suivante
            }

            consecutiveFailures = 0;
            totalOk++;
            await loadJobs();
            const processed = data?.processed ?? 0;
            if (processed < defaultBatchSize) break; // plus rien à traduire
            await sleep(400); // petite pause pour éviter le rate-limit
          }
        }
      }

      toast.success(`Terminé ✅ — ${totalOk} batchs OK, ${totalErr} échecs`);
    } catch (e: any) {
      toast.warning(e?.message ?? "Interrompu");
    } finally {
      setAutoRun(false);
      setAutoProgress("");
      setStopRequested(false);
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
          <Button onClick={run} disabled={running || autoRun} className="ml-auto" variant="outline">
            {running ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Traduction en cours…</> : "Lancer ce batch"}
          </Button>
          {!autoRun ? (
            <Button onClick={runAll} disabled={running}>
              <Play className="h-4 w-4 mr-2" />Tout traduire (EN + AR)
            </Button>
          ) : (
            <Button onClick={() => setStopRequested(true)} variant="destructive">
              <StopCircle className="h-4 w-4 mr-2" />Arrêter
            </Button>
          )}
        </div>
        {autoRun && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-md px-3 py-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span>En cours : {autoProgress}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          "Tout traduire" enchaîne tous les contenus × EN + AR. Blog et fiches d'établissements (hook + description + highlights) sont traités 1 par 1 avec découpe pour éviter les timeouts.
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
