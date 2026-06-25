import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wand2, Download } from "lucide-react";
import maisonBrummellAsset from "@/assets/maison-brummell.mp4.asset.json";
import riadDarNajatAsset from "@/assets/riad-dar-najat.mp4.asset.json";
import narComplexeAsset from "@/assets/nar-complexe.mp4.asset.json";
import farashaAsset from "@/assets/farasha-farmhouse.mp4.asset.json";
import boZinAsset from "@/assets/bo-zin.mp4.asset.json";

const maisonBrummellVideo = maisonBrummellAsset.url;
const riadDarNajatVideo = riadDarNajatAsset.url;
const narComplexeVideo = narComplexeAsset.url;
const farashaVideo = farashaAsset.url;
const boZinVideo = boZinAsset.url;

type ShowcaseItem = { title: string; src: string; prompt: string };

const SHOWCASE_BUSINESS: ShowcaseItem[] = [
  {
    title: "Comptoir Darna — Patio & Club",
    src: "/showcase/comptoir-darna-patio-club_v4.mp4",
    prompt:
      "Vidéo immersive verticale 720x1280 de ~17s pour présentation de Comptoir Darna Patio & Club. Utiliser d'autres vidéos de fond dans l'ordre du sort-order interne, diminuer la taille du texte « dîner spectacle & gastronomie », prendre 2s de plus pour les avis client, utiliser le même badge que dans le slidepanel de /search avec effet liquidglass.",
  },
  {
    title: "Riad Dar Najat",
    src: riadDarNajatVideo,
    prompt:
      "Vidéo de ~19s pour Riad Dar Najat. Utiliser la vidéo YouTube bbzHKcy5miM à partir de 3:46 en cover plein écran vertical avec un léger pan, garder le son, même squelette que Comptoir Darna. Note/20 et nombre d'avis empilés verticalement pour éviter le saut visuel.",
  },
  {
    title: "Maison Brummell Majorelle",
    src: maisonBrummellVideo,
    prompt:
      "À partir de riad-dar-najat.mp4, créer la vidéo pour Maison Brummell Majorelle en reprenant les vidéos internes (selon sort-order) et en mettant en avant le Titre et le Texte de l'image Popup.",
  },
  {
    title: "Jnane Rumi",
    src: "/showcase/jnane-rumi.mp4",
    prompt:
      "Vidéo immersive 720x1280 ~17s pour Jnane Rumi avec ses propres vidéos. Utiliser le hook de l'établissement. Mettre en avant le badge des avis client (note/20 + nombre d'avis). Terminer par une incitation à installer l'App.",
  },
  {
    title: "N.A.R Complexe Sportif",
    src: narComplexeVideo,
    prompt:
      "Vidéo immersive 720x1280 ~17s pour N.A.R Complexe Sportif avec ses propres vidéos. Utiliser le hook. Mettre en avant les 4 offres rattachées et le badge des avis (note/20 + nombre d'avis). Terminer par une incitation à installer l'App avec bouton carré sur fond terracotta inspiré de /install mobile.",
  },
  {
    title: "The Farasha Farmhouse",
    src: farashaVideo,
    prompt:
      "Vidéo immersive 720x1280 ~17s pour The Farasha Farmhouse avec uniquement ses images (pas les vidéos). Utiliser le hook pour mettre en avant le côté Ferme Pédagogique. Mettre en avant le Popup et la seule offre rattachée. Badge des avis (note/20 + nombre d'avis). Terminer par incitation à installer l'App, bouton carré terracotta inspiré de /install mobile.",
  },
  {
    title: "Bô Zin (scénario Signature 27s)",
    src: boZinVideo,
    prompt:
      "Scénario « Signature 27s » en 9 étapes : Hook, Nom, Identité, Wow (Popup), Offres, Preuve sociale (Avis), Localisation, CTA principal, Outro App — appliqué à Bô Zin.",
  },
];

