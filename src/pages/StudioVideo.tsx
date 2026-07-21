import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wand2, Download, Sparkles, X, Trash2, Globe, BarChart3, Video, LogOut, Maximize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { StudioVideoScenarioPanel, buildScenario, extractKeywords, scenarioFromTemplateProps, type Scenario } from "@/components/StudioVideoScenarioPanel";
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
};

const DURATIONS = [15, 30, 45, 60] as const;
const TONES = [
  { value: "immersif", label: "Immersif" },
  { value: "dynamique", label: "Dynamique" },
  { value: "elegant", label: "Élégant" },
];

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
  const [tone, setTone] = useState("immersif");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [aiScenario, setAiScenario] = useState<{ scenario: Scenario; rationale?: string; templateId: string } | null>(null);
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
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [optReviews, setOptReviews] = useState(true);
  const [optHours, setOptHours] = useState(true);
  const [optInstallCta, setOptInstallCta] = useState(true);
  const [optMapMarker, setOptMapMarker] = useState(true);
  const [optDigitalId, setOptDigitalId] = useState(true);
  const [bizImages, setBizImages] = useState<string[]>([]);
  const [bizVideos, setBizVideos] = useState<{ url: string; thumbnail: string | null; title: string; kind: "file" | "youtube" }[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [showEstablishment, setShowEstablishment] = useState(true);
  const [popupImageUrl, setPopupImageUrl] = useState<string | null>(null);
  const [popupMeta, setPopupMeta] = useState<{ title: string | null; description: string | null }>({ title: null, description: null });
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);

  // Combined media list for the lightbox slideshow (images first, then videos)
  const mediaItems = useMemo(() => {
    const imgs = bizImages.map((url) => ({ kind: "image" as const, url, title: "", thumbnail: null as string | null }));
    const vids = bizVideos.map((v) => ({ kind: v.kind === "youtube" ? ("youtube" as const) : ("video" as const), url: v.url, title: v.title, thumbnail: v.thumbnail }));
    return [...imgs, ...vids];
  }, [bizImages, bizVideos]);

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
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    setSelectedImages(new Set());
    setSelectedVideos(new Set());
    (async () => {
      const [biz, docs, yt, promos] = await Promise.all([
        supabase
          .from("businesses")
          .select("hook_fr,description,images,popup_image_url")
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
          .select("id", { count: "exact", head: true })
          .eq("business_id", selected.id),
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
      setBizStats({
        hook: b.hook_fr ?? null,
        descLen: (b.description ?? "").length,
        images: imgs.length,
        videos: docVideos.length + ytVideos.length,
        offers: promos.count ?? 0,
        popup: !!b.popup_image_url,
      });
      setStatsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

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

  const scenario = useMemo(() => {
    if (!prompt.trim() || prompt.length < 20) return null;
    return buildScenario(prompt, selected?.name ?? null, duration, {
      reviews: optReviews,
      hours: optHours,
      mapMarker: optMapMarker,
      digitalId: optDigitalId,
      installCta: optInstallCta,
    });
  }, [prompt, selected?.name, duration, optReviews, optHours, optMapMarker, optDigitalId, optInstallCta]);

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
      const directives: string[] = [];
      if (optReviews) directives.push("Faire figurer le compteur d'avis client et le badge des avis client (note/20 + nombre d'avis).");
      if (optHours) directives.push("Faire figurer les horaires d'ouverture de l'établissement.");
      if (optMapMarker) directives.push("Faire figurer le marqueur de l'établissement sur la Google Map.");
      if (optDigitalId) directives.push("Insérer une courte séquence ID numérique (capture mock-up de la fiche /fiche/slug, étape de partage, puis QR code) AVANT l'incitation finale.");
      if (optInstallCta) directives.push("Terminer par une incitation à installer l'app (bouton carré terracotta inspiré de /install mobile).");
      const chosenImages = Array.from(selectedImages);
      const chosenVideos = Array.from(selectedVideos);
      if (chosenImages.length > 0) {
        directives.push(
          `Utiliser EXCLUSIVEMENT les images suivantes (dans cet ordre) pour le montage :\n  * ${chosenImages.join("\n  * ")}`
        );
      }
      if (chosenVideos.length > 0) {
        directives.push(
          `Utiliser EXCLUSIVEMENT les vidéos suivantes (dans cet ordre) pour le montage :\n  * ${chosenVideos.join("\n  * ")}`
        );
      }
      const finalPrompt = directives.length
        ? `${prompt.trim()}\n\nContraintes supplémentaires :\n- ${directives.join("\n- ")}`
        : prompt.trim();
      const { data, error } = await supabase.functions.invoke("video-scenario-generate", {
        body: {
          prompt: finalPrompt,
          business_id: selected?.id ?? null,
          duration_sec: duration,
          tone,
          parent_job_id: refineFrom?.id ?? null,
          options: {
            reviews: optReviews,
            hours: optHours,
            map_marker: optMapMarker,
            digital_id: optDigitalId,
            install_cta: optInstallCta,
            selected_images: chosenImages,
            selected_videos: chosenVideos,
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
    if (optReviews) directives.push("Faire figurer le compteur d'avis client et le badge des avis client (note/20 + nombre d'avis).");
    if (optHours) directives.push("Faire figurer les horaires d'ouverture de l'établissement.");
    if (optMapMarker) directives.push("Faire figurer le marqueur de l'établissement sur la Google Map.");
    if (optDigitalId) directives.push("Insérer une courte séquence ID numérique (capture mock-up de la fiche /fiche/slug, étape de partage, puis QR code) AVANT l'incitation finale.");
    if (optInstallCta) directives.push("Terminer par une incitation à installer l'app (bouton carré terracotta inspiré de /install mobile).");
    const chosenImages = Array.from(selectedImages);
    const chosenVideos = Array.from(selectedVideos);
    if (chosenImages.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les images suivantes (dans cet ordre) pour le montage :\n  * ${chosenImages.join("\n  * ")}`);
    if (chosenVideos.length > 0) directives.push(`Utiliser EXCLUSIVEMENT les vidéos suivantes (dans cet ordre) pour le montage :\n  * ${chosenVideos.join("\n  * ")}`);
    const finalPrompt = directives.length ? `${prompt.trim()}\n\nContraintes supplémentaires :\n- ${directives.join("\n- ")}` : prompt.trim();
    return { finalPrompt, chosenImages, chosenVideos };
  };

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
          duration_sec: duration,
          tone,
          parent_job_id: refineFrom?.id ?? null,
          preview_only: true,
          options: {
            reviews: optReviews,
            hours: optHours,
            map_marker: optMapMarker,
            digital_id: optDigitalId,
            install_cta: optInstallCta,
            selected_images: chosenImages,
            selected_videos: chosenVideos,
          },
        },
      });
      if (error) throw error;
      const payload = data as any;
      const scenario = scenarioFromTemplateProps(payload.template_id, payload.template_props, payload.duration_sec ?? duration, payload.rationale);
      setAiScenario({ scenario, rationale: payload.rationale, templateId: payload.template_id });
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
    setTone(job.tone);
    setPrompt("");
    setTimeout(() => {
      document.getElementById("prompt-area")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("prompt-area")?.focus();
    }, 50);
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
        <title>Studio Vidéo IA — 1WM</title>
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
                <h1 className="text-3xl font-bold tracking-tight text-white">Studio Vidéo IA</h1>
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


          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durée</Label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={duration === d ? "default" : "outline"}
                      onClick={() => setDuration(d)}
                    >
                      {d}s
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ton</Label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map((t) => (
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
                  : "Ex : Présentation immersive mettant en avant le hook et la signature de l'établissement, ajoutes options cochées ci-dessous."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={2000}
                className="text-lg md:text-xl p-4 min-h-[220px] md:min-h-[150px]"
                onFocus={() => {
                  if (!prompt && !refineFrom) {
                    const businessText = selected ? ` « ${selected.name} »` : "";
                    setPrompt(`Présentation immersive mettant en avant le hook et la signature de l'établissement${businessText}, ajoutes options cochées ci-dessous.`);
                  }
                }}
              />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Label className="text-sm">Éléments à inclure dans la vidéo</Label>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optReviews} onChange={(e) => setOptReviews(e.target.checked)} />
                  <span>Compteur d'avis client + badge avis (note/20)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optHours} onChange={(e) => setOptHours(e.target.checked)} />
                  <span>Horaires d'ouverture</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optMapMarker} onChange={(e) => setOptMapMarker(e.target.checked)} />
                  <span>Marqueur sur la Google Map</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optDigitalId} onChange={(e) => setOptDigitalId(e.target.checked)} />
                  <span>ID numérique (fiche + partage + QR code)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-white accent-primary appearance-auto" checked={optInstallCta} onChange={(e) => setOptInstallCta(e.target.checked)} />
                  <span>Incitation finale à installer l'app</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={previewScenario} disabled={previewing || submitting} variant="secondary" className="gap-2">
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Prévisualiser le scénario (IA)
              </Button>
              <Button onClick={submit} disabled={submitting || hasActiveJob} className="gap-2">
                {submitting || hasActiveJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {hasActiveJob ? "Job déjà lancé…" : refineFrom ? "Générer la version affinée" : "Générer la vidéo"}
              </Button>
            </div>
          </section>

          {aiScenario ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Scénario IA · template {aiScenario.templateId}</span>
                <Button size="sm" variant="ghost" onClick={() => setAiScenario(null)} className="h-7 text-xs">Effacer</Button>
              </div>
              {aiScenario.rationale && (
                <p className="text-xs italic text-muted-foreground">{aiScenario.rationale}</p>
              )}
              <StudioVideoScenarioPanel scenario={aiScenario.scenario} />
            </div>
          ) : scenario ? (
            <StudioVideoScenarioPanel scenario={scenario} />
          ) : null}

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
                    <JobCard key={j.id} job={j} businessName={j.business_id ? businessNames[j.business_id] : undefined} onRefine={startRefine} onDelete={deleteJob} />
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

function VideoWithMeta({ src }: { src: string }) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (!cancelled && len) setSize(parseInt(len, 10));
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
      <div className="text-[11px] text-muted-foreground">
        {dim ? `${dim.w}×${dim.h}` : "…"}
        {duration != null ? ` · ${duration.toFixed(1)}s` : ""}
        {size != null ? ` · ${fmtSize(size)}` : ""}
        {cost && ` · Coût estimé : ~${cost.usd} $`}
      </div>
    </div>
  );
}

function JobCard({ job, businessName, onRefine, onDelete }: { job: Job; businessName?: string; onRefine?: (job: Job) => void; onDelete?: (job: Job) => void }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {businessName && <div className="text-sm font-medium">{businessName}</div>}
      
      {job.status === "done" && job.output_url ? (
        <div className="space-y-2">
          <VideoWithMeta src={job.output_url} />
          <p className="text-xs text-muted-foreground whitespace-pre-line">{job.prompt}</p>
          <div className="flex items-center gap-3">
            <a
              href={job.output_url}
              download
              className="inline-flex items-center gap-1 text-xs underline"
            >
              <Download className="h-3 w-3" /> Télécharger
            </a>
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
