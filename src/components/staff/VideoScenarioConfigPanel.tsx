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
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
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
import RichTextEditor from "./RichTextEditor";

export type VideoScenarioMode = "business" | "corporate" | "explainer";

export type VideoScenarioStep = {
  id: string;
  mode: VideoScenarioMode;
  scene_key: string;
  label: string | null;
  position: number;
  duration_sec: number;
  enabled: boolean;
  kicker: string | null;
  title: string | null;
  body: string | null;
  key_message: string | null;
  business_id: string | null;
  /** Widgets embarqués sélectionnés pour cette étape. */
  widget_keys: string[];
  /** Étape créée localement, pas encore en base. */
  _new?: boolean;
};

type ScenarioConfig = {
  mode: VideoScenarioMode;
  business_id: string | null;
  format_key: string;
  width: number;
  height: number;
  fps: number;
  internal_note: string | null;
};

const MAX_NOTE_LENGTH = 10000;

type BusinessLite = { id: string; name: string; slug: string | null; city: string | null };

const MODES: Array<{ value: VideoScenarioMode; label: string }> = [
  { value: "business", label: "Établissement" },
  { value: "corporate", label: "Corporate" },
  { value: "explainer", label: "Explicative (affiliés)" },
];




/** Scènes disponibles pour la vidéo explicative (composition Remotion « explainer-affiliates »). */
const EXPLAINER_TEMPLATES: Array<{ key: string; label: string }> = [
  { key: "exp_fiche", label: "Fiche 1WM" },
  { key: "exp_profil", label: "Profil digital enrichi" },
  { key: "exp_geo", label: "Géolocalisation & Cartes" },
  { key: "exp_widgets", label: "Widgets embarqués" },
  { key: "exp_assistant", label: "Assistant IA" },
  { key: "exp_seo", label: "Visibilité SEO + GEO" },
  { key: "exp_studio", label: "Studio Vidéo IA" },
  { key: "exp_push", label: "Notifications push" },
  { key: "exp_automation", label: "Automatisation" },
  { key: "exp_backoffice", label: "Back-office affilié" },
];

/** Widgets embarqués sélectionnables sur une étape (mêmes clés que Présence en ligne / Publiés). */
const WIDGET_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "ai", label: "Assistant IA" },
  { key: "nearby", label: "Adresses à proximité (Map & App)" },
  { key: "reviews", label: "Avis clients" },
  { key: "rate", label: "Laisser un avis" },
  { key: "weather", label: "Météo" },
  { key: "tides", label: "Marées" },
  { key: "fiche", label: "ID numérique (type Linktree)" },
  { key: "fiche1wm", label: "Widget Fiche 1WM" },
];

/** Étapes acceptant une sélection de widgets. */
const WIDGET_STEP_KEYS = new Set(["exp_widgets", "exp_fiche"]);


/**
 * Descriptif fonctionnel de chaque étape : ce qu'elle affiche, la condition
 * qui la fait entrer au montage (sinon elle est retirée automatiquement),
 * et ses spécificités de rendu.
 */
