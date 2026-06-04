import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck, Play } from "lucide-react";

import Footer from "@/components/Footer";
import SearchInput from "@/components/SearchInput";
import LiquidAIMoroccoBg from "@/components/LiquidAIMoroccoBg";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import Step2AssistantBlock from "@/components/home/Step2AssistantBlock";

import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import heroImage from "@/assets/home-mindtrip/hero.jpg";
import heroImageMobile from "@/assets/home-mindtrip/hero-mobile.jpg";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import logoHamsa from "@/assets/logo-hamsa-gold.png";
import etape5Bg from "@/assets/etape5-immersif.webp.asset.json";
import heroVideoAsset from "@/assets/hero-video.mp4.asset.json";
import mockupDemoIaVideo from "@/assets/mockup-demo-ia.webm.asset.json";
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

const HomeMindtrip = () => {
  
  const navigate = useNavigate();



  const [selectedCity, setSelectedCity] = useState<CityKey>("Marrakech");
  const [videos, setVideos] = useState<VideoSlot[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [blogHeroes, setBlogHeroes] = useState<{ marrakech?: string; galeries?: string; kids?: string }>({});
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const KIDS_BADGE_ID = "645463af-f0a1-41f4-90c0-b79c5c74a09f";
    (async () => {
      const [mrkRes, galRes, kidsDocRes, kidsYtRes] = await Promise.all([
        supabase.from("businesses").select("images").eq("id", "83d7e07e-128c-47a3-92c6-225a53e34b42").maybeSingle(),
        supabase.from("businesses").select("images").eq("id", "b484d0cd-6c47-43a2-b388-8ad34f590cd8").maybeSingle(),
        supabase.from("business_document_badges").select("document_id").eq("badge_id", KIDS_BADGE_ID),
        supabase.from("business_youtube_video_badges").select("youtube_video_id").eq("badge_id", KIDS_BADGE_ID),
      ]);
      const kidsBizIds = new Set<string>();
      const docIds = (kidsDocRes.data || []).map((r: any) => r.document_id);
      const ytIds = (kidsYtRes.data || []).map((r: any) => r.youtube_video_id);
      if (docIds.length) {
        const { data } = await supabase.from("business_documents").select("business_id").in("id", docIds);
        (data || []).forEach((r: any) => r.business_id && kidsBizIds.add(r.business_id));
      }
      if (ytIds.length) {
        const { data } = await supabase.from("business_youtube_videos").select("business_id").in("id", ytIds);
        (data || []).forEach((r: any) => r.business_id && kidsBizIds.add(r.business_id));
      }
      let kidsImg: string | undefined;
      if (kidsBizIds.size) {
        const { data } = await supabase
          .from("businesses")
          .select("images")
          .in("id", Array.from(kidsBizIds))
          .eq("is_active", true)
          .eq("city", "Marrakech")
          .order("priority_score", { ascending: false })
          .limit(20);
        kidsImg = (data || []).find((b: any) => b.images?.length)?.images?.[0];
      }
      setBlogHeroes({
        marrakech: (mrkRes.data as any)?.images?.[0],
        galeries: (galRes.data as any)?.images?.[0],
        kids: kidsImg,
      });
    })();
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

  const scrollToNext = () => {
    const el = document.getElementById("how-it-works-title");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackX, setTrackX] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const container = horizontalRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = container.offsetHeight - vh;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      const maxX = Math.max(0, track.scrollWidth - window.innerWidth);
      setTrackX(progress * maxX);

      const centerX = window.innerWidth / 2;
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
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === activeStep) v.play().catch(() => {});
      else v.pause();
    });
    const yt = ytIframeRef.current?.contentWindow;
    if (yt) {
      const cmd = activeStep === 3 ? "playVideo" : "pauseVideo";
      yt.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*");
    }
  }, [activeStep]);









  return (
    <div className="min-h-screen bg-background">
      {/* TOP BAR — sticky */}
      <HomeMindtripHeader />




      {/* HERO */}

      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobile} />
          <img
            src={heroImage}
            alt="Maroc — riad, piscine et tagine, composition réalisme magique"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent md:bg-gradient-to-r md:from-background/90 md:via-background/60 md:to-transparent" />

        <div className="relative z-20 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 py-24 md:px-12">
          <h1 className="font-josefin text-5xl font-light leading-[0.95] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            Le Maroc<br />autrement<span className="text-foreground">.</span>
          </h1>
          <p className="mt-6 max-w-xl font-roboto text-base font-bold text-foreground md:text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
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
            />
            <div className="mt-5 flex justify-start">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="inline-flex items-center gap-3 text-foreground hover:opacity-80 transition-opacity"
                aria-label="Play video"
              >
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-foreground text-background">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="font-roboto text-base font-medium">Voir la vidéo</span>
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
          className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2 text-foreground/70 transition hover:text-foreground"
        >
          <span className="block font-josefin text-xs uppercase tracking-[0.3em]">Découvrir</span>
          <ArrowDown className="mx-auto mt-2 h-5 w-5 animate-bounce" />
        </button>
      </section>

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
                    <div className="inline-flex items-center gap-1 rounded-full p-1 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]">
                      {CITIES.map((city) => {
                        const active = selectedCity === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setSelectedCity(city)}
                            className={`relative rounded-full px-5 py-2 font-josefin text-sm uppercase tracking-[0.2em] transition-all ${
                              active
                                ? "bg-primary text-primary-foreground border border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
                                : "text-foreground/70 hover:text-foreground hover:bg-white/10"
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
                            const useSubcats = v.kind === "entry" && v.subcategoryNames.length > 0;
                            const defaultUrl = useSubcats
                              ? `/search?subcats=${encodeURIComponent(v.subcategoryNames.join("|"))}&city=${encodeURIComponent(selectedCity)}&label=${encodeURIComponent(v.label)}&_t=${Date.now()}`
                              : `/search?q=${encodeURIComponent(`${v.label} ${selectedCity}`)}&_t=${Date.now()}`;
                            const goSearch = async (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
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

      {/* HOW IT WORKS — HORIZONTAL PINNED (steps 2,3,4) */}
      <section ref={horizontalRef} className="relative bg-background" style={{ height: "400vh" }}>
        <div className="sticky top-16 md:top-28 flex h-[82svh] md:h-[78vh] items-center overflow-hidden">

          <div
            ref={trackRef}
            className="flex gap-4 md:gap-8 will-change-transform px-[calc((100vw-min(96vw,42rem))/2)] md:px-[calc((100vw-min(85vw,42rem))/2)]"
            style={{ transform: `translate3d(${-trackX}px, 0, 0)` }}
          >
            {STEPS.slice(1).map((s, idx) => {
              const i = idx + 1;
              return (
                <div
                  key={s.title}
                  ref={(el) => { cardRefs.current[idx] = el; }}
                  className="relative overflow-hidden w-[85vw] md:w-[85vw] max-w-2xl shrink-0 rounded-2xl md:rounded-3xl p-4 md:p-10 bg-white/5 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
                >
                  {i === 1 && (
                    <video
                      src={mockupDemoIaVideo.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 m-auto h-[80%] w-[80%] object-contain opacity-90 pointer-events-none translate-x-[8%] translate-y-[8%]"
                    />
                  )}
                  {i === 2 && (
                    <video
                      ref={(el) => { videoRefs.current[idx] = el; }}
                      src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/8d2846a7-fb50-4bde-8a93-c42697e23a2f-1780215120927-3j2n3k.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {i === 3 && (
                    <video
                      ref={(el) => { videoRefs.current[idx] = el; }}
                      src="https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/6eab7b31-bda9-43d5-8c8b-4f972e5bb8bd-1774600396740-3cbxw.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {i === 4 && (
                    <div className="absolute inset-0 overflow-hidden bg-black" style={{ containerType: "size" }}>
                      <iframe
                        ref={ytIframeRef}
                        src="https://www.youtube-nocookie.com/embed/45NF1zJMhCs?autoplay=1&mute=1&loop=1&playlist=45NF1zJMhCs&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&showinfo=0&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=1"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        allow="autoplay; encrypted-media"
                        frameBorder="0"
                        style={{
                          border: 0,
                          width: "max(160cqw, calc(160cqh * 9 / 16))",
                          height: "max(160cqh, calc(160cqw * 16 / 9))",
                        }}
                      />
                    </div>
                  )}

                  <div className={`relative z-10 ${i === 5 ? "text-center" : ""}`}>
                    {i === 1 ? (
                      <Step2AssistantBlock
                        stepLabel={`Étape ${i + 1}`}
                        title={s.title}
                        description={s.desc}
                      />
                    ) : (
                      <>
                        {i === 5 && (
                          <div className="mx-auto mb-6 h-24 w-24 rounded-3xl p-2 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]">
                            <img src="/app-icon-512.png" alt="ONE WORLD MOROCCO" className="h-full w-full rounded-2xl" />
                          </div>
                        )}
                        <span className="font-josefin text-xs uppercase tracking-[0.3em] text-white inline-flex items-center rounded-full px-3 py-1 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ backgroundColor: "#C04F17" }}>
                          Étape {i + 1}
                        </span>

                        <h3 className={`mt-3 font-josefin text-2xl font-light tracking-tight md:text-4xl ${i === 5 ? "text-black" : i >= 2 ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]" : "text-foreground"}`}>
                          {s.title}
                        </h3>
                        <p className={`mt-3 md:mt-4 ${i === 5 ? "mx-auto" : ""} max-w-lg font-roboto text-sm md:text-base ${i === 5 ? "text-black/80" : i >= 2 ? "text-white/90 font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]" : "text-foreground/70"}`}>{s.desc}</p>
                        {i === 3 ? (
                          <HotelAvailabilityWidget />
                        ) : i === 5 ? (
                          <Link
                            to={s.href}
                            style={{ backgroundColor: "#C04F17" }}
                            className="mt-4 inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs uppercase tracking-[0.2em] text-white border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] hover:opacity-90 transition-opacity md:mt-6 md:px-6 md:py-3 md:text-sm"
                          >
                            {s.cta} →
                          </Link>
                        ) : (
                          <Link
                            to={s.href}
                            className={
                              i === 2 || i === 4
                                ? "mt-4 inline-flex items-center rounded-full px-5 py-2.5 font-josefin text-xs uppercase tracking-[0.2em] text-white bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-white/20 transition-colors md:mt-6 md:px-6 md:py-3 md:text-sm"
                                : "mt-4 inline-flex font-josefin text-xs uppercase tracking-[0.2em] text-primary hover:underline md:mt-6 md:text-sm"
                            }
                          >
                            {s.cta} →
                          </Link>
                        )}
                      </>
                    )}

                  </div>



                </div>
              );
            })}
          </div>
        </div>
      </section>







      {/* INSPIRATION */}
      <section className="pt-4 pb-24 md:pt-6 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl">
                Inspirez-vous
              </h2>
              <p className="mt-3 max-w-xl font-roboto text-foreground/70">
                Nos derniers guides pour explorer le Maroc autrement.
              </p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "5 jours à Marrakech pour découvrir le meilleur de l'artisanat marocain",
                href: "/blog/5-jours-marrakech-artisanat",
                image: blogHeroes.marrakech,
              },
              {
                title: "Les galeries d'art à Marrakech",
                href: "/blog/galeries-art-marrakech",
                image: blogHeroes.galeries,
              },
              {
                title: "Activités pour les enfants à Marrakech",
                href: "/blog/activites-enfants-marrakech",
                image: blogHeroes.kids,
              },
            ].map((a) => (
              <Link
                key={a.href}
                to={a.href}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted"
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent p-6">
                  <span className="font-josefin text-xl leading-tight text-background">{a.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      <Footer variant="verified" />
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
    title: "Dialoguez avec votre assistant IA personnalisé",
    desc: "",
    cta: "Explorer le catalogue",
    href: "/search",
    icon: Sparkles,
  },
  {
    title: "Construisez votre itinéraire.",
    desc: "Marrakech, Essaouira, suivez les établissements qui vous intéressent, gardez les points d'intérêts dans votre compte Le Club OWM, soyez informé des bons plans, agenda, annonces...",
    cta: "Inscrivez-vous",
    href: "/club",
    icon: Compass,
  },
  {
    title: "Réservez l'esprit léger, participez à l'économie direct-to-local.",
    desc: "Réservez directement vos hôtels, restaurants et activités auprès de partenaires de confiance.",
    cta: "Voir les hôtels",
    href: "/hotels",
    icon: CalendarCheck,
  },
  {
    title: "Naviguez en mode immersif.",
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
