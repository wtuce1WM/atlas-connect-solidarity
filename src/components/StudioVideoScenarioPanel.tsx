import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, MessageSquare, Star, Download, QrCode, Calendar, Plus, X, ChevronLeft, ChevronRight, Film, Image as ImageIcon, GripVertical, Minus, Type, Trash2, Pencil } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { formatRating } from "@/lib/ratingUtils";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPickerGrid } from "@/components/StudioVideoMediaPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SceneMediaKind = "logo" | "hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro";

export type SceneMediaItem = {
  url: string;
  kind: "image" | "video";
  title?: string;
  thumbnail?: string | null;
  duration?: number;
};

export type SceneMediaMap = Partial<Record<SceneMediaKind, SceneMediaItem[]>>;

export const SCENE_KINDS_WITH_MEDIA: SceneMediaKind[] = ["logo", "hook", "name", "media", "offer", "reviews", "hours", "map", "digital", "cta", "outro"];


export type Scene = {
  id: string;
  label: string;
  duration: number;
  start: number;
  description: string;
  keywords: string[];
  icon: "logo" | "hook" | "name" | "media" | "popup" | "offer" | "highlight" | "reviews" | "google_review" | "tripadvisor" | "restaurant_guru" | "customer_review" | "whatsapp" | "hours" | "map" | "digital" | "blog" | "cta" | "outro" | "custom";
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
  media?: SceneMediaItem;     // premier média (compat rendu)
  mediaList?: SceneMediaItem[]; // plusieurs images/vidéos jouées en séquence
  priceBadge?: string;        // ligne d'offre animée discrètement (ex. « Vente — Prix: Sur demande »)
  splitCount?: number;        // nb d'étapes pour découper le texte sur le montage vidéo
};

const ICONS: Record<Scene["icon"], React.ReactNode> = {
  logo: <ImageIcon className="h-3.5 w-3.5" />,
  hook: <Star className="h-3.5 w-3.5" />,
  name: <MessageSquare className="h-3.5 w-3.5" />,
  media: <MessageSquare className="h-3.5 w-3.5" />,
  popup: <ImageIcon className="h-3.5 w-3.5" />,
  offer: <MessageSquare className="h-3.5 w-3.5" />,
  highlight: <Star className="h-3.5 w-3.5" />,
  reviews: <MessageSquare className="h-3.5 w-3.5" />,
  google_review: <Star className="h-3.5 w-3.5" />,
  tripadvisor: <Star className="h-3.5 w-3.5" />,
  restaurant_guru: <Star className="h-3.5 w-3.5" />,
  customer_review: <MessageSquare className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  hours: <Calendar className="h-3.5 w-3.5" />,
  map: <MapPin className="h-3.5 w-3.5" />,
  digital: <QrCode className="h-3.5 w-3.5" />,
  blog: <Type className="h-3.5 w-3.5" />,
  cta: <Download className="h-3.5 w-3.5" />,
  outro: <Clock className="h-3.5 w-3.5" />,
  custom: <Type className="h-3.5 w-3.5" />,
};

const LABELS: Record<Exclude<Scene["icon"], "custom">, string> = {
  logo: "Ouverture logo",
  // Dans le montage vidéo, la scène "hook" affiche le NOM + 📍 ville · quartier
  hook: "Nom & identité",
  // ... et la scène "name" affiche le TEXTE du hook.
  name: "Hook",
  media: "Montage",
  popup: "Popup",
  offer: "Offre",
  highlight: "Bloc highlight",
  reviews: "Avis clients",
  google_review: "Avis Google",
  tripadvisor: "TripAdvisor",
  restaurant_guru: "Restaurant Guru",
  customer_review: "Témoignage client",
  whatsapp: "WhatsApp",
  hours: "Horaires",
  map: "Localisation",
  digital: "ID numérique",
  blog: "Articles de blog",
  cta: "Appel à l'action",
  outro: "Outro",
};