const SHOWCASE_FEATURES: ShowcaseItem[] = [
  {
    title: "Agent IA — Démo (animation)",
    src: "/showcase/agent-ia-demo.mp4",
    prompt:
      "Démo de l'agent IA en vidéo immersive verticale 720x1280, ~17s. Concept « Pose ta question, vis ton Maroc » : Hook, Question, Réponse magique, Carte vivante, Affinage, CTA final. UI 100% Remotion.",
  },
  {
    title: "Agent IA — Screencast",
    src: "/showcase/agent-ia-screencast.mp4",
    prompt:
      "Démo de l'agent IA — version screencast réel ~25s, capturé via Playwright sur la vraie interface de /search?tab=ai.",
  },
  {
    title: "Agent IA — Démo v2 (carte géolocalisée)",
    src: "/showcase/agent-ia-demo-v2.mp4",
    prompt:
      "Autre version de agent-ia-demo.mp4 avec ce scénario : « je cherche un centre aquatique à Marrakech pour passer la journée avec les enfants + sur la route de l'Ourika + avec un golf à côté ». Montrer l'utilisation de la Google Map en étant géolocalisé (marqueur « vous êtes là »).",
  },
];


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
  const [bizStats, setBizStats] = useState<{
    hook: string | null;
    descLen: number;
    images: number;
    videos: number;
    offers: number;
    popup: boolean;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

  // Load business stats when selected
  useEffect(() => {
    if (!selected) {
      setBizStats(null);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      const [biz, docs, yt, promos] = await Promise.all([
        supabase
          .from("businesses")
          .select("hook_fr,description,images,popup_image_url")
          .eq("id", selected.id)
          .maybeSingle(),
        supabase
          .from("business_documents")
          .select("id", { count: "exact", head: true })
          .eq("business_id", selected.id)
          .eq("type", "video"),
        supabase
          .from("business_youtube_videos")
          .select("id", { count: "exact", head: true })
          .eq("business_id", selected.id),
        supabase
          .from("affiliate_business_promotions")
          .select("id", { count: "exact", head: true })
          .eq("business_id", selected.id),
      ]);
      if (cancelled) return;
      const b: any = biz.data ?? {};
      setBizStats({
        hook: b.hook_fr ?? null,
        descLen: (b.description ?? "").length,
        images: Array.isArray(b.images) ? b.images.length : 0,
        videos: (docs.count ?? 0) + (yt.count ?? 0),
        offers: promos.count ?? 0,
        popup: !!b.popup_image_url,
      });
      setStatsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Update prompt automatically when selected business changes
  useEffect(() => {
    const businessText = selected ? ` « ${selected.name} »` : "";
    const newDefaultPrompt = `Présentation immersive mettant en avant le hook et la signature de l'établissement${businessText}, terminer par une incitation à installer l'app.`;
    
    if (!prompt || prompt.startsWith("Présentation immersive mettant en avant le hook et la signature de l'établissement")) {
      setPrompt(newDefaultPrompt);
    }
  }, [selected]);

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

  const hasActiveJob = useMemo(
    () => jobs.some((j) => j.status === "pending" || j.status === "rendering"),
    [jobs]
  );

  const submit = async () => {
    if (submitting) return;
    if (hasActiveJob) {
      toast.error("Job déjà lancé — patientez la fin du rendu en cours.");
      return;
    }
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
            <div className="text-xs text-muted-foreground/80 mt-1 space-y-1 bg-muted/40 p-3 rounded-lg border border-border/50">
              <p>📌 Il faut savoir avant si l'établissement a un Hook, suffisamment d'images, de vidéos, une offre/popup...</p>
              <p>💡 Signalisez dans le prompt si vous voulez mettre en avant les horaires, la localisation, une offre/popup.</p>
            </div>
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

              {selected && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-2">
                  {statsLoading || !bizStats ? (
                    <p className="text-xs text-muted-foreground">Chargement des informations…</p>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">Hook : </span>
                        {bizStats.hook ? (
                          <span className="italic">« {bizStats.hook} »</span>
                        ) : (
                          <span className="text-destructive">Aucun</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span><span className="font-medium">Texte :</span> {bizStats.descLen} car.</span>
                        <span><span className="font-medium">Images :</span> {bizStats.images}</span>
                        <span><span className="font-medium">Vidéos :</span> {bizStats.videos}</span>
                        <span><span className="font-medium">Offres :</span> {bizStats.offers}</span>
                        <span><span className="font-medium">Popup :</span> {bizStats.popup ? "oui" : "non"}</span>
                      </div>
                    </>
                  )}
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
                className="text-lg md:text-xl p-4"
                onFocus={() => {
                  if (!prompt) {
                    const businessText = selected ? ` « ${selected.name} »` : "";
                    setPrompt(`Présentation immersive mettant en avant le hook et la signature de l'établissement${businessText}, terminer par une incitation à installer l'app.`);
                  }
                }}
              />
            </div>

            <Button onClick={submit} disabled={submitting || hasActiveJob} className="gap-2">
              {submitting || hasActiveJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {hasActiveJob ? "Job déjà lancé…" : "Générer la vidéo"}
            </Button>
          </section>

          {currentJob && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Job en cours</h2>
              <JobCard job={currentJob} />
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-semibold">Galerie — dernières vidéos générées</h2>
            <p className="text-xs text-muted-foreground">
              Les vidéos produites via ce studio apparaissent ici avec le prompt utilisé.
            </p>
            {jobs.filter((j) => j.status === "done" && j.output_url).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune vidéo générée pour l'instant. Lancez une génération ci-dessus.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jobs
                  .filter((j) => j.status === "done" && j.output_url)
                  .map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Showcase — établissements</h2>
            <p className="text-xs text-muted-foreground">
              Exemples générés manuellement pour des établissements réels, avec le prompt d'origine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_BUSINESS.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  <VideoWithMeta src={s.src} />
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{s.prompt}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Showcase — features & démos génériques</h2>
            <p className="text-xs text-muted-foreground">
              Vidéos qui illustrent une fonctionnalité du produit (agent IA, etc.).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_FEATURES.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  <VideoWithMeta src={s.src} />
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{s.prompt}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

function VideoWithMeta({ src }: { src: string }) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (!cancelled && len) setSize(parseInt(len, 10));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  const fmtSize = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
  };

  return (
    <div className="space-y-1">
      <video
        src={src}
        controls
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDim({ w: v.videoWidth, h: v.videoHeight });
        }}
        className="rounded-md aspect-[9/16] bg-black max-w-[200px] w-full"
      />
      <div className="text-[11px] text-muted-foreground">
        {dim ? `${dim.w}×${dim.h}` : "…"}{size != null ? ` · ${fmtSize(size)}` : ""}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{job.duration_sec}s · {job.tone}</span>
        <span className="uppercase tracking-wide">{job.status}</span>
      </div>
      <p className="text-sm whitespace-pre-line">{job.prompt}</p>
      {job.status === "done" && job.output_url ? (
        <div className="space-y-2">
          <VideoWithMeta src={job.output_url} />
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
