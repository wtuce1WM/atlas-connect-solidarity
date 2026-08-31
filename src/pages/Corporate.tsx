import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import Footer from "@/components/Footer";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";

const MODEL_VIDEO_URL =
  "https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-videos/businesses/generic-1777800001847-84ntzf.mp4";
const MODEL_VIDEO_POSTER =
  "https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-images/thumbs/generic-1777800015758-60ney6.jpg";

const LABELS = {
  fr: {
    topBanner: "Le premier écosystème numérique éthique dédié à l'économie locale",
    h1Line1: "Transformons",
    h1Line2: "chaque transaction",
    h1Line3: "en impact POSITIF",
    lede: "L'excellence de l'hospitalité, de la gastronomie et de l'art de vivre marocains, réunie sur une plateforme éthique au service des professionnels de tout le Royaume du Maroc.",
    btnJoin: "Rejoindre le mouvement",
    modelEyebrow: "Un modèle inversé",
    modelTitleA: "L'éthique",
    modelTitleEm: "n'est pas",
    modelTitleB: "une option.",
    modelTitleC: "C'est le modèle.",
    modelP1: "One World Morocco repose sur une conviction simple : la valeur créée par les professionnels marocains doit leur revenir. Nous avons supprimé la commission par transaction et l'avons remplacée par un abonnement mensuel transparent.",
    modelP2: "Hôteliers, restaurateurs, transporteurs et acteurs de l'hospitalité de tout le Royaume du Maroc rejoignent une vitrine commune, du Maroc vers le reste du Monde — sans intermédiaire prédateur.",
    compareOwmVal: "0 commission",
    compareThemVal: "jusqu'à 25%",
    videoTag: "Reversés à des causes humanitaires au Maroc",
    citiesEyebrow: "Villes Pionnières",
    citiesTitleA: "Là où tout",
    citiesTitleEm: "commence",
    citiesSub: "Le déploiement rayonne désormais sur tout le Royaume du Maroc.",
    cityLabel: "Ville Pionnière",
    citiesKingdom: "Du Maroc vers le reste du Monde.",
    discover: "Découvrir",
    back: "Revenir",
  },
  en: {
    topBanner: "The first ethical digital ecosystem dedicated to the local economy",
    h1Line1: "Turning",
    h1Line2: "every transaction",
    h1Line3: "into POSITIVE impact",
    lede: "The excellence of Moroccan hospitality, gastronomy and art de vivre, united on an ethical platform serving professionals across the Kingdom of Morocco.",
    btnJoin: "Join the movement",
    modelEyebrow: "An inverted model",
    modelTitleA: "Ethics",
    modelTitleEm: "is not",
    modelTitleB: "optional.",
    modelTitleC: "It is the model.",
    modelP1: "One World Morocco is built on a simple conviction: the value created by Moroccan professionals should stay with them. We replaced per-transaction commissions with a transparent monthly subscription.",
    modelP2: "Hoteliers, restaurateurs, transporters and hospitality actors from across the Kingdom of Morocco join a shared showcase, from Morocco to the rest of the world — without predatory intermediaries.",
    compareOwmVal: "0 commission",
    compareThemVal: "up to 25%",
    videoTag: "Donated to humanitarian causes in Morocco",
    citiesEyebrow: "Pioneer Cities",
    citiesTitleA: "Where it all",
    citiesTitleEm: "begins",
    citiesSub: "The rollout now extends across the entire Kingdom of Morocco.",
    cityLabel: "Pioneer City",
    citiesKingdom: "From Morocco to the rest of the world.",
    discover: "Discover",
    back: "Back",
  },
  ar: {
    topBanner: "أول منظومة رقمية أخلاقية مخصصة للاقتصاد المحلي",
    h1Line1: "نحوّل",
    h1Line2: "كل معاملة",
    h1Line3: "إلى أثرٍ إيجابي",
    lede: "براعة الضيافة المغربية والفنون والمطبخ، مجتمعةً في منصة أخلاقية تخدم المهنيين في جميع أنحاء المملكة المغربية.",
    btnJoin: "انضم إلى الحركة",
    modelEyebrow: "نموذج مقلوب",
    modelTitleA: "الأخلاق",
    modelTitleEm: "ليست",
    modelTitleB: "خياراً.",
    modelTitleC: "إنها النموذج.",
    modelP1: "يقوم One World Morocco على قناعة بسيطة: القيمة التي يخلقها المهنيون المغاربة يجب أن تعود إليهم. لقد ألغينا العمولة على كل معاملة واستبدلناها باشتراك شهري شفاف.",
    modelP2: "يلتحق أصحاب الفنادق والمطاعم وشركات النقل وفاعلو الضيافة من كل أنحاء المملكة المغربية بواجهة مشتركة، من المغرب إلى بقية العالم — دون وسطاء متغوّلين.",
    compareOwmVal: "0 عمولة",
    compareThemVal: "حتى 25%",
    videoTag: "موجَّهة لقضايا إنسانية في المغرب",
    citiesEyebrow: "المدن الرائدة",
    citiesTitleA: "حيث يبدأ",
    citiesTitleEm: "كل شيء",
    citiesSub: "ينتشر المشروع الآن في جميع أنحاء المملكة المغربية.",
    cityLabel: "مدينة رائدة",
    citiesKingdom: "من المغرب إلى بقية العالم.",
    discover: "اكتشف",
    back: "رجوع",
  },
} as const;

