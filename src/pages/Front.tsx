import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { BadgeVideoFeedItem, DiscoveryFeedContext } from "@/lib/badgeVideoFeed";

// Lecteur unifié du feed vidéo (même viewer que la route IA `video_feed`).
const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));
// Panneau blanc (50% gauche) listant les cartes du snapshot homepage pendant la démo.
const FrontDemoCardsPanel = lazy(() => import("@/components/front/FrontDemoCardsPanel"));
type FrontDemoCard = import("@/components/front/FrontDemoCardsPanel").FrontDemoCard;


import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import hamsaIcon from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import FrontHeader from "@/components/front/FrontHeader";

/** Vidéo de fond ré-encodée pour iOS Safari (yuv420p / Main / faststart).
 *  Servie par le CDN avec le MIME video/mp4 requis par Safari iOS. */
const PORTRAIT_VIDEO_URL = portraitVideoAsset.url;

const LANDSCAPE_VIDEO_URL = landscapeVideoAsset.url;


const STEP_MS = 3400;
const FIRST_CAROUSEL_DELAY_MS = 5000;
const MIN_STEP_MS = 2000;

/** Durées affichées de chaque bullet du carrousel (indices 1-7), en ms.
 *  Bullet 1 : 5000 ms. Base = 3400 ms. Dernier step (valeur) : 5000 ms. */
const CAROUSEL_DURATIONS_MS = [
  Math.max(MIN_STEP_MS, FIRST_CAROUSEL_DELAY_MS),
  STEP_MS,
  STEP_MS,
  STEP_MS,
  STEP_MS,
  STEP_MS,
  Math.max(MIN_STEP_MS, 5000),
];

type Step = { bullet: boolean; title?: string; render: () => React.ReactNode };

const STEPS: Step[] = [
  {
    bullet: false,
    render: () => null,
  },
  {
    bullet: true,
    title: "Notre App fait ce que font...",
    render: () => (
      <>
        TikTok/Instagram/Youtube + Google + Chat GPT + Booking + Google Maps +
        Tripadvisor + CapCut + un site web professionnel...
      </>
    ),
  },
  { bullet: true, title: "Où ?", render: () => <>sur une seule interface...</> },
  {
    bullet: true,
    title: "Agent IA personnalisé",
    render: () => <>avec un Agent IA personnalisé...</>,
  },
  {
    bullet: true,
    title: "Comment ?",
    render: () => (
      <>sur 3 surfaces : orienté client / entreprise hôte / plateforme 1WM...</>
    ),
  },
  {
    bullet: true,
    title: "Du digital au local",
    render: () => (
      <>
        avec un modèle économique direct-to-local, sans commission et solidaire :
      </>
    ),
  },
  {
    bullet: true,
    title: "Du digital au solidaire",
    render: () => (
      <>
        <strong className="font-normal text-white">20 %</strong> des abonnements des
        affiliés sont destinés à des causes humanitaires au Maroc...
      </>
    ),
  },
  {
    bullet: true,
    title: "Notre philosophie",
    render: () => (
      <>
        Parce que créer de la valeur ne devrait pas seulement profiter à ceux qui la
        créent.
      </>
    ),
  },
];

/** Premier bullet point : toujours visible (le plus important). */
const PERMANENT_STEP = 1;
/** Indices des bullets du carrousel (1-7) — bullet 1 inclus, avec son propre segment gold. */
const CAROUSEL_STEPS = [1, 2, 3, 4, 5, 6, 7];
/** Largeur relative de chaque segment, calée sur la durée d'affichage réelle. */
const BULLET_WEIGHTS = CAROUSEL_DURATIONS_MS.map((d) => d / Math.min(...CAROUSEL_DURATIONS_MS));


const CTAS: { label: string; to: string }[] = [
  { label: "Installer l'App", to: "/install" },
  { label: "Devenez membre du club OWM", to: "/club" },
  { label: "Un concept local et solidaire", to: "/corporate" },
  { label: "Ajoutez votre entreprise", to: "/join" },
  { label: "Widgets", to: "/widgets" },
  { label: "Blog", to: "/blog" },
];



