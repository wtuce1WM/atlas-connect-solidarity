import { Clock, MapPin, MessageSquare, Star, Download, QrCode, Calendar } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Scene = {
  id: string;
  label: string;
  duration: number;
  start: number;
  description: string;
  keywords: string[];
  icon: "hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro";
};

export type Scenario = {
  scenes: Scene[];
  totalDuration: number;
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
};

const LABELS: Record<Scene["icon"], string> = {
  hook: "Hook",
  name: "Nom & identité",
  media: "Médias",
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
      label: labelOverride || LABELS[icon],
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
  } else {
    push("media", Math.max(4, Math.round(durationSec * 0.22)), "Montage des médias sélectionnés pour montrer l'expérience.");
  }

  if (options.reviews) {
    push("reviews", Math.max(2, Math.round(durationSec * 0.12)), "Badge avis clients avec note/20 et nombre d'avis.");
  }
  if (options.hours) {
    push("hours", Math.max(2, Math.round(durationSec * 0.08)), "Horaires d'ouverture en surimpression.");
  }
  if (options.mapMarker) {
    push("map", Math.max(2, Math.round(durationSec * 0.1)), "Marqueur Google Map et localisation.");
  }
  if (options.digitalId) {
    push("digital", Math.max(2, Math.round(durationSec * 0.1)), "Séquence ID numérique : fiche, partage, QR code.");
  }

  push("cta", Math.max(2, Math.round(durationSec * 0.12)), options.installCta ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");

  if (options.installCta) {
    push("outro", Math.max(2, Math.round(durationSec * 0.08)), "Outro avec logo et appel à l'installation.");
  }

  const scale = durationSec / Math.max(1, cursor);
  const scaled = scenes.map((s) => ({ ...s, duration: Math.max(1, Math.round(s.duration * scale)), start: Math.round(s.start * scale) }));
  const total = scaled.reduce((acc, s) => acc + s.duration, 0);
  return { scenes: scaled, totalDuration: total };
}

export function scenarioFromTemplateProps(
  templateId: string,
  props: any,
  durationSec: number,
  rationale?: string
): Scenario {
  const scenes: Scene[] = [];
  let cursor = 0;
  const push = (icon: Scene["icon"], duration: number, description: string, labelOverride?: string, keywords: string[] = []) => {
    const start = cursor;
    cursor += duration;
    scenes.push({
      id: `${icon}-${scenes.length}`,
      icon,
      label: labelOverride || LABELS[icon],
      duration,
      start,
      description,
      keywords,
    });
  };

  const name = props?.name || "Établissement";
  const hook = typeof props?.hook === "string" ? props.hook.slice(0, 120) : "";
  const tagline = typeof props?.tagline === "string" ? props.tagline : "";
  const videos: string[] = Array.isArray(props?.videos) ? props.videos : [];
  const images: string[] = Array.isArray(props?.images) ? props.images : [];
  const offer = props?.offer && typeof props.offer === "object" ? props.offer : null;

  // Dedicated templates: minimal breakdown
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

  // business-showcase
  push("hook", Math.max(2, Math.round(durationSec * 0.12)), hook ? `Accroche : « ${hook} »` : `Accroche immersive sur ${name}.`);
  push("name", Math.max(2, Math.round(durationSec * 0.1)), tagline ? `${name} — ${tagline}` : `Affichage du nom ${name}.`);

  const mediaCount = videos.length + images.length;
  const mediaLabel = videos.length > 0
    ? `Montage de ${videos.length} vidéo${videos.length > 1 ? "s" : ""} de l'établissement.`
    : images.length > 0
      ? `Montage de ${images.length} image${images.length > 1 ? "s" : ""} de l'établissement.`
      : "Aucun média sélectionné — placeholder.";
  push("media", Math.max(3, Math.round(durationSec * (offer ? 0.18 : 0.28))), mediaLabel);

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
  if (props?.showOpeningHours) {
    push("hours", Math.max(2, Math.round(durationSec * 0.07)), "Horaires d'ouverture en surimpression.");
  }
  if (props?.showMap) {
    push("map", Math.max(2, Math.round(durationSec * 0.09)), `Marqueur Google Map${props.address ? ` — ${String(props.address).slice(0, 60)}` : ""}.`);
  }
  if (props?.showDigitalId) {
    push("digital", Math.max(2, Math.round(durationSec * 0.1)), "ID numérique : capture fiche, partage, QR code.");
  }

  push("cta", Math.max(2, Math.round(durationSec * 0.1)), props?.showAppInstall ? "CTA final + incitation à installer l'app." : "CTA final vers la fiche ou le contact.");
  if (props?.showAppInstall) {
    push("outro", Math.max(2, Math.round(durationSec * 0.06)), "Outro logo + installation de l'app.");
  }

  return normalize(scenes, durationSec, cursor);
}

function normalize(scenes: Scene[], durationSec: number, cursor: number): Scenario {
  const scale = durationSec / Math.max(1, cursor);
  const scaled = scenes.map((s) => ({ ...s, duration: Math.max(1, Math.round(s.duration * scale)), start: Math.round(s.start * scale) }));
  const total = scaled.reduce((acc, s) => acc + s.duration, 0);
  return { scenes: scaled, totalDuration: total };
}

export function StudioVideoScenarioPanel({
  scenario,
  className,
}: {
  scenario: Scenario;
  className?: string;
}) {
  const total = scenario.totalDuration;
  if (!scenario.scenes.length) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 space-y-5", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">Aperçu du scénario</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tight italic">
          AI Optimized
        </span>
      </div>

      <div className="space-y-3">
        {scenario.scenes.map((scene) => (
          <div
            key={scene.id}
            className="relative bg-background rounded-xl border border-border p-4 overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80" />
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                {ICONS[scene.icon]}
                <span>{scene.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(scene.start)} - {formatTime(scene.start + scene.duration)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic">{scene.description}</p>
            {scene.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {scene.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-[10px] bg-secondary/10 text-secondary-foreground px-2 py-0.5 rounded border border-secondary/20"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Timeline de production</div>
          <div className="text-[10px] text-muted-foreground">{scenario.scenes.length} scènes · {total}s</div>
        </div>
        <div className="flex gap-1 h-10">
          {scenario.scenes.map((scene) => {
            const width = total > 0 ? Math.max(4, (scene.duration / total) * 100) : 0;
            return (
              <div
                key={scene.id}
                className="relative flex flex-col justify-center px-2 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer overflow-hidden"
                style={{ width: `${width}%`, minWidth: "48px" }}
                title={`${scene.label} · ${scene.duration}s`}
              >
                <span className="text-[9px] font-bold truncate text-foreground">{scene.label}</span>
                <div className="h-1 mt-1 rounded-full bg-primary/60" />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
          <span>00:00s</span>
          <span>{formatTime(total / 4)}</span>
          <span>{formatTime(total / 2)}</span>
          <span>{formatTime((total * 3) / 4)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.round(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}s`;
}
