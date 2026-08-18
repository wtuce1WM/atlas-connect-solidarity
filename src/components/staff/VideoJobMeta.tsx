import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/imageCompression";

/**
 * Métadonnées partagées des jobs vidéo (Promo business, Scénario Feed,
 * Montages storyboard).
 * Même grammaire d'affichage que le bloc de caractéristiques des « Montages
 * vidéo » : nom réel du fichier + format, durée, étapes, effets. Pas de
 * « Modifié le » : les jobs ne sont pas éditables après coup.
 */
export type VideoJobMetaRow = {
  id: string;
  title: string | null;
  created_at: string;
  duration_sec?: number | null;
  template_id: string | null;
  template_props?: any;
  scenario_json?: any;
  output_url: string | null;
};

const slugify = (s: string) =>
  (s || "video-1wm")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "video-1wm";

/** Nom réel du fichier rendu (généré côté worker), repli sur un slug du titre. */
export const videoJobFileName = (url: string | null, fallback?: string | null) => {
  try {
    const name = decodeURIComponent(new URL(url || "").pathname.split("/").pop() || "");
    if (name.toLowerCase().endsWith(".mp4")) return name;
  } catch {
    /* URL relative ou vide */
  }
  return `${slugify(fallback || "video-1wm")}.mp4`;
};

const frDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const EFFECT_LABELS: Record<string, string> = {
  grain: "grain",
  vignette: "vignettage",
  lightLeaks: "fuites de lumière",
  pathDraw: "tracé SVG",
  motionBlur: "motion blur",
};

/** Clé de format normalisée (sert aussi aux filtres des listes de jobs). */
export const videoJobFormatKey = (job: VideoJobMetaRow): "landscape" | "portrait" => {
  const p = job.template_props ?? {};
  const w = Number(p.width);
  const h = Number(p.height);
  if (w > 0 && h > 0) return w >= h ? "landscape" : "portrait";
  const raw = `${job.template_id ?? ""} ${p.format ?? ""} ${p.orientation ?? ""}`.toLowerCase();
  return raw.includes("landscape") || raw.includes("paysage") ? "landscape" : "portrait";
};

export const FORMAT_LABELS: Record<string, string> = {
  landscape: "Paysage 1920×1080",
  portrait: "Portrait 1080×1920",
};

const detectFormat = (job: VideoJobMetaRow) => FORMAT_LABELS[videoJobFormatKey(job)];

const collectSteps = (job: VideoJobMetaRow): string[] => {
  const p = job.template_props ?? {};
  const s = job.scenario_json ?? {};
  const order =
    (Array.isArray(p.scene_order) && p.scene_order) ||
    (Array.isArray(s.scene_order) && s.scene_order) ||
    (Array.isArray(s?.studio_options?.scene_order) && s.studio_options.scene_order) ||
    (Array.isArray(p.sections) && p.sections) ||
    (Array.isArray(p.sequence) && p.sequence) ||
    (Array.isArray(p.steps) && p.steps) ||
    (Array.isArray(s.steps) && s.steps.map((x: any) => x?.type ?? x?.kind ?? "étape")) ||
    (Array.isArray(s.scenes) && s.scenes.map((x: any) => x?.type ?? x?.kind ?? "étape")) ||
    [];
  const list = (order as any[]).map((x) => (typeof x === "string" ? x : (x?.type ?? x?.label ?? "étape")));
  if (list.length > 0) return list;
  // Promo business : les blocs cochés SONT les étapes du montage (1 bloc = 1 étape,
  // « Photos » reste une seule étape même avec plusieurs images).
  const b = p.blocks;
  if (b && typeof b === "object") {
    const out: string[] = [];
    if (b.hook) out.push("hook");
    if (b.video && p.videoUrl) out.push("vidéo");
    if (b.photos) {
      const n = Array.isArray(p.images) ? p.images.length : 0;
      out.push(n > 0 ? `photos (${n})` : "photos");
    }
    if (b.outro) out.push("outro");
    return out;
  }
  return [];
};

