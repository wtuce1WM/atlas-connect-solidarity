import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import VideoJobMeta from "@/components/staff/VideoJobMeta";
import VideoRenderPresetBar from "@/components/staff/VideoRenderPresetBar";
import { Checkbox } from "@/components/ui/checkbox";
import { Rocket, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { isInternalVideoUrl } from "@/lib/videoSourceFilter";
import RichTextEditor from "@/components/staff/RichTextEditor";

/**
 * Sous-onglet « Promo business » de l'onglet Générer.
 *
 * Aucun Playwright, aucun appel IA : le scénario est alimenté par les assets
 * déjà en base (vidéo interne + 4 premières images de la fiche). L'entrée peut
 * être un slug/nom d'établissement OU une URL 1WM (fiche ou /search?openBusiness=).
 */

const PRESET_BG = [
  { label: "Encre", value: "#1A130D" },
  { label: "Terracotta", value: "#C04F17" },
  { label: "Nuit", value: "#0E0B08" },
  { label: "Sable", value: "#ECD6B8" },
  { label: "Ardoise", value: "#3B3B3B" },
];

type Biz = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  hook_fr: string | null;
  images: string[] | null;
  logo_url: string | null;
};

type PromoJob = {
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

/** Extrait un slug ou un id depuis une URL 1WM. */
const parseOwmUrl = (raw: string): { slug?: string; id?: string } | null => {
  try {
    const u = new URL(raw.trim());
    const openId = u.searchParams.get("openBusiness");
    if (openId) return { id: openId };
    const m = u.pathname.match(/\/(?:fiche|business)\/([^/?#]+)/);
    if (m) return { slug: decodeURIComponent(m[1]) };
    return null;
  } catch {
    return null;
  }
};

const VideoPromoPanel = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Biz[]>([]);
  const [searching, setSearching] = useState(false);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hook, setHook] = useState("");
  const [tagline, setTagline] = useState("");
  const [text, setText] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bgFeedUrl, setBgFeedUrl] = useState("");
  const [format, setFormat] = useState<"portrait" | "landscape">("portrait");
  const [variant, setVariant] = useState<"fullscreen" | "mockup">("fullscreen");
  const [mockupBg, setMockupBg] = useState(PRESET_BG[0].value);
  const [blocks, setBlocks] = useState({ hook: true, video: true, photos: true, outro: true });
  const [seconds, setSeconds] = useState({ hook: 3, video: 5, photo: 1.5, outro: 2.5 });

  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<PromoJob[]>([]);
  const [jobBusinessNames, setJobBusinessNames] = useState<Record<string, string>>({});
  /** Couple Enregistrer / Rendre : le rendu part d'une configuration persistée. */
  const [presetDirty, setPresetDirty] = useState(true);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [relaunching, setRelaunching] = useState<string | null>(null);

  const images = useMemo(() => (biz?.images || []).slice(0, 4), [biz]);
  /** Longueur du texte hors balises : la limite de 500 porte sur le contenu lisible. */
  const textLength = useMemo(() => text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length, [text]);

  const estimated = useMemo(() => {
    let s = 0;
    if (blocks.hook) s += seconds.hook;
    if (blocks.video && videoUrl) s += seconds.video;
    if (blocks.photos) s += seconds.photo * images.length;
    // Le texte n'est plus une étape : il est en surimpression sur Vidéo/Photos.
    if (blocks.outro) s += seconds.outro;
    return Math.round(s * 10) / 10;
  }, [blocks, seconds, videoUrl, images.length, textLength]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("video_jobs")
      .select(
        "id, title, status, output_url, error_message, created_at, template_id, duration_sec, business_id, template_props, scenario_json",
      )
      .like("template_id", "business-promo%")
      .order("created_at", { ascending: false })
      .limit(12);
    const rows = (data ?? []) as PromoJob[];
    setJobs(rows);
    const ids = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      ((biz as any[]) ?? []).forEach((b) => (map[b.id] = b.name));
      setJobBusinessNames(map);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const selectBusiness = async (b: Biz) => {
    setBiz(b);
    setResults([]);
    setQuery(b.name);
    setHook((prev) => prev || b.hook_fr || "");
    setLogoUrl(b.logo_url || null);
    const { data } = await supabase
      .from("business_documents")
      .select("id,url,name,sort_order,type")
      .eq("business_id", b.id)
      .eq("type", "video")
      .order("sort_order", { ascending: true });
    const internal = ((data ?? []) as any[]).find((d) => isInternalVideoUrl(d.url));
    setVideoUrl(internal?.url ?? null);
  };

  /**
   * Saisie auto-complete : debounce 250 ms sur le champ. Une URL 1WM est
   * résolue directement (fiche ou /search?openBusiness=), sinon on propose les
   * établissements dont le nom ou le slug correspond.
   */
  useEffect(() => {
    const raw = query.trim();
    if (raw.length < 2 || (biz && raw === biz.name)) {
      setResults([]);
      return;
    }
    const cols = "id, name, slug, city, hook_fr, images, logo_url";
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const parsed = parseOwmUrl(raw);
      if (parsed) {
        const q = supabase.from("businesses").select(cols);
        const { data } = parsed.id ? await q.eq("id", parsed.id).limit(1) : await q.eq("slug", parsed.slug!).limit(1);
        const found = ((data ?? []) as any[])[0];
        if (cancelled) return;
        setSearching(false);
        if (!found) {
          toast.error("Aucun établissement pour cette URL 1WM");
          return;
        }
        await selectBusiness(found as Biz);
        return;
      }
      const { data } = await supabase
        .from("businesses")
        .select(cols)
        .or(`name.ilike.%${raw}%,slug.ilike.%${raw}%`)
        .limit(12);
      if (cancelled) return;
      setResults((data ?? []) as Biz[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);


  /** Configuration sérialisable de l'écran Promo (ce qui est enregistré). */
  const promoConfig = useMemo(
    () => ({
      businessId: biz?.id ?? null,
      hook,
      tagline,
      text,
      bgFeedUrl,
      format,
      variant,
      mockupBg,
      blocks,
      seconds,
    }),
    [biz?.id, hook, tagline, text, bgFeedUrl, format, variant, mockupBg, blocks, seconds],
  );

  const applyPromoConfig = useCallback(async (c: any) => {
    if (!c || typeof c !== "object") return;
    setHook(c.hook ?? "");
    setTagline(c.tagline ?? "");
    setText(c.text ?? "");
    setBgFeedUrl(c.bgFeedUrl ?? "");
    setFormat(c.format === "landscape" ? "landscape" : "portrait");
    setVariant(c.variant === "mockup" ? "mockup" : "fullscreen");
    setMockupBg(c.mockupBg ?? PRESET_BG[0].value);
    setBlocks({
      hook: c.blocks?.hook ?? true,
      video: c.blocks?.video ?? true,
      photos: c.blocks?.photos ?? true,
      outro: c.blocks?.outro ?? true,
    });
    setSeconds({
      hook: Number(c.seconds?.hook ?? 3),
      video: Number(c.seconds?.video ?? 5),
      photo: Number(c.seconds?.photo ?? 1.5),
      outro: Number(c.seconds?.outro ?? 2.5),
    });
    if (c.businessId) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, city, hook_fr, images, logo_url")
        .eq("id", c.businessId)
        .maybeSingle();
      if (data) await selectBusiness(data as Biz);
    }
  }, []);

  const handlePresetState = useCallback((dirty: boolean, id: string | null) => {
    setPresetDirty(dirty);
    setPresetId(id);
  }, []);

  /** Relance un rendu à l'identique depuis un job existant (aucune ressaisie). */
  const relaunchJob = async (job: PromoJob) => {
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

  const submit = async () => {
    if (!biz) {
      toast.error("Sélectionne un établissement (nom, slug ou URL 1WM)");
      return;
    }
    if (textLength > 500) {
      toast.error("Le texte dépasse 500 caractères");
      return;
    }
    if (blocks.hook && !hook.trim()) {
      toast.error("Renseigne le hook ou décoche le bloc Hook");
      return;
    }
    if (!blocks.hook && !blocks.video && !blocks.photos && !blocks.outro) {
      toast.error("Active au moins un bloc");
      return;
    }
    setSubmitting(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      user_id: auth.user?.id ?? null,
      business_id: biz.id,
      title: `Promo — ${biz.name}`,
      prompt: hook.trim() || biz.name,
      status: "pending",
      duration_sec: Math.round(estimated),
      template_id: format === "landscape" ? "business-promo-landscape" : "business-promo",
      template_props: {
        kind: "promo",
        name: biz.name,
        city: biz.city,
        hook: hook.trim(),
        tagline: tagline.trim() || null,
        text: textLength > 0 ? text : null,
        logoUrl,
        bgFeedUrl: bgFeedUrl.trim() || null,
        videoUrl: blocks.video ? videoUrl : null,
        images,
        format,
        variant,
        mockupBg,
        blocks,
        seconds,
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
    if (wfError) toast.warning("Job créé, mais le déclenchement GitHub a échoué.");
    else toast.success("Job créé : rendu lancé.");
    loadJobs();
  };

  const numField = (
    label: string,
    key: keyof typeof seconds,
    min: number,
    max: number,
    step = 0.5,
  ) => (
    <label className="text-xs text-muted-foreground grid gap-1">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={seconds[key]}
        onChange={(e) =>
          setSeconds((prev) => ({ ...prev, [key]: Math.max(min, Math.min(max, Number(e.target.value) || min)) }))
        }
        className="h-9 text-xs"
      />
    </label>
  );

  return (
    <div className="space-y-6 form-legible">
      <Card>
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Promo business (assets de la fiche)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Montage direct depuis la base : vidéo interne + 4 premières images. Aucun crédit IA, aucune capture — seul
            le rendu Remotion est facturé.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <label className="text-xs text-muted-foreground grid gap-1">
              Établissement — nom, slug ou URL 1WM
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chaabi Payment  ·  https://oneworldmorocco.com/fiche/chaabi-payment"
                className="h-9 text-xs"
              />
              <span className="text-[11px]">
                {searching ? "Recherche…" : "Saisie automatique : tape 2 caractères, ou colle une URL 1WM."}
              </span>
            </label>
          </div>

          {results.length > 0 && (
            <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectBusiness(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <span className="text-black font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.city}</span>
                  <span className="text-muted-foreground font-mono ml-auto">{r.slug}</span>
                </button>
              ))}
            </div>
          )}


          {biz && (
            <div className="rounded-lg border p-3 flex flex-wrap items-center gap-3 text-xs">
              <Badge variant="outline">{biz.name}</Badge>
              <span className="text-muted-foreground">{images.length} image(s)</span>
              <span className={videoUrl ? "text-emerald-600" : "text-destructive"}>
                {videoUrl ? "vidéo interne trouvée" : "aucune vidéo interne"}
              </span>
              <div className="flex gap-1 ml-auto">
                {images.map((src) => (
                  <img key={src} src={src} alt="" className="h-10 w-10 rounded object-cover" />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted-foreground grid gap-1">
              Hook (texte affiché)
              <Input
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="La solution de paiement qui transforme votre activité"
                className="h-9 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Tagline d'outro (optionnel)
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One World Morocco"
                className="h-9 text-xs"
              />
            </label>
          </div>

          <div className="rounded-lg border p-3 grid gap-3">
            <div className="grid gap-1 text-xs text-muted-foreground">
              Format de sortie
              <div className="flex items-center gap-2">
                <Button size="sm" variant={format === "portrait" ? "default" : "outline"} onClick={() => setFormat("portrait")}>
                  Portrait 1080×1920
                </Button>
                <Button size="sm" variant={format === "landscape" ? "default" : "outline"} onClick={() => setFormat("landscape")}>
                  Paysage 1920×1080
                </Button>
              </div>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              Montage
              <div className="flex items-center gap-2">
                <Button size="sm" variant={variant === "fullscreen" ? "default" : "outline"} onClick={() => setVariant("fullscreen")}>
                  Plein écran
                </Button>
                <Button size="sm" variant={variant === "mockup" ? "default" : "outline"} onClick={() => setVariant("mockup")}>
                  Mockup smartphone
                </Button>
              </div>
              <span className="text-[11px]">
                Le paysage est désormais un vrai cadre 16:9 (logo à gauche, accroche à droite), sans bandes noires.
              </span>
            </div>
            {variant === "mockup" && (
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


          <div className="rounded-lg border p-3 grid gap-3">
            <span className="text-xs text-muted-foreground">Logo animé & fond d'écran</span>
            <div className="flex items-center gap-3 text-xs">
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="" className="h-10 w-auto max-w-[120px] object-contain bg-black/80 rounded px-1" />
                  <span className="text-emerald-600">logo animé dans l'intro et l'outro</span>
                </>
              ) : (
                <span className="text-muted-foreground">Aucun logo sur la fiche — intro/outro sans animation de logo.</span>
              )}
            </div>
            <label className="text-xs text-muted-foreground grid gap-1">
              Fond d'écran vidéo — URL /search (swipe vertical, optionnel)
              <Input
                value={bgFeedUrl}
                onChange={(e) => setBgFeedUrl(e.target.value)}
                placeholder="https://oneworldmorocco.com/search?pinIds=…"
                className="h-9 text-xs"
              />
              <span className="text-[11px]">
                Déclenche une capture Playwright du feed : les vidéos des résultats défilent en fond derrière le logo,
                le hook et le texte. Sans URL, le fond reste la vidéo/photo de la fiche floutée.
              </span>
            </label>
          </div>

          <div className="rounded-lg border p-3 grid gap-3">
            <span className="text-xs text-muted-foreground">Blocs et durées</span>
            <div className="grid gap-3 md:grid-cols-4">
              {([
                ["hook", "Hook"],
                ["video", "Vidéo"],
                ["photos", "Photos"],
                ["outro", "Outro"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-black">
                  <Checkbox
                    checked={blocks[key]}
                    onCheckedChange={(v) => setBlocks((prev) => ({ ...prev, [key]: v === true }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {numField("Hook (s)", "hook", 1, 10)}
              {numField("Vidéo (s)", "video", 1, 20)}
              {numField("Par photo (s)", "photo", 0.5, 8)}
              {numField("Outro (s)", "outro", 1, 10)}
            </div>

            {/* Le texte n'est plus une étape : il se superpose aux plans Vidéo et Photos. */}
            <div className="border-t pt-3 grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Texte du bloc « Texte » (Rich Text, 500 caractères max)
                </span>
                <span className={`text-[11px] ${textLength > 500 ? "text-destructive" : "text-muted-foreground"}`}>
                  {textLength}/500
                </span>
              </div>
              <RichTextEditor
                content={text}
                onChange={setText}
                simple
                placeholder="La solution de paiement multicanal de M2T…"
              />
              <span className="text-[11px] text-muted-foreground">
                Affiché en surimpression sur les plans Vidéo et Photos (titres H et paragraphes respectés).
              </span>
            </div>
          </div>



          <VideoRenderPresetBar
            kind="promo"
            config={promoConfig}
            businessId={biz?.id ?? null}
            defaultName={biz ? `Promo — ${biz.name}` : undefined}
            onApply={applyPromoConfig}
            onDirtyChange={handlePresetState}
          />

          <div className="flex items-center justify-between gap-3 flex-wrap border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Durée estimée : ~{estimated}s
              {(!presetId || presetDirty) && (
                <>
                  <br />
                  Enregistre la configuration pour activer « Rendre ».
                </>
              )}
            </span>
            <Button onClick={submit} disabled={submitting || !presetId || presetDirty}>
              <Rocket className="h-4 w-4 mr-2" />
              {submitting ? "Envoi…" : "Rendre"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-black text-base">Derniers jobs Promo</CardTitle>
          <Button size="sm" variant="outline" onClick={loadJobs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun job Promo pour le moment.</p>
          ) : (
            <div className="divide-y">
              {jobs.map((j) => (
                <div key={j.id} className="py-3 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <Badge
                      variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {j.status}
                    </Badge>
                    <span className="text-black font-medium">{j.title || j.id.slice(0, 8)}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{j.template_id}</span>
                    {j.output_url && (
                      <a href={j.output_url} target="_blank" rel="noreferrer" className="text-[11px] underline text-primary ml-auto">
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
    </div>
  );
};

export default VideoPromoPanel;