const STEP_DOCS: Record<string, { what: string; filter: string; notes?: string }> = {
  logo: {
    what: "Ouverture sur le logo de l'établissement, sur fond de marque.",
    filter: "Incluse seulement si « Ouvrir avec le logo » est cochée ET qu'un logo existe.",
    notes: "Le média du logo n'est pas réutilisé juste après (rotation des médias) pour éviter la répétition.",
  },
  welcome: {
    what: "Carte texte d'accueil (champ BIENVENUE des CTAs de Présence en ligne).",
    filter: "Incluse seulement si le texte BIENVENUE n'est pas vide.",
    notes: "Rich Text respecté (gras, puces). Texte auto-réduit pour tenir dans le cadre.",
  },
  name: {
    what: "Nom de l'établissement + identité (catégorie, ville/quartier).",
    filter: "Toujours présente.",
    notes: "Titre en Montserrat sur média plein cadre (rotation) ; badges catégorie/ville animés en entrée.",
  },
  popup: {
    what: "Visuel du popup promotionnel de la fiche, plein cadre.",
    filter: "Incluse seulement si « Popup » est cochée ET qu'une image de popup existe.",
    notes: "Image affichée sans recadrage agressif (proportions préservées) ; aucun texte ajouté par-dessus.",
  },
  proposition: {
    what: "Carte texte de proposition de valeur (champ PROPOSITION des CTAs).",
    filter: "Incluse seulement si le texte PROPOSITION n'est pas vide.",
    notes: "Rich Text respecté (gras, puces, retours ligne) ; mise à l'échelle automatique du texte ; média de fond par rotation ou média assigné.",
  },
  weather: {
    what: "Widget Météo animé sur la ville choisie dans le Studio.",
    filter: "Incluse seulement si l'étape est activée dans le Studio et qu'une ville est sélectionnée.",
    notes: "La durée définie ici pilote directement la durée du widget au montage (défaut 6s) ; rendu identique au widget embarqué (fond selon la couleur widget).",
  },
  tides: {
    what: "Widget Marées, Vents & Météo sur une ville côtière.",
    filter: "Ville côtière obligatoire (liste marées) + étape activée dans le Studio.",
    notes: "Durée pilotée par ce réglage (défaut 6s) ; variante affichée selon le filtre marées/vents/météo choisi dans le Studio.",
  },
  hook: {
    what: "Phrase d'accroche (Hook) sur média plein cadre.",
    filter: "Toujours proposée, mais ignorée si le Hook est vide (aucun repli sur la Description).",
    notes: "Une seule carte ; texte auto-réduit si long ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  ai_card: {
    what: "Carte IA : synthèse courte générée pour la vidéo.",
    filter: "Incluse seulement si une Carte IA a été générée/cochée dans le Studio.",
    notes: "Rich Text respecté (gras, puces, retours ligne) ; texte auto-réduit pour tenir dans le cadre ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  offer: {
    what: "Offre(s) promotionnelle(s) : titre, valeur (% ou montant), mention courte.",
    filter: "Incluse s'il y a au moins une offre sélectionnée.",
    notes: "Plusieurs offres = plusieurs cartes successives ; la durée est répartie par offre ; badge valeur en dégradé or, mention courte en pied de carte.",
  },
  highlight: {
    what: "Blocs highlights (icône/image + titre + texte + métrique).",
    filter: "Incluse s'il y a au moins un highlight rempli et sélectionné.",
    notes: "Une carte par highlight ; Rich Text respecté, texte long auto-réduit, puces sans retour ligne après le symbole ; média de fond par rotation ou média assigné.",
  },
  ai_text: {
    what: "Textes IA de l'onglet TXT IA de Présence en ligne (titre + corps).",
    filter: "Incluse si l'option « TXT IA » est cochée et qu'au moins un texte IA est sélectionné dans le Studio.",
    notes: "Une carte par texte (5s par défaut) ; Rich Text respecté ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  external_link: {
    what: "Mise en avant des liens externes / presse de la fiche.",
    filter: "Incluse si au moins un lien externe (documents backoffice, type lien externe) est sélectionné.",
    notes: "Une carte par lien (nom + domaine) ; logo/visuel du média utilisé en repli de fond ; n'utilise jamais les champs url 1 à url 6.",
  },
  media: {
    what: "Zone libre médias : photos et vidéos de l'établissement.",
    filter: "Incluse si des médias sont assignés à l'étape (ou « Ajouter média »).",
    notes: "Un plan par média ; les médias déjà utilisés ailleurs sont évités par rotation ; vidéos lues avec son coupé.",
  },
  reviews: {
    what: "Badge de note agrégée sur 20 + nombre total d'avis clients (moyenne pondérée des 9 plateformes : Google, Tripadvisor, Restaurant Guru, GetYourGuide, Viator, Avis Vérifiés, Trustpilot, Kayak, TourRadar).",
    filter: "Incluse si « Avis clients » est cochée ET qu'une note agrégée ou un nombre d'avis existe (seuil minimum d'avis requis).",
    notes: "Badge doré « note/20 » animé + compteur d'avis qui s'incrémente ; média de fond par rotation ou média assigné.",
  },
  google_review: {
    what: "Avis Google mis en avant : note Google, nombre d'avis Google et extrait de commentaire.",
    filter: "Incluse si une note/un avis Google exploitable est disponible sur la fiche.",
    notes: "Un extrait tronqué proprement en fin de phrase ; logo/mention source Google ; média de fond par rotation.",
  },
  tripadvisor: {
    what: "Avis Tripadvisor : note Tripadvisor, nombre d'avis et extrait éventuel.",
    filter: "Incluse si la fiche a une note et/ou un nombre d'avis Tripadvisor.",
    notes: "Même rendu que la carte Avis Google (mention source Tripadvisor) ; 3s par défaut ; média de fond par rotation.",
  },
  restaurant_guru: {
    what: "Avis Restaurant Guru : note et nombre d'avis Restaurant Guru.",
    filter: "Incluse si la fiche a une note et/ou un nombre d'avis Restaurant Guru.",
    notes: "Même rendu que la carte Avis Google (mention source Restaurant Guru) ; 3s par défaut ; média de fond par rotation.",
  },
  customer_review: {
    what: "Avis client One World Morocco (verbatim sélectionné dans Studio Vidéo IA).",
    filter: "Incluse si un avis client interne est sélectionné dans l'étape.",
    notes: "Citation + auteur + note ; l'extrait mis en avant est toujours une ou plusieurs phrases complètes issues de l'avis (tout fragment parasite est rejeté) ; média de fond par rotation.",
  },

  hours: {
    what: "Horaires d'ouverture de la semaine.",
    filter: "Incluse si « Horaires » est cochée ET que des horaires sont renseignés.",
    notes: "Grille 7 jours compactée, jours fermés grisés ; auto-réduction si beaucoup de créneaux.",
  },
  map: {
    what: "Localisation : carte, quartier, POI de proximité avec flèches et distances.",
    filter: "Incluse si « Localisation » est cochée ET latitude/longitude présentes.",
    notes: "Durée conseillée : 6s pour 1 POI, +1s par POI supplémentaire ; carte centrée sur l'établissement, flèche directionnelle et distance par POI.",
  },
  digital: {
    what: "Carte « ID numérique » (widget type Linktree) avec QR / lien de la fiche.",
    filter: "Incluse si « ID numérique » est cochée ET que la fiche a un slug.",
    notes: "QR code généré à partir de l'URL publique de la fiche ; média de fond par rotation ou média assigné.",
  },
  blog: {
    what: "Articles de blog liés à l'établissement (titre + visuel).",
    filter: "Incluse si « Articles blog » est cochée ET qu'au moins un article est lié.",
    notes: "Une carte par article (titre + image de couverture) ; durée répartie entre les articles.",
  },
  whatsapp: {
    what: "Invitation à contacter par WhatsApp avec le numéro affiché.",
    filter: "Incluse si « WhatsApp » est cochée ET qu'un numéro est renseigné.",
    notes: "Couleur WhatsApp (#25D366) et numéro formaté ; média de fond par rotation ou média assigné.",
  },
  cta: {
    what: "CTA final : installation de l'app / renvoi vers One World Morocco.",
    filter: "Incluse sauf si l'installation de l'app est désactivée.",
    notes: "Placée juste avant l'Outro au montage ; visuel d'établissement en fond ; durée minimale garantie pour éviter une fin noire.",
  },
  outro: {
    what: "Outro : clôture de marque, distincte du CTA final.",
    filter: "Même condition que le CTA final.",
    notes: "Toujours en tout dernier plan ; fond de marque (sans photo d'établissement), logo One World Morocco et signature oneworldmorocco.com.",
  },

  exp_fiche: {
    what: "Scène « Fiche 1WM » : capture réelle de la fiche de l'établissement lié sur One World Morocco.",
    filter: "Nécessite un établissement lié. Activée par défaut, en première position.",
    notes: "Widgets sélectionnés ci-dessous mis en avant dans la fiche capturée.",
  },
  exp_profil: {
    what: "Scène « Profil digital enrichi » : mosaïque des photos réelles de l'établissement lié, logo, note /20 et attributs de la fiche.",
    filter: "Nécessite un établissement lié avec au moins une photo.",
    notes: "Le corps de texte liste les attributs affichés, un par ligne (ou séparés par « | »).",
  },
  exp_geo: {
    what: "Scène « Géolocalisation & Cartes » : carte de l'établissement, quartier et points d'intérêt de proximité.",
    filter: "Nécessite un établissement lié géolocalisé (latitude/longitude).",
    notes: "Le corps de texte liste les arguments affichés, un par ligne.",
  },
  exp_widgets: {
    what: "Scène « Widgets embarqués » : captures réelles des widgets sélectionnés dans des cadres navigateur.",
    filter: "Toujours disponible. Les widgets capturés sont ceux cochés dans l'étape.",
    notes: "Le corps de texte liste les destinations d'intégration affichées à droite.",
  },
  exp_assistant: {
    what: "Scène « Assistant IA » : capture réelle de /embed/ask de l'établissement lié, déroulée par un scroll lent.",
    filter: "Nécessite un établissement lié.",
    notes: "Chaque ligne du corps de texte devient un argument (format « clé · légende »).",
  },
};