const collectEffects = (job: VideoJobMetaRow): string[] => {
  const e = job.template_props?.effects ?? job.scenario_json?.effects ?? {};
  return Object.entries(e)
    .filter(([, v]) => v === true || (v && typeof v === "object" && (v as any).enabled))
    .map(([k]) => EFFECT_LABELS[k] ?? k);
};

export const VARIANT_LABELS: Record<string, string> = {
  fullscreen: "Plein écran",
  mockup: "Mockup smartphone",
  browser: "Mockup navigateur",
  multi: "Multi-écrans (navigateur + smartphone)",
  split: "Split média / texte",
};

/** Clé de montage d'un job (Promo ou Feed) — null si le job n'en porte pas. */
export const videoJobVariantKey = (job: VideoJobMetaRow): string | null => {
  const p = job.template_props ?? {};
  if (p.variant) return String(p.variant);
  return p.kind === "promo" ? "fullscreen" : null;
};

/** Promo business : montage + fond d'écran vidéo (uniquement derrière un mockup). */
const promoInfo = (job: VideoJobMetaRow) => {
  const p = job.template_props ?? {};
  if (p.kind !== "promo") return null;
  const variant = videoJobVariantKey(job)!;
  const framed = variant !== "fullscreen";
  return {
    variant,
    montage: VARIANT_LABELS[variant] ?? variant,
    bgFeed: framed ? (p.bgFeedUrl ? "oui" : "non") : "sans objet (plein écran)",
    bgFeedUrl: framed && p.bgFeedUrl ? String(p.bgFeedUrl) : null,
  };
};

/* ------------------------------------------------------------------ */
/*  Storyboard helpers                                                */
/* ------------------------------------------------------------------ */

const SCENARIO_LABELS: Record<string, string> = {
  corporate_long: "Corporate long",
  promo_business: "Promo business",
};

const STEP_TYPE_LABELS: Record<string, string> = {
  hook: "hook",
  video: "vidéo",
  photos: "photos",
  text_overlay: "texte",
  counter: "compteur",
  map_reveal: "carte",
  split_screen: "split",
  icon_grid: "icônes",
  svg_flow: "tracé SVG",
  logo_merge: "logos",
  outro: "outro",
};

const isStoryboardJob = (job: VideoJobMetaRow) => {
  const p = job.template_props ?? {};
  return p.kind === "storyboard" || job.template_id?.startsWith("storyboard") || false;
};

const isVideoUrl = (url?: string | null) =>
  typeof url === "string" && /\.(mp4|mov|webm|m4v|mkv)(\?.*)?$/i.test(url);

