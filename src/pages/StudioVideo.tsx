import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wand2, Download } from "lucide-react";

type Business = { id: string; name: string; city: string | null };
type Job = {
  id: string;
  business_id: string | null;
  prompt: string;
  duration_sec: number;
  tone: string;
  status: "pending" | "rendering" | "done" | "error";
  output_url: string | null;
  error_message: string | null;
  created_at: string;
};

const DURATIONS = [17, 22, 27] as const;
const TONES = [
  { value: "immersif", label: "Immersif" },
  { value: "dynamique", label: "Dynamique" },
  { value: "elegant", label: "Élégant" },
];

export default function StudioVideo() {
  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [duration, setDuration] = useState<17 | 22 | 27>(22);
  const [tone, setTone] = useState("immersif");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Autocomplete businesses
  useEffect(() => {
    if (query.length < 2) {
      setBusinesses([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,city")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(8);
      setBusinesses(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Recent jobs + realtime
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      setJobs((data ?? []) as Job[]);
    };
    load();

    const channel = supabase
      .channel("video_jobs_studio")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_jobs" },
        (payload) => {
          setJobs((prev) => {
            const next = [...prev];
            const row = payload.new as Job;
            if (!row?.id) return prev;
            const idx = next.findIndex((j) => j.id === row.id);
            if (idx >= 0) next[idx] = row;
            else next.unshift(row);
            return next.slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentJob = useMemo(
    () => jobs.find((j) => j.id === currentJobId) ?? null,
    [jobs, currentJobId]
  );

  const submit = async () => {
    if (!prompt.trim()) {
      toast.error("Décrivez la vidéo souhaitée.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-scenario-generate", {
        body: {
          prompt: prompt.trim(),
          business_id: selected?.id ?? null,
          duration_sec: duration,
          tone,
        },
      });
      if (error) throw error;
      const job = (data as any)?.job as Job;
      if (job) {
        setCurrentJobId(job.id);
        toast.success("Scénario généré. Rendu en attente du worker.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la génération.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Studio Vidéo IA — 1WM</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground py-10 px-4">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Studio Vidéo IA</h1>
            <p className="text-muted-foreground">
              Générez une vidéo verticale 720×1280 (17 à 27 s) à partir d'un prompt et d'un établissement.
            </p>
          </header>

          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="space-y-2">
              <Label>Établissement (optionnel)</Label>
              <Input
                placeholder="Rechercher par nom…"
                value={selected ? selected.name : query}
                onChange={(e) => {
                  setSelected(null);
                  setQuery(e.target.value);
                }}
              />
              {!selected && businesses.length > 0 && (
                <div className="rounded-md border border-border bg-popover divide-y">
                  {businesses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-accent"
                      onClick={() => {
                        setSelected(b);
                        setQuery("");
                        setBusinesses([]);
                      }}
                    >
                      <div className="font-medium">{b.name}</div>
                      {b.city && <div className="text-xs text-muted-foreground">{b.city}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durée</Label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={duration === d ? "default" : "outline"}
                      onClick={() => setDuration(d)}
                    >
                      {d}s
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ton</Label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant={tone === t.value ? "default" : "outline"}
                      onClick={() => setTone(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                rows={5}
                placeholder="Ex : Présentation immersive mettant en avant le hook et la signature de l'établissement, terminer par une incitation à installer l'app."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={2000}
              />
            </div>

            <Button onClick={submit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Générer la vidéo
            </Button>
          </section>

          {currentJob && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Job en cours</h2>
              <JobCard job={currentJob} />
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-semibold">Galerie</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobs
                .filter((j) => j.status === "done" && j.output_url)
                .map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{job.duration_sec}s · {job.tone}</span>
        <span className="uppercase tracking-wide">{job.status}</span>
      </div>
      <p className="text-sm line-clamp-2">{job.prompt}</p>
      {job.status === "done" && job.output_url ? (
        <div className="space-y-2">
          <video src={job.output_url} controls className="w-full rounded-md aspect-[9/16] bg-black" />
          <a
            href={job.output_url}
            download
            className="inline-flex items-center gap-1 text-xs underline"
          >
            <Download className="h-3 w-3" /> Télécharger
          </a>
        </div>
      ) : job.status === "error" ? (
        <p className="text-xs text-destructive">{job.error_message ?? "Erreur"}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          En file d'attente — le worker prendra le job dans quelques secondes.
        </p>
      )}
    </div>
  );
}