const SCREENS = 3;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const Corporate = () => {
  const { language } = useLanguage();
  const L = (LABELS as any)[language] ?? LABELS.fr;
  const navigate = useLocalizedNavigate();

  useSEO({
    title: "Un concept local et solidaire — One World Morocco",
    description:
      "Zéro commission, abonnement transparent et 20% reversés à des causes humanitaires : le modèle éthique de One World Morocco.",
    canonical: "/corporate",
  });

  const [progress, setProgress] = useState(0); // 0 → 2 (index d'écran continu)
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const sectionRef = useRef<HTMLElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const modelVideoRef = useRef<HTMLVideoElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchYRef = useRef<number | null>(null);

  useEffect(() => {
    const mqO = window.matchMedia("(max-aspect-ratio: 1/1)");
    const mqM = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onO = () => setIsPortrait(mqO.matches);
    const onM = () => setReduced(mqM.matches);
    mqO.addEventListener("change", onO);
    mqM.addEventListener("change", onM);
    return () => {
      mqO.removeEventListener("change", onO);
      mqM.removeEventListener("change", onM);
    };
  }, []);

  // Safari iOS peut différer l'autoplay malgré muted + playsInline.
  useEffect(() => {
    const retry = () => {
      const v = bgVideoRef.current;
      if (v?.paused) void v.play().catch(() => undefined);
    };
    retry();
    document.addEventListener("touchstart", retry, { passive: true, once: true });
    document.addEventListener("click", retry, { once: true });
    return () => {
      document.removeEventListener("touchstart", retry);
      document.removeEventListener("click", retry);
    };
  }, [isPortrait]);

  const setTarget = useCallback(
    (v: number) => {
      targetRef.current = clamp(v, 0, SCREENS - 1);
      if (reduced) {
        currentRef.current = targetRef.current;
        setProgress(targetRef.current);
        return;
      }
      if (rafRef.current !== null) return;
      const tick = () => {
        currentRef.current += (targetRef.current - currentRef.current) * 0.24;
        if (Math.abs(targetRef.current - currentRef.current) < 0.002) {
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
    [reduced],
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setTarget(targetRef.current + (e.deltaY > 0 ? 1 : -1) * 0.55);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (y === null || touchYRef.current === null) return;
      e.preventDefault();
      setTarget(targetRef.current + (touchYRef.current - y) / 320);
      touchYRef.current = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setTarget(Math.round(targetRef.current) + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setTarget(Math.round(targetRef.current) - 1);
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

  // Vidéo du modèle (écran 2) : lecture uniquement quand l'écran est visible.
  const [modelPlaying, setModelPlaying] = useState(true);
  const [modelMuted, setModelMuted] = useState(true);
  useEffect(() => {
    const v = modelVideoRef.current;
    if (!v) return;
    const visible = Math.abs(progress - 1) < 0.5;
    if (visible && modelPlaying) void v.play().catch(() => undefined);
    else v.pause();
  }, [progress, modelPlaying]);

  const layer = (index: number) => {
    const d = progress - index;
    const opacity = clamp(1 - Math.abs(d) * 1.6, 0, 1);
    const active = Math.abs(d) < 0.45;
    return {
      opacity,
      transform: reduced ? undefined : `translateY(${d * -48}px)`,
      pointerEvents: active ? ("auto" as const) : ("none" as const),
      transition: reduced ? "none" : undefined,
      ariaHidden: !active,
    };
  };

  const s1 = layer(0);
  const s2 = layer(1);
  const s3 = layer(2);
  const current = Math.round(progress);

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section
        ref={sectionRef}
        className="relative h-[100dvh] min-h-[560px] w-full touch-none overflow-hidden bg-[hsl(0_0%_4%)]"
      >
        {/* Vidéo de fond (desktop / mobile) — reprise de la homepage */}
        <video
          ref={bgVideoRef}
          key={isPortrait ? "portrait" : "landscape"}
          className="absolute inset-0 h-full w-full object-cover"
          src={isPortrait ? portraitVideoAsset.url : landscapeVideoAsset.url}
          poster={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{ filter: `brightness(${1 - clamp(progress / (SCREENS - 1), 0, 1) * 0.4})` }}
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.62) 0%, rgba(6,5,4,.48) 35%, rgba(6,5,4,.74) 75%, rgba(6,5,4,.92) 100%)",
          }}
        />

        {/* ============ Écran 1 — Hero ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-24 pb-24 md:px-12"
          style={{ opacity: s1.opacity, transform: s1.transform, pointerEvents: s1.pointerEvents }}
          aria-hidden={s1.ariaHidden}
        >
          <img
            src={phoneMockupAsset.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[3%] top-1/2 hidden h-[58%] w-auto -translate-y-1/2 lg:block"
          />
          <p
            className="mb-6 max-w-3xl text-center text-[13px] font-medium uppercase tracking-[0.18em] text-white/85 md:text-[16px] md:tracking-[0.22em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {L.topBanner}
          </p>
          <h1
            className="max-w-4xl text-center text-[26px] leading-[1.2] text-[#F4ECDF] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {L.h1Line1}
            <br />
            {L.h1Line2}
            <br />
            <span className="font-bold text-[#C6A046]">{L.h1Line3}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white md:text-[1.125rem]">
            {L.lede}
          </p>
          <button
            type="button"
            onClick={() => navigate("/join")}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {L.btnJoin}
          </button>
        </div>

        {/* ============ Écran 2 — L'éthique n'est pas une option ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s2.opacity, transform: s2.transform, pointerEvents: s2.pointerEvents }}
          aria-hidden={s2.ariaHidden}
        >
          <div className="grid max-h-full w-full max-w-6xl items-center gap-6 overflow-y-auto md:grid-cols-2 md:gap-12">
            <div>
              <span
                className="block text-[12px] uppercase tracking-[0.42em] text-[#C6A046]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {L.modelEyebrow}
              </span>
              <h2
                className="mt-4 text-[clamp(24px,4vw,44px)] leading-[1.12] text-[#F4ECDF]"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                {L.modelTitleA} <em className="italic text-[#C04F17]">{L.modelTitleEm}</em>{" "}
                {L.modelTitleB}
                <br />
                {L.modelTitleC}
              </h2>
              <p className="mt-4 hidden font-roboto text-[15px] leading-[1.8] text-white/90 md:block">
                {L.modelP1}
              </p>
              <p className="mt-3 hidden font-roboto text-[15px] leading-[1.8] text-white/80 lg:block">
                {L.modelP2}
              </p>
              <div className="mt-5 border-t border-[rgba(198,160,70,.34)]">
                <div className="flex items-baseline justify-between border-b border-[rgba(198,160,70,.2)] py-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                    One World Morocco
                  </span>
                  <span
                    className="text-[19px] text-[#C04F17]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {L.compareOwmVal}
                  </span>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                    Booking · Airbnb · Expedia
                  </span>
                  <span
                    className="text-[19px] text-white/40 line-through"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {L.compareThemVal}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl">
                <video
                  ref={modelVideoRef}
                  src={MODEL_VIDEO_URL}
                  poster={MODEL_VIDEO_POSTER}
                  muted={modelMuted}
                  loop
                  playsInline
                  preload="metadata"
                  className="block max-h-[46vh] w-full object-cover"
                />
                <div className="absolute bottom-3 left-1/2 z-[3] flex -translate-x-1/2 gap-3">
                  <button
                    type="button"
                    aria-label="Play/Pause"
                    onClick={() => setModelPlaying((p) => !p)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                  >
                    {modelPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" />
                        <rect x="14" y="5" width="4" height="14" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Mute/Unmute"
                    onClick={() => setModelMuted((m) => !m)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.04v7.91A4.5 4.5 0 0 0 16.5 12z" />
                      {modelMuted && (
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[rgba(198,160,70,.34)] bg-black/40 px-4 py-3 backdrop-blur md:absolute md:-left-6 md:bottom-8 md:mt-0 md:max-w-[240px] md:flex-col md:items-start">
                <b
                  className="text-2xl text-[#C6A046]"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  20%
                </b>
                <small className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                  {L.videoTag}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Écran 3 — Là où tout commence ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-20 pb-24 text-center md:px-12"
          style={{ opacity: s3.opacity, transform: s3.transform, pointerEvents: s3.pointerEvents }}
          aria-hidden={s3.ariaHidden}
        >
          <span
            className="block text-[12px] uppercase tracking-[0.42em] text-[#C6A046]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {L.citiesEyebrow}
          </span>
          <h2
            className="mt-5 text-[clamp(28px,4.6vw,56px)] leading-[1.1] text-[#F4ECDF]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {L.citiesTitleA} <em className="italic text-[#C04F17]">{L.citiesTitleEm}</em>.
          </h2>
          <p className="mt-4 max-w-xl font-roboto text-[15px] text-white/85">{L.citiesSub}</p>

          <div className="mt-8 flex flex-col items-center gap-6 md:flex-row md:gap-0">
            {["Marrakech", "Essaouira"].map((city, i) => (
              <div key={city} className="flex items-center">
                {i === 1 && (
                  <span
                    aria-hidden
                    className="hidden h-[110px] w-px bg-[rgba(198,160,70,.34)] md:block"
                  />
                )}
                <div className="px-0 md:px-[70px]">
                  <div
                    className="text-[clamp(34px,5vw,68px)] leading-none text-[#F4ECDF]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {city}
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.32em] text-[#C6A046]">
                    {L.cityLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p
            className="mt-10 italic text-white/75"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {L.citiesKingdom}
          </p>
        </div>

        {/* ============ CTA Découvrir / Revenir — chevron Gold, tous devices ============ */}
        <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-center gap-10">
          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) - 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{
              opacity: current > 0 ? 1 : 0,
              pointerEvents: current > 0 ? "auto" : "none",
            }}
            tabIndex={current > 0 ? 0 : -1}
            aria-hidden={current === 0}
          >
            <ChevronUp className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
              {L.back}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) + 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{
              opacity: current < SCREENS - 1 ? 1 : 0,
              pointerEvents: current < SCREENS - 1 ? "auto" : "none",
            }}
            tabIndex={current < SCREENS - 1 ? 0 : -1}
            aria-hidden={current === SCREENS - 1}
          >
            <ChevronDown className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
              {L.discover}
            </span>
          </button>
        </div>
      </section>
      <Footer variant="verified" />
    </>
  );
};

export default Corporate;
