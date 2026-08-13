import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Film, PlayCircle, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";

/**
 * Onglet « Générer » du back-office vidéo.
 *
 * Deux chaînes de production :
 *  - Feed (URL /search) : capture Playwright + rendu Remotion via le template
 *    paramétrique (manifest). Le job part dans video_jobs, GitHub Actions
 *    capture puis rend.
 *  - Corporate : ouverture de Studio Vidéo IA directement en mode corporate
 *    (scénario édité dans l'onglet « Scénario »).
 */

const DEFAULT_SECTIONS = ["Avis clients", "Vidéos", "Assistant IA", "À proximité"];

type FeedJob = {
  id: string;
  title: string | null;
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  template_id: string | null;
};

const slugify = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const VideoGeneratePanel = () => {
  const navigate = useNavigate();

  // --- Paramètres du scénario Feed
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [format, setFormat] = useState<"portrait" | "landscape">("portrait");
  const [steps, setSteps] = useState(6);
  const [stepSeconds, setStepSeconds] = useState(3);
  const [detailSeconds, setDetailSeconds] = useState(21);
  const [hookHold, setHookHold] = useState(50);
  const [sectionPause, setSectionPause] = useState(75);
  const [sectionMove, setSectionMove] = useState(50);
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [extraSection, setExtraSection] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const autoSlug = useMemo(() => slug.trim() || slugify(label || "feed"), [slug, label]);

  const loadJobs = async () => {
    setLoadingJobs(true);
    const { data } = await supabase
      .from("video_jobs")
      .select("id, title, status, output_url, error_message, created_at, template_id")
      .like("template_id", "feed-template%")
      .order("created_at", { ascending: false })
      .limit(12);
    setJobs((data ?? []) as FeedJob[]);
    setLoadingJobs(false);
  };

  useEffect(() => {
    loadJobs();
    const channel = supabase
      .channel("video_jobs_generate")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => loadJobs())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleSection = (s: string) =>
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submitFeed = async () => {
    if (!/^https?:\/\/.+\/search\?/.test(url.trim())) {
      toast.error("Renseigne une URL de feed /search complète");
      return;
    }
    if (sections.length === 0) {
      toast.error("Sélectionne au moins une section d'arrêt");
      return;
    }
    setSubmitting(true);
    const { data: auth } = await supabase.auth.getUser();
    const fps = 25;
    const payload = {
      user_id: auth.user?.id ?? null,
      business_id: null,
      title: label.trim() || autoSlug,
      prompt: `Vidéo feed — ${label.trim() || autoSlug}`,
      status: "pending",
      duration_sec: Math.round(stepSeconds * Math.max(0, steps - 1) + detailSeconds),
      template_id: format === "landscape" ? "feed-template-landscape" : "feed-template",
      template_props: {
        kind: "feed",
        url: url.trim(),
        slug: autoSlug,
        label: label.trim() || autoSlug,
        format,
        steps,
        fps,
        stepSeconds,
        detailSeconds,
        sections,
        timing: {
          hookHold,
          sectionPause,
          sectionMove,
        },
      },
    };

    const { error } = await supabase.from("video_jobs").insert(payload as any);
    if (error) {
      setSubmitting(false);
      toast.error(`Création du job impossible : ${error.message}`);
      return;
    }
    const { error: wfError } = await supabase.functions.invoke("trigger-render-workflow", { body: {} });
    setSubmitting(false);
    if (wfError) {
      toast.warning("Job créé, mais le déclenchement GitHub a échoué (il sera pris au prochain cycle).");
    } else {
      toast.success("Job créé : capture puis rendu lancés.");
    }
    loadJobs();
  };

  const openCorporateStudio = () => {
    localStorage.setItem("studio-video:mode", "corporate");
    navigate("/studio-video");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Film className="h-5 w-5" /> Scénario Feed (depuis une URL /search)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Capture réelle du feed in-app (Playwright) puis montage par le template paramétrique. Aucun recalibrage :
            tout passe par le manifest généré à la capture.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted-foreground grid gap-1 md:col-span-2">
              URL du feed
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://oneworldmorocco.com/search?subcats=Night%20Club&city=Marrakech&label=Vie%20nocturne"
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Titre de la vidéo
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Vie nocturne à Marrakech"
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Dossier (slug) — laissé vide : déduit du titre
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={autoSlug}
                className="h-9 text-xs"
              />
            </label>
          </div>

          <div className="rounded-lg border p-3 grid gap-3 md:grid-cols-4">
            <div className="grid gap-1 text-xs text-muted-foreground md:col-span-2">
              Format de sortie
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={format === "portrait" ? "default" : "outline"}
                  onClick={() => setFormat("portrait")}
                >
                  Portrait 1080×1920
                </Button>
                <Button
                  size="sm"
                  variant={format === "landscape" ? "default" : "outline"}
                  onClick={() => setFormat("landscape")}
                >
                  Paysage 1920×1080
                </Button>
              </div>
            </div>
            <label className="text-xs text-muted-foreground grid gap-1">
              Nombre de fiches (étapes)
              <Input
                type="number"
                min={1}
                max={12}
                value={steps}
                onChange={(e) => setSteps(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Temps par fiche (s)
              <Input
                type="number"
                min={1}
                max={15}
                step={0.5}
                value={stepSeconds}
                onChange={(e) => setStepSeconds(Number(e.target.value) || 3)}
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Durée de la fiche détaillée (s)
              <Input
                type="number"
                min={5}
                max={60}
                value={detailSeconds}
                onChange={(e) => setDetailSeconds(Number(e.target.value) || 21)}
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Pause sur le hook (frames)
              <Input
                type="number"
                min={0}
                max={200}
                value={hookHold}
                onChange={(e) => setHookHold(Number(e.target.value) || 0)}
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Pause par section (frames)
              <Input
                type="number"
                min={0}
                max={200}
                value={sectionPause}
                onChange={(e) => setSectionPause(Number(e.target.value) || 0)}
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Vitesse de défilement (frames)
              <Input
                type="number"
                min={10}
                max={200}
                value={sectionMove}
                onChange={(e) => setSectionMove(Number(e.target.value) || 50)}
                className="h-9 text-xs"
              />
            </label>
          </div>

          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">Sections d'arrêt dans la fiche détaillée</span>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set([...DEFAULT_SECTIONS, ...sections])).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={sections.includes(s) ? "default" : "outline"}
                  className="h-7 text-[11px]"
                  onClick={() => toggleSection(s)}
                >
                  {s}
                </Button>
              ))}
              <Input
                value={extraSection}
                onChange={(e) => setExtraSection(e.target.value)}
                placeholder="Autre section…"
                className="h-7 w-40 text-[11px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => {
                  const v = extraSection.trim();
                  if (!v) return;
                  setSections((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  setExtraSection("");
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Durée estimée : ~{Math.round(stepSeconds * Math.max(0, steps - 1) + detailSeconds)}s
            </span>
            <Button onClick={submitFeed} disabled={submitting}>
              <Rocket className="h-4 w-4 mr-2" />
              {submitting ? "Envoi…" : "Générer la vidéo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-black text-base">Derniers jobs Feed</CardTitle>
          <Button size="sm" variant="outline" onClick={loadJobs} disabled={loadingJobs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun job Feed pour le moment.</p>
          ) : (
            <div className="divide-y">
              {jobs.map((j) => (
                <div key={j.id} className="py-2 flex items-center gap-3 flex-wrap text-sm">
                  <Badge
                    variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {j.status}
                  </Badge>
                  <span className="text-black font-medium">{j.title || j.id.slice(0, 8)}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{j.template_id}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(j.created_at).toLocaleString("fr-FR")}
                  </span>
                  {j.output_url && (
                    <a
                      href={j.output_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] underline text-primary ml-auto"
                    >
                      Ouvrir la vidéo
                    </a>
                  )}
                  {j.error_message && (
                    <span className="text-[11px] text-destructive ml-auto max-w-md truncate">{j.error_message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2 text-base">
            <PlayCircle className="h-5 w-5" /> Vidéo Corporate
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Les vidéos corporate (anciennement « explicatives ») se génèrent dans Studio Vidéo IA en mode corporate.
            Leurs étapes et textes s'éditent dans l'onglet « Scénario », mode Corporate.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={openCorporateStudio}>Ouvrir Studio Vidéo IA en mode corporate</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoGeneratePanel;
