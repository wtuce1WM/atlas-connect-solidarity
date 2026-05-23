import { Link } from "react-router-dom";
import { ArrowDown, PlayCircle, Sparkles, MapPin, Compass, CalendarCheck } from "lucide-react";

import Footer from "@/components/Footer";
import SearchInput from "@/components/SearchInput";
import { useSEO } from "@/hooks/useSEO";
import heroImage from "@/assets/home-mindtrip/hero.jpg";
import heroImageMobile from "@/assets/home-mindtrip/hero-mobile.jpg";

const HomeMindtrip = () => {
  useSEO({
    title: "ONE WORLD MOROCCO — Voyagez autrement au Maroc",
    description:
      "Inspirez-vous des meilleures adresses du Maroc : hôtels, restaurants, expériences et itinéraires sélectionnés et vérifiés.",
    canonical: "/",
  });

  const scrollToNext = () => {
    const el = document.getElementById("how-it-works");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">

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
          <div className="mt-10 w-full max-w-2xl rounded-full bg-black p-1.5 shadow-2xl ring-1 ring-white/10 [&_input]:!bg-transparent [&_input]:!text-white [&_input]:!placeholder-white/60">
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
                className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted">
                    <s.icon className="h-20 w-20 text-primary/60" strokeWidth={1} />
                  </div>
                </div>
                <div>
                  <span className="font-josefin text-xs uppercase tracking-[0.3em] text-primary">
                    Étape {i + 1}
                  </span>
                  <h3 className="mt-3 font-josefin text-3xl font-light tracking-tight text-foreground md:text-4xl">
                    {s.title}
                  </h3>
                  <p className="mt-4 max-w-lg font-roboto text-base text-foreground/70">{s.desc}</p>
                  <Link
                    to={s.href}
                    className="mt-6 inline-flex font-josefin text-sm uppercase tracking-[0.2em] text-primary hover:underline"
                  >
                    {s.cta} →
                  </Link>
                </div>
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
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
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
    desc: "Marrakech, Essaouira, Fès, Chefchaouen… mixez les destinations et créez le voyage qui vous ressemble.",
    cta: "Toutes les destinations",
    href: "/carte",
    icon: Compass,
  },
  {
    title: "Réservez l'esprit léger.",
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