// Même découpe que le montage Remotion (BusinessShowcase.splitHookInTwo)
export function splitHookInTwo(h: string): [string, string] {
  const t = (h || "").trim();
  if (!t) return ["", ""];
  const m = t.match(/^(.+?[,;:—–-])\s+(.+)$/);
  if (m && m[1].length > 10 && m[2].length > 10) return [m[1].trim(), m[2].trim()];
  const words = t.split(/\s+/);
  if (words.length < 4) return [t, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}


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
    openWithLogo?: boolean;
    logoUrl?: string | null;
    whatsapp?: boolean;
    whatsappNumber?: string | null;
    /** Texte du hook (étape 2 « Hook ») — remplace l'accroche générée. */
    hookText?: string | null;
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

  const nameDuration = Math.max(2, Math.round(durationSec * 0.12));
  const hookDuration = Math.max(2, Math.round(durationSec * 0.15));
  if (options.openWithLogo && options.logoUrl) {
    push("logo", Math.max(2, Math.round(durationSec * 0.06)), "Ouverture sur le logo de l'établissement (fond transparent).");
  }
  push("hook", nameDuration, businessName ? `${businessName}` : "Nom de l'établissement");
  push("name", hookDuration, options.hookText?.trim() || (businessName ? `Accroche sur ${businessName} et son ambiance.` : "Accroche immersive pour capter l'attention."));

  if (keywords.includes("offre") || keywords.includes("promotion") || keywords.includes("menu") || keywords.includes("pass") || keywords.includes("déjeuner") || keywords.includes("diner") || keywords.includes("spa")) {
    push("offer", Math.max(4, Math.round(durationSec * 0.22)), "Mise en avant de l'offre ou du produit phare du prompt.");
  }
  if (options.reviews) push("reviews", Math.max(2, Math.round(durationSec * 0.12)), "Badge avis clients avec note/20 et nombre d'avis.");
  if (options.hours) push("hours", Math.max(2, Math.round(durationSec * 0.08)), "Horaires d'ouverture en surimpression.");
  if (options.mapMarker) push("map", Math.max(2, Math.round(durationSec * 0.1)), "Marqueur Google Map et localisation.");
  if (options.digitalId) push("digital", 3, "Séquence ID numérique : fiche, partage, QR code.");
  if (options.whatsapp && options.whatsappNumber) {
    push("whatsapp", Math.max(2, Math.round(durationSec * 0.08)), `WhatsApp ${options.whatsappNumber} — logo #25D366 + effet libre au montage.`);
  }
  push("cta", Math.max(2, Math.round(durationSec * 0.12)), options.installCta ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");
  if (options.installCta) push("outro", Math.max(2, Math.round(durationSec * 0.08)), "Outro avec logo et appel à l'installation.");

  return normalize(scenes, durationSec, cursor);

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
  const hook = typeof props?.hook === "string" ? props.hook.trim() : "";
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

  // Ouverture logo (si option activée et logo transparent disponible)
  if (props?.openWithLogo && props?.logoUrl) {
    push("logo", Math.max(2, Math.round(durationSec * 0.06)), "Ouverture sur le logo de l'établissement.");
  }

  // Scène "hook" du montage = NOM + 📍 ville · quartier (texte exact affiché à l'écran)
  const city = typeof props?.city === "string" ? props.city.trim() : "";
  const neighborhood = typeof props?.neighborhood === "string" ? props.neighborhood.trim() : "";
  const locationLine = [city, neighborhood].filter(Boolean).join(" · ");
  push("hook", Math.max(2, Math.round(durationSec * 0.1)), [name, locationLine ? `📍 ${locationLine}` : ""].filter(Boolean).join("\n"));
  // Scène "name" du montage = TEXTE INTÉGRAL du hook (identique à Remotion)
  push("name", Math.max(2, Math.round(durationSec * 0.12)), hook || tagline || name);
  // Étape "media" (montage) : ajoutée manuellement par l'utilisateur via "Ajouter une étape".

  // Une scène par offre sélectionnée — position 4 par défaut (juste après Nom / étape texte)
  const offersList: any[] = Array.isArray(props?.offers) ? props.offers : (offer ? [offer] : []);
  if (offersList.length > 0) {
    const perOffer = Math.max(3, Math.round((durationSec * 0.22) / offersList.length));
    for (const off of offersList) {
      const title = (off?.title || "").toString().trim();
      const price = (off?.price || "").toString().trim();
      const lines: string[] = Array.isArray(off?.lines) ? off.lines.map((l: any) => String(l).trim()).filter(Boolean) : [];
      const head = [title, price].filter(Boolean).join(" · ");
      const desc = [head, ...lines].filter(Boolean).join("\n") || "Offre mise en avant.";
      // Le suffixe du libellé n'est utile que si le titre apporte une information :
      // un titre égal au nom de l'établissement ou à la ville est du bruit.
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const noise = new Set([norm(name), norm(city), norm(neighborhood)].filter(Boolean));
      const usefulTitle = title && !noise.has(norm(title));
      push("offer", perOffer, desc, usefulTitle ? `Offre — ${title.slice(0, 40)}` : undefined);
    }
  }

  // Popup (une scène dédiée si l'option est cochée et qu'une image popup existe)
  if (props?.showPopup && props?.popupImageUrl) {
    push("popup", Math.max(2, Math.round(durationSec * 0.08)), [
      typeof props?.popupTitle === "string" ? props.popupTitle.trim() : "",
      typeof props?.popupDescription === "string" ? props.popupDescription.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "",
    ].filter(Boolean).join("\n") || "Image d'accueil (popup) en plein écran.");
  }


  // Une scène par bloc highlight sélectionné — titre + texte exacts repris dans la vidéo
  const highlightsList: any[] = Array.isArray(props?.highlights) ? props.highlights : [];
  if (highlightsList.length > 0) {
    const perHl = Math.max(2, Math.round((durationSec * 0.18) / highlightsList.length));
    for (const h of highlightsList) {
      const title = (h?.title || "").toString().trim();
      const desc = (h?.description || "").toString().trim();
      const metric = [h?.metric_value, h?.metric_title].filter(Boolean).map((x: any) => String(x).trim()).join(" ");
      const summary = [title, desc, metric].filter(Boolean).join("\n") || "Bloc highlight.";
      push("highlight", perHl, summary, title ? `Highlight — ${title.slice(0, 40)}` : undefined);
    }
  }


  if (props?.showReviews) {
    // Même logique que le front : note affichée sur /20 (rating /5 × 4), 2 décimales max
    const rating = props.rating ? ` (${formatRating(Number(props.rating) * 4)}/20)` : "";
    const count = props.reviewsCount ? ` · ${Number(props.reviewsCount).toLocaleString("fr-FR")} avis` : "";
    push("reviews", Math.max(2, Math.round(durationSec * 0.08)), `Badge avis clients${rating}${count}.`);
  }
  const platformScenes: Array<{ key: Scene["icon"]; enabled: boolean; label: string; data: any }> = [
    { key: "google_review", enabled: !!props?.showGoogleReviews, label: "Avis Google", data: props?.googleReview },
    { key: "tripadvisor", enabled: !!props?.showTripAdvisor, label: "TripAdvisor", data: props?.tripAdvisor },
    { key: "restaurant_guru", enabled: !!props?.showRestaurantGuru, label: "Restaurant Guru", data: props?.restaurantGuru },
  ];
  for (const ps of platformScenes) {
    if (!ps.enabled) continue;
    const d = ps.data || {};
    const rating = d.rating ? ` (${Number(d.rating).toFixed(1)}/5)` : "";
    const count = d.count ? ` · ${d.count} avis` : "";
    push(ps.key, Math.max(2, Math.round(durationSec * 0.07)), `${ps.label}${rating}${count} — logo plateforme + effet dynamique.`);
  }
  if (props?.showCustomerReview && props?.customerReview?.text) {
    const cr = props.customerReview;
    const highlight = (cr.highlight || cr.text || "").toString().slice(0, 120);
    const author = cr.author ? ` — ${cr.author}` : "";
    push("customer_review", 7, `Témoignage : « ${highlight} »${author}`);
  }
  if (props?.showOpeningHours) push("hours", Math.max(2, Math.round(durationSec * 0.07)), "Horaires d'ouverture en surimpression.");
  if (props?.showMap) push("map", Math.max(2, Math.round(durationSec * 0.09)), `Marqueur Google Map${props.address ? ` — ${String(props.address).slice(0, 60)}` : ""}.`);
  if (props?.showDigitalId) push("digital", 3, "ID numérique : capture fiche, partage, QR code.");
  if (props?.showBlogArticles && Array.isArray(props?.blogArticles) && props.blogArticles.length > 0) {
    const titles = props.blogArticles.map((a: any) => a?.title).filter(Boolean).join(" · ");
    push(
      "blog",
      Math.max(3, props.blogArticles.length * 3),
      props?.blogMode === "scroll"
        ? `Articles de blog (scroll vertical) : ${titles}`
        : `Articles de blog (hero + zoom carte) : ${titles}`,
    );
  }
  if (props?.showWhatsapp && props?.whatsappNumber) {
    push("whatsapp", Math.max(2, Math.round(durationSec * 0.08)), `WhatsApp ${props.whatsappNumber} — logo #25D366 + effet libre au montage.`);
  }
  push("cta", Math.max(2, Math.round(durationSec * 0.1)), props?.showAppInstall ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");
  if (props?.showAppInstall) push("outro", Math.max(2, Math.round(durationSec * 0.06)), "Outro logo + installation de l'app.");
  return normalize(scenes, durationSec, cursor);
}

// Durée fixe par défaut (en secondes) pour certaines étapes de clôture :
// elles ne sont pas remises à l'échelle avec la durée cible.
const FIXED_SCENE_DURATIONS: Partial<Record<Scene["icon"], number>> = { cta: 3, outro: 3 };

function normalize(scenes: Scene[], durationSec: number, cursor: number): Scenario {
  const scale = durationSec / Math.max(1, cursor);
  let start = 0;
  const scaled = scenes.map((s) => {
    const fixed = FIXED_SCENE_DURATIONS[s.icon];
    const duration = fixed ?? Math.max(1, Math.round(s.duration * scale));
    const scene = { ...s, duration, start };
    start += duration;
    return scene;
  });
  const total = scaled.reduce((acc, s) => acc + s.duration, 0);
  return { scenes: scaled, totalDuration: total };
}


function sceneKindFor(icon: Scene["icon"]): SceneMediaKind | null {
  if (icon === "custom" || icon === "popup" || icon === "highlight" || icon === "blog") return null;
  return icon as SceneMediaKind;
}

const isCustomToken = (t: string) => t.startsWith("custom:");
const customIdFromToken = (t: string) => t.slice("custom:".length);
const tokenForCustom = (id: string) => `custom:${id}`;

/** Découpe un texte selon des offsets de caractères (points de coupe croissants). */
export function segmentsFromPoints(text: string, points: number[]): string[] {
  const t = text ?? "";
  if (!t) return [];
  const pts = Array.from(new Set(points.filter((p) => p > 0 && p < t.length))).sort((a, b) => a - b);
  const out: string[] = [];
  let prev = 0;
  for (const p of pts) {
    out.push(t.slice(prev, p).trim());
    prev = p;
  }
  out.push(t.slice(prev).trim());
  return out.filter((s) => s.length > 0);
}

/** Points de coupe répartis équitablement, calés sur les frontières de mots. */
export function evenSplitPoints(text: string, n: number): number[] {
  const t = (text ?? "").trim();
  if (!t || n <= 1) return [];
  const pts: number[] = [];
  for (let i = 1; i < n; i++) {
    const target = Math.round((t.length * i) / n);
    // cale sur l'espace le plus proche
    let best = target;
    for (let d = 0; d < t.length; d++) {
      if (t[target + d] === " ") { best = target + d + 1; break; }
      if (t[target - d] === " ") { best = target - d + 1; break; }
    }
    if (best > 0 && best < t.length && !pts.includes(best)) pts.push(best);
  }
  return pts.sort((a, b) => a - b);
}

const newCustomId = () =>
  `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type PlaceOption = { id: string; name: string; group?: string | null };

export type ScenarioEdits = {
  order: string[]; // ordered tokens: SceneMediaKind or `custom:<id>`
  durations: Partial<Record<SceneMediaKind, number>>; // seconds per built-in kind
  customScenes?: CustomScene[];
  // Nb d'étapes pour découper le texte dans le montage (clé = "hook" | "name" | `custom:<id>`)
  textSplits?: Record<string, number>;
  /** Segments de texte explicites (découpe au caractère près). Clé = kind ou `custom:<id>`. */
  textSegments?: Record<string, string[]>;
  // Overrides libres du texte des scènes (titre + description). Clé = SceneMediaKind pour built-in.
  textOverrides?: Partial<Record<SceneMediaKind, { label?: string; description?: string }>>;
  /** POIs liés à une scène. Clé = SceneMediaKind ("hook" | "map") ou `custom:<id>`. */
  scenePois?: Record<string, string[]>;
  /** Destinations liées à une scène personnalisée. Clé = `custom:<id>`. */
  sceneDestinations?: Record<string, string[]>;
  /** Média utilisé pour le montage des lieux liés (vidéo 1 ou image 1). Défaut : vidéos. */
  placesMediaMode?: "videos" | "images";
  /**
   * Relation entre l'étape WhatsApp et la carte Offre :
   * - "number" (défaut) : la scène WhatsApp n'affiche que le logo + le numéro
   * - "with_offer" : le contenu de la carte Offre est affiché dans la scène WhatsApp
   */
  whatsappOfferMode?: "number" | "with_offer";
  /** Durée totale réelle du scénario après édition (secondes). */
  totalDuration?: number;
};

export function StudioVideoScenarioPanel({
  scenario,
  className,
  availableMedia,
  sceneMedia,
  onChangeSceneMedia,
  onChangeScenarioEdits,
  openAddDialog,
  onOpenAddDialogChange,
  beforeTimeline,
  availablePois,
  availableDestinations,
  pendingCustomScene,
  onPendingCustomSceneConsumed,
  onRegenerate,
  regenerating,
}: {
  scenario: Scenario;
  className?: string;
  availableMedia?: SceneMediaItem[];
  sceneMedia?: SceneMediaMap;
  onChangeSceneMedia?: (next: SceneMediaMap) => void;
  onChangeScenarioEdits?: (edits: ScenarioEdits | null) => void;
  openAddDialog?: boolean;
  onOpenAddDialogChange?: (open: boolean) => void;
  /** Contenu inséré juste avant la Timeline de production (ex. bande son). */
  beforeTimeline?: React.ReactNode;
  /** POIs de la ville de l'établissement, regroupés par quartier (`group`). */
  availablePois?: PlaceOption[];
  /** Destinations sélectionnables (étapes personnalisées). */
  availableDestinations?: PlaceOption[];
  /** Étape personnalisée injectée depuis l'extérieur (ex. « Estimer la durée »). */
  pendingCustomScene?: (Omit<CustomScene, "id"> & { id?: string }) | null;
  onPendingCustomSceneConsumed?: () => void;
  /** Relance la génération du scénario IA (proposée après suppression d'étapes). */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  // Local edits: per-scene duration overrides + order override (by token) + custom scenes + text splits
  const [durationOverrides, setDurationOverrides] = useState<Record<string, number>>({});
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const [customScenes, setCustomScenes] = useState<CustomScene[]>([]);
  const [splitOverrides, setSplitOverrides] = useState<Record<string, number>>({});
  // Points de coupe (offsets caractères) par étape. Clé = scene.id ou token custom.
  const [segmentOverrides, setSegmentOverrides] = useState<Record<string, number[]>>({});
  const [splitEditorId, setSplitEditorId] = useState<string | null>(null);
  const [textOverrides, setTextOverrides] = useState<Record<string, { label?: string; description?: string }>>({});
  const [poiOverrides, setPoiOverrides] = useState<Record<string, string[]>>({});
  const [destOverrides, setDestOverrides] = useState<Record<string, string[]>>({});
  const [placesMediaMode, setPlacesMediaMode] = useState<"videos" | "images">("videos");
  const [placesSceneKey, setPlacesSceneKey] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [addOpenInternal, setAddOpenInternal] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string; duration: number } | null>(null);

  const isAddOpenControlled = openAddDialog !== undefined && onOpenAddDialogChange !== undefined;
  const addOpen = isAddOpenControlled ? openAddDialog : addOpenInternal;
  const setAddOpen = (open: boolean) => {
    if (isAddOpenControlled) onOpenAddDialogChange!(open);
    else setAddOpenInternal(open);
  };

  // Signature to reset local edits when the incoming scenario really changes
  const signature = scenario.scenes.map((s) => s.id).join("|") + "@" + scenario.totalDuration;
  useEffect(() => {
    setDurationOverrides({});
    setOrderOverride(null);
    setCustomScenes([]);
    setSplitOverrides({});
    setSegmentOverrides({});
    setTextOverrides({});
    setPoiOverrides({});
    setDestOverrides({});
    setPlacesMediaMode("videos");
    onChangeScenarioEdits?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const customById = useMemo(() => {
    const m = new Map<string, CustomScene>();
    for (const c of customScenes) m.set(c.id, c);
    return m;
  }, [customScenes]);

  // Insertion d'une étape depuis l'extérieur (popup « Estimer la durée »)
  useEffect(() => {
    if (!pendingCustomScene) return;
    const scene: CustomScene = { ...pendingCustomScene, id: pendingCustomScene.id ?? newCustomId() };
    setCustomScenes((prev) => [...prev, scene]);
    setOrderOverride((prev) => {
      const base = prev ?? scenario.scenes.map((s) => s.id);
      const token = tokenForCustom(scene.id);
      const closingIdx = base.findIndex((tok) => {
        if (isCustomToken(tok)) return false;
        const s = scenario.scenes.find((x) => x.id === tok);
        return s?.icon === "cta" || s?.icon === "outro";
      });
      if (closingIdx === -1) return [...base, token];
      return [...base.slice(0, closingIdx), token, ...base.slice(closingIdx)];
    });
    if (scene.splitCount && scene.splitCount > 1) {
      setSplitOverrides((prev) => ({ ...prev, [tokenForCustom(scene.id)]: scene.splitCount! }));
    }
    onPendingCustomSceneConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCustomScene]);



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
        const ov = textOverrides[s.icon as string];
        out.push({
          ...s,
          duration,
          start,
          label: ov?.label ?? s.label,
          description: ov?.description ?? s.description,
        });
      }
    }
    return out;
  }, [scenario.scenes, orderOverride, durationOverrides, customById, textOverrides]);

  // Emit edits upstream whenever they change (dedup: only when non-default)
  useEffect(() => {
    if (!onChangeScenarioEdits) return;
    const hasOrder = !!orderOverride;
    const hasDurations = Object.keys(durationOverrides).length > 0;
    const hasCustom = customScenes.length > 0;
    const hasSplits = Object.keys(splitOverrides).length > 0;
    const hasSegments = Object.values(segmentOverrides).some((a) => a.length > 0);
    const hasTextOv = Object.keys(textOverrides).length > 0;
    const hasPois = Object.values(poiOverrides).some((a) => a.length > 0);
    const hasDests = Object.values(destOverrides).some((a) => a.length > 0);
    if (!hasOrder && !hasDurations && !hasCustom && !hasSplits && !hasSegments && !hasTextOv && !hasPois && !hasDests) {
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
    // Segments explicites (découpe au caractère près) — prioritaires sur textSplits
    const textSegments: Record<string, string[]> = {};
    for (const [id, pts] of Object.entries(segmentOverrides)) {
      if (!pts.length) continue;
      const key = isCustomToken(id) ? id : (byId.get(id)?.icon as string | undefined);
      if (!key) continue;
      const src = isCustomToken(id)
        ? (customById.get(customIdFromToken(id))?.subtitle ?? "")
        : (textOverrides[key]?.description ?? byId.get(id)?.description ?? "");
      const segs = segmentsFromPoints((src ?? "").trim(), pts);
      if (segs.length > 1) {
        textSegments[key] = segs;
        textSplits[key] = segs.length;
      }
    }
    onChangeScenarioEdits({
      order: orderTokens,
      durations,
      customScenes: hasCustom ? customScenes : undefined,
      textSplits: Object.keys(textSplits).length ? textSplits : undefined,
      textSegments: Object.keys(textSegments).length ? textSegments : undefined,
      textOverrides: hasTextOv ? (textOverrides as any) : undefined,
      scenePois: hasPois ? poiOverrides : undefined,
      sceneDestinations: hasDests ? destOverrides : undefined,
      placesMediaMode: (hasPois || hasDests) ? placesMediaMode : undefined,
      totalDuration: editedScenes.reduce((acc, s) => acc + s.duration, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderOverride, durationOverrides, customScenes, customById, splitOverrides, segmentOverrides, textOverrides, poiOverrides, destOverrides, placesMediaMode]);

  const total = editedScenes.reduce((acc, s) => acc + s.duration, 0);
  // Étapes d'origine supprimées (built-in retirées de l'ordre)
  const removedBuiltIns = useMemo(() => {
    const kept = new Set(editedScenes.map((s) => s.id));
    return scenario.scenes.filter((s) => !kept.has(s.id));
  }, [scenario.scenes, editedScenes]);
  const targetDuration = scenario.totalDuration;
  const suggestRegenerate =
    removedBuiltIns.length > 0 &&
    (total < Math.round(targetDuration * 0.85) || editedScenes.length < 3);
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
    // Nouvelle étape texte : insérée en position 3 du scénario (après Ouverture + Nom).
    setOrderOverride((prev) => {
      const base = prev ?? editedScenes.map((s) => s.id);
      const tok = tokenForCustom(draft.id);
      if (base.includes(tok)) return base;
      const insertAt = Math.min(2, base.length);
      const next = base.slice();
      next.splice(insertAt, 0, tok);
      return next;
    });

  };

  const removeCustomScene = (cid: string) => {
    const tok = tokenForCustom(cid);
    setCustomScenes((prev) => prev.filter((c) => c.id !== cid));
    setOrderOverride((prev) => (prev ? prev.filter((t) => t !== tok) : prev));
  };

  /** Supprime n'importe quelle étape (built-in ou personnalisée). */
  const removeScene = (id: string) => {
    if (isCustomToken(id)) {
      removeCustomScene(customIdFromToken(id));
      return;
    }
    const base = orderOverride ?? editedScenes.map((s) => s.id);
    setOrderOverride(base.filter((t) => t !== id));
    setDurationOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSplitOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

      <SceneTextEditDialog
        open={!!editingTextId}
        onOpenChange={(o) => { if (!o) setEditingTextId(null); }}
        sceneKind={editingTextId}
        currentLabel={
          editingTextId
            ? textOverrides[editingTextId]?.label
              ?? editedScenes.find((s) => s.icon === editingTextId)?.label
              ?? ""
            : ""
        }
        currentDescription={
          editingTextId
            ? textOverrides[editingTextId]?.description
              ?? editedScenes.find((s) => s.icon === editingTextId)?.description
              ?? ""
            : ""
        }
        onSubmit={(label, description) => {
          if (!editingTextId) return;
          setTextOverrides((prev) => {
            const next = { ...prev };
            const trimmedLabel = label.trim();
            const trimmedDesc = description.trim();
            if (!trimmedLabel && !trimmedDesc) delete next[editingTextId];
            else next[editingTextId] = { label: trimmedLabel || undefined, description: trimmedDesc || undefined };
            return next;
          });
          setEditingTextId(null);
        }}
        onReset={() => {
          if (!editingTextId) return;
          setTextOverrides((prev) => {
            const next = { ...prev };
            delete next[editingTextId];
            return next;
          });
          setEditingTextId(null);
        }}
      />

      <TextSplitEditorDialog
        open={!!splitEditorId}
        onOpenChange={(o) => { if (!o) setSplitEditorId(null); }}
        text={(() => {
          if (!splitEditorId) return "";
          if (isCustomToken(splitEditorId)) return (customById.get(customIdFromToken(splitEditorId))?.subtitle ?? "").trim();
          const s = editedScenes.find((x) => x.id === splitEditorId);
          return (s?.description ?? "").trim();
        })()}
        duration={editedScenes.find((x) => x.id === splitEditorId)?.duration ?? 0}
        points={splitEditorId ? (segmentOverrides[splitEditorId] ?? []) : []}
        onSubmit={(pts) => {
          if (!splitEditorId) return;
          setSegmentOverrides((prev) => {
            const next = { ...prev };
            if (!pts.length) delete next[splitEditorId];
            else next[splitEditorId] = pts;
            return next;
          });
          setSplitEditorId(null);
        }}
      />

      <PlacesPickerDialog
        open={!!placesSceneKey}
        onOpenChange={(o) => { if (!o) setPlacesSceneKey(null); }}
        pois={availablePois ?? []}
        destinations={placesSceneKey && isCustomToken(placesSceneKey) ? (availableDestinations ?? []) : []}
        selectedPois={placesSceneKey ? (poiOverrides[placesSceneKey] ?? []) : []}
        selectedDestinations={placesSceneKey ? (destOverrides[placesSceneKey] ?? []) : []}
        onSubmit={(poiIds, destIds) => {
          if (!placesSceneKey) return;
          const k = placesSceneKey;
          setPoiOverrides((prev) => {
            const next = { ...prev };
            if (poiIds.length === 0) delete next[k]; else next[k] = poiIds;
            return next;
          });
          setDestOverrides((prev) => {
            const next = { ...prev };
            if (destIds.length === 0) delete next[k]; else next[k] = destIds;
            return next;
          });
          setPlacesSceneKey(null);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent className="max-w-sm bg-white text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette étape ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `« ${pendingDelete.label} » (${pendingDelete.duration}s) sera retirée du scénario. La durée totale passera à ${formatDuration(Math.max(0, total - pendingDelete.duration))}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) removeScene(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {suggestRegenerate && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-foreground">
            {removedBuiltIns.length} étape{removedBuiltIns.length > 1 ? "s" : ""} supprimée{removedBuiltIns.length > 1 ? "s" : ""} · durée actuelle {formatDuration(total)} pour une cible de {formatDuration(targetDuration)}. Une régénération du scénario peut mieux répartir le montage.
          </p>
          {onRegenerate && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" disabled={!!regenerating} onClick={onRegenerate}>
              {regenerating ? "Régénération…" : "Régénérer le scénario"}
            </Button>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground italic">Glissez-déposez les scènes pour les réordonner, ajustez la durée avec +/− ou supprimez une étape via l'icône corbeille.</p>


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
                  {(scene.icon === "hook" || scene.icon === "name") && (
                    <button
                      type="button"
                      onClick={() => setEditingTextId(scene.icon)}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-black"
                      aria-label="Modifier le texte de l'étape"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {scene.icon === "custom" && isCustomToken(scene.id) && (
                    <button
                      type="button"
                      onClick={() => { setEditingCustomId(customIdFromToken(scene.id)); setAddOpen(true); }}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-black"
                      aria-label="Modifier l'étape"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ id: scene.id, label: scene.label, duration: scene.duration })}
                    className="p-1 rounded hover:bg-destructive/10 text-neutral-600 hover:text-destructive"
                    aria-label="Supprimer l'étape"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                </div>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{scene.description}</p>


              {(scene.icon === "name" || scene.icon === "custom") && (() => {
                const splitText = (
                  scene.icon === "custom"
                    ? (customById.get(customIdFromToken(scene.id))?.subtitle ?? "")
                    : (scene.description ?? "")
                ).trim();
                const pts = segmentOverrides[scene.id] ?? [];
                const segs = segmentsFromPoints(splitText, pts);
                return (
                  <div className="mt-3 space-y-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-[11px] text-neutral-700">Découper le texte sur le montage en</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        value={segs.length}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const n = Number.isFinite(raw) ? Math.max(1, Math.min(10, raw)) : 1;
                          setSegmentOverrides((prev) => {
                            const next = { ...prev };
                            if (n <= 1) delete next[scene.id];
                            else next[scene.id] = evenSplitPoints(splitText, n);
                            return next;
                          });
                        }}
                        className="w-14 h-7 rounded border border-neutral-300 bg-white px-1.5 text-center text-[12px] tabular-nums text-black focus:outline-none focus:border-primary"
                        aria-label="Nombre d'étapes de découpe du texte"
                      />
                      <span className="text-[11px] text-neutral-700">étape{segs.length > 1 ? "s" : ""}</span>
                      <button
                        type="button"
                        disabled={!splitText}
                        onClick={() => setSplitEditorId(scene.id)}
                        className="ml-auto text-[11px] underline text-neutral-700 hover:text-black disabled:opacity-40"
                      >
                        Caler au caractère
                      </button>
                    </div>
                    {segs.length > 1 && (
                      <div className="space-y-1">
                        {segs.map((t, i) => (
                          <div key={i} className="flex gap-1.5 text-[10px] text-neutral-600">
                            <span className="shrink-0 font-bold tabular-nums">
                              {i + 1}. {(scene.duration / segs.length).toFixed(1)}s
                            </span>
                            <span className="truncate">{t}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}



              {(scene.icon === "hook" || scene.icon === "map" || scene.icon === "custom") &&
                ((availablePois?.length ?? 0) > 0 || (scene.icon === "custom" && (availableDestinations?.length ?? 0) > 0)) && (() => {
                  const key = scene.icon === "custom" ? scene.id : scene.icon;
                  const pois = poiOverrides[key] ?? [];
                  const dests = destOverrides[key] ?? [];
                  const names = [
                    ...pois.map((id) => availablePois?.find((p) => p.id === id)?.name).filter(Boolean),
                    ...dests.map((id) => availableDestinations?.find((d) => d.id === id)?.name).filter(Boolean),
                  ] as string[];
                  return (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
                        <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                        <span className="text-[11px] text-neutral-700 truncate">
                          {names.length > 0 ? names.join(" · ") : "Aucun lieu lié"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPlacesSceneKey(key)}
                          className="ml-auto shrink-0 text-[11px] underline text-neutral-700 hover:text-black"
                        >
                          {names.length > 0 ? "Modifier" : "Lier des lieux"}
                        </button>
                      </div>
                      {names.length > 0 && (
                        <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5">
                          <span className="text-[11px] text-neutral-600">Montage des lieux</span>
                          <div className="ml-auto flex overflow-hidden rounded-md border border-neutral-200">
                            {(["videos", "images"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPlacesMediaMode(m)}
                                className={cn(
                                  "px-2 py-0.5 text-[11px] transition-colors",
                                  placesMediaMode === m
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white text-neutral-600 hover:bg-neutral-100",
                                )}
                              >
                                {m === "videos" ? "Vidéo 1" : "Image 1"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  );
                })()}

              {editable && kind && (
                <SceneMediaSlot
                  kind={kind}
                  items={items}
                  available={availableMedia!}
                  onChange={(next) => setForKind(kind, next)}
                />
              )}
              {editable && scene.icon === "custom" && isCustomToken(scene.id) && (() => {
                const c = customById.get(customIdFromToken(scene.id));
                const list = c?.mediaList ?? (c?.media ? [c.media] : []);
                return (
                  <SceneMediaSlot
                    kind={"media" as SceneMediaKind}
                    label="Médias de fond"
                    items={list}
                    available={availableMedia!}
                    onChange={(next) => {
                      const cid = customIdFromToken(scene.id);
                      setCustomScenes((prev) =>
                        prev.map((x) =>
                          x.id === cid
                            ? { ...x, mediaList: next.length ? next : undefined, media: next[0] ?? undefined }
                            : x,
                        ),
                      );
                    }}
                  />
                );
              })()}
            </div>
          );
        })}
      </div>

      {beforeTimeline}

      <div className="bg-white text-black rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Timeline de production</div>
          <div className="text-[10px] text-neutral-600">{editedScenes.length} scènes · {total}s</div>
        </div>
        <div className="flex flex-wrap items-stretch gap-1">
          {editedScenes.map((scene) => {
            const px = Math.max(64, Math.round(scene.duration * 26));
            return (
              <div
                key={scene.id}
                className="relative flex flex-col justify-center px-2 py-1 h-10 rounded-md border border-border bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer overflow-hidden"
                style={{ flex: `0 0 auto`, width: `${px}px`, maxWidth: "100%" }}
                title={`${scene.label} · ${scene.duration}s`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold truncate text-black">{scene.label}</span>
                  <span className="text-[9px] font-semibold tabular-nums text-neutral-600 shrink-0">{scene.duration}s</span>
                </div>
                <div className="h-1 mt-1 rounded-full bg-primary/60" />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

function SceneMediaSlot({
  kind,
  label,
  items,
  available,
  onChange,
}: {
  kind: SceneMediaKind;
  label?: string;
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
          {label ?? "Médias assignés"} · {items.length}
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
            <MediaPickerGrid
              available={available}
              isSelected={(m) => items.some((i) => i.url === m.url)}
              badgeFor={(m) => {
                const i = items.findIndex((x) => x.url === m.url);
                return i >= 0 ? i + 1 : null;
              }}
              onSelect={(m) => toggle(m)}
            />

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
  const initialUrls = (initial?.mediaList ?? (initial?.media ? [initial.media] : [])).map((m) => m.url);
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialUrls);

  useEffect(() => {
    if (!open) return;
    setMode(initial?.mode ?? "fullscreen");
    setTitle(initial?.title ?? "");
    setSubtitle(initial?.subtitle ?? "");
    setDuration(initial?.duration ?? 4);
    setMediaUrls((initial?.mediaList ?? (initial?.media ? [initial.media] : [])).map((m) => m.url));
  }, [open, initial]);

  const toggleUrl = (url: string) =>
    setMediaUrls((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  const canSubmit = title.trim().length > 0 && duration >= 1 && duration <= 60;

  const submit = () => {
    if (!canSubmit) return;
    const list = mediaUrls
      .map((u) => available.find((m) => m.url === u))
      .filter(Boolean) as SceneMediaItem[];
    onSubmit({
      id: initial?.id ?? newCustomId(),
      mode,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      duration,
      media: list[0],
      mediaList: list.length ? list : undefined,
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
                onClick={() => setMode("overlay")}
                className={cn(
                  "rounded-md border p-3 text-left text-xs transition-colors",
                  mode === "overlay" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className="font-bold mb-0.5">Overlay sur média</div>
                <div className="text-muted-foreground">Texte superposé à une image ou vidéo (média optionnel).</div>
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

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider">
                Médias de fond (optionnel) · {mediaUrls.length}
              </Label>
              {mediaUrls.length > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setMediaUrls([])}>
                  Tout retirer
                </Button>
              )}
            </div>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">Aucun média disponible pour l'établissement sélectionné.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 mt-2 max-h-52 overflow-y-auto">
                {available.map((m) => {
                  const idx = mediaUrls.indexOf(m.url);
                  const selected = idx >= 0;
                  return (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => toggleUrl(m.url)}
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
                      {selected && (
                        <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {mediaUrls.length === 0 && (
              <p className="text-[11px] text-neutral-600 italic mt-2">
                Aucun média assigné — le rendu utilisera la sélection globale ou l'auto-choix IA.
              </p>
            )}
          </div>

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

function SceneTextEditDialog({
  open,
  onOpenChange,
  sceneKind,
  currentLabel,
  currentDescription,
  onSubmit,
  onReset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sceneKind: string | null;
  currentLabel: string;
  currentDescription: string;
  onSubmit: (label: string, description: string) => void;
  onReset: () => void;
}) {
  const [label, setLabel] = useState(currentLabel);
  const [description, setDescription] = useState(currentDescription);
  useEffect(() => {
    if (open) {
      setLabel(currentLabel);
      setDescription(currentDescription);
    }
  }, [open, currentLabel, currentDescription]);
  const kindLabel = sceneKind === "hook" ? "Nom & identité" : sceneKind === "name" ? "Hook" : "Étape";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Modifier le texte — {kindLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-black text-xs uppercase tracking-wider">Titre</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="bg-white text-black" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-black text-xs uppercase tracking-wider">Description / texte affiché</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white text-black" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onReset}>Réinitialiser</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSubmit(label, description)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



function PlacesPickerDialog({
  open,
  onOpenChange,
  pois,
  destinations,
  selectedPois,
  selectedDestinations,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pois: PlaceOption[];
  destinations: PlaceOption[];
  selectedPois: string[];
  selectedDestinations: string[];
  onSubmit: (poiIds: string[], destIds: string[]) => void;
}) {
  const [p, setP] = useState<string[]>(selectedPois);
  const [d, setD] = useState<string[]>(selectedDestinations);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) { setP(selectedPois); setD(selectedDestinations); setQ(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => {
    const norm = q.trim().toLowerCase();
    const m = new Map<string, PlaceOption[]>();
    for (const poi of pois) {
      if (norm && !poi.name.toLowerCase().includes(norm)) continue;
      const g = poi.group || "Autres";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(poi);
    }
    return [...m.entries()].sort((a, b) => {
      const aOther = /^autres?$/i.test(a[0]);
      const bOther = /^autres?$/i.test(b[0]);
      if (aOther !== bOther) return aOther ? 1 : -1;
      return a[0].localeCompare(b[0], "fr");
    });
  }, [pois, q]);

  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const toggleGroup = (items: PlaceOption[]) => {
    const ids = items.map((i) => i.id);
    setP((prev) => {
      const all = ids.every((id) => prev.includes(id));
      if (all) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white text-foreground">
        <DialogHeader>
          <DialogTitle>Lieux liés à l'étape</DialogTitle>
        </DialogHeader>
        <Input placeholder="Rechercher un lieu…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
          {groups.map(([group, items]) => {
            const ids = items.map((i) => i.id);
            const allSelected = ids.every((id) => p.includes(id));
            return (
              <div key={group}>
                <div className="mb-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(items)}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                      allSelected ? "border-primary bg-primary" : "border-primary/50 bg-white"
                    )}
                    aria-label={allSelected ? `Désélectionner ${group}` : `Sélectionner ${group}`}
                  >
                    {allSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(items)}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    title={allSelected ? "Désélectionner tout le quartier" : "Sélectionner tout le quartier"}
                  >
                    {group}
                    <span className="text-[10px] font-normal opacity-60">({ids.length})</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((poi) => {
                    const isSelected = p.includes(poi.id);
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => setP((prev) => toggle(prev, poi.id))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white border-border text-foreground hover:bg-muted"
                        )}
                      >
                        {poi.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {destinations.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destinations</p>
              <div className="flex flex-wrap gap-2">
                {destinations
                  .filter((x) => !q.trim() || x.name.toLowerCase().includes(q.trim().toLowerCase()))
                  .map((x) => {
                    const isSelected = d.includes(x.id);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setD((prev) => toggle(prev, x.id))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white border-border text-foreground hover:bg-muted"
                        )}
                      >
                        {x.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          {groups.length === 0 && destinations.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun lieu disponible.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => { setP([]); setD([]); }}>Tout décocher</Button>
          <Button type="button" onClick={() => onSubmit(p, d)}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/** Éditeur visuel de découpe du texte : cliquer entre deux caractères pose/retire un point de coupe. */
function TextSplitEditorDialog({
  open,
  onOpenChange,
  text,
  duration,
  points,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  text: string;
  duration: number;
  points: number[];
  onSubmit: (points: number[]) => void;
}) {
  const [pts, setPts] = useState<number[]>(points);
  useEffect(() => { if (open) setPts(points); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, text]);

  const segs = segmentsFromPoints(text, pts);
  const perSeg = segs.length > 0 && duration > 0 ? duration / segs.length : 0;

  const toggle = (idx: number) => {
    setPts((prev) => {
      const has = prev.includes(idx);
      const next = has ? prev.filter((p) => p !== idx) : [...prev, idx];
      return next.sort((a, b) => a - b).slice(0, 9);
    });
  };

  const colors = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];
  const segIndexAt = (i: number) => pts.filter((p) => p <= i).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-black sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Caler les étapes de découpe au caractère</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-neutral-600">
          Cliquez sur un caractère pour poser (ou retirer) un point de coupe juste avant lui. Chaque couleur = une étape affichée à l'écran.
        </p>
        <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 leading-loose text-[15px]">
          {text.split("").map((ch, i) => {
            const isCut = pts.includes(i);
            const color = colors[segIndexAt(i) % colors.length];
            return (
              <span
                key={i}
                role="button"
                tabIndex={-1}
                onClick={() => i > 0 && toggle(i)}
                className={cn("cursor-pointer", isCut && "border-l-2 pl-0.5")}
                style={{ color, borderColor: isCut ? color : undefined }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            );
          })}
        </div>
        <div className="space-y-1">
          {segs.map((t, i) => (
            <div key={i} className="flex gap-2 text-[11px]">
              <span className="shrink-0 font-bold tabular-nums" style={{ color: colors[i % colors.length] }}>
                Étape {i + 1} · {perSeg.toFixed(1)}s
              </span>
              <span className="text-neutral-700">{t}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPts([])}>Tout effacer</Button>
          <Button variant="outline" size="sm" onClick={() => setPts(evenSplitPoints(text, Math.max(2, segs.length)))}>
            Répartir équitablement
          </Button>
          <Button size="sm" onClick={() => onSubmit(pts)}>Appliquer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
