import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { VideoMediaPickerDialog } from "@/components/staff/VideoMediaPickerDialog";

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
 * Storyboard = source de vérité unique d'un montage manuel (jusqu'à 180 s).
 * Le renderer Remotion ne contient aucune logique propre à un scénario donné :
 * chaque section porte un `step_type` générique et sa `config` JSONB.
 */

export const MAX_TOTAL_SEC = 180;
export const MAX_SECTIONS = 15;
export const MIN_SECTION_SEC = 3;
export const MAX_SECTION_SEC = 30;

export type StepType =
  | "hook"
  | "video"
  | "photos"
  | "text_overlay"
  | "counter"
  | "map_reveal"
  | "split_screen"
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
};

type StoryboardJob = {
  id: string;
  title: string | null;
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  duration_sec: number | null;
  template_id: string | null;
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
}: {
  section: Section;
  patch: (values: Partial<Section>) => void;
  businessId: string | null;
  format: "portrait" | "landscape";
}) => {
  const cfg = section.config ?? {};
  const set = (key: string, value: any) => patch({ config: { ...cfg, [key]: value } });

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
            onChange={(urls) =>
              patch({
                config: {
                  ...cfg,
                  bgMode: urls.length ? "medias" : "none",
                  bgMedia: urls.slice(0, 30),
                  bgImages: [],
                  bgVideoUrl: "",
                },
              })
            }
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
              onChange={(urls) =>
                patch({ config: { ...cfg, assetUrls: urls.slice(0, 30), assetUrl: "" } })
              }
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
          {text("kenBurns", "Mouvement des images (zoom_in, zoom_out, none)", "zoom_in")}
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
              onChange={(urls) => patch({ config: { ...cfg, media: urls.slice(0, 30), images: [] } })}
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
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Durée
            <Input
              type="number"
              min={MIN_SECTION_SEC}
              max={MAX_SECTION_SEC}
              value={section.duration_sec}
              onChange={(e) =>
                patch({
                  duration_sec: Math.max(
                    MIN_SECTION_SEC,
                    Math.min(MAX_SECTION_SEC, Number(e.target.value) || MIN_SECTION_SEC),
                  ),
                })
              }
              className="w-16 h-8 text-xs"
            />
            s
          </label>
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
        <div className="mt-3 ml-9 grid gap-3 max-w-4xl">
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
          <ConfigFields section={section} patch={patch} businessId={businessId} format={format} />
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
      body: "Carrousel de 1 à 30 images avec mouvement Ken Burns (zoom_in, zoom_out, none). Les images choisies dans le sélecteur sont prioritaires ; sinon le moteur utilise les images de la fiche.",
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
                Fond média (Accroche, Texte surimpression, Compteur, Outro, Carte, Écran partagé) : images
                <strong> OU </strong> vidéo, jamais les deux. Jusqu'à 30 images en fondu enchaîné, durée partagée à
                parts égales ; vidéo muette plein cadre. Un voile sombre garantit la lisibilité du texte.
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

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <h4 className="text-sm font-semibold text-destructive">Erreurs fréquentes à éviter</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mt-1">
            <li>Oublier d'enregistrer avant de cliquer sur « Rendre ».</li>
            <li>Dépasser {MAX_TOTAL_SEC} s au total : le rendu est bloqué.</li>
            <li>Mettre une section à moins de {MIN_SECTION_SEC} s ou plus de {MAX_SECTION_SEC} s.</li>
            <li>Saisir une URL photo/vidéo inaccessible : le moteur passera au repli suivant, ou à une image noire.</li>
            <li>Activer le son sur plusieurs sections vidéo superposées : les pistes audio se superposent.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const VideoStoryboardPanel = () => {
  const [boards, setBoards] = useState<Storyboard[]>([]);
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
  const [dirty, setDirty] = useState(false);


  // Autocomplete établissement (même mécanique que Promo business).
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Biz[]>([]);
  const [biz, setBiz] = useState<Biz | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const loadBoards = useCallback(async () => {
    const { data, error } = await supabase
      .from("video_storyboards" as any)
      .select("id, name, scenario_type, format, business_id, preview_scale, max_duration_sec")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Chargement des storyboards impossible");
      return;
    }
    const list = (data ?? []) as unknown as Storyboard[];
    setBoards(list);
    setCurrentId((prev) => prev ?? list[0]?.id ?? null);
  }, []);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("video_jobs")
      .select("id, title, status, output_url, error_message, created_at, duration_sec, template_id")
      .like("template_id", "storyboard%")
      .order("created_at", { ascending: false })
      .limit(12);
    setJobs((data ?? []) as StoryboardJob[]);
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
        .select("id, name, scenario_type, format, business_id, preview_scale, max_duration_sec")
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
  const render = async () => {
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
    const payload = {
      user_id: auth.user?.id ?? null,
      business_id: biz?.id ?? null,
      title: `Storyboard — ${board.name}`,
      prompt: board.name,
      status: "pending",
      duration_sec: Math.round(totals.total),
      template_id: board.format === "landscape" ? "storyboard-landscape" : "storyboard",
      template_props: {
        kind: "storyboard",
        storyboardId: board.id,
        format: board.format,
        previewScale: board.preview_scale,
        logoUrl,
        businessName: biz?.name ?? null,
        city,
        hook: hookFr,
        photos,
        videoUrl,
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
    };
    const { error } = await supabase.from("video_jobs").insert(payload as any);
    if (error) {
      setRendering(false);
      toast.error(`Création du job impossible : ${error.message}`);
      return;
    }
    const { error: wfError } = await supabase.functions.invoke("trigger-render-workflow", { body: {} });
    setRendering(false);
    if (wfError) toast.warning("Job créé, mais le déclenchement GitHub a échoué.");
    else toast.success("Job créé : rendu lancé (voir « Rendus du storyboard » ci-dessous).");
    loadJobs();
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Clapperboard className="h-5 w-5" /> Storyboard (montage manuel, 180 s max)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Le storyboard est la source de vérité du film : chaque section porte un type générique et sa
            configuration. Un template n'est qu'un preset de storyboard, pas un moteur de rendu.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted-foreground grid gap-1">
              Storyboard
              <select
                value={currentId ?? ""}
                onChange={(e) => setCurrentId(e.target.value || null)}
                className="h-9 min-w-56 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">—</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" variant="outline" onClick={createBoard}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau
            </Button>
            {board && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={deleteBoard}>
                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
              </Button>
            )}
          </div>

          {board && (
            <>
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

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {sections.filter((s) => s.enabled).length} section(s) active(s) · plafond {MAX_SECTIONS}
                  </span>
                  <span className={overflow ? "font-semibold text-destructive" : "font-semibold text-black"}>
                    {mmss(totals.total)} / {mmss(maxTotal)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${overflow ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (totals.total / maxTotal) * 100)}%` }}
                  />
                </div>
              </div>

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
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une section
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => currentId && loadBoard(currentId)}
                  disabled={loading || saving}
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Recharger
                </Button>
                <Button size="sm" onClick={save} disabled={!dirty || saving}>
                  <Save className="h-4 w-4 mr-1" /> Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={render}
                  disabled={rendering || saving || dirty || sections.length === 0 || overflow}
                  title={dirty ? "Enregistre d'abord le storyboard" : undefined}
                >
                  <Rocket className="h-4 w-4 mr-1" />
                  {rendering ? "Lancement…" : `Rendre (${board.preview_scale === 1 ? "1080p" : `${Math.round(board.preview_scale * 100)}%`})`}
                </Button>

              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune section : ajoute une accroche pour démarrer.</p>
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
                        />

                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          )}

          {!board && !loading && (
            <p className="text-sm text-muted-foreground">
              Aucun storyboard : crée le premier avec « Nouveau ».
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-black text-base">Rendus du storyboard</CardTitle>
          <Button size="sm" variant="outline" onClick={loadJobs}>
            <RotateCcw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendu storyboard pour le moment.</p>
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
                  {j.duration_sec != null && (
                    <span className="text-[11px] text-muted-foreground">{j.duration_sec}s</span>
                  )}
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

      <StoryboardGuide />

    </div>
  );
};

export default VideoStoryboardPanel;
