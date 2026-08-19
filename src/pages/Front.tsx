import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ArrowUpRight, Menu, X } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import portraitVideo from "@/assets/hero-home-portrait.mp4.asset.json";
import hamsaIcon from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";

const LANDSCAPE_VIDEO_URL =
  "https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/studio-videos/1wm_montage_storyboard-home-portrait-20_vertical_20260818-1320_3376434b.mp4";

const STEP_MS = 3400;

type Step = { bullet: boolean; render: () => React.ReactNode };

const STEPS: Step[] = [
  {
    bullet: false,
    render: () => (
      <span className="text-[#F4EEE4]">Notre App fait ce que font...</span>
    ),
  },
  {
    bullet: true,
    render: () => (
      <>
        TikTok/Instagram/Youtube + Google + Chat GPT + Booking + Google Maps +
        Tripadvisor + CapCut + un site web professionnel...
      </>
    ),
  },
  { bullet: true, render: () => <>sur une seule interface...</> },
  { bullet: true, render: () => <>avec un Agent IA personnalisé...</> },
  {
    bullet: true,
    render: () => (
      <>sur 3 surfaces : orienté client, orienté entreprise hôte, orienté plateforme 1WM...</>
    ),
  },
  {
    bullet: true,
    render: () => (
      <>
        avec un modèle économique direct-to-local, sans commission et solidaire :{" "}
        <strong className="font-bold text-white">20 %</strong> des abonnements des affiliés
        sont destinés à des causes humanitaires au Maroc...
      </>
    ),
  },
  {
    bullet: true,
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
/** Indices des bullets qui défilent dans le carrousel (2-6). */
const CAROUSEL_STEPS = [2, 3, 4, 5, 6];
/** Largeur relative de chaque segment, calée sur la longueur du bullet point défilant. */
const BULLET_WEIGHTS = [0.8, 0.8, 2, 5, 3];


const CTAS: { label: string; to: string }[] = [

  { label: "Installer l'App", to: "/install" },
  { label: "Devenez membre du club OWM", to: "/club" },
  { label: "Ce que nous faisons", to: "/mission" },
  { label: "Un concept local et solidaire", to: "/corporate" },
  { label: "Ajoutez votre entreprise", to: "/join" },
  { label: "Widgets", to: "/widgets" },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

const Front = () => {
  useSEO({
    title: "One World Morocco — Local × Digital × Solidaire",
    description:
      "Une seule interface pour découvrir le Maroc authentique : adresses sélectionnées, Agent IA personnalisé et modèle solidaire sans commission.",
    canonical: "/front",
  });

  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches
  );
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
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

  // auto-avance du récit
  const scheduleNext = useCallback((from: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (from >= STEPS.length - 1) return;
    timerRef.current = window.setTimeout(() => {
      setStep((s) => {
        const next = Math.min(STEPS.length - 1, s + 1);
        scheduleNext(next);
        return next;
      });
    }, STEP_MS);
  }, []);

  useEffect(() => {
    scheduleNext(PERMANENT_STEP);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  const [auto, setAuto] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [accrocheVisible, setAccrocheVisible] = useState(false);
  const [bulletsVisible, setBulletsVisible] = useState(false);

  // délais d'apparition de l'accroche et des bullets
  useEffect(() => {
    const t1 = window.setTimeout(() => setAccrocheVisible(true), 1000);
    const t2 = window.setTimeout(() => setBulletsVisible(true), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);


  const goToStep = useCallback(
    (i: number, freeze = false) => {
      const next = Math.min(STEPS.length - 1, Math.max(0, i));
      setStep(next);
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
        currentRef.current += (targetRef.current - currentRef.current) * 0.14;
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

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setTarget(targetRef.current + e.deltaY / 900);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (y === null || touchYRef.current === null) return;
      e.preventDefault();
      setTarget(targetRef.current + (touchYRef.current - y) / 500);
      touchYRef.current = y;
    };
    const onKey = (e: KeyboardEvent) => {
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
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)] touch-none"
      onClick={() => {
        if (narrativeActive && step < STEPS.length - 1) goToStep(step + 1);
      }}
    >
      {/* Vidéo de fond */}
      <video
        key={isPortrait ? "portrait" : "landscape"}
        className="absolute inset-0 h-full w-full object-cover"
        src={isPortrait ? portraitVideo.url : LANDSCAPE_VIDEO_URL}
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

      {/* Mini-header pinné (identité + menu, toujours visible) */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <img src="/images/logo_blanc.webp" alt="One World Morocco" className="h-7 w-7 shrink-0 object-contain" />
          <span className="font-josefin text-xs font-black uppercase tracking-[0.2em] text-[#F4EEE4] md:text-sm">
            One World Morocco
          </span>
        </div>
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="rounded-full border border-[rgba(244,238,228,0.2)] bg-transparent p-2.5 text-[#F4EEE4] transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay menu navigation */}
      <div
        className={`fixed inset-0 z-40 flex flex-col bg-black/90 backdrop-blur-md transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <img src="/images/logo_blanc.webp" alt="One World Morocco" className="h-7 w-7 shrink-0 object-contain" />
            <span className="font-josefin text-xs font-black uppercase tracking-[0.2em] text-[#F4EEE4] md:text-sm">
              One World Morocco
            </span>
          </div>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="rounded-full border border-[rgba(244,238,228,0.2)] bg-transparent p-2.5 text-[#F4EEE4] transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-3 px-5 pb-10 md:px-10">
          {CTAS.map((cta) => (
            <Link
              key={cta.to}
              to={cta.to}
              onClick={() => setMenuOpen(false)}
              className="group relative overflow-hidden rounded-xl border border-[rgba(244,238,228,0.15)] bg-black/35 p-5 backdrop-blur-md transition-all hover:border-gold/60 focus-visible:border-gold/60 focus-visible:outline-none"
            >
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--gold)))",
                }}
                aria-hidden="true"
              />
              <ArrowUpRight className="absolute right-4 top-5 h-4 w-4 text-[rgba(244,238,228,0.6)] transition-colors group-hover:text-gold" />
              <span className="block pr-8 font-roboto text-base font-bold text-[#F4EEE4] md:text-lg">
                {cta.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bloc central — slogan centré entre header et recherche, recherche ancrée en bas */}
      <div
        className="absolute inset-0 z-20 flex flex-col px-5 pt-24 pb-6 md:px-10 md:pb-8 lg:px-16"
        style={{
          opacity: narrativeOpacity,
          transform: reduced
            ? undefined
            : `translateY(${-range(progress, 0, 0.35) * 40}px)`,
          pointerEvents: narrativeActive ? "auto" : "none",
          transition: motion,
        }}
        aria-hidden={!narrativeActive}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Slogan — centré verticalement dans l'espace restant au-dessus de la recherche */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1
            className="text-center text-[clamp(2rem,min(9vw,8vh),5.5rem)] uppercase leading-[0.9] tracking-tight"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              color: "transparent",
              WebkitTextStrokeWidth: "2px",
              WebkitTextStrokeColor: "#FFFFFF",
              opacity: voiceActive ? 0 : 1,
              transition: motion,
            }}
            aria-hidden={voiceActive}
          >
            <span className="block">
              LOCAL{" "}
              <span style={{ WebkitTextStrokeColor: "hsl(var(--primary))" }}>×</span>
            </span>
            <span className="block">
              DIGITAL{" "}
              <span style={{ WebkitTextStrokeColor: "hsl(var(--primary))" }}>×</span>
            </span>
            <span className="block">SOLIDAIRE</span>
          </h1>
        </div>

        {/* Bloc inférieur — recherche + demo + accroche + storybox */}
        <div className="flex w-full max-w-2xl flex-col items-center gap-4 self-center">
          {/* Recherche (avec overlay vocal) */}
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <HeroInlineSearch
              hideBarWhenVoiceActive
              placeholder="Que cherchez-vous ? Et où ?"
              onVoiceActiveChange={setVoiceActive}
              voiceTextClassName="text-white"
              onSearch={(params) => {
                const qs = new URLSearchParams(params).toString();
                if (qs) navigate(`/search?${qs}`);
              }}
              onBusinessSelect={(businessId) => navigate(`/search?openBusiness=${businessId}`)}
            />
          </div>

          {/* CTA Demo — liquid glass + shimmer différé */}
          <div
            className="flex flex-col items-center gap-1"
            style={{
              opacity: voiceActive ? 0 : 1,
              pointerEvents: voiceActive ? "none" : "auto",
              transition: motion,
            }}
            aria-hidden={voiceActive}
          >
            <button
              type="button"
              aria-label="Demo (bientôt)"
              onClick={(e) => e.stopPropagation()}
              className="demo-cta group relative overflow-hidden rounded-xl border border-white/25 bg-white/[0.08] px-6 py-2.5 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.03] hover:border-white/45 hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.98]"
            >
              <span
                className="relative z-10 text-[clamp(1.1rem,2.6vw,1.6rem)] uppercase leading-none tracking-tight"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 900,
                  color: "transparent",
                  WebkitTextStrokeWidth: "2px",
                  WebkitTextStrokeColor: "#FFFFFF",
                }}
              >
                Demo
              </span>
              <span className="demo-shimmer absolute inset-0 -translate-x-full" aria-hidden="true" />
            </button>
            <span className="font-roboto text-[0.65rem] uppercase tracking-[0.18em] text-[rgba(244,238,228,0.7)]">
              (bientôt)
            </span>
          </div>


          {/* Accroche fixe sous le CTA Demo */}
          <p
            className="font-roboto text-sm font-bold leading-snug text-[#F4EEE4] md:text-lg"
            style={{ opacity: voiceActive ? 0 : 1, transition: motion }}
            aria-hidden={voiceActive}
          >
            Notre App fait ce que font...
          </p>

          {/* Storybox — sous l'accroche, une seule étape à la fois */}
          <div
            className="w-full"
            style={{
              opacity: voiceActive ? 0 : 1,
              pointerEvents: voiceActive ? "none" : "auto",
              transition: motion,
            }}
            aria-hidden={voiceActive}
          >
            <style>{`@keyframes owmSlideDown{from{opacity:0;transform:translateY(-24px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div className="border-l-2 border-gold/70 pl-4 md:pl-6">
              <div className="flex flex-col gap-4">
                {/* Bullet permanent — toujours visible, avec animation d'apparition initiale */}
                <div
                  className="flex items-start gap-3 font-roboto text-sm font-bold leading-snug text-[#F4EEE4] md:text-base"
                  style={{
                    animation: reduced ? undefined : "owmSlideDown 420ms ease-out both",
                  }}
                >
                  <img
                    src={hamsaIcon.url}
                    alt=""
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full md:h-6 md:w-6"
                    loading="lazy"
                  />
                  <span>{STEPS[PERMANENT_STEP].render()}</span>
                </div>

                {/* Bullet courant du carrousel (2-6) */}
                <div className="min-h-[3rem] md:min-h-[3.5rem]">
                  {step >= CAROUSEL_STEPS[0] && (
                    <div
                      key={step}
                      className="flex items-start gap-3 font-roboto text-sm font-bold leading-snug text-[#F4EEE4] md:text-base"
                      style={{
                        animation: reduced ? undefined : "owmSlideDown 420ms ease-out both",
                      }}
                    >
                      <img
                        src={hamsaIcon.url}
                        alt=""
                        className="mt-0.5 h-5 w-5 shrink-0 rounded-full md:h-6 md:w-6"
                        loading="lazy"
                      />
                      <span>{STEPS[step].render()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar segmentée — un segment par bullet défilant (2-6), la première barre (bullet 1) est supprimée */}
              <div className="mt-4 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                {CAROUSEL_STEPS.map((stepIndex, i) => {
                  const done = step > stepIndex;
                  const current = step === stepIndex;
                  return (
                    <button
                      key={stepIndex}
                      type="button"
                      aria-label={`Bullet ${stepIndex}`}
                      aria-current={current}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToStep(stepIndex, true);
                      }}
                      style={{ flex: `${BULLET_WEIGHTS[i] ?? 1} 1 0%` }}
                      className="h-2 overflow-hidden rounded-full bg-[rgba(244,238,228,0.2)] py-[3px]"
                    >
                      <span
                        key={current ? `cur-${step}` : done ? "done" : "todo"}
                        className="block h-full rounded-full bg-gold"
                        style={{
                          width: done ? "100%" : current ? "100%" : "0%",
                          opacity: done || current ? 1 : 0,
                          transition:
                            reduced || !current ? "none" : `width ${STEP_MS}ms linear`,
                          ...(current && !reduced && auto
                            ? { animation: `owmFillBar ${STEP_MS}ms linear both` }
                            : null),
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>


      <style>{`
        @keyframes owmShimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        @keyframes owmFillBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .demo-shimmer {

          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255, 255, 255, 0.35) 50%,
            transparent 70%
          );
          animation: owmShimmer 900ms ease-in-out 500ms 1;
        }
        .demo-cta:hover .demo-shimmer {
          animation: owmShimmer 700ms ease-in-out 1;
        }
      `}</style>






      {/* Couche CTA */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center px-5 pt-16 md:px-10"
        style={{
          opacity: ctaP,
          transform: reduced ? undefined : `translateY(${(1 - ctaP) * 48}px) scale(${0.96 + ctaP * 0.04})`,
          pointerEvents: ctaActive ? "auto" : "none",
          transition: motion,
        }}
        aria-hidden={!ctaActive}
      >
        <div className="grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CTAS.map((cta) => (
            <Link
              key={cta.to}
              to={cta.to}
              tabIndex={ctaActive ? 0 : -1}
              className="group relative overflow-hidden rounded-xl border border-[rgba(244,238,228,0.15)] bg-black/35 p-5 pt-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-gold/60 focus-visible:-translate-y-1 focus-visible:border-gold/60 focus-visible:outline-none"
            >
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--gold)))",
                }}
                aria-hidden="true"
              />
              <ArrowUpRight className="absolute right-4 top-5 h-4 w-4 text-[rgba(244,238,228,0.6)] transition-colors group-hover:text-gold" />
              <span className="block pr-8 font-roboto text-base font-bold text-[#F4EEE4] md:text-lg">
                {cta.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Cue de scroll */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setTarget(1);
        }}
        className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1 text-[rgba(244,238,228,0.8)] hover:text-gold"
        style={{
          opacity: showCue ? 1 : 0,
          pointerEvents: showCue ? "auto" : "none",
          transition: motion,
        }}
        tabIndex={showCue ? 0 : -1}
      >
        <ChevronDown className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
        <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
          Découvrir
        </span>
      </button>
    </section>
  );
};

export default Front;
