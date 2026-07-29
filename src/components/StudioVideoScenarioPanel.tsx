import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, MessageSquare, Star, Download, QrCode, Calendar, Plus, X, ChevronLeft, ChevronRight, Film, Image as ImageIcon, GripVertical, Minus, Type, Trash2, Pencil } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SceneMediaKind = "hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro";

export type SceneMediaItem = {
  url: string;
  kind: "image" | "video";
  title?: string;
  thumbnail?: string | null;
  duration?: number;
};

export type SceneMediaMap = Partial<Record<SceneMediaKind, SceneMediaItem[]>>;

export const SCENE_KINDS_WITH_MEDIA: SceneMediaKind[] = ["hook", "name", "media", "offer", "reviews", "hours", "map", "digital", "cta", "outro"];


export type Scene = {
  id: string;
  label: string;
  duration: number;
  start: number;
  description: string;
  keywords: string[];
  icon: "hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro" | "custom";
};

export type Scenario = {
  scenes: Scene[];
  totalDuration: number;
};

export type CustomScene = {
  id: string;                 // stable, unique
  mode: "fullscreen" | "overlay";
  title: string;
  subtitle?: string;
  duration: number;           // seconds
  media?: SceneMediaItem;     // required in overlay mode, optional backdrop in fullscreen
  splitCount?: number;        // nb d'étapes pour découper le texte sur le montage vidéo
};

const ICONS: Record<Scene["icon"], React.ReactNode> = {
  hook: <Star className="h-3.5 w-3.5" />,
  name: <MessageSquare className="h-3.5 w-3.5" />,
  media: <MessageSquare className="h-3.5 w-3.5" />,
  offer: <MessageSquare className="h-3.5 w-3.5" />,
  reviews: <MessageSquare className="h-3.5 w-3.5" />,
  hours: <Calendar className="h-3.5 w-3.5" />,
  map: <MapPin className="h-3.5 w-3.5" />,
  digital: <QrCode className="h-3.5 w-3.5" />,
  cta: <Download className="h-3.5 w-3.5" />,
  outro: <Clock className="h-3.5 w-3.5" />,
  custom: <Type className="h-3.5 w-3.5" />,
};

const LABELS: Record<Exclude<Scene["icon"], "custom">, string> = {
  hook: "Hook",
  name: "Nom & identité",
  media: "Montage",
  offer: "Offre",
  reviews: "Avis clients",
  hours: "Horaires",
  map: "Localisation",
  digital: "ID numérique",
  cta: "Appel à l'action",
  outro: "Outro",
};

export function extractKeywords(text: string): string[] {
  const stop = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "à", "a", "au", "aux", "pour", "par", "sur", "dans", "avec", "sans", "que", "qui", "ce", "cette", "ces", "son", "sa", "ses", "notre", "votre", "leur", "not", "or", "and", "the", "in", "on", "at", "to", "for", "of", "with", "from", "by",
  ]);
  return (text.toLowerCase().match(/[a-zàâäéèêëïîôùûüç0-9]+/g) ?? [])
    .filter((w) => w.length > 3 && !stop.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i);
}

