import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StoryboardStepNotesList from "@/components/staff/StoryboardStepNotesList";
import {
  ChevronDown,
  ChevronRight,
  Clapperboard,
  GripVertical,
  Plus,
  RotateCcw,
  Rocket,
  Save,
  Trash2,
  Info,
  Clock,
  Film,
  Image,
  Type,
  MapPin,
  Split,
  Merge,
  MousePointerClick,
  LayoutTemplate,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import VideoIconPickerDialog from "@/components/staff/VideoIconPickerDialog";
import SvgFlowBeatsEditor, { type FlowBeat } from "@/components/staff/SvgFlowBeatsEditor";
import { VideoMediaPickerDialog } from "@/components/staff/VideoMediaPickerDialog";
import StoryboardGlobalMediaGrid, {
  isVideoMediaUrl,
  type GlobalMediaItem,
} from "@/components/staff/StoryboardGlobalMediaGrid";
import VideoScenarioConfigPanel from "@/components/staff/VideoScenarioConfigPanel";
import VideoJobMeta from "@/components/staff/VideoJobMeta";
import StepVoiceOverBlock, { type StepVoice } from "@/components/staff/StepVoiceOverBlock";
import { Copy } from "lucide-react";
import VideoEncodeOptionsBlock from "@/components/staff/VideoEncodeOptionsBlock";
import { DEFAULT_ENCODE, ENCODE_PRESETS, normalizeEncode, type EncodeOptions } from "@/lib/videoEncode";

import {
  MontageEffectsBlock,
  SimpleEffectsBlock,
  StepEffectsBlock,
  hasAnyMontageEffect,
  hasAnySimpleEffect,
  type MontageEffects,
} from "@/components/staff/video-effects";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Storyboard = source de vérité unique d'un montage manuel (jusqu'à 240 s).
 * Le renderer Remotion ne contient aucune logique propre à un scénario donné :
 * chaque section porte un `step_type` générique et sa `config` JSONB.
 */

export const MAX_TOTAL_SEC = 240;
export const MAX_SECTIONS = 15;
export const MIN_SECTION_SEC = 3;
export const MAX_SECTION_SEC = 240;

export type StepType =
  | "hook"
  | "video"
  | "photos"
  | "text_overlay"
  | "counter"
  | "map_reveal"
  | "split_screen"
  | "icon_grid"
  | "svg_flow"
  | "logo_merge"
  | "outro";

const STEP_TYPES: Array<{ value: StepType; label: string; hint: string }> = [
  { value: "hook", label: "Accroche", hint: "Logo + accroche + ville." },
  { value: "video", label: "Vidéo plein écran", hint: "Asset vidéo de la fiche." },
  { value: "photos", label: "Photos plein écran", hint: "1 à 30 images de la fiche." },
  { value: "text_overlay", label: "Texte en surimpression", hint: "Rich text continu sur le média." },
  { value: "counter", label: "Compteur / chiffre clé", hint: "Animation d'un nombre (+1 800…)." },
  { value: "map_reveal", label: "Carte / localisation", hint: "Révélation géographique." },
  { value: "split_screen", label: "Écran partagé", hint: "Média d'un côté, texte de l'autre." },
  { value: "icon_grid", label: "Icônes (grille / battements)", hint: "1 à 8 icônes curatées, Titre et/ou Texte, durée découpée au choix." },
  { value: "svg_flow", label: "Tracé SVG animé (liaisons)", hint: "2 à 8 nœuds à icônes reliés par un tracé animé, 5 à 240 s." },
  { value: "logo_merge", label: "Fusion de logos", hint: "Lockup 1WM + logo partenaire." },
  { value: "outro", label: "Outro", hint: "Logo + tagline." },
];

const typeLabel = (t: string) => STEP_TYPES.find((s) => s.value === t)?.label ?? t;

type Storyboard = {
  id: string;
  name: string;
  scenario_type: "promo_business" | "corporate_long";
  format: "portrait" | "landscape";
  business_id: string | null;
  preview_scale: number;
  max_duration_sec: number;
  /** Grade global de motion design du montage (null = aucun effet). */
  effects?: MontageEffects | null;
  /** Médias globaux du montage : ordre + bornes de lecture (Start/End). */
  global_media?: GlobalMediaItem[] | null;
  /** Compression de sortie (CRF / audio) du montage. */
  encode?: EncodeOptions | null;

  created_at?: string | null;
  updated_at?: string | null;
};

/** Modes des scénarios automatiques (Studio Vidéo IA) — édités dans la même interface. */
const LEGACY_MODES: Array<{ value: "business" | "corporate"; label: string }> = [
  { value: "business", label: "Scénario auto — Établissement" },
  { value: "corporate", label: "Scénario auto — Corporate" },
];

const frDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

type StoryboardJob = {
  id: string;
  title: string | null;
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  duration_sec: number | null;
  template_id: string | null;
  business_id?: string | null;
  template_props?: any;
  scenario_json?: any;
};



type Section = {
  id: string;
  storyboard_id: string;
  mode: string;
  scene_key: string;
  step_type: StepType;
  label: string | null;
  position: number;
  duration_sec: number;
  enabled: boolean;
  config: Record<string, any>;
  _new?: boolean;
};

type Biz = { id: string; name: string; slug: string | null; city: string | null };

