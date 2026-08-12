import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { WEATHER_CITY_OPTIONS, TIDES_CITY_OPTIONS } from "@/lib/videoWidgetCities";
import { isInternalVideoUrl } from "@/lib/videoSourceFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wand2, Download, Sparkles, X, Trash2, Globe, BarChart3, Video, LogOut, Maximize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, GripVertical, Share2, Pencil, SlidersHorizontal, FileText, Crosshair, Target } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { welcomeBadgeLabel, propositionLabel, WELCOME_BADGE_CODES, PROPOSITION_CODES } from "@/lib/ctaBadgeLabels";
import { StudioVideoScenarioPanel, buildScenario, extractKeywords, scenarioFromTemplateProps, type Scenario, type SceneMediaMap, type SceneMediaItem, type ScenarioEdits } from "@/components/StudioVideoScenarioPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { preflightMedia, type PreflightEntry, type PreflightIssue } from "@/lib/videoMediaPreflight";


import maisonBrummellAsset from "@/assets/maison-brummell.mp4.asset.json";
import riadDarNajatAsset from "@/assets/riad-dar-najat.mp4.asset.json";
import narComplexeAsset from "@/assets/nar-complexe.mp4.asset.json";
import farashaAsset from "@/assets/farasha-farmhouse.mp4.asset.json";
import boZinAsset from "@/assets/bo-zin.mp4.asset.json";

import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount, formatRating } from "@/lib/ratingUtils";
import type { PlaceOption } from "@/components/StudioVideoScenarioPanel";
import { useVideoScenarioSteps, applyStepsConfig, configOrder } from "@/hooks/useVideoScenarioSteps";

const maisonBrummellVideo = maisonBrummellAsset.url;
const riadDarNajatVideo = riadDarNajatAsset.url;
const narComplexeVideo = narComplexeAsset.url;
const farashaVideo = farashaAsset.url;
const boZinVideo = boZinAsset.url;

type ShowcaseItem = { title: string; src: string; prompt: string };

const SHOWCASE_BUSINESS: ShowcaseItem[] = [
  {
    title: "Comptoir Darna — Patio & Club",
    src: "/showcase/comptoir-darna-patio-club_v4.mp4",
    prompt:
      "Vidéo immersive verticale 720x1280 de ~17s pour présentation de Comptoir Darna Patio & Club. Utiliser d'autres vidéos de fond dans l'ordre du sort-order interne, diminuer la taille du texte « dîner spectacle & gastronomie », prendre 2s de plus pour les avis client, utiliser le même badge que dans le slidepanel de /search avec effet liquidglass.",
  },
  {
    title: "Riad Dar Najat",
    src: riadDarNajatVideo,
    prompt:
      "Vidéo de ~19s pour Riad Dar Najat. Utiliser la vidéo YouTube bbzHKcy5miM à partir de 3:46 en cover plein écran vertical avec un léger pan, garder le son, même squelette que Comptoir Darna. Note/20 et nombre d'avis empilés verticalement pour éviter le saut visuel.",
  },
  {
    title: "Maison Brummell Majorelle",
    src: maisonBrummellVideo,
    prompt:
      "À partir de riad-dar-najat.mp4, créer la vidéo pour Maison Brummell Majorelle en reprenant les vidéos internes (selon sort-order) et en mettant en avant le Titre et le Texte de l'image Popup.",
  },
  {
    title: "Jnane Rumi",
    src: "/showcase/jnane-rumi.mp4",
    prompt:
      "Vidéo immersive 720x1280 ~17s pour Jnane Rumi avec ses propres vidéos. Utiliser le hook de l'établissement. Mettre en avant le badge des avis client (note/20 + nombre d'avis). Terminer par une incitation à installer l'App.",
  },
  {
    title: "N.A.R Complexe Sportif",
    src: narComplexeVideo,
    prompt:
      "Vidéo immersive 720x1280 ~17s pour N.A.R Complexe Sportif avec ses propres vidéos. Utiliser le hook. Mettre en avant les 4 offres rattachées et le badge des avis (note/20 + nombre d'avis). Terminer par une incitation à installer l'App avec bouton carré sur fond terracotta inspiré de /install mobile.",
  },
  {
    title: "The Farasha Farmhouse",
    src: farashaVideo,
    prompt:
      "Vidéo immersive 720x1280 ~17s pour The Farasha Farmhouse avec uniquement ses images (pas les vidéos). Utiliser le hook pour mettre en avant le côté Ferme Pédagogique. Mettre en avant le Popup et la seule offre rattachée. Badge des avis (note/20 + nombre d'avis). Terminer par incitation à installer l'App, bouton carré terracotta inspiré de /install mobile.",
  },
  {
    title: "Bô Zin (scénario Signature 27s)",
    src: boZinVideo,
    prompt:
      "Scénario « Signature 27s » en 9 étapes : Hook, Nom, Identité, Wow (Popup), Offres, Preuve sociale (Avis), Localisation, CTA principal, Outro App — appliqué à Bô Zin.",
  },
];

const SHOWCASE_FEATURES: ShowcaseItem[] = [
  {
    title: "Agent IA — Démo (animation)",
    src: "/showcase/agent-ia-demo.mp4",
    prompt:
      "Démo de l'agent IA en vidéo immersive verticale 720x1280, ~17s. Concept « Pose ta question, vis ton Maroc » : Hook, Question, Réponse magique, Carte vivante, Affinage, CTA final. UI 100% Remotion.",
  },
  {
    title: "Agent IA — Screencast",
    src: "/showcase/agent-ia-screencast.mp4",
    prompt:
      "Démo de l'agent IA — version screencast réel ~25s, capturé via Playwright sur la vraie interface de /search?tab=ai.",
  },
  {
    title: "Agent IA — Démo v2 (carte géolocalisée)",
    src: "/showcase/agent-ia-demo-v2.mp4",
    prompt:
      "Autre version de agent-ia-demo.mp4 avec ce scénario : « je cherche un centre aquatique à Marrakech pour passer la journée avec les enfants + sur la route de l'Ourika + avec un golf à côté ». Montrer l'utilisation de la Google Map en étant géolocalisé (marqueur « vous êtes là »).",
  },
];


type Business = { id: string; name: string; city: string | null };
type TransitionEffectId = "crossfade" | "fade_black" | "wipe" | "zoom" | "kenburns" | "slide" | "cut" | "fast" | "mix";
const TRANSITION_EFFECT_LABELS: Record<TransitionEffectId, string> = {
  crossfade: "Fondu enchaîné",
  fade_black: "Fondu au noir",
  wipe: "Wipe latéral",
  zoom: "Zoom doux",
  kenburns: "Ken Burns (pan + zoom)",
  slide: "Glissement",
  cut: "Coupe franche",
  fast: "Enchaînement rapide",
  mix: "Mix (tous les effets)",
};
const TRANSITION_STYLE_PRESETS: Record<"auto" | "doux" | "dynamique" | "minimal", { video: TransitionEffectId; image: TransitionEffectId }> = {
  auto: { video: "crossfade", image: "kenburns" },
  doux: { video: "crossfade", image: "crossfade" },
  dynamique: { video: "zoom", image: "slide" },
  minimal: { video: "cut", image: "fade_black" },
};

type Job = {
  id: string;
  business_id: string | null;
  prompt: string;
  user_id?: string | null;
  duration_sec: number;
  tone: string;
  status: "pending" | "rendering" | "done" | "error";
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  title?: string | null;
  scenario_json?: any;
  template_props?: any;
};

const DURATIONS = [15, 30, 45, 60] as const;
// Options gelées pour l'instant : on conserve les valeurs (utilisées côté logique
// et jobs existants) mais on ne les propose plus dans l'UI.
const VISIBLE_DURATIONS: number[] = [];

function getVideoDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video.duration);
    video.onerror = () => resolve(null);
    video.src = url;
    setTimeout(() => resolve(null), 10000);
  });
}

function formatVideoDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slugifyFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "video"
  );
}

function StudioIdentity({
  affiliateInfo,
  staffProfile,
  isStaff,
}: {
  affiliateInfo: { name: string | null; contact_name: string | null; contact_email: string | null } | null;
  staffProfile: { first_name: string | null; last_name: string | null; email: string | null } | null;
  isStaff: boolean;
}) {
  const company = isStaff ? "One World Morocco" : (affiliateInfo?.name || null);
  const contactName = isStaff
    ? [staffProfile?.first_name, staffProfile?.last_name].filter(Boolean).join(" ") || null
    : (affiliateInfo?.contact_name || null);
  const email = isStaff ? (staffProfile?.email || null) : (affiliateInfo?.contact_email || null);
  if (!company && !contactName && !email) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
      {company && <span className="font-semibold text-white">{company}</span>}
      {contactName && <span>{contactName}</span>}
      {email && <span className="text-white/60">{email}</span>}
    </div>
  );
}

const TONES = [

  { value: "immersif", label: "Immersif" },
  // Gelés pour l'instant — conservés pour les jobs existants
  { value: "dynamique", label: "Dynamique", frozen: true },
  { value: "elegant", label: "Élégant", frozen: true },
];
const VISIBLE_TONES = TONES.filter((t) => !t.frozen);

const edgeErrorMessage = async (e: any, fallback: string) => {
  try {
    const ctx = e?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    }
    if (ctx && typeof ctx.text === "function") {
      const t = await ctx.clone().text();
      if (t) return t.slice(0, 300);
    }
  } catch { /* ignore */ }
  return e?.message ?? fallback;
};

/** Décode les entités HTML (&amp;, &eacute;, &#39;…) pour l'affichage vidéo. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç",
  ugrave: "ù", ucirc: "û", icirc: "î", iuml: "ï", ocirc: "ô", euml: "ë", uuml: "ü",
  hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—",
  deg: "°", euro: "€", middot: "·", times: "×", copy: "©", reg: "®", trade: "™",
};
export const decodeHtmlEntities = (input: string): string =>
  (input || "")
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[String(n).toLowerCase()] ?? m);

/** Options d'effet de mouvement (identiques côté Remotion). */
const MOTION_EFFECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "zoom_in", label: "Zoom in" },
  { value: "zoom_out", label: "Zoom out" },
  { value: "pan_left", label: "Panoramique gauche" },
  { value: "pan_right", label: "Panoramique droite" },
  { value: "pan_down", label: "Panoramique bas" },
  { value: "pan_up", label: "Panoramique haut" },
  { value: "scroll_v", label: "Défilé vertical" },
];


