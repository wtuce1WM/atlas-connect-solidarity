import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { ArrowDown, ArrowRight, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck, Play, Pause, Volume2, VolumeX, Percent, User } from "lucide-react";

import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import HScroll from "@/components/HScroll";
import SearchInput from "@/components/SearchInput";
import LiquidAIMoroccoBg from "@/components/LiquidAIMoroccoBg";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import Step2AssistantBlock from "@/components/home/Step2AssistantBlock";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { Search, Mic } from "lucide-react";

import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import heroHomeVertAsset from "@/assets/hero-home-vert.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import zelligeMobileAsset from "@/assets/backgr-brun-zelliges.webp.asset.json";
import appIconHamsaAsset from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = koutoubiaVerticalBgAsset.url;
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";
import { translateVignetteLabel } from "@/lib/vignetteLabels";
import logoHamsa from "@/assets/logo-hamsa-gold.png";
import etape5Bg from "@/assets/etape5-immersif.webp.asset.json";
import heroVideoAsset from "@/assets/hero-video.mp4.asset.json";

import step3MockupAsset from "@/assets/step3-mockup.webp.asset.json";
import destinationsMapAsset from "@/assets/destinations_map1.webp.asset.json";
import poiMapAsset from "@/assets/poi_map.webp.asset.json";
import { X } from "lucide-react";

const CITIES = ["Marrakech", "Essaouira"] as const;
type CityKey = (typeof CITIES)[number];

type VideoSlot = {
  key: string;
  kind: "entry" | "extra";
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  label: string | null;
  subcategoryNames: string[];
  badgeId: string | null;
  eventId: string | null;
  businessId: string | null;
};

const InViewVideo = ({ src, className, controls = false }: { src: string; className?: string; controls?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const userPausedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userPausedRef.current) el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      io.disconnect();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      userPausedRef.current = false;
      el.play().catch(() => {});
    } else {
      userPausedRef.current = true;
      el.pause();
    }
  };
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };
  if (!controls) {
    return <video ref={ref} src={src} muted loop playsInline preload="metadata" className={className} />;
  }
  return (
    <div className={`relative ${className ?? ""}`}>
      <video ref={ref} src={src} muted loop playsInline preload="metadata" className="h-full w-full object-cover rounded-[inherit]" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid place-items-center h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white border border-white/25 hover:bg-black/70 transition"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Activer le son" : "Couper le son"}
          className="grid place-items-center h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white border border-white/25 hover:bg-black/70 transition"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
};

