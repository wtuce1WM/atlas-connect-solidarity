import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck, Play } from "lucide-react";

import Footer from "@/components/Footer";
import SearchInput from "@/components/SearchInput";
import HeroInlineSearch from "@/components/HeroInlineSearch";

import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import heroImage from "@/assets/home-mindtrip/hero.jpg";
import heroImageMobile from "@/assets/home-mindtrip/hero-mobile.jpg";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import logoHamsa from "@/assets/logo-hamsa-gold.png";

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
    const el = document.getElementById("how-it-works");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackX, setTrackX] = useState(0);

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
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);





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
          </div>

        </div>

        <button
          type="button"
          onClick={scrollToNext}
          aria-label="Découvrir"
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-foreground/70 transition hover:text-foreground"
        >
          <span className="block font-josefin text-xs uppercase tracking-[0.3em]">Découvrir</span>
          <ArrowDown className="mx-auto mt-2 h-5 w-5 animate-bounce" />
        </button>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <h2 className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl">
            Comment ça marche
          </h2>

          <div className="mt-16 space-y-24">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="space-y-8"
              >
                {i === 0 ? (
                  <div>
                    <span className="font-josefin text-xs uppercase tracking-[0.3em] text-primary">
                      Étape {i + 1}
                    </span>
                    <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 font-roboto text-base text-foreground/70 md:whitespace-nowrap">{s.desc}</p>
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
                            <div key={idx} className="aspect-[9/16] w-[140px] shrink-0 animate-pulse rounded-lg bg-muted/40 md:w-[160px]" />
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
                              <div key={v.key} className="group relative aspect-[9/16] w-[140px] shrink-0 snap-start overflow-hidden rounded-lg bg-muted md:w-[160px]">
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
      <section ref={horizontalRef} className="relative bg-background" style={{ height: "300vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-8 will-change-transform px-[calc((100vw-min(85vw,42rem))/2)]"
            style={{ transform: `translate3d(${-trackX}px, 0, 0)` }}
          >
            {STEPS.slice(1).map((s, idx) => {
              const i = idx + 1;
              return (
                <div
                  key={s.title}
                  className="w-[85vw] max-w-2xl shrink-0 rounded-3xl p-8 md:p-10 bg-white/5 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
                >
                  <span className="font-josefin text-xs uppercase tracking-[0.3em] text-primary">
                    Étape {i + 1}
                  </span>
                  <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                    {s.title}
                  </h3>
                  <p className="mt-4 max-w-lg font-roboto text-base text-foreground/70">{s.desc}</p>
                  {i === 3 ? (
                    <HotelAvailabilityWidget />
                  ) : i === 1 ? (
                    <div className="mt-6 w-full max-w-xl">
                      <SearchInput
                        variant="hero"
                        placeholder="Rechercher un hôtel, un restaurant, une expérience…"
                        showSuggestions
                      />
                    </div>
                  ) : (
                    <Link
                      to={s.href}
                      className="mt-6 inline-flex font-josefin text-sm uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                      {s.cta} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>







      {/* INSPIRATION */}
      <section className="py-24 md:py-32">
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

      {/* INSTALL APP */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 md:px-12 text-center">
          <Link
            to="/install"
            className="inline-block group"
            aria-label="Installer l'application ONE WORLD MOROCCO"
          >
            <div className="mx-auto h-24 w-24 rounded-3xl p-2 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] transition-transform group-hover:scale-105">
              <img
                src="/app-icon-512.png"
                alt="ONE WORLD MOROCCO"
                className="h-full w-full rounded-2xl"
              />
            </div>
          </Link>
          <h2 className="mt-8 font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl">
            Installez l'application
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-roboto text-foreground/70">
            Installez ONE WORLD MOROCCO sur votre appareil pour un accès en un clic,
            sans barre d'adresse, avec l'icône directement sur votre écran d'accueil
            ou votre bureau. Compatible iPhone, iPad, Android, Mac et Windows.
          </p>
          <div className="mt-8">
            <Link
              to="/install"
              className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 border border-white/30 px-6 py-3 font-josefin text-sm uppercase tracking-[0.2em] text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] transition"
            >
              Installer l'app
            </Link>
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

  const fieldCls = "rounded-md border border-border/40 bg-background px-3 py-2 font-roboto text-sm text-foreground";
  const labelCls = "flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-foreground/60";

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid w-full max-w-2xl gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 backdrop-blur sm:grid-cols-2"
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
        className="rounded-full bg-primary hover:bg-primary/90 border border-white/30 px-6 py-3 font-josefin text-sm uppercase tracking-[0.2em] text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] transition sm:col-span-2"
      >
        Voir les disponibilités
      </button>
    </form>
  );
};


const STEPS = [
  {
    title: "Inspirez-vous en vidéo.",
    desc: "Plongez dans des vidéos courtes qui révèlent l'âme des lieux : riads, tables d'exception, artisans, expériences.",
    cta: "Voir les vidéos",
    href: "/videos",
    icon: PlayCircle,
  },
  {
    title: "Découvrez des adresses vérifiées.",
    desc: "Chaque établissement est sélectionné, visité et validé par notre équipe pour vous garantir une expérience à la hauteur.",
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