export default function StudioVideo() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasDashboard, setHasDashboard] = useState(false);
  const [hasVideoStudio, setHasVideoStudio] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [studioMode, setStudioModeState] = useState<"business" | "corporate" | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem("studio-video:mode") as "business" | "corporate" | null) : null)
  );
  const setStudioMode = (m: "business" | "corporate" | null) => {
    setStudioModeState(m);
    if (typeof window === "undefined") return;
    if (m) localStorage.setItem("studio-video:mode", m);
    else localStorage.removeItem("studio-video:mode");
  };
  const [hasStudioRole, setHasStudioRole] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<string[] | null>(null); // null = not loaded, [] = none
  const [affiliateInfo, setAffiliateInfo] = useState<{ name: string | null; contact_name: string | null; contact_email: string | null } | null>(null);
  const [staffProfile, setStaffProfile] = useState<{ first_name: string | null; last_name: string | null; email: string | null } | null>(null);



  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyEmailTo, setNotifyEmailTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setAuthState(data.user ? "in" : "out");
      setCurrentUserId(data.user?.id ?? null);
      if (data.user?.email) setNotifyEmailTo((prev) => prev || data.user!.email!);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session?.user ? "in" : "out");
      setCurrentUserId(session?.user?.id ?? null);
      if (session?.user?.email) setNotifyEmailTo((prev) => prev || session.user!.email!);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);


  useEffect(() => {
    if (authState !== "in") return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      // Detect staff/admin role and load identity info
      const [{ data: staffRow }, { data: studioRow }, { data: affiliate }, { data: profile }] = await Promise.all([
        supabase.rpc("is_staff", { _user_id: uid }),
        supabase.rpc("has_role", { _user_id: uid, _role: "video_studio" as any }),
        supabase
          .from("affiliates")
          .select("id, name, contact_name, contact_email, has_dashboard, has_video_studio")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      const staff = !!staffRow || !!studioRow;
      setIsStaff(staff);
      setHasStudioRole(!!studioRow);
      if (affiliate) {
        setHasDashboard(!!(affiliate as any).has_dashboard);
        setHasVideoStudio(!!(affiliate as any).has_video_studio);
        setAffiliateInfo({
          name: (affiliate as any).name || null,
          contact_name: (affiliate as any).contact_name || null,
          contact_email: (affiliate as any).contact_email || null,
        });
      }
      if (staff) {
        setStaffProfile({
          first_name: (profile as any)?.first_name || null,
          last_name: (profile as any)?.last_name || null,
          email: session.user.email || null,
        });
      }


      if (!staff && affiliate?.id) {
        const { data: bizList } = await supabase
          .from("businesses")
          .select("id, name, city")
          .eq("affiliate_id", (affiliate as any).id)
          .order("name");
        const ids = (bizList ?? []).map((b: any) => b.id);
        setOwnedBusinessIds(ids);
        // Pre-populate the picker with the affiliate's businesses
        setBusinesses((bizList ?? []) as Business[]);
      } else if (staff) {
        setOwnedBusinessIds(null);
      } else {
        setOwnedBusinessIds([]);
      }
      if (!staff) setStudioMode("business");
      setAccessChecked(true);
    })();
  }, [authState]);

  /** Le mode établissement est réservé aux comptes ayant l'accès Studio Vidéo. */
  const canBusinessMode = hasStudioRole || hasVideoStudio;

  useEffect(() => {
    if (!accessChecked) return;
    if (studioMode === "business" && !canBusinessMode) setStudioMode("corporate");
  }, [accessChecked, studioMode, canBusinessMode]);


  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [durationAuto, setDurationAuto] = useState(true);
  const [tone, setTone] = useState("immersif");
  // Langue du montage vidéo — indépendante de la langue du header du front.
  const [videoLang, setVideoLang] = useState<"fr" | "en">("fr");
  // Format de sortie de la vidéo (canvas Remotion). 720×1280 par défaut.
  const VIDEO_FORMATS = [
    { value: "portrait" as const, label: "Vertical 720×1280", w: 720, h: 1280 },
    { value: "landscape" as const, label: "Horizontal 1280×720", w: 1280, h: 720 },
  ];
  const [videoFormat, setVideoFormat] = useState<"portrait" | "landscape">("portrait");
  const videoCanvas = VIDEO_FORMATS.find((f) => f.value === videoFormat) ?? VIDEO_FORMATS[0];

  const [poiOptions, setPoiOptions] = useState<PlaceOption[]>([]);
  const [destOptions, setDestOptions] = useState<PlaceOption[]>([]);
  const [blogPosts, setBlogPosts] = useState<{ id: string; slug: string; title: string; cover: string | null }[]>([]);
  const [optBlogArticles, setOptBlogArticles] = useState(false);
  const [selectedBlogIds, setSelectedBlogIds] = useState<Set<string>>(new Set());
  const [blogMode, setBlogMode] = useState<"scroll" | "hero_map">("hero_map");
  /** Effet visuel par article de blog (surclasse le mode global). */
  const [blogModes, setBlogModes] = useState<Record<string, "scroll" | "hero_map">>({});
  const [prompt, setPrompt] = useState("");
  // --- Synthèse « À partir de la vidéo » (Titre + Texte) ---
  const [fromVideoOn, setFromVideoOn] = useState(false);
  const [fromVideoUrl, setFromVideoUrl] = useState<string | null>(null);
  const [fromVideoLoading, setFromVideoLoading] = useState(false);
  const [synthTitle, setSynthTitle] = useState("");
  const [synthText, setSynthText] = useState("");
  // Ligne d'offre (ex. « Vente — Prix: Sur demande ») affichée en animation graphique discrète
  const [synthPriceLine, setSynthPriceLine] = useState("");
  // --- Estimation de durée ---
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateText, setEstimateText] = useState("");
  const [estimateResult, setEstimateResult] = useState<{ seconds: number; words: number; chars: number } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [wordsPerBlock, setWordsPerBlock] = useState(12);
  const [pendingCustomScene, setPendingCustomScene] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[]>([]);
  const [preflightOpen, setPreflightOpen] = useState(false);

  const [previewing, setPreviewing] = useState(false);
  const [scenarioPreviewed, setScenarioPreviewed] = useState(false);
  const [aiScenario, setAiScenario] = useState<{ scenario: Scenario; rationale?: string; templateId: string } | null>(null);
  const [aiScenarioSig, setAiScenarioSig] = useState<string | null>(null);
  const [scenarioEdits, setScenarioEdits] = useState<ScenarioEdits | null>(null);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [currentJobId, setCurrentJobIdState] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("studio-video:currentJobId") : null)
  );
  const setCurrentJobId = (id: string | null) => {
    setCurrentJobIdState(id);
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem("studio-video:currentJobId", id);
    else localStorage.removeItem("studio-video:currentJobId");
  };
  const [refineFrom, setRefineFrom] = useState<Job | null>(null);
  const [bizStats, setBizStats] = useState<{
    hook: string | null;
    descLen: number;
    images: number;
    videos: number;
    offers: number;
    popup: boolean;
    hoursPublished: boolean;
    isActive: boolean;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [optReviews, setOptReviews] = useState(true);
  const [optGoogleReviews, setOptGoogleReviews] = useState(false);
  const [optTripAdvisor, setOptTripAdvisor] = useState(false);
  const [optRestaurantGuru, setOptRestaurantGuru] = useState(false);
  const [optCustomerReview, setOptCustomerReview] = useState(false);
  const [optHours, setOptHours] = useState(true);
  const [optInstallCta, setOptInstallCta] = useState(true);
  const [optMapMarker, setOptMapMarker] = useState(true);
  const [optDigitalId, setOptDigitalId] = useState(true);
  const [optPopup, setOptPopup] = useState(true);
  // Carte IA : carte « Offre » entièrement rédigée par l'IA (pas issue de la base).
  const [optAiCard, setOptAiCard] = useState(false);
  const [optOpenWithLogo, setOptOpenWithLogo] = useState(true);
  // BIENVENUE / PROPOSITION (Présence en ligne / CTAs) — étapes optionnelles juste après le logo.
  const [optWelcome, setOptWelcome] = useState(true);
  const [optProposition, setOptProposition] = useState(true);
  const [ctaBadges, setCtaBadges] = useState<{ carousel: string | null; proposition: string | null }>({ carousel: null, proposition: null });
  const [optWhatsapp, setOptWhatsapp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [logoInfo, setLogoInfo] = useState<{ url: string | null; bg: string | null }>({ url: null, bg: null });
  const [platformData, setPlatformData] = useState<{
    google: { rating: number | null; count: number | null; url: string | null };
    tripadvisor: { rating: number | null; count: number | null; url: string | null };
    restaurant_guru: { rating: number | null; count: number | null; url: string | null };
  }>({
    google: { rating: null, count: null, url: null },
    tripadvisor: { rating: null, count: null, url: null },
    restaurant_guru: { rating: null, count: null, url: null },
  });
  const [reviewsAggregate, setReviewsAggregate] = useState<{ avgOn20: number | null; total: number }>({ avgOn20: null, total: 0 });
  const [reviewsList, setReviewsList] = useState<Array<{ id: string; author: string | null; rating: number | null; text: string; source: string | null; published_at: string | null }>>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewHighlight, setReviewHighlight] = useState<string>("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [offersList, setOffersList] = useState<Array<{ id: string; title: string; message: string | null; promotion_type: string | null; promotion_value: number | null; promotion_currency: string | null; savings_amount: number | null }>>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(new Set());
  const [highlightsList, setHighlightsList] = useState<Array<{ id: string; icon: string | null; title: string; description: string; image_url: string | null; metric_title: string | null; metric_value: string | null; sort_order: number }>>([]);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<Set<string>>(new Set());
  // Résumés IA du menu (business_menu_summaries)
  const [aiSummariesList, setAiSummariesList] = useState<Array<{ id: string; title: string; content: string }>>([]);
  // Textes IA du Master (business_ai_texts) — onglet TXT IA de Présence en ligne
  const [aiTextsList, setAiTextsList] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [selectedAiTextIds, setSelectedAiTextIds] = useState<Set<string>>(new Set());
  const [aiTextEffects, setAiTextEffects] = useState<Record<string, string>>({});
  const [selectedAiSummaryIds, setSelectedAiSummaryIds] = useState<Set<string>>(new Set());
  // Effet visuel appliqué au média de fond des séquences « Résumé IA »
  const [aiSummaryEffect, setAiSummaryEffect] = useState<string>("zoom_in");
  // Effet de mouvement propre à chaque bloc highlight / résumé IA (clé = id)
  const [highlightEffects, setHighlightEffects] = useState<Record<string, string>>({});
  const [aiSummaryEffects, setAiSummaryEffects] = useState<Record<string, string>>({});

  // Widgets embarqués dans la vidéo (Météo / Marées, Vents & Météo)
  const [optWeatherWidget, setOptWeatherWidget] = useState(false);
  const [weatherRange, setWeatherRange] = useState<1 | 3 | 7>(1);
  const [weatherCity, setWeatherCity] = useState<string>("marrakech");
  const [optTidesWidget, setOptTidesWidget] = useState(false);
  const [tidesMode, setTidesMode] = useState<"all" | "tides" | "wind" | "weather">("all");
  const [tidesCity, setTidesCity] = useState<string>("essaouira");

  // Liens externes (business_documents type external_link) — libellé = description (Media, Partenaires…)
  const [externalLinksList, setExternalLinksList] = useState<Array<{ id: string; name: string; label: string; url: string; image: string | null }>>([]);
  const [selectedExternalLinkIds, setSelectedExternalLinkIds] = useState<Set<string>>(new Set());
  // Menus / cartes (business_documents type menu) — libellé libre (Menu, Carte, Drinks…)
  const [menuDocsList, setMenuDocsList] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [selectedMenuDocIds, setSelectedMenuDocIds] = useState<Set<string>>(new Set());
  const [bizImages, setBizImages] = useState<string[]>([]);
  const [bizVideos, setBizVideos] = useState<{ url: string; thumbnail: string | null; title: string; kind: "file" | "youtube"; duration?: number }[]>([]);
  // Vidéos génériques (mode corporate) : externes = badge « Generic » sur business_documents, internes = jobs Feed / Corporate
  type GenericVideoItem = { url: string; thumbnail: string | null; title: string; kind: "file" | "youtube"; duration?: number };
  const [genericExternalVideos, setGenericExternalVideos] = useState<GenericVideoItem[]>([]);
  const [genericInternalVideos, setGenericInternalVideos] = useState<GenericVideoItem[]>([]);
  const [showGenericVideos, setShowGenericVideos] = useState(true);
  const [genericTab, setGenericTab] = useState<"external" | "internal">("external");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Mode "une seule vidéo en fond continu"
  const [continuousBg, setContinuousBg] = useState(false);
  const [continuousBgUrl, setContinuousBgUrl] = useState<string>("");
  const [continuousPickerOpen, setContinuousPickerOpen] = useState(false);
  const [continuousBgSound, setContinuousBgSound] = useState(false);
  // Bande son issue d'une vidéo (prioritaire sur le son de la vidéo de fond continue)
  const [soundtrackOn, setSoundtrackOn] = useState(false);
  const [soundtrackUrl, setSoundtrackUrl] = useState<string>("");
  const [soundtrackPickerOpen, setSoundtrackPickerOpen] = useState(false);

  // Ordre de montage des vidéos sélectionnées (glisser / déposer)
  const [videoOrder, setVideoOrder] = useState<string[]>([]);
  const [dragUrl, setDragUrl] = useState<string | null>(null);
  // Point de départ (secondes, précision 0,1 s) par vidéo sélectionnée
  const [videoStarts, setVideoStarts] = useState<Record<string, number>>({});
  // Point de fin (secondes, précision 0,1 s) par vidéo
  const [videoEnds, setVideoEnds] = useState<Record<string, number>>({});
  // Position de lecture courante des vignettes de montage (aide au réglage du Time Start)
  const [playHeads, setPlayHeads] = useState<Record<string, number>>({});
  // Mémorisation locale des Time Start / Time End par établissement
  const trimLoadedFor = useRef<string | null>(null);



  const orderVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const gridVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});


  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [showEstablishment, setShowEstablishment] = useState(true);
  const [showCompose, setShowCompose] = useState(true);
  const [showScenario, setShowScenario] = useState(true);
  const [showActiveJob, setShowActiveJob] = useState(true);
  const [popupImageUrl, setPopupImageUrl] = useState<string | null>(null);
  const [popupMeta, setPopupMeta] = useState<{ title: string | null; description: string | null }>({ title: null, description: null });
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);
  const [sceneMedia, setSceneMedia] = useState<SceneMediaMap>({});
  const [textPosition, setTextPosition] = useState<"top" | "middle" | "bottom">("middle");
  // Transitions entre les plans
  const [transitionStyle, setTransitionStyle] = useState<"auto" | "doux" | "dynamique" | "minimal">("auto");
  const [transitionDifferentiate, setTransitionDifferentiate] = useState(true);
  const [transitionVideo, setTransitionVideo] = useState<TransitionEffectId>("crossfade");
  const [transitionImage, setTransitionImage] = useState<TransitionEffectId>("kenburns");
  useEffect(() => {
    const preset = TRANSITION_STYLE_PRESETS[transitionStyle];
    setTransitionVideo(preset.video);
    setTransitionImage(preset.image);
  }, [transitionStyle]);

  // Restaure les Time Start / Time End mémorisés pour l'établissement sélectionné
  useEffect(() => {
    const bizId = selected?.id ?? null;
    if (!bizId) {
      trimLoadedFor.current = null;
      return;
    }
    if (trimLoadedFor.current === bizId) return;
    trimLoadedFor.current = bizId;
    let starts: Record<string, number> = {};
    let ends: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(`studio-video:trim:${bizId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          starts = parsed.starts && typeof parsed.starts === "object" ? parsed.starts : {};
          ends = parsed.ends && typeof parsed.ends === "object" ? parsed.ends : {};
        }
      }
    } catch {
      /* stockage indisponible : on repart à zéro */
    }
    setVideoStarts(starts);
    setVideoEnds(ends);
  }, [selected?.id]);

  // Mémorise les Time Start / Time End à chaque modification
  useEffect(() => {
    const bizId = selected?.id ?? null;
    if (!bizId || trimLoadedFor.current !== bizId) return;
    try {
      localStorage.setItem(
        `studio-video:trim:${bizId}`,
        JSON.stringify({ starts: videoStarts, ends: videoEnds }),
      );
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [selected?.id, videoStarts, videoEnds]);

  // --- Persistance du Prompt & des Paramètres de la vidéo (par établissement) ---
  const PARAMS_KEY = `studio-video:params:${selected?.id ?? "corporate"}`;
  const paramsLoadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (paramsLoadedFor.current === PARAMS_KEY) return;
    paramsLoadedFor.current = PARAMS_KEY;
    try {
      const raw = localStorage.getItem(PARAMS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p || typeof p !== "object") return;
      if (typeof p.prompt === "string" && p.prompt.trim()) setPrompt(p.prompt);
      if (typeof p.tone === "string") setTone(p.tone);
      if ([15, 30, 45, 60].includes(p.duration)) setDuration(p.duration);
      if (typeof p.durationAuto === "boolean") setDurationAuto(p.durationAuto);
      if (p.videoLang === "fr" || p.videoLang === "en") setVideoLang(p.videoLang);
      const b = (v: unknown, set: (x: boolean) => void) => { if (typeof v === "boolean") set(v); };
      b(p.optReviews, setOptReviews);
      b(p.optGoogleReviews, setOptGoogleReviews);
      b(p.optTripAdvisor, setOptTripAdvisor);
      b(p.optRestaurantGuru, setOptRestaurantGuru);
      b(p.optCustomerReview, setOptCustomerReview);
      b(p.optHours, setOptHours);
      b(p.optInstallCta, setOptInstallCta);
      b(p.optMapMarker, setOptMapMarker);
      b(p.optDigitalId, setOptDigitalId);
      b(p.optPopup, setOptPopup);
      b(p.optAiCard, setOptAiCard);
      b(p.optOpenWithLogo, setOptOpenWithLogo);
      b(p.optWelcome, setOptWelcome);
      b(p.optProposition, setOptProposition);
      b(p.optWhatsapp, setOptWhatsapp);
      if (p.textPosition === "top" || p.textPosition === "middle" || p.textPosition === "bottom") setTextPosition(p.textPosition);
      if (typeof p.transitionStyle === "string") setTransitionStyle(p.transitionStyle);
      if (typeof p.aiSummaryEffect === "string") setAiSummaryEffect(p.aiSummaryEffect);
      if (p.blogMode === "scroll" || p.blogMode === "hero_map") setBlogMode(p.blogMode);
    } catch {
      /* stockage indisponible */
    }
  }, [PARAMS_KEY]);

  useEffect(() => {
    if (paramsLoadedFor.current !== PARAMS_KEY) return;
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify({
        prompt, tone, duration, durationAuto, videoLang,
        optReviews, optGoogleReviews, optTripAdvisor, optRestaurantGuru, optCustomerReview,
        optHours, optInstallCta, optMapMarker, optDigitalId,
        optPopup, optAiCard, optOpenWithLogo, optWelcome, optProposition, optWhatsapp,
        textPosition, transitionStyle, aiSummaryEffect, blogMode,
      }));
    } catch {
      /* quota / mode privé */
    }
  }, [
    PARAMS_KEY, prompt, tone, duration, durationAuto, videoLang,
    optReviews, optGoogleReviews, optTripAdvisor, optRestaurantGuru, optCustomerReview,
    optHours, optInstallCta, optMapMarker, optDigitalId,
    optPopup, optAiCard, optOpenWithLogo, optWelcome, optProposition, optWhatsapp,
    textPosition, transitionStyle, aiSummaryEffect, blogMode,
  ]);



  // Pool de vidéos sélectionnables : établissement + génériques (corporate).
  const videoPool = useMemo(
    () => [...bizVideos, ...genericExternalVideos, ...genericInternalVideos],
    [bizVideos, genericExternalVideos, genericInternalVideos],
  );

  // Garde l'ordre de montage synchronisé avec la sélection de vidéos.
  useEffect(() => {
    setVideoOrder((prev) => {
      const kept = prev.filter((u) => selectedVideos.has(u));
      const added = videoPool.map((v) => v.url).filter((u) => selectedVideos.has(u) && !kept.includes(u));
      const next = [...kept, ...added];
      return next.length === prev.length && next.every((u, i) => u === prev[i]) ? prev : next;
    });
  }, [selectedVideos, videoPool]);

  // Chargement des vidéos génériques (mode corporate uniquement).
  // Externes = business_documents (type=video) portant le badge « Generic ».
  // Internes = jobs terminés : Scénario Feed (/search) ou Studio Vidéo IA mode Corporate.
  useEffect(() => {
    if (studioMode !== "corporate") {
      setGenericExternalVideos([]);
      setGenericInternalVideos([]);
      return;
    }
    let cancelled = false;
    const kindOf = (u: string): "file" | "youtube" =>
      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u) ? "file" : "youtube";
    (async () => {
      // 1) Badge « Generic »
      const { data: badgeRows } = await supabase
        .from("badges")
        .select("id, name_fr")
        .ilike("name_fr", "generic");
      const badgeId = (badgeRows || [])[0]?.id as string | undefined;

      let badgedDocIds: string[] = [];
      if (badgeId) {
        const { data: links } = await supabase
          .from("business_document_badges")
          .select("document_id")
          .eq("badge_id", badgeId)
          .limit(2000);
        badgedDocIds = [...new Set((links || []).map((l: any) => String(l.document_id)))];
      }

      const [{ data: docs }, { data: jobs }] = await Promise.all([
        badgedDocIds.length
          ? supabase
              .from("business_documents")
              .select("id, url, name, thumbnail_url, business_is_active, type, youtube_video_url, instagram_video_url, tiktok_video_url")
              .in("id", badgedDocIds)
              .eq("type", "video")
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("video_jobs")
          .select("id, output_url, title, prompt, created_at, template_id, business_id")
          .not("output_url", "is", null)
          .eq("status", "done")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (cancelled) return;

      const seen = new Set<string>();
      const ext: GenericVideoItem[] = [];
      for (const d of (docs || []) as any[]) {
        if (d.business_is_active === false) continue;
        const url = d.youtube_video_url || d.instagram_video_url || d.tiktok_video_url || d.url;
        if (!url) continue;
        const key = String(url).trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        ext.push({
          url: String(url),
          thumbnail: (d.thumbnail_url as string) || null,
          title: (d.name || "Vidéo Generic") as string,
          kind: kindOf(String(url)),
        });
      }
      setGenericExternalVideos(ext);

      setGenericInternalVideos(
        ((jobs || []) as any[])
          .filter((j) => String(j.template_id || "").startsWith("feed-template") || !j.business_id)
          .map((j: any) => ({
            url: j.output_url as string,
            thumbnail: null,
            title: (j.title || j.prompt || "Vidéo 1WM")?.toString().slice(0, 70) as string,
            kind: "file" as const,
          })),
      );
    })();
    return () => { cancelled = true; };
  }, [studioMode]);


  const orderedSelectedVideos = useMemo(
    () => videoOrder.filter((u) => selectedVideos.has(u)),
    [videoOrder, selectedVideos],
  );

  // Time Start actifs, bornés à la sélection courante (sécurité + payload propre)
  const activeVideoStarts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const u of orderedSelectedVideos) {
      const s = videoStarts[u];
      if (Number.isFinite(s) && (s as number) > 0) out[u] = Math.round((s as number) * 10) / 10;
    }
    return out;
  }, [orderedSelectedVideos, videoStarts]);

  // Time End actifs (doit rester > Time Start)
  const activeVideoEnds = useMemo(() => {
    const out: Record<string, number> = {};
    for (const u of orderedSelectedVideos) {
      const e = videoEnds[u];
      if (!Number.isFinite(e) || (e as number) <= 0) continue;
      const end = Math.round((e as number) * 10) / 10;
      if (end > (activeVideoStarts[u] ?? 0)) out[u] = end;
    }
    return out;
  }, [orderedSelectedVideos, videoEnds, activeVideoStarts]);

  // Durées réelles des vidéos sélectionnées : permet au montage de boucler le
  // clip quand l'étape dure plus longtemps que la vidéo de fond.
  const activeVideoDurations = useMemo(() => {
    const out: Record<string, number> = {};
    for (const u of orderedSelectedVideos) {
      const d = videoPool.find((x) => x.url === u)?.duration;
      if (Number.isFinite(d) && (d as number) > 0.5) out[u] = Math.round((d as number) * 10) / 10;
    }
    return out;
  }, [orderedSelectedVideos, videoPool]);


  // Durée totale utile des vidéos du montage (Time End − Time Start)
  const orderedVideosTotalDuration = useMemo(() => {
    let sum = 0;
    let unknown = 0;
    for (const u of orderedSelectedVideos) {
      const v = videoPool.find((x) => x.url === u);
      const end = activeVideoEnds[u] ?? v?.duration ?? null;
      if (end == null) { unknown += 1; continue; }
      sum += Math.max(0, end - (activeVideoStarts[u] ?? 0));
    }
    return { sum, unknown };
  }, [orderedSelectedVideos, videoPool, activeVideoStarts, activeVideoEnds]);

  /** Champs Time Start / Time End partagés par la grille des vidéos et l'ordre de montage. */
  const renderTimeRangeInputs = (url: string, duration?: number | null) => {
    const start = videoStarts[url] ?? 0;
    const end = videoEnds[url] ?? 0;
    const maxTime = duration != null ? Math.round(duration * 10) / 10 : 3600;
    return (
      <div className="grid grid-cols-2 gap-1">
        <Input
          type="number"
          step="0.1"
          min="0"
          max={maxTime}
          value={start ? String(start) : ""}
          placeholder="Start (s)"
          title="Point de départ de la vidéo en secondes (ex : 2.3)"
          className="h-8 text-xs"
          onChange={(e) => {
            const raw = e.target.value.trim();
            const n = parseFloat(raw);
            setVideoStarts((prev) => {
              const next = { ...prev };
              if (raw === "" || !Number.isFinite(n) || n <= 0) delete next[url];
              else next[url] = Math.min(maxTime, Math.round(n * 10) / 10);
              return next;
            });
          }}
        />
        <Input
          type="number"
          step="0.1"
          min="0"
          max={maxTime}
          value={end ? String(end) : ""}
          placeholder="End (s)"
          title="Point de fin de la vidéo en secondes (ex : 8.5)"
          className="h-8 text-xs"
          onChange={(e) => {
            const raw = e.target.value.trim();
            const n = parseFloat(raw);
            setVideoEnds((prev) => {
              const next = { ...prev };
              if (raw === "" || !Number.isFinite(n) || n <= 0) delete next[url];
              else next[url] = Math.min(maxTime, Math.round(n * 10) / 10);
              return next;
            });
          }}
        />
      </div>
    );
  };

  /** Champs Time Start / End + boutons de capture de la position de lecture. */
  const renderTimeRangeControls = (
    url: string,
    duration: number | null | undefined,
    refMap: React.MutableRefObject<Record<string, HTMLVideoElement | null>>,
  ) => {
    const capture = (which: "start" | "end") => {
      const el = refMap.current[url];
      if (!el || !Number.isFinite(el.currentTime)) return;
      const n = Math.round(el.currentTime * 10) / 10;
      const setter = which === "start" ? setVideoStarts : setVideoEnds;
      setter((prev) => {
        if (n > 0) return { ...prev, [url]: n };
        const c = { ...prev };
        delete c[url];
        return c;
      });
    };
    return (
      <div className="space-y-1">
        {renderTimeRangeInputs(url, duration)}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => capture("start")}
            title="Utiliser la position actuelle comme Time Start"
            className="flex-1 h-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => capture("end")}
            title="Utiliser la position actuelle comme Time End"
            className="flex-1 h-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
          >
            <Target className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };






  const moveVideo = (from: string, to: string) => {
    if (from === to) return;
    setVideoOrder((prev) => {
      const arr = prev.filter((u) => selectedVideos.has(u));
      const i = arr.indexOf(from);
      const j = arr.indexOf(to);
      if (i < 0 || j < 0) return prev;
      arr.splice(i, 1);
      arr.splice(j, 0, from);
      return arr;
    });
  };



  const availableSceneMedia = useMemo<SceneMediaItem[]>(() => {
    const imgs: SceneMediaItem[] = bizImages.map((url) => ({ url, kind: "image" }));
    const vids: SceneMediaItem[] = bizVideos
      .filter((v) => v.kind === "file")
      .map((v) => ({ url: v.url, kind: "video", title: v.title, thumbnail: v.thumbnail, duration: v.duration }));
    return [...imgs, ...vids];
  }, [bizImages, bizVideos]);

  // Combined media list for the lightbox slideshow (images first, then videos)
  const mediaItems = useMemo(() => {
    const imgs = bizImages.map((url) => ({ kind: "image" as const, url, title: "", thumbnail: null as string | null }));
    const vids = bizVideos.map((v) => ({ kind: v.kind === "youtube" ? ("youtube" as const) : ("video" as const), url: v.url, title: v.title, thumbnail: v.thumbnail }));
    return [...imgs, ...vids];
  }, [bizImages, bizVideos]);

  // En Mode établissement, la sélection d'établissement est obligatoire : on garde la
  // section ouverte tant qu'aucun établissement n'est choisi. Dès qu'un établissement change,
  // on ferme la section et on réinitialise l'aperçu du scénario (pour éviter les mélanges).
  useEffect(() => {
    if (selected) {
      setShowEstablishment(false);
      setScenarioPreviewed(false);
      setAiScenario(null);
    } else if (studioMode !== "corporate") {
      setShowEstablishment(true);
    }
  }, [studioMode, selected]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % mediaItems.length));
      else if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + mediaItems.length) % mediaItems.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, mediaItems.length]);

  // Autocomplete businesses
  useEffect(() => {
    // Affiliates: their list is preloaded and locked (no cross-search)
    if (!isStaff) return;
    if (query.length < 2) {
      setBusinesses([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,city")
        .ilike("name", `%${query}%`)
        .limit(8);
      setBusinesses(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, isStaff]);

  // Load business stats when selected
  useEffect(() => {
    if (!selected) {
      setBizStats(null);
      setBizImages([]);
      setBizVideos([]);
      setSelectedImages(new Set());
      setSelectedVideos(new Set());
      setSceneMedia({});
      setOffersList([]);
      setSelectedOfferIds(new Set());
      setHighlightsList([]);
      setSelectedHighlightIds(new Set());
      setReviewsList([]);
      setSelectedReviewId(null);
      setReviewHighlight("");
      setPlatformData({
        google: { rating: null, count: null, url: null },
        tripadvisor: { rating: null, count: null, url: null },
        restaurant_guru: { rating: null, count: null, url: null },
      });
      setReviewsAggregate({ avgOn20: null, total: 0 });
      return;
    }
    let cancelled = false;
    const isEn = videoLang === "en";
    setStatsLoading(true);
    setSelectedImages(new Set());
    setSelectedVideos(new Set());
    setSceneMedia({});
    (async () => {
      const [biz, docs, yt, promos, hls, revs] = await Promise.all([
        supabase
          .from("businesses")
          .select("carousel_badge,poi_business_style,hook_fr,hook_en,description,description_en,images,popup_image_url,opening_hours,show_opening_hours,is_active,logo_url,logo_bg,whatsapp,google_rating,google_review_count,google_review_url,google_reviews_url,google_maps_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,tripadvisor_review_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url,getyourguide_rating,getyourguide_review_count,viator_rating,viator_review_count,avis_verifies_rating,avis_verifies_review_count,trustpilot_rating,trustpilot_review_count,kayak_rating,kayak_review_count,tourradar_rating,tourradar_review_count")
          .eq("id", selected.id)
          .maybeSingle(),
        supabase
          .from("business_documents")
          .select("id,url,name,thumbnail_url,sort_order,type")
          .eq("business_id", selected.id)
          .eq("type", "video")
          .order("sort_order", { ascending: true }),
        supabase
          .from("business_youtube_videos")
          .select("id,video_id,title,thumbnail,custom_thumbnail_url,sort_order")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("affiliate_business_promotions")
          .select("id, title, title_fr, title_en, promotion_message, promotion_message_fr, promotion_message_en, promotion_type, promotion_value, promotion_currency, savings_amount")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("front_highlights")
          .select("id,icon,sort_order,image_url,title,description,metric_title,metric_value,title_fr,description_fr,metric_title_fr,metric_value_fr,title_en,description_en,metric_title_en,metric_value_en")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("reviews")
          .select("id,author_name,rating,text,text_fr,text_en,source,published_at,is_hidden")
          .eq("business_id", selected.id)
          .eq("is_hidden", false)
          .order("rating", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      const b: any = biz.data ?? {};
      const imgs: string[] = Array.isArray(b.images) ? b.images : [];
      const docVideos = ((docs.data ?? []) as any[])
        .filter((d) => d.url && isInternalVideoUrl(d.url))
        .map((d) => ({ url: d.url as string, thumbnail: (d.thumbnail_url as string) || null, title: (d.name as string) || "Vidéo", kind: "file" as const }));
      const ytVideos = ((yt.data ?? []) as any[]).map((v) => ({
        url: `https://www.youtube.com/watch?v=${v.video_id}`,
        thumbnail: (v.custom_thumbnail_url as string) || (v.thumbnail as string) || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
        title: (v.title as string) || "YouTube",
        kind: "youtube" as const,
      }));
      setBizImages(imgs);
      setBizVideos([...docVideos, ...ytVideos]);
      const popupUrl: string | null = b.popup_image_url && imgs.includes(b.popup_image_url) ? b.popup_image_url : null;
      setPopupImageUrl(popupUrl);
      setLogoInfo({ url: b.logo_url ?? null, bg: b.logo_bg ?? null });
      setCtaBadges({ carousel: (b.carousel_badge as string) ?? null, proposition: (b.poi_business_style as string) ?? null });
      setOptOpenWithLogo((b.logo_bg === "transparent") && !!b.logo_url);
      setWhatsappNumber((b.whatsapp as string) || null);
      setOptWhatsapp(false);
      setPopupMeta({ title: null, description: null });
      if (popupUrl) {
        supabase
          .from("business_image_titles")
          .select("title, description, title_fr, description_fr, title_en, description_en")
          .eq("business_id", selected.id)
          .eq("image_url", popupUrl)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled || !data) return;
            const d = data as any;
            setPopupMeta({
              title: (isEn ? (d.title_en || d.title_fr || d.title) : (d.title_fr || d.title)) ?? null,
              description: (isEn ? (d.description_en || d.description_fr || d.description) : (d.description_fr || d.description)) ?? null,
            });
          });
      }
      const oh = b.opening_hours;
      const hasHoursData = !!oh && (typeof oh === "string" ? oh.trim().length > 0 : (Array.isArray(oh) ? oh.length > 0 : Object.keys(oh).length > 0));
      const hoursPublished = b.show_opening_hours !== false && hasHoursData;
      const offersRaw = (promos.data ?? []) as any[];
      const mappedOffers = offersRaw.map((o) => ({
        id: o.id as string,
        title: ((isEn ? (o.title_en || o.title_fr) : o.title_fr) || o.title || "Offre") as string,
        message: ((isEn ? (o.promotion_message_en || o.promotion_message_fr) : o.promotion_message_fr) || o.promotion_message || null) as string | null,
        promotion_type: (o.promotion_type ?? null) as string | null,
        promotion_value: (o.promotion_value ?? null) as number | null,
        promotion_currency: (o.promotion_currency ?? null) as string | null,
        savings_amount: (o.savings_amount ?? null) as number | null,
      }));
      setOffersList(mappedOffers);
      setSelectedOfferIds(new Set(mappedOffers.map((o) => o.id)));
      const stripHtml = (s: string | null) => decodeHtmlEntities((s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const hlRaw = (hls.data ?? []) as any[];
      const mappedHl = hlRaw
        .map((h) => ({
          id: h.id as string,
          icon: (h.icon ?? null) as string | null,
          title: (isEn && stripHtml(h.title_en)) || stripHtml(h.title_fr) || stripHtml(h.title),
          description: (isEn && stripHtml(h.description_en)) || stripHtml(h.description_fr) || stripHtml(h.description),
          image_url: (h.image_url ?? null) as string | null,
          metric_title: ((isEn && stripHtml(h.metric_title_en)) || stripHtml(h.metric_title_fr) || stripHtml(h.metric_title)) || null,
          metric_value: ((isEn && stripHtml(h.metric_value_en)) || stripHtml(h.metric_value_fr) || stripHtml(h.metric_value)) || null,
          sort_order: (h.sort_order ?? 0) as number,
        }))
        .filter((h) => h.title.length > 0 || h.description.length > 0 || !!h.image_url);
      setHighlightsList(mappedHl);
      setSelectedHighlightIds(new Set(mappedHl.map((h) => h.id)));
      // Plateformes d'avis
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      setPlatformData({
        google: {
          rating: num(b.google_rating),
          count: num(b.google_review_count),
          url: (b.google_review_url || b.google_reviews_url || b.google_maps_url || null) as string | null,
        },
        tripadvisor: {
          rating: num(b.tripadvisor_rating),
          count: num(b.tripadvisor_review_count),
          url: (b.tripadvisor_review_url || b.tripadvisor_url || null) as string | null,
        },
        restaurant_guru: {
          rating: num(b.restaurant_guru_rating),
          count: num(b.restaurant_guru_review_count),
          url: (b.restaurant_guru_url || null) as string | null,
        },
      });
      // Agrégat pondéré sur les 9 sources d'avis (même méthode que le site)
      setReviewsAggregate({
        avgOn20: computeWeightedRatingOn20(collectRatingSources(b as any)),
        total: getTotalReviewCount(b as any),
      });
      // Avis clients
      const revsRaw = (revs.data ?? []) as any[];
      const mappedRevs = revsRaw
        .map((r) => ({
          id: r.id as string,
          author: (r.author_name ?? null) as string | null,
          rating: (r.rating ?? null) as number | null,
          text: stripHtml(((isEn ? (r.text_en || r.text_fr) : r.text_fr) || r.text || "") as string),
          source: (r.source ?? null) as string | null,
          published_at: (r.published_at ?? null) as string | null,
        }))
        .filter((r) => r.text.length > 0);
      setReviewsList(mappedRevs);
      setSelectedReviewId(null);
      setReviewHighlight("");
      setBizStats({
        hook: (isEn ? (b.hook_en || b.hook_fr) : b.hook_fr) ?? null,
        descLen: (b.description ?? "").length,
        images: imgs.length,
        videos: docVideos.length + ytVideos.length,
        offers: mappedOffers.length,
        popup: !!b.popup_image_url,
        hoursPublished,
        isActive: b.is_active !== false,
      });
      setStatsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, videoLang]);

  // Résumés IA du menu, liens externes et menus/cartes de l'établissement
  useEffect(() => {
    if (!selected) {
      setAiSummariesList([]); setSelectedAiSummaryIds(new Set());
      setAiTextsList([]); setSelectedAiTextIds(new Set());
      setExternalLinksList([]); setSelectedExternalLinkIds(new Set());
      setMenuDocsList([]); setSelectedMenuDocIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const [sums, docs, aiTxts] = await Promise.all([
        supabase
          .from("business_menu_summaries")
          .select("id,title,content,sort_order")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("business_documents")
          .select("id,type,name,description,url,icon,sort_order")
          .eq("business_id", selected.id)
          .in("type", ["external_link", "menu"])
          .order("sort_order", { ascending: true }),
        supabase
          .from("business_ai_texts")
          .select("id,title,content,position,is_active")
          .eq("business_id", selected.id)
          .eq("is_active", true)
          .order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      const strip = (s: string | null) => decodeHtmlEntities((s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      setAiSummariesList(
        ((sums.data ?? []) as any[])
          .map((r) => ({ id: r.id as string, title: strip(r.title), content: strip(r.content) }))
          .filter((r) => r.title || r.content),
      );
      setSelectedAiSummaryIds(new Set());
      setAiTextsList(
        ((aiTxts.data ?? []) as any[])
          .map((r) => ({ id: r.id as string, title: strip(r.title), content: strip(r.content) }))
          .filter((r) => r.title || r.content),
      );
      setSelectedAiTextIds(new Set());
      const rows = (docs.data ?? []) as any[];
      setExternalLinksList(
        rows
          .filter((d) => d.type === "external_link" && d.url)
          .map((d) => ({
            id: d.id as string,
            name: strip(d.name) || "Lien",
            label: strip(d.description),
            url: d.url as string,
            image: typeof d.icon === "string" && d.icon.startsWith("http") ? (d.icon as string) : null,
          })),
      );
      setSelectedExternalLinkIds(new Set());
      // Option « Ajouter Menus » abandonnée : plus aucun menu proposé au scénario.
      setMenuDocsList([]);
      setSelectedMenuDocIds(new Set());
    })();
    return () => { cancelled = true; };
  }, [selected]);



  // Seuil minimum d'avis pour proposer les scènes "avis"
  const MIN_REVIEWS_FOR_SCENE = 10;
  const platformReviewAvailable = useMemo(() => {
    const ok = (c: number | null) => (c ?? 0) >= MIN_REVIEWS_FOR_SCENE;
    return {
      google: !selected || ok(platformData.google.count),
      tripadvisor: !selected || ok(platformData.tripadvisor.count),
      restaurant_guru: !selected || ok(platformData.restaurant_guru.count),
    };
  }, [selected, platformData]);
  const totalReviewCount = reviewsAggregate.total;
  const reviewsCounterAvailable = !selected || totalReviewCount >= MIN_REVIEWS_FOR_SCENE;

  // Désactive automatiquement les options avis non éligibles (impacte le scénario généré)
  useEffect(() => {
    if (!selected) return;
    if (!platformReviewAvailable.google) setOptGoogleReviews(false);
    if (!platformReviewAvailable.tripadvisor) setOptTripAdvisor(false);
    if (!platformReviewAvailable.restaurant_guru) setOptRestaurantGuru(false);
    if (!reviewsCounterAvailable) setOptReviews(false);
  }, [selected, platformReviewAvailable, reviewsCounterAvailable]);



  // POIs (groupés par quartier), destinations et articles de blog propriétaires
  useEffect(() => {
    if (!selected?.id) {
      setPoiOptions([]); setDestOptions([]); setBlogPosts([]);
      setOptBlogArticles(false); setSelectedBlogIds(new Set());
      return;
    }
    let cancelled = false;
    const isEn = videoLang === "en";
    (async () => {
      const [bizRow, posts, dests] = await Promise.all([
        supabase.from("businesses").select("city").eq("id", selected.id).maybeSingle(),
        supabase
          .from("blog_posts")
          .select("id, slug, title_fr, title_en, cover_image_url, custom_hero_image_url")
          .eq("anchor_business_id", selected.id)
          .order("title_fr", { ascending: true }),
        supabase.from("destinations").select("id, name_fr, name_en").order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      setBlogPosts(((posts.data ?? []) as any[]).map((b) => ({
        id: b.id as string,
        slug: b.slug as string,
        title: ((isEn ? (b.title_en || b.title_fr) : b.title_fr) || b.slug) as string,
        cover: (b.custom_hero_image_url || b.cover_image_url || null) as string | null,
      })));
      setDestOptions(((dests.data ?? []) as any[]).map((d) => ({
        id: d.id as string,
        name: ((isEn ? (d.name_en || d.name_fr) : d.name_fr) || "") as string,
      })).filter((d) => d.name));

      const cityName = (bizRow.data as any)?.city as string | undefined;
      if (!cityName) { setPoiOptions([]); return; }
      // Points d'intérêt (établissements) : fiches is_poi de la même ville, groupées par quartier
      const { data: poiBiz } = await supabase
        .from("businesses")
        .select("id, name, neighborhood")
        .eq("city", cityName)
        .eq("is_poi", true)
        .eq("is_active", true)
        .order("name");
      if (cancelled) return;
      setPoiOptions(((poiBiz ?? []) as any[])
        .filter((b) => b.id !== selected.id && b.name)
        .map((b) => ({
          id: b.id as string,
          name: b.name as string,
          group: (b.neighborhood as string | null) || (isEn ? "Others" : "Autres"),
        })));
    })();
    return () => { cancelled = true; };
  }, [selected, videoLang]);

  // Load file video durations
  useEffect(() => {
    let cancelled = false;
    const fileVideos = bizVideos.filter((v) => v.kind === "file" && v.duration == null);
    if (fileVideos.length === 0) return;
    const load = async () => {
      const durations: Record<string, number> = {};
      for (const v of fileVideos) {
        const d = await getVideoDuration(v.url);
        if (d != null) durations[v.url] = d;
      }
      if (!cancelled) {
        setBizVideos((prev) => prev.map((v) => (v.url in durations ? { ...v, duration: durations[v.url] } : v)));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bizVideos]);


  // Update prompt automatically when selected business changes
  useEffect(() => {
    if (refineFrom) return;
    const businessText = selected ? ` « ${selected.name} »` : "";
    const newDefaultPrompt = `Générez une vidéo verticale 720×1280 à partir d'un prompt et d'un établissement.`;
    
    if (!prompt || prompt.startsWith("Présentation immersive mettant en avant le hook et la signature de l'établissement")) {
      setPrompt(newDefaultPrompt);
    }
  }, [selected, refineFrom]);

  // Recent jobs + realtime
  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("video_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (data) setJobs(data as Job[]);
  }, []);

  useEffect(() => {
    const load = loadJobs;
    load();


    const channel = supabase
      .channel("video_jobs_studio")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_jobs" },
        (payload) => {
          setJobs((prev) => {
            const next = [...prev];
            const row = payload.new as Job;
            if (!row?.id) return prev;
            const idx = next.findIndex((j) => j.id === row.id);
            if (idx >= 0) next[idx] = row;
            else next.unshift(row);
            return next.slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch business names for jobs
  useEffect(() => {
    const ids = Array.from(new Set(jobs.map((j) => j.business_id).filter((id): id is string => !!id && !businessNames[id])));
    if (ids.length === 0) return;
    supabase
      .from("businesses")
      .select("id,name")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        setBusinessNames((prev) => {
          const next = { ...prev };
          for (const b of data) next[b.id] = b.name;
          return next;
        });
      });
  }, [jobs, businessNames]);

  const currentJob = useMemo(
    () => jobs.find((j) => j.id === currentJobId) ?? null,
    [jobs, currentJobId]
  );

  // Clear persisted job id once finished
  useEffect(() => {
    if (currentJob && (currentJob.status === "done" || currentJob.status === "error")) {
      setCurrentJobId(null);
    }
  }, [currentJob]);

  // Verrou de rendu : uniquement les jobs de l'utilisateur courant.
  // Un staff/admin voit les jobs des autres (RLS) mais n'est plus bloqué par eux.
  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (j.status === "pending" || j.status === "rendering") &&
          (!currentUserId || j.user_id === currentUserId)
      ),
    [jobs, currentUserId]
  );
  const hasActiveJob = activeJobs.length > 0;

  // Filet de sécurité : si le realtime ne remonte pas (perte de socket, onglet
  // en arrière-plan…), on rafraîchit les jobs toutes les 8 s tant qu'un rendu
  // est en cours ou vient d'être lancé.
  useEffect(() => {
    if (!hasActiveJob && !currentJobId) return;
    const t = setInterval(loadJobs, 8000);
    return () => clearInterval(t);
  }, [hasActiveJob, currentJobId, loadJobs]);



  const promptKeywords = useMemo(() => extractKeywords(prompt), [prompt]);

  // Textes BIENVENUE / PROPOSITION issus de Présence en ligne / CTAs.
  const welcomeLabelText = useMemo(
    () => welcomeBadgeLabel(ctaBadges.carousel, selected?.name ?? null, videoLang === "en" ? "en" : "fr"),
    [ctaBadges.carousel, selected?.name, videoLang]
  );
  const propositionLabelText = useMemo(
    () => propositionLabel(ctaBadges.proposition, selected?.name ?? null, videoLang === "en" ? "en" : "fr"),
    [ctaBadges.proposition, selected?.name, videoLang]
  );
  // Choix du contenu des étapes BIENVENUE / PROPOSITION (menu déroulant dans les cartes du scénario)
  const introBadgeOptions = useMemo(() => {
    const lg = videoLang === "en" ? "en" : "fr";
    const nm = selected?.name ?? null;
    return {
      welcome: WELCOME_BADGE_CODES.map((c) => ({ value: c, label: welcomeBadgeLabel(c, nm, lg) || c }))
        .filter((o) => !!o.label),
      proposition: PROPOSITION_CODES.map((c) => ({ value: c, label: propositionLabel(c, nm, lg) || c }))
        .filter((o) => !!o.label),
    };
  }, [selected?.name, videoLang]);
  const introBadgeCodes = useMemo(
    () => ({ welcome: ctaBadges.carousel, proposition: ctaBadges.proposition }),
    [ctaBadges.carousel, ctaBadges.proposition]
  );
  const handleIntroBadgeChange = useCallback((kind: "welcome" | "proposition", code: string) => {
    setCtaBadges((prev) => (kind === "welcome" ? { ...prev, carousel: code } : { ...prev, proposition: code }));
  }, []);

  const welcomeSceneText = optWelcome ? welcomeLabelText : null;
  const propositionSceneText = optProposition ? propositionLabelText : null;

  // Durée calculée automatiquement à partir des étapes actives du scénario.
  const autoDuration = useMemo(() => {
    let s = 4 + 3; // name + hook
    const canLogo = !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo;
    if (canLogo) s += 2;
    if (welcomeSceneText) s += 3;
    if (propositionSceneText) s += 3;
    if (optPopup) s += 4;
    const offerCount = selectedOfferIds.size;
    if (offerCount > 0) s += Math.min(6, offerCount) * 5;
    const highlightCount = selectedHighlightIds.size;
    if (highlightCount > 0) s += Math.min(4, highlightCount) * 4;
    s += Math.min(4, selectedAiSummaryIds.size) * 5;
    s += Math.min(4, selectedExternalLinkIds.size) * 5;
    s += Math.min(4, selectedMenuDocIds.size) * 5;
    if (optReviews) s += 3;
    if (optGoogleReviews) s += 4;
    if (optTripAdvisor) s += 4;
    if (optRestaurantGuru) s += 4;
    if (optCustomerReview) s += 6;
    if (optHours) s += 3;
    if (optMapMarker) s += 3;
    if (optDigitalId) s += 3;
    if (optWhatsapp && whatsappNumber) s += 3;
    s += 3; // cta
    if (optInstallCta) s += 3; // outro
    return Math.max(10, Math.min(90, s));
  }, [logoInfo, optOpenWithLogo, welcomeSceneText, propositionSceneText, optPopup, selectedOfferIds, selectedHighlightIds, selectedAiSummaryIds, selectedExternalLinkIds, selectedMenuDocIds, optReviews, optGoogleReviews, optTripAdvisor, optRestaurantGuru, optCustomerReview, optHours, optMapMarker, optDigitalId, optWhatsapp, whatsappNumber, optInstallCta]);

  const effectiveDuration = durationAuto ? autoDuration : duration;






  // Configuration backoffice des étapes (ordre + durées) — /staff/backoffice/videos
  const scenarioStepConfig = useVideoScenarioSteps(studioMode === "corporate" ? "corporate" : "business");

  const scenario = useMemo(() => {
    if (!prompt.trim() || prompt.length < 20) return null;
    const built = buildScenario(prompt, selected?.name ?? null, effectiveDuration, {
      reviews: optReviews,
      hours: optHours,
      mapMarker: optMapMarker,
      digitalId: optDigitalId,
      installCta: optInstallCta,
      openWithLogo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
      logoUrl: logoInfo.url,
      whatsapp: optWhatsapp,
      whatsappNumber: whatsappNumber,
      hookText: fromVideoOn && synthTitle ? synthTitle : null,
      welcomeText: welcomeSceneText,
      propositionText: propositionSceneText,
    });
    return applyStepsConfig(built as any, scenarioStepConfig) as typeof built;
  }, [prompt, selected?.name, effectiveDuration, optReviews, optHours, optMapMarker, optDigitalId, optInstallCta, optOpenWithLogo, logoInfo, optWhatsapp, whatsappNumber, fromVideoOn, synthTitle, welcomeSceneText, propositionSceneText, scenarioStepConfig]);

  // Ordre du montage : l'IA ne décide plus du déroulé. On impose l'ordre défini en
  // backoffice (Vidéos / Scénario), sinon les étapes cochées dans « Éléments à inclure ».
  // Si l'utilisateur a réordonné manuellement dans l'aperçu, son ordre reste prioritaire.
  const referenceKindOrder = useMemo<string[]>(() => {
    const cfg = configOrder(scenarioStepConfig);
    if (cfg.length > 0) return cfg;
    return (scenario?.scenes ?? []).map((s: any) => String(s.icon));
  }, [scenario, scenarioStepConfig]);

  const applyReferenceOrder = (order?: string[] | null, manual?: boolean): string[] | undefined => {
    if (manual) return order ?? undefined;
    if (!Array.isArray(order) || order.length === 0) return order ?? undefined;
    if (referenceKindOrder.length === 0) return order;
    const rank = (k: string) => {
      const i = referenceKindOrder.indexOf(k);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return order
      .map((k, i) => ({ k, i }))
      .sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i)
      .map((x) => x.k);
  };

  // Durée réelle du scénario : priorité aux durées d'étapes réglées dans l'aperçu,
  // sinon la somme des étapes du scénario prévisualisé, sinon la durée cible.
  const scenarioDuration = useMemo(() => {
    const t = scenarioEdits?.totalDuration;
    if (Number.isFinite(t) && (t as number) > 0) return Math.round(t as number);
    const scenes = (aiScenario?.scenario ?? scenario)?.scenes;
    if (Array.isArray(scenes) && scenes.length) {
      const sum = scenes.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0);
      if (sum > 0) return Math.round(sum);
    }
    return effectiveDuration;
  }, [scenarioEdits?.totalDuration, aiScenario, scenario, effectiveDuration]);


  const youtubeIdFromUrl = (url: string): string | null => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return m?.[1] ?? null;
  };

  const runFromVideo = async (url: string) => {
    setFromVideoLoading(true);
    try {
      const vid = youtubeIdFromUrl(url);
      const { data, error } = await supabase.functions.invoke("studio-video-text-assist", {
        body: {
          action: "from_video",
          business_id: selected?.id ?? null,
          video_id: vid,
          video_url: vid ? null : url,
          video_title: bizVideos.find((v) => v.url === url)?.title ?? null,
          lang: videoLang,
        },
      });
      if (error) throw error;
      const res = data as any;
      setSynthTitle(res?.title ?? "");
      setSynthText(res?.text ?? "");
      setSynthPriceLine(res?.price_line ?? "");
      setEstimateText(`${res?.title ?? ""}\n${res?.text ?? ""}`.trim());
      setEstimateResult(null);
      toast.success("Titre et texte synthétisés à partir de la vidéo.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la synthèse.");
    } finally {
      setFromVideoLoading(false);
    }
  };

  const runEstimate = async () => {
    if (!estimateText.trim()) {
      toast.error("Collez un texte à estimer.");
      return;
    }
    setEstimateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("studio-video-text-assist", {
        body: { action: "estimate", text: estimateText },
      });
      if (error) throw error;
      setEstimateResult(data as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'estimation.");
    } finally {
      setEstimateLoading(false);
    }
  };

  // Titre / corps / découpage dérivés du texte estimé (même logique que l'insertion).
  const estimateParts = useMemo(() => {
    const raw = estimateText.trim();
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = (synthTitle || lines[0] || "Texte").slice(0, 80);
    const body = (synthText || lines.slice(synthTitle ? 0 : 1).join(" ") || raw).trim();
    const words = (body || raw).split(/\s+/).filter(Boolean);
    const splitCount = Math.max(1, Math.ceil(words.length / wordsPerBlock));
    return { raw, title, body, words, splitCount };
  }, [estimateText, synthTitle, synthText, wordsPerBlock]);

  // Aperçu : blocs de mots + leur fenêtre temporelle sur la durée estimée.
  const estimateBlocks = useMemo(() => {
    const seconds = estimateResult?.seconds ?? 0;
    const { words, splitCount } = estimateParts;
    if (!seconds || words.length === 0) return [] as { text: string; start: number; end: number }[];
    const per = Math.ceil(words.length / splitCount);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(" "));
    const slot = seconds / chunks.length;
    return chunks.map((text, i) => ({
      text,
      start: i * slot,
      end: i === chunks.length - 1 ? seconds : (i + 1) * slot,
    }));
  }, [estimateResult, estimateParts]);

  // Insère une étape personnalisée de la durée estimée, avec la vidéo sélectionnée
  // en fond et le texte découpé en blocs de `wordsPerBlock` mots.
  const insertEstimatedStep = () => {
    if (!estimateResult) return;
    const raw = estimateText.trim();
    if (!raw) {
      toast.error("Collez un texte à afficher.");
      return;
    }
    const src = fromVideoUrl ?? Array.from(selectedVideos)[0] ?? bizVideos[0]?.url ?? null;
    const meta = src ? bizVideos.find((v) => v.url === src) : undefined;
    const media = src
      ? {
          kind: (meta?.kind === "youtube" || !!youtubeIdFromUrl(src) ? "youtube" : "video") as "youtube" | "video",
          url: src,
          title: meta?.title ?? "Vidéo",
          thumbnail: meta?.thumbnail ?? null,
        }
      : undefined;

    const { title, body, splitCount } = estimateParts;

    setPendingCustomScene({
      mode: media ? "overlay" : "fullscreen",
      title,
      subtitle: body || undefined,
      duration: Math.max(3, Math.min(60, estimateResult.seconds)),
      media,
      mediaList: media ? [media] : undefined,
      splitCount,
      priceBadge: synthPriceLine.trim() || undefined,
    });
    setEstimateOpen(false);
    toast.success(`Étape de ${estimateResult.seconds}s insérée (${splitCount} bloc(s) de ~${wordsPerBlock} mots).`);
  };



  const mediaMatches = useMemo(() => {
    const matches = new Map<string, string[]>();
    const add = (key: string, text: string) => {
      const hit = promptKeywords.filter((k) => text.toLowerCase().includes(k));
      if (hit.length) matches.set(key, hit);
    };
    bizImages.forEach((url) => add(url, url));
    bizVideos.forEach((v) => add(v.url, `${v.title} ${v.url}`));
    return matches;
  }, [promptKeywords, bizImages, bizVideos]);

  // Rassemble tous les médias qui partiront au rendu, pour le pré-vol.
  const collectPreflightEntries = (chosenImages: string[], chosenVideos: string[]): PreflightEntry[] => {
    const out: PreflightEntry[] = [];
    if (logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo) {
      out.push({ url: logoInfo.url, label: "Logo (étape d'ouverture)", kind: "image" });
    }
    chosenImages.forEach((u) => out.push({ url: u, label: "Image sélectionnée", kind: "image" }));
    chosenVideos.forEach((u) => {
      const meta = bizVideos.find((v) => v.url === u);
      out.push({ url: u, label: `Vidéo sélectionnée${meta?.title ? ` — ${meta.title}` : ""}`, kind: meta?.kind === "youtube" ? "youtube" : "video" });
    });
    Object.entries(sceneMedia).forEach(([kind, items]) => {
      (items ?? []).forEach((m) => out.push({ url: m.url, label: `Étape « ${kind} » — média assigné`, kind: m.kind }));
    });
    if (continuousBg && continuousBgUrl) {
      const meta = bizVideos.find((v) => v.url === continuousBgUrl);
      out.push({ url: continuousBgUrl, label: "Vidéo de fond continue", kind: meta?.kind === "youtube" ? "youtube" : "video" });
    }
    if (soundtrackOn && soundtrackUrl) out.push({ url: soundtrackUrl, label: "Piste sonore", kind: "audio" });
    return out;
  };

  const submit = async (opts?: { skipPreflight?: boolean }) => {
    if (submitting) return;
    if (hasActiveJob) {
      toast.error("Job déjà lancé — patientez la fin du rendu en cours.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Décrivez la vidéo souhaitée.");
      return;
    }
    setSubmitting(true);
    try {
      const { finalPrompt, chosenImages, chosenVideos } = buildDirectivesPrompt();

      // Pré-vol médias : bloque les causes n°1 de jobs en erreur (liens YouTube,
      // fichiers Storage supprimés) avant de consommer un rendu.
      if (!opts?.skipPreflight) {
        setPreflightRunning(true);
        let issues: PreflightIssue[] = [];
        try {
          issues = await preflightMedia(collectPreflightEntries(chosenImages, chosenVideos));
        } catch {
          issues = [];
        } finally {
          setPreflightRunning(false);
        }
        if (issues.length > 0) {
          setPreflightIssues(issues);
          setPreflightOpen(true);
          setSubmitting(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("video-scenario-generate", {

        body: {
          prompt: finalPrompt,
          business_id: selected?.id ?? null,
          duration_sec: scenarioDuration,
          tone,
          parent_job_id: refineFrom?.id ?? null,
          notify_email: notifyEmail,
          notify_email_to: notifyEmail ? (notifyEmailTo || null) : null,

          options: {
            lang: videoLang,
            video_format: videoFormat,
            canvas_width: videoCanvas.w,
            canvas_height: videoCanvas.h,
            reviews: optReviews,
            hours: optHours,
            map_marker: optMapMarker,
            digital_id: optDigitalId,
            install_cta: optInstallCta,
            whatsapp: optWhatsapp,
            whatsapp_number: whatsappNumber,
            google_reviews: optGoogleReviews,
            tripadvisor: optTripAdvisor,
            restaurant_guru: optRestaurantGuru,
            customer_review: optCustomerReview,
            customer_review_id: selectedReviewId,
            customer_review_highlight: reviewHighlight || null,
            popup: optPopup,
            ai_card: optAiCard,
            open_with_logo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
            logo_url: logoInfo.url,
            welcome_text: welcomeSceneText,
            proposition_text: propositionSceneText,
            text_splits: scenarioEdits?.textSplits,
            text_segments: scenarioEdits?.textSegments,
            text_overrides: scenarioEdits?.textOverrides,
            hook_override: fromVideoOn && synthTitle ? synthTitle : null,
            video_text: fromVideoOn && synthText ? synthText : null,
            scene_pois: scenarioEdits?.scenePois,
            scene_destinations: scenarioEdits?.sceneDestinations,
            places_media_mode: scenarioEdits?.placesMediaMode ?? "videos",
            whatsapp_offer_mode: scenarioEdits?.whatsappOfferMode ?? "number",
            use_associated_media: scenarioEdits?.useAssociatedMedia ?? undefined,
            blog_articles: optBlogArticles && selectedBlogIds.size > 0,
            blog_article_ids: Array.from(selectedBlogIds),
            blog_mode: blogMode,
            blog_modes: Object.fromEntries(Array.from(selectedBlogIds).map((id) => [id, blogModes[id] || blogMode])),

            offer_ids: Array.from(selectedOfferIds),
            highlight_ids: Array.from(selectedHighlightIds),
            highlight_effects: Object.fromEntries(Array.from(selectedHighlightIds).filter((id) => !!highlightEffects[id]).map((id) => [id, highlightEffects[id]])),
            ai_text_ids: Array.from(selectedAiTextIds),
            ai_text_effects: Object.fromEntries(Array.from(selectedAiTextIds).map((id) => [id, aiTextEffects[id] || "zoom_in"])),
            ai_summary_ids: Array.from(selectedAiSummaryIds),
            ai_summary_effect: aiSummaryEffect,
            ai_summary_effects: Object.fromEntries(Array.from(selectedAiSummaryIds).map((id) => [id, aiSummaryEffects[id] || aiSummaryEffect])),

            weather_widget: optWeatherWidget,
            weather_range: weatherRange,
            weather_city: (scenarioEdits as any)?.weatherCity || weatherCity,
            tides_widget: optTidesWidget,
            tides_mode: tidesMode,
            tides_city: (scenarioEdits as any)?.tidesCity || tidesCity,

            external_link_ids: Array.from(selectedExternalLinkIds),
            menu_doc_ids: Array.from(selectedMenuDocIds),
            selected_images: chosenImages,
            selected_videos: chosenVideos,
            video_starts: activeVideoStarts,
            video_ends: activeVideoEnds,
            video_durations: activeVideoDurations,
            scene_media: sceneMedia,
            scene_order: applyReferenceOrder(scenarioEdits?.order ?? (aiScenario?.scenario ?? scenario)?.scenes.map((s) => s.icon), !!(scenarioEdits as any)?.manualOrder),
            scene_durations: scenarioEdits?.durations ?? (() => {
              const src = (aiScenario?.scenario ?? scenario)?.scenes;
              if (!src) return undefined;
              const out: Record<string, number> = {};
              for (const s of src) out[s.icon] = s.duration;
              return out;
            })(),
            // Durées réglées dans « Aperçu du scénario » : elles priment sur les
            // durées par défaut du backoffice (/staff/backoffice/videos).
            manual_durations: !!(scenarioEdits as any)?.manualDurations,
            custom_scenes: scenarioEdits?.customScenes,
            text_position: textPosition,
            transitions: {
              style: transitionStyle,
              differentiate: transitionDifferentiate,
              video: transitionVideo,
              image: transitionImage,
            },
            continuous_bg_video_url: continuousBg && continuousBgUrl ? continuousBgUrl : null,
            // Durée réelle de la vidéo de fond : permet à Remotion de la boucler (image + son)
            // si elle est plus courte que le scénario.
            continuous_bg_video_duration: continuousBg && continuousBgUrl
              ? (bizVideos.find((x) => x.url === continuousBgUrl)?.duration ?? null)
              : null,
            continuous_bg_sound: continuousBg && continuousBgUrl && !(soundtrackOn && soundtrackUrl) ? continuousBgSound : false,
            soundtrack_url: soundtrackOn && soundtrackUrl ? soundtrackUrl : null,
          },

        },
      });
      if (error) throw error;
      const job = (data as any)?.job as Job;
      if (job) {
        setCurrentJobId(job.id);
        // Affichage immédiat du bandeau « Vidéo en cours de génération » sans
        // attendre l'événement realtime (qui peut arriver tard ou être perdu).
        setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)].slice(0, 20));
        setRefineFrom(null);
        toast.success("Scénario généré. Rendu en attente du worker.");
      }

    } catch (e: any) {
      toast.error(await edgeErrorMessage(e, "Erreur lors de la génération."));
    } finally {
      setSubmitting(false);
    }
  };

  const buildDirectivesPrompt = () => {
    const directives: string[] = [];
    if (fromVideoOn && (synthTitle || synthText)) {
      if (synthTitle) directives.push(`Utiliser ce titre comme hook (étape 2 du scénario), à la place du hook de l'établissement : « ${synthTitle} ».`);
      if (synthText) directives.push(`Utiliser ce texte comme texte de la vidéo : « ${synthText} ».`);
    }
    const logoAvailable = !!logoInfo.url && logoInfo.bg === "transparent";
    if (logoAvailable && optOpenWithLogo) directives.push(`Ouvrir la vidéo par une séquence courte (env. 20 frames) affichant le logo de l'établissement (fond transparent) centré sur un fond de marque, avec un fondu d'entrée doux, avant d'enchaîner sur le hook. URL du logo : ${logoInfo.url}`);
    if (optReviews) directives.push("Faire figurer le compteur d'avis client et le badge des avis client (note/20 + nombre d'avis).");
    if (optHours) directives.push("Faire figurer les horaires d'ouverture de l'établissement.");
    if (optMapMarker) directives.push("Faire figurer le marqueur de l'établissement sur la Google Map.");
    if (optDigitalId) directives.push("Insérer une courte séquence ID numérique (capture mock-up de la fiche /fiche/slug, étape de partage, puis QR code) AVANT l'incitation finale.");
    if (optInstallCta) directives.push("Terminer par une incitation à installer l'app (bouton carré terracotta inspiré de /install mobile).");
    if (optWhatsapp && whatsappNumber) directives.push(`Ajouter une scène dédiée WhatsApp avec un effet libre au montage (logo WhatsApp vert #25D366, numéro « ${whatsappNumber} », animation dynamique, invitation à contacter directement l'établissement).`);
    if (popupImageUrl) {
      if (optPopup) {
        const parts: string[] = [];
        if (popupMeta.title) parts.push(`titre « ${popupMeta.title} »`);
        if (popupMeta.description) parts.push(`texte « ${popupMeta.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)} »`);
        directives.push(`Mettre en avant l'image POPUP de bienvenue avec son ${parts.length ? parts.join(" et son ") : "titre et texte"} (URL : ${popupImageUrl}).`);
      } else {
        directives.push("Ne pas utiliser l'image POPUP de bienvenue.");
      }
    }
    if (offersList.length > 0) {
      const chosen = offersList.filter((o) => selectedOfferIds.has(o.id));
      if (chosen.length === 0) {
        directives.push("Ne pas afficher d'offres commerciales.");
      } else if (chosen.length < offersList.length) {
        const fmt = (o: typeof offersList[number]) => {
          const amt = o.promotion_type === "percentage" && o.promotion_value != null
            ? `-${o.promotion_value}%`
            : o.promotion_type === "fixed" && o.promotion_value != null
              ? `-${o.promotion_value} ${o.promotion_currency || "MAD"}`
              : o.savings_amount != null
                ? `-${o.savings_amount} ${o.promotion_currency || "MAD"}`
                : "";
          const msg = o.message ? ` — ${o.message.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)}` : "";
          return `${o.title}${amt ? ` (${amt})` : ""}${msg}`;
        };
        directives.push(`Afficher UNIQUEMENT ces offres (dans cet ordre) :\n  * ${chosen.map(fmt).join("\n  * ")}`);
      }
    }
    if (highlightsList.length > 0) {
      const chosenH = highlightsList.filter((h) => selectedHighlightIds.has(h.id));
      if (chosenH.length === 0) {
        directives.push("Ne pas utiliser les blocs highlights de l'établissement.");
      } else {
        const fmtH = (h: typeof highlightsList[number]) => {
          const bits: string[] = [];
          if (h.title) bits.push(`titre « ${h.title.slice(0, 120)} »`);
          if (h.description) bits.push(`texte « ${h.description.slice(0, 300)} »`);
          if (h.metric_title || h.metric_value) bits.push(`chiffre-clé « ${(h.metric_value || "").slice(0, 40)}${h.metric_title ? ` — ${h.metric_title.slice(0, 60)}` : ""} »`);
          if (h.icon) bits.push(`icône ${h.icon}`);
          if (h.image_url) bits.push(`image ${h.image_url}`);
          return bits.join(" · ");
        };
        directives.push(`Reprendre les blocs highlights suivants (dans cet ordre) comme séquences de la vidéo :\n  * ${chosenH.map(fmtH).join("\n  * ")}`);
      }
    }
    const chosenSums = aiSummariesList.filter((s) => selectedAiSummaryIds.has(s.id));
    if (chosenSums.length > 0) {
      directives.push(`Ajouter une séquence par résumé IA du menu (titre + contenu exacts, 5 s par défaut) :\n  * ${chosenSums.map((s) => `« ${s.title || "Résumé"} » — ${s.content.slice(0, 400)}`).join("\n  * ")}`);
    }
    const chosenLinks = externalLinksList.filter((l) => selectedExternalLinkIds.has(l.id));
    if (chosenLinks.length > 0) {
      directives.push(`Ajouter une séquence par lien externe (libellé existant + titre du lien, 5 s par défaut) :\n  * ${chosenLinks.map((l) => `${l.label ? `[${l.label}] ` : ""}${l.name}`).join("\n  * ")}`);
    }
    const chosenImages = Array.from(selectedImages);
    const chosenVideos = orderedSelectedVideos;
    if (chosenImages.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les images suivantes (dans cet ordre) pour le montage :\n  * ${chosenImages.join("\n  * ")}`);
    if (continuousBg && continuousBgUrl) directives.push(`Une seule vidéo est jouée EN FOND CONTINU sur toute la durée (${continuousBgUrl}) : ne pas prévoir de montage de fonds différents par scène, seuls les textes et éléments graphiques changent.`);
    if (chosenVideos.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les vidéos suivantes (dans cet ordre) pour le montage :\n  * ${chosenVideos.join("\n  * ")}`);
    const startsList = Object.entries(activeVideoStarts);
    if (startsList.length > 0) {
      directives.push(`Ces vidéos démarrent à un point précis (Time Start) : leur durée utile est réduite d'autant :\n  * ${startsList.map(([u, t]) => `${u} → départ à ${t}s`).join("\n  * ")}`);
    }
    const endsList = Object.entries(activeVideoEnds);
    if (endsList.length > 0) {
      directives.push(`Ces vidéos s'arrêtent à un point précis (Time End) :\n  * ${endsList.map(([u, t]) => `${u} → fin à ${t}s`).join("\n  * ")}`);
    }
    const finalPrompt = directives.length ? `${prompt.trim()}\n\nContraintes supplémentaires :\n- ${directives.join("\n- ")}` : prompt.trim();
    return { finalPrompt, chosenImages, chosenVideos };
  };

  const currentScenarioSig = useMemo(() => {
    return JSON.stringify({
      prompt: prompt.trim(),
      duration: effectiveDuration,
      tone,
      business: selected?.id ?? null,
      opts: {
        optReviews, optHours, optMapMarker, optDigitalId, optInstallCta,
        optWhatsapp, optGoogleReviews, optTripAdvisor, optRestaurantGuru,
        optCustomerReview, optPopup, optOpenWithLogo,
      },
      offers: Array.from(selectedOfferIds).sort(),
      highlights: Array.from(selectedHighlightIds).sort(),
      aiTexts: Array.from(selectedAiTextIds).sort(),
      aiTextEffects: Array.from(selectedAiTextIds).sort().map((id) => `${id}:${aiTextEffects[id] || "zoom_in"}`).join(","),
      aiSummaries: Array.from(selectedAiSummaryIds).sort(),
      aiSummaryEffect,
      highlightEffects: Array.from(selectedHighlightIds).sort().map((id) => `${id}:${highlightEffects[id] || "-"}`).join(","),
      aiSummaryEffects: Array.from(selectedAiSummaryIds).sort().map((id) => `${id}:${aiSummaryEffects[id] || aiSummaryEffect}`).join(","),
      weather: optWeatherWidget ? `${weatherRange}|${(scenarioEdits as any)?.weatherCity || weatherCity}` : null,
      tides: optTidesWidget ? `${tidesMode}|${(scenarioEdits as any)?.tidesCity || tidesCity}` : null,

      externalLinks: Array.from(selectedExternalLinkIds).sort(),
      menuDocs: Array.from(selectedMenuDocIds).sort(),
      images: Array.from(selectedImages).sort(),
      videos: orderedSelectedVideos,
      videoStarts: activeVideoStarts,
      videoEnds: activeVideoEnds,
      reviewId: selectedReviewId,
      reviewHighlight: reviewHighlight || null,
      textPosition,
      transitions: `${transitionStyle}|${transitionDifferentiate ? "diff" : "uni"}|${transitionVideo}|${transitionImage}`,
      continuousBg: continuousBg ? `${continuousBgUrl}|${continuousBgSound ? "sound" : "mute"}` : null,
      soundtrack: soundtrackOn && soundtrackUrl ? soundtrackUrl : null,
    });
  }, [
    prompt, effectiveDuration, tone, selected?.id,
    optReviews, optHours, optMapMarker, optDigitalId, optInstallCta,
    optWhatsapp, optGoogleReviews, optTripAdvisor, optRestaurantGuru,
    optCustomerReview, optPopup, optOpenWithLogo,
    selectedOfferIds, selectedHighlightIds, selectedAiSummaryIds, aiSummaryEffect, highlightEffects, aiSummaryEffects,
    selectedAiTextIds, aiTextEffects,
    optWeatherWidget, weatherRange, weatherCity, optTidesWidget, tidesMode, tidesCity,
    (scenarioEdits as any)?.weatherCity, (scenarioEdits as any)?.tidesCity, selectedExternalLinkIds, selectedMenuDocIds, selectedImages, orderedSelectedVideos, activeVideoStarts, activeVideoEnds,
    selectedReviewId, reviewHighlight, textPosition, continuousBg, continuousBgUrl, continuousBgSound,
    soundtrackOn, soundtrackUrl,
    transitionStyle, transitionDifferentiate, transitionVideo, transitionImage,
  ]);
  const scenarioStale = !!aiScenario && aiScenarioSig !== null && aiScenarioSig !== currentScenarioSig;

  const previewScenario = async () => {
    if (previewing || submitting) return;
    if (!prompt.trim()) {
      toast.error("Décrivez la vidéo souhaitée.");
      return;
    }
    setPreviewing(true);
    try {
      const { finalPrompt, chosenImages, chosenVideos } = buildDirectivesPrompt();
      const { data, error } = await supabase.functions.invoke("video-scenario-generate", {
        body: {
          prompt: finalPrompt,
          business_id: selected?.id ?? null,
          duration_sec: effectiveDuration,
          tone,
          parent_job_id: refineFrom?.id ?? null,
          preview_only: true,
          options: {
            lang: videoLang,
            video_format: videoFormat,
            canvas_width: videoCanvas.w,
            canvas_height: videoCanvas.h,
            reviews: optReviews,
            hours: optHours,
            map_marker: optMapMarker,
            digital_id: optDigitalId,
            install_cta: optInstallCta,
            whatsapp: optWhatsapp,
            whatsapp_number: whatsappNumber,
            google_reviews: optGoogleReviews,
            tripadvisor: optTripAdvisor,
            restaurant_guru: optRestaurantGuru,
            customer_review: optCustomerReview,
            customer_review_id: selectedReviewId,
            customer_review_highlight: reviewHighlight || null,
            popup: optPopup,
            ai_card: optAiCard,
            open_with_logo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
            logo_url: logoInfo.url,
            welcome_text: welcomeSceneText,
            proposition_text: propositionSceneText,
            text_splits: scenarioEdits?.textSplits,
            text_segments: scenarioEdits?.textSegments,
            text_overrides: scenarioEdits?.textOverrides,
            hook_override: fromVideoOn && synthTitle ? synthTitle : null,
            video_text: fromVideoOn && synthText ? synthText : null,
            scene_pois: scenarioEdits?.scenePois,
            scene_destinations: scenarioEdits?.sceneDestinations,
            places_media_mode: scenarioEdits?.placesMediaMode ?? "videos",
            whatsapp_offer_mode: scenarioEdits?.whatsappOfferMode ?? "number",
            use_associated_media: scenarioEdits?.useAssociatedMedia ?? undefined,
            blog_articles: optBlogArticles && selectedBlogIds.size > 0,
            blog_article_ids: Array.from(selectedBlogIds),
            blog_mode: blogMode,
            blog_modes: Object.fromEntries(Array.from(selectedBlogIds).map((id) => [id, blogModes[id] || blogMode])),

            offer_ids: Array.from(selectedOfferIds),
            highlight_ids: Array.from(selectedHighlightIds),
            highlight_effects: Object.fromEntries(Array.from(selectedHighlightIds).filter((id) => !!highlightEffects[id]).map((id) => [id, highlightEffects[id]])),
            ai_text_ids: Array.from(selectedAiTextIds),
            ai_text_effects: Object.fromEntries(Array.from(selectedAiTextIds).map((id) => [id, aiTextEffects[id] || "zoom_in"])),
            ai_summary_ids: Array.from(selectedAiSummaryIds),
            ai_summary_effect: aiSummaryEffect,
            ai_summary_effects: Object.fromEntries(Array.from(selectedAiSummaryIds).map((id) => [id, aiSummaryEffects[id] || aiSummaryEffect])),

            weather_widget: optWeatherWidget,
            weather_range: weatherRange,
            weather_city: (scenarioEdits as any)?.weatherCity || weatherCity,
            tides_widget: optTidesWidget,
            tides_mode: tidesMode,
            tides_city: (scenarioEdits as any)?.tidesCity || tidesCity,

            external_link_ids: Array.from(selectedExternalLinkIds),
            menu_doc_ids: Array.from(selectedMenuDocIds),
            selected_images: chosenImages,
            selected_videos: chosenVideos,
            video_starts: activeVideoStarts,
            video_ends: activeVideoEnds,
            video_durations: activeVideoDurations,
            scene_media: sceneMedia,
            scene_order: applyReferenceOrder(
              scenarioEdits?.order ?? (aiScenario?.scenario ?? scenario)?.scenes.map((s) => s.icon),
              !!(scenarioEdits as any)?.manualOrder,
            ),
            scene_durations: scenarioEdits?.durations ?? (() => {
              const src = (aiScenario?.scenario ?? scenario)?.scenes;
              if (!src) return undefined;
              const out: Record<string, number> = {};
              for (const s of src) out[s.icon] = s.duration;
              return out;
            })(),
            manual_durations: !!(scenarioEdits as any)?.manualDurations,
            custom_scenes: scenarioEdits?.customScenes,

            text_position: textPosition,
            transitions: {
              style: transitionStyle,
              differentiate: transitionDifferentiate,
              video: transitionVideo,
              image: transitionImage,
            },
            continuous_bg_video_url: continuousBg && continuousBgUrl ? continuousBgUrl : null,
            // Durée réelle de la vidéo de fond : permet à Remotion de la boucler (image + son)
            // si elle est plus courte que le scénario.
            continuous_bg_video_duration: continuousBg && continuousBgUrl
              ? (bizVideos.find((x) => x.url === continuousBgUrl)?.duration ?? null)
              : null,
            continuous_bg_sound: continuousBg && continuousBgUrl && !(soundtrackOn && soundtrackUrl) ? continuousBgSound : false,
            soundtrack_url: soundtrackOn && soundtrackUrl ? soundtrackUrl : null,
          },

        },
      });
      if (error) throw error;
      const payload = data as any;
      const builtScenario = scenarioFromTemplateProps(payload.template_id, payload.template_props, payload.duration_sec ?? effectiveDuration, payload.rationale);
      // L'IA ne décide pas du déroulé : on applique la config backoffice (ordre + durées),
      // sinon l'ordre des étapes cochées.
      if (Array.isArray(builtScenario?.scenes) && scenarioStepConfig.length > 0) {
        const fixed = applyStepsConfig(builtScenario as any, scenarioStepConfig) as any;
        builtScenario.scenes = fixed.scenes;
        builtScenario.totalDuration = fixed.totalDuration;
      } else if (Array.isArray(builtScenario?.scenes) && referenceKindOrder.length > 0) {
        const rank = (k: string) => {
          const i = referenceKindOrder.indexOf(k);
          return i === -1 ? Number.MAX_SAFE_INTEGER : i;
        };
        builtScenario.scenes = builtScenario.scenes
          .map((sc: any, i: number) => ({ sc, i }))
          .sort((a: any, b: any) => rank(String(a.sc.icon)) - rank(String(b.sc.icon)) || a.i - b.i)
          .map((x: any) => x.sc);
      }
      setAiScenario({ scenario: builtScenario, rationale: payload.rationale, templateId: payload.template_id });
      setAiScenarioSig(currentScenarioSig);
      setScenarioPreviewed(true);
      toast.success("Scénario IA généré.");
    } catch (e: any) {
      toast.error(await edgeErrorMessage(e, "Erreur lors de la prévisualisation."));
    } finally {
      setPreviewing(false);
    }
  };

  const startRefine = (job: Job) => {
    setRefineFrom(job);
    setDuration(job.duration_sec as 15 | 30 | 45 | 60);
    setDurationAuto(false);
    setTone(job.tone);
    setPrompt("");
    setTimeout(() => {
      document.getElementById("prompt-area")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("prompt-area")?.focus();
    }, 50);
  };

  const renameJob = async (job: Job, title: string) => {
    const clean = title.trim();
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, title: clean || null } : j)));
    const { error } = await supabase
      .from("video_jobs")
      .update({ title: clean || null })
      .eq("id", job.id);
    if (error) {
      toast.error(error.message ?? "Renommage impossible");
    } else {
      toast.success("Titre mis à jour");
    }
  };

  const deleteJob = async (job: Job) => {
    if (!window.confirm(`Supprimer définitivement cette vidéo ?\n\n« ${job.prompt.slice(0, 120)}${job.prompt.length > 120 ? "…" : ""} »`)) {
      return;
    }
    // Try to remove the file from storage (best-effort)
    if (job.output_url) {
      const marker = "/studio-videos/";
      const idx = job.output_url.indexOf(marker);
      if (idx !== -1) {
        const path = job.output_url.slice(idx + marker.length).split("?")[0];
        await supabase.storage.from("studio-videos").remove([path]).catch(() => {});
      }
    }
    const { error } = await supabase.from("video_jobs").delete().eq("id", job.id);
    if (error) {
      toast.error("Suppression impossible : " + error.message);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    toast.success("Vidéo supprimée");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/affiliates");
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (authState === "out") {
    return <Navigate to="/affiliates/login?redirect=/studio-video" replace />;
  }
  if (accessChecked && !isStaff && ownedBusinessIds !== null && ownedBusinessIds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte n'a pas accès au Studio Vidéo IA. Contactez One World Morocco pour demander un accès.
          </p>
        </div>
      </div>
    );
  }

  const soundtrackBlock = (
    <div className="bg-white text-black rounded-xl border border-border p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Bande son</div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 accent-[#C04F17]"
          checked={soundtrackOn}
          onChange={(e) => {
            const on = e.target.checked;
            setSoundtrackOn(on);
            if (on && !soundtrackUrl) setSoundtrackPickerOpen(true);
          }}
        />
        <span className="text-sm">
          Utiliser le son d'une vidéo
          <span className="block text-[11px] text-neutral-600">
            La bande son de la vidéo choisie est utilisée sur toute la vidéo ; si elle est plus courte que le scénario, elle tourne en boucle.
            Cette option est prioritaire sur « Utiliser le son » de la vidéo de fond continue.
          </span>
        </span>
      </label>
      {soundtrackOn && (
        <>
          {(() => {
            const sel = bizVideos.find((x) => x.url === soundtrackUrl);
            return (
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setSoundtrackPickerOpen(true)}>
                  {soundtrackUrl ? "Changer la vidéo" : "Choisir la vidéo"}
                </Button>
                <span className="text-[11px] text-neutral-600 truncate">
                  {sel ? `${sel.title}${sel.duration != null ? ` · ${formatVideoDuration(sel.duration)}` : ""}` : "Aucune vidéo sélectionnée"}
                </span>
              </div>
            );
          })()}
          {(() => {
            const v = bizVideos.find((x) => x.url === soundtrackUrl);
            if (!v || v.duration == null) return null;
            const ok = v.duration >= scenarioDuration;
            return (
              <p className={`text-[11px] ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                Son {formatVideoDuration(v.duration)} · scénario {scenarioDuration}s — {ok ? "durée suffisante." : "plus court : la bande son bouclera."}
              </p>
            );
          })()}
          {continuousBg && continuousBgSound && soundtrackUrl && (
            <p className="text-[11px] text-amber-600">
              Le son de la vidéo de fond continue est désactivé au profit de cette bande son.
            </p>
          )}
          <Dialog open={soundtrackPickerOpen} onOpenChange={setSoundtrackPickerOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white text-black">
              <DialogHeader>
                <DialogTitle className="text-black">Sélection médias — vidéo de fond continue</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {bizVideos.filter((v) => v.kind === "file").map((v) => {
                  const isSel = v.url === soundtrackUrl;
                  return (
                    <div
                      key={v.url}
                      className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 transition bg-black ${isSel ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : "border-neutral-300 hover:border-neutral-500"}`}
                      title={v.title}
                    >
                      <video src={v.url} controls preload="metadata" playsInline className="w-full h-full object-cover bg-black" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-1">
                        <p className="text-[10px] text-white truncate">{v.title}</p>
                      </div>
                      {v.duration != null && (
                        <span className="pointer-events-none absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">{formatVideoDuration(v.duration)}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => { setSoundtrackUrl(v.url); setSoundtrackPickerOpen(false); }}
                        aria-label={isSel ? "Bande son sélectionnée" : "Utiliser le son de cette vidéo"}
                        className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border transition ${isSel ? "bg-[#C04F17] text-white border-[#C04F17]" : "bg-black/60 text-white border-white/40 hover:bg-black/80"}`}
                      >
                        {isSel ? "✓" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );

  if (isStaff && !studioMode) {
    return (
      <>
        <Helmet>
          <title>Studio Vidéo IA — Choix du mode</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">Studio Vidéo IA</h1>
              <div className="flex justify-center">
                <StudioIdentity affiliateInfo={affiliateInfo} staffProfile={staffProfile} isStaff={isStaff} />
              </div>
              <p className="text-white/70 text-sm">Choisissez le type de production à lancer.</p>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${canBusinessMode ? "sm:grid-cols-2" : ""}`}>
              {canBusinessMode && (
                <button
                  type="button"
                  onClick={() => setStudioMode("business")}
                  className="text-left rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:border-[#C04F17] transition p-6 space-y-2"
                >
                  <div className="text-lg font-semibold text-white">Mode établissement</div>
                  <p className="text-sm text-white/70">
                    Vidéo verticale à partir d'un établissement réel : images, vidéos, avis, horaires, offres, ID numérique.
                  </p>
                </button>
              )}
              <button
                type="button"
                onClick={() => setStudioMode("corporate")}
                className="text-left rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:border-[#C04F17] transition p-6 space-y-2"
              >
                <div className="text-lg font-semibold text-white">Mode corporate</div>
                <p className="text-sm text-white/70">
                  Vidéo produit / démo générique, sans établissement. Alimente le Showcase — features &amp; démos génériques.
                </p>
              </button>
            </div>
            {!canBusinessMode && (
              <p className="text-center text-xs text-white/50">
                Le mode établissement est réservé aux comptes disposant de l'accès Studio Vidéo.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }


  const isCorporate = studioMode === "corporate";
  const canCompose = isCorporate || !!selected;

  return (

    <>
      <Helmet>
        <title>{selected ? `Studio Vidéo IA — ${selected.name}` : "Studio Vidéo IA — 1WM"}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-black">
        <HomeMindtripHeader
          alwaysWhite
          customLinks={[
            { label: "Présence en ligne", to: "/affiliates/presence" },
            ...(hasDashboard ? [{ label: "Tableau de bord", to: "/affiliates/dashboard" }] : []),
            ...(hasVideoStudio ? [{ label: "Studio vidéo", to: "/studio-video" }] : []),
            { label: "Nouvel établissement", to: "/affiliates/presence?new=1" },
            { label: "Se déconnecter", onClick: handleSignOut, danger: true },
          ]}
        />
        <main className="container mx-auto px-4 pt-32 pb-16">
          <div className="mx-auto max-w-3xl space-y-8">
            <header className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Studio Vidéo IA {selected ? <span className="text-white/70">/ {selected.name}</span> : null}
                </h1>
                {isStaff && (
                  <>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#C04F17] text-white uppercase tracking-wide">
                      {isCorporate ? "Mode corporate" : "Mode établissement"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setStudioMode(null); setSelected(null); setScenarioPreviewed(false); setAiScenario(null); }}
                      className="text-xs text-white/70 underline hover:text-white"
                    >
                      Changer de mode
                    </button>
                  </>
                )}
              </div>
              <StudioIdentity affiliateInfo={affiliateInfo} staffProfile={staffProfile} isStaff={isStaff} />
              <p className="text-white/70">

                {isCorporate
                  ? "Générez une vidéo corporate verticale 720×1280 à partir d'un prompt, sans établissement."
                  : "Générez une vidéo verticale 720×1280 à partir d'un prompt et d'un établissement."}
              </p>
              {!isCorporate && (
              <div className="text-xs text-white/70 mt-1 space-y-1 bg-white/10 p-3 rounded-lg border border-white/20">
                <p>📌 Il faut savoir avant si l'établissement a un Hook, suffisamment d'images, de vidéos, une offre/popup...</p>
                <p>💡 Signalisez dans le prompt si vous voulez mettre en avant les horaires, la localisation, une offre/popup.</p>
              </div>
              )}
            </header>

            {hasActiveJob && (
              <div className="rounded-xl border border-[#C04F17]/50 bg-[#C04F17]/10 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-[#C04F17] animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Vidéo en cours de génération
                      {activeJobs.length > 1 ? ` (${activeJobs.length})` : ""}
                    </p>
                    <p className="text-xs text-white/70">
                      {activeJobs[0]?.business_id && businessNames[activeJobs[0].business_id]
                        ? `${businessNames[activeJobs[0].business_id]} · `
                        : ""}
                      {activeJobs[0]?.status === "rendering" ? "Rendu en cours" : "En file d'attente"} · peut prendre jusqu'à 10 minutes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("studio-active-job")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="text-xs font-medium text-[#C04F17] hover:text-white underline"
                >
                  Voir le job
                </button>
              </div>
            )}

          {!isCorporate && (
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <Label>
                {isStaff ? "Établissement (obligatoire)" : "Votre établissement"}
              </Label>
              <button
                type="button"
                onClick={() => setShowEstablishment((s) => !s)}
                disabled={!isCorporate && !selected}
                className="text-muted-foreground hover:text-foreground p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showEstablishment ? "Masquer l'établissement" : "Afficher l'établissement"}
                title={showEstablishment ? "Masquer" : "Afficher"}
              >
                {showEstablishment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showEstablishment && (
              <div className="space-y-2">
                {isStaff ? (
                  <>
                    {!selected && (
                      <p className="text-sm text-destructive">
                        En Mode établissement, la sélection d'un établissement est obligatoire pour générer une vidéo.
                      </p>
                    )}
                    <Input
                      placeholder="Rechercher par nom…"
                      value={selected ? selected.name : query}
                      onChange={(e) => {
                        setSelected(null);
                        setQuery(e.target.value);
                      }}
                    />
                    {!selected && businesses.length > 0 && (
                      <div className="rounded-md border border-border bg-popover divide-y">
                        {businesses.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className="block w-full text-left px-3 py-2 hover:bg-accent"
                            onClick={() => {
                              setSelected(b);
                              setQuery("");
                              setBusinesses([]);
                            }}
                          >
                            <div className="font-medium">{b.name}</div>
                            {b.city && <div className="text-xs text-muted-foreground">{b.city}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : ownedBusinessIds && ownedBusinessIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun établissement rattaché à votre compte. Créez-en un depuis « Présence en ligne ».
                  </p>
                ) : (
                  <div className="rounded-md border border-border bg-popover divide-y">
                    {businesses.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`block w-full text-left px-3 py-2 hover:bg-[#ECD6B8] ${selected?.id === b.id ? "bg-[#ECD6B8]" : ""}`}
                        onClick={() => setSelected(b)}
                      >
                        <div className="font-medium">{b.name}</div>
                        {b.city && <div className="text-xs text-muted-foreground">{b.city}</div>}
                      </button>
                    ))}
                  </div>
                )}


                {selected && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-2">
                    {statsLoading || !bizStats ? (
                      <p className="text-xs text-muted-foreground">Chargement des informations…</p>
                    ) : (
                      <>
                        <div>
                          <span className="font-medium">Hook : </span>
                          {bizStats.hook ? (
                            <span className="italic">« {bizStats.hook} »</span>
                          ) : (
                            <span className="text-destructive">Aucun</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span><span className="font-medium">Texte :</span> {bizStats.descLen} car.</span>
                          <span><span className="font-medium">Images :</span> {bizStats.images}</span>
                          <span><span className="font-medium">Vidéos :</span> {bizStats.videos}</span>
                          <span><span className="font-medium">Offres :</span> {bizStats.offers}</span>
                          <span><span className="font-medium">Popup :</span> {bizStats.popup ? "oui" : "non"}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
            </div>
          )}
        </section>
          )}

          {selected && bizImages.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Images de l'établissement
                  <span className="ml-2 text-xs text-muted-foreground">
                    {selectedImages.size}/{bizImages.length} sélectionnée{selectedImages.size > 1 ? "s" : ""}
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setSelectedImages(new Set(bizImages))}
                  >
                    Tout
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setSelectedImages(new Set())}
                  >
                    Aucune
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImages((s) => !s)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                    aria-label={showImages ? "Masquer les images" : "Afficher les images"}
                    title={showImages ? "Masquer" : "Afficher"}
                  >
                    {showImages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-base sm:text-lg font-bold text-destructive">
                Attention ! Evitez les images avec sur-impressions (logo/texte…)
              </p>

              {showImages && (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {bizImages.map((url, idx) => {
                      const checked = selectedImages.has(url);
                      const matches = mediaMatches.get(url) ?? [];
                      return (
                        <div
                          key={url}
                          className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                            checked ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : matches.length ? "border-secondary ring-2 ring-secondary/30" : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImages((prev) => {
                                const next = new Set(prev);
                                if (next.has(url)) next.delete(url);
                                else next.add(url);
                                return next;
                              });
                            }}
                            className="absolute inset-0 w-full h-full"
                            aria-label={checked ? "Désélectionner" : "Sélectionner"}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                            className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
                            aria-label="Plein écran"
                            title="Plein écran"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </button>
                          {url === popupImageUrl && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPopupPreviewOpen(true); }}
                              className="absolute top-1 left-1 bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow hover:bg-[#e5c14a]"
                              title="Aperçu de la popup d'accueil"
                            >
                              POPUP
                            </button>
                          )}
                          {matches.length > 0 && (
                            <div className="absolute bottom-1 left-1 bg-secondary text-secondary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {matches.slice(0, 2).join(" · ")}
                            </div>
                          )}
                          {checked && (
                            <div className="pointer-events-none absolute top-1 right-1 bg-[#C04F17] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Si aucune n'est cochée, l'IA choisit librement parmi toutes les images.</p>
                </>
              )}
            </section>
          )}

          {isCorporate && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              {(() => {
                const list = genericTab === "external" ? genericExternalVideos : genericInternalVideos;
                const selectedCount = list.filter((v) => selectedVideos.has(v.url)).length;
                return (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Label className="text-sm">
                        Vidéos génériques
                        <span className="ml-2 text-xs text-muted-foreground">
                          {selectedCount}/{list.length} sélectionnée{selectedCount > 1 ? "s" : ""}
                        </span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                          onClick={() =>
                            setSelectedVideos((prev) => {
                              const next = new Set(prev);
                              list.forEach((v) => next.add(v.url));
                              return next;
                            })
                          }
                        >
                          Toutes
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                          onClick={() =>
                            setSelectedVideos((prev) => {
                              const next = new Set(prev);
                              list.forEach((v) => next.delete(v.url));
                              return next;
                            })
                          }
                        >
                          Aucune
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGenericVideos((s) => !s)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded"
                          aria-label={showGenericVideos ? "Masquer les vidéos génériques" : "Afficher les vidéos génériques"}
                          title={showGenericVideos ? "Masquer" : "Afficher"}
                        >
                          {showGenericVideos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {showGenericVideos && (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGenericTab("external")}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${
                              genericTab === "external"
                                ? "bg-[#C04F17] text-white border-[#C04F17]"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Externes ({genericExternalVideos.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenericTab("internal")}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${
                              genericTab === "internal"
                                ? "bg-[#C04F17] text-white border-[#C04F17]"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Produites en interne ({genericInternalVideos.length})
                          </button>
                        </div>

                        {list.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {genericTab === "external"
                              ? "Aucune vidéo générique externe."
                              : "Aucune vidéo générée depuis le backoffice pour l'instant."}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {list.map((v) => {
                              const checked = selectedVideos.has(v.url);
                              return (
                                <div
                                  key={v.url}
                                  className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 bg-black transition ${
                                    checked ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : "border-border hover:border-muted-foreground"
                                  }`}
                                  title={v.title}
                                >
                                  {v.kind === "file" ? (
                                    <video
                                      src={v.url}
                                      controls
                                      preload="metadata"
                                      playsInline
                                      className="w-full h-full object-cover bg-black"
                                    />
                                  ) : v.thumbnail ? (
                                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/60">
                                      <Video className="h-6 w-6" />
                                    </div>
                                  )}
                                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-1">
                                    <p className="text-[10px] text-white truncate">{v.title}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedVideos((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(v.url)) next.delete(v.url);
                                        else next.add(v.url);
                                        return next;
                                      })
                                    }
                                    aria-label={checked ? "Désélectionner" : "Sélectionner"}
                                    className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border transition ${
                                      checked
                                        ? "bg-[#C04F17] text-white border-[#C04F17]"
                                        : "bg-black/60 text-white border-white/40 hover:bg-black/80"
                                    }`}
                                  >
                                    {checked ? "✓" : "+"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </section>
          )}

          {selected && bizVideos.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Vidéos de l'établissement
                  <span className="ml-2 text-xs text-muted-foreground">
                    {selectedVideos.size}/{bizVideos.length} sélectionnée{selectedVideos.size > 1 ? "s" : ""}
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setSelectedVideos(new Set(bizVideos.map((v) => v.url)))}
                  >
                    Toutes
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setSelectedVideos(new Set())}
                  >
                    Aucune
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVideos((s) => !s)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                    aria-label={showVideos ? "Masquer les vidéos" : "Afficher les vidéos"}
                    title={showVideos ? "Masquer" : "Afficher"}
                  >
                    {showVideos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-base sm:text-lg font-bold text-destructive">
                Attention ! Evitez les vidéos avec sur-impressions (logo/texte…) et choisissez des vidéos verticales
              </p>

              {showVideos && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {bizVideos.map((v, vIdx) => {
                      const globalIdx = bizImages.length + vIdx;
                      const checked = selectedVideos.has(v.url);
                      const matches = mediaMatches.get(v.url) ?? [];
                      const toggle = () => {
                        setSelectedVideos((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.url)) next.delete(v.url);
                          else next.add(v.url);
                          return next;
                        });
                      };
                      return (
                        <div key={v.url} className="space-y-1">
                        <div
                          className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 transition bg-black ${
                            checked ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : matches.length ? "border-secondary ring-2 ring-secondary/30" : "border-border hover:border-muted-foreground"
                          }`}
                          title={v.title}
                        >

                          {v.kind === "file" ? (
                            <>
                            <video
                              ref={(el) => { gridVideoRefs.current[v.url] = el; }}
                              src={v.url}
                              controls
                              preload="metadata"
                              playsInline
                              className="w-full h-full object-cover bg-black"
                              onLoadedMetadata={(e) => {
                                const el = e.currentTarget;
                                if (!el) return;
                                const s = videoStarts[v.url] ?? 0;
                                if (s > 0) el.currentTime = s;
                                const t = Number.isFinite(el.currentTime) ? el.currentTime : s;
                                setPlayHeads((p) => ({ ...p, [`grid:${v.url}`]: Math.round((t || s) * 10) / 10 }));
                              }}
                              onTimeUpdate={(e) => {
                                const el = e.currentTarget;
                                if (!el || !Number.isFinite(el.currentTime)) return;
                                const t = Math.round(el.currentTime * 10) / 10;
                                setPlayHeads((p) => (p[`grid:${v.url}`] === t ? p : { ...p, [`grid:${v.url}`]: t }));
                              }}
                              onSeeked={(e) => {
                                const el = e.currentTarget;
                                if (!el || !Number.isFinite(el.currentTime)) return;
                                setPlayHeads((p) => ({ ...p, [`grid:${v.url}`]: Math.round(el.currentTime * 10) / 10 }));
                              }}
                            />
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                              <span className="bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
                                ⏱ {(playHeads[`grid:${v.url}`] ?? videoStarts[v.url] ?? 0).toFixed(1)}s
                              </span>
                              <span className="bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
                                Start {(videoStarts[v.url] ?? 0).toFixed(1)}s · End {(videoEnds[v.url] ?? 0) > 0 ? `${videoEnds[v.url].toFixed(1)}s` : v.duration != null ? formatVideoDuration(v.duration) : "fin"}
                              </span>
                            </div>
                            </>

                          ) : v.thumbnail ? (
                            <button
                              type="button"
                              onClick={() => setLightboxIndex(globalIdx)}
                              className="block w-full h-full"
                            >
                              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/60">
                              <Video className="h-6 w-6" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-1">
                            <p className="text-[10px] text-white truncate">{v.title}</p>
                          </div>
                          {v.kind === "youtube" && (
                            <span className="pointer-events-none absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1 rounded">YT</span>
                          )}
                          {v.kind === "file" && v.duration != null && (
                            <span className="pointer-events-none absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">{formatVideoDuration(v.duration)}</span>
                          )}
                          {matches.length > 0 && (
                            <div className="absolute bottom-1 left-1 bg-secondary text-secondary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {matches.slice(0, 2).join(" · ")}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(globalIdx)}
                            aria-label="Plein écran"
                            title="Plein écran"
                            className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={toggle}
                            aria-label={checked ? "Désélectionner" : "Sélectionner"}
                            className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border transition ${
                              checked
                                ? "bg-[#C04F17] text-white border-[#C04F17]"
                                : "bg-black/60 text-white border-white/40 hover:bg-black/80"
                            }`}
                          >
                            {checked ? "✓" : "+"}
                          </button>
                        </div>
                        {v.kind === "file" && renderTimeRangeControls(v.url, v.duration, gridVideoRefs)}
                        </div>
                      );

                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Si aucune n'est cochée, l'IA choisit librement parmi toutes les vidéos.</p>

                  {orderedSelectedVideos.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <Label className="text-sm">
                        Ordre des vidéos dans le montage
                        <span className="block text-[11px] text-muted-foreground font-normal">
                          Glissez / déposez les vignettes (poignée) pour changer l'ordre. Le <b>Time Start</b> et le <b>Time End</b>
                          (secondes, précision 0,1 s) définissent le point de départ et de fin de la vidéo dans le montage.
                          Ils reprennent par défaut les valeurs saisies sur les vignettes ci-dessus.
                        </span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Durée totale utile : <b className="tabular-nums">{formatVideoDuration(orderedVideosTotalDuration.sum)}</b>
                        {" "}· {orderedSelectedVideos.length} vidéo{orderedSelectedVideos.length > 1 ? "s" : ""}
                        {orderedVideosTotalDuration.unknown > 0 && ` (${orderedVideosTotalDuration.unknown} sans durée connue)`}
                        {" "}· scénario {scenarioDuration}s
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {orderedSelectedVideos.map((url, i) => {
                          const v = videoPool.find((x) => x.url === url);
                          const start = videoStarts[url] ?? 0;
                          const end = videoEnds[url] ?? 0;
                          return (
                            <div
                              key={url}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragUrl) moveVideo(dragUrl, url);
                                setDragUrl(null);
                              }}
                              className={`w-full space-y-1 ${dragUrl === url ? "opacity-60" : ""}`}
                            >
                              <div
                                className={`relative w-full aspect-[9/16] rounded-md overflow-hidden border-2 bg-black ${
                                  dragUrl === url ? "border-[#C04F17]" : "border-border"
                                }`}
                                title={v?.title || url}
                              >
                                {v?.kind === "file" ? (
                                  <video
                                    ref={(el) => { orderVideoRefs.current[url] = el; }}
                                    src={url}
                                    controls
                                    preload="metadata"
                                    playsInline
                                    className="w-full h-full object-cover bg-black"
                                    onLoadedMetadata={(e) => {
                                      const el = e.currentTarget;
                                      if (!el) return;
                                      if (start > 0) el.currentTime = start;
                                      const t = Number.isFinite(el.currentTime) ? el.currentTime : start;
                                      setPlayHeads((p) => ({ ...p, [url]: t || start }));
                                    }}
                                    onTimeUpdate={(e) => {
                                      const el = e.currentTarget;
                                      if (!el || !Number.isFinite(el.currentTime)) return;
                                      const t = Math.round(el.currentTime * 10) / 10;
                                      setPlayHeads((p) => (p[url] === t ? p : { ...p, [url]: t }));
                                    }}
                                    onSeeked={(e) => {
                                      const el = e.currentTarget;
                                      if (!el || !Number.isFinite(el.currentTime)) return;
                                      const t = Math.round(el.currentTime * 10) / 10;
                                      setPlayHeads((p) => ({ ...p, [url]: t }));
                                    }}
                                  />
                                ) : v?.thumbnail ? (
                                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/60"><Video className="h-5 w-5" /></div>
                                )}
                                <span className="pointer-events-none absolute top-1 left-1 bg-[#C04F17] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
                                {v?.duration != null && (
                                  <span className="pointer-events-none absolute top-1 left-7 bg-black/70 text-white text-[9px] font-bold px-1 rounded">{formatVideoDuration(v.duration)}</span>
                                )}
                                {/* Badges Time Start / Time End centrés au milieu de la vignette */}
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                                  <span className="bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
                                    ⏱ {(playHeads[url] ?? start ?? 0).toFixed(1)}s
                                  </span>
                                  <span className="bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shadow">
                                    Start {start.toFixed(1)}s · End {end > 0 ? `${end.toFixed(1)}s` : v?.duration != null ? formatVideoDuration(v.duration) : "fin"}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setLightboxIndex(bizImages.length + bizVideos.findIndex((x) => x.url === url))}
                                  aria-label="Plein écran"
                                  title="Plein écran"
                                  className="absolute top-1 right-8 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 hover:bg-black/80"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                </button>
                                <span
                                  draggable
                                  onDragStart={() => setDragUrl(url)}
                                  onDragEnd={() => setDragUrl(null)}
                                  title="Déplacer"
                                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center border border-white/40 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </span>
                              </div>
                              {renderTimeRangeControls(url, v?.duration, orderVideoRefs)}

                            </div>
                          );
                        })}

                      </div>
                    </div>
                  )}




                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-[#C04F17]"
                        checked={continuousBg}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setContinuousBg(on);
                          if (on && !continuousBgUrl) {
                            const first = bizVideos.find((v) => v.kind === "file" && selectedVideos.has(v.url)) ?? bizVideos.find((v) => v.kind === "file");
                            if (first) setContinuousBgUrl(first.url);
                          }
                        }}
                      />
                      <span className="text-sm">
                        Afficher une seule vidéo en continu
                        <span className="block text-[11px] text-muted-foreground">
                          La vidéo choisie est montée en fond du début à la fin ; tous les autres fonds de scène sont neutralisés (seuls les textes défilent).
                        </span>
                      </span>
                    </label>
                    {continuousBg && (
                      <>
                        {(() => {
                          const sel = bizVideos.find((x) => x.url === continuousBgUrl);
                          return (
                            <div className="flex items-center gap-3">
                              <Button type="button" variant="outline" size="sm" onClick={() => setContinuousPickerOpen(true)}>
                                {continuousBgUrl ? "Changer la vidéo" : "Choisir la vidéo de fond"}
                              </Button>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {sel ? `${sel.title}${sel.duration != null ? ` · ${formatVideoDuration(sel.duration)}` : ""}` : "Aucune vidéo sélectionnée"}
                              </span>
                            </div>
                          );
                        })()}
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 accent-[#C04F17]"
                            checked={continuousBgSound}
                            onChange={(e) => setContinuousBgSound(e.target.checked)}
                          />
                          <span className="text-sm">
                            Utiliser le son
                            <span className="block text-[11px] text-muted-foreground">
                              La bande son d'origine de la vidéo est conservée dans le rendu final (aucun coût IA).
                            </span>
                          </span>
                        </label>
                        <Dialog open={continuousPickerOpen} onOpenChange={setContinuousPickerOpen}>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white text-black">
                            <DialogHeader>
                              <DialogTitle className="text-black">Sélection médias — vidéo de fond continue</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {bizVideos.filter((v) => v.kind === "file").map((v) => {
                                const isSel = v.url === continuousBgUrl;
                                return (
                                  <div
                                    key={v.url}
                                    className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 transition bg-black ${isSel ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : "border-neutral-300 hover:border-neutral-500"}`}
                                    title={v.title}
                                  >
                                    <video src={v.url} controls preload="metadata" playsInline className="w-full h-full object-cover bg-black" />
                                    <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-1">
                                      <p className="text-[10px] text-white truncate">{v.title}</p>
                                    </div>
                                    {v.duration != null && (
                                      <span className="pointer-events-none absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">{formatVideoDuration(v.duration)}</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => { setContinuousBgUrl(v.url); setContinuousPickerOpen(false); }}
                                      aria-label={isSel ? "Vidéo de fond sélectionnée" : "Choisir cette vidéo"}
                                      className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border transition ${isSel ? "bg-[#C04F17] text-white border-[#C04F17]" : "bg-black/60 text-white border-white/40 hover:bg-black/80"}`}
                                    >
                                      {isSel ? "✓" : "+"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </DialogContent>
                        </Dialog>


                        <p className="text-[11px] text-amber-500">
                          ⚠️ Faites attention à utiliser une vidéo plus longue que votre scénario, sinon elle bouclera sur le début une fois arrivée en fin de vidéo.
                        </p>
                        {(() => {
                          const v = bizVideos.find((x) => x.url === continuousBgUrl);
                          if (!v || v.duration == null) return null;
                          const ok = v.duration >= scenarioDuration;
                          return (
                            <p className={`text-[11px] ${ok ? "text-emerald-500" : "text-red-500"}`}>
                              Vidéo {formatVideoDuration(v.duration)} · scénario {scenarioDuration}s — {ok ? "durée suffisante." : "trop courte : elle bouclera."}
                            </p>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

            {lightboxIndex !== null && mediaItems[lightboxIndex] && (
              <div
                className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                onClick={() => setLightboxIndex(null)}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
                  className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
                  aria-label="Fermer"
                >
                  <X className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i === null ? null : (i - 1 + mediaItems.length) % mediaItems.length); }}
                  className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i === null ? null : (i + 1) % mediaItems.length); }}
                  className="absolute right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3"
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                  {lightboxIndex + 1} / {mediaItems.length}
                  {mediaItems[lightboxIndex].title && <span className="ml-3">{mediaItems[lightboxIndex].title}</span>}
                </div>
                <div className="max-w-[95vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const m = mediaItems[lightboxIndex];
                    if (m.kind === "image") {
                      return <img src={m.url} alt="" className="max-w-[95vw] max-h-[90vh] object-contain" />;
                    }
                    if (m.kind === "video") {
                      return (
                        <video
                          key={m.url}
                          src={m.url}
                          controls
                          autoPlay
                          playsInline
                          className="max-w-[95vw] max-h-[90vh] bg-black"
                        />
                      );
                    }
                    // youtube
                    const match = m.url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
                    const id = match?.[1];
                    return id ? (
                      <iframe
                        key={id}
                        src={`https://www.youtube.com/embed/${id}?autoplay=1`}
                        title={m.title}
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                        className="w-[90vw] h-[80vh] max-w-[1280px] bg-black"
                      />
                    ) : (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-white underline">{m.url}</a>
                    );
                  })()}
                </div>
              </div>
            )}

            {popupPreviewOpen && popupImageUrl && (
              <div
                className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
                onClick={() => setPopupPreviewOpen(false)}
              >
                <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="relative w-full aspect-[1333/1737] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${popupImageUrl})` }}
                  >
                    {(popupMeta.title || popupMeta.description) && (
                      <>
                        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
                        <div className="relative pt-12 px-6 pb-6 text-white">
                          {popupMeta.title && (
                            <h3 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 pr-12" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                              {popupMeta.title}
                            </h3>
                          )}
                          {popupMeta.description && (
                            <p className="text-base md:text-lg leading-relaxed text-white/98 font-medium whitespace-pre-line">
                              {popupMeta.description}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setPopupPreviewOpen(false)}
                      className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white hover:bg-neutral-100 text-black flex items-center justify-center shadow-lg z-10"
                      aria-label="Fermer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {reviewDialogOpen && (
              <div
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
                onClick={() => setReviewDialogOpen(false)}
              >
                <div
                  className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white text-neutral-900 border border-neutral-200 shadow-2xl flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <h3 className="text-lg font-bold">Sélectionner un avis client</h3>
                    <button
                      type="button"
                      onClick={() => setReviewDialogOpen(false)}
                      className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {reviewsList.length === 0 ? (
                      <div className="text-sm text-neutral-500 italic">Aucun avis publié pour cet établissement.</div>
                    ) : (
                      reviewsList.map((r) => {
                        const isSel = selectedReviewId === r.id;
                        return (
                          <label
                            key={r.id}
                            className={`block rounded-md border p-3 cursor-pointer transition ${isSel ? "border-primary bg-primary/5" : "border-neutral-200 hover:bg-neutral-100"}`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name="reviewSelect"
                                className="mt-1 h-4 w-4 accent-primary"
                                checked={isSel}
                                onChange={() => {
                                  setSelectedReviewId(r.id);
                                  // preselect the first sentence as default highlight
                                  const first = r.text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 200) || r.text.slice(0, 200);
                                  setReviewHighlight(first);
                                }}
                              />
                              <div className="min-w-0 flex-1 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{r.author || "Anonyme"}</span>
                                  {r.rating != null && <span className="text-[#C04F17] font-bold">{r.rating}/5</span>}
                                  {r.source && <span className="text-neutral-500">· {r.source}</span>}
                                </div>
                                <div className="mt-1 text-neutral-500 whitespace-pre-wrap">{r.text}</div>
                              </div>
                            </div>
                            {isSel && (
                              <div className="mt-3 pl-6 space-y-1">
                                <div className="text-[11px] font-medium text-neutral-500">Sélectionner l'extrait à mettre en avant :</div>
                                <textarea
                                  value={reviewHighlight}
                                  onChange={(e) => setReviewHighlight(e.target.value.slice(0, 240))}
                                  onClick={(e) => e.stopPropagation()}
                                  rows={2}
                                  maxLength={240}
                                  className="w-full text-xs rounded border border-neutral-200 bg-white p-2"
                                  placeholder="Colle ici la portion à mettre en avant"
                                />
                                <div className="text-[10px] text-neutral-500 text-right">{reviewHighlight.length}/240</div>
                              </div>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-end gap-2 p-3 border-t border-neutral-200">
                    <Button variant="outline" size="sm" onClick={() => setReviewDialogOpen(false)}>Annuler</Button>
                    <Button
                      size="sm"
                      disabled={!selectedReviewId}
                      onClick={() => setReviewDialogOpen(false)}
                    >
                      Valider
                    </Button>
                  </div>
                </div>
              </div>
            )}


          {canCompose && (
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <Label>Prompt / Éléments à inclure dans la vidéo</Label>
              <button
                type="button"
                onClick={() => setShowCompose((s) => !s)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                aria-label={showCompose ? "Masquer la section" : "Afficher la section"}
                title={showCompose ? "Masquer" : "Afficher"}
              >
                {showCompose ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {showCompose && (
            <>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format de la vidéo</Label>
                <div className="flex gap-2 flex-wrap">
                  {VIDEO_FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      variant={videoFormat === f.value ? "default" : "outline"}
                      onClick={() => setVideoFormat(f.value)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le montage s'adapte automatiquement au format choisi (typo, blocs, carte, widgets).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Durée</Label>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    type="button"
                    variant={durationAuto ? "default" : "outline"}
                    onClick={() => setDurationAuto(true)}
                  >
                    LAISSE L'IA DÉCIDER
                  </Button>
                  {VISIBLE_DURATIONS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={!durationAuto && duration === d ? "default" : "outline"}
                      onClick={() => { setDurationAuto(false); setDuration(d as 15 | 30 | 45 | 60); }}
                    >
                      {d}s
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Langue de la vidéo</Label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: "fr" as const, label: "Français" },
                    { value: "en" as const, label: "English" },
                  ]).map((l) => (
                    <Button

                      key={l.value}
                      type="button"
                      variant={videoLang === l.value ? "default" : "outline"}
                      onClick={() => setVideoLang(l.value)}
                    >
                      {l.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Indépendante de la langue du site. Repli automatique sur le français si une traduction manque.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ton</Label>
                <div className="flex gap-2 flex-wrap">
                  {VISIBLE_TONES.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant={tone === t.value ? "default" : "outline"}
                      onClick={() => setTone(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assistant texte</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={fromVideoOn ? "default" : "outline"}
                    onClick={() => {
                      const next = !fromVideoOn;
                      setFromVideoOn(next);
                      if (next && !fromVideoUrl && bizVideos.length > 0) setFromVideoUrl(bizVideos[0].url);
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" /> À partir de la vidéo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEstimateOpen(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Estimer la durée
                  </Button>
                </div>
              </div>
            </div>

            {fromVideoOn && (
              <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
                {bizVideos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune vidéo disponible pour cet établissement.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Vidéo source</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={fromVideoUrl ?? ""}
                        onChange={(e) => { setFromVideoUrl(e.target.value); setSynthTitle(""); setSynthText(""); }}
                      >
                        {bizVideos.map((v) => (
                          <option key={v.url} value={v.url}>
                            {v.kind === "youtube" ? "▶ " : "🎬 "}{v.title}
                            {v.duration ? ` — ${Math.floor(v.duration / 60)}:${String(Math.round(v.duration % 60)).padStart(2, "0")}` : ""}
                          </option>

                        ))}
                      </select>
                      {fromVideoUrl && youtubeIdFromUrl(fromVideoUrl) && (
                        <p className="text-[11px] text-muted-foreground">
                          ID vidéo : <span className="font-mono">{youtubeIdFromUrl(fromVideoUrl)}</span>
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 text-[12px]"
                      disabled={!fromVideoUrl || fromVideoLoading}
                      onClick={() => fromVideoUrl && runFromVideo(fromVideoUrl)}
                    >
                      {fromVideoLoading
                        ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Synthèse…</>
                        : <><Wand2 className="h-4 w-4 mr-1.5" /> Générer Titre + Texte</>}
                    </Button>
                    {(synthTitle || synthText) && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Titre (remplace le Hook — étape 2)</Label>
                          <Input
                            value={synthTitle}
                            maxLength={80}
                            onChange={(e) => setSynthTitle(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Texte de la vidéo</Label>
                          <Textarea
                            rows={3}
                            value={synthText}
                            maxLength={400}
                            onChange={(e) => setSynthText(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Offre (animation graphique discrète)</Label>
                          <Input
                            value={synthPriceLine}
                            maxLength={80}
                            placeholder="Ex. Vente — Prix: Sur demande"
                            onChange={(e) => setSynthPriceLine(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 text-[12px]"
                          onClick={() => {
                            setEstimateText(`${synthTitle}\n${synthText}`.trim());
                            setEstimateResult(null);
                            setEstimateOpen(true);
                          }}
                        >
                          Estimer la durée de ce texte
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}


            <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
              <DialogContent className="max-w-lg bg-white text-black">
                <DialogHeader>
                  <DialogTitle className="text-black">Estimer la durée du clip</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {fromVideoOn && (synthTitle || synthText) && (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1">
                      <div><span className="text-neutral-500">Titre : </span><span className="font-semibold">{synthTitle || "—"}</span></div>
                      <div><span className="text-neutral-500">Txt : </span>{synthText || "—"}</div>
                      {fromVideoUrl && youtubeIdFromUrl(fromVideoUrl) && (
                        <div className="text-neutral-500">ID vidéo : <span className="font-mono">{youtubeIdFromUrl(fromVideoUrl)}</span></div>
                      )}
                    </div>
                  )}
                  <Textarea
                    rows={6}
                    placeholder="Collez ici le texte à afficher dans le clip…"
                    value={estimateText}
                    onChange={(e) => { setEstimateText(e.target.value); setEstimateResult(null); }}
                    className="text-sm bg-white text-black border-neutral-300 placeholder:text-neutral-400"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-neutral-600 whitespace-nowrap">Mots par bloc</Label>
                    <Input
                      type="number"
                      min={3}
                      max={40}
                      value={wordsPerBlock}
                      onChange={(e) => setWordsPerBlock(Math.max(3, Math.min(40, Number(e.target.value) || 12)))}
                      className="h-8 w-20 text-xs bg-white text-black border-neutral-300"
                    />
                    {estimateResult && (
                      <span className="text-[11px] text-neutral-500">
                        → {Math.max(1, Math.ceil(estimateResult.words / wordsPerBlock))} bloc(s) sur {estimateResult.seconds}s
                      </span>
                    )}
                  </div>
                  {estimateResult && estimateBlocks.length > 0 && (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="font-semibold uppercase tracking-wider">Aperçu du découpage</span>
                        <span>{estimateBlocks.length} bloc(s) · {estimateResult.seconds}s</span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                        {estimateBlocks.map((b, i) => (
                          <div
                            key={i}
                            style={{ width: `${((b.end - b.start) / estimateResult.seconds) * 100}%` }}
                            className={i % 2 === 0 ? "bg-primary" : "bg-primary/50"}
                          />
                        ))}
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {estimateBlocks.map((b, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className="font-mono text-[11px] text-neutral-500 whitespace-nowrap pt-0.5">
                              {b.start.toFixed(1)}s → {b.end.toFixed(1)}s
                            </span>
                            <span className="text-black">{b.text}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Le dernier bloc se termine exactement à la fin de la durée estimée.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" onClick={runEstimate} disabled={estimateLoading}>
                      {estimateLoading
                        ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Estimation…</>
                        : <>Estimer</>}
                    </Button>
                    {estimateResult && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-neutral-300 text-black hover:bg-neutral-100"
                        onClick={insertEstimatedStep}
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Insérer une étape ({estimateResult.seconds}s)
                      </Button>
                    )}
                    {estimateResult && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-neutral-300 text-black hover:bg-neutral-100"
                        onClick={() => {
                          const d = [15, 30, 45, 60].find((x) => x >= estimateResult.seconds) ?? 60;
                          setDurationAuto(false);
                          setDuration(d as 15 | 30 | 45 | 60);
                          setEstimateOpen(false);
                          toast.success(`Durée réglée sur ${d}s.`);
                        }}
                      >
                        Appliquer à la durée
                      </Button>
                    )}
                  </div>
                  {estimateResult && (
                    <p className="text-sm text-black">
                      Durée estimée : <span className="font-semibold">{estimateResult.seconds}s</span>{" "}
                      <span className="text-neutral-500 text-xs">({estimateResult.words} mots · {estimateResult.chars} caractères)</span>
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>



            <div className="space-y-2">
              <Label>Prompt</Label>
              {refineFrom && (
                <div className="flex items-start justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Affinage d'une vidéo précédente
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{refineFrom.prompt}</p>
                    <p className="text-muted-foreground/80">
                      Décris uniquement les modifications à apporter (le reste sera conservé).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefineFrom(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Annuler l'affinage"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Textarea
                id="prompt-area"
                rows={5}
                placeholder={refineFrom
                  ? "Ex : remplace l'image de couverture par la 2e, raccourcis le hook, ajoute les horaires…"
                  : "Le prompt se remplit automatiquement à partir de l'établissement sélectionné."}
                value={prompt}
                onChange={(e) => { if (refineFrom) setPrompt(e.target.value); }}
                readOnly={!refineFrom}
                maxLength={2000}
                className={`text-lg md:text-xl p-4 min-h-[220px] md:min-h-[150px] ${!refineFrom ? "cursor-default bg-muted/40" : ""}`}
                aria-readonly={!refineFrom}
                title={!refineFrom ? "Le prompt principal n'est pas modifiable — utilisez les options et l'aperçu du scénario ci-dessous." : undefined}
              />
              {!refineFrom && (
                <p className="text-[11px] text-muted-foreground italic">
                  Prompt en lecture seule. Les options ci-dessous et l'aperçu du scénario permettent de personnaliser la vidéo.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Label className="text-sm">Éléments à inclure dans la vidéo</Label>
              <div className="flex flex-col gap-2 text-sm">
                {logoInfo.url && logoInfo.bg === "transparent" && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                        checked={optOpenWithLogo}
                        onChange={(e) => setOptOpenWithLogo(e.target.checked)}
                      />
                      <span className="font-medium">Ouvrir avec le logo</span>
                    </label>
                    <div className={`mt-2 flex gap-3 items-center ${optOpenWithLogo ? "opacity-100" : "opacity-50"}`}>
                      <div className="shrink-0 relative w-20 h-20 rounded-md overflow-hidden border border-border bg-[repeating-conic-gradient(#e5e7eb_0_25%,#f9fafb_0_50%)] bg-[length:16px_16px] flex items-center justify-center">
                        <img src={logoInfo.url} alt="Logo" className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                        Logo sur fond transparent — utilisé comme séquence d'ouverture avant le nom.
                      </div>
                    </div>
                  </div>
                 )}
                 {welcomeLabelText && (
                   <div className="rounded-md border border-border bg-background/40 p-2">
                     <label className="flex items-start gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                         checked={optWelcome}
                         onChange={(e) => setOptWelcome(e.target.checked)}
                       />
                       <span className="font-medium">BIENVENUE — « {welcomeLabelText} »</span>
                     </label>
                     <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                       Étape placée juste après l'ouverture logo, avant Nom &amp; identité (Présence en ligne / CTAs).
                     </p>
                   </div>
                 )}
                 {propositionLabelText && (
                   <div className="rounded-md border border-border bg-background/40 p-2">
                     <label className="flex items-start gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                         checked={optProposition}
                         onChange={(e) => setOptProposition(e.target.checked)}
                       />
                       <span className="font-medium">PROPOSITION — « {propositionLabelText} »</span>
                     </label>
                     <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                       Étape placée après Bienvenue, avant Nom &amp; identité (Présence en ligne / CTAs).
                     </p>
                   </div>
                 )}



                <div className="rounded-md border border-border bg-background/40 p-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                      checked={optAiCard}
                      onChange={(e) => setOptAiCard(e.target.checked)}
                    />
                    <span className="font-medium">Carte IA</span>
                  </label>
                  <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                    Une carte « Offre » entièrement rédigée par l'IA à partir de votre consigne (pas issue de vos offres en base). Placée juste après le Hook. Décochée, aucune carte inventée n'est générée.
                  </p>
                </div>

                {popupImageUrl && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                        checked={optPopup}
                        onChange={(e) => setOptPopup(e.target.checked)}
                      />
                      <span className="font-medium">Image POPUP de bienvenue (titre + texte)</span>
                    </label>
                    <div className={`mt-2 flex gap-3 ${optPopup ? "opacity-100" : "opacity-50"}`}>
                      <button
                        type="button"
                        onClick={() => setPopupPreviewOpen(true)}
                        className="shrink-0 relative w-20 h-20 rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary transition"
                        title="Aperçu plein écran"
                      >
                        <img src={popupImageUrl} alt="Popup" className="w-full h-full object-cover" />
                      </button>
                      <div className="min-w-0 flex-1 text-xs space-y-1">
                        <div>
                          <span className="text-muted-foreground">Titre : </span>
                          {popupMeta.title
                            ? <span className="font-semibold">{popupMeta.title}</span>
                            : <span className="text-muted-foreground italic">—</span>}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Texte : </span>
                          {popupMeta.description
                            ? <span className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: popupMeta.description }} />
                            : <span className="text-muted-foreground italic">—</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {blogPosts.length > 0 && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                        checked={optBlogArticles}
                        onChange={(e) => setOptBlogArticles(e.target.checked)}
                      />
                      <span className="font-medium">Articles de blog propriétaires ({blogPosts.length})</span>
                    </label>
                    {optBlogArticles && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Effet par défaut :</span>
                          <button
                            type="button"
                            onClick={() => setBlogMode("hero_map")}
                            className={`rounded-full border px-2.5 py-1 ${blogMode === "hero_map" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            Hero + zoom carte animée
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlogMode("scroll")}
                            className={`rounded-full border px-2.5 py-1 ${blogMode === "scroll" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            Scroll vertical de l'article
                          </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                          {blogPosts.map((b) => {
                            const checked = selectedBlogIds.has(b.id);
                            const mode = blogModes[b.id] || blogMode;
                            return (
                              <div key={b.id} className="rounded px-1 py-1 hover:bg-muted/50">
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                                    checked={checked}
                                    onChange={(e) => {
                                      setSelectedBlogIds((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(b.id); else next.delete(b.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  {b.cover && <img src={b.cover} alt="" className="h-8 w-12 rounded object-cover shrink-0" />}
                                  <span className="truncate">{b.title}</span>
                                </label>
                                {checked && (
                                  <div className="mt-1 ml-6 flex flex-wrap gap-1.5 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => setBlogModes((prev) => ({ ...prev, [b.id]: "hero_map" }))}
                                      className={`rounded-full border px-2 py-0.5 ${mode === "hero_map" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                    >
                                      Hero + zoom
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBlogModes((prev) => ({ ...prev, [b.id]: "scroll" }))}
                                      className={`rounded-full border px-2 py-0.5 ${mode === "scroll" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                    >
                                      Scroll vertical
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </div>
                )}
                {offersList.length > 0 && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Offres de l'établissement ({offersList.length})</div>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={() => setSelectedOfferIds(new Set(offersList.map((o) => o.id)))}
                        >
                          Tout
                        </button>
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={() => setSelectedOfferIds(new Set())}
                        >
                          Aucun
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {offersList.map((o) => {
                        const checked = selectedOfferIds.has(o.id);
                        const amount = o.promotion_type === "percentage" && o.promotion_value != null
                          ? `-${o.promotion_value}%`
                          : o.promotion_type === "fixed" && o.promotion_value != null
                            ? `-${o.promotion_value} ${o.promotion_currency || "MAD"}`
                            : o.savings_amount != null
                              ? `-${o.savings_amount} ${o.promotion_currency || "MAD"}`
                              : null;
                        return (
                          <label key={o.id} className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 p-2 hover:bg-muted/40">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedOfferIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(o.id);
                                  else next.delete(o.id);
                                  return next;
                                });
                              }}
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold truncate">{o.title}</span>
                                {amount && <span className="shrink-0 font-black text-[#C04F17]">{amount}</span>}
                              </div>
                              {o.message && (
                                <div
                                  className="mt-1 text-muted-foreground line-clamp-2"
                                  dangerouslySetInnerHTML={{ __html: o.message }}
                                />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {highlightsList.length > 0 && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Blocs highlights ({highlightsList.length})</div>
                      <div className="flex gap-2 text-xs">
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedHighlightIds(new Set(highlightsList.map((h) => h.id)))}>Tout</button>
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedHighlightIds(new Set())}>Aucun</button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {highlightsList.map((h) => {
                        const checked = selectedHighlightIds.has(h.id);
                        return (
                          <label key={h.id} className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 p-2 hover:bg-muted/40">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedHighlightIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(h.id); else next.delete(h.id);
                                  return next;
                                });
                              }}
                            />
                            {h.image_url ? (
                              <img src={h.image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 text-lg">{h.icon || "✨"}</div>
                            )}
                            <div className="min-w-0 flex-1 text-xs space-y-1">
                              <div>
                                <span className="text-muted-foreground">Titre : </span>
                                {h.title
                                  ? <span className="font-semibold break-words">{h.title}</span>
                                  : <span className="text-muted-foreground italic">—</span>}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Texte : </span>
                                {h.description
                                  ? <span className="text-muted-foreground whitespace-pre-wrap break-words">{h.description}</span>
                                  : <span className="text-muted-foreground italic">—</span>}
                              </div>
                              {(h.metric_title || h.metric_value) && (
                                <div className="mt-1 text-[#C04F17] font-semibold">{h.metric_value} {h.metric_title && <span className="text-muted-foreground font-normal">— {h.metric_title}</span>}</div>
                              )}
                              {checked && (
                                <div className="mt-1 flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                  <span className="text-muted-foreground shrink-0">Effet</span>
                                  <select
                                    value={highlightEffects[h.id] || ""}
                                    onChange={(e) => setHighlightEffects((prev) => ({ ...prev, [h.id]: e.target.value }))}
                                    className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                                  >
                                    <option value="">Ken Burns (défaut)</option>
                                    {MOTION_EFFECT_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </label>

                        );
                      })}
                    </div>
                  </div>
                )}
                {aiTextsList.length > 0 && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">TXT IA ({aiTextsList.length})</div>
                      <div className="flex gap-2 text-xs">
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedAiTextIds(new Set(aiTextsList.map((s) => s.id)))}>Tout</button>
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedAiTextIds(new Set())}>Aucun</button>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Textes IA du Master (Présence en ligne / TXT IA) : une séquence « Texte IA » de 5 s par texte coché (titre + texte). Média de fond par rotation, ou média assigné via « Ajouter média » dans la carte du scénario.</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {aiTextsList.map((s) => {
                        const checked = selectedAiTextIds.has(s.id);
                        return (
                        <label key={s.id} className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 p-2 hover:bg-muted/40">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedAiTextIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(s.id); else next.delete(s.id);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="font-semibold break-words">{s.title || "Texte IA"}</div>
                            {s.content && <div className="mt-1 text-muted-foreground line-clamp-3 break-words">{s.content}</div>}
                            {checked && (
                              <div className="mt-1 flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                <span className="text-muted-foreground shrink-0">Effet</span>
                                <select
                                  value={aiTextEffects[s.id] || "zoom_in"}
                                  onChange={(e) => setAiTextEffects((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                  className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                                >
                                  {MOTION_EFFECT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Étape « Résumé IA » retirée (non utilisée). */}

                <div className="rounded-md border border-border bg-background/40 p-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                      checked={optWeatherWidget}
                      onChange={(e) => setOptWeatherWidget(e.target.checked)}
                    />
                    <span className="font-medium">Widget Météo</span>
                  </label>
                  {optWeatherWidget && (
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Période :</span>
                        {([1, 3, 7] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setWeatherRange(r)}
                            className={`rounded-full border px-2.5 py-1 ${weatherRange === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {r === 1 ? "1 jour" : `${r} jours`}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Ville</span>
                        <select
                          value={weatherCity}
                          onChange={(e) => setWeatherCity(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                        >
                          {WEATHER_CITY_OPTIONS.map((c) => (
                            <option key={c.slug} value={c.slug}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Étape de 3 s par défaut. 1 jour = défilement des 24 h ; 3 / 7 jours = défilement jour par jour. La ville reste modifiable dans la carte de l'étape du scénario.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border bg-background/40 p-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                      checked={optTidesWidget}
                      onChange={(e) => setOptTidesWidget(e.target.checked)}
                    />
                    <span className="font-medium">Widget Marées, Vents &amp; Météo</span>
                  </label>
                  {optTidesWidget && (
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Montage :</span>
                        {([
                          { v: "all", l: "Tous" },
                          { v: "tides", l: "Marées" },
                          { v: "wind", l: "Vents" },
                          { v: "weather", l: "Météo" },
                        ] as const).map((m) => (
                          <button
                            key={m.v}
                            type="button"
                            onClick={() => setTidesMode(m.v)}
                            className={`rounded-full border px-2.5 py-1 ${tidesMode === m.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {m.l}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Ville</span>
                        <select
                          value={tidesCity}
                          onChange={(e) => setTidesCity(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                        >
                          {TIDES_CITY_OPTIONS.map((c) => (
                            <option key={c.slug} value={c.slug}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Étape de 3 s par défaut : défilement de la prévision sur 24 h. « Tous » monte les marées, les vents puis la météo. La ville reste modifiable dans la carte de l'étape du scénario.
                      </p>
                    </div>
                  )}
                </div>

                {externalLinksList.length > 0 && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Ajouter liens externes ({externalLinksList.length})</div>
                      <div className="flex gap-2 text-xs">
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedExternalLinkIds(new Set(externalLinksList.map((l) => l.id)))}>Tout</button>
                        <button type="button" className="underline hover:text-primary" onClick={() => setSelectedExternalLinkIds(new Set())}>Aucun</button>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Libellés existants (Media, Partenaires…) : une séquence de 5 s par lien coché.</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {externalLinksList.map((l) => (
                        <label key={l.id} className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 p-2 hover:bg-muted/40">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                            checked={selectedExternalLinkIds.has(l.id)}
                            onChange={(e) => {
                              setSelectedExternalLinkIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(l.id); else next.delete(l.id);
                                return next;
                              });
                            }}
                          />
                          {l.image && <img src={l.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
                          <div className="min-w-0 flex-1 text-xs">
                            {l.label && <div className="uppercase tracking-widest text-[10px] text-[#C04F17] font-bold">{l.label}</div>}
                            <div className="font-semibold break-words">{l.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {reviewsCounterAvailable && (
                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optReviews} onChange={(e) => setOptReviews(e.target.checked)} />
                      <span className="font-medium">Compteur d'avis client + badge avis (note/20)</span>
                    </label>
                    <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                      {reviewsAggregate.avgOn20 != null
                        ? `Note agrégée ${formatRating(reviewsAggregate.avgOn20)}/20 · ${totalReviewCount.toLocaleString("fr-FR")} avis (9 plateformes, moyenne pondérée).`
                        : "Scène dédiée avec la note /20 agrégée et le nombre total d'avis."}
                    </p>
                  </div>
                )}
                {/* Plateformes d'avis externes — masquées si moins de 10 avis */}
                {(() => {
                  const platforms: Array<{ key: "google" | "tripadvisor" | "restaurant_guru"; label: string; checked: boolean; setter: (v: boolean) => void }> = [
                    { key: "google", label: "Avis Google", checked: optGoogleReviews, setter: setOptGoogleReviews },
                    { key: "tripadvisor", label: "TripAdvisor", checked: optTripAdvisor, setter: setOptTripAdvisor },
                    { key: "restaurant_guru", label: "Restaurant Guru", checked: optRestaurantGuru, setter: setOptRestaurantGuru },
                  ];
                  return platforms
                    .filter((p) => platformReviewAvailable[p.key])
                    .map((p) => {
                      const d = platformData[p.key];
                      return (
                        <div key={p.key} className="rounded-md border border-border bg-background/40 p-2">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                              checked={p.checked}
                              onChange={(e) => p.setter(e.target.checked)}
                            />
                            <span className="font-medium text-sm">
                              {p.label}
                              {selected && (
                                <em className="ml-2 not-italic text-xs opacity-70 font-normal">
                                  {d.rating ? `${d.rating.toFixed(1)}/5` : ""}
                                  {d.count ? ` · ${d.count} avis` : ""}
                                </em>
                              )}
                            </span>
                          </label>
                          <p className="mt-1 pl-6 text-[11px] text-muted-foreground">Scène propre avec logo plateforme, note et effet dynamique.</p>
                        </div>
                      );
                    });

                })()}
                {/* Montrer un avis client */}
                {(() => {
                  const available = !selected || reviewsList.length > 0;
                  const chosen = selectedReviewId ? reviewsList.find((r) => r.id === selectedReviewId) : null;
                  return (
                    <div className={`rounded-md border border-border bg-background/40 p-2 ${available ? "" : "opacity-50"}`}>
                      <label className={`flex items-start gap-2 ${available ? "cursor-pointer" : "cursor-not-allowed"}`}>
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto disabled:cursor-not-allowed"
                          checked={available && optCustomerReview}
                          disabled={!available}
                          onChange={(e) => {
                            setOptCustomerReview(e.target.checked);
                            if (e.target.checked && !selectedReviewId && reviewsList.length > 0) {
                              setReviewDialogOpen(true);
                            }
                          }}
                        />
                        <span className="font-medium">Montrer un avis client {selected && !available && <em className="ml-1 text-xs opacity-70 font-normal">(aucun avis)</em>}</span>
                      </label>
                      {available && optCustomerReview && (
                        <div className="mt-2 pl-6 space-y-2">
                          {chosen ? (
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{chosen.author || "Anonyme"}</span>
                                {chosen.rating != null && <span className="text-[#C04F17] font-bold">{chosen.rating}/5</span>}
                                {chosen.source && <span className="text-muted-foreground">· {chosen.source}</span>}
                              </div>
                              <div className="text-muted-foreground line-clamp-3">{chosen.text}</div>
                              {reviewHighlight && (
                                <div className="mt-1 rounded bg-primary/10 text-primary p-1.5">
                                  <span className="font-semibold">Extrait mis en avant : </span>« {reviewHighlight} »
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">Aucun avis sélectionné</div>
                          )}
                          <button
                            type="button"
                            className="text-xs underline hover:text-primary"
                            onClick={() => setReviewDialogOpen(true)}
                          >
                            {chosen ? "Modifier la sélection" : "Sélectionner un avis"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  const hoursAvailable = !selected || (bizStats?.hoursPublished ?? false);
                  return (
                    <label className={`flex items-start gap-2 ${hoursAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`} title={hoursAvailable ? undefined : "Horaires non publiées pour cet établissement"}>
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto disabled:cursor-not-allowed" checked={hoursAvailable && optHours} disabled={!hoursAvailable} onChange={(e) => setOptHours(e.target.checked)} />
                      <span>Horaires d'ouverture {selected && !hoursAvailable ? <em className="text-xs opacity-70">(non publiées)</em> : null}</span>
                    </label>
                  );
                })()}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optMapMarker} onChange={(e) => setOptMapMarker(e.target.checked)} />
                  <span>Marqueur sur la Google Map</span>
                </label>
                {(() => {
                  const digitalIdAvailable = !selected || (bizStats?.isActive ?? false);
                  return (
                    <label className={`flex items-start gap-2 ${digitalIdAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`} title={digitalIdAvailable ? undefined : "L'ID numérique nécessite un établissement actif"}>
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto disabled:cursor-not-allowed" checked={digitalIdAvailable && optDigitalId} disabled={!digitalIdAvailable} onChange={(e) => setOptDigitalId(e.target.checked)} />
                      <span>ID numérique (fiche + partage + QR code) {selected && !digitalIdAvailable ? <em className="text-xs opacity-70">(établissement inactif)</em> : null}</span>
                    </label>
                  );
                })()}
                {(() => {
                  // On ne propose l'option WhatsApp que si un numéro est effectivement renseigné.
                  if (!whatsappNumber) return null;
                  return (
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                          checked={optWhatsapp}
                          onChange={(e) => setOptWhatsapp(e.target.checked)}
                        />
                        <span className="font-medium text-sm">
                          WhatsApp
                          <em className="ml-2 not-italic text-xs opacity-70 font-normal">{whatsappNumber}</em>
                        </span>
                      </label>
                      <p className="mt-1 pl-6 text-[11px] text-muted-foreground">Scène dédiée avec effet libre au montage — logo WhatsApp (#25D366), numéro et invitation à contacter.</p>
                    </div>
                  );
                })()}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optInstallCta} onChange={(e) => setOptInstallCta(e.target.checked)} />
                  <span>Incitation finale à installer l'app</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Label className="text-sm">Place du texte</Label>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 rounded-full border-gray-300 bg-white accent-primary appearance-auto"
                    name="text-position"
                    value="top"
                    checked={textPosition === "top"}
                    onChange={(e) => setTextPosition(e.target.value as "top" | "middle" | "bottom")}
                  />
                  <span>Haut</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 rounded-full border-gray-300 bg-white accent-primary appearance-auto"
                    name="text-position"
                    value="middle"
                    checked={textPosition === "middle"}
                    onChange={(e) => setTextPosition(e.target.value as "top" | "middle" | "bottom")}
                  />
                  <span>Milieu (par défaut)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 rounded-full border-gray-300 bg-white accent-primary appearance-auto"
                    name="text-position"
                    value="bottom"
                    checked={textPosition === "bottom"}
                    onChange={(e) => setTextPosition(e.target.value as "top" | "middle" | "bottom")}
                  />
                  <span>Bas</span>
                </label>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <Label className="text-sm">Transitions entre les plans</Label>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Type de transition</span>
                <select
                  value={transitionStyle}
                  onChange={(e) => setTransitionStyle(e.target.value as typeof transitionStyle)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="auto">Auto — l'IA choisit selon le média (par défaut)</option>
                  <option value="doux">Doux</option>
                  <option value="dynamique">Dynamique</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto"
                  checked={transitionDifferentiate}
                  onChange={(e) => setTransitionDifferentiate(e.target.checked)}
                />
                <span>Différencier selon le média (vidéos / images)</span>
              </label>
              {transitionDifferentiate && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Plans vidéo</span>
                    <select
                      value={transitionVideo}
                      onChange={(e) => setTransitionVideo(e.target.value as TransitionEffectId)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {(["crossfade", "fade_black", "wipe", "zoom", "cut"] as TransitionEffectId[]).map((k) => (
                        <option key={k} value={k}>{TRANSITION_EFFECT_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Plans images</span>
                    <select
                      value={transitionImage}
                      onChange={(e) => setTransitionImage(e.target.value as TransitionEffectId)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {(["kenburns", "crossfade", "slide", "fade_black", "wipe", "cut", "fast", "mix"] as TransitionEffectId[]).map((k) => (
                        <option key={k} value={k}>{TRANSITION_EFFECT_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Le mode <strong>Auto</strong> applique un fondu enchaîné aux plans vidéo et un Ken Burns aux plans images.
                <br /><strong>Enchaînement rapide</strong> accélère le défilement des images ; <strong>Mix</strong> alterne tous les effets images (sauf l'enchaînement rapide).
                <br />Si <strong>aucune étape n'a de média assigné</strong> et que seules des images sont sélectionnées, toutes les images défilent à fréquence constante sur toute la durée de la vidéo.
                {continuousBg && continuousBgUrl ? (
                  <> <br />Avec <strong>une seule vidéo en continu</strong>, le fond ne change jamais : la transition s'applique uniquement aux textes et blocs graphiques (fondu enchaîné ou slide).</>
                ) : null}

              </p>
            </div>





            <div className="flex flex-wrap gap-2">
              <Button onClick={previewScenario} disabled={previewing || submitting} variant={scenarioStale ? "default" : "secondary"} className="gap-2">
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiScenario ? (scenarioStale ? "Régénérer le scénario (paramètres modifiés)" : "Régénérer le scénario (IA)") : "PRÉVISUALISER LE SCÉNARIO"}
              </Button>
            </div>
            </>
            )}
          </section>
          )}

          {canCompose && scenarioPreviewed && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Scénario</Label>
                <button
                  type="button"
                  onClick={() => setShowScenario((s) => !s)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                  aria-label={showScenario ? "Masquer le scénario" : "Afficher le scénario"}
                  title={showScenario ? "Masquer" : "Afficher"}
                >
                  {showScenario ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              {showScenario && (
            aiScenario ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Scénario IA · template {aiScenario.templateId}</span>
                  <Button size="sm" variant="ghost" onClick={() => setAiScenario(null)} className="h-7 text-xs">Effacer</Button>
                </div>
                {aiScenario.rationale && (
                  <p className="text-xs italic text-muted-foreground">{aiScenario.rationale}</p>
                )}
                <StudioVideoScenarioPanel
                  scenario={aiScenario.scenario}
                  availableMedia={availableSceneMedia}
                  sceneMedia={sceneMedia}
                  onChangeSceneMedia={setSceneMedia}
                  onChangeScenarioEdits={setScenarioEdits}
                  openAddDialog={addStepOpen}
                  onOpenAddDialogChange={setAddStepOpen}
                  beforeTimeline={soundtrackBlock}
                  availablePois={poiOptions}
                  availableDestinations={destOptions}
                  pendingCustomScene={pendingCustomScene}
                  onPendingCustomSceneConsumed={() => setPendingCustomScene(null)}
                  onRegenerate={previewScenario}
                  regenerating={previewing}
                  introBadgeOptions={introBadgeOptions}
                  introBadgeCodes={introBadgeCodes}
                  onIntroBadgeChange={handleIntroBadgeChange}
                />
              </div>
            ) : scenario ? (
              <StudioVideoScenarioPanel
                scenario={scenario}
                availableMedia={availableSceneMedia}
                sceneMedia={sceneMedia}
                onChangeSceneMedia={setSceneMedia}
                onChangeScenarioEdits={setScenarioEdits}
                openAddDialog={addStepOpen}
                onOpenAddDialogChange={setAddStepOpen}
                beforeTimeline={soundtrackBlock}
                availablePois={poiOptions}
                availableDestinations={destOptions}
                pendingCustomScene={pendingCustomScene}
                onPendingCustomSceneConsumed={() => setPendingCustomScene(null)}
                onRegenerate={previewScenario}
                regenerating={previewing}
                introBadgeOptions={introBadgeOptions}
                introBadgeCodes={introBadgeCodes}
                onIntroBadgeChange={handleIntroBadgeChange}
              />
            ) : null
              )}
            </section>
          )}

          {canCompose && scenarioPreviewed && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={notifyEmail} onCheckedChange={(v) => setNotifyEmail(!!v)} />
                  <span>Confirmation par email quand la vidéo est prête</span>
                </label>
                {notifyEmail && (
                  <Input
                    type="email"
                    value={notifyEmailTo}
                    onChange={(e) => setNotifyEmailTo(e.target.value)}
                    placeholder="votre@email.com"
                    className="max-w-sm"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => submit()} disabled={submitting || hasActiveJob || preflightRunning} className="gap-2">
                  {submitting || hasActiveJob || preflightRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {preflightRunning ? "Vérification des médias…" : hasActiveJob ? "Job déjà lancé…" : refineFrom ? "Générer la version affinée" : "Générer la vidéo"}
                </Button>
              </div>

              <Dialog open={preflightOpen} onOpenChange={setPreflightOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Vérification des médias avant rendu</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      {preflightIssues.some((i) => i.severity === "block")
                        ? "Certains médias ne sont pas rendables : le rendu échouerait. Corrigez-les puis relancez."
                        : "Points de vigilance détectés. Vous pouvez lancer malgré tout."}
                    </p>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {preflightIssues.map((i, idx) => (
                        <div
                          key={`${i.url}-${idx}`}
                          className={`rounded-md border p-2 ${i.severity === "block" ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"}`}
                        >
                          <div className="font-medium">
                            {i.severity === "block" ? "⛔ " : "⚠️ "}
                            {i.label}
                          </div>
                          <div className="text-muted-foreground">{i.reason}</div>
                          <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{i.url}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setPreflightOpen(false)}>Corriger</Button>
                      <Button
                        variant={preflightIssues.some((i) => i.severity === "block") ? "outline" : "default"}
                        onClick={() => {
                          setPreflightOpen(false);
                          void submit({ skipPreflight: true });
                        }}
                      >
                        Lancer quand même
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

          )}


          {activeJobs.length > 0 && (
            <section id="studio-active-job" className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{activeJobs.length === 1 ? "Job en cours" : "Jobs en cours"}</h2>
                <button
                  type="button"
                  onClick={() => setShowActiveJob((s) => !s)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                  aria-label={showActiveJob ? "Masquer les jobs" : "Afficher les jobs"}
                  title={showActiveJob ? "Masquer" : "Afficher"}
                >
                  {showActiveJob ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              {showActiveJob && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Une vidéo peut prendre jusqu'à 10 minutes pour être générée.
                  </p>
                  <div className="space-y-3">
                    {activeJobs.map((j) => (
                      <JobCard key={j.id} job={j} businessName={j.business_id ? businessNames[j.business_id] : undefined} />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}


          <section className="space-y-3">
            <h2 className="font-semibold text-white">Galerie — dernières vidéos générées</h2>
            <p className="text-xs text-muted-foreground">
              Les vidéos produites via ce studio apparaissent ici avec le prompt utilisé.
            </p>
            {jobs.filter((j) => j.status === "done" && j.output_url && (isCorporate ? !j.business_id : !!j.business_id)).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune vidéo générée pour l'instant. Lancez une génération ci-dessus.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jobs
                  .filter((j) => j.status === "done" && j.output_url && (isCorporate ? !j.business_id : !!j.business_id))
                  .map((j) => (
                    <JobCard key={j.id} job={j} businessName={j.business_id ? businessNames[j.business_id] : undefined} onDelete={deleteJob} onRename={renameJob} />
                  ))}
              </div>
            )}
          </section>

          {!isCorporate && (
          <section className="space-y-3">
            <h2 className="font-semibold text-white">Showcase — établissements</h2>
            <p className="text-xs text-muted-foreground">
              Exemples générés manuellement pour des établissements réels, avec le prompt d'origine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_BUSINESS.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-white p-3 space-y-2 text-neutral-900">
                  <div className="text-sm font-medium text-neutral-900">{s.title}</div>
                  <VideoWithMeta src={s.src} extra={<PromptDialog prompt={s.prompt} />} />
                </div>
              ))}
            </div>
          </section>
          )}

          {isCorporate && (
          <section className="space-y-3">
            <h2 className="font-semibold text-white">Showcase — features & démos génériques</h2>
            <p className="text-xs text-muted-foreground">
              Vidéos qui illustrent une fonctionnalité du produit (agent IA, etc.).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_FEATURES.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-white p-3 space-y-2 text-neutral-900">
                  <div className="text-sm font-medium text-neutral-900">{s.title}</div>
                  <VideoWithMeta src={s.src} extra={<PromptDialog prompt={s.prompt} />} />
                </div>
              ))}
            </div>
          </section>
          )}

          <section className="space-y-4 rounded-lg border border-border bg-background p-4">
            <h2 className="font-semibold text-black">Comment fonctionnent les éléments à inclure dans la vidéo</h2>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-black font-medium">1. « Ouvrir avec le logo »</p>
              <p>
                Cette option n'est proposée que si l'établissement dispose d'un logo avec fond transparent.
                Lorsqu'elle est cochée, le scénario démarre par une scène d'introduction (environ 2 s) :
                le logo apparaît sur un fond terracotta radial avec un effet de fade-in spring.
                L'option est automatiquement désactivée si le logo ne remplit pas la condition.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-black font-medium">2. Fond de la scène Offres — lisibilité renforcée</p>
              <p>
                Le rendu derrière les offres utilise la sélection globale ou le choix de l'IA, avec un overlay
                sombre allégé (0,22 → 0,48) pour garder la vidéo/image de fond visible tout en assurant la lisibilité du texte.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-black font-medium">3. Ce que fait chaque case cochée</p>
              <ul className="list-disc space-y-1 pl-5 text-xs sm:text-sm">
                <li><strong>Ouvrir avec le logo</strong> : scène d'intro logo (2 s), visible uniquement si logo_bg = transparent.</li>
                <li><strong>Avis clients</strong> : scène reviews avec note /20 et nombre d'avis.</li>
                <li><strong>Horaires</strong> : scène hours depuis les horaires publiés.</li>
                <li><strong>Google Map</strong> : scène map avec marqueur latitude/longitude.</li>
                <li><strong>ID numérique</strong> : scène digital (screenshot mobile de la fiche + QR).</li>
                <li><strong>CTA install app</strong> : scène CTA / outro « Découvrez {`{name}`} ».</li>
                <li><strong>Popup de bienvenue</strong> : injecte l'image popup avec titre/description dans les directives IA.</li>
                <li><strong>Offres</strong> (par offre cochée) : une scène offer par offre avec titre, prix, bullets et fond dédié.</li>
                <li><strong>Highlights</strong> (par bloc coché) : blocs highlights transmis comme directives au scénario IA.</li>
              </ul>
              <p className="text-xs pt-1">
                Ordre du montage : celui des étapes cochées ci-dessus (l'IA ne décide pas du déroulé). Il reste modifiable manuellement dans l'aperçu du scénario.
                Vous pouvez réordonner et ajuster les durées dans l'aperçu du scénario avant le rendu.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-black font-medium">4. Quand faut-il re-générer le scénario avant de générer la vidéo ?</p>
              <p>
                Les modifications faites dans l'aperçu du scénario (ordre, durées, textes, POIs, ville des widgets, etc.)
                sont transmises directement au rendu : elles ne demandent pas de re-génération.
              </p>
              <p>
                Il faut re-générer le scénario dans les cas suivants :
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs sm:text-sm">
                <li>Changement d'établissement, de prompt, de durée cible ou de ton.</li>
                <li>Activation/désactivation d'une option globale (avis, horaires, map, ID numérique, CTA install, WhatsApp, etc.).</li>
                <li>Sélection ou désélection d'offres, highlights, résumés IA, liens, menus, images ou vidéos.</li>
                <li>Changement de transitions, fond continu ou bande son.</li>
                <li>Suppression d'étapes intégrées qui fait tomber la durée totale sous 85 % de la cible ou le nombre d'étapes sous 3.</li>
              </ul>
              <p className="text-xs pt-1">
                En l'absence de ces changements, cliquer sur « Générer la vidéo » utilise le scénario actuel tel qu'affiché dans l'aperçu.
              </p>
            </div>
          </section>

          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

function estimateVideoCost(durationSec: number) {
  // Coût réel mesuré en base (ai_usage_events, contexte studio-video-scenario) :
  // google/gemini-3-flash-preview → ~$0,00214 par génération de scénario.
  const scenarioUsd = 0.00214;
  // Rendu Remotion sur GitHub Actions (minutes runner) : ordre de grandeur.
  const renderUsd = 0.002 + durationSec * 0.0001;
  const totalUsd = scenarioUsd + renderUsd;
  return {
    usd: totalUsd.toFixed(4),
  };
}

function ShareVideoButton({ src }: { src: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = src.startsWith("http") ? src : `${window.location.origin}${src}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        /* annulé → on retombe sur la copie */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien de la vidéo copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1 text-xs underline"
    >
      <Share2 className="h-3 w-3" /> {copied ? "Lien copié" : "Partager"}
    </button>
  );
}

function PromptDialog({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false);
  if (!prompt) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs underline"
      >
        <FileText className="h-3 w-3" /> Prompt
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white text-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-900">Prompt utilisé</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-line text-neutral-700">{prompt}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoWithMeta({ src, createdAt, extra }: { src: string; createdAt?: string | null; extra?: React.ReactNode }) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (!cancelled && len) setSize(parseInt(len, 10));
        const lm = r.headers.get("last-modified");
        if (!cancelled && lm) setLastModified(new Date(lm).toISOString());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  const fmtSize = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const cost = duration != null ? estimateVideoCost(duration) : null;
  const createdLabel = formatDateTime(createdAt ?? lastModified);

  return (
    <div className="space-y-1">
      <video
        src={src}
        controls
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDim({ w: v.videoWidth, h: v.videoHeight });
          setDuration(v.duration);
        }}
        className="rounded-md aspect-[9/16] bg-black max-w-[200px] w-full mx-auto"
      />
      {createdLabel && (
        <div className="text-[11px] text-neutral-600">Créée le {createdLabel}</div>
      )}
      <div className="text-[11px] text-neutral-600">
        {dim ? `${dim.w}×${dim.h}` : "…"}
        {duration != null ? ` · ${duration.toFixed(1)}s` : ""}
        {size != null ? ` · ${fmtSize(size)}` : ""}
        {cost && ` · Coût estimé : ~${cost.usd} $`}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <ShareVideoButton src={src} />
        {extra}
      </div>
    </div>
  );
}

function JobCard({
  job,
  businessName,
  onDelete,
  onRename,
}: {
  job: Job;
  businessName?: string;
  onDelete?: (job: Job) => void;
  onRename?: (job: Job, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job.title ?? "");

  const fileName = `${slugifyFileName(job.title || businessName || "video-1wm")}.mp4`;

  const download = async () => {
    if (!job.output_url) return;
    try {
      const res = await fetch(job.output_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      window.open(job.output_url, "_blank");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-3 space-y-2 text-neutral-900">
      {businessName && <div className="text-sm font-medium">{businessName}</div>}

      {job.status === "done" && job.output_url ? (
        <div className="space-y-2">
          {onRename && (
            <div className="space-y-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={draft}
                    autoFocus
                    maxLength={80}
                    placeholder="Titre de la vidéo"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRename(job, draft);
                        setEditing(false);
                      }
                      if (e.key === "Escape") {
                        setDraft(job.title ?? "");
                        setEditing(false);
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      onRename(job, draft);
                      setEditing(false);
                    }}
                  >
                    OK
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(job.title ?? "");
                    setEditing(true);
                  }}
                  className="group inline-flex items-center gap-1.5 text-left text-sm font-medium"
                >
                  <span className={job.title ? "" : "italic text-neutral-600"}>
                    {job.title || "Sans titre"}
                  </span>
                  <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              )}
              <div className="text-[11px] text-neutral-600">Fichier : {fileName}</div>
            </div>
          )}
          <VideoWithMeta
            src={job.output_url}
            createdAt={job.created_at}
            extra={<><PromptDialog prompt={job.prompt} /><VideoParamsDialog job={job} /></>}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1 text-xs underline"
            >
              <Download className="h-3 w-3" /> Télécharger
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(job)}
                className="inline-flex items-center gap-1 text-xs underline text-destructive ml-auto"
              >
                <Trash2 className="h-3 w-3" /> Supprimer
              </button>
            )}
          </div>
        </div>
      ) : job.status === "error" ? (
        <div className="space-y-2">
          <PromptDialog prompt={job.prompt} />
          <p className="text-xs text-destructive">{job.error_message ?? "Erreur"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <PromptDialog prompt={job.prompt} />
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>{job.duration_sec}s · {job.tone}</span>
            <span className="uppercase tracking-wide">{job.status}</span>
          </div>
          <p className="text-xs text-neutral-600">
            En file d'attente — le worker prendra le job dans quelques secondes.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup « Paramètres » — récapitulatif langue + scénario mémorisés pour la vidéo
// ---------------------------------------------------------------------------

const TRANSITION_LABELS: Record<string, string> = {
  crossfade: "Fondu enchaîné",
  fade_black: "Fondu au noir",
  cut: "Coupe franche",
  zoom: "Zoom",
  slide: "Glissement",
  kenburns: "Ken Burns",
  fast: "Enchaînement rapide",
  mix: "Mix",
};

function VideoParamsDialog({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const opts = (job.scenario_json?.studio_options ?? {}) as Record<string, any>;
  const props = (job.template_props ?? {}) as Record<string, any>;
  const lang: string = opts.lang ?? props.lang ?? "fr";
  const hasParams = Object.keys(opts).length > 0;

  const order: string[] = Array.isArray(opts.scene_order)
    ? opts.scene_order
    : Array.isArray(props.scene_order)
      ? props.scene_order
      : [];
  const durations: Record<string, number> = opts.scene_durations ?? {};
  const customScenes: any[] = Array.isArray(opts.custom_scenes) ? opts.custom_scenes : [];

  const included: string[] = [];
  if (opts.open_with_logo) included.push("Ouverture logo");
  if (opts.reviews) included.push("Avis clients");
  if (opts.google_reviews) included.push("Avis Google");
  if (opts.tripadvisor) included.push("TripAdvisor");
  if (opts.restaurant_guru) included.push("Restaurant Guru");
  if (opts.customer_review) included.push("Témoignage client");
  if (opts.whatsapp) included.push("WhatsApp");
  if (opts.hours) included.push("Horaires");
  if (opts.map_marker) included.push("Google Map");
  if (opts.digital_id) included.push("ID numérique");
  if (opts.install_cta) included.push("CTA install app");
  if (opts.welcome_text) included.push("Bienvenue");
  if (opts.proposition_text) included.push("Proposition");
  if (opts.popup) included.push("Popup de bienvenue");
  if (Array.isArray(opts.offer_ids) && opts.offer_ids.length) included.push(`Offres (${opts.offer_ids.length})`);
  if (Array.isArray(opts.highlight_ids) && opts.highlight_ids.length) included.push(`Highlights (${opts.highlight_ids.length})`);
  if (Array.isArray(opts.ai_text_ids) && opts.ai_text_ids.length) included.push(`TXT IA (${opts.ai_text_ids.length})`);
  if (Array.isArray(opts.blog_post_ids) && opts.blog_post_ids.length) included.push(`Articles de blog (${opts.blog_post_ids.length})`);

  const tr = opts.transitions ?? {};

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs underline"
      >
        <SlidersHorizontal className="h-3 w-3" /> Paramètres
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white text-neutral-900 [&_.text-muted-foreground]:text-neutral-500 [&_p]:text-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-neutral-900">Paramètres de la vidéo</DialogTitle>
          </DialogHeader>
          {!hasParams ? (
            <p className="text-sm text-muted-foreground">
              Aucun paramètre mémorisé pour cette vidéo (générée avant l'activation de l'historique).
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div><span className="text-muted-foreground">Langue : </span><strong>{lang === "en" ? "English" : lang === "ar" ? "العربية" : "Français"}</strong></div>
                <div><span className="text-muted-foreground">Durée : </span><strong>{job.duration_sec}s</strong></div>
                <div><span className="text-muted-foreground">Ton : </span><strong>{job.tone}</strong></div>
              </div>

              {included.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Éléments inclus</div>
                  <div className="flex flex-wrap gap-1.5">
                    {included.map((i) => (
                      <span key={i} className="rounded-full border border-border px-2 py-0.5 text-[11px]">{i}</span>
                    ))}
                  </div>
                </div>
              )}

              {order.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Scénario ({order.length} étapes)</div>
                  <ol className="space-y-0.5 text-xs">
                    {order.map((k, i) => (
                      <li key={`${k}-${i}`} className="flex justify-between gap-3">
                        <span>{i + 1}. {k}</span>
                        {durations[k] != null && <span className="text-muted-foreground">{durations[k]}s</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {customScenes.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Étapes texte ajoutées</div>
                  <ul className="space-y-0.5 text-xs list-disc pl-4">
                    {customScenes.map((c: any, i: number) => (
                      <li key={c.id ?? i}>{c.title || "Sans titre"}{c.subtitle ? ` — ${c.subtitle}` : ""} ({c.duration}s)</li>
                    ))}
                  </ul>
                </div>
              )}

              {(tr.video || tr.image) && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Transitions : </span>
                  vidéos <strong>{TRANSITION_LABELS[tr.video] ?? tr.video ?? "—"}</strong>
                  {" · "}images <strong>{TRANSITION_LABELS[tr.image] ?? tr.image ?? "—"}</strong>
                  {tr.style ? ` · style ${tr.style}` : ""}
                </div>
              )}

              <div className="text-xs space-y-0.5 text-muted-foreground">
                {opts.text_position && <div>Position du texte : {opts.text_position}</div>}
                {opts.soundtrack_url && <div>Bande son : vidéo source utilisée en boucle</div>}
                {opts.continuous_bg_video_url && <div>Fond vidéo continu activé</div>}
                {Array.isArray(opts.selected_images) && opts.selected_images.length > 0 && <div>{opts.selected_images.length} image(s) sélectionnée(s)</div>}
                {Array.isArray(opts.selected_videos) && opts.selected_videos.length > 0 && <div>{opts.selected_videos.length} vidéo(s) sélectionnée(s)</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
