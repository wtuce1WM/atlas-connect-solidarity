import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, PlayCircle, RefreshCw, Rocket, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import VideoPromoPanel from "@/components/staff/VideoPromoPanel";
import VideoJobMeta, {
  VARIANT_LABELS,
  videoJobFormatKey,
  videoJobVariantKey,
} from "@/components/staff/VideoJobMeta";

import VideoJobTitleEditor from "@/components/staff/VideoJobTitleEditor";
import VideoRenderPresetBar from "@/components/staff/VideoRenderPresetBar";

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

/**
 * Effets Remotion optionnels. Tous désactivés par défaut : un rendu sans case
 * cochée est identique à avant (aucun effet n'est transmis au worker).
 */
type EffectKey = "grain" | "vignette" | "lightLeaks" | "pathDraw" | "motionBlur";

const EFFECTS: { key: EffectKey; label: string; hint: string }[] = [
  { key: "pathDraw", label: "Tracé SVG animé", hint: "Cadre d'accroche dessiné au fil des frames (@remotion/paths)" },
  { key: "grain", label: "Grain argentique", hint: "Bruit Perlin animé, look cinéma" },
  { key: "vignette", label: "Vignettage", hint: "Assombrissement radial des bords" },
  { key: "lightLeaks", label: "Fuites de lumière", hint: "Halos organiques (@remotion/light-leaks)" },
  { key: "motionBlur", label: "Motion blur caméra", hint: "Coûteux : multiplie le temps de rendu par le nb d'échantillons" },
];

/** Presets de vitesse du tracé : un champ libre en frames n'apportait rien. */
const PATH_SPEEDS = [
  { label: "Rapide (~1 s)", value: 30 },
  { label: "Normal (~1,5 s)", value: 45 },
  { label: "Lent (~2,5 s)", value: 75 },
];

/** Portée du tracé : global ou ciblé sur une phase du montage Feed. */
type PathScope = "all" | "hook" | "detail";

const STROKE_PRESETS = [
  { label: "Or", value: "#D4AF37" },
  { label: "Terracotta", value: "#C1663F" },
  { label: "Blanc", value: "#FFFFFF" },
  { label: "WhatsApp", value: "#25D366" },
];

/** Montages : mêmes 5 options que Promo business (source de vérité unique). */
export type PromoVariant = "fullscreen" | "mockup" | "browser" | "multi" | "split";
const FRAMED: PromoVariant[] = ["mockup", "browser", "multi", "split"];
const isFramed = (v: PromoVariant) => FRAMED.includes(v);

const PRESET_BG = [
  { label: "Encre", value: "#1A130D" },
  { label: "Terracotta", value: "#C04F17" },
  { label: "Nuit", value: "#0E0B08" },
  { label: "Sable", value: "#ECD6B8" },
  { label: "Ardoise", value: "#3B3B3B" },
];