const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

const Front = () => {
  useSEO({
    title: "One World Morocco — Local × Digital × Solidaire",
    description:
      "Une seule interface pour découvrir le Maroc authentique : adresses sélectionnées, Agent IA personnalisé et modèle solidaire sans commission.",
    canonical: "/",
  });

  // Chrome navigateur noir + annulation des paddings safe-area du body
  // (sinon iOS Safari peint deux bandes #ECD6B8 en haut et en bas).
  useDarkBrowserChrome(true, "#000000");

  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showEndCTAs, setShowEndCTAs] = useState(false);

  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches
  );
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  

  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const touchYRef = useRef<number | null>(null);

  // format vidéo
  useEffect(() => {
    const mqOrientation = window.matchMedia("(max-aspect-ratio: 1/1)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onO = () => setIsPortrait(mqOrientation.matches);
    const onM = () => setReduced(mqMotion.matches);
    mqOrientation.addEventListener("change", onO);
    mqMotion.addEventListener("change", onM);
    return () => {
      mqOrientation.removeEventListener("change", onO);
      mqMotion.removeEventListener("change", onM);
    };
  }, []);

  // Vrai dès que la démo (viewer vidéo / cartes) est ouverte : bloque toute
  // relance de la vidéo de fond du Hero.
  const demoOpenRef = useRef(false);

  // Safari iOS peut différer l'autoplay malgré muted + playsInline.
  // Une interaction utilisateur permet alors de relancer la lecture.
  useEffect(() => {
    const retryPlayback = () => {
      const video = backgroundVideoRef.current;
      // Ne pas relancer la vidéo de fond si la démo (viewer / cartes) est ouverte.
      if (demoOpenRef.current) return;
      if (video?.paused) void video.play().catch(() => undefined);
    };
    retryPlayback();
    document.addEventListener("touchstart", retryPlayback, { passive: true, once: true });
    document.addEventListener("click", retryPlayback, { once: true });
    return () => {
      document.removeEventListener("touchstart", retryPlayback);
      document.removeEventListener("click", retryPlayback);
    };
  }, [isPortrait]);


  // progression virtuelle lissée
  const setTarget = useCallback(
    (v: number) => {
      targetRef.current = clamp01(v);
      if (reduced) {
        currentRef.current = targetRef.current;
        setProgress(targetRef.current);
        return;
      }
      if (rafRef.current !== null) return;
      const tick = () => {
        currentRef.current += (targetRef.current - currentRef.current) * 0.32;
        if (Math.abs(targetRef.current - currentRef.current) < 0.001) {
          currentRef.current = targetRef.current;
          setProgress(currentRef.current);
          rafRef.current = null;
          return;
        }
        setProgress(currentRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [reduced]
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // auto-avance du récit
  const scheduleNext = useCallback((from: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const delay = CAROUSEL_DURATIONS_MS[CAROUSEL_STEPS.indexOf(from)] ?? STEP_MS;

    timerRef.current = window.setTimeout(() => {
      // Dernière étape terminée : retour au bullet 1 et la boucle continue.
      const next = from >= STEPS.length - 1 ? CAROUSEL_STEPS[0] : from + 1;
      setStep(next);
      scheduleNext(next);
    }, delay);
  }, []);



  useEffect(() => {
    scheduleNext(PERMANENT_STEP);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  const [auto, setAuto] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [bulletsVisible, setBulletsVisible] = useState(false);

  /* ---- CTA Demo : feed vidéo « découverte » (viewer unifié HomeVideoSlidePanel) ---- */
  const [demoLoading, setDemoLoading] = useState(false);
  /* Transition « Demo » : ne laisse que le slogan, recentré plein écran */
  const [demoIntro, setDemoIntro] = useState(false);
  const [demoList, setDemoList] = useState<any[]>([]);
  const [demoCtx, setDemoCtx] = useState<DiscoveryFeedContext | null>(null);
  const [demoActiveId, setDemoActiveId] = useState<string | null>(null);
  /** Viewer fermé mais panneau blanc conservé en pleine largeur. */
  const [demoCardsOnly, setDemoCardsOnly] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const [demoBadgeId, setDemoBadgeId] = useState<string | null>(null);
  const demoLoadingMoreRef = useRef(false);
  // La démo /front passe directement sur l'assistant IA plateforme 1WM.
  const [demoAiMode, setDemoAiMode] = useState<"business" | "platform">("platform");

  // Pause/play de la vidéo de fond synchronisé avec l'ouverture/fermeture du
  // viewer vidéo de la démo (animation de disparition du Hero).
  useEffect(() => {
    const demoOpen = !!(demoIntro || demoActiveId || demoCardsOnly);
    demoOpenRef.current = demoOpen;
    const video = backgroundVideoRef.current;
    if (!video) return;
    if (demoOpen) {
      video.pause();
      video.muted = true;
    } else {
      void video.play().catch(() => undefined);
    }
  }, [demoIntro, demoActiveId, demoCardsOnly, isPortrait]);

  const toPanelVideo = (v: BadgeVideoFeedItem) => ({
    id: v.id,
    url: v.url,
    business_name: v.businessName || "",
    pageBusinessName: v.businessName ?? null,
    pageBusinessId: v.businessId ?? null,
    owner: v.businessId
      ? { id: v.businessId, name: v.businessName || "", logo_url: v.businessLogoUrl ?? null, logo_bg: v.businessLogoBg ?? null }
      : null,
    social: v.social ?? null,
    showSocialBadge: !!v.social,
    description: v.description ?? null,
    manualCard: null,
    title: v.title ?? null,
    price: v.price ?? null,
    badges: v.badges ?? null,
    _isGeneric: !!v.isGeneric,
  });

  const openDemoFeed = useCallback(async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      const { fetchDiscoveryVideoFeed } = await import("@/lib/badgeVideoFeed");
      const { items, ctx } = await fetchDiscoveryVideoFeed({ limit: 60, featuredAuthor: "Tarik Belasri" });
      if (!items.length) { setDemoIntro(false); return; }
      setDemoList(items.map(toPanelVideo));
      setDemoCtx(ctx);
      setDemoTime(0);
      demoLoadingMoreRef.current = false;
      setDemoActiveId(items[0].id);
    } catch (e) {
      console.error("[front] openDemoFeed failed", e);
      setDemoIntro(false);
    } finally {
      setDemoLoading(false);
    }

  }, [demoLoading]);

  // Lancement direct de la démo sur l'assistant IA plateforme 1WM.
  const startDemo = useCallback(() => {
    setDemoAiMode("platform");
    setDemoIntro(true);
    window.setTimeout(() => { void openDemoFeed(); }, reduced ? 0 : 700);
  }, [openDemoFeed, reduced]);

  const maybeLoadMoreDemo = useCallback(async (currentId: string) => {
    const ctx = demoCtx;
    if (!ctx || demoLoadingMoreRef.current) return;
    const idx = demoList.findIndex((v) => v.id === currentId);
    if (idx < 0 || idx < demoList.length - 10) return;
    if (demoList.length >= ctx.total) return;
    demoLoadingMoreRef.current = true;
    try {
      const { fetchDiscoveryVideoFeedPage } = await import("@/lib/badgeVideoFeed");
      const items = await fetchDiscoveryVideoFeedPage(ctx, demoList.length, 30);
      if (items.length) {
        setDemoList((prev) => {
          const seen = new Set(prev.map((v) => v.id));
          return [...prev, ...items.filter((it) => !seen.has(it.id)).map(toPanelVideo)];
        });
      }
    } catch {
      /* pagination best-effort */
    } finally {
      demoLoadingMoreRef.current = false;
    }
  }, [demoCtx, demoList]);


  /** Clic sur une chip badge dans le viewer → relance du feed sur ce badge. */
  const selectDemoBadge = useCallback(async (badge: { id: string; name: string }) => {
    const ctx = demoCtx;
    if (!ctx) return;
    const { fetchDiscoveryVideoFeedForBadge } = await import("@/lib/badgeVideoFeed");
    const { items, ctx: nextCtx } = await fetchDiscoveryVideoFeedForBadge(ctx, badge.id, 60);
    if (!items.length) return;
    setDemoBadgeId(badge.id);
    setDemoList(items.map(toPanelVideo));
    setDemoCtx(nextCtx);
    setDemoTime(0);
    demoLoadingMoreRef.current = false;
    setDemoActiveId(items[0].id);
  }, [demoCtx]);

  /** Clic sur la chip ville dans le viewer → relance du feed sur cette ville. */
  const selectDemoCity = useCallback(async (city: { id: string; name: string }) => {
    const ctx = demoCtx;
    if (!ctx) return;
    const { fetchDiscoveryVideoFeedForCity } = await import("@/lib/badgeVideoFeed");
    const { items, ctx: nextCtx } = await fetchDiscoveryVideoFeedForCity(ctx, city.id, 60);
    if (!items.length) return;
    setDemoBadgeId(null);
    setDemoList(items.map(toPanelVideo));
    setDemoCtx(nextCtx);
    setDemoTime(0);
    demoLoadingMoreRef.current = false;
    setDemoActiveId(items[0].id);
  }, [demoCtx]);

  /** Clic sur la chip YouTube dans le viewer → feed des seules vidéos YouTube. */
  const selectDemoYouTube = useCallback(async () => {
    const ctx = demoCtx;
    if (!ctx) return;
    const { fetchDiscoveryVideoFeedForYouTube } = await import("@/lib/badgeVideoFeed");
    const { items, ctx: nextCtx } = await fetchDiscoveryVideoFeedForYouTube(ctx, 60);
    if (!items.length) return;
    setDemoBadgeId(null);
    setDemoList(items.map(toPanelVideo));
    setDemoCtx(nextCtx);
    setDemoTime(0);
    demoLoadingMoreRef.current = false;
    setDemoActiveId(items[0].id);
  }, [demoCtx]);

  /** Clic sur une carte du panneau gauche → feed correspondant (sans filtre ville). */
  const [demoCardKey, setDemoCardKey] = useState<string | null>(null);
  const selectDemoCard = useCallback(async (card: FrontDemoCard) => {
    const { fetchDiscoveryVideoFeedForCard } = await import("@/lib/badgeVideoFeed");
    const { items, ctx: nextCtx } = await fetchDiscoveryVideoFeedForCard(
      { badgeId: card.badgeId, businessId: card.businessId, videoId: card.videoId },
      60,
    );
    if (!items.length) return;
    setDemoCardKey(card.key);
    setDemoBadgeId(card.badgeId ?? null);
    setDemoList(items.map(toPanelVideo));
    setDemoCtx(nextCtx);
    setDemoTime(0);
    demoLoadingMoreRef.current = false;
    setDemoActiveId(items[0].id);
  }, []);



  /** Auto-fit du slogan écran 1 : taille max possible dans la hauteur de la section
   *  qui lui est dédiée (1/3 de l'espace entre header et CTA Découvrir). Si 5 lignes
   *  ne tiennent pas lisiblement, repli automatique en 3 lignes. Mobile uniquement. */
  const narrativeBoxRef = useRef<HTMLDivElement | null>(null);
  const sloganSectionRef = useRef<HTMLDivElement | null>(null);
  const [sloganFontPx, setSloganFontPx] = useState<number | null>(null);
  const [sloganCompact, setSloganCompact] = useState(false);

  useEffect(() => {
    const LEADING = 1.12;
    const compute = () => {
      const section = sloganSectionRef.current;
      if (!section) return;
      if (window.innerWidth >= 768) {
        setSloganFontPx(null);
        setSloganCompact(false);
        return;
      }
      const cs = getComputedStyle(section);
      const avail =
        section.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom);
      if (avail <= 0) {
        setSloganCompact(true);
        setSloganFontPx(16);
        return;
      }
      // Le slogan fait toujours 3 lignes ; on ajuste à la hauteur de section
      // sans dépasser la largeur utile (mot le plus long : SOLIDAIRE).
      const cap = Math.min(0.12 * window.innerWidth, 0.09 * window.innerHeight, 70);
      const usable = avail * 0.94;
      setSloganCompact(false);
      setSloganFontPx(Math.max(16, Math.min(cap, usable / (3 * LEADING))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (sloganSectionRef.current) ro.observe(sloganSectionRef.current);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);


  // délai d'apparition des bullets
  useEffect(() => {
    const t = window.setTimeout(() => setBulletsVisible(true), 2000);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  // les barres gold horizontales apparaissent dès le bullet 1
  const barsVisible = bulletsVisible && step >= CAROUSEL_STEPS[0];









  const goToStep = useCallback(
    (i: number, freeze = false) => {
      const next = Math.min(STEPS.length - 1, Math.max(0, i));
      setStep(next);
      if (next < STEPS.length - 1) setShowEndCTAs(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (freeze) {
        setAuto(false);
        return;
      }
      if (auto) scheduleNext(next);
    },
    [scheduleNext, auto]
  );



  const toggleAuto = useCallback(() => {
    setAuto((a) => {
      if (a) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      } else {
        scheduleNext(step);
      }
      return !a;
    });
  }, [scheduleNext, step]);


  // Une question lancée dans l'assistant IA de l'écran 1 neutralise le scroll
  // vers l'écran 2 (l'utilisateur lit sa réponse).
  const [askLocked, setAskLocked] = useState(false);
  // Overlay Map ouvert depuis l'embed (ex. chip « Map » de l'accueil IA) :
  // l'iframe passe en pleine largeur pour que le panneau soit collé à droite.
  const [mapOpen, setMapOpen] = useState(false);
  const [askFrameReady, setAskFrameReady] = useState(false);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "owm-ask:asked") {
        setAskLocked(true);
        // Conversation lancée : la vidéo de fond passe en pause.
        backgroundVideoRef.current?.pause();
      } else if (e.data?.type === "owm-ask:new-conversation") {
        // Nouvelle conversation : la lecture de la vidéo de fond reprend.
        const video = backgroundVideoRef.current;
        if (video?.paused) void video.play().catch(() => undefined);
      } else if (e.data?.type === "owm-ask:map-open") {
        setMapOpen(true);
      } else if (e.data?.type === "owm-ask:map-closed") {
        setMapOpen(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const askLockedRef = useRef(false);
  askLockedRef.current = askLocked;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-front-demo-panel]")) return;
      e.preventDefault();
      if (askLockedRef.current) return;
      setTarget(targetRef.current + e.deltaY / 600);
    };

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-front-demo-panel]")) {
        touchYRef.current = null;
        return;
      }
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-front-demo-panel]")) return;
      const y = e.touches[0]?.clientY ?? null;
      if (y === null || touchYRef.current === null) return;
      e.preventDefault();
      if (askLockedRef.current) return;
      setTarget(targetRef.current + (touchYRef.current - y) / 350);
      touchYRef.current = y;
    };

    const onKey = (e: KeyboardEvent) => {
      if (askLockedRef.current) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {

        e.preventDefault();
        setTarget(targetRef.current + (e.key === "PageDown" ? 0.5 : 0.2));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setTarget(targetRef.current - (e.key === "PageUp" ? 0.5 : 0.2));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [setTarget]);

  const narrativeOpacity = 1 - range(progress, 0, 0.35);
  const narrativeActive = progress < 0.35;
  
  const ctaP = range(progress, 0.25, 0.9);
  const ctaActive = progress > 0.575;
  const showCue = progress <= 0.06;

  const motion = reduced ? "none" : undefined;

  return (
    <section
      ref={sectionRef}
      /* `touch-none` (touch-action:none) est levé dès que la démo est ouverte :
         un ancêtre en touch-action:none bloque le pan tactile du panneau de
         cartes (scroll vertical impossible sur mobile/tablette). */
      className={`relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)] ${
        demoActiveId || demoCardsOnly ? "" : "touch-none"
      }`}
      onClick={() => {
        if (narrativeActive && step < STEPS.length - 1) goToStep(step + 1);
      }}
    >
      {/* Vidéo de fond */}
      <video
        ref={backgroundVideoRef}
        key={isPortrait ? "portrait" : "landscape"}
        className="absolute inset-0 h-full w-full object-cover"
        src={isPortrait ? PORTRAIT_VIDEO_URL : LANDSCAPE_VIDEO_URL}
        poster={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          filter: `brightness(${1 - progress * 0.45})`,
          transform: reduced ? undefined : `scale(${1 + progress * 0.06})`,
          transition: motion,
        }}
      />

      {/* Scrim + halos */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,5,4,.55) 0%, rgba(6,5,4,.42) 35%, rgba(6,5,4,.72) 75%, rgba(6,5,4,.92) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(50% 45% at 12% 8%, hsl(var(--primary) / 0.28), transparent 70%), radial-gradient(45% 40% at 88% 92%, hsl(var(--gold) / 0.2), transparent 70%)",
        }}
      />

      {/* Mini-header pinné (identité + menu) — visible écrans 1 et 2, masqué pendant la démo */}
      <FrontHeader fixed={false} visible={!demoIntro} />


      {/* Bloc central — 3 sections égales entre header et CTA Découvrir */}
      <div
        ref={narrativeBoxRef}
        className={`absolute inset-0 z-20 flex flex-col pt-16 pb-16 md:pt-14 md:pb-10 ${askLocked ? "px-0" : "px-2 md:px-10 lg:px-16"}`}
        style={{
          opacity: demoActiveId || demoCardsOnly ? 0 : narrativeOpacity,
          transform: reduced
            ? undefined
            : `translateY(${-range(progress, 0, 0.35) * 40}px)`,
          pointerEvents: demoActiveId || demoCardsOnly ? "none" : (narrativeActive ? "auto" : "none"),
          transition: motion,
        }}
        aria-hidden={!!(demoActiveId || demoCardsOnly || !narrativeActive)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Assistant IA — iframe /embed/embédée (chrome masqué, thème sombre) */}
        <div className="flex h-full w-full flex-col">
          <iframe
            src="/embed/ask?scope=platform&theme=dark&chrome=0&bg=transparent&canvas=transparent&ink=light"
            title="Assistant IA"
            className="h-full w-full flex-1 border-0 bg-transparent"
            style={{
              opacity: askFrameReady ? 1 : 0,
              transition: "opacity 220ms ease-out",
            }}
            onLoad={() => setAskFrameReady(true)}
          />
        </div>

      </div>

      <style>{`
        @keyframes owmSlideDown {
          from { opacity: 0; transform: translateY(-24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes owmFillBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {/* Couche écran 2 — masquée dès qu'une conversation IA est lancée */}
      {!askLocked && (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 px-5 pt-10 pb-14 md:gap-8 md:px-10 md:pt-16 md:pb-24"
        style={{
          opacity: ctaP,
          transform: reduced ? undefined : `translateY(${(1 - ctaP) * 48}px) scale(${0.96 + ctaP * 0.04})`,
          pointerEvents: ctaActive ? "auto" : "none",
          transition: motion,
        }}
        aria-hidden={!ctaActive}
      >
        {/* Titre écran 2 */}
        <p
          className="text-center text-[clamp(1.75rem,min(8.5vw,5.5vh),3.8rem)] md:text-[clamp(2rem,min(10vw,6.5vh),4.5rem)] uppercase leading-[1.12] tracking-tight"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            color: "transparent",
            WebkitTextStrokeWidth: "2px",
            WebkitTextStrokeColor: "#FFFFFF",
            ...(sloganFontPx ? { fontSize: `${isMobile ? Math.round(sloganFontPx * 0.85) : sloganFontPx}px` } : null),
          }}
        >
          <span className="block md:hidden">One</span>
          <span className="block md:hidden">World</span>
          <span className="block md:hidden">Morocco</span>
          <span className="hidden md:inline">One World Morocco</span>
        </p>

        {/* Animation bullet points */}
        <div className="flex w-full max-w-2xl flex-col items-center gap-2 md:gap-3">
          <div className="min-h-[1.75rem] md:min-h-[2.25rem]">
            {step >= 1 && STEPS[step]?.title && (
              <p
                key={`s2-${step}`}
                className="font-roboto text-xl font-bold leading-snug text-[#F4EEE4] md:text-2xl"
                style={{ animation: reduced ? undefined : "owmSlideDown 420ms ease-out both" }}
              >
                {STEPS[step].title}
              </p>
            )}
          </div>

          <div className="relative w-full">
            <div className="flex items-start gap-3 font-roboto text-base font-normal leading-[1.3] text-[#F4EEE4] md:text-lg md:leading-snug">
              <img
                src={hamsaIcon.url}
                alt=""
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-full md:h-6 md:w-6 transition-opacity duration-300 ${
                  step >= 1 ? "opacity-100" : "opacity-0"
                }`}
                loading="eager"
              />
              <div className="grid grid-cols-1">
                {STEPS.map((s, i) => {
                  if (!s.bullet) return null;
                  const isActive = i === step;
                  return (
                    <span
                      key={i}
                      aria-hidden={!isActive}
                      className={`col-start-1 row-start-1 ${
                        isActive ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                      style={{
                        animation:
                          reduced || !isActive ? undefined : "owmSlideDown 420ms ease-out both",
                      }}
                    >
                      {s.render()}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-1.5 flex gap-1.5 md:mt-4" onClick={(e) => e.stopPropagation()}>
              {CAROUSEL_STEPS.map((stepIndex, i) => {
                const done = step > stepIndex;
                const current = step === stepIndex;
                const durationMs = CAROUSEL_DURATIONS_MS[i] ?? STEP_MS;
                return (
                  <button
                    key={stepIndex}
                    type="button"
                    aria-label={`Bullet ${stepIndex}`}
                    aria-current={current}
                    tabIndex={ctaActive ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToStep(stepIndex, true);
                    }}
                    style={{ flex: `${BULLET_WEIGHTS[i] ?? 1} 1 0%` }}
                    className="h-2 overflow-hidden rounded-full bg-[rgba(244,238,228,0.2)] py-[3px]"
                  >
                    <span
                      key={current ? `cur2-${step}` : done ? "done" : "todo"}
                      className="block h-full rounded-full bg-gold"
                      style={{
                        width: done || current ? "100%" : "0%",
                        opacity: done || current ? 1 : 0,
                        transition: reduced || !current ? "none" : `width ${durationMs}ms linear`,
                        ...(current && !reduced && auto
                          ? { animation: `owmFillBar ${durationMs}ms linear both` }
                          : null),
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Slogan écran 2 */}
        <p
          className="relative text-center text-[clamp(1.75rem,min(8.5vw,5.5vh),3.8rem)] md:text-[clamp(2rem,min(10vw,6.5vh),4.5rem)] uppercase leading-[1.12] tracking-tight"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            color: "transparent",
            WebkitTextStrokeWidth: "2px",
            WebkitTextStrokeColor: "#FFFFFF",
            ...(sloganFontPx ? { fontSize: `${isMobile ? Math.round(sloganFontPx * 0.85) : sloganFontPx}px` } : null),
          }}
        >
          <span className="relative z-10 block">LOCAL</span>
          <span className="relative z-10 block">DIGITAL</span>
          <span className="relative z-10 block">SOLIDAIRE</span>
        </p>
      </div>
      )}



      {/* Cue de scroll */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (askLocked) return;
            setTarget(1);
          }}
          className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.8)] hover:text-gold"
          style={{
            opacity: showCue && !demoIntro && !demoActiveId && !askLocked ? 1 : 0,

            pointerEvents: showCue && !demoIntro && !demoActiveId && !askLocked ? "auto" : "none",
            animation: reduced || !showCue || demoActiveId ? undefined : "owmSlideDown 420ms ease-out both",
            transition: motion,
          }}
          tabIndex={showCue && !askLocked ? 0 : -1}

        >
          <ChevronDown className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
          <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
            Découvrir
          </span>
        </button>
      </div>

      {/* CTA Revenir (+ Demo discret) — symétrique de Découvrir, visible sur écran 2 (desktop only) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 hidden md:flex items-end justify-center gap-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startDemo();
          }}
          disabled={demoLoading}
          aria-label="Demo — découverte vidéo"
          className="rounded-lg border border-white/20 bg-white/[0.06] px-3 py-1.5 font-roboto text-xs font-bold uppercase tracking-[0.18em] text-[rgba(244,238,228,0.8)] backdrop-blur-md transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-60"
          style={{
            opacity: ctaActive ? 1 : 0,
            pointerEvents: ctaActive ? "auto" : "none",
            transition: motion,
          }}
          tabIndex={ctaActive ? 0 : -1}
          aria-hidden={!ctaActive}
        >
          Demo
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTarget(0);
          }}
          className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.8)] hover:text-gold"
          style={{
            opacity: ctaActive ? 1 : 0,
            pointerEvents: ctaActive ? "auto" : "none",
            transition: motion,
          }}
          tabIndex={ctaActive ? 0 : -1}
          aria-hidden={!ctaActive}
        >
          <ChevronUp className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
          <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
            Revenir
          </span>
        </button>
      </div>

      {/* Panneau blanc gauche (desktop) : cartes du snapshot homepage.
          Reste ouvert en pleine largeur quand le viewer est fermé. */}
      {(demoActiveId || demoCardsOnly) && (
        <Suspense fallback={null}>
          <FrontDemoCardsPanel
            open
            activeCardKey={demoCardKey}
            fullWidth={!demoActiveId && demoCardsOnly}
            onSelectCard={(card) => { void selectDemoCard(card); }}
            onClose={() => {
              setDemoCardsOnly(false);
              setDemoActiveId(null);
              setDemoIntro(false);
            }}
          />
        </Suspense>
      )}

      {demoActiveId && (() => {

        const active = demoList.find((v) => v.id === demoActiveId) || null;
        if (!active) return null;
        return (
          <Suspense fallback={null}>
            <HomeVideoSlidePanel
              open
              onClose={() => { setDemoActiveId(null); setDemoCardsOnly(true); }}
              activeVideo={active as any}
              activeList={demoList as any}
              onActiveVideoChange={(v: any) => { setDemoActiveId(v.id); setDemoTime(0); void maybeLoadMoreDemo(String(v.id)); }}
              isActiveGeneric={!!active._isGeneric}
              currentTime={demoTime}
              onTimeUpdate={setDemoTime}
              returnContext={null}
              onBadgeSelect={(b: any) => { void selectDemoBadge(b); }}
              onCitySelect={(c: any) => { void selectDemoCity(c); }}
              onYouTubeSelect={() => { void selectDemoYouTube(); }}
              selectedBadgeId={demoBadgeId}
              aiMode={demoAiMode}
              roundedFrame
            />

          </Suspense>
        );
      })()}
    </section>
  );

};

export default Front;
