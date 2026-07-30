import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wand2, Download, Sparkles, X, Trash2, Globe, BarChart3, Video, LogOut, Maximize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, GripVertical, Share2, Pencil } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { StudioVideoScenarioPanel, buildScenario, extractKeywords, scenarioFromTemplateProps, type Scenario, type SceneMediaMap, type SceneMediaItem, type ScenarioEdits } from "@/components/StudioVideoScenarioPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import maisonBrummellAsset from "@/assets/maison-brummell.mp4.asset.json";
import riadDarNajatAsset from "@/assets/riad-dar-najat.mp4.asset.json";
import narComplexeAsset from "@/assets/nar-complexe.mp4.asset.json";
import farashaAsset from "@/assets/farasha-farmhouse.mp4.asset.json";
import boZinAsset from "@/assets/bo-zin.mp4.asset.json";

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
type TransitionEffectId = "crossfade" | "fade_black" | "wipe" | "zoom" | "kenburns" | "slide" | "cut";
const TRANSITION_EFFECT_LABELS: Record<TransitionEffectId, string> = {
  crossfade: "Fondu enchaîné",
  fade_black: "Fondu au noir",
  wipe: "Wipe latéral",
  zoom: "Zoom doux",
  kenburns: "Ken Burns (pan + zoom)",
  slide: "Glissement",
  cut: "Coupe franche",
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
  duration_sec: number;
  tone: string;
  status: "pending" | "rendering" | "done" | "error";
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  title?: string | null;
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

const TONES = [
  { value: "immersif", label: "Immersif" },
  // Gelés pour l'instant — conservés pour les jobs existants
  { value: "dynamique", label: "Dynamique", frozen: true },
  { value: "elegant", label: "Élégant", frozen: true },
];
const VISIBLE_TONES = TONES.filter((t) => !t.frozen);

export default function StudioVideo() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");
  const [hasDashboard, setHasDashboard] = useState(false);
  const [hasVideoStudio, setHasVideoStudio] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<string[] | null>(null); // null = not loaded, [] = none

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setAuthState(data.user ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session?.user ? "in" : "out");
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (authState !== "in") return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      // Detect staff/admin role
      const [{ data: staffRow }, { data: affiliate }] = await Promise.all([
        supabase.rpc("is_staff", { _user_id: uid }),
        supabase
          .from("affiliates")
          .select("id, has_dashboard, has_video_studio")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      const staff = !!staffRow;
      setIsStaff(staff);
      if (affiliate) {
        setHasDashboard(!!(affiliate as any).has_dashboard);
        setHasVideoStudio(!!(affiliate as any).has_video_studio);
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
    })();
  }, [authState]);

  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [durationAuto, setDurationAuto] = useState(true);
  const [tone, setTone] = useState("immersif");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const [optOpenWithLogo, setOptOpenWithLogo] = useState(true);
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
  const [reviewsList, setReviewsList] = useState<Array<{ id: string; author: string | null; rating: number | null; text: string; source: string | null; published_at: string | null }>>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewHighlight, setReviewHighlight] = useState<string>("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [offersList, setOffersList] = useState<Array<{ id: string; title: string; message: string | null; promotion_type: string | null; promotion_value: number | null; promotion_currency: string | null; savings_amount: number | null }>>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(new Set());
  const [highlightsList, setHighlightsList] = useState<Array<{ id: string; icon: string | null; title: string; description: string; image_url: string | null; metric_title: string | null; metric_value: string | null; sort_order: number }>>([]);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<Set<string>>(new Set());
  const [bizImages, setBizImages] = useState<string[]>([]);
  const [bizVideos, setBizVideos] = useState<{ url: string; thumbnail: string | null; title: string; kind: "file" | "youtube"; duration?: number }[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Mode "une seule vidéo en fond continu"
  const [continuousBg, setContinuousBg] = useState(false);
  const [continuousBgUrl, setContinuousBgUrl] = useState<string>("");
  const [continuousPickerOpen, setContinuousPickerOpen] = useState(false);
  const [continuousBgSound, setContinuousBgSound] = useState(false);
  // Ordre de montage des vidéos sélectionnées (glisser / déposer)
  const [videoOrder, setVideoOrder] = useState<string[]>([]);
  const [dragUrl, setDragUrl] = useState<string | null>(null);

  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [showEstablishment, setShowEstablishment] = useState(true);
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



  // Garde l'ordre de montage synchronisé avec la sélection de vidéos.
  useEffect(() => {
    setVideoOrder((prev) => {
      const kept = prev.filter((u) => selectedVideos.has(u));
      const added = bizVideos.map((v) => v.url).filter((u) => selectedVideos.has(u) && !kept.includes(u));
      const next = [...kept, ...added];
      return next.length === prev.length && next.every((u, i) => u === prev[i]) ? prev : next;
    });
  }, [selectedVideos, bizVideos]);

  const orderedSelectedVideos = useMemo(
    () => videoOrder.filter((u) => selectedVideos.has(u)),
    [videoOrder, selectedVideos],
  );

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

  // Fermer la zone "Votre établissement" et réinitialiser l'aperçu dès qu'un établissement est choisi
  useEffect(() => {
    if (selected) {
      setShowEstablishment(false);
      setScenarioPreviewed(false);
      setAiScenario(null);
    }
  }, [selected]);

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
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    setSelectedImages(new Set());
    setSelectedVideos(new Set());
    setSceneMedia({});
    (async () => {
      const [biz, docs, yt, promos, hls, revs] = await Promise.all([
        supabase
          .from("businesses")
          .select("hook_fr,description,images,popup_image_url,opening_hours,show_opening_hours,is_active,logo_url,logo_bg,whatsapp,google_rating,google_review_count,google_review_url,google_reviews_url,google_maps_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,tripadvisor_review_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url")
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
          .select("id, title, title_fr, promotion_message, promotion_message_fr, promotion_type, promotion_value, promotion_currency, savings_amount")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("front_highlights")
          .select("id,icon,sort_order,image_url,title,description,metric_title,metric_value,title_fr,description_fr,metric_title_fr,metric_value_fr")
          .eq("business_id", selected.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("reviews")
          .select("id,author_name,rating,text,text_fr,source,published_at,is_hidden")
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
        .filter((d) => d.url)
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
      setOptOpenWithLogo((b.logo_bg === "transparent") && !!b.logo_url);
      setWhatsappNumber((b.whatsapp as string) || null);
      setOptWhatsapp(false);
      setPopupMeta({ title: null, description: null });
      if (popupUrl) {
        supabase
          .from("business_image_titles")
          .select("title, description, title_fr, description_fr")
          .eq("business_id", selected.id)
          .eq("image_url", popupUrl)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled || !data) return;
            const d = data as any;
            setPopupMeta({
              title: (d.title_fr || d.title) ?? null,
              description: (d.description_fr || d.description) ?? null,
            });
          });
      }
      const oh = b.opening_hours;
      const hasHoursData = !!oh && (typeof oh === "string" ? oh.trim().length > 0 : (Array.isArray(oh) ? oh.length > 0 : Object.keys(oh).length > 0));
      const hoursPublished = b.show_opening_hours !== false && hasHoursData;
      const offersRaw = (promos.data ?? []) as any[];
      const mappedOffers = offersRaw.map((o) => ({
        id: o.id as string,
        title: (o.title_fr || o.title || "Offre") as string,
        message: (o.promotion_message_fr || o.promotion_message || null) as string | null,
        promotion_type: (o.promotion_type ?? null) as string | null,
        promotion_value: (o.promotion_value ?? null) as number | null,
        promotion_currency: (o.promotion_currency ?? null) as string | null,
        savings_amount: (o.savings_amount ?? null) as number | null,
      }));
      setOffersList(mappedOffers);
      setSelectedOfferIds(new Set(mappedOffers.map((o) => o.id)));
      const stripHtml = (s: string | null) => (s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      const hlRaw = (hls.data ?? []) as any[];
      const mappedHl = hlRaw
        .map((h) => ({
          id: h.id as string,
          icon: (h.icon ?? null) as string | null,
          title: stripHtml(h.title_fr) || stripHtml(h.title),
          description: stripHtml(h.description_fr) || stripHtml(h.description),
          image_url: (h.image_url ?? null) as string | null,
          metric_title: (stripHtml(h.metric_title_fr) || stripHtml(h.metric_title)) || null,
          metric_value: (stripHtml(h.metric_value_fr) || stripHtml(h.metric_value)) || null,
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
      // Avis clients
      const revsRaw = (revs.data ?? []) as any[];
      const mappedRevs = revsRaw
        .map((r) => ({
          id: r.id as string,
          author: (r.author_name ?? null) as string | null,
          rating: (r.rating ?? null) as number | null,
          text: stripHtml((r.text_fr || r.text || "") as string),
          source: (r.source ?? null) as string | null,
          published_at: (r.published_at ?? null) as string | null,
        }))
        .filter((r) => r.text.length > 0);
      setReviewsList(mappedRevs);
      setSelectedReviewId(null);
      setReviewHighlight("");
      setBizStats({
        hook: b.hook_fr ?? null,
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
  }, [selected]);

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
    const newDefaultPrompt = `Présentation immersive mettant en avant le hook et la signature de l'établissement${businessText}, ajoutes options cochées ci-dessous.`;
    
    if (!prompt || prompt.startsWith("Présentation immersive mettant en avant le hook et la signature de l'établissement")) {
      setPrompt(newDefaultPrompt);
    }
  }, [selected, refineFrom]);

  // Recent jobs + realtime
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      setJobs((data ?? []) as Job[]);
    };
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

  const hasActiveJob = useMemo(
    () => jobs.some((j) => j.status === "pending" || j.status === "rendering"),
    [jobs]
  );

  const promptKeywords = useMemo(() => extractKeywords(prompt), [prompt]);

  // Durée calculée automatiquement à partir des étapes actives du scénario.
  const autoDuration = useMemo(() => {
    let s = 4 + 3; // name + hook
    const canLogo = !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo;
    if (canLogo) s += 2;
    if (optPopup) s += 4;
    const offerCount = selectedOfferIds.size;
    if (offerCount > 0) s += Math.min(6, offerCount) * 5;
    const highlightCount = selectedHighlightIds.size;
    if (highlightCount > 0) s += Math.min(4, highlightCount) * 4;
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
    if (optInstallCta) s += 2; // outro
    return Math.max(10, Math.min(90, s));
  }, [logoInfo, optOpenWithLogo, optPopup, selectedOfferIds, selectedHighlightIds, optReviews, optGoogleReviews, optTripAdvisor, optRestaurantGuru, optCustomerReview, optHours, optMapMarker, optDigitalId, optWhatsapp, whatsappNumber, optInstallCta]);

  const effectiveDuration = durationAuto ? autoDuration : duration;

  const scenario = useMemo(() => {
    if (!prompt.trim() || prompt.length < 20) return null;
    return buildScenario(prompt, selected?.name ?? null, effectiveDuration, {
      reviews: optReviews,
      hours: optHours,
      mapMarker: optMapMarker,
      digitalId: optDigitalId,
      installCta: optInstallCta,
      openWithLogo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
      logoUrl: logoInfo.url,
      whatsapp: optWhatsapp,
      whatsappNumber: whatsappNumber,
    });
  }, [prompt, selected?.name, effectiveDuration, optReviews, optHours, optMapMarker, optDigitalId, optInstallCta, optOpenWithLogo, logoInfo, optWhatsapp, whatsappNumber]);

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

  const submit = async () => {
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
      const { data, error } = await supabase.functions.invoke("video-scenario-generate", {
        body: {
          prompt: finalPrompt,
          business_id: selected?.id ?? null,
          duration_sec: effectiveDuration,
          tone,
          parent_job_id: refineFrom?.id ?? null,
          options: {
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
            open_with_logo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
            logo_url: logoInfo.url,
            text_splits: scenarioEdits?.textSplits,
            text_overrides: scenarioEdits?.textOverrides,

            offer_ids: Array.from(selectedOfferIds),
            highlight_ids: Array.from(selectedHighlightIds),
            selected_images: chosenImages,
            selected_videos: chosenVideos,
            scene_media: sceneMedia,
            scene_order: scenarioEdits?.order ?? (aiScenario?.scenario ?? scenario)?.scenes.map((s) => s.icon),
            scene_durations: scenarioEdits?.durations ?? (() => {
              const src = (aiScenario?.scenario ?? scenario)?.scenes;
              if (!src) return undefined;
              const out: Record<string, number> = {};
              for (const s of src) out[s.icon] = s.duration;
              return out;
            })(),
            custom_scenes: scenarioEdits?.customScenes,
            text_position: textPosition,
            continuous_bg_video_url: continuousBg && continuousBgUrl ? continuousBgUrl : null,
            continuous_bg_sound: continuousBg && continuousBgUrl ? continuousBgSound : false,
          },

        },
      });
      if (error) throw error;
      const job = (data as any)?.job as Job;
      if (job) {
        setCurrentJobId(job.id);
        setRefineFrom(null);
        toast.success("Scénario généré. Rendu en attente du worker.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la génération.");
    } finally {
      setSubmitting(false);
    }
  };

  const buildDirectivesPrompt = () => {
    const directives: string[] = [];
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
    const chosenImages = Array.from(selectedImages);
    const chosenVideos = orderedSelectedVideos;
    if (chosenImages.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les images suivantes (dans cet ordre) pour le montage :\n  * ${chosenImages.join("\n  * ")}`);
    if (continuousBg && continuousBgUrl) directives.push(`Une seule vidéo est jouée EN FOND CONTINU sur toute la durée (${continuousBgUrl}) : ne pas prévoir de montage de fonds différents par scène, seuls les textes et éléments graphiques changent.`);
    if (chosenVideos.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les vidéos suivantes (dans cet ordre) pour le montage :\n  * ${chosenVideos.join("\n  * ")}`);
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
      images: Array.from(selectedImages).sort(),
      videos: orderedSelectedVideos,
      reviewId: selectedReviewId,
      reviewHighlight: reviewHighlight || null,
      textPosition,
      continuousBg: continuousBg ? `${continuousBgUrl}|${continuousBgSound ? "sound" : "mute"}` : null,
    });
  }, [
    prompt, effectiveDuration, tone, selected?.id,
    optReviews, optHours, optMapMarker, optDigitalId, optInstallCta,
    optWhatsapp, optGoogleReviews, optTripAdvisor, optRestaurantGuru,
    optCustomerReview, optPopup, optOpenWithLogo,
    selectedOfferIds, selectedHighlightIds, selectedImages, orderedSelectedVideos,
    selectedReviewId, reviewHighlight, textPosition, continuousBg, continuousBgUrl, continuousBgSound,
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
            open_with_logo: !!logoInfo.url && logoInfo.bg === "transparent" && optOpenWithLogo,
            logo_url: logoInfo.url,
            text_splits: scenarioEdits?.textSplits,
            text_overrides: scenarioEdits?.textOverrides,

            offer_ids: Array.from(selectedOfferIds),
            highlight_ids: Array.from(selectedHighlightIds),
            selected_images: chosenImages,
            selected_videos: chosenVideos,
            scene_media: sceneMedia,
            scene_order: scenarioEdits?.order,
            scene_durations: scenarioEdits?.durations,
            custom_scenes: scenarioEdits?.customScenes,
            text_position: textPosition,
            continuous_bg_video_url: continuousBg && continuousBgUrl ? continuousBgUrl : null,
            continuous_bg_sound: continuousBg && continuousBgUrl ? continuousBgSound : false,
          },

        },
      });
      if (error) throw error;
      const payload = data as any;
      const scenario = scenarioFromTemplateProps(payload.template_id, payload.template_props, payload.duration_sec ?? effectiveDuration, payload.rationale);
      setAiScenario({ scenario, rationale: payload.rationale, templateId: payload.template_id });
      setAiScenarioSig(currentScenarioSig);
      setScenarioPreviewed(true);
      toast.success("Scénario IA généré.");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la prévisualisation.");
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
    return <Navigate to="/club" replace state={{ from: "/studio-video" }} />;
  }

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
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#C04F17] text-white uppercase tracking-wide">
                    Mode admin
                  </span>
                )}
              </div>
              <p className="text-white/70">
                Générez une vidéo verticale 720×1280 (15 à 60 s) à partir d'un prompt et d'un établissement.
              </p>
              <div className="text-xs text-white/70 mt-1 space-y-1 bg-white/10 p-3 rounded-lg border border-white/20">
                <p>📌 Il faut savoir avant si l'établissement a un Hook, suffisamment d'images, de vidéos, une offre/popup...</p>
                <p>💡 Signalisez dans le prompt si vous voulez mettre en avant les horaires, la localisation, une offre/popup.</p>
              </div>
            </header>

          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <Label>
                {isStaff ? "Établissement (optionnel)" : "Votre établissement"}
              </Label>
              <button
                type="button"
                onClick={() => setShowEstablishment((s) => !s)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
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
                        <div
                          key={v.url}
                          className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 transition bg-black ${
                            checked ? "border-[#C04F17] ring-2 ring-[#C04F17]/40" : matches.length ? "border-secondary ring-2 ring-secondary/30" : "border-border hover:border-muted-foreground"
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
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Si aucune n'est cochée, l'IA choisit librement parmi toutes les vidéos.</p>

                  {orderedSelectedVideos.length > 1 && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <Label className="text-sm">
                        Ordre des vidéos dans le montage
                        <span className="block text-[11px] text-muted-foreground font-normal">
                          Glissez / déposez les vignettes pour changer l'ordre.
                        </span>
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {orderedSelectedVideos.map((url, i) => {
                          const v = bizVideos.find((x) => x.url === url);
                          return (
                            <div
                              key={url}
                              draggable
                              onDragStart={() => setDragUrl(url)}
                              onDragEnd={() => setDragUrl(null)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragUrl) moveVideo(dragUrl, url);
                                setDragUrl(null);
                              }}
                              className={`relative w-20 aspect-[9/16] rounded-md overflow-hidden border-2 bg-black cursor-grab active:cursor-grabbing ${
                                dragUrl === url ? "border-[#C04F17] opacity-60" : "border-border"
                              }`}
                              title={v?.title || url}
                            >
                              {v?.kind === "file" ? (
                                <video src={url} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
                              ) : v?.thumbnail ? (
                                <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/60"><Video className="h-5 w-5" /></div>
                              )}
                              <span className="absolute top-1 left-1 bg-[#C04F17] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
                              <span className="absolute bottom-1 right-1 text-white/80"><GripVertical className="h-3.5 w-3.5" /></span>
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
                          const ok = v.duration >= effectiveDuration;
                          return (
                            <p className={`text-[11px] ${ok ? "text-emerald-500" : "text-red-500"}`}>
                              Vidéo {formatVideoDuration(v.duration)} · scénario {effectiveDuration}s — {ok ? "durée suffisante." : "trop courte : elle bouclera."}
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


          {selected && (
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>



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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-[12px] px-3 w-full"
                  onClick={() => setAddStepOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Ajouter une étape
                </Button>

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
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="rounded-md border border-border bg-background/40 p-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optReviews} onChange={(e) => setOptReviews(e.target.checked)} />
                    <span className="font-medium">Compteur d'avis client + badge avis (note/20)</span>
                  </label>
                  <p className="mt-1 pl-6 text-[11px] text-muted-foreground">Scène dédiée avec la note /20 agrégée et le nombre total d'avis.</p>
                </div>
                {/* Plateformes d'avis externes — chacune dans sa propre carte */}
                {(() => {
                  const platforms: Array<{ key: "google" | "tripadvisor" | "restaurant_guru"; label: string; checked: boolean; setter: (v: boolean) => void }> = [
                    { key: "google", label: "Avis Google", checked: optGoogleReviews, setter: setOptGoogleReviews },
                    { key: "tripadvisor", label: "TripAdvisor", checked: optTripAdvisor, setter: setOptTripAdvisor },
                    { key: "restaurant_guru", label: "Restaurant Guru", checked: optRestaurantGuru, setter: setOptRestaurantGuru },
                  ];
                  return platforms.map((p) => {
                    const d = platformData[p.key];
                    const available = !selected || !!(d.rating || d.count || d.url);
                    return (
                      <div key={p.key} className={`rounded-md border border-border bg-background/40 p-2 ${available ? "" : "opacity-50"}`}>
                        <label
                          className={`flex items-start gap-2 ${available ? "cursor-pointer" : "cursor-not-allowed"}`}
                          title={available ? undefined : `Pas de données ${p.label} pour cet établissement`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto disabled:cursor-not-allowed"
                            checked={available && p.checked}
                            disabled={!available}
                            onChange={(e) => p.setter(e.target.checked)}
                          />
                          <span className="font-medium text-sm">
                            {p.label}
                            {selected && available && (
                              <em className="ml-2 not-italic text-xs opacity-70 font-normal">
                                {d.rating ? `${d.rating.toFixed(1)}/5` : ""}
                                {d.count ? ` · ${d.count} avis` : ""}
                              </em>
                            )}
                            {selected && !available && <em className="ml-2 text-xs opacity-70 font-normal">(indisponible)</em>}
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



            <div className="flex flex-wrap gap-2">
              <Button onClick={previewScenario} disabled={previewing || submitting} variant={scenarioStale ? "default" : "secondary"} className="gap-2">
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiScenario ? (scenarioStale ? "Régénérer le scénario (paramètres modifiés)" : "Régénérer le scénario (IA)") : "Prévisualiser le scénario (IA)"}
              </Button>
            </div>
          </section>
          )}

          {selected && scenarioPreviewed && (
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
              />
            ) : null
          )}

          {selected && scenarioPreviewed && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={submitting || hasActiveJob} className="gap-2">
                {submitting || hasActiveJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {hasActiveJob ? "Job déjà lancé…" : refineFrom ? "Générer la version affinée" : "Générer la vidéo"}
              </Button>
            </div>
          )}

          {currentJob && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Job en cours</h2>
              <JobCard job={currentJob} businessName={currentJob.business_id ? businessNames[currentJob.business_id] : undefined} />
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-semibold text-white">Galerie — dernières vidéos générées</h2>
            <p className="text-xs text-muted-foreground">
              Les vidéos produites via ce studio apparaissent ici avec le prompt utilisé.
            </p>
            {jobs.filter((j) => j.status === "done" && j.output_url).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune vidéo générée pour l'instant. Lancez une génération ci-dessus.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jobs
                  .filter((j) => j.status === "done" && j.output_url)
                  .map((j) => (
                    <JobCard key={j.id} job={j} businessName={j.business_id ? businessNames[j.business_id] : undefined} onRefine={startRefine} onDelete={deleteJob} onRename={renameJob} />
                  ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-white">Showcase — établissements</h2>
            <p className="text-xs text-muted-foreground">
              Exemples générés manuellement pour des établissements réels, avec le prompt d'origine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_BUSINESS.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  <VideoWithMeta src={s.src} />
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{s.prompt}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-white">Showcase — features & démos génériques</h2>
            <p className="text-xs text-muted-foreground">
              Vidéos qui illustrent une fonctionnalité du produit (agent IA, etc.).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOWCASE_FEATURES.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  <VideoWithMeta src={s.src} />
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{s.prompt}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-background p-4">
            <h2 className="font-semibold text-white">Comment fonctionnent les éléments à inclure dans la vidéo</h2>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-white font-medium">1. « Ouvrir avec le logo »</p>
              <p>
                Cette option n'est proposée que si l'établissement dispose d'un logo avec fond transparent.
                Lorsqu'elle est cochée, le scénario démarre par une scène d'introduction (environ 2 s) :
                le logo apparaît sur un fond terracotta radial avec un effet de fade-in spring.
                L'option est automatiquement désactivée si le logo ne remplit pas la condition.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-white font-medium">2. Fond de la scène Offres — lisibilité renforcée</p>
              <p>
                Le rendu derrière les offres utilise la sélection globale ou le choix de l'IA, avec un overlay
                sombre allégé (0,22 → 0,48) pour garder la vidéo/image de fond visible tout en assurant la lisibilité du texte.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-white font-medium">3. Ce que fait chaque case cochée</p>
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
                Ordre par défaut : logo → hook → name → media → offre(s) → avis → horaires → map → digital → CTA.
                Vous pouvez réordonner et ajuster les durées dans l'aperçu du scénario avant le rendu.
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
  const scenarioUsd = 0.034; // Claude Sonnet scenario generation
  const renderUsd = 0.01 + durationSec * 0.0005; // Remotion Lambda approx
  const totalUsd = scenarioUsd + renderUsd;
  return {
    usd: totalUsd.toFixed(2),
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

function VideoWithMeta({ src, createdAt }: { src: string; createdAt?: string | null }) {
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
        className="rounded-md aspect-[9/16] bg-black max-w-[200px] w-full"
      />
      {createdLabel && (
        <div className="text-[11px] text-muted-foreground">Créée le {createdLabel}</div>
      )}
      <div className="text-[11px] text-muted-foreground">
        {dim ? `${dim.w}×${dim.h}` : "…"}
        {duration != null ? ` · ${duration.toFixed(1)}s` : ""}
        {size != null ? ` · ${fmtSize(size)}` : ""}
        {cost && ` · Coût estimé : ~${cost.usd} $`}
      </div>
      <ShareVideoButton src={src} />
    </div>
  );
}

function JobCard({
  job,
  businessName,
  onRefine,
  onDelete,
  onRename,
}: {
  job: Job;
  businessName?: string;
  onRefine?: (job: Job) => void;
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
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
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
                  <span className={job.title ? "" : "italic text-muted-foreground"}>
                    {job.title || "Sans titre"}
                  </span>
                  <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              )}
              <div className="text-[11px] text-muted-foreground">Fichier : {fileName}</div>
            </div>
          )}
          <VideoWithMeta src={job.output_url} createdAt={job.created_at} />
          <p className="text-xs text-muted-foreground whitespace-pre-line">{job.prompt}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1 text-xs underline"
            >
              <Download className="h-3 w-3" /> Télécharger
            </button>
            {onRefine && (
              <button
                type="button"
                onClick={() => onRefine(job)}
                className="inline-flex items-center gap-1 text-xs underline text-primary"
              >
                <Sparkles className="h-3 w-3" /> Affiner
              </button>
            )}
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
          <p className="text-xs text-muted-foreground whitespace-pre-line">{job.prompt}</p>
          <p className="text-xs text-destructive">{job.error_message ?? "Erreur"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground whitespace-pre-line">{job.prompt}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{job.duration_sec}s · {job.tone}</span>
            <span className="uppercase tracking-wide">{job.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            En file d'attente — le worker prendra le job dans quelques secondes.
          </p>
        </div>
      )}
    </div>
  );
}
