import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
// @ts-ignore - raw imports provided by Vite
import corporateCss from "./corporate.scoped.css?raw";
// @ts-ignore
import corporateBody from "./corporate.body.html?raw";
import { useLanguage } from "@/contexts/LanguageContext";

const LABELS = {
  fr: {
    topBanner: "Le premier écosystème numérique éthique dédié à l'économie locale",
    h1Line1: "Transformons",
    h1Line2: "chaque transaction",
    h1Line3: "en impact POSITIF",
    lede: "L'excellence de l'hospitalité, de la gastronomie et de l'art de vivre marocains, réunie sur une plateforme éthique au service des professionnels de tout le Royaume du Maroc.",
    btnJoin: "Rejoindre le mouvement",
    pillar1Title: "Zéro Commission",
    pillar1Body: "Aucune commission prélevée sur vos transactions. Vous gardez l'intégralité de votre chiffre d'affaires.",
    pillar2Title: "Abonnement Mensuel",
    pillar2Body: "Un abonnement clair et prévisible, là où les plateformes classiques prélèvent jusqu'à 25%.",
    pillar3Title: "20% Reversés",
    pillar3Body: "20% de chaque abonnement sont reversés, via séquestre bancaire, à des causes humanitaires au Maroc.",
    modelEyebrow: "Un modèle inversé",
    modelTitle: "L'éthique <em>n'est pas</em> une option.<br>C'est le modèle.",
    modelP1: "One World Morocco repose sur une conviction simple : la valeur créée par les professionnels marocains doit leur revenir. Nous avons supprimé la commission par transaction et l'avons remplacée par un <span class=\"hl\">abonnement mensuel transparent</span>.",
    modelP2: "Hôteliers, restaurateurs, transporteurs et acteurs de l'hospitalité de tout le Royaume du Maroc rejoignent une vitrine commune, du Maroc vers le reste du Monde — sans intermédiaire prédateur.",
    compareOwmVal: "0 commission",
    compareThemVal: "jusqu'à 25%",
    ariaPlay: "Play/Pause",
    ariaMute: "Mute/Unmute",
    videoTag: "Reversés à des causes humanitaires au Maroc",
    citiesEyebrow: "Villes Pionnières",
    citiesTitle: "Là où tout <em>commence</em>.",
    citiesSub: "Le déploiement rayonne désormais sur tout le Royaume du Maroc.",
    cityLabel: "Ville Pionnière",
    citiesKingdom: "Du Maroc vers le reste du Monde.",
  },
  en: {
    topBanner: "The first ethical digital ecosystem dedicated to the local economy",
    h1Line1: "Turning",
    h1Line2: "every transaction",
    h1Line3: "into POSITIVE impact",
    lede: "The excellence of Moroccan hospitality, gastronomy and art de vivre, united on an ethical platform serving professionals across the Kingdom of Morocco.",
    btnJoin: "Join the movement",
    pillar1Title: "Zero Commission",
    pillar1Body: "No commission taken on your transactions. You keep 100% of your revenue.",
    pillar2Title: "Monthly Subscription",
    pillar2Body: "A clear, predictable subscription — where legacy platforms take up to 25%.",
    pillar3Title: "20% Donated",
    pillar3Body: "20% of every subscription is placed in escrow and donated to humanitarian causes in Morocco.",
    modelEyebrow: "An inverted model",
    modelTitle: "Ethics <em>is not</em> optional.<br>It is the model.",
    modelP1: "One World Morocco is built on a simple conviction: the value created by Moroccan professionals should stay with them. We replaced per-transaction commissions with a <span class=\"hl\">transparent monthly subscription</span>.",
    modelP2: "Hoteliers, restaurateurs, transporters and hospitality actors from across the Kingdom of Morocco join a shared showcase, from Morocco to the rest of the world — without predatory intermediaries.",
    compareOwmVal: "0 commission",
    compareThemVal: "up to 25%",
    ariaPlay: "Play/Pause",
    ariaMute: "Mute/Unmute",
    videoTag: "Donated to humanitarian causes in Morocco",
    citiesEyebrow: "Pioneer Cities",
    citiesTitle: "Where it all <em>begins</em>.",
    citiesSub: "The rollout now extends across the entire Kingdom of Morocco.",
    cityLabel: "Pioneer City",
    citiesKingdom: "From Morocco to the rest of the world.",
  },
  ar: {
    topBanner: "أول منظومة رقمية أخلاقية مخصصة للاقتصاد المحلي",
    h1Line1: "نحوّل",
    h1Line2: "كل معاملة",
    h1Line3: "إلى أثرٍ إيجابي",
    lede: "براعة الضيافة المغربية والفنون والمطبخ، مجتمعةً في منصة أخلاقية تخدم المهنيين في جميع أنحاء المملكة المغربية.",
    btnJoin: "انضم إلى الحركة",
    pillar1Title: "صفر عمولة",
    pillar1Body: "لا تُقتطع أي عمولة من معاملاتك. أنت تحتفظ بكامل رقم أعمالك.",
    pillar2Title: "اشتراك شهري",
    pillar2Body: "اشتراك واضح وثابت، في حين تأخذ المنصات التقليدية ما يصل إلى 25%.",
    pillar3Title: "20% موجَّهة للخير",
    pillar3Body: "يُودَع 20% من كل اشتراك في ضمان بنكي ويُخصَّص لقضايا إنسانية في المغرب.",
    modelEyebrow: "نموذج مقلوب",
    modelTitle: "الأخلاق <em>ليست</em> خياراً.<br>إنها النموذج.",
    modelP1: "يقوم One World Morocco على قناعة بسيطة: القيمة التي يخلقها المهنيون المغاربة يجب أن تعود إليهم. لقد ألغينا العمولة على كل معاملة واستبدلناها <span class=\"hl\">باشتراك شهري شفاف</span>.",
    modelP2: "يلتحق أصحاب الفنادق والمطاعم وشركات النقل وفاعلو الضيافة من كل أنحاء المملكة المغربية بواجهة مشتركة، من المغرب إلى بقية العالم — دون وسطاء متغوّلين.",
    compareOwmVal: "0 عمولة",
    compareThemVal: "حتى 25%",
    ariaPlay: "تشغيل/إيقاف",
    ariaMute: "صوت/كتم",
    videoTag: "موجَّهة لقضايا إنسانية في المغرب",
    citiesEyebrow: "المدن الرائدة",
    citiesTitle: "حيث يبدأ كل شيء.",
    citiesSub: "ينتشر المشروع الآن في جميع أنحاء المملكة المغربية.",
    cityLabel: "مدينة رائدة",
    citiesKingdom: "من المغرب إلى بقية العالم.",
  },
} as const;

