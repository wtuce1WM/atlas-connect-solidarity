import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import portraitVideo from "@/assets/hero-home-portrait.mp4.asset.json";
import hamsaIcon from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";

const LANDSCAPE_VIDEO_URL =
  "https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/studio-videos/1wm_montage_storyboard-home-portrait-20_vertical_20260818-1320_3376434b.mp4";

const STEP_MS = 3400;

type Step = { bullet: boolean; render: () => React.ReactNode };

const STEPS: Step[] = [
  { bullet: false, render: () => <>Notre App fait ce que font...</> },
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
        <strong className="font-bold text-gold">20 %</strong> des abonnements des affiliés
        sont destinés à des causes humanitaires au Maroc...
      </>
    ),
  },
  {
    bullet: false,
    render: () => (
      <>
        Parce que créer de la valeur ne devrait pas seulement profiter à ceux qui la
        créent.
      </>
    ),
  },
];

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

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
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
    scheduleNext(0);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  const [auto, setAuto] = useState(true);

  const goToStep = useCallback(
    (i: number) => {
      const next = Math.min(STEPS.length - 1, Math.max(0, i));
      setStep(next);
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
  const headerOpacity = range(progress, 0.15, 0.45);
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

      {/* Mini-header pinné (identité + slogan, toujours visible) */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-3 md:px-10">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-whatsapp" />
          <span className="font-josefin text-xs font-black uppercase tracking-[0.2em] text-[#F4EEE4] md:text-sm">
            One World Morocco
          </span>
        </div>
        <h1 className="font-josefin text-xs font-extrabold uppercase tracking-[0.18em] text-[rgba(244,238,228,0.85)] md:text-sm">
          Local <span className="text-primary">×</span> Digital{" "}
          <span className="text-primary">×</span> Solidaire
        </h1>
      </div>

      {/* Couche narrative */}
      <div
        className="absolute inset-0 z-10 flex flex-col justify-center px-5 pb-24 pt-20 md:px-10 lg:px-16"
        style={{
          opacity: narrativeOpacity,
          transform: reduced
            ? undefined
            : `translateY(${-range(progress, 0, 0.35) * 40}px)`,
          pointerEvents: narrativeActive ? "auto" : "none",
          transition: motion,
        }}
        aria-hidden={!narrativeActive}
      >
        <div className="mx-auto w-full max-w-4xl">



          {/* Storybox */}
          <div className="mt-7 border-l-2 border-gold/70 pl-4 md:pl-6">
            <ul className="space-y-2.5">
              {STEPS.slice(0, step + 1).map((s, i) => {
                const isActive = i === step;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-3 font-roboto text-sm leading-snug md:text-lg ${
                      isActive
                        ? "font-bold text-[#F4EEE4]"
                        : "font-medium text-[rgba(244,238,228,0.45)]"
                    }`}
                    style={{ transition: motion }}
                  >
                    {s.bullet ? (
                      <img
                        src={hamsaIcon.url}
                        alt=""
                        className="mt-0.5 h-5 w-5 shrink-0 rounded-full md:h-6 md:w-6"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-0 shrink-0" />
                    )}
                    <span>{s.render()}</span>
                  </li>
                );
              })}
            </ul>

            {/* Progress bar segmentée */}
            <div className="mt-6 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Étape ${i + 1}`}
                  onClick={() => goToStep(i)}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(244,238,228,0.2)]"
                >
                  <span
                    className="block h-full rounded-full bg-gold"
                    style={{
                      width: i < step ? "100%" : i === step ? "100%" : "0%",
                      opacity: i <= step ? 1 : 0,
                      transition: reduced ? "none" : `width ${STEP_MS}ms linear`,
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Hint / CTAs de lecture */}
            <div
              className="mt-4 hidden items-center gap-2 font-josefin text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(244,238,228,0.62)] sm:flex"
              style={{
                opacity: step >= STEPS.length - 1 ? 0 : 1,
                pointerEvents: step >= STEPS.length - 1 ? "none" : "auto",
                transition: motion,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="uppercase transition-colors hover:text-gold"
              >
                Cliquez pour avancer
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => toggleAuto()}
                className={`uppercase transition-colors hover:text-gold ${auto ? "text-gold" : ""}`}
              >
                Lecture automatique{auto ? "" : " (en pause)"}
              </button>
            </div>

          </div>
        </div>
      </div>

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
