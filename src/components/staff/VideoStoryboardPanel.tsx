import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
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
  { value: "photos", label: "Photos plein écran", hint: "1 à 4 images de la fiche." },
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
}: {
  section: Section;
  patch: (values: Partial<Section>) => void;
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

  switch (section.step_type) {
    case "hook":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("title", "Accroche", "Le Maroc existe déjà.")}
          {text("subtitle", "Sous-titre / ville", "Marrakech")}
        </div>
      );
    case "video":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("assetUrl", "URL de la vidéo (asset 1WM)", "laisser vide = vidéo interne de la fiche")}
          <label className="text-xs text-muted-foreground grid gap-1">
            Son de la vidéo
            <span className="flex items-center gap-2 h-8">
              <Switch checked={!!cfg.sound} onCheckedChange={(v) => set("sound", v)} />
              <span className="text-[11px]">{cfg.sound ? "activé" : "muet"}</span>
            </span>
          </label>
        </div>
      );
    case "photos":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground grid gap-1">
            Nombre de photos (1 à 4)
            <Input
              type="number"
              min={1}
              max={4}
              value={cfg.count ?? 4}
              onChange={(e) => set("count", Math.max(1, Math.min(4, Number(e.target.value) || 1)))}
              className="h-8 text-xs"
            />
          </label>
          {text("kenBurns", "Mouvement (zoom_in, zoom_out, none)", "zoom_in")}
        </div>
      );
    case "text_overlay":
      return (
        <label className="text-xs text-muted-foreground grid gap-1">
          Texte (500 caractères max, balises H acceptées)
          <Textarea
            value={cfg.html ?? ""}
            onChange={(e) => set("html", e.target.value.slice(0, 500))}
            rows={4}
            className="text-xs"
          />
          <span className="text-[11px]">{String(cfg.html ?? "").length}/500</span>
        </label>
      );
    case "counter":
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-muted-foreground grid gap-1">
            Valeur finale
            <Input
              type="number"
              value={cfg.value ?? 0}
              onChange={(e) => set("value", Number(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </label>
          {text("prefix", "Préfixe", "+")}
          {text("caption", "Légende", "établissements référencés")}
        </div>
      );
    case "map_reveal":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("from", "Depuis", "Maroc")}
          {text("to", "Vers", "Marrakech")}
        </div>
      );
    case "split_screen":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("mediaSide", "Côté du média (left / right)", "left")}
          {text("title", "Titre", "Une infrastructure produit")}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground grid gap-1">
              Texte
              <Textarea
                value={cfg.body ?? ""}
                onChange={(e) => set("body", e.target.value.slice(0, 500))}
                rows={3}
                className="text-xs"
              />
            </label>
          </div>
        </div>
      );
    case "logo_merge":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("partnerLogoUrl", "Logo partenaire (SVG/PNG transparent)", "https://…")}
          {text("caption", "Signature", "1WM × Partenaire")}
          <p className="md:col-span-2 text-[11px] text-muted-foreground">
            Prochaine étape technique : chemin d'upload dédié et scopé aux logos transparents (pas d'upload média
            généraliste).
          </p>
        </div>
      );
    case "outro":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {text("tagline", "Tagline", "L'art de vivre marocain.")}
          {text("city", "Ville", "Marrakech")}
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
}: {
  section: Section;
  index: number;
  startSec: number;
  expanded: boolean;
  onToggle: () => void;
  patch: (values: Partial<Section>) => void;
  remove: () => void;
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
          <ConfigFields section={section} patch={patch} />
        </div>
      )}
    </div>
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

  useEffect(() => {
    loadBoards().finally(() => setLoading(false));
  }, [loadBoards]);

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
    let logoUrl: string | null = null;
    if (biz?.id) {
      const { data } = await supabase
        .from("businesses")
        .select("logo_url")
        .eq("id", biz.id)
        .maybeSingle();
      logoUrl = ((data as { logo_url?: string | null } | null)?.logo_url) ?? null;
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
    else toast.success("Job créé : rendu lancé (onglet Dernières vidéos).");
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
    </div>
  );
};

export default VideoStoryboardPanel;
