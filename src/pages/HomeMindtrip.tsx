import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck, Play, Percent } from "lucide-react";

import Footer from "@/components/Footer";
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
import heroHomeAsset from "@/assets/hero-home.webp.asset.json";
const heroImage = heroHomeAsset.url;
const heroImageMobile = heroHomeAsset.url;
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import logoHamsa from "@/assets/logo-hamsa-gold.png";
import etape5Bg from "@/assets/etape5-immersif.webp.asset.json";
import heroVideoAsset from "@/assets/hero-video.mp4.asset.json";
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
import essaouiraSunsetAsset from "@/assets/essaouira-sunset-roof.jpg.asset.json";
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

const HomeMindtrip = () => {
  
  const navigate = useNavigate();



  const [selectedCity, setSelectedCity] = useState<CityKey>("Marrakech");
  const [videos, setVideos] = useState<VideoSlot[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [latestPosts, setLatestPosts] = useState<Array<{ slug: string; title: string; image?: string }>>([]);
  const [videoOpen, setVideoOpen] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Articles statiques — mêmes dates que /blog (cf. src/pages/Blog.tsx)
      const staticArticles: Array<{ slug: string; path: string; title: string; bizId?: string; date: string }> = [
        { slug: "etablissements-notes", path: "/blog/etablissements-notes", title: "Établissements notés", date: "2000-01-01T00:00:00Z" },
        { slug: "agafay-dream", path: "/blog/agafay-dream", title: "Agafay Dream", bizId: "e05a7ece-e417-4d65-b8a4-17a3ea4f96b3", date: "2026-06-13T12:00:00Z" },
        { slug: "hebergements-sidi-kaouki", path: "/blog/hebergements-sidi-kaouki", title: "Les meilleurs hébergements à Sidi Kaouki", bizId: "04e08ef3-cd54-4091-876a-6822518c84a7", date: "2026-06-13T11:00:00Z" },
        { slug: "hotels-riads-vue-mer-essaouira", path: "/blog/hotels-riads-vue-mer-essaouira", title: "Hôtels & Riads avec vue sur mer à Essaouira", bizId: "4b4e42f7-d408-4c6d-989f-3922e2ed61d3", date: "2026-06-13T10:00:00Z" },
        { slug: "beach-clubs-marrakech", path: "/blog/beach-clubs-marrakech", title: "Beach Clubs à Marrakech", bizId: "03dfb3bd-2021-418a-99d6-aec1fb0f7ac6", date: "2026-06-13T08:00:00Z" },
        { slug: "shopping-fashion-gueliz", path: "/blog/shopping-fashion-gueliz", title: "Shopping fashion à Guéliz, Marrakech", bizId: "7924a190-679d-4981-a12a-b56c257cd680", date: "2026-06-13T03:00:00Z" },
        { slug: "street-food-marrakech", path: "/blog/street-food-marrakech", title: "Le meilleur de la Street Food à Marrakech", bizId: "6f48e2fa-bf01-4ce4-a51c-0e986ce17e18", date: "2026-06-13T02:00:00Z" },
        { slug: "artisanat-medina-marrakech", path: "/blog/artisanat-medina-marrakech", title: "Artisanat marocain dans la Médina de Marrakech", bizId: "1621498d-403b-4ff2-baf3-db45d1e5f41e", date: "2026-06-13T01:00:00Z" },
        { slug: "fermes-pedagogiques-marrakech", path: "/blog/fermes-pedagogiques-marrakech", title: "Les fermes pédagogiques à Marrakech", bizId: "2fdb1f15-4a02-40b4-b344-0ffc0c2e1abd", date: "2026-06-13T00:00:00Z" },
        { slug: "activites-enfants-marrakech", path: "/blog/activites-enfants-marrakech", title: "Activités pour les enfants à Marrakech", bizId: "728e90f7-3894-43a5-8c0d-9dd193fe9946", date: "2026-06-14T00:00:00Z" },
        { slug: "galeries-art-marrakech", path: "/blog/galeries-art-marrakech", title: "Les galeries d'art à Marrakech", bizId: "b484d0cd-6c47-43a2-b388-8ad34f590cd8", date: "2026-05-24T00:00:00Z" },
        { slug: "5-jours-marrakech-artisanat", path: "/blog/5-jours-marrakech-artisanat", title: "5 jours à Marrakech pour découvrir le meilleur de l'artisanat marocain", bizId: "83d7e07e-128c-47a3-92c6-225a53e34b42", date: "2026-05-23T00:00:00Z" },
      ];

      const ids = staticArticles.map((a) => a.bizId).filter(Boolean) as string[];
      const [{ data: bizs }, { data: dbPosts }] = await Promise.all([
        supabase.from("businesses").select("id, images").in("id", ids),
        supabase
          .from("blog_posts")
          .select("slug, title_fr, cover_image_url, published_at, created_at")
          .eq("is_published", true),
      ]);
      const imgById = new Map<string, string | undefined>();
      (bizs || []).forEach((b: any) => imgById.set(b.id, b.images?.[0]));

      const staticItems = staticArticles.map((a) => ({
        slug: a.path,
        title: a.title,
        image: a.slug === "etablissements-notes" 
          ? ratedHeroAsset.url 
          : a.slug === "hotels-riads-vue-mer-essaouira" 
          ? essaouiraSunsetAsset.url 
          : (a.bizId ? imgById.get(a.bizId) : undefined),
        date: a.date,
      }));
      const dbItems = (dbPosts || []).map((p: any) => ({
        slug: `/blog/${p.slug}`,
        title: p.title_fr,
        image: p.cover_image_url || undefined,
        date: p.published_at || p.created_at,
      }));

      const merged = [...staticItems, ...dbItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (cancelled) return;
      setLatestPosts(merged.map(({ slug, title, image }) => ({ slug, title, image })));
    })();
    return () => { cancelled = true; };
  }, []);


  

  useSEO({
    title: "ONE WORLD MOROCCO — Voyagez autrement au Maroc",
    description:
      "Inspirez-vous des meilleures adresses du Maroc : hôtels, restaurants, expériences et itinéraires sélectionnés et vérifiés.",
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
    <div className="min-h-screen bg-background">
      {/* TOP BAR — sticky */}
      <HomeMindtripHeader />




      {/* HERO */}

      <div className="pt-2 md:pt-3">
        <section className="relative min-h-[92vh] w-full overflow-hidden">
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobile} />
          <img
            src={heroImage}
            alt="Maroc — riad, piscine et tagine, composition réalisme magique"
            className="absolute inset-0 h-full w-full object-contain object-right animate-[heroKenBurns_24s_ease-in-out_infinite]"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <style>{`
          @keyframes heroKenBurns {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.04); }
          }
          @media (prefers-reduced-motion: reduce) {
            section > picture img { animation: none !important; }
          }
        `}</style>

        <div className="relative z-20 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 py-24 md:px-12">
          <h1 className="font-josefin text-5xl font-light leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
            Le Maroc<br />autrement<span className="text-white">.</span>
          </h1>
          <p className="mt-6 max-w-xl font-roboto text-base font-bold text-white md:text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            Faites de chaque achat un acte de générosité. Nous sommes la seule plateforme où l'engagement est inscrit dans notre ADN : 20% du montant de chaque cotisation des annonceurs est directement reversé à des actions humanitaires et de solidarité sur le terrain.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <HeroInlineSearch
              placeholder="Rechercher un hôtel, un restaurant, une expérience…"
              onSearch={(params) => {
                const qs = new URLSearchParams(params).toString();
                navigate(`/search?${qs}`);
              }}
              onBusinessSelect={(businessId) => navigate(`/search?openBusiness=${businessId}`)}
              onMobileSearchClick={() => heroVoice.toggleRecording()}
            />
            <div className="mt-5 flex justify-start">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="inline-flex items-center gap-3 text-[#F1F1F1] hover:opacity-80 transition-opacity"
                aria-label="Play video"
              >
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#F1F1F1] text-black">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="font-roboto text-base font-medium text-[#F1F1F1]">Voir la vidéo</span>
              </button>
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

        <button
          type="button"
          onClick={scrollToNext}
          aria-label="Découvrir"
          className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2 text-white/70 transition hover:text-white"
        >
          <span className="block font-josefin text-xs uppercase tracking-[0.3em]">Découvrir</span>
          <ArrowDown className="mx-auto mt-2 h-5 w-5 animate-bounce" />
        </button>
      </section>
    </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-background pt-24 md:pt-40 pb-4 md:pb-6">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <h2 id="how-it-works-title" className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl scroll-mt-24 md:scroll-mt-40">
            Comment fonctionne l'App ?
          </h2>

          <div className="mt-10 space-y-12">
            {STEPS.slice(0, 1).map((s, i) => (
              <div
                key={s.title}
                className="space-y-8"
              >
                {i === 0 ? (
                  <div>
                    <span className="font-josefin text-xs uppercase tracking-[0.3em] text-white inline-flex items-center rounded-full px-3 py-1 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ backgroundColor: "#C04F17" }}>
                      Étape {i + 1}
                    </span>
                    <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 font-roboto text-base text-foreground/70">{s.desc}</p>
                  </div>
                ) : null}
                {i === 0 ? (
                  <div className="min-w-0">
                    <div 
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
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide-mobile">
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="aspect-[9/16] w-[200px] shrink-0 animate-pulse rounded-lg bg-muted/40 md:w-[240px]" />
                          ))}
                        </div>
                      ) : videos.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                          Aucune vidéo pour {selectedCity}.
                        </div>
                      ) : (
                        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide-mobile">
                          {videos.map((v) => {
                            const thumb = optimizeSupabaseImage(v.thumbnail, { width: 400 }) || v.thumbnail;
                            if (!v.label) return null;
                            const buildSearchUrl = async () => {
                              const subcategoryNames = v.kind === "entry"
                                ? (v.subcategoryNames.length > 0 ? v.subcategoryNames : await fetchFrontStructureSubcategoryNames(v.label || ""))
                                : [];
                              return subcategoryNames.length > 0
                                ? `/search?subcats=${encodeURIComponent(subcategoryNames.join("|"))}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label)}&_t=${Date.now()}`
                                : `/search?q=${encodeURIComponent(`${v.label} ${selectedCity}`)}&_t=${Date.now()}`;
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
                                navigate(`/search?pinIds=${encodeURIComponent(businessId)}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label || "")}&openBusiness=${encodeURIComponent(businessId)}&_t=${Date.now()}`);
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
                                  navigate(`/search?city=${encodeURIComponent(selectedCity)}&badgeId=${encodeURIComponent(v.badgeId)}&badgeLabel=${encodeURIComponent(badgeName)}&_t=${Date.now()}`);
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
                                if (ids.length === 0) { navigate(defaultUrl); return; }
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
                                if (ordered.length === 0) { navigate(defaultUrl); return; }
                                navigate(`/search?pinIds=${ordered.join(",")}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label)}&_t=${Date.now()}`);
                                return;
                              }
                              navigate(defaultUrl);
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
                                      {v.label}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 auto-rows-fr gap-4 md:gap-8">
            {STEPS.slice(1).map((s, idx) => {
              const i = idx + 1;
              return (
                <div
                  key={s.title}
                  className="relative overflow-hidden w-full h-full rounded-2xl md:rounded-3xl p-4 md:p-10 border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]"
                  style={{ backgroundColor: "#F1F1F1" }}
                >
                  {(i === 1 || i === 2 || i === 3 || i === 4 || i === 6) && (
                    <div className="w-full mb-6 relative z-10">
                      <span className="font-josefin text-xs uppercase tracking-[0.3em] text-white inline-flex items-center rounded-full px-3 py-1 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ backgroundColor: "#C04F17" }}>
                        Étape {i + 1}
                      </span>
                      <h3 className="mt-3 font-josefin text-2xl md:text-3xl font-bold tracking-tight text-black">
                        {s.title}
                      </h3>
                    </div>
                  )}

                  {(i === 1 || i === 2 || i === 3 || i === 4 || i === 6) ? (
                    <div className="relative z-10 flex flex-col gap-4 md:gap-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                        <div className="flex-1 lg:max-w-[60%]">
                          <p className="font-roboto text-sm md:text-base text-black/90 font-bold">
                            {s.desc}
                          </p>
                        </div>
                        <div className="flex lg:block items-center justify-center lg:flex-shrink-0 pointer-events-none">
                          <div className="relative h-[220px] md:h-[260px] lg:h-[340px] aspect-[9/16] border-[6px] border-neutral-900 bg-neutral-950 rounded-[1.3rem] shadow-[0_15px_35px_rgba(0,0,0,0.4)] overflow-hidden">
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-neutral-900 rounded-full z-20 pointer-events-none" />
                            {i === 1 && (
                              <img src="/__l5e/assets-v1/1f99cc17-403a-46b2-9e99-1e6744e5c67f/etape2-ia.webp" alt="Assistant IA One World Morocco" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 2 && (
                              <video src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/generic-1779806600486-gfn1oq.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 3 && (
                              <img src="/__l5e/assets-v1/dcedd97c-5e12-42e9-b9d1-8dfd89e4952e/offre-popup.webp" alt="Offre One World Morocco" className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 4 && (
                              <video src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/1d4cd6cb-e735-432a-a333-af74d8f12d15-1781249602424-uzaggr.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                            {i === 6 && (
                              <video src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/08f848fc-83ee-48c5-9636-fb80e68f0218-1781251423466-3s20ok.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover rounded-[0.9rem]" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <Link
                          to={s.href}
                          className="inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs uppercase tracking-[0.2em] text-white bg-black/70 backdrop-blur-2xl border border-white/10 shadow-lg hover:bg-black/90 transition-colors md:px-6 md:py-3 md:text-sm"
                        >
                          {s.cta} →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {i === 5 && (
                        <video
                          src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/6eab7b31-bda9-43d5-8c8b-4f972e5bb8bd-1774600396740-3cbxw.mp4"
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      <div className={`relative z-10 ${i === 7 ? "text-center" : ""}`}>
                        {i === 7 && (
                          <div className="mx-auto mb-6 h-24 w-24 rounded-3xl p-2 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]">
                            <img src="/logo-gold.webp" alt="ONE WORLD MOROCCO" className="h-full w-full rounded-2xl object-contain" />
                          </div>
                        )}
                        <span className="font-josefin text-xs uppercase tracking-[0.3em] text-white inline-flex items-center rounded-full px-3 py-1 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ backgroundColor: "#C04F17" }}>
                          Étape {i + 1}
                        </span>
                        <h3 className={`mt-3 font-josefin text-2xl font-bold tracking-tight md:text-4xl ${i === 7 ? "text-black" : "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"}`}>
                          {s.title}
                        </h3>
                        <p className={`mt-3 md:mt-4 ${i === 7 ? "mx-auto text-black/80" : "text-white/90 font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"} max-w-lg font-roboto text-sm md:text-base`}>{s.desc}</p>
                        {i === 5 ? (
                          <HotelAvailabilityWidget />
                        ) : i === 7 ? (
                          <Link
                            to={s.href}
                            style={{ backgroundColor: "#C04F17" }}
                            className="mt-4 inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs uppercase tracking-[0.2em] text-white border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] hover:opacity-90 transition-opacity md:mt-6 md:px-6 md:py-3 md:text-sm"
                          >
                            {s.cta} →
                          </Link>
                        ) : (
                          <Link to={s.href} className="mt-4 inline-flex font-josefin text-xs uppercase tracking-[0.2em] text-primary hover:underline md:mt-6 md:text-sm">
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
              Inspirez-vous
            </h2>
            <p className="mt-3 max-w-xl font-roboto text-foreground/70">
              Nos derniers guides pour explorer le Maroc autrement.
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
                  to={a.slug}
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
            </div>
          </div>
        </div>
      </section>





      <Footer variant="verified" />

      <VoiceSearchOverlay
        isOpen={heroVoice.status === "recording" || heroVoice.status === "processing"}
        liveTranscript={heroVoice.liveTranscript}
        onClose={heroVoice.toggleRecording}
        onFinish={heroVoice.finishRecording}
      />
    </div>
  );
};

const HotelAvailabilityWidget = () => {
  const navigate = useNavigate();
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

  const fieldCls = "rounded-md border border-border/40 bg-background px-3 py-1.5 font-roboto text-sm text-foreground md:py-2";
  const labelCls = "flex flex-col gap-1 text-[10px] uppercase tracking-[0.2em] text-foreground/60 md:text-xs";

  return (
    <form
      onSubmit={submit}
      className="mt-4 grid w-full max-w-2xl gap-2 rounded-2xl border border-border/40 bg-background/40 p-3 backdrop-blur sm:grid-cols-2 md:mt-6 md:gap-3 md:p-4"
    >
      <label className={`${labelCls} sm:col-span-2`}>
        Destination
        <select value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls}>
          <option value="Marrakech">Marrakech</option>
          <option value="Essaouira">Essaouira</option>
        </select>
      </label>
      <label className={labelCls}>
        Arrivée
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
          className={fieldCls}
        />
      </label>
      <label className={labelCls}>
        Départ
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          className={fieldCls}
        />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        Adultes
        <select value={adults} onChange={(e) => setAdults(e.target.value)} className={fieldCls}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-full bg-primary hover:bg-primary/90 border border-white/30 px-5 py-2.5 font-josefin text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] transition sm:col-span-2 md:px-6 md:py-3 md:text-sm"
      >
        Voir les disponibilités
      </button>
    </form>
  );
};


const STEPS = [
  {
    title: "Inspirez-vous en vidéo. Découvrez des adresses vérifiées.",
    desc: "Plongez dans des vidéos courtes qui révèlent l'âme des lieux : riads, tables d'exception, artisans, expériences. Chaque établissement est sélectionné, visité et validé par notre équipe pour vous garantir une expérience à la hauteur.",
    cta: "Voir les vidéos",
    href: "/videos",
    icon: PlayCircle,
  },
  {
    title: "Votre assistant IA",
    desc: "Dialoguez avec notre Agent IA pour affiner vos recherches avec vos propres critères, sauvegardez les résultats, partagez les avec vos proches.",
    cta: "Explorer le catalogue",
    href: "/search",
    icon: Sparkles,
  },
  {
    title: "Composez votre voyage",
    desc: "Construisez votre itinéraire, suivez les établissements qui vous intéressent, gardez les points d'intérêts dans votre compte, soyez informé des bons plans, agenda, annonces...",
    cta: "Inscrivez-vous",
    href: "/club",
    icon: Compass,
  },
  {
    title: "Offres sélectionnées. Prix locaux.",
    desc: "Jusqu'à 20 % de réduction sur séjours, visites, restaurants, commerces, services et plus. Uniquement avec des commerces locaux.",
    cta: "Voir les offres",
    href: "/search?badge=reduction",
    icon: Percent,
  },
  {
    title: "Pépites cachées, expériences inoubliables",
    desc: "Découvrez des adresses d'exception, épinglez-les, visitez-les. Soyez informé des bons plans, agenda, annonces...",
    cta: "Explorer",
    href: "/search",
    icon: Sparkles,
  },
  {
    title: "Réservez l'esprit léger, participez à l'économie direct-to-local",
    desc: "Réservez directement vos hôtels, restaurants et activités auprès de partenaires de confiance.",
    cta: "Voir les hôtels",
    href: "/hotels",
    icon: CalendarCheck,
  },
  {
    title: "Naviguez en mode immersif",
    desc: "Associez la précision de la recherche Google, la preuve sociale/avis clients des grandes plateformes, les fonctionnalités de TripAdvisor/Booking, le navigation immersive de TikTok/Instagram/Youtube dans une application dédiée au tourisme et à la vie quotidienne au Maroc.",
    cta: "Découvrir",
    href: "/y/tarik-belasri",
    icon: PlayCircle,
  },
  {
    title: "Installez l'application",
    desc: "Installez ONE WORLD MOROCCO sur votre appareil pour un accès en un clic, sans barre d'adresse, avec l'icône directement sur votre écran d'accueil ou votre bureau. Compatible iPhone, iPad, Android, Mac et Windows.",
    cta: "Installer l'app",
    href: "/install",
    icon: PlayCircle,
  },
];


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

export default HomeMindtrip;