const Corporate = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const L = LABELS[language] ?? LABELS.fr;

  // Intercept internal-link clicks → React Router navigation.
  // Keep anchor (#id) clicks for smooth-scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#")) {
        e.preventDefault();
        const id = href.slice(1);
        const el = id ? document.getElementById(id) : null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Internal route (starts with "/" and not "//")
      if (href.startsWith("/") && !href.startsWith("//")) {
        e.preventDefault();
        navigate(href);
      }
    };

    root.addEventListener("click", onClick);

    // Reveal-on-scroll for .reveal elements (mirrors the original script).
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            (x.target as HTMLElement).classList.add("in");
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.14 },
    );
    root.querySelectorAll<HTMLElement>(".reveal").forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(el);
    });

    // Parallax on hero bg — desktop image + mobile phone mockup + section bg + mouse parallax
    const heroBg = root.querySelector<HTMLImageElement>(".hero .bg-img-desktop");
    const heroBgMobile = root.querySelector<HTMLImageElement>(".hero .bg-img-mobile");
    const heroSection = root.querySelector<HTMLElement>(".hero");
    let cleanupParallax: (() => void) | undefined;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const onScroll = () => {
        const y = window.scrollY;
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (window.innerWidth < 1024) {
          if (heroBgMobile) heroBgMobile.style.transform = `scale(.95) translate3d(0, ${y * -0.35}px, 0)`;
          if (heroSection) heroSection.style.backgroundPosition = `center calc(50% + ${y * 0.4}px)`;
        }
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanupParallax = () => window.removeEventListener("scroll", onScroll);
    } else {
      let mx = 0, my = 0, tx = 0, ty = 0, sy = 0, ticking = false;
      let raf = 0;
      const update = () => {
        raf = 0;
        const y = window.scrollY;
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (window.innerWidth < 1024) {
          if (heroBgMobile) heroBgMobile.style.transform = `scale(.95) translate3d(0, ${y * -0.35}px, 0)`;
          if (heroSection) heroSection.style.backgroundPosition = `center calc(50% + ${y * 0.4}px)`;
        }

        tx += (mx - tx) * 0.08;
        ty += (my - ty) * 0.08;
        if (heroSection) {
          heroSection.style.setProperty("--mx", tx.toFixed(3));
          heroSection.style.setProperty("--my", ty.toFixed(3));
          heroSection.style.setProperty("--sy", sy.toFixed(3));
        }
        if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
          raf = requestAnimationFrame(update);
        } else {
          ticking = false;
        }
      };
      const kick = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(update); } };
      const onMove = (e: MouseEvent) => {
        if (!heroSection) return;
        const r = heroSection.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
      };
      const onLeave = () => { mx = 0; my = 0; kick(); };
      const onScroll = () => {
        if (!heroSection) return;
        const r = heroSection.getBoundingClientRect();
        sy = Math.max(-1, Math.min(1, -r.top / r.height));
        kick();
      };
      heroSection?.addEventListener("mousemove", onMove);
      heroSection?.addEventListener("mouseleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
      update();
      cleanupParallax = () => {
        heroSection?.removeEventListener("mousemove", onMove);
        heroSection?.removeEventListener("mouseleave", onLeave);
        window.removeEventListener("scroll", onScroll);
        if (raf) cancelAnimationFrame(raf);
      };
    }

    return () => {
      root.removeEventListener("click", onClick);
      io.disconnect();
      cleanupParallax?.();
    };
  }, [navigate]);

  const localizedBody = corporateBody
    .replace("{{HERO_DESKTOP_URL}}", originalHeroAsset.url)
    .replace("{{TOP_BANNER}}", L.topBanner)
    .replace("{{H1_LINE1}}", L.h1Line1)
    .replace("{{H1_LINE2}}", L.h1Line2)
    .replace("{{H1_LINE3}}", L.h1Line3)
    .replace("{{LEDE}}", L.lede)
    .replace("{{BTN_JOIN}}", L.btnJoin)
    .replace("{{PILLAR1_TITLE}}", L.pillar1Title)
    .replace("{{PILLAR1_BODY}}", L.pillar1Body)
    .replace("{{PILLAR2_TITLE}}", L.pillar2Title)
    .replace("{{PILLAR2_BODY}}", L.pillar2Body)
    .replace("{{PILLAR3_TITLE}}", L.pillar3Title)
    .replace("{{PILLAR3_BODY}}", L.pillar3Body)
    .replace("{{MODEL_EYEBROW}}", L.modelEyebrow)
    .replace("{{MODEL_TITLE}}", L.modelTitle)
    .replace("{{MODEL_P1}}", L.modelP1)
    .replace("{{MODEL_P2}}", L.modelP2)
    .replace("{{COMPARE_OWM_VAL}}", L.compareOwmVal)
    .replace("{{COMPARE_THEM_VAL}}", L.compareThemVal)
    .replace("{{ARIA_PLAY}}", L.ariaPlay)
    .replace("{{ARIA_MUTE}}", L.ariaMute)
    .replace("{{VIDEO_TAG}}", L.videoTag)
    .replace("{{CITIES_EYEBROW}}", L.citiesEyebrow)
    .replace("{{CITIES_TITLE}}", L.citiesTitle)
    .replace("{{CITIES_SUB}}", L.citiesSub)
    .replaceAll("{{CITY_LABEL}}", L.cityLabel)
    .replace("{{CITIES_KINGDOM}}", L.citiesKingdom);

  return (
    <>
      <HomeMindtripHeader />
      <div
        ref={rootRef}
        className="corp-page"
        style={{
          ["--hero-img-desktop" as any]: `url("${originalHeroAsset.url}")`,
          ["--hero-img-tablet" as any]: `url("${zelligeBrunAsset.url}")`,
          ["--hero-img-mobile" as any]: `url("${koutoubiaVerticalBgAsset.url}")`,
          ["--hero-phone-mockup" as any]: `url("${phoneMockupAsset.url}")`,
          ["--hero-phone-mockup-tablet" as any]: `url("${iphoneTabletMockupAsset.url}")`,
        }}
      >
        <style>{corporateCss}</style>
        <div dangerouslySetInnerHTML={{ __html: localizedBody }} />
      </div>
      <Footer variant="verified" />
    </>
  );
};


export default Corporate;