type FeedJob = {

  id: string;
  title: string | null;
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  template_id: string | null;
  duration_sec: number | null;
  business_id: string | null;
  template_props: any;
  scenario_json: any;
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

  // --- Montage (mêmes 5 options que Promo business)
  const [variant, setVariant] = useState<PromoVariant>("fullscreen");
  const [encode, setEncode] = useState<EncodeOptions>({ ...DEFAULT_ENCODE });

  const [mockupBg, setMockupBg] = useState(PRESET_BG[0].value);
  const [browserUrl, setBrowserUrl] = useState("oneworldmorocco.com");
  const [splitSide, setSplitSide] = useState<"left" | "right">("left");


  // --- Effets optionnels (tous off par défaut)
  const [effectsOn, setEffectsOn] = useState<Record<EffectKey, boolean>>({
    grain: false,
    vignette: false,
    lightLeaks: false,
    pathDraw: false,
    motionBlur: false,
  });
  const [intensity, setIntensity] = useState(50);
  const [strokeColor, setStrokeColor] = useState(STROKE_PRESETS[0].value);
  const [pathFrames, setPathFrames] = useState(45);
  const [motionBlurSamples, setMotionBlurSamples] = useState(3);
  const [pathScope, setPathScope] = useState<PathScope>("all");

  const anyEffect = Object.values(effectsOn).some(Boolean);

  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobBusinessNames, setJobBusinessNames] = useState<Record<string, string>>({});
  /** Couple Enregistrer / Rendre : le rendu part d'une configuration persistée. */
  const [presetDirty, setPresetDirty] = useState(true);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [relaunching, setRelaunching] = useState<string | null>(null);
  /** Filtres de comparaison des rendus : format de sortie et montage. */
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterVariant, setFilterVariant] = useState<string>("all");

  const visibleJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (filterFormat === "all" || videoJobFormatKey(j) === filterFormat) &&
          (filterVariant === "all" || (videoJobVariantKey(j) ?? "fullscreen") === filterVariant),
      ),
    [jobs, filterFormat, filterVariant],
  );

  const autoSlug = useMemo(() => slug.trim() || slugify(label || "feed"), [slug, label]);

  /** Configuration sérialisable de l'écran Feed (ce qui est enregistré). */
  const feedConfig = useMemo(
    () => ({
      url,
      label,
      slug,
      format,
      steps,
      stepSeconds,
      detailSeconds,
      hookHold,
      sectionPause,
      sectionMove,
      sections,
      variant,
      mockupBg,
      browserUrl,
      splitSide,
      effectsOn,
      intensity,
      strokeColor,
      pathFrames,
      motionBlurSamples,
      pathScope,
      encode,
    }),

    [
      url,
      label,
      slug,
      format,
      steps,
      stepSeconds,
      detailSeconds,
      hookHold,
      sectionPause,
      sectionMove,
      sections,
      variant,
      mockupBg,
      browserUrl,
      splitSide,
      effectsOn,
      intensity,
      strokeColor,
      pathFrames,
      motionBlurSamples,
      pathScope,
      encode,
    ],

  );


  const applyFeedConfig = useCallback((c: any) => {
    if (!c || typeof c !== "object") return;
    setUrl(c.url ?? "");
    setLabel(c.label ?? "");
    setSlug(c.slug ?? "");
    setFormat(c.format === "landscape" ? "landscape" : "portrait");
    setSteps(Number(c.steps ?? 6));
    setStepSeconds(Number(c.stepSeconds ?? 3));
    setDetailSeconds(Number(c.detailSeconds ?? 21));
    setHookHold(Number(c.hookHold ?? 50));
    setSectionPause(Number(c.sectionPause ?? 75));
    setSectionMove(Number(c.sectionMove ?? 50));
    setSections(Array.isArray(c.sections) ? c.sections : DEFAULT_SECTIONS);
    setVariant(isFramed(c.variant) ? (c.variant as PromoVariant) : "fullscreen");
    setMockupBg(c.mockupBg ?? PRESET_BG[0].value);
    setBrowserUrl(c.browserUrl ?? "oneworldmorocco.com");
    setSplitSide(c.splitSide === "right" ? "right" : "left");

    setEffectsOn({
      grain: !!c.effectsOn?.grain,
      vignette: !!c.effectsOn?.vignette,
      lightLeaks: !!c.effectsOn?.lightLeaks,
      pathDraw: !!c.effectsOn?.pathDraw,
      motionBlur: !!c.effectsOn?.motionBlur,
    });
    setIntensity(Number(c.intensity ?? 50));
    setStrokeColor(c.strokeColor ?? STROKE_PRESETS[0].value);
    setPathFrames(Number(c.pathFrames ?? 45));
    setMotionBlurSamples(Number(c.motionBlurSamples ?? 3));
    setPathScope((c.pathScope as PathScope) ?? "all");
  }, []);

  const handlePresetState = useCallback((dirty: boolean, id: string | null) => {
    setPresetDirty(dirty);
    setPresetId(id);
  }, []);

  const loadJobs = async () => {
    setLoadingJobs(true);
    const { data } = await supabase
      .from("video_jobs")
      .select(
        "id, title, status, output_url, error_message, created_at, template_id, duration_sec, business_id, template_props, scenario_json",
      )
      .like("template_id", "feed-template%")
      .order("created_at", { ascending: false })
      .limit(40);
    const rows = (data ?? []) as FeedJob[];
    setJobs(rows);
    const ids = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      ((biz as any[]) ?? []).forEach((b) => (map[b.id] = b.name));
      setJobBusinessNames(map);
    }
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
        // Montage (mêmes options que Promo business) — stocké tel quel dans le job.
        variant,
        mockupBg: isFramed(variant) ? mockupBg : null,
        browserUrl: variant === "browser" || variant === "multi" ? browserUrl.trim() || "oneworldmorocco.com" : null,
        splitSide: variant === "split" ? splitSide : null,

        timing: {
          hookHold,
          sectionPause,
          sectionMove,
        },
        // Rien n'est envoyé si aucun effet n'est coché : rendu strictement identique.
        ...(anyEffect
          ? {
              effects: {
                ...effectsOn,
                intensity: intensity / 100,
                strokeColor,
                pathFrames,
                motionBlurSamples,
                pathScope,
              },
            }
          : {}),
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

  /** Relance un rendu à l'identique depuis un job existant (aucune ressaisie). */
  const relaunchJob = async (job: FeedJob) => {
    setRelaunching(job.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("video_jobs").insert({
      user_id: auth.user?.id ?? null,
      business_id: job.business_id,
      title: job.title,
      prompt: `Relance — ${job.title ?? job.id.slice(0, 8)}`,
      status: "pending",
      duration_sec: job.duration_sec,
      template_id: job.template_id,
      template_props: job.template_props,
      scenario_json: job.scenario_json,
    } as any);
    if (error) {
      setRelaunching(null);
      toast.error(`Relance impossible : ${error.message}`);
      return;
    }
    const { error: wfError } = await supabase.functions.invoke("trigger-render-workflow", { body: {} });
    setRelaunching(null);
    if (wfError) toast.warning("Job créé, déclenchement GitHub à refaire au prochain cycle.");
    else toast.success("Rendu relancé à l'identique.");
    loadJobs();
  };

  const openCorporateStudio = () => {
    localStorage.setItem("studio-video:mode", "corporate");
    navigate("/studio-video");
  };

  return (
    <Tabs defaultValue="feed" className="space-y-6 form-legible">
      <TabsList>
        <TabsTrigger value="feed" className="gap-2">
          <Film className="h-4 w-4" /> Scénario Feed
        </TabsTrigger>
        <TabsTrigger value="promo" className="gap-2">
          <Sparkles className="h-4 w-4" /> Promo business
        </TabsTrigger>
      </TabsList>

      <TabsContent value="promo">
        <VideoPromoPanel />
      </TabsContent>

      <TabsContent value="feed" className="space-y-6">
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

          <div className="rounded-lg border p-3 grid gap-3">
            <div className="grid gap-1 text-xs text-muted-foreground">
              Montage
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    ["fullscreen", "Plein écran"],
                    ["mockup", "Mockup smartphone"],
                    ["browser", "Mockup navigateur"],
                    ["multi", "Multi-écrans"],
                    ["split", "Split média / texte"],
                  ] as const
                ).map(([v, lbl]) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={variant === v ? "default" : "outline"}
                    onClick={() => {
                      setVariant(v);
                      if (v === "browser" || v === "multi" || v === "split") setFormat("landscape");
                    }}
                  >
                    {lbl}
                  </Button>
                ))}
              </div>
              <span className="text-[11px]">
                Mêmes montages que « Promo business » : la capture du feed s'affiche dans le cadre choisi (plein écran,
                smartphone, navigateur, multi-écrans, ou split média / texte).
              </span>
            </div>
            {(variant === "browser" || variant === "multi") && (
              <label className="grid gap-1 text-xs text-muted-foreground">
                URL affichée dans la barre d'adresse
                <Input
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  placeholder="oneworldmorocco.com"
                  className="h-9 text-xs"
                />
              </label>
            )}
            {variant === "split" && (
              <div className="grid gap-1 text-xs text-muted-foreground">
                Position du mockup
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={splitSide === "left" ? "default" : "outline"} onClick={() => setSplitSide("left")}>
                    Mockup à gauche
                  </Button>
                  <Button size="sm" variant={splitSide === "right" ? "default" : "outline"} onClick={() => setSplitSide("right")}>
                    Mockup à droite
                  </Button>
                </div>
              </div>
            )}
            {isFramed(variant) && (
              <div className="grid gap-1 text-xs text-muted-foreground">
                Fond uni du mockup
                <div className="flex items-center gap-2">
                  {PRESET_BG.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setMockupBg(c.value)}
                      className={`h-7 w-7 rounded-full border-2 ${mockupBg === c.value ? "border-primary" : "border-transparent"}`}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
              </div>
            )}
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

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-black">Effets de motion design (optionnels)</span>
              {!anyEffect && (
                <Badge variant="outline" className="text-[10px]">
                  aucun — rendu standard
                </Badge>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {EFFECTS.map((e) => (
                <label
                  key={e.key}
                  className="flex items-start gap-3 rounded-md border p-2 cursor-pointer"
                  htmlFor={`effect-${e.key}`}
                >
                  <Switch
                    id={`effect-${e.key}`}
                    checked={effectsOn[e.key]}
                    onCheckedChange={(v) => setEffectsOn((prev) => ({ ...prev, [e.key]: v }))}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-xs text-black">{e.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-snug">{e.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {anyEffect && (
              <div className="grid gap-3 md:grid-cols-2 border-t pt-3">
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Intensité générale : {intensity}%</span>
                  <Slider
                    value={[intensity]}
                    onValueChange={(v) => setIntensity(v[0] ?? 50)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                {effectsOn.pathDraw && (
                  <>
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">Couleur du tracé</span>
                      <div className="flex flex-wrap gap-2">
                        {STROKE_PRESETS.map((p) => (
                          <Button
                            key={p.value}
                            size="sm"
                            variant={strokeColor === p.value ? "default" : "outline"}
                            className="h-7 text-[11px] gap-2"
                            onClick={() => setStrokeColor(p.value)}
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-black/20"
                              style={{ backgroundColor: p.value }}
                            />
                            {p.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Vitesse du tracé
                      <select
                        value={String(pathFrames)}
                        onChange={(e) => setPathFrames(Number(e.target.value) || 45)}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        {PATH_SPEEDS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Portée du tracé (accent par étape)
                      <select
                        value={pathScope}
                        onChange={(e) => setPathScope(e.target.value as PathScope)}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="all">Toute la vidéo</option>
                        <option value="hook">Accroche / défilement uniquement</option>
                        <option value="detail">Fiche ouverte uniquement</option>
                      </select>
                    </label>
                  </>
                )}
                {effectsOn.motionBlur && (
                  <label className="text-xs text-muted-foreground grid gap-1">
                    Échantillons de motion blur (coût ×{motionBlurSamples})
                    <Input
                      type="number"
                      min={2}
                      max={4}
                      value={motionBlurSamples}
                      onChange={(e) => setMotionBlurSamples(Math.max(2, Math.min(4, Number(e.target.value) || 3)))}
                      className="h-9 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Plafonné à 4 : au-delà, le temps de rendu explose sans gain visible.
                    </span>
                  </label>
                )}
              </div>
            )}
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

          <VideoRenderPresetBar
            kind="feed"
            config={feedConfig}
            defaultName={label.trim() || autoSlug}
            onApply={applyFeedConfig}
            onDirtyChange={handlePresetState}
          />

          <div className="flex items-center justify-between gap-3 flex-wrap border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Durée estimée : ~{Math.round(stepSeconds * Math.max(0, steps - 1) + detailSeconds)}s
              {(!presetId || presetDirty) && (
                <>
                  <br />
                  Enregistre la configuration pour activer « Rendre ».
                </>
              )}
            </span>
            <Button onClick={submitFeed} disabled={submitting || !presetId || presetDirty}>
              <Rocket className="h-4 w-4 mr-2" />
              {submitting ? "Envoi…" : "Rendre"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-black text-base">Derniers jobs Feed</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs form-legible"
              title="Filtrer par format de sortie"
            >
              <option value="all">Tous les formats</option>
              <option value="landscape">Paysage 1920×1080</option>
              <option value="portrait">Portrait 1080×1920</option>
            </select>
            <select
              value={filterVariant}
              onChange={(e) => setFilterVariant(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs form-legible"
              title="Filtrer par montage"
            >
              <option value="all">Tous les montages</option>
              {Object.entries(VARIANT_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={loadJobs} disabled={loadingJobs}>
              <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visibleJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {jobs.length === 0 ? "Aucun job Feed pour le moment." : "Aucun job ne correspond à ces filtres."}
            </p>
          ) : (
            <div className="divide-y">
              {visibleJobs.map((j) => (

                <div key={j.id} className="py-3 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <Badge
                      variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {j.status}
                    </Badge>
                    <VideoJobTitleEditor
                      jobId={j.id}
                      title={j.title}
                      onSaved={(next) =>
                        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, title: next } : x)))
                      }
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">{j.template_id}</span>
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
                      <span className="text-[11px] text-destructive max-w-md truncate">{j.error_message}</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] ml-auto"
                      onClick={() => relaunchJob(j)}
                      disabled={relaunching === j.id}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {relaunching === j.id ? "Relance…" : "Rendre à nouveau"}
                    </Button>
                  </div>
                  <VideoJobMeta
                    job={j}
                    businessName={j.business_id ? jobBusinessNames[j.business_id] : undefined}
                  />
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
      </TabsContent>
    </Tabs>
  );
};

export default VideoGeneratePanel;