/** Sélecteur d'établissement : recherche serveur sur nom / slug / ville. */
const BusinessSelect = ({
  value,
  onChange,
  placeholder = "Aucun établissement lié",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<BusinessLite[]>([]);
  const [current, setCurrent] = useState<BusinessLite | null>(null);

  useEffect(() => {
    if (!value) {
      setCurrent(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("businesses")
      .select("id, name, slug, city")
      .eq("id", value)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCurrent((data as BusinessLite) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const q = term.trim();
      let query = supabase.from("businesses").select("id, name, slug, city").order("name").limit(30);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,city.ilike.%${q}%`);
      const { data } = await query;
      if (!cancelled) setRows((data ?? []) as BusinessLite[]);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, open]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 justify-start max-w-[260px] truncate"
          onClick={() => setOpen((v) => !v)}
        >
          <Search className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="truncate">{current ? current.name : placeholder}</span>
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-[320px] rounded-md border bg-background shadow-lg p-2">
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nom, slug ou ville…"
            className="h-8 text-xs mb-2"
          />
          <div className="max-h-64 overflow-auto">
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">Aucun résultat</p>
            ) : (
              rows.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs"
                  onClick={() => {
                    onChange(b.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{b.name}</span>
                  {b.city && <span className="text-muted-foreground"> · {b.city}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SortableStep = ({
  step,
  index,
  expanded,
  onToggle,
  patch,
  remove,
}: {
  step: VideoScenarioStep;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  patch: (values: Partial<VideoScenarioStep>) => void;
  remove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const doc = STEP_DOCS[step.scene_key];

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
          aria-label="Déplacer l'étape"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-6 text-xs font-bold tabular-nums text-muted-foreground">{index + 1}</span>
        <button type="button" className="flex items-center gap-2 text-left" onClick={onToggle}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-black">{step.label || step.scene_key}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{step.scene_key}</span>
          </span>
        </button>
        {step._new && (
          <Badge variant="outline" className="text-[10px]">
            nouvelle
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Durée
            <Input
              type="number"
              min={0}
              max={60}
              value={step.duration_sec}
              onChange={(e) => patch({ duration_sec: Number(e.target.value) })}
              className="w-16 h-8 text-xs"
            />
            s
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Actif
            <Switch checked={step.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          </label>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={remove}
            aria-label="Supprimer l'étape"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-9 grid gap-3 max-w-4xl">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted-foreground grid gap-1">
              Nom de l'étape (back-office)
              <Input
                value={step.label ?? ""}
                onChange={(e) => patch({ label: e.target.value })}
                className="h-8 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Sur-titre affiché
              <Input
                value={step.kicker ?? ""}
                onChange={(e) => patch({ kicker: e.target.value })}
                className="h-8 text-xs"
              />
            </label>
          </div>
          <label className="text-xs text-muted-foreground grid gap-1">
            Titre affiché
            <Input value={step.title ?? ""} onChange={(e) => patch({ title: e.target.value })} className="h-8 text-xs" />
          </label>
          <label className="text-xs text-muted-foreground grid gap-1">
            Texte / éléments listés (une ligne par élément, ou séparés par « | »)
            <Textarea
              value={step.body ?? ""}
              onChange={(e) => patch({ body: e.target.value })}
              rows={3}
              className="text-xs"
            />
          </label>
          <label className="text-xs text-muted-foreground grid gap-1">
            Message clé (bas d'écran)
            <Textarea
              value={step.key_message ?? ""}
              onChange={(e) => patch({ key_message: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </label>
          {WIDGET_STEP_KEYS.has(step.scene_key) && (
            <div className="grid gap-1.5 text-xs text-muted-foreground">
              <span>Widgets embarqués affichés dans cette scène (un ou plusieurs)</span>
              <div className="flex flex-wrap gap-1.5">
                {WIDGET_OPTIONS.map((w) => {
                  const active = (step.widget_keys ?? []).includes(w.key);
                  return (
                    <Button
                      key={w.key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="h-7 text-[11px]"
                      onClick={() =>
                        patch({
                          widget_keys: active
                            ? (step.widget_keys ?? []).filter((k) => k !== w.key)
                            : [...(step.widget_keys ?? []), w.key],
                        })
                      }
                    >
                      {w.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Établissement lié à cette étape
            <BusinessSelect
              value={step.business_id}
              onChange={(id) => patch({ business_id: id })}
              placeholder="Établissement global"
            />
          </div>
          {doc && (
            <div className="space-y-0.5 text-[11px] leading-snug text-muted-foreground border-t pt-2">
              <p className="text-black/80">{doc.what}</p>
              <p>
                <span className="font-semibold">Filtre :</span> {doc.filter}
              </p>
              {doc.notes && (
                <p>
                  <span className="font-semibold">Montage :</span> {doc.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VideoScenarioConfigPanel = () => {
  const [mode, setMode] = useState<VideoScenarioMode>("business");
  const [steps, setSteps] = useState<VideoScenarioStep[]>([]);
  const [config, setConfig] = useState<ScenarioConfig | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const [stepsRes, configRes] = await Promise.all([
      supabase
        .from("video_scenario_steps")
        .select("id, mode, scene_key, label, position, duration_sec, enabled, kicker, title, body, key_message, business_id, widget_keys")
        .eq("mode", mode)
        .order("position", { ascending: true }),
      supabase.from("video_scenario_configs").select("*").eq("mode", mode).maybeSingle(),
    ]);
    if (stepsRes.error) toast.error("Chargement impossible");
    // Étape « Menus » abandonnée : on ne l'affiche plus.
    setSteps(
      ((stepsRes.data ?? []) as VideoScenarioStep[])
        .filter((s) => s.scene_key !== "menu_doc")
        .map((s) => ({ ...s, widget_keys: s.widget_keys ?? [] })),
    );
    setConfig(
      (configRes.data as ScenarioConfig | null) ?? {
        mode,
        business_id: null,
        format_key: "landscape_1080",
        width: 1920,
        height: 1080,
        fps: 30,
        internal_note: null,
      },
    );
    setRemoved([]);
    setDirty(false);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, values: Partial<VideoScenarioStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    setDirty(true);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
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

  /** Ajout d'une scène du catalogue ou d'une étape manuelle (clé + nom libres). */
  const addStep = (manual?: { key: string; label: string }) => {
    const key = (manual?.key ?? newKey).trim();
    if (!key) {
      toast.error(manual ? "Renseigne une clé d'étape" : "Choisis une scène à ajouter");
      return;
    }
    if (steps.some((s) => s.scene_key === key)) {
      toast.error("Cette scène est déjà dans le scénario");
      return;
    }
    const template = EXPLAINER_TEMPLATES.find((t) => t.key === key);
    const id = crypto.randomUUID();
    setSteps((prev) => [
      ...prev,
      {
        id,
        mode,
        scene_key: key,
        label: manual?.label?.trim() || template?.label || key,
        position: (prev.length + 1) * 10,
        duration_sec: 8,
        enabled: true,
        kicker: manual?.label?.trim() || template?.label || null,
        title: null,
        body: null,
        key_message: null,
        // Nouvelle étape rattachée d'office à l'établissement global du mode.
        business_id: config?.business_id ?? null,
        widget_keys: [],
        _new: true,
      },
    ]);
    setExpanded(id);
    setNewKey("");
    setDirty(true);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setRemoved((prev) => (id.length === 36 ? [...prev, id] : prev));
    setDirty(true);
  };




  const save = async () => {
    if (!config) return;
    setSaving(true);

    // Les étapes supprimées sont retirées avant réécriture des positions.
    const toDelete = removed.filter((id) => !steps.some((s) => s.id === id));
    if (toDelete.length > 0) {
      const { error } = await supabase.from("video_scenario_steps").delete().in("id", toDelete);
      if (error) {
        setSaving(false);
        toast.error("Suppression échouée");
        return;
      }
    }

    const rows = steps.map((s, i) => ({
      id: s.id,
      mode: s.mode,
      scene_key: s.scene_key,
      label: s.label,
      position: (i + 1) * 10,
      duration_sec: Math.max(0, Math.min(60, Number(s.duration_sec) || 0)),
      enabled: s.enabled,
      kicker: s.kicker,
      title: s.title,
      body: s.body,
      key_message: s.key_message,
      business_id: s.business_id,
      widget_keys: s.widget_keys ?? [],
    }));

    const stepsRes = rows.length
      ? await supabase.from("video_scenario_steps").upsert(rows, { onConflict: "id" })
      : { error: null };
    const configRes = await supabase.from("video_scenario_configs").upsert(
      {
        mode,
        business_id: config.business_id,
        format_key: config.format_key,
        width: Math.max(320, Math.min(3840, Number(config.width) || 1920)),
        height: Math.max(320, Math.min(3840, Number(config.height) || 1080)),
        fps: Math.max(12, Math.min(60, Number(config.fps) || 30)),
        internal_note: config.internal_note,
      } as any,
      { onConflict: "mode" },
    );

    setSaving(false);
    if (stepsRes.error || configRes.error) {
      toast.error("Enregistrement échoué");
      return;
    }
    toast.success("Scénario enregistré");
    load();
  };

  const totalFixed = useMemo(
    () => steps.filter((s) => s.enabled).reduce((acc, s) => acc + (Number(s.duration_sec) || 0), 0),
    [steps],
  );

  const noteLength = useMemo(
    () =>
      (config?.internal_note ?? "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim().length,
    [config?.internal_note],
  );

  const availableTemplates = useMemo(
    () => EXPLAINER_TEMPLATES.filter((t) => !steps.some((s) => s.scene_key === t.key)),
    [steps],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-black">Scénarios vidéo : étapes et textes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cet ordre est appliqué dans « Aperçu du scénario » de Studio Vidéo IA et au rendu. Durée 0 = durée
            automatique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={mode === m.value ? "default" : "outline"}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Réglages globaux du mode : établissement source */}
        {config && (
          <div className="rounded-lg border p-3 grid gap-3 md:grid-cols-4">
            <div className="grid gap-1 md:col-span-2">
              <span className="text-xs text-muted-foreground">Établissement lié (source des visuels réels)</span>
              <BusinessSelect
                value={config.business_id}
                onChange={(id) => {
                  setConfig((prev) => (prev ? { ...prev, business_id: id } : prev));
                  // La liaison se propage à toutes les étapes du mode (actives ou non).
                  setSteps((prev) => prev.map((s) => ({ ...s, business_id: id })));
                  setDirty(true);
                }}
              />
            </div>
            <div className="md:col-span-2 self-end text-xs text-muted-foreground">
              Changer l'établissement met à jour la liaison de toutes les étapes (et des scènes ajoutées ensuite). Le
              format et les dimensions sont gérés dans Studio Vidéo IA.
            </div>


          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {steps.filter((s) => s.enabled).length} étape(s) active(s) · durées fixes cumulées : {totalFixed}s
          </div>
          <div className="flex items-center gap-2">
            <select
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">Ajouter une scène…</option>
              {availableTemplates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => addStep()}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
            <span className="text-xs text-muted-foreground">ou étape manuelle :</span>
            <Input
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              placeholder="Nom de l'étape"
              className="h-8 w-40 text-xs"
            />
            <Input
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="clé_technique"
              className="h-8 w-36 text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const key =
                  manualKey.trim() ||
                  manualLabel
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/^_+|_+$/g, "");
                if (!key) {
                  toast.error("Renseigne un nom ou une clé d'étape");
                  return;
                }
                addStep({ key, label: manualLabel });
                setManualKey("");
                setManualLabel("");
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Étape manuelle
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading || saving}>
              <RotateCcw className="h-4 w-4 mr-1" /> Recharger
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étape configurée pour ce mode.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y rounded-lg border">
                {steps.map((s, i) => (
                  <SortableStep
                    key={s.id}
                    step={s}
                    index={i}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded((prev) => (prev === s.id ? null : s.id))}
                    patch={(values) => patch(s.id, values)}
                    remove={() => removeStep(s.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Note interne (par mode) : usage staff uniquement, jamais affichée au rendu. */}
        {config && (
          <div className="space-y-1 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-black">Note interne</span>
              <span
                className={`text-xs ${noteLength > MAX_NOTE_LENGTH ? "text-destructive font-bold" : "text-muted-foreground"}`}
              >
                {noteLength} / {MAX_NOTE_LENGTH}
                {noteLength > MAX_NOTE_LENGTH && " ⚠ Limite dépassée"}
              </span>
            </div>
            <RichTextEditor
              content={config.internal_note ?? ""}
              onChange={(html) => {
                setConfig((prev) => (prev ? { ...prev, internal_note: html } : prev));
                setDirty(true);
              }}
              placeholder="Notes de production, arbitrages, à faire…"
              maxHeight="400px"
              simple
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoScenarioConfigPanel;