const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Champs propres à chaque type de section — stockés dans `config` (JSONB). */
const ConfigFields = ({
  section,
  patch,
  businessId,
  format,
  dropGlobal,
}: {
  section: Section;
  patch: (values: Partial<Section>) => void;
  businessId: string | null;
  format: "portrait" | "landscape";
  /** Retire aussi les médias supprimés ici de la sélection globale du montage. */
  dropGlobal?: (urls: string[]) => void;
}) => {
  const cfg = section.config ?? {};
  const set = (key: string, value: any) => patch({ config: { ...cfg, [key]: value } });
  /** Médias retirés à l'étape → retirés de la source globale (sinon ils reviennent). */
  const syncRemoved = (before: string[], after: string[]) => {
    const gone = before.filter((u) => !after.includes(u));
    if (gone.length > 0) dropGlobal?.(gone);
  };


  const text = (key: string, label: string, placeholder?: string) => (
    <label className="text-xs text-muted-foreground grid gap-1">
      {label}
      <Input
        value={cfg[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </label>
  );

  /** Sélecteur de média unique adossé à la bibliothèque (fiche / générique / staff). */
  const mediaOne = (
    key: string,
    label: string,
    allow: "image" | "video" | "all",
    hint?: string,
  ) => (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <VideoMediaPickerDialog
        businessId={businessId}
        format={format}
        allow={allow}
        label={cfg[key] ? "Changer le média" : "Choisir un média"}
        value={cfg[key] ? [String(cfg[key])] : []}
        onChange={(urls) => set(key, urls[0] ?? "")}
      />
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );


  /**
   * Fond média partagé : playlist mixte (images ET vidéos, 30 max) jouée à la
   * suite dans la durée de la scène. Disponible sur accroche, texte, compteur,
   * outro, carte et écran partagé.
   */
  const bgMediaBlock = () => {
    const legacy: string[] = Array.isArray(cfg.bgImages)
      ? (cfg.bgImages as string[])
      : cfg.bgVideoUrl
        ? [String(cfg.bgVideoUrl)]
        : [];
    const media: string[] = Array.isArray(cfg.bgMedia) ? (cfg.bgMedia as string[]) : legacy;
    const active = ((cfg.bgMode as string) ?? "none") !== "none" && media.length > 0;
    return (
      <div className="grid gap-2 rounded-md border p-2 md:col-span-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Fond média de la scène (images et/ou vidéos, 30 max)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <VideoMediaPickerDialog
            businessId={businessId}
            format={format}
            allow="all"
            multiple
            max={30}
            label={media.length ? `Modifier le fond (${media.length})` : "Choisir des médias"}
            value={media}
            onChange={(urls) => {
              syncRemoved(media, urls);
              patch({
                config: {
                  ...cfg,
                  bgMode: urls.length ? "medias" : "none",
                  bgMedia: urls.slice(0, 30),
                  bgImages: [],
                  bgVideoUrl: "",
                },
              });
            }}

          />
          {active && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() =>
                patch({ config: { ...cfg, bgMode: "none", bgMedia: [], bgImages: [], bgVideoUrl: "" } })
              }
            >
              Retirer le fond
            </Button>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          Lecture à la suite en fondu enchaîné, durée partagée à parts égales. Vidéos muettes, sous voile lisible.
        </span>
      </div>
    );
  };


  switch (section.step_type) {
    case "hook":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("title", "Accroche", "Le Maroc existe déjà.")}
          {text("subtitle", "Sous-titre / ville", "Marrakech")}
          {bgMediaBlock()}
        </div>
      );
    case "video": {
      const clips: string[] = Array.isArray(cfg.assetUrls)
        ? (cfg.assetUrls as string[])
        : cfg.assetUrl
          ? [String(cfg.assetUrl)]
          : [];
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">
              Vidéos de la section (1 à 30, montées à la suite, ordre conservé)
            </span>
            <VideoMediaPickerDialog
              businessId={businessId}
              format={format}
              allow="video"
              multiple
              max={30}
              label={clips.length ? `Modifier les vidéos (${clips.length})` : "Choisir les vidéos"}
              value={clips}
              onChange={(urls) => {
                syncRemoved(clips, urls);
                patch({ config: { ...cfg, assetUrls: urls.slice(0, 30), assetUrl: "" } });
              }}

            />
            <span className="text-[11px] text-muted-foreground">
              Vide = première vidéo interne de la fiche. La durée de la section est partagée à parts égales.
            </span>
          </div>
          {text("title", "Titre affiché (optionnel)")}
          <label className="text-xs text-muted-foreground grid gap-1">
            Son de la vidéo
            <span className="flex items-center gap-2 h-8">
              <Switch checked={!!cfg.sound} onCheckedChange={(v) => set("sound", v)} />
              <span className="text-[11px]">{cfg.sound ? "activé" : "muet"}</span>
            </span>
          </label>
        </div>
      );
    }
    case "photos": {
      const media: string[] = Array.isArray(cfg.media)
        ? (cfg.media as string[])
        : Array.isArray(cfg.images)
          ? (cfg.images as string[])
          : [];
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground grid gap-1">
            Nombre de médias (1 à 30)
            <Input
              type="number"
              min={1}
              max={30}
              value={cfg.count ?? 30}
              onChange={(e) => set("count", Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="h-8 text-xs"
            />
          </label>
          <label className="text-xs text-muted-foreground grid gap-1">
            Mouvement des images
            <select
              value={(cfg.kenBurns as string) || "zoom_in"}
              onChange={(e) => set("kenBurns", e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="zoom_in">Zoom avant (zoom_in)</option>
              <option value="zoom_out">Zoom arrière (zoom_out)</option>
              <option value="none">Aucun mouvement (none)</option>
            </select>
          </label>
          {text("title", "Titre affiché (optionnel)")}
          <div className="grid gap-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">
              Médias du carrousel — images ET vidéos (1 à 30, ordre de sélection conservé)
            </span>
            <VideoMediaPickerDialog
              businessId={businessId}
              format={format}
              allow="all"
              multiple
              max={30}
              label={media.length ? `Modifier les médias (${media.length})` : "Choisir les médias"}
              value={media}
              onChange={(urls) => {
                syncRemoved(media, urls);
                patch({ config: { ...cfg, media: urls.slice(0, 30), images: [] } });
              }}

            />
            <span className="text-[11px] text-muted-foreground">
              Vide = photos publiques de la fiche. Les vidéos jouent muettes, les images en Ken Burns.
            </span>
          </div>
        </div>
      );
    }


    case "text_overlay":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground grid gap-1 md:col-span-2">
            Texte (500 caractères max, balises H acceptées)
            <Textarea
              value={cfg.html ?? ""}
              onChange={(e) => set("html", e.target.value.slice(0, 500))}
              rows={4}
              className="text-xs"
            />
            <span className="text-[11px]">{String(cfg.html ?? "").length}/500</span>
          </label>
          {bgMediaBlock()}
        </div>
      );
    case "counter": {
      // Le moteur Remotion lit `items` (jusqu'à 4 chiffres). Un seul champ = un seul item.
      const items: any[] = Array.isArray(cfg.items) && cfg.items.length ? cfg.items : [{ value: 0, label: "" }];
      const setItem = (i: number, key: string, value: any) =>
        set(
          "items",
          items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
        );
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            {text("kicker", "Sur-titre", "Le réseau 1WM")}
            {text("title", "Titre", "Marrakech & Essaouira")}
            <label className="text-xs text-muted-foreground grid gap-1">
              Décimales (0 à 2)
              <Input
                type="number"
                min={0}
                max={2}
                value={cfg.decimals ?? 0}
                onChange={(e) => set("decimals", Math.max(0, Math.min(2, Number(e.target.value) || 0)))}
                className="h-8 text-xs"
              />
            </label>
          </div>
          <div className="grid gap-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[7rem_5rem_5rem_1fr_2rem] items-end">
                <label className="text-xs text-muted-foreground grid gap-1">
                  Valeur {i + 1}
                  <Input
                    type="number"
                    value={it.value ?? 0}
                    onChange={(e) => setItem(i, "value", Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Préfixe
                  <Input
                    value={it.prefix ?? ""}
                    onChange={(e) => setItem(i, "prefix", e.target.value)}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Suffixe
                  <Input
                    value={it.suffix ?? ""}
                    onChange={(e) => setItem(i, "suffix", e.target.value)}
                    placeholder="+"
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Légende
                  <Input
                    value={it.label ?? ""}
                    onChange={(e) => setItem(i, "label", e.target.value)}
                    placeholder="établissements"
                    className="h-8 text-xs"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={items.length <= 1}
                  onClick={() => set("items", items.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            {items.length < 4 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-fit text-xs"
                onClick={() => set("items", [...items, { value: 0, label: "" }])}
              >
                + Ajouter un chiffre
              </Button>
            )}
          </div>
          {text("body", "Phrase de bas de scène", "Une couverture réelle, vérifiée sur le terrain.")}
          <div className="grid md:grid-cols-2">{bgMediaBlock()}</div>
        </div>
      );
    }
    case "icon_grid": {
      const items: any[] = Array.isArray(cfg.items) ? cfg.items : [];
      const setItems = (next: any[]) => set("items", next.slice(0, 8));
      const setItem = (i: number, key: string, value: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
      const display = (cfg.display as string) === "beats" ? "beats" : "grid";
      const beatSec = items.length ? section.duration_sec / items.length : section.duration_sec;
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            {text("kicker", "Sur-titre (optionnel)", "Ce que vous trouvez sur place")}
            {text("title", "Titre de la scène (optionnel)", "Tout est à 5 minutes")}
            <label className="text-xs text-muted-foreground grid gap-1">
              Affichage
              <select
                value={display}
                onChange={(e) => set("display", e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="grid">Grille simultanée (cascade)</option>
                <option value="beats">Battements (une icône après l'autre)</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 md:grid-cols-[10rem_1fr_1fr_2rem] md:items-end">
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Icône {i + 1}</span>
                  <VideoIconPickerDialog
                    value={typeof it.icon === "string" ? it.icon : null}
                    onChange={(key) => setItem(i, "icon", key)}
                  />
                </div>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Titre (optionnel)
                  <Input
                    value={it.title ?? ""}
                    onChange={(e) => setItem(i, "title", e.target.value.slice(0, 60))}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Texte (optionnel)
                  <Input
                    value={it.text ?? ""}
                    onChange={(e) => setItem(i, "text", e.target.value.slice(0, 120))}
                    className="h-8 text-xs"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            {items.length < 8 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-fit text-xs"
                onClick={() => setItems([...items, { icon: "", title: "", text: "" }])}
              >
                + Ajouter une icône
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground">
              {items.length
                ? display === "beats"
                  ? `Durée découpée à parts égales : ${items.length} battement(s) de ${beatSec.toFixed(1)} s.`
                  : "Toutes les icônes restent à l'écran, entrée en cascade."
                : "Ajoutez au moins une icône."}
            </span>
          </div>
          <div className="grid md:grid-cols-2">{bgMediaBlock()}</div>
        </div>
      );
    }
    case "svg_flow": {
      const nodes: any[] = Array.isArray(cfg.nodes) ? cfg.nodes : [];
      const setNodes = (next: any[]) => set("nodes", next.slice(0, 8));
      const setNode = (i: number, key: string, value: any) =>
        setNodes(nodes.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
      const layout = ["hub", "loop"].includes(cfg.layout as string) ? (cfg.layout as string) : "chain";
      const speed = ["slow", "fast"].includes(cfg.speed as string) ? (cfg.speed as string) : "normal";
      const linkCount = layout === "loop" && nodes.length > 2 ? nodes.length : Math.max(0, nodes.length - 1);
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            {text("kicker", "Sur-titre (optionnel)", "Comment ça marche")}
            {text("title", "Titre de la scène (optionnel)", "Trois étapes, zéro friction")}
            <label className="text-xs text-muted-foreground grid gap-1">
              Disposition
              <select
                value={layout}
                onChange={(e) => set("layout", e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="chain">Enchaînement (A → B → C)</option>
                <option value="hub">Étoile (1er nœud au centre)</option>
                <option value="loop">Circuit fermé (boucle)</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Vitesse du tracé
              <select
                value={speed}
                onChange={(e) => set("speed", e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="slow">Lente</option>
                <option value="normal">Normale</option>
                <option value="fast">Rapide</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2">
            {nodes.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 md:grid-cols-[10rem_1fr_1fr_2rem] md:items-end">
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">
                    {layout === "hub" && i === 0 ? "Nœud central" : `Nœud ${i + 1}`}
                  </span>
                  <VideoIconPickerDialog
                    value={typeof it.icon === "string" ? it.icon : null}
                    onChange={(key) => setNode(i, "icon", key)}
                  />
                </div>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Titre (optionnel)
                  <Input
                    value={it.title ?? ""}
                    onChange={(e) => setNode(i, "title", e.target.value.slice(0, 60))}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Texte (optionnel)
                  <Input
                    value={it.text ?? ""}
                    onChange={(e) => setNode(i, "text", e.target.value.slice(0, 120))}
                    className="h-8 text-xs"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setNodes(nodes.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            {nodes.length < 8 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-fit text-xs"
                onClick={() => setNodes([...nodes, { icon: "", title: "", text: "" }])}
              >
                + Ajouter un nœud
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground">
              {nodes.length < 2
                ? "Ajoutez au moins 2 nœuds : le tracé relie les nœuds entre eux."
                : `${linkCount} liaison(s) tracée(s) sur ${section.duration_sec} s — chaque nœud apparaît quand sa liaison est tracée, puis tout reste à l'écran.`}
            </span>
          </div>

          <SvgFlowBeatsEditor
            beats={Array.isArray(cfg.beats) ? (cfg.beats as FlowBeat[]) : []}
            duration={section.duration_sec}
            nodeCount={nodes.length}
            linkCount={linkCount}
            timing={(cfg.timing as string) === "manual" ? "manual" : "sequence"}
            onTiming={(t) => set("timing", t)}
            onChange={(next) => set("beats", next)}
          />

          {text("body", "Phrase de bas de scène (optionnelle)", "Un parcours simple, du premier contact à la réservation.")}
          <div className="grid md:grid-cols-2">{bgMediaBlock()}</div>
        </div>
      );
    }
    case "map_reveal": {
      const points: any[] = Array.isArray(cfg.points) ? cfg.points : [];
      const setPoint = (i: number, key: string, value: any) =>
        set(
          "points",
          points.map((pt, idx) => (idx === i ? { ...pt, [key]: value } : pt)),
        );
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            {mediaOne("mapUrl", "Image de carte", "image", "Capture ou plan importé dans la bibliothèque globale.")}
            {text("title", "Titre", "Tout à moins d'1 km")}
            {text("kicker", "Sur-titre", "Géolocalisé")}
            <label className="text-xs text-muted-foreground grid gap-1">
              Zoom de départ (1 à 1.6)
              <Input
                type="number"
                step="0.02"
                min={1}
                max={1.6}
                value={cfg.zoom ?? 1.12}
                onChange={(e) => set("zoom", Math.max(1, Math.min(1.6, Number(e.target.value) || 1.12)))}
                className="h-8 text-xs"
              />
            </label>
          </div>
          <div className="grid gap-2">
            {points.map((pt, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[5rem_5rem_1fr_2rem] items-end">
                <label className="text-xs text-muted-foreground grid gap-1">
                  X (%)
                  <Input
                    type="number"
                    value={pt.x ?? 50}
                    onChange={(e) => setPoint(i, "x", Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Y (%)
                  <Input
                    type="number"
                    value={pt.y ?? 50}
                    onChange={(e) => setPoint(i, "y", Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Libellé
                  <Input
                    value={pt.label ?? ""}
                    onChange={(e) => setPoint(i, "label", e.target.value)}
                    placeholder="Médina"
                    className="h-8 text-xs"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => set("points", points.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            {points.length < 8 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-fit text-xs"
                onClick={() => set("points", [...points, { x: 50, y: 50, label: "" }])}
              >
                + Ajouter un point
              </Button>
            )}
          </div>
          <div className="grid md:grid-cols-2">{bgMediaBlock()}</div>
        </div>
      );
    }
    case "split_screen": {
      const panel = (side: "left" | "right", label: string) => {
        const p = (cfg[side] ?? {}) as Record<string, any>;
        const setPanel = (key: string, value: any) => set(side, { ...p, [key]: value });
        return (
          <div className="grid gap-2 rounded-md border p-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground">Image du panneau</span>
              <VideoMediaPickerDialog
                businessId={businessId}
                format={format}
                allow="image"
                label={p.imageUrl ? "Changer l'image" : "Choisir une image"}
                value={p.imageUrl ? [String(p.imageUrl)] : []}
                onChange={(urls) => setPanel("imageUrl", urls[0] ?? "")}
              />
            </div>

            <label className="text-xs text-muted-foreground grid gap-1">
              Titre
              <Input
                value={p.title ?? ""}
                onChange={(e) => setPanel("title", e.target.value)}
                className="h-8 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Texte
              <Textarea
                value={p.body ?? ""}
                onChange={(e) => setPanel("body", e.target.value.slice(0, 300))}
                rows={2}
                className="text-xs"
              />
            </label>
          </div>
        );
      };
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {panel("left", "Panneau gauche (haut en portrait)")}
          {panel("right", "Panneau droit (bas en portrait)")}
          {bgMediaBlock()}
        </div>
      );
    }
    case "logo_merge":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {mediaOne(
            "partnerLogoUrl",
            "Logo partenaire (PNG/SVG transparent)",
            "image",
            "Vide = logo de la fiche. Importer les logos en « global » pour les réutiliser.",
          )}
          {text("caption", "Signature", "1WM × Partenaire")}
        </div>
      );

    case "outro":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("tagline", "Tagline", "L'art de vivre marocain.")}
          {text("city", "Ville", "Marrakech")}
          {bgMediaBlock()}
        </div>
      );
    default:
      return null;
  }
};

/** Champ durée clavier-friendly : pas de flèches, saisie libre, clamp au blur. */
const SectionDurationInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(raw.replace(/[^0-9]/g, ""));
    const clamped = Math.max(MIN_SECTION_SEC, Math.min(MAX_SECTION_SEC, Number.isFinite(n) ? n : MIN_SECTION_SEC));
    onChange(clamped);
    setRaw(String(clamped));
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className="w-16 h-8 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
};

const SortableSection = ({
  section,
  index,
  startSec,
  expanded,
  onToggle,
  patch,
  remove,
  businessId,
  format,
  dropGlobal,
}: {
  section: Section;
  index: number;
  startSec: number;
  expanded: boolean;
  onToggle: () => void;
  patch: (values: Partial<Section>) => void;
  remove: () => void;
  businessId: string | null;
  format: "portrait" | "landscape";
  dropGlobal?: (urls: string[]) => void;
}) => {

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const hint = STEP_TYPES.find((s) => s.value === section.step_type)?.hint;


  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`p-3 bg-background ${isDragging ? "opacity-60 shadow-lg relative z-10" : ""}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Déplacer la section"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-6 text-xs font-bold tabular-nums text-muted-foreground">{index + 1}</span>
        <button type="button" className="flex items-center gap-2 text-left" onClick={onToggle}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-black">{section.label || typeLabel(section.step_type)}</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {mmss(startSec)} — {mmss(startSec + section.duration_sec)} · {section.step_type}
            </span>
          </span>
        </button>
        {section._new && (
          <Badge variant="outline" className="text-[10px]">
            nouvelle
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Durée
              <SectionDurationInput
                value={section.duration_sec}
                onChange={(v) => patch({ duration_sec: v })}
              />
              s
            </label>
            <div className="flex items-center gap-1">
              {[3, 5, 10, 15, 20, 30, 60, 120, 180, 240].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => patch({ duration_sec: preset })}
                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                    section.duration_sec === preset
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  title={`Régler la durée à ${preset} s`}
                >
                  {preset}s
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Actif
            <Switch checked={section.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          </label>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={remove}
            aria-label="Supprimer la section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-9 grid gap-4 max-w-4xl">
          <div className="rounded-lg border p-3 grid gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              1. Identité de la section
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-muted-foreground grid gap-1">
                Type de section
                <select
                  value={section.step_type}
                  onChange={(e) => patch({ step_type: e.target.value as StepType })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground grid gap-1">
                Nom de la section (back-office)
                <Input
                  value={section.label ?? ""}
                  onChange={(e) => patch({ label: e.target.value })}
                  className="h-8 text-xs"
                />
              </label>
            </div>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>

          <div className="rounded-lg border p-3 grid gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              2. Contenu — {typeLabel(section.step_type)}
            </span>
            <ConfigFields section={section} patch={patch} businessId={businessId} format={format} dropGlobal={dropGlobal} />
          </div>

          <div className="rounded-lg border p-3 flex flex-col gap-3 min-w-0">
            <h4 className="w-full text-sm font-semibold text-foreground">
              3. Voix-off et effets de l'étape
            </h4>
            <StepVoiceOverBlock
              value={(section.config?.voice as StepVoice | undefined) ?? null}
              durationSec={section.duration_sec}
              onChange={(v) => {
                const next = { ...(section.config ?? {}) };
                if (v) next.voice = v;
                else delete next.voice;
                patch({ config: next });
              }}
            />
            <StepEffectsBlock
              value={(section.config?.effects as Partial<MontageEffects> | undefined) ?? null}
              onChange={(v) => {
                const next = { ...(section.config ?? {}) };
                if (v) next.effects = v;
                else delete next.effects;
                patch({ config: next });
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

/**
 * Guide affiché sous le storyboard : rappel des règles de paramétrage.
 * Le but est que l'utilisateur comprenne les limites, les repli et le workflow
 * sans avoir à deviner le comportement du moteur Remotion.
 */
const StoryboardGuide = () => {
  const stepHelp: Array<{ type: StepType; icon: ReactNode; title: string; body: string }> = [
    {
      type: "hook",
      icon: <MousePointerClick className="h-4 w-4" />,
      title: "Accroche",
      body: "Première image du film. Le logo 1WM et le nom de l'établissement apparaissent avec l'accroche et la ville. Si le champ Titre est vide, le moteur utilise hook_fr de la fiche.",
    },
    {
      type: "video",
      icon: <Film className="h-4 w-4" />,
      title: "Vidéo plein écran",
      body: "Lit une URL vidéo en fond. Si l'URL est vide, le moteur prend la première vidéo interne de la fiche (business_documents type video). Le son peut être activé ou coupé.",
    },
    {
      type: "photos",
      icon: <Image className="h-4 w-4" />,
      title: "Photos plein écran",
      body: "Carrousel de 1 à 30 médias mixtes (images ET vidéos), montés à la suite. Ken Burns (zoom_in, zoom_out, none) sur les images, vidéos muettes. Les médias choisis dans le sélecteur sont prioritaires ; sinon le moteur utilise les images de la fiche.",
    },
    {
      type: "text_overlay",
      icon: <Type className="h-4 w-4" />,
      title: "Texte en surimpression",
      body: "Texte riche continu (500 caractères max) affiché par-dessus le média précédent. Les balises H, p, strong et em sont conservées. Les emojis sont rendus.",
    },
    {
      type: "counter",
      icon: <LayoutTemplate className="h-4 w-4" />,
      title: "Compteur / chiffre clé",
      body: "Jusqu'à 4 chiffres animés avec préfixe, suffixe et légende. Utile pour les statistiques (établissements, avis, kilomètres, etc.).",
    },
    {
      type: "map_reveal",
      icon: <MapPin className="h-4 w-4" />,
      title: "Carte / localisation",
      body: "Image de carte avec zoom progressif et points d'intérêt. Les coordonnées X/Y sont en pourcentage (0-100).",
    },
    {
      type: "split_screen",
      icon: <Split className="h-4 w-4" />,
      title: "Écran partagé",
      body: "Deux panneaux : image + titre + texte. En portrait ils s'empilent (haut/bas), en paysage ils sont côte à côte.",
    },
    {
      type: "icon_grid",
      icon: <LayoutTemplate className="h-4 w-4" />,
      title: "Icônes (grille / battements)",
      body: "1 à 8 icônes de la bibliothèque curatée (17 catégories), chacune avec Titre et/ou Texte optionnels. Deux affichages : Grille simultanée (entrée en cascade, tout reste à l'écran) ou Battements (la durée de l'étape est découpée à parts égales, une icône plein cadre par battement, avec indicateur de progression). Un fond média peut être ajouté. Le picker affiche un aperçu 120 px au survol.",
    },
    {
      type: "svg_flow",
      icon: <LayoutTemplate className="h-4 w-4" />,
      title: "Tracé SVG animé (liaisons)",
      body: "2 à 8 nœuds (icône + Titre et/ou Texte optionnels) reliés par un tracé animé au frame (strokeDashoffset). Trois dispositions : Enchaînement (A → B → C), Étoile (1er nœud au centre) et Circuit fermé. Trois vitesses. Sans réglage, chaque nœud apparaît quand sa liaison est tracée, puis tout reste à l'écran. TIMELINE INTERNE (battements) : de 3 à 240 s, on déclare une suite de battements — Nœud, Liaison, Titre, Hook, Sous-hook, Chiffre/% (compteur animé, même moteur que la scène Compteur). Mode Séquence = les battements se partagent la durée à parts égales (changer 8 s en 25 s ne demande aucune ressaisie) ; mode Manuel = début et durée en secondes. Les textes et chiffres se posent au cadre (haut/centre/bas) ou se collent à un nœud. Durées minimales de lisibilité imposées : 1,2 s pour un texte, 1,5 s pour un chiffre ; la frise signale en rouge un débordement ou deux textes superposés sur la même ancre. À distinguer des effets de motion design : ici c'est une scène (contenu), pas un calque du montage.",
    },
    {

      type: "logo_merge",
      icon: <Merge className="h-4 w-4" />,
      title: "Fusion de logos",
      body: "Lockup One World Morocco + logo partenaire. Préférer un PNG/SVG transparent. La signature est personnalisable.",
    },
    {
      type: "outro",
      icon: <Play className="h-4 w-4" />,
      title: "Outro",
      body: "Dernière image : logo 1WM, tagline et ville. Gardez-la courte (3 à 5 s) pour ne pas alourdir la fin.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-black flex items-center gap-2 text-base">
          <Info className="h-5 w-5" /> Paramétrage du storyboard
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Ce qu'il faut savoir avant de créer ou modifier un montage manuel.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Clock className="h-4 w-4" /> Durées et limites
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Durée totale max : {MAX_TOTAL_SEC} s ({mmss(MAX_TOTAL_SEC)}).</li>
              <li>Durée d'une section : {MIN_SECTION_SEC} à {MAX_SECTION_SEC} s.</li>
              <li>Nombre max de sections : {MAX_SECTIONS}.</li>
              <li>
                Fond média (Accroche, Texte surimpression, Compteur, Outro, Carte, Écran partagé) : playlist mixte
                d'images <strong>et</strong> de vidéos, jusqu'à 30 médias joués à la suite en fondu enchaîné, durée
                partagée à parts égales. Vidéos muettes, plein cadre. Un voile sombre garantit la lisibilité du texte.
              </li>
              <li>
                Titres, sur-titres et corps de texte suivent une typographie unique commune à toutes les scènes
                (Montserrat pour les titres, Avenir pour le corps) : une seule modification s'applique partout.
              </li>

              <li>La barre de progression passe en rouge si le total dépasse le plafond.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <LayoutTemplate className="h-4 w-4" /> Formats de rendu
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Paysage 1920×1080 (16:9) pour site, LinkedIn, YouTube.</li>
              <li>Portrait 1080×1920 (9:16) pour Reels, TikTok, Stories.</li>
              <li>Le format est défini au niveau du storyboard, pas de la section.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Film className="h-4 w-4" /> Échelle d'aperçu
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>0,5× — rendu rapide en 540p pour valider le timing.</li>
              <li>0,667× — rendu en 720p pour vérifier les détails.</li>
              <li>1× — sortie finale 1080p (plus long, plus coûteux en crédits).</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3 space-y-2 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <MousePointerClick className="h-4 w-4" /> Workflow obligatoire
            </div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Créer le storyboard et choisir le format.</li>
              <li>Associer un établissement (optionnel mais recommandé) pour activer les repli logo/photos/vidéo/hook/ville.</li>
              <li>Ajouter les sections dans l'ordre, régler leurs durées et leur configuration.</li>
              <li>
                <strong className="text-foreground">Enregistrer avant de lancer le rendu</strong> — le bouton « Rendre » est désactivé tant qu'il reste des modifications non sauvegardées.
              </li>
              <li>Lancer le rendu, puis suivre l'avancement dans l'onglet « Dernières vidéos ».</li>
            </ol>
          </div>

          <div className="rounded-lg border p-3 space-y-2 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Info className="h-4 w-4" /> Règles de priorité des assets
            </div>
            <p className="text-xs text-muted-foreground">
              Quand une section demande un média, le moteur utilise dans cet ordre : (1) le média choisi dans le
              sélecteur de la section, (2) l'asset correspondant de la fiche associée, (3) un fallback visuel générique.
              C'est pourquoi lier un établissement accélère le paramétrage : la plupart des champs peuvent rester vides.
            </p>
            <p className="text-xs text-muted-foreground">
              Le sélecteur agrège quatre sources : les médias publics de la fiche, les vidéos portant le badge
              « Générique », la bibliothèque staff rattachée à la fiche et la bibliothèque staff globale (B-roll ville,
              logos, plans, captures). Les médias importés via « Importer » vont dans la bibliothèque staff : ils ne
              s'affichent jamais sur le site public. Un badge d'orientation (16:9 / 9:16) passe en orange quand le média
              ne correspond pas au format du storyboard.
            </p>

          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-black">Détail des types de section</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stepHelp.map((h) => (
              <div key={h.type} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-black">
                  {h.icon}
                  {h.title}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-3 space-y-3">
          <h4 className="text-sm font-semibold text-black">Contenu interprétable du moteur Storyboard</h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>Rôle.</strong> C'est le <strong>moteur de rendu vidéo manuel</strong> du back-office Vidéos. Il ne contient aucun scénario codé en dur : il lit une liste d'étapes stockée en base (<code>video_storyboards</code> / <code>video_scenario_steps</code>) et compose la vidéo étape par étape.
            </p>
            <p>
              <strong>Formats.</strong> Portrait 1080 × 1920 ou paysage 1920 × 1080. 30 fps. Durée totale = somme des durées des étapes (max 240 s).
            </p>
            <div>
              <p className="font-semibold text-foreground">Types de scènes disponibles</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><code>logo_merge</code> — fusion 1WM + logo partenaire (horizontal en paysage, vertical en portrait pour éviter la coupe)</li>
                <li><code>hook</code> — accroche d'ouverture avec logo, titre, ville</li>
                <li><code>video</code> — une ou plusieurs vidéos montées à la suite (jusqu'à 30)</li>
                <li><code>photos</code> — jusqu'à 30 médias mixtes images/vidéos avec fondu et Ken Burns</li>
                <li><code>text_overlay</code> — texte riche (HTML filtré) sur fond</li>
                <li><code>counter</code> — chiffres clés animés, 1 à 4 valeurs</li>
                <li><code>map_reveal</code> — carte avec zoom et points d'intérêt (jusqu'à 8)</li>
                <li><code>split_screen</code> — deux panneaux comparatifs</li>
                <li><code>outro</code> — signature finale logo + tagline + ville</li>
              </ul>
            </div>
            <p>
              <strong>Fond média partagé.</strong> Presque toutes les scènes peuvent recevoir un fond média : playlist mixte images + vidéos (30 max). Quand un fond est actif, le voile de fond s'éclaircit pour garder le texte lisible.
            </p>
            <div>
              <p className="font-semibold text-foreground">Typographie globale</p>
              <p>Trois composants uniques gèrent tous les textes :</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><code>SceneKicker</code> — sur-titre doré</li>
                <li><code>SceneTitle</code> — titres (3 niveaux)</li>
                <li><code>SceneBody</code> — corps de texte</li>
              </ul>
              <p>Modifier ces trois-là change l'apparence de toutes les scènes.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Sécurité / robustesse</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Si un type de scène n'existe pas encore, un <code>PlaceholderScene</code> s'affiche : la vidéo ne casse jamais.</li>
                <li>Les URLs absolues sont utilisées telles quelles, les chemins relatifs sont résolus dans <code>remotion/public</code>.</li>
                <li>Le rendu est mis à l'échelle de manière identique entre aperçu et final.</li>
              </ul>
            </div>
          </div>
        </div>


        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <h4 className="text-sm font-semibold text-destructive">Erreurs fréquentes à éviter</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mt-1">
            <li>Oublier d'enregistrer avant de cliquer sur « Rendre ».</li>
            <li>Dépasser {MAX_TOTAL_SEC} s au total : le rendu est bloqué.</li>
            <li>Mettre une section à moins de {MIN_SECTION_SEC} s ou plus de {MAX_SECTION_SEC} s.</li>
            <li>Saisir une URL photo/vidéo inaccessible : le moteur passera au repli suivant, ou à une image noire.</li>
            <li>Activer le son sur plusieurs sections vidéo superposées : les pistes audio se superposent.</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-destructive/20">
            <p className="text-xs font-semibold text-destructive">Scénario Home Landscape avec 1 seule section Vidéo de 20 s</p>
            <p className="text-xs text-muted-foreground mt-1">Ce qui marche / ne marche pas avec 1 seule section vidéo de 20 s :</p>
            <p className="text-xs font-semibold text-foreground mt-1">Actif</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mt-0.5">
              <li>Fondu d'entrée + fondu de sortie (noir/blanc, vitesse réglable)</li>
              <li>Fondu audio in/out sur la voix-off</li>
              <li>Grade global : grain, vignette, light leaks, tracé SVG, motion blur (coûteux)</li>
            </ul>
            <p className="text-xs font-semibold text-foreground mt-1.5">Sans effet dans ce cas</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mt-0.5">
              <li>Fondu inter-étapes / slide / wipe / flash de coupe : il n'y a aucune frontière entre sections (rien à transitionner)</li>
              <li>Ken Burns : appliqué uniquement aux images de fond, pas aux vidéos (OffthreadVideo n'est pas transformé)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1.5">Si tu veux du mouvement sur un clip vidéo, il faut soit découper en 2 étapes de 10 s (pour avoir une transition), soit j'étends Ken Burns aux vidéos — dis-moi.</p>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <h4 className="text-sm font-semibold text-black">Périmètre d'utilisation selon les paramètres de montage</h4>
          <div className="text-xs text-muted-foreground space-y-3">
            <div>
              <p className="font-semibold text-foreground">Les 3 réglages qui décident du résultat</p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li>
                  <strong>Aperçu (échelle de rendu)</strong> — onglet Montage. Réduit la <strong>résolution de la composition</strong> :
                  0,5× en paysage = 960 × 540 réellement rendus. C'est le levier le plus violent sur le poids ET sur la netteté :
                  la vidéo finale n'existe qu'en 540p, l'agrandir chez le lecteur ne rend pas les pixels perdus.
                </li>
                <li>
                  <strong>Niveau de compression (CRF)</strong> — onglet Effets. Ne change pas la résolution, seulement la
                  quantité de détail conservée à l'encodage. CRF 20 = quasi master, CRF 34 = le plus léger encore utilisable.
                </li>
                <li>
                  <strong>Résolution de sortie (encodage)</strong> — onglet Effets. Masquée pour les montages storyboard
                  (<code>showScale=false</code>) car l'échelle est déjà pilotée par l'Aperçu. Elle vaut donc toujours 100 % ici.
                </li>
              </ul>
              <p className="mt-1">
                Les deux échelles se <strong>multiplient</strong>. Un job en Aperçu 0,5× et encodage 100 % sort en 50 %,
                soit 960 × 540. La carte du rendu affiche désormais l'échelle effective et la résolution réelle.
              </p>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
              <p className="font-semibold text-foreground">Meilleure définition possible</p>
              <p className="mt-1">
                Aperçu <strong>1× — sortie finale 1080p</strong> + compression <strong>Master (CRF 20)</strong> + audio conservé en 128k.
                Aucun autre réglage n'améliore la définition : le moteur rend en 30 fps, la source ne dépasse jamais 1920 × 1080.
                Compter 4 à 8× le poids d'un rendu équilibré, et un temps de rendu 2 à 3× plus long.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Exemple 1 — Test de montage (itération rapide)</p>
              <p>Aperçu <strong>0,5×</strong> · CRF <strong>34</strong> · audio supprimé.</p>
              <p className="mt-0.5">
                <strong>Pourquoi.</strong> Le but est de vérifier l'<em>ordre des plans, les durées, les points de coupe</em>,
                pas la qualité d'image. On divise la surface par 4 : le rendu GitHub Actions passe de plusieurs dizaines de
                minutes à quelques minutes, le fichier tient en quelques Mo. À ne jamais publier : le 540p se voit
                immédiatement en plein écran desktop.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Exemple 2 — Hero autoplay du site / widget embarqué</p>
              <p>Aperçu <strong>0,667× (720p)</strong> · CRF <strong>28 (Équilibré)</strong> · audio <strong>supprimé</strong>.</p>
              <p className="mt-0.5">
                <strong>Pourquoi.</strong> Un hero est lu en boucle, muet, souvent recouvert d'un voile sombre et d'un titre :
                la perte de détail est masquée, et chaque Mo compte sur mobile. Le 720p suffit car le lecteur est rarement
                plein écran. Supprimer la piste audio retire ~30 % du poids sans aucun effet visible puisque l'autoplay est
                obligatoirement muet.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Exemple 3 — Livrable partenaire / diffusion réseaux sociaux</p>
              <p>Aperçu <strong>1× (1080p)</strong> · CRF <strong>24 (Qualité préservée)</strong> · audio <strong>conservé 128k</strong>.</p>
              <p className="mt-0.5">
                <strong>Pourquoi.</strong> Instagram, YouTube et LinkedIn <strong>ré-encodent</strong> tout fichier reçu :
                si on leur envoie un CRF 34, leur propre compression s'ajoute à la nôtre et le résultat se dégrade visiblement
                (bavures sur feuillage, foule, dégradés). On leur donne donc une source large avec du détail à perdre.
                CRF 24 plutôt que 20 parce qu'un master n'apporte rien face à un ré-encodage : il ne fait que ralentir l'envoi.
              </p>
            </div>

            <p className="text-[11px]">
              <strong>Règle simple.</strong> L'échelle sert à choisir <em>où</em> la vidéo sera regardée (taille d'écran),
              le CRF sert à choisir <em>ce qu'on accepte de perdre</em>. Baisser l'échelle est irréversible et visible ;
              monter le CRF est plus discret. Pour alléger, baisser d'abord l'échelle si la destination est petite,
              sinon monter le CRF.
            </p>
          </div>
        </div>
      </CardContent>

    </Card>
  );
};

const VideoStoryboardPanel = () => {
  const [boards, setBoards] = useState<Storyboard[]>([]);
  /** Onglet actif de l'éditeur : montage / effets / rendus. */
  const [tab, setTab] = useState("montage");
  /** Guide affiché en panneau latéral, plus au-dessus de l'outil. */
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newType, setNewType] = useState<StepType>("hook");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [jobs, setJobs] = useState<StoryboardJob[]>([]);
  const [jobBusinessNames, setJobBusinessNames] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  /** Scénario auto sélectionné dans le même sélecteur (null = storyboard manuel). */
  const [legacyMode, setLegacyMode] = useState<"business" | "corporate" | null>(null);
  /** Médias globaux du montage (ordre + bornes Start/End), propagés à toutes les étapes. */
  const [globalMediaItems, setGlobalMediaItems] = useState<GlobalMediaItem[]>([]);
  /** Dernière valeur synchrone utilisée par Enregistrer, même juste après une saisie. */
  const globalMediaItemsRef = useRef<GlobalMediaItem[]>([]);
  const globalMedia = useMemo(() => globalMediaItems.map((m) => m.url), [globalMediaItems]);
  const [globalIncludeBg, setGlobalIncludeBg] = useState(true);
  /** Durées réelles des vidéos globales (métadonnées lues côté navigateur), pour calculer la durée nécessaire. */
  const [mediaDurations, setMediaDurations] = useState<Record<string, number>>({});
  useEffect(() => {
    const urls = globalMediaItems
      .map((m) => m.url)
      .filter((u) => isVideoMediaUrl(u))
      .filter((u) => mediaDurations[u] == null);
    if (urls.length === 0) return;
    let cancelled = false;
    urls.forEach((url) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.muted = true;
      el.src = url;
      el.onloadedmetadata = () => {
        if (!cancelled && Number.isFinite(el.duration)) {
          setMediaDurations((prev) => ({ ...prev, [url]: el.duration }));
        }
      };
    });
    return () => {
      cancelled = true;
    };
  }, [globalMediaItems, mediaDurations]);

  /** Durée nécessaire pour monter toutes les vidéos globales selon leurs bornes Start/End. */
  const requiredVideoDuration = useMemo(() => {
    let total = 0;
    let unknown = 0;
    let clips = 0;
    for (const m of globalMediaItems) {
      if (!isVideoMediaUrl(m.url)) continue;
      clips += 1;
      const dur = mediaDurations[m.url];
      const start = Math.max(0, m.start ?? 0);
      const end = (m.end ?? 0) > 0 ? (m.end as number) : dur;
      if (end == null) {
        unknown += 1;
        continue;
      }
      total += Math.max(0, end - start);
    }
    return { total, unknown, clips };
  }, [globalMediaItems, mediaDurations]);



  // Autocomplete établissement (même mécanique que Promo business).
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Biz[]>([]);
  const [biz, setBiz] = useState<Biz | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const loadBoards = useCallback(async () => {
    const { data, error } = await supabase
      .from("video_storyboards" as any)
      .select("id, name, scenario_type, format, business_id, preview_scale, max_duration_sec, effects, global_media, encode, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Chargement des storyboards impossible");
      return;
    }
    const list = (data ?? []) as unknown as Storyboard[];
    setBoards(list);
    setCurrentId((prev) => prev ?? list[0]?.id ?? null);
  }, []);

  // Rendus de tous les montages : storyboards manuels + scénarios automatiques.
  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("video_jobs")
      .select(
        "id, title, status, output_url, error_message, created_at, duration_sec, template_id, business_id, template_props, scenario_json",
      )
      .or(
        "template_id.like.storyboard%,template_id.eq.business-showcase,template_id.eq.corporate-vertical",
      )
      .order("created_at", { ascending: false })
      .limit(12);
    const rows = (data ?? []) as StoryboardJob[];
    setJobs(rows);
    const ids = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: bizRows } = await supabase.from("businesses").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      (bizRows ?? []).forEach((b: any) => {
        map[b.id] = b.name;
      });
      setJobBusinessNames(map);
    } else {
      setJobBusinessNames({});
    }
  }, []);

  useEffect(() => {
    loadBoards().finally(() => setLoading(false));
    loadJobs();
  }, [loadBoards, loadJobs]);

  const loadBoard = useCallback(async (id: string) => {
    setLoading(true);
    const [boardRes, stepsRes] = await Promise.all([
      supabase
        .from("video_storyboards" as any)
        .select("id, name, scenario_type, format, business_id, preview_scale, max_duration_sec, effects, global_media, encode, created_at, updated_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("video_scenario_steps" as any)
        .select("id, storyboard_id, mode, scene_key, step_type, label, position, duration_sec, enabled, config")
        .eq("storyboard_id", id)
        .order("position", { ascending: true }),
    ]);
    const b = (boardRes.data as unknown as Storyboard) ?? null;
    setBoard(b);
    const loadedGlobalMedia = (Array.isArray(b?.global_media) ? b.global_media : [])
        .filter((m: any) => m && typeof m.url === "string" && m.url.trim())
        .map((m: any) => ({
          url: m.url as string,
          start: Number.isFinite(m.start) && m.start >= 0 ? Number(m.start) : undefined,
          end: Number.isFinite(m.end) && m.end > 0 ? Number(m.end) : undefined,
        }));
    globalMediaItemsRef.current = loadedGlobalMedia;
    setGlobalMediaItems(loadedGlobalMedia);
    setSections(
      ((stepsRes.data ?? []) as unknown as Section[]).map((s) => ({ ...s, config: s.config ?? {} })),
    );
    setRemoved([]);
    setDirty(false);
    setLoading(false);

    if (b?.business_id) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, city")
        .eq("id", b.business_id)
        .maybeSingle();
      const found = (data as Biz | null) ?? null;
      setBiz(found);
      setQuery(found?.name ?? "");
    } else {
      setBiz(null);
      setQuery("");
    }
  }, []);

  useEffect(() => {
    if (currentId) loadBoard(currentId);
  }, [currentId, loadBoard]);

  useEffect(() => {
    const raw = query.trim();
    if (raw.length < 2 || (biz && raw === biz.name)) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, city")
        .or(`name.ilike.%${raw}%,slug.ilike.%${raw}%`)
        .limit(12);
      if (!cancelled) setResults((data ?? []) as Biz[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const totals = useMemo(() => {
    let cursor = 0;
    const starts: Record<string, number> = {};
    for (const s of sections) {
      starts[s.id] = cursor;
      if (s.enabled) cursor += s.duration_sec;
    }
    return { starts, total: cursor };
  }, [sections]);

  const maxTotal = board?.max_duration_sec ?? MAX_TOTAL_SEC;
  const overflow = totals.total > maxTotal;

  const createBoard = async () => {
    const { data, error } = await supabase
      .from("video_storyboards" as any)
      .insert({ name: `Storyboard ${boards.length + 1}` } as any)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      toast.error("Création impossible");
      return;
    }
    await loadBoards();
    setCurrentId((data as any).id);
    toast.success("Storyboard créé");
  };

  /** Duplication : le montage courant enregistré + toutes ses étapes. */
  const duplicateBoard = async () => {
    if (!board) return;
    if (dirty) {
      toast.error("Enregistre le montage avant de le dupliquer");
      return;
    }
    const { data, error } = await supabase
      .from("video_storyboards" as any)
      .insert({
        name: `${board.name} (copie)`,
        scenario_type: board.scenario_type,
        format: board.format,
        business_id: board.business_id,
        preview_scale: board.preview_scale,
        max_duration_sec: board.max_duration_sec,
        effects: board.effects ?? null,
        global_media: globalMediaItemsRef.current as any,
        encode: normalizeEncode(board.encode) as any,
      } as any)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      toast.error(`Duplication impossible : ${error?.message ?? "inconnue"}`);
      return;
    }
    const newId = (data as any).id as string;
    if (sections.length > 0) {
      const rows = sections.map((s, i) => ({
        storyboard_id: newId,
        mode: s.mode ?? "corporate",
        scene_key: s.scene_key || `${s.step_type}_${i + 1}`,
        step_type: s.step_type,
        label: s.label,
        position: (i + 1) * 10,
        duration_sec: s.duration_sec,
        enabled: s.enabled,
        config: s.config ?? {},
      }));
      const { error: stepErr } = await supabase.from("video_scenario_steps" as any).insert(rows as any);
      if (stepErr) {
        toast.error(`Étapes non copiées : ${stepErr.message}`);
        return;
      }
    }
    await loadBoards();
    setLegacyMode(null);
    setCurrentId(newId);
    toast.success("Montage dupliqué");
  };

  const deleteBoard = async () => {
    if (!board) return;
    const { error } = await supabase.from("video_storyboards" as any).delete().eq("id", board.id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    setCurrentId(null);
    setBoard(null);
    setSections([]);
    await loadBoards();
    toast.success("Storyboard supprimé");
  };

  const patchBoard = (values: Partial<Storyboard>) => {
    setBoard((prev) => (prev ? { ...prev, ...values } : prev));
    setDirty(true);
  };

  const patchSection = (id: string, values: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    setDirty(true);
  };

  /** Médias affectés à l'ensemble du montage, puis propagés à toutes les étapes. */
  const isVideoUrl = (u: string) => isVideoMediaUrl(u);

  const applyGlobalMedia = (media: GlobalMediaItem[], includeBackgrounds: boolean) => {
    const list = media.slice(0, 30);
    const pool = list.map((m) => m.url);
    const videos = list.filter((m) => isVideoUrl(m.url));
    const trims: Record<string, { start?: number; end?: number }> = {};
    for (const m of list) {
      if ((m.start ?? 0) > 0 || (m.end ?? 0) > 0) trims[m.url] = { start: m.start, end: m.end };
    }
    setSections((prev) =>
      prev.map((s) => {
        const cfg = s.config ?? {};
        if (s.step_type === "video") {
          return {
            ...s,
            config: {
              ...cfg,
              assetUrls: (videos.length ? videos : list).map((m) => m.url),
              assetUrl: "",
              assetTrims: trims,
            },
          };
        }
        if (s.step_type === "photos") {
          return { ...s, config: { ...cfg, media: pool, images: [], assetTrims: trims } };
        }
        if (includeBackgrounds && pool.length > 0) {
          return {
            ...s,
            config: { ...cfg, bgMode: "medias", bgMedia: pool, bgImages: [], bgVideoUrl: "", assetTrims: trims },
          };
        }
        return s;
      }),
    );
    setDirty(true);
  };

  const clearAllMedia = () => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        config: {
          ...(s.config ?? {}),
          assetUrls: [],
          assetUrl: "",
          media: [],
          images: [],
          bgMode: "none",
          bgMedia: [],
          bgImages: [],
          bgVideoUrl: "",
        },
      })),
    );
    setDirty(true);
    toast.success("Médias retirés de toutes les étapes");
  };


  const addSection = () => {
    if (!board) return;
    if (sections.length >= MAX_SECTIONS) {
      toast.error(`Plafond provisoire de ${MAX_SECTIONS} sections (à confirmer après benchmark de rendu)`);
      return;
    }
    const id = crypto.randomUUID();
    setSections((prev) => [
      ...prev,
      {
        id,
        storyboard_id: board.id,
        mode: "corporate",
        scene_key: `${newType}_${prev.length + 1}`,
        step_type: newType,
        label: typeLabel(newType),
        position: (prev.length + 1) * 10,
        duration_sec: 6,
        enabled: true,
        config: {},
        _new: true,
      },
    ]);
    setExpanded(id);
    setDirty(true);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setRemoved((prev) => [...prev, id]);
    setDirty(true);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const from = prev.findIndex((s) => s.id === active.id);
      const to = prev.findIndex((s) => s.id === over.id);
      if (from === -1 || to === -1) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!board) return;
    if (overflow) {
      toast.error(`Durée totale ${mmss(totals.total)} > plafond ${mmss(maxTotal)}`);
      return;
    }
    setSaving(true);

    const toDelete = removed.filter((id) => !sections.some((s) => s.id === id));
    if (toDelete.length > 0) {
      const { error } = await supabase.from("video_scenario_steps" as any).delete().in("id", toDelete);
      if (error) {
        setSaving(false);
        toast.error("Suppression échouée");
        return;
      }
    }

    const boardRes = await supabase
      .from("video_storyboards" as any)
      .update({
        name: board.name,
        scenario_type: board.scenario_type,
        format: board.format,
        business_id: biz?.id ?? null,
        preview_scale: board.preview_scale,
        max_duration_sec: board.max_duration_sec,
        effects: board.effects ?? null,
        global_media: globalMediaItemsRef.current as any,
        encode: normalizeEncode(board.encode) as any,
      } as any)
      .eq("id", board.id);

    const rows = sections.map((s, i) => ({
      id: s.id,
      storyboard_id: board.id,
      mode: "corporate",
      scene_key: s.scene_key || `${s.step_type}_${i + 1}`,
      step_type: s.step_type,
      label: s.label,
      position: (i + 1) * 10,
      duration_sec: Math.max(MIN_SECTION_SEC, Math.min(MAX_SECTION_SEC, Number(s.duration_sec) || MIN_SECTION_SEC)),
      enabled: s.enabled,
      config: s.config ?? {},
    }));
    const stepsRes = rows.length
      ? await supabase.from("video_scenario_steps" as any).upsert(rows as any, { onConflict: "id" })
      : { error: null };

    setSaving(false);
    if (boardRes.error || stepsRes.error) {
      toast.error(`Enregistrement échoué : ${(boardRes.error ?? stepsRes.error)?.message}`);
      return;
    }
    toast.success("Storyboard enregistré");
    setDirty(false);
    await loadBoards();
    await loadBoard(board.id);
  };

  /**
   * Rendu : le storyboard enregistré est la source unique. On envoie les
   * sections telles quelles au moteur Remotion générique (`storyboard`),
   * jamais un template dédié à un scénario.
   */
  const render = async (variants?: EncodeOptions[]) => {
    if (!board) return;
    if (dirty) {
      toast.error("Enregistre le storyboard avant de lancer le rendu");
      return;
    }
    if (sections.length === 0) {
      toast.error("Ajoute au moins une section");
      return;
    }
    if (overflow) {
      toast.error(`Durée totale ${mmss(totals.total)} > plafond ${mmss(maxTotal)}`);
      return;
    }
    setRendering(true);
    // Contexte fiche : logo, photos et vidéo interne servent de repli aux
    // scènes hook / photos / video / outro (les URLs saisies restent prioritaires).
    let logoUrl: string | null = null;
    let photos: string[] = [];
    let videoUrl: string | null = null;
    let hookFr: string | null = null;
    let city: string | null = null;
    if (biz?.id) {
      const { data } = await supabase
        .from("businesses")
        .select("logo_url, images, hook_fr, city")
        .eq("id", biz.id)
        .maybeSingle();
      const row = (data ?? null) as { logo_url?: string | null; images?: string[] | null; hook_fr?: string | null; city?: string | null } | null;
      logoUrl = row?.logo_url ?? null;
      photos = (row?.images ?? []).filter((u): u is string => typeof u === "string" && !!u.trim()).slice(0, 8);
      hookFr = row?.hook_fr ?? null;
      city = row?.city ?? null;
      const { data: docs } = await supabase
        .from("business_documents")
        .select("url, sort_order, type")
        .eq("business_id", biz.id)
        .eq("type", "video")
        .order("sort_order", { ascending: true });
      videoUrl = ((docs ?? []) as { url?: string | null }[]).find((d) => !!d.url)?.url ?? null;
    }
    const { data: auth } = await supabase.auth.getUser();
    const encodeVariants = variants && variants.length > 0 ? variants : [normalizeEncode(board.encode)];
    const multi = encodeVariants.length > 1;
    const buildPayload = (enc: EncodeOptions) => ({
      user_id: auth.user?.id ?? null,
      business_id: biz?.id ?? null,
      title: `Storyboard — ${board.name}${multi ? ` · ${enc.preset} (CRF ${enc.crf})` : ""}`,
      prompt: board.name,
      status: "pending",
      duration_sec: Math.round(totals.total),
      template_id: board.format === "landscape" ? "storyboard-landscape" : "storyboard",
      template_props: {
        kind: "storyboard",
        storyboardId: board.id,
        storyboardName: board.name,
        scenario_type: board.scenario_type,
        format: board.format,
        previewScale: board.preview_scale,
        logoUrl,
        businessName: biz?.name ?? null,
        city,
        hook: hookFr,
        photos,
        videoUrl,
        global_media: globalMediaItemsRef.current as any,
        // Grade global : rien n'est transmis si aucun effet n'est activé.
        ...(hasAnyMontageEffect(board.effects) || hasAnySimpleEffect(board.effects)
          ? { effects: board.effects }
          : {}),
        encode: enc,
        sections: sections
          .filter((s) => s.enabled)
          .map((s) => ({
            step_type: s.step_type,
            label: s.label,
            duration_sec: Math.max(
              MIN_SECTION_SEC,
              Math.min(MAX_SECTION_SEC, Number(s.duration_sec) || MIN_SECTION_SEC),
            ),
            config: s.config ?? {},
          })),
      },
    });
    const { error } = await supabase
      .from("video_jobs")
      .insert(encodeVariants.map((enc) => buildPayload(enc)) as any);
    if (error) {
      setRendering(false);
      toast.error(`Création du job impossible : ${error.message}`);
      return;
    }
    const { error: wfError } = await supabase.functions.invoke("trigger-render-workflow", { body: {} });
    setRendering(false);
    if (wfError) toast.warning(`${multi ? "Jobs créés" : "Job créé"}, mais le déclenchement GitHub a échoué.`);
    else
      toast.success(
        multi
          ? `${encodeVariants.length} jobs créés : un rendu par niveau de compression (voir « Rendus des montages »).`
          : "Job créé : rendu lancé (voir « Rendus du storyboard » ci-dessous).",
      );
    loadJobs();
  };

  // Résumé des paramètres de montage affiché dans la barre de commande.
  const usedTypes = Array.from(
    new Set(sections.filter((s) => s.enabled).map((s) => typeLabel(s.step_type))),
  );
  const motionFlags = Array.from(
    new Set(
      sections.flatMap((s) =>
        Object.entries(s.config ?? {})
          .filter(([, v]) => v === true)
          .map(([k]) => k),
      ),
    ),
  );

  return (
    <div className="space-y-4 form-legible">
      {/* ---------- Barre de commande permanente ---------- */}
      <div className="sticky top-[72px] z-30 rounded-lg border bg-background/95 backdrop-blur p-3 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Clapperboard className="h-5 w-5 text-black shrink-0" />
          <select
            value={legacyMode ? `legacy:${legacyMode}` : currentId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("legacy:")) {
                setLegacyMode(v.slice(7) as "business" | "corporate");
              } else {
                setLegacyMode(null);
                setCurrentId(v || null);
              }
            }}
            className="h-9 min-w-64 rounded-md border bg-background px-2 text-xs"
            aria-label="Montage"
          >
            <option value="">— Choisir un montage —</option>
            <optgroup label="Montages manuels (duplicables)">
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.format === "landscape" ? "16:9" : "9:16"} · {frDate(b.created_at)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Scénarios automatiques (Studio Vidéo IA)">
              {LEGACY_MODES.map((m) => (
                <option key={m.value} value={`legacy:${m.value}`}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLegacyMode(null);
              createBoard();
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
          {!legacyMode && board && (
            <Button size="sm" variant="outline" onClick={duplicateBoard}>
              <Copy className="h-4 w-4 mr-1" /> Dupliquer
            </Button>
          )}
          {!legacyMode && board && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={deleteBoard}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!legacyMode && board && dirty && (
              <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                </span>
                Modifications non enregistrées
              </Badge>
            )}
            {!legacyMode && board && overflow && (
              <Badge variant="destructive" className="text-xs">
                Durée hors plafond
              </Badge>
            )}
            {!legacyMode && board && (
              <>
                <Button size="sm" onClick={save} disabled={!dirty || saving}>
                  <Save className="h-4 w-4 mr-1" /> Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => render()}
                  disabled={rendering || saving || dirty || sections.length === 0 || overflow}
                  title={dirty ? "Enregistre d'abord le storyboard" : undefined}
                >
                  <Rocket className="h-4 w-4 mr-1" />
                  {rendering
                    ? "Lancement…"
                    : `Rendre (${board.preview_scale === 1 ? "1080p" : `${Math.round(board.preview_scale * 100)}%`})`}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGuideOpen(true)}
              title="Guide du storyboard"
              aria-label="Guide du storyboard"
            >
              <Info className="h-4 w-4 mr-1" /> Guide
            </Button>
          </div>
        </div>

        {!legacyMode && board && (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-black">Format</span>{" "}
                {board.format === "landscape" ? "Paysage 1920×1080" : "Portrait 1080×1920"}
              </span>
              <span>
                <span className="font-semibold text-black">Étapes</span> {sections.length} (
                {sections.filter((s) => s.enabled).length} actives / {MAX_SECTIONS})
              </span>
              <span className={overflow ? "font-semibold text-destructive" : "font-semibold text-black"}>
                {mmss(totals.total)} / {mmss(maxTotal)}
              </span>
              <span>
                <span className="font-semibold text-black">Modifié</span> {frDate(board.updated_at)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${overflow ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (totals.total / maxTotal) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------- Scénarios automatiques ---------- */}
      {legacyMode && (
        <>
          <VideoScenarioConfigPanel initialMode={legacyMode} hideModeSwitch />
          <Card>
            <CardHeader>
              <CardTitle className="text-black text-base flex items-center gap-2">
                <Rocket className="h-4 w-4" /> Rendu du scénario automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ce montage utilise le moteur <strong>Studio Vidéo IA</strong> (
                <code>{legacyMode === "business" ? "business-showcase" : "corporate-vertical"}</code>) : le
                déroulé configuré ci-dessus est appliqué, mais le rendu a besoin d'un prompt et d'un
                établissement. On lance donc le rendu depuis Studio Vidéo, et les jobs produits
                apparaissent dans l'onglet « Rendus ».
              </p>
              <Button size="sm" variant="secondary" asChild>
                <a href="/studio-video" target="_blank" rel="noreferrer">
                  <Rocket className="h-4 w-4 mr-1" /> Lancer un rendu dans Studio Vidéo IA
                </a>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* ---------- Montage manuel : 3 onglets ---------- */}
      <div className={legacyMode ? "hidden" : ""}>
        {!board && !loading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Aucun montage sélectionné : choisis-en un dans la liste ci-dessus, ou crée le premier avec
                « Nouveau ».
              </p>
            </CardContent>
          </Card>
        )}

        {board && (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="montage" className="gap-2">
                <Film className="h-4 w-4" /> Montage
              </TabsTrigger>
              <TabsTrigger value="effets" className="gap-2">
                <LayoutTemplate className="h-4 w-4" /> Effets
              </TabsTrigger>
              <TabsTrigger value="rendus" className="gap-2">
                <Rocket className="h-4 w-4" /> Rendus
                {jobs.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {jobs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ===== Onglet Montage ===== */}
            <TabsContent value="montage" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-black text-base">Réglages du montage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Nom
                      <Input
                        value={board.name}
                        onChange={(e) => patchBoard({ name: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Type de scénario
                      <select
                        value={board.scenario_type}
                        onChange={(e) => patchBoard({ scenario_type: e.target.value as Storyboard["scenario_type"] })}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="corporate_long">Corporate long</option>
                        <option value="promo_business">Promo business</option>
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Format
                      <select
                        value={board.format}
                        onChange={(e) => patchBoard({ format: e.target.value as Storyboard["format"] })}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="landscape">Paysage 1920×1080</option>
                        <option value="portrait">Portrait 1080×1920</option>
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Aperçu (échelle de rendu)
                      <select
                        value={String(board.preview_scale)}
                        onChange={(e) => patchBoard({ preview_scale: Number(e.target.value) })}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="0.5">0,5× — aperçu rapide (540p)</option>
                        <option value="0.667">0,667× — 720p</option>
                        <option value="1">1× — sortie finale 1080p</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3">
                    <label className="text-xs text-muted-foreground grid gap-1">
                      Établissement associé — nom, slug (optionnel)
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Chaabi Payment"
                        className="h-9 text-xs"
                      />
                    </label>
                    {results.length > 0 && (
                      <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                        {results.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setBiz(r);
                              setQuery(r.name);
                              setResults([]);
                              setDirty(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                          >
                            <span className="text-black font-medium">{r.name}</span>
                            <span className="text-muted-foreground">{r.city}</span>
                            <span className="text-muted-foreground font-mono ml-auto">{r.slug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {usedTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {usedTypes.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-black text-base">Médias du montage (affectation globale)</CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Les vidéos alimentent les étapes « Vidéo », la sélection complète alimente les étapes
                      « Photos plein écran » et (si activé) les fonds média. Chaque étape reste modifiable
                      individuellement. Les bornes Start / End sont enregistrées avec le montage.
                    </p>
                  </div>
                  {!legacyMode && board && (
                    <Button
                      size="sm"
                      onClick={save}
                      disabled={!dirty || saving}
                      className="shrink-0"
                      title={dirty ? "Enregistrer les modifications du montage" : "Aucune modification à enregistrer"}
                    >
                      <Save className="h-4 w-4 mr-1" /> Enregistrer
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <VideoMediaPickerDialog
                      businessId={biz?.id ?? board.business_id}
                      format={board.format}
                      allow="all"
                      multiple
                      max={30}
                      label={globalMedia.length ? `Modifier les médias (${globalMedia.length})` : "Choisir les médias"}
                      value={globalMedia}
                      onChange={(urls) => {
                        const next = urls.slice(0, 30).map((url) => {
                          const prev = globalMediaItems.find((m) => m.url === url);
                          return { url, start: prev?.start, end: prev?.end };
                        });
                        globalMediaItemsRef.current = next;
                        setGlobalMediaItems(next);
                        setDirty(true);
                        applyGlobalMedia(next, globalIncludeBg);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={globalMedia.length === 0 || sections.length === 0}
                      onClick={() => {
                        applyGlobalMedia(globalMediaItems, globalIncludeBg);
                        toast.success("Médias appliqués à toutes les étapes");
                      }}
                    >
                      Appliquer à toutes les étapes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={sections.length === 0}
                      onClick={clearAllMedia}
                    >
                      Retirer les médias partout
                    </Button>
                  </div>
                  <StoryboardGlobalMediaGrid
                    items={globalMediaItems}
                    format={board.format}
                    onChange={(next) => {
                      globalMediaItemsRef.current = next;
                      setGlobalMediaItems(next);
                      setDirty(true);
                      applyGlobalMedia(next, globalIncludeBg);
                    }}
                  />
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Switch
                      checked={globalIncludeBg}
                      onCheckedChange={(v) => {
                        setGlobalIncludeBg(v);
                        setDirty(true);
                        applyGlobalMedia(globalMediaItems, v);
                      }}
                    />
                    Inclure les fonds de scène (accroche, texte, compteur, outro…)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Activé : les médias ci-dessus sont aussi utilisés en <strong>arrière-plan</strong> des étapes
                    non-média (accroche, texte, compteur, carte, outro…). Désactivé : ces étapes gardent leur
                    fond d'origine (couleur/dégradé ou média propre) et seules les étapes « Vidéo » et
                    « Photos plein écran » reçoivent les médias.
                  </p>
                  {requiredVideoDuration.clips > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                      <p className="text-xs font-semibold text-destructive">
                        Durée nécessaire pour monter les {requiredVideoDuration.clips} vidéos (bornes Start/End
                        appliquées)
                      </p>
                      <p className="text-3xl font-extrabold text-destructive leading-tight">
                        {Math.round(requiredVideoDuration.total)} s
                        <span className="text-base font-bold ml-2">
                          ({Math.floor(requiredVideoDuration.total / 60)} min{" "}
                          {String(Math.round(requiredVideoDuration.total % 60)).padStart(2, "0")} s)
                        </span>
                      </p>
                      {requiredVideoDuration.unknown > 0 && (
                        <p className="text-[11px] text-destructive/80">
                          {requiredVideoDuration.unknown} vidéo(s) sans borne End et durée non encore lue :
                          non comptées.
                        </p>
                      )}
                      <p className="text-[11px] text-destructive/80">
                        Règle le total des étapes « Vidéo » sur cette valeur, sinon le montage coupe (durée
                        d'étape trop courte) ou boucle/gèle (durée trop longue).
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-black text-base">
                    Étapes du montage ({sections.length})
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as StepType)}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => currentId && loadBoard(currentId)}
                      disabled={loading || saving}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Recharger
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Ligne de temps : chaque bloc = une étape, largeur proportionnelle à sa durée */}
                  {sections.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex h-9 w-full gap-0.5 overflow-hidden rounded-md border bg-muted/40">
                        {sections.map((s, i) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setExpanded((prev) => (prev === s.id ? null : s.id))}
                            title={`${i + 1}. ${s.label || typeLabel(s.step_type)} — ${s.duration_sec}s`}
                            style={{ flexGrow: Math.max(1, s.duration_sec), flexBasis: 0 }}
                            className={`min-w-0 px-1 text-[10px] font-semibold truncate transition-colors ${
                              expanded === s.id
                                ? "bg-primary text-primary-foreground"
                                : s.enabled
                                  ? "bg-primary/25 text-black hover:bg-primary/40"
                                  : "bg-muted text-muted-foreground line-through hover:bg-muted/70"
                            }`}
                          >
                            {i + 1}. {s.label || typeLabel(s.step_type)}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Clique un bloc pour éditer l'étape · largeur = durée · barré = étape désactivée.
                      </p>
                    </div>
                  )}

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune étape : ajoute une accroche pour démarrer.
                    </p>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="divide-y rounded-lg border">
                          {sections.map((s, i) => (
                            <SortableSection
                              key={s.id}
                              section={s}
                              index={i}
                              startSec={totals.starts[s.id] ?? 0}
                              expanded={expanded === s.id}
                              onToggle={() => setExpanded((prev) => (prev === s.id ? null : s.id))}
                              patch={(values) => patchSection(s.id, values)}
                              remove={() => removeSection(s.id)}
                              businessId={biz?.id ?? board.business_id}
                              format={board.format}
                              dropGlobal={(urls) => {
                                setGlobalMediaItems((prev) => {
                                  const next = prev.filter((m) => !urls.includes(m.url));
                                  globalMediaItemsRef.current = next;
                                  return next;
                                });
                                setDirty(true);
                              }}

                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Onglet Effets ===== */}
            <TabsContent value="effets" className="space-y-4">
              <MontageEffectsBlock
                value={board.effects ?? null}
                onChange={(v) => {
                  setBoard((prev) => (prev ? { ...prev, effects: v } : prev));
                  setDirty(true);
                }}
              />
              <SimpleEffectsBlock
                value={board.effects ?? null}
                onChange={(v) => {
                  setBoard((prev) => (prev ? { ...prev, effects: v } : prev));
                  setDirty(true);
                }}
              />
              <VideoEncodeOptionsBlock
                value={normalizeEncode(board.encode)}
                onChange={(v) => {
                  setBoard((prev) => (prev ? { ...prev, encode: v } : prev));
                  setDirty(true);
                }}
                showScale={false}
                onGenerateAll={() =>
                  render(
                    ENCODE_PRESETS.map((p) => ({
                      ...normalizeEncode(board.encode),
                      preset: p.id,
                      crf: p.crf,
                    })),
                  )
                }
                generatingAll={rendering}
              />
              <p className="text-[11px] text-muted-foreground">
                Effets actifs détectés dans les étapes : {motionFlags.length > 0 ? motionFlags.join(", ") : "aucun"}.
              </p>
            </TabsContent>

            {/* ===== Onglet Rendus ===== */}
            <TabsContent value="rendus">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-black text-base">Rendus des montages</CardTitle>
                  <Button size="sm" variant="outline" onClick={loadJobs}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Rafraîchir
                  </Button>
                </CardHeader>
                <CardContent>
                  {jobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun rendu de montage pour le moment.</p>
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
                              <span className="text-[11px] text-destructive ml-auto max-w-md truncate">
                                {j.error_message}
                              </span>
                            )}
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
            </TabsContent>
          </Tabs>
        )}

        {/* ---------- Notes de bas de page (guide) ---------- */}
        <StoryboardGuide />
      </div>

      {/* ---------- Guide en panneau latéral ---------- */}
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-black">Guide du storyboard</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="guide" className="mt-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="guide">Guide du storyboard</TabsTrigger>
              <TabsTrigger value="note">Note interne</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="guide" className="mt-4">
              <StoryboardGuide />
            </TabsContent>
            <TabsContent value="note" className="mt-4">
              {/* Slot recevant la note interne du scénario (tous modes) depuis VideoScenarioConfigPanel. */}
              <div id="scenario-note-slot" />
            </TabsContent>
            <TabsContent value="notes" className="mt-4">
              <StoryboardStepNotesList />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );

};

export default VideoStoryboardPanel;
