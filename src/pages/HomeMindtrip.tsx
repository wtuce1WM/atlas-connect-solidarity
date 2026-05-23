import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck, Menu, X, Play } from "lucide-react";

import Footer from "@/components/Footer";
import SearchInput from "@/components/SearchInput";

import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import heroImage from "@/assets/home-mindtrip/hero.jpg";
import heroImageMobile from "@/assets/home-mindtrip/hero-mobile.jpg";
import stepVerifiedImage from "@/assets/home-mindtrip/step-verified.jpg";
import stepClubImage from "@/assets/home-mindtrip/step-club.jpg";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();



  const [selectedCity, setSelectedCity] = useState<CityKey>("Marrakech");
  const [videos, setVideos] = useState<VideoSlot[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  

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





  return (
    <div className="min-h-screen bg-background">
      {/* TOP BAR — sticky */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-12 md:py-4">
          <Link to="/" aria-label="Accueil" className="flex items-center gap-2 md:gap-3" onClick={() => setMenuOpen(false)}>
            <img src={logoHamsa} alt="One World Morocco" className="h-8 w-auto md:h-9" />
            <span className="font-josefin text-xs uppercase tracking-[0.18em] text-foreground sm:text-sm sm:tracking-[0.2em]">
              ONE WORLD MOROCCO
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/devenir-affilie" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
              Ajoutez votre entreprise
            </Link>
            <Link to="/club" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
              Le club OWM
            </Link>
            <Link to="/install" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
              Application
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-background/95 backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              <Link to="/devenir-affilie" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
                Ajoutez votre entreprise
              </Link>
              <Link to="/club" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
                Le club OWM
              </Link>
              <Link to="/install" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
                Application
              </Link>
            </div>
          </div>
        )}
      </nav>




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
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent md:bg-gradient-to-r md:from-background/80 md:via-background/40 md:to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 py-24 md:px-12">
          <h1 className="font-josefin text-5xl font-light leading-[0.95] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            Le Maroc<br />autrement<span className="text-foreground">.</span>
          </h1>
          <p className="mt-6 max-w-xl font-roboto text-base text-foreground/80 md:text-lg">
            Faites de chaque achat un acte de générosité. Nous sommes la seule plateforme où l'engagement est inscrit dans notre ADN : 20% du montant de chaque cotisation des annonceurs est directement reversé à des actions humanitaires et de solidarité sur le terrain.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <SearchInput
              variant="hero"
              placeholder="Rechercher un hôtel, un restaurant, une expérience…"
              showSuggestions
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
                className={
                  i === 0
                    ? "space-y-8"
                    : `grid items-center gap-10 md:grid-cols-2 md:gap-16 ${
                        i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                      }`
                }
              >
                {i === 0 ? (
                  <div>
                    <span className="font-josefin text-xs uppercase tracking-[0.3em] text-primary">
                      Étape {i + 1}
                    </span>
                    <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 font-roboto text-base text-foreground/70 whitespace-nowrap">{s.desc}</p>
                  </div>
                ) : null}
                {i === 0 ? (
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {CITIES.map((city) => {
                        const active = selectedCity === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setSelectedCity(city)}
                            className={`rounded-full px-5 py-2 font-josefin text-sm uppercase tracking-[0.2em] transition ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-foreground/70 hover:text-foreground"
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
                ) : i === 1 ? (
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={stepVerifiedImage}
                      alt="Adresses vérifiées au Maroc — riad, thé à la menthe et carnet de voyage"
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : i === 2 ? (
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={stepClubImage}
                      alt="Carte de Marrakech, carnet de voyage et favoris — Le Club OWM"
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted">
                      <s.icon className="h-20 w-20 text-primary/60" strokeWidth={1} />
                    </div>
                  </div>
                )}
                {i !== 0 && (
                  <div>
                    <span className="font-josefin text-xs uppercase tracking-[0.3em] text-primary">
                      Étape {i + 1}
                    </span>
                    <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 max-w-lg font-roboto text-base text-foreground/70">{s.desc}</p>
                    {i === 3 ? (
                      <HotelAvailabilityWidget />
                    ) : (
                      <Link
                        to={s.href}
                        className="mt-6 inline-flex font-josefin text-sm uppercase tracking-[0.2em] text-primary hover:underline"
                      >
                        {s.cta} →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>






      {/* TOOLKIT */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <h2 className="font-josefin text-4xl font-light tracking-tight text-foreground md:text-5xl">
            Tout ce qu'il faut pour votre prochain voyage
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {TOOLKIT.map((t) => (
              <Link
                key={t.label}
                to={t.href}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-6 transition hover:border-primary"
              >
                <t.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                <span className="font-josefin text-base text-foreground group-hover:text-primary">
                  {t.label}
                </span>
              </Link>
            ))}
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
                Explorez les destinations qui font battre le cœur du Maroc.
              </p>
            </div>
            <Link
              to="/search"
              className="hidden md:inline-flex font-josefin text-sm uppercase tracking-[0.2em] text-primary hover:underline"
            >
              Toutes les destinations →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.name}
                to={d.href}
                className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-muted"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-muted to-foreground/20 transition group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-5">
                  <span className="font-josefin text-xl text-background">{d.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AMBASSADOR CTA */}
      <section className="relative overflow-hidden bg-foreground py-24 text-background">
        <div className="mx-auto max-w-4xl px-6 text-center md:px-12">
          <h2 className="font-josefin text-4xl font-light tracking-tight md:text-6xl">
            Devenez ambassadeur.
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-roboto text-background/80">
            Vous aimez partager vos coups de cœur au Maroc ? Rejoignez le réseau ONE WORLD MOROCCO
            et soyez rémunéré pour faire ce que vous aimez.
          </p>
          <Link
            to="/devenir-affilie"
            className="mt-10 inline-flex rounded-full bg-primary px-8 py-4 font-josefin text-sm uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
          >
            En savoir plus
          </Link>
        </div>
      </section>

      <Footer variant="verified" />
    </div>
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