export function buildScenario(
  prompt: string,
  businessName: string | null,
  durationSec: number,
  options: {
    reviews: boolean;
    hours: boolean;
    mapMarker: boolean;
    digitalId: boolean;
    installCta: boolean;
  }
): Scenario {
  const keywords = extractKeywords(prompt);
  const scenes: Scene[] = [];
  let cursor = 0;

  const push = (icon: Scene["icon"], duration: number, description: string, labelOverride?: string) => {
    const start = cursor;
    cursor += duration;
    scenes.push({
      id: `${icon}-${scenes.length}`,
      icon,
      label: labelOverride || (LABELS as Record<string, string>)[icon] || "Étape",
      duration,
      start,
      description,
      keywords: [...keywords].slice(0, 3),
    });
  };

  const baseHook = Math.max(2, Math.round(durationSec * 0.15));
  push("hook", baseHook, businessName ? `Accroche sur ${businessName} et son ambiance.` : "Accroche immersive pour capter l'attention.");
  push("name", Math.max(2, Math.round(durationSec * 0.12)), businessName ? `Affichage du nom ${businessName}.` : "Affichage du nom de l'établissement.");
  if (keywords.includes("offre") || keywords.includes("promotion") || keywords.includes("menu") || keywords.includes("pass") || keywords.includes("déjeuner") || keywords.includes("diner") || keywords.includes("spa")) {
    push("offer", Math.max(4, Math.round(durationSec * 0.22)), "Mise en avant de l'offre ou du produit phare du prompt.");
  }
  if (options.reviews) push("reviews", Math.max(2, Math.round(durationSec * 0.12)), "Badge avis clients avec note/20 et nombre d'avis.");
  if (options.hours) push("hours", Math.max(2, Math.round(durationSec * 0.08)), "Horaires d'ouverture en surimpression.");
  if (options.mapMarker) push("map", Math.max(2, Math.round(durationSec * 0.1)), "Marqueur Google Map et localisation.");
  if (options.digitalId) push("digital", Math.max(2, Math.round(durationSec * 0.1)), "Séquence ID numérique : fiche, partage, QR code.");
  push("cta", Math.max(2, Math.round(durationSec * 0.12)), options.installCta ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");
  if (options.installCta) push("outro", Math.max(2, Math.round(durationSec * 0.08)), "Outro avec logo et appel à l'installation.");

  const scale = durationSec / Math.max(1, cursor);
  const scaled = scenes.map((s) => ({ ...s, duration: Math.max(1, Math.round(s.duration * scale)), start: Math.round(s.start * scale) }));
  const total = scaled.reduce((acc, s) => acc + s.duration, 0);
  return { scenes: scaled, totalDuration: total };
}

export function scenarioFromTemplateProps(
  templateId: string,
  props: any,
  durationSec: number,
  _rationale?: string
): Scenario {
  const scenes: Scene[] = [];
  let cursor = 0;
  const push = (icon: Scene["icon"], duration: number, description: string, labelOverride?: string, keywords: string[] = []) => {
    const start = cursor;
    cursor += duration;
    scenes.push({
      id: `${icon}-${scenes.length}`,
      icon,
      label: labelOverride || (LABELS as Record<string, string>)[icon] || "Étape",
      duration, start, description, keywords,
    });
  };
  const name = props?.name || "Établissement";
  const hook = typeof props?.hook === "string" ? props.hook.slice(0, 120) : "";
  const tagline = typeof props?.tagline === "string" ? props.tagline : "";
  const videos: string[] = Array.isArray(props?.videos) ? props.videos : [];
  const images: string[] = Array.isArray(props?.images) ? props.images : [];
  const offer = props?.offer && typeof props.offer === "object" ? props.offer : null;

  if (templateId !== "business-showcase" && templateId !== "corporate-vertical") {
    push("hook", Math.round(durationSec * 0.2), `Template dédié « ${templateId} » — séquences hardcodées.`, "Ouverture");
    push("media", Math.round(durationSec * 0.5), "Séquences visuelles emblématiques du template.", "Contenu");
    push("cta", Math.round(durationSec * 0.3), "Appel à l'action final.");
    return normalize(scenes, durationSec, cursor);
  }
  if (templateId === "corporate-vertical") {
    push("hook", Math.round(durationSec * 0.15), "Ouverture corporate One World Morocco.");
    push("media", Math.round(durationSec * 0.35), "Modèle économique et villes pionnières.", "Modèle");
    push("offer", Math.round(durationSec * 0.25), "Paliers d'engagement.", "Paliers");
    push("cta", Math.round(durationSec * 0.25), "Rejoindre le réseau.");
    return normalize(scenes, durationSec, cursor);
  }

  push("hook", Math.max(2, Math.round(durationSec * 0.12)), hook ? `Accroche : « ${hook} »` : `Accroche immersive sur ${name}.`);
  push("name", Math.max(2, Math.round(durationSec * 0.1)), tagline ? `${name} — ${tagline}` : `Affichage du nom ${name}.`);
  // Étape "media" (montage) : ajoutée manuellement par l'utilisateur via "Ajouter une étape".

  if (offer) {
    const parts: string[] = [];
    if (offer.title) parts.push(offer.title);
    if (offer.price) parts.push(offer.price);
    const desc = parts.length ? parts.join(" · ") : "Offre mise en avant.";
    const lines = Array.isArray(offer.lines) ? offer.lines : [];
    const bg = offer.background_video_url ? " (fond vidéo)" : offer.background_image_url ? " (fond image)" : "";
    push("offer", Math.max(4, Math.round(durationSec * 0.22)), `${desc}${bg}${lines.length ? ` — ${lines.length} ligne${lines.length > 1 ? "s" : ""}` : ""}.`);
  }
  if (props?.showReviews) {
    const rating = props.rating ? ` (${props.rating}/5)` : "";
    const count = props.reviewsCount ? ` · ${props.reviewsCount} avis` : "";
    push("reviews", Math.max(2, Math.round(durationSec * 0.08)), `Badge avis clients${rating}${count}.`);
  }
  if (props?.showOpeningHours) push("hours", Math.max(2, Math.round(durationSec * 0.07)), "Horaires d'ouverture en surimpression.");
  if (props?.showMap) push("map", Math.max(2, Math.round(durationSec * 0.09)), `Marqueur Google Map${props.address ? ` — ${String(props.address).slice(0, 60)}` : ""}.`);
  if (props?.showDigitalId) push("digital", Math.max(2, Math.round(durationSec * 0.1)), "ID numérique : capture fiche, partage, QR code.");
  push("cta", Math.max(2, Math.round(durationSec * 0.1)), props?.showAppInstall ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");
  if (props?.showAppInstall) push("outro", Math.max(2, Math.round(durationSec * 0.06)), "Outro logo + installation de l'app.");
  return normalize(scenes, durationSec, cursor);
}

function normalize(scenes: Scene[], durationSec: number, cursor: number): Scenario {
  const scale = durationSec / Math.max(1, cursor);
  const scaled = scenes.map((s) => ({ ...s, duration: Math.max(1, Math.round(s.duration * scale)), start: Math.round(s.start * scale) }));
  const total = scaled.reduce((acc, s) => acc + s.duration, 0);
  return { scenes: scaled, totalDuration: total };
}

function sceneKindFor(icon: Scene["icon"]): SceneMediaKind | null {
  if (icon === "custom") return null;
  return icon as SceneMediaKind;
}

const isCustomToken = (t: string) => t.startsWith("custom:");
const customIdFromToken = (t: string) => t.slice("custom:".length);
const tokenForCustom = (id: string) => `custom:${id}`;

const newCustomId = () =>
  `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type ScenarioEdits = {
  order: string[]; // ordered tokens: SceneMediaKind or `custom:<id>`
  durations: Partial<Record<SceneMediaKind, number>>; // seconds per built-in kind
  customScenes?: CustomScene[];
  // Nb d'étapes pour découper le texte dans le montage (clé = "hook" | "name" | `custom:<id>`)
  textSplits?: Record<string, number>;
};

export function StudioVideoScenarioPanel({
  scenario,
  className,
  availableMedia,
  sceneMedia,
  onChangeSceneMedia,
  onChangeScenarioEdits,
}: {
  scenario: Scenario;
  className?: string;
  availableMedia?: SceneMediaItem[];
  sceneMedia?: SceneMediaMap;
  onChangeSceneMedia?: (next: SceneMediaMap) => void;
  onChangeScenarioEdits?: (edits: ScenarioEdits | null) => void;
}) {
  // Local edits: per-scene duration overrides + order override (by token) + custom scenes + text splits
  const [durationOverrides, setDurationOverrides] = useState<Record<string, number>>({});
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const [customScenes, setCustomScenes] = useState<CustomScene[]>([]);
  const [splitOverrides, setSplitOverrides] = useState<Record<string, number>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  // Signature to reset local edits when the incoming scenario really changes
  const signature = scenario.scenes.map((s) => s.id).join("|") + "@" + scenario.totalDuration;
  useEffect(() => {
    setDurationOverrides({});
    setOrderOverride(null);
    setCustomScenes([]);
    setSplitOverrides({});
    onChangeScenarioEdits?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const customById = useMemo(() => {
    const m = new Map<string, CustomScene>();
    for (const c of customScenes) m.set(c.id, c);
    return m;
  }, [customScenes]);

  const editedScenes = useMemo(() => {
    const byId = new Map(scenario.scenes.map((s) => [s.id, s]));
    const baseTokens = scenario.scenes.map((s) => s.id);
    const tokens = orderOverride ?? baseTokens;
    let cursor = 0;
    const out: Scene[] = [];
    for (const tok of tokens) {
      if (isCustomToken(tok)) {
        const c = customById.get(customIdFromToken(tok));
        if (!c) continue;
        const start = cursor;
        cursor += c.duration;
        out.push({
          id: tok,
          icon: "custom",
          label: c.title || (c.mode === "overlay" ? "Texte sur média" : "Carton texte"),
          duration: c.duration,
          start,
          description: [c.subtitle, c.mode === "overlay" ? "Superposé au média" : "Plein écran"].filter(Boolean).join(" · "),
          keywords: [],
        });
      } else {
        const s = byId.get(tok);
        if (!s) continue;
        const duration = durationOverrides[s.id] ?? s.duration;
        const start = cursor;
        cursor += duration;
        out.push({ ...s, duration, start });
      }
    }
    return out;
  }, [scenario.scenes, orderOverride, durationOverrides, customById]);

  // Emit edits upstream whenever they change (dedup: only when non-default)
  useEffect(() => {
    if (!onChangeScenarioEdits) return;
    const hasOrder = !!orderOverride;
    const hasDurations = Object.keys(durationOverrides).length > 0;
    const hasCustom = customScenes.length > 0;
    const hasSplits = Object.keys(splitOverrides).length > 0;
    if (!hasOrder && !hasDurations && !hasCustom && !hasSplits) {
      onChangeScenarioEdits(null);
      return;
    }
    const byId = new Map(scenario.scenes.map((s) => [s.id, s]));
    const tokens = orderOverride ?? scenario.scenes.map((s) => s.id);
    const orderTokens: string[] = [];
    for (const tok of tokens) {
      if (isCustomToken(tok)) {
        if (customById.has(customIdFromToken(tok))) orderTokens.push(tok);
      } else {
        const s = byId.get(tok);
        if (s) orderTokens.push(s.icon as SceneMediaKind);
      }
    }
    const durations: Partial<Record<SceneMediaKind, number>> = {};
    for (const [id, d] of Object.entries(durationOverrides)) {
      const s = byId.get(id);
      if (s) durations[s.icon as SceneMediaKind] = d;
    }
    // Normalize splitOverrides keys: built-in scene.id → its icon (kind), custom token stays as-is
    const textSplits: Record<string, number> = {};
    for (const [id, n] of Object.entries(splitOverrides)) {
      if (isCustomToken(id)) textSplits[id] = n;
      else {
        const s = byId.get(id);
        if (s) textSplits[s.icon] = n;
      }
    }
    onChangeScenarioEdits({
      order: orderTokens,
      durations,
      customScenes: hasCustom ? customScenes : undefined,
      textSplits: hasSplits ? textSplits : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderOverride, durationOverrides, customScenes, customById, splitOverrides]);

  const total = editedScenes.reduce((acc, s) => acc + s.duration, 0);
  if (!editedScenes.length && customScenes.length === 0) return null;

  const editable = !!onChangeSceneMedia && !!availableMedia;
  const setForKind = (kind: SceneMediaKind, items: SceneMediaItem[]) => {
    if (!onChangeSceneMedia) return;
    const next: SceneMediaMap = { ...(sceneMedia ?? {}) };
    if (items.length === 0) delete next[kind];
    else next[kind] = items;
    onChangeSceneMedia(next);
  };

  const bumpDuration = (id: string, delta: number) => {
    if (isCustomToken(id)) {
      const cid = customIdFromToken(id);
      setCustomScenes((prev) =>
        prev.map((c) =>
          c.id === cid ? { ...c, duration: Math.max(1, Math.min(60, c.duration + delta)) } : c
        )
      );
      return;
    }
    setDurationOverrides((prev) => {
      const current = prev[id] ?? editedScenes.find((s) => s.id === id)?.duration ?? 1;
      const next = Math.max(1, Math.min(60, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = editedScenes.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = ids.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrderOverride(next);
    setDragId(null);
    setOverId(null);
  };

  const upsertCustomScene = (draft: CustomScene) => {
    setCustomScenes((prev) => {
      const exists = prev.some((c) => c.id === draft.id);
      if (exists) return prev.map((c) => (c.id === draft.id ? draft : c));
      return [...prev, draft];
    });
    // Append to order if not already present
    setOrderOverride((prev) => {
      const base = prev ?? editedScenes.map((s) => s.id);
      const tok = tokenForCustom(draft.id);
      if (base.includes(tok)) return base;
      return [...base, tok];
    });
  };

  const removeCustomScene = (cid: string) => {
    const tok = tokenForCustom(cid);
    setCustomScenes((prev) => prev.filter((c) => c.id !== cid));
    setOrderOverride((prev) => (prev ? prev.filter((t) => t !== tok) : prev));
  };


  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 space-y-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">Aperçu du scénario</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold tabular-nums">{formatDuration(total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] px-2"
            onClick={() => { setEditingCustomId(null); setAddOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une étape
          </Button>
          {(orderOverride || Object.keys(durationOverrides).length > 0 || customScenes.length > 0) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2"
              onClick={() => { setOrderOverride(null); setDurationOverrides({}); setCustomScenes([]); }}
            >
              Réinitialiser
            </Button>
          )}
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tight italic">AI Optimized</span>
        </div>
      </div>

      <CustomSceneDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        available={availableMedia ?? []}
        initial={
          editingCustomId ? customById.get(editingCustomId) ?? null : null
        }
        onSubmit={(draft) => { upsertCustomScene(draft); setAddOpen(false); setEditingCustomId(null); }}
      />

      <p className="text-[11px] text-muted-foreground italic">Glissez-déposez les scènes pour les réordonner. Ajustez la durée avec les boutons +/−.</p>

      <div className="space-y-3">
        {editedScenes.map((scene) => {
          const kind = sceneKindFor(scene.icon);
          const items = kind ? (sceneMedia?.[kind] ?? []) : [];
          const isDragging = dragId === scene.id;
          const isOver = overId === scene.id && dragId !== scene.id;
          return (
            <div
              key={scene.id}
              draggable
              onDragStart={(e) => { setDragId(scene.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverId(scene.id); }}
              onDragLeave={() => setOverId((prev) => (prev === scene.id ? null : prev))}
              onDrop={(e) => { e.preventDefault(); handleDrop(scene.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              className={cn(
                "relative bg-white text-black rounded-xl border border-border p-4 overflow-hidden transition-colors",
                isDragging && "opacity-50",
                isOver ? "border-primary" : "hover:border-primary/40"
              )}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80" />
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary min-w-0">
                  <span className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-black" aria-label="Déplacer la scène">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  {ICONS[scene.icon]}
                  <span className="truncate">{scene.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => bumpDuration(scene.id, -1)}
                      disabled={scene.duration <= 1}
                      className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-30"
                      aria-label="Diminuer la durée"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-[11px] font-bold tabular-nums w-8 text-center">{scene.duration}s</span>
                    <button
                      type="button"
                      onClick={() => bumpDuration(scene.id, 1)}
                      disabled={scene.duration >= 60}
                      className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-30"
                      aria-label="Augmenter la durée"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-600 tabular-nums">
                    {formatTime(scene.start)} → {formatTime(scene.start + scene.duration)}
                  </span>
                  {scene.icon === "custom" && isCustomToken(scene.id) && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingCustomId(customIdFromToken(scene.id)); setAddOpen(true); }}
                        className="p-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-black"
                        aria-label="Modifier l'étape"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomScene(customIdFromToken(scene.id))}
                        className="p-1 rounded hover:bg-destructive/10 text-neutral-600 hover:text-destructive"
                        aria-label="Supprimer l'étape"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed italic">{scene.description}</p>
              {scene.keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {scene.keywords.map((k) => (
                    <span key={k} className="text-[10px] bg-primary/10 text-black px-2 py-0.5 rounded border border-primary/20">#{k}</span>
                  ))}
                </div>
              )}

              {editable && kind && (
                <SceneMediaSlot
                  kind={kind}
                  items={items}
                  available={availableMedia!}
                  onChange={(next) => setForKind(kind, next)}
                />
              )}
              {editable && scene.icon === "custom" && isCustomToken(scene.id) && (
                <CustomSceneMediaSlot
                  available={availableMedia!}
                  current={customById.get(customIdFromToken(scene.id))?.media ?? null}
                  onChange={(media) => {
                    const cid = customIdFromToken(scene.id);
                    setCustomScenes((prev) => prev.map((c) => (c.id === cid ? { ...c, media: media ?? undefined } : c)));
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white text-black rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Timeline de production</div>
          <div className="text-[10px] text-neutral-600">{editedScenes.length} scènes · {total}s</div>
        </div>
        <div className="flex gap-1 h-10">
          {editedScenes.map((scene) => {
            const width = total > 0 ? Math.max(4, (scene.duration / total) * 100) : 0;
            return (
              <div key={scene.id} className="relative flex flex-col justify-center px-2 rounded-md border border-border bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer overflow-hidden" style={{ width: `${width}%`, minWidth: "48px" }} title={`${scene.label} · ${scene.duration}s`}>
                <span className="text-[9px] font-bold truncate text-black">{scene.label}</span>
                <div className="h-1 mt-1 rounded-full bg-primary/60" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomSceneMediaSlot({
  available,
  current,
  onChange,
}: {
  available: SceneMediaItem[];
  current: SceneMediaItem | null;
  onChange: (media: SceneMediaItem | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
          Média de fond {current ? "· 1" : "· 0"}
        </div>
        <div className="flex items-center gap-1">
          {current && (
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onChange(null)}>
              Retirer
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={available.length === 0}>
                <Plus className="h-3 w-3" /> {current ? "Changer" : "Ajouter"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white text-black">
              <DialogHeader>
                <DialogTitle className="text-black">Sélection média de fond</DialogTitle>
              </DialogHeader>
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun média disponible pour cet établissement.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {available.map((m) => {
                    const selected = current?.url === m.url;
                    return (
                      <button
                        key={m.url}
                        type="button"
                        onClick={() => { onChange(m); setOpen(false); }}
                        className={cn(
                          "relative aspect-video rounded-md overflow-hidden border-2 group",
                          selected ? "border-primary" : "border-transparent hover:border-primary/40"
                        )}
                      >
                        {m.kind === "video" ? (
                          <video src={m.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">
                          {m.title || m.kind}
                        </div>
                        {m.duration != null && m.kind === "video" && (
                          <div className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase">
                            {formatDuration(m.duration)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {current && (
        <div className="relative aspect-video w-32 rounded-md overflow-hidden border border-border">
          {current.kind === "video" ? (
            <video src={current.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={current.url} alt="" className="w-full h-full object-cover" />
          )}
          {current.duration != null && current.kind === "video" && (
            <div className="absolute bottom-0.5 right-0.5 text-[8px] px-1 rounded bg-black/70 text-white font-bold">{formatDuration(current.duration)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SceneMediaSlot({
  kind,
  items,
  available,
  onChange,
}: {
  kind: SceneMediaKind;
  items: SceneMediaItem[];
  available: SceneMediaItem[];
  onChange: (next: SceneMediaItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const toggle = (item: SceneMediaItem) => {
    const exists = items.findIndex((i) => i.url === item.url);
    if (exists >= 0) onChange(items.filter((_, i) => i !== exists));
    else onChange([...items, item]);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
          Médias assignés · {items.length}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={available.length === 0}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sélection médias — {kind}</DialogTitle>
            </DialogHeader>
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun média disponible pour cet établissement.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {available.map((m) => {
                  const selected = items.some((i) => i.url === m.url);
                  return (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => toggle(m)}
                      className={cn(
                        "relative aspect-video rounded-md overflow-hidden border-2 group",
                        selected ? "border-primary" : "border-transparent hover:border-primary/40"
                      )}
                    >
                      {m.kind === "video" ? (
                        m.thumbnail ? (
                          <img src={m.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video
                            src={m.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        )
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase flex items-center gap-1">
                        {m.kind === "video" ? <Film className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
                        {m.kind}
                      </div>
                      {m.duration != null && m.kind === "video" && (
                        <div className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-bold uppercase">
                          {formatDuration(m.duration)}
                        </div>
                      )}
                      {selected && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <div className="rounded-full bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center">
                            {items.findIndex((i) => i.url === m.url) + 1}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-neutral-600 italic">Aucun média assigné — le rendu utilisera la sélection globale ou l'auto-choix IA.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((m, idx) => (
            <div key={`${m.url}-${idx}`} className="relative group w-24 h-16 rounded overflow-hidden border border-border">
              {m.kind === "video" ? (
                m.thumbnail
                  ? <img src={m.thumbnail} alt="" className="w-full h-full object-cover" />
                  : <video src={m.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute top-0.5 left-0.5 text-[8px] px-1 rounded bg-black/70 text-white font-bold">{idx + 1}</div>
              {m.duration != null && m.kind === "video" && (
                <div className="absolute bottom-0.5 right-0.5 text-[8px] px-1 rounded bg-black/70 text-white font-bold">{formatDuration(m.duration)}</div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 flex items-center justify-center gap-1">
                <button type="button" onClick={() => move(idx, -1)} className="p-1 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30" disabled={idx === 0} aria-label="Reculer"><ChevronLeft className="h-3 w-3 text-white" /></button>
                <button type="button" onClick={() => remove(idx)} className="p-1 rounded bg-red-500/70 hover:bg-red-500" aria-label="Retirer"><X className="h-3 w-3 text-white" /></button>
                <button type="button" onClick={() => move(idx, 1)} className="p-1 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30" disabled={idx === items.length - 1} aria-label="Avancer"><ChevronRight className="h-3 w-3 text-white" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(seconds: number): string {
  const s = Math.round(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}s`;
}

function CustomSceneDialog({
  open,
  onOpenChange,
  available,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: SceneMediaItem[];
  initial: CustomScene | null;
  onSubmit: (draft: CustomScene) => void;
}) {
  const [mode, setMode] = useState<"fullscreen" | "overlay">(initial?.mode ?? "fullscreen");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? 4);
  const [mediaUrl, setMediaUrl] = useState<string | null>(initial?.media?.url ?? null);

  useEffect(() => {
    if (!open) return;
    setMode(initial?.mode ?? "fullscreen");
    setTitle(initial?.title ?? "");
    setSubtitle(initial?.subtitle ?? "");
    setDuration(initial?.duration ?? 4);
    setMediaUrl(initial?.media?.url ?? null);
  }, [open, initial]);

  const canSubmit = title.trim().length > 0 && duration >= 1 && duration <= 60 &&
    (mode !== "overlay" || (!!mediaUrl && !!available.find((m) => m.url === mediaUrl)));

  const submit = () => {
    if (!canSubmit) return;
    const media = mediaUrl ? available.find((m) => m.url === mediaUrl) ?? undefined : undefined;
    onSubmit({
      id: initial?.id ?? newCustomId(),
      mode,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      duration,
      media,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">{initial ? "Modifier l'étape" : "Ajouter une étape texte"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider">Type d'étape</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setMode("fullscreen")}
                className={cn(
                  "rounded-md border p-3 text-left text-xs transition-colors",
                  mode === "fullscreen" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className="font-bold mb-0.5">Carton texte</div>
                <div className="text-muted-foreground">Fond sombre, texte centré plein écran.</div>
              </button>
              <button
                type="button"
                onClick={() => { setMode("overlay"); if (!mediaUrl && available[0]) setMediaUrl(available[0].url); }}
                className={cn(
                  "rounded-md border p-3 text-left text-xs transition-colors",
                  mode === "overlay" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className="font-bold mb-0.5">Overlay sur média</div>
                <div className="text-muted-foreground">Texte superposé à une image ou vidéo.</div>
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="cs-title" className="text-xs uppercase tracking-wider">Titre</Label>
            <Input
              id="cs-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="Texte principal (max 120)"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="cs-sub" className="text-xs uppercase tracking-wider">Sous-titre (optionnel)</Label>
            <Textarea
              id="cs-sub"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value.slice(0, 240))}
              placeholder="Détail secondaire (max 240)"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="cs-dur" className="text-xs uppercase tracking-wider">Durée (secondes)</Label>
            <Input
              id="cs-dur"
              type="number"
              min={1}
              max={60}
              value={duration}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) setDuration(Math.max(1, Math.min(60, v)));
              }}
            />
          </div>

          {mode === "overlay" && (
            <div>
              <Label className="text-xs uppercase tracking-wider">Média de fond</Label>
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">Aucun média disponible pour l'établissement sélectionné.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 mt-2 max-h-52 overflow-y-auto">
                  {available.map((m) => {
                    const selected = mediaUrl === m.url;
                    return (
                      <button
                        key={m.url}
                        type="button"
                        onClick={() => setMediaUrl(m.url)}
                        className={cn(
                          "relative aspect-square rounded overflow-hidden border-2 transition-colors",
                          selected ? "border-primary" : "border-transparent hover:border-primary/40"
                        )}
                      >
                        {m.kind === "video" ? (
                          <video
                            src={m.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {initial ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