const storyboardInfo = (job: VideoJobMetaRow) => {
  const p = job.template_props ?? {};
  const sections = Array.isArray(p.sections) ? p.sections : [];
  const globalMedia = Array.isArray(p.global_media) ? p.global_media : [];
  const scenarioType = typeof p.scenario_type === "string" ? p.scenario_type : "";
  const encode = p.encode ?? {};
  const renderScale = typeof encode.scale === "number" ? encode.scale : null;

  const videoCount = globalMedia.filter((m: any) => isVideoUrl(typeof m === "string" ? m : m?.url)).length;
  const imageCount = globalMedia.filter((m: any) => {
    const url = typeof m === "string" ? m : m?.url;
    return typeof url === "string" && url.trim() && !isVideoUrl(url);
  }).length;

  const sectionCounts = sections.reduce((acc: Record<string, number>, s: any) => {
    const t = s?.step_type || "étape";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    scenarioType,
    scenarioLabel: SCENARIO_LABELS[scenarioType] || scenarioType || "Montage manuel",
    renderScale,
    globalMediaCount: globalMedia.length,
    videoCount,
    imageCount,
    sectionCounts,
    sectionCount: sections.length,
  };
};

const scaleLabel = (scale: number | null) => {
  if (scale == null) return "—";
  return `${Math.round(scale * 100)} %`;
};

const VideoJobMeta = ({ job, businessName }: { job: VideoJobMetaRow; businessName?: string }) => {
  const steps = collectSteps(job);
  const effects = collectEffects(job);
  const fileName = videoJobFileName(job.output_url, job.title || businessName);
  const promo = promoInfo(job);
  const variantKey = videoJobVariantKey(job);
  const variantLabel = variantKey ? (VARIANT_LABELS[variantKey] ?? variantKey) : null;
  const storyboard = isStoryboardJob(job) ? storyboardInfo(job) : null;

  const [fileSize, setFileSize] = useState<number | null>(null);
  useEffect(() => {
    if (!job.output_url) return;
    let cancelled = false;
    fetch(job.output_url, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (!cancelled && len) setFileSize(parseInt(len, 10));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [job.output_url]);

  return (
    <div className="rounded-lg border bg-muted/30 p-3 grid gap-2 md:grid-cols-3 text-[11px] text-muted-foreground w-full">
      <div className="md:col-span-3 flex flex-wrap items-center gap-2">
        <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/15">
          Format : {detectFormat(job)}
        </Badge>
        {variantLabel && (
          <Badge className="text-[10px] bg-gold/25 text-black border border-gold hover:bg-gold/25">
            Montage : {variantLabel}
          </Badge>
        )}
        {storyboard && (
          <>
            <Badge className="text-[10px] bg-terracotta/15 text-terracotta border border-terracotta/40 hover:bg-terracotta/15">
              Scénario : {storyboard.scenarioLabel}
            </Badge>
            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-100">
              Échelle : {scaleLabel(storyboard.renderScale)}
            </Badge>
          </>
        )}
      </div>

      <div className="md:col-span-3 break-all">
        <span className="font-semibold text-black">Fichier</span> {fileName}
        {fileSize != null && (
          <span className="ml-2 text-[10px] text-muted-foreground">({formatBytes(fileSize)})</span>
        )}
      </div>
      <div>
        <span className="font-semibold text-black">Créé le</span> {frDate(job.created_at)}
        {businessName && (
          <>
            <br />
            <span className="font-semibold text-black">Établissement</span> {businessName}
          </>
        )}
      </div>
      <div>
        <span className="font-semibold text-black">Format</span> {detectFormat(job)}
        <br />
        <span className="font-semibold text-black">Durée</span>{" "}
        {job.duration_sec != null ? `${mmss(job.duration_sec)} (${job.duration_sec}s)` : "—"}
      </div>
      <div>
        <span className="font-semibold text-black">Étapes</span> {steps.length > 0 ? steps.length : "—"}
        <br />
        <span className="font-semibold text-black">Effets / motion design</span>{" "}
        {effects.length > 0 ? effects.join(", ") : "aucun activé"}
      </div>
      {promo && (
        <div className="md:col-span-3 grid gap-1 md:grid-cols-2 border-t pt-2">
          <div>
            <span className="font-semibold text-black">Montage</span> {promo.montage}
          </div>
          <div>
            <span className="font-semibold text-black">Fond d'écran vidéo</span> {promo.bgFeed}
          </div>
          {promo.bgFeedUrl && (
            <div className="md:col-span-2 break-all">
              <span className="font-semibold text-black">URL du fond</span> {promo.bgFeedUrl}
            </div>
          )}
        </div>
      )}

      {storyboard && (
        <div className="md:col-span-3 grid gap-1 md:grid-cols-2 border-t pt-2">
          <div>
            <span className="font-semibold text-black">Type de scénario</span> {storyboard.scenarioLabel}
          </div>
          <div>
            <span className="font-semibold text-black">Échelle de rendu</span>{" "}
            {storyboard.renderScale != null ? `${scaleLabel(storyboard.renderScale)} (CRF ${job.template_props?.encode?.crf ?? "—"})` : "—"}
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold text-black">Médias globaux</span>{" "}
            {storyboard.globalMediaCount > 0
              ? `${storyboard.globalMediaCount} (${storyboard.videoCount} vidéo${storyboard.videoCount > 1 ? "s" : ""}, ${storyboard.imageCount} photo${storyboard.imageCount > 1 ? "s" : ""})`
              : "aucun"}
            {" · "}
            <span className="font-semibold text-black">Étapes</span> {storyboard.sectionCount}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="md:col-span-3 flex flex-wrap gap-1">
          {steps.map((t, i) => (
            <Badge key={`${t}-${i}`} variant="outline" className="text-[10px]">
              {STEP_TYPE_LABELS[t] ?? t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoJobMeta;