// Image de fond avec effet parallax JS (fonctionne sur iOS Safari, contrairement à bg-fixed)
const ParallaxImg = ({ src, className, style, amplitude = 40 }: { src: string; className?: string; style?: React.CSSProperties; amplitude?: number }) => {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const parent = el.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      el.style.transform = `translate3d(0, ${(-clamped * amplitude).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [amplitude]);
  return <img ref={ref} src={src} alt="" aria-hidden="true" className={className} style={{ willChange: "transform", ...style }} />;
};

const Step2PhoneMockup = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none">
    <div className="relative h-[58%] w-[42%] translate-x-[18%] translate-y-[8%] rotate-[10deg] rounded-[2rem] border-[10px] border-foreground/80 bg-white shadow-[0_24px_50px_rgba(0,0,0,0.2)] md:h-[74%] md:w-[38%] md:translate-y-[16%]">
      <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/80" />
      <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white px-3 pb-3 pt-8">
        <div className="mb-2 flex items-center gap-2 text-[8px] font-bold uppercase text-foreground/60">
          <span>✦ IA</span><span>▶ YouTube</span><span>◎ Lieu</span>
        </div>
        <div className="space-y-1.5 text-[9px] leading-tight text-foreground/75">
          <p>Je veux me séparer de la mythique route de l'Ourika...</p>
          <p className="font-bold text-foreground">Café del Mar Marrakech</p>
          <p>ambiance festive et dynamique, piscine et coucher du soleil.</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
            <div className="h-16 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))]" />
            <div className="p-1.5">
              <div className="h-2 w-20 rounded bg-foreground/70" />
              <div className="mt-1 h-2 w-12 rounded bg-foreground/30" />
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
            <div className="h-16 bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--secondary)))]" />
            <div className="p-1.5">
              <div className="h-2 w-16 rounded bg-foreground/70" />
              <div className="mt-1 h-2 w-10 rounded bg-foreground/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const renderDescWithCheckmarks = (text: string, isDarkBg = false) => {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <span className="flex flex-col gap-1.5 w-full">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•\u00a0") || trimmed.startsWith("\u00a0•");
        
        if (isBullet) {
          const content = line.replace(/^\s*[\u00a0]?•\s*/, "").replace(/^\s*-\s*/, "").replace(/^\s*\*\s*/, "").trim();
          return (
            <span key={idx} className="flex items-start gap-2.5 text-left w-full">
              <span 
                className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full mt-1 border border-[#194CFF]/10 shadow-sm"
                style={{ backgroundColor: "#194CFF" }}
              >
                <svg className="w-2.5 h-2.5 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <span className={isDarkBg ? "text-white/90" : "text-black/90"}>
                {content}
              </span>
            </span>
          );
        }
        
        if (trimmed === "" || trimmed === "\u00a0") {
          return <span key={idx} className="h-1" />;
        }
        
        return (
          <span key={idx} className={`${isDarkBg ? "text-white/90" : "text-black/90"} block text-left`}>
            {line}
          </span>
        );
      })}
    </span>
  );
};

const HOME_LABELS = {
  fr: {
    heroTitle: "La Première Plateforme Solidaire du Maroc",
    heroLine1: "Faites de chaque achat",
    heroLine2: "un acte de générosité.",
    heroLearnMore: "En savoir plus.",
    searchPlaceholder: "Rechercher un hôtel, un restaurant, une expérience…",
    watchVideo: "Voir la vidéo",
    discover: "Découvrir",
    howItWorks: "Comment fonctionne l'App ?",
    inspireYourself: "Inspirez-vous",
    inspireSubtitle: "Nos derniers guides pour explorer le Maroc autrement.",
    seeAllArticles: "Tous les articles",
    seeAllArticlesSubtitle: "Explorer nos guides",
    hotelDestination: "Destination",
    hotelArrival: "Arrivée",
    hotelDeparture: "Départ",
    hotelAdults: "Adultes",
    hotelSeeAvailability: "Voir les disponibilités",
    seoTitle: "La Première Plateforme Solidaire du Maroc — ONE WORLD MOROCCO",
    seoDescription:
      "Inspirez-vous des meilleures adresses du Maroc : hôtels, restaurants, expériences et itinéraires sélectionnés et vérifiés.",
  },
  en: {
    heroTitle: "Morocco's First Solidarity Platform",
    heroLine1: "Make every purchase",
    heroLine2: "an act of generosity.",
    heroLearnMore: "Learn more.",
    searchPlaceholder: "Search a hotel, a restaurant, an experience…",
    watchVideo: "Watch the video",
    discover: "Discover",
    howItWorks: "How does the App work?",
    inspireYourself: "Get inspired",
    inspireSubtitle: "Our latest guides to explore Morocco differently.",
    seeAllArticles: "All articles",
    seeAllArticlesSubtitle: "Explore our guides",
    hotelDestination: "Destination",
    hotelArrival: "Check-in",
    hotelDeparture: "Check-out",
    hotelAdults: "Adults",
    hotelSeeAvailability: "See availability",
    seoTitle: "Morocco's First Solidarity Platform — ONE WORLD MOROCCO",
    seoDescription:
      "Get inspired by the best addresses in Morocco: curated and verified hotels, restaurants, experiences and itineraries.",
  },
  ar: {
    heroTitle: "أول منصة تضامنية في المغرب",
    heroLine1: "اجعل من كل عملية شراء",
    heroLine2: "عملاً من أعمال السخاء.",
    heroLearnMore: "اعرف المزيد.",
    searchPlaceholder: "ابحث عن فندق، مطعم، تجربة…",
    watchVideo: "شاهد الفيديو",
    discover: "اكتشف",
    howItWorks: "كيف يعمل التطبيق؟",
    inspireYourself: "استلهم",
    inspireSubtitle: "آخر أدلتنا لاستكشاف المغرب بطريقة مختلفة.",
    seeAllArticles: "جميع المقالات",
    seeAllArticlesSubtitle: "استكشف أدلتنا",
    hotelDestination: "الوجهة",
    hotelArrival: "الوصول",
    hotelDeparture: "المغادرة",
    hotelAdults: "البالغون",
    hotelSeeAvailability: "عرض التوفر",
    seoTitle: "أول منصة تضامنية في المغرب — ONE WORLD MOROCCO",
    seoDescription:
      "استلهم من أفضل عناوين المغرب: فنادق ومطاعم وتجارب ومسارات مختارة وموثقة.",
  },
} as const;

const HomeV1 = () => {

  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const localizeUrl = (path: string) => withLangPrefix(path, language as "fr" | "en" | "ar");
  const L = HOME_LABELS[language] ?? HOME_LABELS.fr;
  const STEPS = getSteps((["fr", "en", "ar"].includes(language) ? language : "fr") as StepLang);



  const [selectedCity, setSelectedCity] = useState<CityKey>("Marrakech");
  const [videos, setVideos] = useState<VideoSlot[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [latestPosts, setLatestPosts] = useState<Array<{ slug: string; title: string; image?: string }>>([]);
  const [videoOpen, setVideoOpen] = useState(false);
  const [inlineVoiceActive, setInlineVoiceActive] = useState(false);
  const { toast } = useToast();
  const heroVoice = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory, timeKeyword) => {
      const params = new URLSearchParams({ q: keywords, spoken, _t: String(Date.now()) });
      if (detectedCategory) params.set("category", detectedCategory);
      if (timeKeyword) params.set("timeKeyword", timeKeyword);
      navigate(`/search?${params.toString()}`);
    },
    onError: (message) => toast({ title: "Erreur", description: message, variant: "destructive" }),
  });

  const isVoiceActive = inlineVoiceActive || heroVoice.status === "recording" || heroVoice.status === "processing";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title_fr, title_en, title_ar, cover_image_url, custom_hero_image_url, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5);

      const posts = (data || []).map((p: any) => ({
        slug: `/blog/${p.slug}`,
        title:
          (language === "ar" && p.title_ar) ||
          (language === "en" && p.title_en) ||
          p.title_fr,
        image: p.custom_hero_image_url || p.cover_image_url || undefined,

      }));

      if (cancelled) return;
      setLatestPosts(posts);
    })();
    return () => { cancelled = true; };
  }, [language]);


  

  useSEO({
    title: L.seoTitle,
    description: L.seoDescription,
    canonical: "/",
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingVideos(true);
    (supabase as any)
      .from("homepage_cards_snapshots")
      .select("payload")
      .eq("city", selectedCity)
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled) return;
        const payload = (data?.payload as any[]) || [];
        const slots: VideoSlot[] = payload
          .filter((s) => s?.data?.videoId && (s?.data?.videoUrl || s?.data?.thumbnail))
          .map((s, i) => ({
            key: s.key || `v-${i}`,
            kind: s.kind === "extra" ? "extra" : "entry",
            videoId: s.data.videoId,
            videoUrl: s.data.videoUrl,
            thumbnail: s.data.thumbnail,
            businessName: s.data.businessName ?? null,
            label: s.data.label ?? null,
            subcategoryNames: Array.isArray(s.data.subcategoryNames) ? s.data.subcategoryNames : [],
            badgeId: s.data.badgeId ?? (s.data.target?.type === "badge" ? s.data.target.id : null),
            eventId: s.data.eventId ?? (s.data.target?.type === "event" ? s.data.target.id : null),
            businessId: s.data.businessId ?? null,
          }));
        setVideos(slots);
        setLoadingVideos(false);
      });
    return () => { cancelled = true; };
  }, [selectedCity]);

  const fetchFrontStructureSubcategoryNames = async (label: string) => {
    const { data: entry } = await (supabase as any)
      .from("front_structure")
      .select("id")
      .ilike("name", label)
      .maybeSingle();
    const entryId = (entry as any)?.id;
    if (!entryId) return [] as string[];

    const { data: links } = await (supabase as any)
      .from("front_structure_subcategories")
      .select("subcategory_id")
      .eq("front_structure_id", entryId);
    const ids = ((links as any[]) || []).map((l) => l.subcategory_id).filter(Boolean);
    if (ids.length === 0) return [] as string[];

    const { data: subcats } = await (supabase as any)
      .from("subcategories")
      .select("name_fr")
      .in("id", ids);
    return ((subcats as any[]) || []).map((s) => s.name_fr).filter(Boolean) as string[];
  };

  const scrollToNext = () => {
    const el = document.getElementById("how-it-works-title");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const horizontalRef = useRef<HTMLDivElement>(null);
  const stickyHorizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const inspirationRef = useRef<HTMLDivElement>(null);
  const inspirationTrackRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLImageElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);

  // Mouse + scroll parallax on hero (mirrors /corporate)
  useEffect(() => {
    const hero = heroSectionRef.current;
    if (!hero) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mx = 0, my = 0, tx = 0, ty = 0, sy = 0, ticking = false;
    const update = () => {
      tx += (mx - tx) * 0.08;
      ty += (my - ty) * 0.08;
      hero.style.setProperty('--mx', tx.toFixed(3));
      hero.style.setProperty('--my', ty.toFixed(3));
      hero.style.setProperty('--sy', sy.toFixed(3));
      if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
        requestAnimationFrame(update);
      } else ticking = false;
    };
    const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const onLeave = () => { mx = 0; my = 0; kick(); };
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      sy = Math.max(-1, Math.min(1, -r.top / r.height));
      kick();
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const el = heroBgRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        el.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    let cachedVw = window.innerWidth;
    let cachedTotal = 1;
    let cachedMaxX = 0;

    const recomputeMetrics = () => {
      const container = horizontalRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      cachedVw = window.innerWidth;
      cachedMaxX = Math.max(0, track.scrollWidth - cachedVw);
      cachedTotal = Math.max(1, cachedMaxX);
      container.style.height = `${Math.ceil(window.innerHeight + cachedTotal)}px`;
    };

    const onScroll = () => {
      const container = horizontalRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      const rect = container.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / cachedTotal));
      track.style.transform = `translate3d(${-progress * cachedMaxX}px, 0, 0)`;

      const centerX = cachedVw / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - centerX);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      setActiveStep(bestIdx);
    };

    const onResize = () => { recomputeMetrics(); onScroll(); };

    recomputeMetrics();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Videos in the steps grid keep their native autoPlay; no pause logic needed.


  useLayoutEffect(() => {
    let total = 1;
    let maxX = 0;

    const recompute = () => {
      const container = inspirationRef.current;
      const track = inspirationTrackRef.current;
      if (!container || !track) return;
      maxX = Math.max(0, track.scrollWidth - window.innerWidth);
      total = Math.max(1, maxX);
      container.style.height = `${Math.ceil(window.innerHeight + total)}px`;
    };

    const onScroll = () => {
      const container = inspirationRef.current;
      const track = inspirationTrackRef.current;
      if (!container || !track) return;
      const rect = container.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      track.style.transform = `translate3d(${-progress * maxX}px, 0, 0)`;
    };

    const onResize = () => { recompute(); onScroll(); };

    recompute();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    // Recompute after images load
    const t = window.setTimeout(onResize, 500);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearTimeout(t);
    };
  }, [latestPosts.length]);











  return (
    <div dir="ltr" className="min-h-screen bg-background">
      {/* TOP BAR — sticky */}
      <HomeMindtripHeader />




      {/* HERO */}

      <div>
        <section 
          ref={heroSectionRef}
          className="home-hero-section hero-parallax relative min-h-[100dvh] md:min-h-[92svh] w-full overflow-hidden"
          style={{ ['--mx' as any]: 0, ['--my' as any]: 0, ['--sy' as any]: 0 }}
        >
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobile} />
          <source media="(max-width: 1023px)" srcSet={heroImageTablet} />
           <img
              ref={heroBgRef}
              src={heroImageDesktop}
              alt="Maroc — riad, piscine et tagine, composition réalisme magique"
              className="absolute inset-0 h-full w-full object-cover will-change-transform lg:h-[120%]"
              loading="eager"
              fetchPriority="high"
             />
        </picture>
         {/* Dark overlay on tablet to ensure text readability over zellige pattern */}
         <div className="hidden md:block lg:hidden absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
        <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-black/85 via-black/45 to-transparent md:hidden z-10" />


         {/* Floating phone mockup — left side, desktop only */}
         <img
           src={phoneMockupAsset.url}
           alt="Application One World Morocco sur iPhone"
           aria-hidden="true"
           className="hidden lg:block pointer-events-none select-none absolute left-[2%] xl:left-[5%] top-1/2 -translate-y-1/2 h-[64%] w-auto z-20 drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] animate-[heroPhoneFloat_6s_ease-in-out_infinite]"
         />
         {/* Floating iPhone mockup — right side, tablet only (768px to 1023px) */}
         <img
           src={iphoneTabletMockupAsset.url}
           alt="Application One World Morocco — Koutoubia"
           aria-hidden="true"
           className="hidden md:block lg:hidden pointer-events-none select-none absolute right-[3%] top-1/2 -translate-y-1/2 md:max-lg:top-[38%] md:max-lg:h-[48%] w-auto z-20 drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] animate-[heroPhoneFloat_4.5s_ease-in-out_infinite]"
         />
         {/* Centered iPhone mockup — mobile only, exactly like /corporate */}
         {/* <img
           src={phoneMockupAsset.url}
           alt="Application One World Morocco sur iPhone"
           aria-hidden="true"
           className="block md:hidden pointer-events-none select-none absolute top-[10%] left-0 right-0 h-[85%] w-full object-contain object-bottom origin-top scale-[0.95] z-10 opacity-85 animate-[mobilePhoneFloat_5s_ease-in-out_infinite]"
         /> */}
        <style>{`
          @keyframes heroPhoneFloat {
            0%, 100% { transform: translateY(calc(-50% - 8px)); }
            50% { transform: translateY(calc(-50% + 8px)); }
          }
          @keyframes mobilePhoneFloat {
            0%, 100% { transform: scale(0.95) translateY(0); }
            50% { transform: scale(0.95) translateY(-12px); }
          }
          .hero-parallax { perspective: 1200px; }
          .hero-parallax .home-hero-content {
            transform: translate3d(0, calc(var(--sy)*-30px), 0);
            transition: transform .5s cubic-bezier(.2,.7,.2,1);
            will-change: transform;
          }
          @keyframes heroRise { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: none; } }
          .hero-rise { opacity: 0; animation: heroRise 1s forwards; }
          @media (prefers-reduced-motion: reduce) {
            section img[alt^="Application One World"] { animation: none !important; }
            .hero-parallax .home-hero-content { transform: none !important; }
          }
        `}</style>

        <div className="absolute left-0 right-0 top-28 z-30 px-6 text-center md:hidden transition-all duration-700 animate-fade-in">
          <h1 style={{ lineHeight: 1.2 }} className="font-josefin text-[26px] sm:text-4xl font-bold tracking-tight text-white max-w-3xl mx-auto [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
            {L.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto font-roboto text-base font-normal text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            {L.heroLine1}<br /> {L.heroLine2}<br /> <Link to={withLangPrefix("/corporate", language)} className="underline hover:text-white/80 transition-colors">{L.heroLearnMore}</Link>
          </p>
        </div>

        <div className="home-hero-content relative z-20 mx-auto flex min-h-[100dvh] md:min-h-[92svh] max-w-7xl flex-col items-center pb-28 text-center px-6 md:justify-center md:items-start lg:items-center md:text-left lg:text-center md:pt-24 md:pb-6 md:py-24 md:px-12 w-full">
          {/* Title + Text Container (restricted to leave space for Mockup on Tablet, but wider than before) */}
          <div className="home-hero-copy hidden w-full md:block md:max-lg:max-w-[75%] md:max-lg:mb-6">
            {/* Mobile Title - placed under the header in normal flow to avoid overlap */}
            <h1 style={{ lineHeight: 1.2, animationDelay: '.45s', animationFillMode: 'forwards' }} className="hidden md:block font-josefin md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] mb-2 hero-rise">
              {L.heroTitle}
            </h1>

            <p style={{ animationDelay: '.66s', animationFillMode: 'forwards' }} className="mt-6 md:mt-2 max-w-2xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center font-roboto text-base font-normal text-white md:text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] hero-rise">
              {L.heroLine1}<br className="md:hidden" /> {L.heroLine2}<br className="md:hidden" /><br className="hidden md:inline lg:hidden" /> <Link to={withLangPrefix("/corporate", language)} className="underline hover:text-white/80 transition-colors">{L.heroLearnMore}</Link>
            </p>
          </div>

          {/* Search container - placed below Title + Text + Mockup on tablet */}
          <div className="max-md:mt-auto max-md:pt-10 max-md:-translate-y-16 mt-10 w-full max-w-2xl md:max-lg:mt-6 md:max-lg:mx-0 mx-auto">
            <div style={{ animationDelay: '.98s', animationFillMode: 'forwards' }} className="w-full md:max-lg:p-6 md:max-lg:bg-white/[0.08] md:max-lg:backdrop-blur-2xl md:max-lg:border md:max-lg:border-white/20 md:max-lg:rounded-3xl md:max-lg:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_20px_60px_-15px_rgba(0,0,0,0.5)] hero-rise">
              <HeroInlineSearch
                placeholder={L.searchPlaceholder}
                onSearch={(params) => {
                  const qs = new URLSearchParams(params).toString();
                  navigate(localizeUrl(`/search?${qs}`));
                }}
                onBusinessSelect={(businessId) => navigate(localizeUrl(`/search?openBusiness=${businessId}`))}
                onMobileSearchClick={() => heroVoice.toggleRecording()}
                onVoiceActiveChange={setInlineVoiceActive}
              />
              {!isVoiceActive && (
                <div className="hidden md:flex mt-5 md:max-lg:justify-start lg:justify-center">
                  <button
                    type="button"
                    onClick={() => setVideoOpen(true)}
                    className="relative inline-flex items-center gap-2.5 text-[#F1F1F1] hover:bg-white/15 transition bg-white/[0.07] backdrop-blur-xl border border-white/20 rounded-full pl-2 pr-4 py-1.5 duration-300 home-hero-video-cta active:scale-95 btn-flash"
                    style={{
                      boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 8px 32px 0 rgba(0, 0, 0, 0.3)"
                    }}
                    aria-label="Play video"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    <span className="font-roboto text-sm font-semibold text-[#F1F1F1] tracking-wide whitespace-nowrap">{L.watchVideo}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {videoOpen && createPortal(
            <div
              className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
              onClick={() => setVideoOpen(false)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setVideoOpen(false); }}
                className="absolute top-4 left-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
              <video
                src={heroVideoAsset.url}
                className="max-w-full max-h-full"
                autoPlay
                controls
                playsInline
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )}

        </div>

        {/* Mobile-only video CTA placed absolutely below the search CTAs */}
        <div
          className="md:hidden absolute left-1/2 -translate-x-1/2 z-30 flex justify-center"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="relative inline-flex items-center gap-2.5 text-[#F1F1F1] hover:bg-white/15 transition bg-white/[0.07] backdrop-blur-xl border border-white/20 rounded-full pl-2 pr-4 py-1.5 duration-300 home-hero-video-cta active:scale-95 btn-flash"
            style={{
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 8px 32px 0 rgba(0, 0, 0, 0.3)"
            }}
            aria-label="Play video"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="font-roboto text-sm font-semibold text-[#F1F1F1] tracking-wide whitespace-nowrap">{L.watchVideo}</span>
          </button>
        </div>

        {!isVoiceActive && (
          <button
            type="button"
            onClick={scrollToNext}
            aria-label={L.discover}
            className="absolute bottom-6 md:bottom-8 left-1/2 z-30 -translate-x-1/2 text-white/70 transition hover:text-white"
          >
            <span className="block font-josefin text-xs uppercase tracking-[0.3em]">{L.discover}</span>
            <ArrowDown className="mx-auto mt-2 h-5 w-5 animate-bounce" />
          </button>
        )}
      </section>
    </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-background pt-24 md:pt-40 pb-4 md:pb-6">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <h2 id="how-it-works-title" className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl scroll-mt-24 md:scroll-mt-40">
            {L.howItWorks}
          </h2>

          <div className="mt-10 space-y-12">
            {STEPS.slice(0, 1).map((s, i) => (
              <div
                key={s.title}
                className="space-y-8"
              >
                {i === 0 ? (
                  <div>
                    <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 font-roboto text-base text-foreground/70">{s.desc}</p>
                  </div>
                ) : null}
                {i === 0 ? (
                  <div className="min-w-0">
                    <div
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-full p-1 border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]"
                      style={{ backgroundColor: "#F1F1F1" }}
                    >
                      {CITIES.map((city) => {
                        const active = selectedCity === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setSelectedCity(city)}
                            className={`relative rounded-full px-5 py-2 font-josefin text-sm uppercase tracking-[0.2em] transition-all ${
                              active
                                ? "bg-primary text-primary-foreground border border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
                                : "text-black/70 hover:text-black hover:bg-black/5"
                            }`}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>


                    <div className="relative mt-6">
                      {loadingVideos ? (
                        <HScroll className="flex gap-3 overflow-x-auto scrollbar-hide">
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="aspect-[9/16] w-[200px] shrink-0 animate-pulse rounded-lg bg-muted/40 md:w-[240px]" />
                          ))}
                        </HScroll>
                      ) : videos.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                          Aucune vidéo pour {selectedCity}.
                        </div>
                      ) : (
                        <HScroll className="flex gap-3 overflow-x-auto snap-x snap-proximity scrollbar-hide">
                          {videos.map((v) => {
                            const thumb = optimizeSupabaseImage(v.thumbnail, { width: 400 }) || v.thumbnail;
                            if (!v.label) return null;
                            const buildSearchUrl = async () => {
                              const subcategoryNames = v.kind === "entry"
                                ? (v.subcategoryNames.length > 0 ? v.subcategoryNames : await fetchFrontStructureSubcategoryNames(v.label || ""))
                                : [];
                              return subcategoryNames.length > 0
                                ? localizeUrl(`/search?subcats=${encodeURIComponent(subcategoryNames.join("|"))}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label)}&_t=${Date.now()}`)
                                : localizeUrl(`/search?q=${encodeURIComponent(`${v.label} ${selectedCity}`)}&_t=${Date.now()}`);
                            };
                            const goSearch = async (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const defaultUrl = await buildSearchUrl();
                              let businessId = v.businessId;
                              if (!businessId && !v.badgeId && !v.eventId && v.kind === "extra" && v.key.startsWith("extra:")) {
                                const cardId = v.key.slice("extra:".length);
                                const { data: card } = await (supabase as any)
                                  .from("front_structure_homepage_extra_cards")
                                  .select("business_id")
                                  .eq("id", cardId)
                                  .maybeSingle();
                                businessId = (card as any)?.business_id || null;
                              }
                              if (!v.badgeId && !v.eventId && businessId) {
                                navigate(localizeUrl(`/search?pinIds=${encodeURIComponent(businessId)}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label || "")}&openBusiness=${encodeURIComponent(businessId)}&_t=${Date.now()}`));
                                return;
                              }
                              if (v.badgeId) {
                                const { data: badge } = await (supabase as any)
                                  .from("badges")
                                  .select("name_fr")
                                  .eq("id", v.badgeId)
                                  .maybeSingle();
                                const badgeName: string = (badge as any)?.name_fr || v.label || "";
                                if (badgeName.trim().startsWith("#")) {
                                  navigate(localizeUrl(`/search?city=${encodeURIComponent(selectedCity)}&badgeId=${encodeURIComponent(v.badgeId)}&badgeLabel=${encodeURIComponent(badgeName)}&_t=${Date.now()}`));
                                  return;
                                }
                                const [{ data: links }, { data: docLinks }] = await Promise.all([
                                  supabase.from("business_badges").select("business_id").eq("badge_id", v.badgeId),
                                  supabase
                                    .from("business_document_badges")
                                    .select("business_documents!inner(business_id, linked_business_id)")
                                    .eq("badge_id", v.badgeId),
                                ]);
                                const ids = Array.from(new Set([
                                  ...((links as any[]) || []).map((l) => l.business_id),
                                  ...((docLinks as any[]) || []).map((l) => l.business_documents?.linked_business_id || l.business_documents?.business_id),
                                ].filter(Boolean)));
                                if (ids.length === 0) { navigate(localizeUrl(defaultUrl)); return; }
                                const { data: bizRows } = await supabase
                                  .from("businesses")
                                  .select("id, city, priority_score, wtuce_status")
                                  .in("id", ids)
                                  .eq("is_active", true)
                                  .ilike("city", selectedCity);
                                const ordered = ((bizRows as any[]) || [])
                                  .sort((a, b) => {
                                    const av = a.wtuce_status === "verified" ? 0 : 1;
                                    const bv = b.wtuce_status === "verified" ? 0 : 1;
                                    if (av !== bv) return av - bv;
                                    return (b.priority_score || 0) - (a.priority_score || 0);
                                  })
                                  .map((b) => b.id);
                                if (ordered.length === 0) { navigate(localizeUrl(defaultUrl)); return; }
                                navigate(localizeUrl(`/search?pinIds=${ordered.join(",")}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label)}&_t=${Date.now()}`));
                                return;
                              }
                              navigate(localizeUrl(defaultUrl));
                            };
                            return (
                              <div key={v.key} className="group relative aspect-[9/16] w-[200px] shrink-0 snap-start overflow-hidden rounded-lg bg-muted md:w-[240px]">
                                <button
                                  type="button"
                                  onClick={goSearch}
                                  className="absolute inset-0 h-full w-full text-left"
                                  aria-label={`Voir les résultats pour ${v.label} ${selectedCity}`}
                                >
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt={v.businessName || v.label || ""}
                                      loading="lazy"
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-white/5">
                                      <Play className="h-8 w-8 text-white/40" />
                                    </div>
                                  )}
                                  <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent" />
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
                                </button>
                                {v.label && (
                                  <div className="absolute inset-x-0 top-[10%] z-[8] flex items-center justify-center px-2">
                                    <button
                                      type="button"
                                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                      onClick={goSearch}
                                      className="rounded-md border-2 border-black bg-white px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-black shadow-lg line-clamp-2 hover:bg-white/90 transition-colors cursor-pointer"
                                    >
                                      {translateVignetteLabel(v.label, language)}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </HScroll>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — VERTICAL 2-COLUMN GRID (steps 2-8) */}
       <section className="relative bg-background mt-8 md:mt-16 px-4 md:px-8 py-8 md:py-16">
         <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 lg:auto-rows-fr gap-4 md:gap-6 lg:gap-8">
             {STEPS.slice(1).map((s, idx) => {
              const i = idx + 1;
              return (
                 <div
                   key={s.title}
                   className="relative overflow-hidden w-full h-full rounded-2xl md:rounded-3xl p-4 md:p-10 border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)] flex flex-col justify-between"
                   style={{ backgroundColor: "#F1F1F1" }}
                 >
                    {i === 7 && (
                      <>
                        {/* Mobile : parallax JS (bg-fixed ignoré par iOS Safari) */}
                        <div aria-hidden="true" className="absolute inset-0 overflow-hidden md:hidden">
                          <ParallaxImg
                            src={poiMapAsset.url}
                            className="absolute left-0 w-full object-cover"
                            style={{ top: "-10%", height: "120%", objectPosition: "15% center" }}
                          />
                        </div>
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 hidden md:block bg-fixed bg-no-repeat"
                          style={{ 
                            backgroundImage: `url(${poiMapAsset.url})`,
                            backgroundSize: "auto 150%",
                            backgroundPosition: "15% center"
                          }}
                        />
                        <div className="absolute inset-0 bg-white/80" />
                      </>
                     )}
                    {i === 3 && (
                      <>
                        {/* Mobile : parallax JS (bg-fixed ignoré par iOS Safari) */}
                        <div aria-hidden="true" className="absolute inset-0 overflow-hidden md:hidden">
                          <ParallaxImg
                            src={destinationsMapAsset.url}
                            className="absolute left-0 w-full object-cover"
                            style={{ top: "-10%", height: "120%" }}
                          />
                        </div>
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 hidden md:block bg-cover bg-center bg-fixed"
                          style={{ backgroundImage: `url(${destinationsMapAsset.url})` }}
                        />
                        <div className="absolute inset-0 bg-white/80" />
                      </>
                    )}
                  {(i === 1 || i === 2 || i === 3 || i === 4 || i === 5 || i === 7) && (
                    <div className="w-full mb-6 relative z-10">
                      <h3 className="font-josefin text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight text-black">
                        {s.title}
                      </h3>
                    </div>
                  )}

                  {(i === 1 || i === 2 || i === 3 || i === 4 || i === 5 || i === 7) ? (
                    <div className="relative z-10 flex flex-col gap-4 md:gap-6 flex-1 justify-between">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                        <div className="flex-1 lg:max-w-[60%]">
                          <div className="font-roboto text-base text-black/90 font-normal">
                            {renderDescWithCheckmarks(s.desc)}
                          </div>
                        </div>
                        <div className="flex lg:block items-center justify-center lg:flex-shrink-0 pointer-events-none">
                          <div className="relative h-[250px] md:h-[260px] lg:h-[340px] aspect-[9/16] border-[6px] border-neutral-900 bg-neutral-950 rounded-[1.3rem] shadow-[0_15px_35px_rgba(0,0,0,0.4)] overflow-hidden">
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-neutral-900 rounded-full z-20 pointer-events-none" />
                            {i === 1 && (
                              <img src={step3MockupAsset.url} alt="Votre identité numérique - One World Morocco" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 2 && (
                              <img src="/__l5e/assets-v1/1f99cc17-403a-46b2-9e99-1e6744e5c67f/etape2-ia.webp" alt="Assistant IA One World Morocco" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 3 && (
                              <InViewVideo controls src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/generic-1779806600486-gfn1oq.mp4" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 4 && (
                              <img src="/__l5e/assets-v1/61f1aae7-ac0f-446f-a27b-61c9cfb7a03e/business-card1.webp" alt="Offre One World Morocco" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 5 && (
                              <InViewVideo controls src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/89aa9374-4150-470a-aade-0189d84afb20-1775630369725-hyc1g8.mp4" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 7 && (
                              <InViewVideo controls src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/08f848fc-83ee-48c5-9636-fb80e68f0218-1781251423466-3s20ok.mp4" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center mt-auto pt-4">
                        <Link
                          to={s.href}
                          className="inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs tracking-[0.2em] text-white border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] btn-shimmer transition-transform hover:scale-105 duration-200 md:px-6 md:py-3 md:text-sm"
                          style={{ backgroundColor: "#C04F17" }}
                        >
                          {s.cta} →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {i === 6 && (
                        <InViewVideo
                          src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/6eab7b31-bda9-43d5-8c8b-4f972e5bb8bd-1774600396740-3cbxw.mp4"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      {i === 8 && (
                        <>
                           {/* Background image — uses <img> for iOS Safari compatibility (bg-fixed is ignored on iOS) */}
                           <img
                             aria-hidden="true"
                             src={heroImageMobile}
                             alt=""
                             className="absolute inset-0 h-full w-full object-cover"
                           />
                           <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
                           <style>{`
                             @keyframes step9Float {
                               0%, 100% { transform: translateY(0) rotate(0deg); }
                               50% { transform: translateY(-14px) rotate(-1.2deg); }
                             }
                             .step9-float { animation: step9Float 6s ease-in-out infinite; will-change: transform; }
                             @media (prefers-reduced-motion: reduce) {
                               .step9-float { animation: none; }
                             }
                           `}</style>
                        </>
                      )}
                      <div className={`relative z-10 w-full h-full flex flex-col ${i === 8 ? "min-h-[300px] md:min-h-[400px] justify-between" : ""}`}>
                        {i === 8 ? (
                          <div className="flex flex-col items-start w-full h-full flex-1">
                            {/* Title — full width, on top */}
                            <h3 className="font-josefin text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] text-left w-full">
                              {s.title}
                            </h3>

                            {/* Mobile/Tablet/Desktop Content Layout with absolute full-size mockup */}
                             <div className="relative w-full mt-6 md:mt-8 flex-1 min-h-[180px]">
                              {/* Left/Middle side: text description taking 82% width, sits on top */}
                              <div className="relative z-10 w-[82%] md:w-[85%] pr-2 pt-8 md:pt-12 flex flex-col gap-4">
                                <p className="text-white/90 font-normal [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] font-roboto text-base text-left whitespace-pre-line">
                                  {s.desc.replace("\n\n\nVotre\u00a0", "")}
                                </p>
                                {i === 8 && (
                                  <div className="text-white/90 font-normal [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] font-roboto text-base text-left">
                                    {"\n"}
                                  </div>
                                )}
                                <div className="flex justify-start">
                                  <Link 
                                    to={withLangPrefix("/install", language)}
                                    className="relative group overflow-hidden rounded-[0.95rem] w-14 h-14 md:w-16 md:h-16 block border border-white/35 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 bg-white/5 backdrop-blur-[2px] btn-shimmer"
                                  >
                                    {/* Glass sheen effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 z-10 pointer-events-none" />
                                    {/* Curved highlight for realistic glass bubble effect */}
                                    <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-[0.95rem] pointer-events-none z-10" />
                                    {/* App Icon Image */}
                                    <img 
                                      src={appIconHamsaAsset.url} 
                                      alt="Download App" 
                                      className="w-full h-full object-cover relative z-0"
                                    />
                                  </Link>
                                </div>
                              </div>
                              {/* Full-size Mockup image absolutely positioned to the right + floating animation */}
                              <img
                                src={iphoneTabletMockupAsset.url}
                                alt=""
                                aria-hidden="true"
                                className="step9-float pointer-events-none select-none absolute top-[15%] sm:top-auto sm:bottom-[-16px] md:bottom-[25px] lg:bottom-[-16px] right-[-10%] sm:right-[-5%] h-[75%] sm:h-[55%] md:h-[105%] lg:h-[65%] w-auto object-contain object-bottom z-0 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className={`font-josefin text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight ${i === 3 ? "text-black" : "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"}`}>
                              {s.title}
                            </h3>
                            <div className={`${i === 3 ? "text-black/90 font-roboto text-base" : "text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] font-roboto text-base"} ${i === 3 ? "mt-6 md:mt-8 font-normal max-w-full sm:max-w-[60%]" : "mt-3 md:mt-4 font-bold max-w-lg"}`}>
                              {renderDescWithCheckmarks(s.desc, i !== 3)}
                            </div>
                            {i === 3 && (
                              <div className="mt-6 flex justify-center sm:hidden">
                                <div className="relative h-[280px] aspect-[9/16] border-[6px] border-neutral-900 bg-neutral-950 rounded-[1.3rem] shadow-[0_15px_35px_rgba(0,0,0,0.55)] overflow-hidden">
                                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-neutral-900 rounded-full z-20 pointer-events-none" />
                                  <InViewVideo controls src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/generic-1779806600486-gfn1oq.mp4" className="h-full w-full object-cover rounded-[0.9rem]" />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {i === 6 ? (
                          <HotelAvailabilityWidget />
                        ) : (i === 3 || i === 8) ? (
                          <div className="flex justify-center w-full mt-auto pt-4 relative z-10">
                            <Link
                              to={s.href}
                              className="inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs tracking-[0.2em] text-white border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] btn-shimmer transition-transform hover:scale-105 duration-200 md:px-6 md:py-3 md:text-sm"
                              style={{ backgroundColor: "#C04F17" }}
                            >
                              {s.cta} →
                            </Link>
                          </div>
                        ) : (
                          <Link to={s.href} className="mt-4 inline-flex font-josefin text-xs tracking-[0.2em] text-primary hover:underline md:mt-6 md:text-sm">
                            {s.cta} →
                          </Link>
                        )}
                      </div>
                    </>
                  )}

                </div>
              );
            })}
        </div>
      </section>







      {/* INSPIRATION — HORIZONTAL PINNED (like steps 2-6) */}
      <section
        ref={inspirationRef}
        className="relative bg-background mt-36 md:mt-36"
        style={{ height: "300vh" }}
      >
        <div className="sticky top-0 flex h-svh md:h-screen flex-col overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-6 md:px-12 pt-16 md:pt-20 shrink-0">
            <h2 className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl">
              {L.inspireYourself}
            </h2>
            <p className="mt-3 max-w-xl font-roboto text-foreground/70">
              {L.inspireSubtitle}
            </p>
          </div>
          <div className="flex-1 min-h-0 flex items-center overflow-hidden">
            <div
              ref={inspirationTrackRef}
              className="flex gap-4 md:gap-8 will-change-transform pl-[calc((100vw-min(44vh,416px))/2)] pr-[calc((100vw-min(44vh,416px))/2)]"
              style={{ transform: "translate3d(0, 0, 0)" }}
            >
              {latestPosts.map((a) => (
                <Link
                  key={a.slug}
                  to={withLangPrefix(a.slug, language)}
                  className="group relative aspect-[4/5] h-[55vh] max-h-[520px] shrink-0 overflow-hidden rounded-2xl bg-muted"
                >
                  {a.image ? (
                    <img
                      src={a.image}
                      alt={a.title}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-muted to-foreground/20 transition group-hover:scale-105" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6">
                    <span className="font-josefin text-xl leading-tight text-white font-bold">{a.title}</span>
                  </div>
                </Link>
              ))}
              <Link
                to={withLangPrefix("/blog", language)}
                className="group relative aspect-[4/5] h-[55vh] max-h-[520px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-gold/60 flex flex-col items-center justify-center text-center p-6 transition hover:scale-105"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-4 transition group-hover:bg-white/30">
                  <ArrowRight className="h-7 w-7 text-white" />
                </div>
                <span className="font-josefin text-2xl leading-tight text-white font-bold">{L.seeAllArticles}</span>
                <span className="mt-2 font-roboto text-sm text-white/80">{L.seeAllArticlesSubtitle}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>





      <Footer variant="verified" />
      <HomeBottomBar />

      <VoiceSearchOverlay
        isOpen={heroVoice.status === "recording" || heroVoice.status === "processing"}
        liveTranscript={heroVoice.liveTranscript}
        audioLevel={heroVoice.audioLevel}
        micReady={heroVoice.micReady}
        onClose={heroVoice.toggleRecording}
        onFinish={heroVoice.finishRecording}
      />
    </div>
  );
};

const HotelAvailabilityWidget = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const L = HOME_LABELS[language] ?? HOME_LABELS.fr;
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 30);
  const departure = new Date();
  departure.setDate(departure.getDate() + 35);

  const [city, setCity] = useState<string>("Marrakech");
  const [checkIn, setCheckIn] = useState<string>(fmt(arrival));
  const [checkOut, setCheckOut] = useState<string>(fmt(departure));
  const [adults, setAdults] = useState<string>("2");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const spoken = `Hôtels à ${city} du ${checkIn} au ${checkOut} pour ${adults} adulte(s)`;
    const params = new URLSearchParams({
      hotelCity: city,
      hotelCheckIn: checkIn,
      hotelCheckOut: checkOut,
      hotelAdults: adults,
      q: spoken,
      spoken,
      category: "Hôtellerie",
    });
    navigate(`/search?${params.toString()}`);
  };
 
  const fieldCls = "rounded-md border border-border/40 bg-white px-3 py-1.5 font-roboto text-sm text-black !text-black md:py-2 [color-scheme:light] [-webkit-text-fill-color:#000] appearance-none";
  const labelCls = "flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white md:text-xs";
  const fieldStyle = { color: "#000000", WebkitTextFillColor: "#000000", opacity: 1, colorScheme: "light" } as React.CSSProperties;

  return (
    <form
      onSubmit={submit}
      className="mt-4 grid w-full max-w-2xl gap-2 rounded-2xl border border-border/40 bg-background/40 p-3 backdrop-blur sm:grid-cols-2 md:mt-6 md:gap-3 md:p-4"
    >
      <style>{`
        .hotel-field,
        select.hotel-field,
        input.hotel-field,
        .hotel-field option,
        select.hotel-field option,
        .hotel-field::-webkit-datetime-edit,
        .hotel-field::-webkit-datetime-edit-fields-wrapper,
        .hotel-field::-webkit-datetime-edit-text,
        .hotel-field::-webkit-datetime-edit-month-field,
        .hotel-field::-webkit-datetime-edit-day-field,
        .hotel-field::-webkit-datetime-edit-year-field {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          opacity: 1 !important;
        }
      `}</style>
      <label className={`${labelCls} sm:col-span-2`}>
        {L.hotelDestination}
        <select value={city} onChange={(e) => setCity(e.target.value)} className={`${fieldCls} hotel-field`} style={fieldStyle}>
          <option value="Marrakech">Marrakech</option>
          <option value="Essaouira">Essaouira</option>
        </select>
      </label>
      <label className={labelCls}>
        {L.hotelArrival}
        <input
          type="date"
          value={checkIn}
          min={fmt(new Date())}
          onChange={(e) => {
            setCheckIn(e.target.value);
            if (checkOut <= e.target.value) {
              const d = new Date(e.target.value);
              d.setDate(d.getDate() + 1);
              setCheckOut(fmt(d));
            }
          }}
          className={`${fieldCls} hotel-field`}
          style={fieldStyle}
        />
      </label>
      <label className={labelCls}>
        {L.hotelDeparture}
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          className={`${fieldCls} hotel-field`}
          style={fieldStyle}
        />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        {L.hotelAdults}
        <select value={adults} onChange={(e) => setAdults(e.target.value)} className={`${fieldCls} hotel-field`} style={fieldStyle}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-full border border-white/30 px-5 py-2.5 font-josefin text-xs tracking-[0.2em] text-white shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] btn-shimmer transition-transform hover:scale-105 duration-200 sm:col-span-2 md:px-6 md:py-3 md:text-sm"
        style={{ backgroundColor: "#C04F17" }}
      >
        {L.hotelSeeAvailability}
      </button>
    </form>
  );
};


type StepLang = "fr" | "en" | "ar";
const STEP_ICONS = [PlayCircle, User, Sparkles, Compass, Percent, Sparkles, CalendarCheck, PlayCircle, PlayCircle];
const STEP_HREFS = [
  "/videos",
  "/club",
  "/search?q=je%20cherche%20un%20restaurant%20%C3%A0%20Marrakech%20ouvert%20demain%20midi%20avec%20une%20piscine&tab=ai&demo=sur%20la%20route%20de%20l'Ourika",
  "/club",
  "/club",
  "/search",
  "/hotels",
  "/y/tarik-belasri",
  "/install",
];

const STEPS_I18N: Record<StepLang, { title: string; desc: string; cta: string }[]> = {
  fr: [
    { title: "Inspirez-vous en vidéo. Découvrez des adresses vérifiées.", desc: "Plongez dans des vidéos courtes qui révèlent l'âme des lieux : riads, tables d'exception, artisans, expériences. Chaque établissement est sélectionné, visité et validé par notre équipe pour vous garantir une expérience à la hauteur.", cta: "Voir les vidéos" },
    { title: "Votre identité numérique", desc: "Créez un profil qui vous ressemble — profil, carte, lieux favoris et avantages locaux en un seul lien.\n\nAjoutez votre style, vos liens et connectez-vous avec des utilisateurs qui partagent votre intérêt pour le Maroc.\n\n• Profil et couverture personnalisés\n• Ajoutez vos réseaux sociaux\n• Votre QR code\n• Connectez-vous et chattez facilement", cta: "Créer mon profil" },
    { title: "Votre assistant IA", desc: "Dialoguez avec notre Agent IA :\n\u00a0\n• Affinez vos recherches avec vos propres critères en dialoguant avec notre agent IA\u00a0\n• En mode texte ou vocal\u00a0\n• Sauvegardez les résultats\n• Partagez les avec vos proches", cta: "Voir la démo" },
    { title: "Composez votre voyage", desc: "- Construisez votre itinéraire\n- Suivez les établissements qui vous intéressent\n- Gardez les points d'intérêts dans votre compte\n- Soyez informé des bons plans, agenda, annonces...", cta: "Inscrivez-vous" },
    { title: "Offres sélectionnées. Prix locaux.", desc: "Votre application direct-to-local dédiée au tourisme et à la vie quotidienne au Maroc.\n\nRéductions exclusives sur :\n- Séjours\n- Visites\n- Restaurants\n- Commerces\n- Activités\n- Services\n\n", cta: "Profiter des offres" },
    { title: "Pépites cachées, expériences inoubliables", desc: "Découvrez des adresses d'exception.\n\n• épinglez-les\n• partagez-les\n• visitez-les\n• notez-les", cta: "Explorer" },
    { title: "Réservez l'esprit léger, participez à l'économie direct-to-local", desc: "Réservez directement vos hôtels, restaurants et activités auprès de partenaires de confiance.", cta: "Voir les hôtels" },
    { title: "Naviguez en mode immersif", desc: "Associez :\n\n• la précision de la recherche Google\n• la preuve sociale/avis clients des grandes plateformes\n• les fonctionnalités de TripAdvisor/Booking\n• la géolocalisation de Google Maps\u00a0\n• la navigation immersive de TikTok / Instagram / Youtube\n• la personnalisation de l'IA\n", cta: "Découvrir" },
    { title: "Installez l'application", desc: "Installez ONE WORLD MOROCCO sur votre appareil pour un accès en un clic, sans barre d'adresse, avec l'icône directement sur votre écran d'accueil ou votre bureau.\n\nCompatible iPhone, iPad, Android, Mac et Windows.\n\n\nVotre\u00a0", cta: "Installer l'app" },
  ],
  en: [
    { title: "Get inspired by video. Discover verified addresses.", desc: "Dive into short videos that reveal the soul of each place: riads, exceptional tables, artisans, experiences. Every business is selected, visited and validated by our team to guarantee an experience worth your time.", cta: "Watch the videos" },
    { title: "Your digital identity", desc: "Create a profile that looks like you — profile, card, favourite places and local perks in a single link.\n\nAdd your style, your links and connect with users who share your interest for Morocco.\n\n• Custom profile and cover\n• Add your social networks\n• Your QR code\n• Connect and chat easily", cta: "Create my profile" },
    { title: "Your AI assistant", desc: "Chat with our AI agent:\n\u00a0\n• Refine your searches with your own criteria by talking to our AI agent\u00a0\n• Text or voice mode\u00a0\n• Save the results\n• Share them with your loved ones", cta: "Watch the demo" },
    { title: "Compose your trip", desc: "- Build your itinerary\n- Follow the businesses that interest you\n- Keep your points of interest in your account\n- Stay informed about deals, calendar, announcements...", cta: "Sign up" },
    { title: "Curated offers. Local prices.", desc: "Your direct-to-local app dedicated to tourism and everyday life in Morocco.\n\nExclusive discounts on:\n- Stays\n- Tours\n- Restaurants\n- Shops\n- Activities\n- Services\n\n", cta: "Enjoy the offers" },
    { title: "Hidden gems, unforgettable experiences", desc: "Discover exceptional addresses.\n\n• pin them\n• share them\n• visit them\n• rate them", cta: "Explore" },
    { title: "Book with peace of mind, support the direct-to-local economy", desc: "Book your hotels, restaurants and activities directly with trusted partners.", cta: "See hotels" },
    { title: "Browse in immersive mode", desc: "Combine:\n\n• the precision of Google search\n• the social proof / reviews of major platforms\n• the features of TripAdvisor/Booking\n• Google Maps geolocation\u00a0\n• the immersive navigation of TikTok / Instagram / YouTube\n• AI personalisation\n", cta: "Discover" },
    { title: "Install the app", desc: "Install ONE WORLD MOROCCO on your device for one-click access, no address bar, with the icon directly on your home screen or desktop.\n\nCompatible with iPhone, iPad, Android, Mac and Windows.\n\n\nYour\u00a0", cta: "Install the app" },
  ],
  ar: [
    { title: "استلهم من الفيديو. اكتشف عناوين موثقة.", desc: "انغمس في مقاطع فيديو قصيرة تكشف روح الأماكن: رياضات، موائد استثنائية، حرفيون، تجارب. كل مؤسسة مختارة وتمت زيارتها والتحقق منها من قبل فريقنا لضمان تجربة في مستوى توقعاتك.", cta: "شاهد الفيديوهات" },
    { title: "هويتك الرقمية", desc: "أنشئ ملفًا شخصيًا يشبهك — ملف، بطاقة، أماكن مفضلة ومزايا محلية في رابط واحد.\n\nأضف أسلوبك وروابطك وتواصل مع مستخدمين يشاركونك اهتمامك بالمغرب.\n\n• ملف وغلاف مخصصان\n• أضف شبكاتك الاجتماعية\n• رمز QR الخاص بك\n• تواصل ودردش بسهولة", cta: "إنشاء ملفي" },
    { title: "مساعدك الذكي", desc: "حاور وكيلنا الذكي:\n\u00a0\n• حسّن عمليات البحث بمعاييرك الخاصة عبر محاورة وكيل الذكاء الاصطناعي\u00a0\n• وضع نصي أو صوتي\u00a0\n• احفظ النتائج\n• شاركها مع أحبائك", cta: "شاهد العرض التوضيحي" },
    { title: "صمم رحلتك", desc: "- ابنِ خط سيرك\n- تابع المؤسسات التي تهمك\n- احتفظ بنقاط الاهتمام في حسابك\n- ابق على اطلاع بالعروض والمواعيد والإعلانات...", cta: "سجّل" },
    { title: "عروض مختارة. أسعار محلية.", desc: "تطبيقك المباشر للمحلي مخصص للسياحة والحياة اليومية في المغرب.\n\nخصومات حصرية على:\n- الإقامات\n- الجولات\n- المطاعم\n- المتاجر\n- الأنشطة\n- الخدمات\n\n", cta: "استفد من العروض" },
    { title: "جواهر خفية وتجارب لا تُنسى", desc: "اكتشف عناوين استثنائية.\n\n• ثبّتها\n• شاركها\n• زرها\n• قيّمها", cta: "استكشف" },
    { title: "احجز بأريحية وادعم الاقتصاد المحلي المباشر", desc: "احجز فنادقك ومطاعمك وأنشطتك مباشرة لدى شركاء موثوقين.", cta: "شاهد الفنادق" },
    { title: "تصفح في الوضع الانغماسي", desc: "اجمع:\n\n• دقة بحث جوجل\n• الدليل الاجتماعي / آراء العملاء للمنصات الكبرى\n• ميزات TripAdvisor/Booking\n• تحديد الموقع عبر خرائط جوجل\u00a0\n• التصفح الانغماسي لـ TikTok / Instagram / YouTube\n• التخصيص بالذكاء الاصطناعي\n", cta: "اكتشف" },
    { title: "ثبّت التطبيق", desc: "ثبّت ONE WORLD MOROCCO على جهازك للوصول بنقرة واحدة، دون شريط عنوان، مع الأيقونة مباشرة على شاشتك الرئيسية أو سطح المكتب.\n\nمتوافق مع iPhone وiPad وAndroid وMac وWindows.\n\n\nخاصتك\u00a0", cta: "ثبّت التطبيق" },
  ],
};

const getSteps = (lang: StepLang) =>
  STEPS_I18N[lang].map((s, i) => ({ ...s, href: STEP_HREFS[i], icon: STEP_ICONS[i] }));



const TOOLKIT = [
  { label: "Hôtels", href: "/hotels", icon: Sparkles },
  { label: "Restaurants", href: "/search?category=restaurant", icon: MapPin },
  { label: "Activités", href: "/search?category=activite", icon: Compass },
  { label: "Expériences", href: "/search?category=experience", icon: Sparkles },
  { label: "Carte", href: "/carte", icon: MapPin },
  { label: "Vidéos", href: "/videos", icon: PlayCircle },
];

const DESTINATIONS = [
  { name: "Marrakech", href: "/city/Marrakech" },
  { name: "Essaouira", href: "/city/Essaouira" },
  { name: "Fès", href: "/city/Fes" },
  { name: "Chefchaouen", href: "/city/Chefchaouen" },
  { name: "Casablanca", href: "/city/Casablanca" },
  { name: "Tanger", href: "/city/Tanger" },
  { name: "Agadir", href: "/city/Agadir" },
  { name: "Ouarzazate", href: "/city/Ouarzazate" },
];

export default HomeV1;
