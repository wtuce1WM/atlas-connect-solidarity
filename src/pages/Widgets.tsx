import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  MapPin,
  CloudSun,
  Waves,
  Star,
  ThumbsUp,
  Mail,
  LayoutPanelTop,
  Newspaper,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import { useDragScroll } from "@/hooks/useDragScroll";

const SITE = "https://oneworldmorocco.com";
const DEMO_SLUG = "riad-dar-najat";

/**
 * Les aperçus in-page sont chargés en URL RELATIVE : ils sont donc toujours
 * résolus sur le document courant (preview comme prod), sans dépendre du
 * domaine public ni d'une éventuelle restriction d'iframe cross-origin.
 */
const toPreview = (url: string) => url.replace(SITE, "");


const SCREENS = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ---------------- Widgets secondaires (03 → 09) ---------------- */

type SmallWidget = {
  n: number;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  price: string;
  url: string;
  height: number;
};

const SMALL_WIDGETS: SmallWidget[] = [
  {
    n: 3,
    icon: <CloudSun className="h-5 w-5" />,
    title: "Météo",
    tagline: "La météo d'une ville marocaine, en direct et sans clé API.",
    price: "Gratuit",
    url: `${SITE}/embed/weather?city=Marrakech&lang=fr&bg=transparent`,
    height: 420,
  },
  {
    n: 4,
    icon: <Waves className="h-5 w-5" />,
    title: "Marées, Vents & Météo",
    tagline: "Marées, vents, prévisions et alertes pour les 19 villes côtières du Maroc.",
    price: "Gratuit",
    url: `${SITE}/embed/tides?city=essaouira&lang=fr&picker=1&bg=transparent`,
    height: 560,
  },
  {
    n: 5,
    icon: <Star className="h-5 w-5" />,
    title: "Avis clients",
    tagline: "Vos notes Google, TripAdvisor et Booking réunies dans un bloc élégant.",
    price: "Prix : sur devis",
    url: `${SITE}/embed/reviews/${DEMO_SLUG}?platform=all&lang=fr&bg=transparent`,
    height: 520,
  },
  {
    n: 6,
    icon: <ThumbsUp className="h-5 w-5" />,
    title: "Laisser un avis",
    tagline: "Un bloc qui transforme un client satisfait en avis public.",
    price: "Prix : sur devis",
    url: `${SITE}/embed/avis/${DEMO_SLUG}?platform=all&lang=fr&variant=card&bg=transparent`,
    height: 380,
  },
  {
    n: 7,
    icon: <Mail className="h-5 w-5" />,
    title: "Signature email « Laisser un avis »",
    tagline: "Version email statique, compatible Gmail, Outlook et Apple Mail.",
    price: "Inclus dans l'abonnement",
    url: "",
    height: 300,
  },
  {
    n: 8,
    icon: <LayoutPanelTop className="h-5 w-5" />,
    title: "Votre ID numérique (type Linktree)",
    tagline: "Tous vos canaux numériques rassemblés au même endroit.",
    price: "Prix : sur devis",
    url: `${SITE}/b/${DEMO_SLUG}?embed=1&lang=fr`,
    height: 720,
  },
];

const EMAIL_SIGNATURE_HTML = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;max-width:420px">
  <tr>
    <td style="padding:14px 16px;background:#111111;border-radius:12px;color:#ffffff">
      <div style="font-size:15px;font-weight:bold;color:#ffffff">Riad Dar Najat</div>
      <div style="font-size:14px;color:#ffffff;padding-top:4px">Votre avis compte pour nous</div>
      <div style="font-size:12px;color:#cccccc;padding-top:2px">Un mot sur votre expérience aide énormément notre équipe.</div>
      <div style="padding-top:10px">
        <span style="display:inline-block;background:#25D366;color:#ffffff;font-size:13px;font-weight:bold;padding:9px 16px;border-radius:8px">Laisser un avis ★★★★★</span>
      </div>
      <div style="font-size:10px;color:#888888;padding-top:8px">oneworldmorocco.com</div>
    </td>
  </tr>
</table>`;

const COMPATIBLE: [string, string][] = [
  ["WordPress", "Bloc « HTML personnalisé » ou plugin iframe"],
  ["Wix / Wix Studio", "Élément « Intégrer un code » / HTML iframe"],
  ["Squarespace", "Bloc Code (plans Business et supérieurs)"],
  ["Webflow", "Composant Embed"],
  ["Shopify", "Section / page en HTML personnalisé"],
  ["Framer", "Composant Embed (iframe)"],
  ["Duda, Jimdo, Site123", "Widget HTML / iframe"],
  ["Ghost", "Carte HTML"],
  ["Drupal, Joomla, PrestaShop", "Bloc HTML libre"],
  ["HubSpot CMS", "Module HTML riche"],
  ["Notion (pages publiées)", "Bloc Embed via URL"],
  ["Google Sites", "Insérer > Intégrer > par URL"],
  ["Site sur-mesure (React, Vue, HTML statique…)", "Balise iframe classique"],
];

const INCOMPATIBLE: [string, string][] = [
  ["Claude Artifacts / sandbox IA", "CSP du bac à sable qui bloque tout iframe tiers"],
  ["Wix Free (ADI sans code)", "Bloc HTML indisponible sans plan payant"],
  ["Squarespace Personal", "Bloc Code réservé aux plans supérieurs"],
  ["WordPress.com gratuit / Personal", "HTML arbitraire désactivé"],
  ["Facebook, Instagram, TikTok, LinkedIn", "Pas de HTML dans les publications"],
  ["Google Docs, Slides, Gmail, newsletters", "Les clients e-mail ignorent les iframes"],
  ["Medium, Substack (corps d'article)", "Embeds limités à une liste blanche"],
  ["Amazon, marketplaces, Airbnb, Booking", "HTML tiers interdit par les CGU"],
  ["Applications mobiles natives", "Nécessite une WebView, pas un iframe"],
  ["Sites en CSP stricte sans frame-src", "L'administrateur doit autoriser oneworldmorocco.com"],
];

const glass =
  "rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]";

const PriceTag = ({ price }: { price: string }) =>
  price === "Gratuit" ? (
    <span className="rounded-full bg-[#25D366] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-black">
      Gratuit
    </span>
  ) : (
    <span className="rounded-full border border-[#C6A046]/60 bg-[#C6A046]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E4C877]">
      {price}
    </span>
  );

/** Aperçu de widget sur fond transparent, sans cadre opaque. */
const WidgetFrame = ({ src, title, height }: { src: string; title: string; height: number }) => (
  <div className="overflow-hidden rounded-2xl border border-white/12 bg-transparent">
    <iframe
      src={toPreview(src)}
      title={title}
      loading="lazy"
      style={{ width: "100%", height, border: 0, background: "transparent" }}
    />
  </div>
);

const Widgets = () => {
  const navigate = useLocalizedNavigate();
  useSEO({
    title: "Widgets & iframes One World Morocco à intégrer",
    description:
      "Assistant IA vocal, carte des adresses à proximité, météo, marées, avis clients : intégrez les widgets One World Morocco sur votre site.",
    canonical: "/widgets",
    ogImage: `${SITE}/og/widgets.jpg`,
  });

  const [progress, setProgress] = useState(0);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const sectionRef = useRef<HTMLElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchYRef = useRef<number | null>(null);
  const wheelLockedRef = useRef(false);
  const wheelUnlockRef = useRef<number | null>(null);
  const carouselRef = useDragScroll<HTMLDivElement>();
  const preWheelLeftRef = useRef<number | null>(null);

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
        currentRef.current += (targetRef.current - currentRef.current) * 0.035;
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

    /** Un geste initié dans une zone scrollable (aperçu, carrousel) lui appartient. */
    const insideScrollable = (target: EventTarget | null, axis: "x" | "y") => {
      let n = target as HTMLElement | null;
      while (n && n !== el) {
        if (axis === "x" && n.scrollWidth - n.clientWidth > 4) return n;
        if (axis === "y" && n.scrollHeight - n.clientHeight > 4) return n;
        n = n.parentElement;
      }
      return null;
    };

    const onWheelCapture = (e: WheelEvent) => {
      const car = carouselRef.current;
      preWheelLeftRef.current = car ? car.scrollLeft : null;
      void e;
    };

    const onWheel = (e: WheelEvent) => {
      const scroller = insideScrollable(e.target, "y");
      if (scroller) return; // laisser défiler le contenu interne
      const car = carouselRef.current;
      if (car && car.contains(e.target as Node)) {
        const before = preWheelLeftRef.current;
        const max = car.scrollWidth - car.clientWidth;
        const atEdge = before !== null && (e.deltaY > 0 ? before >= max - 2 : before <= 2);
        if (!atEdge) {
          e.preventDefault();
          car.scrollLeft = clamp(car.scrollLeft + e.deltaY, 0, max);
          return;
        }
      }
      e.preventDefault();
      if (wheelLockedRef.current || Math.abs(e.deltaY) < 8) return;
      wheelLockedRef.current = true;
      setTarget(Math.round(targetRef.current) + (e.deltaY > 0 ? 1 : -1));
      wheelUnlockRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false;
        wheelUnlockRef.current = null;
      }, 1400);
    };

    const onTouchStart = (e: TouchEvent) => {
      const car = carouselRef.current;
      if (car && car.contains(e.target as Node)) {
        touchYRef.current = null;
        return;
      }
      if (insideScrollable(e.target, "y")) {
        touchYRef.current = null;
        return;
      }
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
    el.addEventListener("wheel", onWheelCapture, { capture: true, passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheelCapture, { capture: true } as any);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      if (wheelUnlockRef.current !== null) {
        window.clearTimeout(wheelUnlockRef.current);
        wheelUnlockRef.current = null;
      }
    };
  }, [setTarget]);

  const layer = (index: number) => {
    const d = progress - index;
    const opacity = clamp(1 - Math.abs(d) * 1.6, 0, 1);
    const active = Math.abs(d) < 0.45;
    return {
      opacity,
      transform: reduced ? undefined : `translateY(${d * -48}px)`,
      pointerEvents: active ? ("auto" as const) : ("none" as const),
      ariaHidden: !active,
    };
  };

  const s = [0, 1, 2, 3, 4, 5].map(layer);
  const current = Math.round(progress);

  const askUrl = `${SITE}/embed/ask/${DEMO_SLUG}?lang=fr&bg=transparent`;
  const nearbyUrl = `${SITE}/embed/nearby/${DEMO_SLUG}?lang=fr&bg=transparent`;

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section
        ref={sectionRef}
        className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)]"
      >
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
          style={{ filter: `brightness(${1 - clamp(progress / (SCREENS - 1), 0, 1) * 0.45})` }}
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.66) 0%, rgba(6,5,4,.5) 35%, rgba(6,5,4,.76) 75%, rgba(6,5,4,.93) 100%)",
          }}
        />

        {/* ============ Écran 1 — Hero ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-24 pb-24 text-center md:px-12"
          style={{ opacity: s[0].opacity, transform: s[0].transform, pointerEvents: s[0].pointerEvents }}
          aria-hidden={s[0].ariaHidden}
        >
          <p
            className="mb-6 text-[12px] font-medium uppercase tracking-[0.32em] text-[#C6A046] md:text-[14px]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Écosystème ouvert
          </p>
          <h1
            className="max-w-4xl text-[28px] leading-[1.15] text-[#F4ECDF] sm:text-[2.4rem] md:text-[3.2rem]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            Les widgets <span className="font-bold text-[#C6A046]">One World Morocco</span>
          </h1>
          <p className="mt-5 max-w-2xl font-roboto text-[15px] leading-relaxed text-white/90 md:text-[1.06rem]">
            Assistant IA vocal, carte des adresses à proximité, météo, marées, avis clients, ID numérique :
            chaque brique de la plateforme s'intègre à votre site depuis une URL publique. Aucune installation,
            aucune clé API, aucune maintenance — les données restent synchronisées en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setTarget(1)}
              className="inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Voir les widgets
            </button>
            <button
              type="button"
              onClick={() => setTarget(SCREENS - 1)}
              className="inline-flex items-center gap-3 rounded-full border border-[#C6A046]/70 bg-[#C6A046]/10 px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#E4C877] backdrop-blur-md transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Intégration sur mesure
            </button>
          </div>
        </div>

        {/* ============ Écran 2 — Widget 01 Assistant IA & Vocal ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-24 pb-24 md:px-10"
          style={{ opacity: s[1].opacity, transform: s[1].transform, pointerEvents: s[1].pointerEvents }}
          aria-hidden={s[1].ariaHidden}
        >
          <div className="grid max-h-full w-full max-w-6xl gap-6 overflow-y-auto scrollbar-hide md:grid-cols-[1fr_minmax(300px,420px)] md:items-center md:gap-10">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C6A046]/15 text-[#E4C877]">
                  <Bot className="h-5 w-5" />
                </span>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C6A046]"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Widget 01
                </span>
                <PriceTag price="Prix : sur devis" />
              </div>
              <h2
                className="mt-4 text-[clamp(24px,3.6vw,42px)] leading-[1.12] text-[#F4ECDF]"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                Assistant <span className="font-bold text-[#C6A046]">IA & Vocal</span>
              </h2>
              <p className="mt-3 font-roboto text-[15px] leading-relaxed text-white/90 md:text-[17px]">
                Un conseiller local intelligent, greffé à votre page. Il répond au clavier comme au micro,
                illustre chaque adresse citée en vidéo verticale immersive, et garde toutes les fonctions de
                l'App : carte, itinéraires, réservation.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  ["Vocal", "Question au micro, réponse lue à voix haute"],
                  ["Vidéos immersives", "Chaque adresse s'anime en vidéo verticale"],
                  ["Inspirationnel", "Suggestions et relances, pas des listes"],
                  ["L'App dans l'embed", "Carte, itinéraires et réservation actifs"],
                ].map(([k, v]) => (
                  <li key={k} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-md">
                    <div className="text-[13px] font-bold text-[#E4C877]">{k}</div>
                    <div className="mt-0.5 font-roboto text-[12.5px] leading-snug text-white/80">{v}</div>
                  </li>
                ))}
              </ul>
              <a
                href={toPreview(askUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 font-roboto text-sm text-[#E4C877] hover:underline"
              >
                Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className={`${glass} p-3`}>
              <WidgetFrame src={askUrl} title="Assistant IA & Vocal One World Morocco" height={560} />
            </div>
          </div>
        </div>

        {/* ============ Écran 3 — Widget 02 Map & App ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-24 pb-24 md:px-10"
          style={{ opacity: s[2].opacity, transform: s[2].transform, pointerEvents: s[2].pointerEvents }}
          aria-hidden={s[2].ariaHidden}
        >
          <div className="grid max-h-full w-full max-w-6xl gap-6 overflow-y-auto scrollbar-hide md:grid-cols-[minmax(300px,1fr)_1.15fr] md:items-center md:gap-10">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C6A046]/15 text-[#E4C877]">
                  <MapPin className="h-5 w-5" />
                </span>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C6A046]"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Widget 02
                </span>
                <PriceTag price="Prix : sur devis" />
              </div>
              <h2
                className="mt-4 text-[clamp(24px,3.6vw,42px)] leading-[1.12] text-[#F4ECDF]"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                Map & App — <span className="font-bold text-[#C6A046]">adresses à proximité</span>
              </h2>
              <p className="mt-3 font-roboto text-[15px] leading-relaxed text-white/90 md:text-[17px]">
                Les meilleures adresses autour d'un point, sur une carte Google Maps native, en mode vidéos
                immersives. Établissements actifs classés par catégorie, fiches détaillées, itinéraires et
                contact direct — mis à jour automatiquement depuis la base One World Morocco.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  ["1 178", "Marrakech · Imlil · Agafay"],
                  ["339", "Essaouira & littoral"],
                ].map(([n, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-3 text-center backdrop-blur-md"
                  >
                    <div className="text-[26px] font-bold leading-none text-[#E4C877]">{n}</div>
                    <div className="mt-1 font-roboto text-[11px] uppercase tracking-[0.14em] text-white/80">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <a
                href={toPreview(nearbyUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 font-roboto text-sm text-[#E4C877] hover:underline"
              >
                Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className={`${glass} p-3`}>
              <WidgetFrame src={nearbyUrl} title="Adresses à proximité — Riad Dar Najat" height={560} />
            </div>
          </div>
        </div>

        {/* ============ Écran 4 — Widgets 03 → 09 (carrousel horizontal) ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 pt-24 pb-24 md:px-10"
          style={{ opacity: s[3].opacity, transform: s[3].transform, pointerEvents: s[3].pointerEvents }}
          aria-hidden={s[3].ariaHidden}
        >
          <div className="mb-4 text-center">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C6A046]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Widgets 03 → 08

            </span>
            <h2
              className="mt-2 text-[clamp(22px,3.4vw,38px)] leading-[1.12] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              Toute la plateforme, <span className="font-bold text-[#C6A046]">brique par brique</span>
            </h2>
          </div>

          <div
            ref={carouselRef}
            className="flex w-full max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ touchAction: "pan-x" }}
          >
            {SMALL_WIDGETS.map((w) => (
              <article
                key={w.n}
                className={`${glass} w-[calc(100vw-40px)] shrink-0 snap-start p-4 sm:w-[380px] md:w-[400px]`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C6A046]/15 text-[#E4C877]">
                    {w.icon}
                  </span>
                  <span
                    className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[#C6A046]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    Widget {String(w.n).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="mt-3 text-[19px] leading-tight text-[#F4ECDF]"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
                >
                  {w.title}
                </h3>
                <div className="mt-2">
                  <PriceTag price={w.price} />
                </div>
                <p className="mt-3 font-roboto text-[14.5px] leading-relaxed text-white/85">{w.tagline}</p>

                {/* Aucun scroll vertical interne : l'aperçu s'adapte à la hauteur disponible. */}
                <div className="mt-4 overflow-hidden">
                  {w.n === 7 ? (
                    <div
                      className="rounded-2xl border border-white/12 bg-white p-4"
                      dangerouslySetInnerHTML={{ __html: EMAIL_SIGNATURE_HTML }}
                    />
                  ) : (
                    <WidgetFrame src={w.url} title={w.title} height={Math.min(w.height, 340)} />
                  )}
                </div>


                {w.url && (
                  <a
                    href={toPreview(w.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 font-roboto text-[13px] text-[#E4C877] hover:underline"
                  >
                    Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
          <p className="mt-3 font-roboto text-[12px] uppercase tracking-[0.18em] text-white/55">
            Faites défiler horizontalement
          </p>
        </div>

        {/* ============ Écran 5 — Compatibilité des plateformes ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 pt-24 pb-24 md:px-10"
          style={{ opacity: s[4].opacity, transform: s[4].transform, pointerEvents: s[4].pointerEvents }}
          aria-hidden={s[4].ariaHidden}
        >
          <div className="w-full max-w-6xl">
            <h2
              className="text-center text-[clamp(22px,3.4vw,38px)] leading-[1.12] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              Compatibilité des <span className="font-bold text-[#C6A046]">plateformes</span>
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center font-roboto text-[14.5px] leading-relaxed text-white/85">
              La règle est simple : si la plateforme permet d'insérer un code HTML libre, les widgets
              fonctionnent.
            </p>

            <div className="mt-6 grid max-h-[58vh] gap-4 overflow-y-auto scrollbar-hide md:grid-cols-2">
              <div className={`${glass} p-5`}>
                <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-[#F4ECDF]">
                  <Check className="h-5 w-5 text-[#25D366]" /> Plateformes compatibles
                </h3>
                <ul className="space-y-3">
                  {COMPATIBLE.map(([name, how]) => (
                    <li key={name}>
                      <p className="font-roboto text-[13.5px] font-semibold text-white">{name}</p>
                      <p className="font-roboto text-[13px] text-white/70">{how}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${glass} p-5`}>
                <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-[#F4ECDF]">
                  <span className="text-lg leading-none text-[#C04F17]">×</span> Plateformes non compatibles
                </h3>
                <ul className="space-y-3">
                  {INCOMPATIBLE.map(([name, why]) => (
                    <li key={name}>
                      <p className="font-roboto text-[13.5px] font-semibold text-white">{name}</p>
                      <p className="font-roboto text-[13px] text-white/70">{why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Écran 6 — Intégration sur mesure ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-24 pb-24 text-center md:px-12"
          style={{ opacity: s[5].opacity, transform: s[5].transform, pointerEvents: s[5].pointerEvents }}
          aria-hidden={s[5].ariaHidden}
        >
          <div className={`${glass} w-full max-w-3xl px-6 py-10 md:px-12`}>
            <h2
              className="text-[clamp(22px,3.4vw,38px)] leading-[1.14] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              Besoin d'une intégration <span className="font-bold text-[#C6A046]">sur mesure</span> ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-roboto text-[15px] leading-relaxed text-white/88">
              Les établissements partenaires génèrent leurs propres codes, adaptés à leur fiche, depuis
              l'onglet Outils de leur espace. Pour un format spécifique ou un accès aux données en JSON,
              écrivez-nous.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/affiliates/presence"
                className="inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Espace partenaire
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-3 rounded-full border border-[#C6A046]/70 bg-[#C6A046]/10 px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#E4C877] backdrop-blur-md transition-transform hover:-translate-y-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>

        {/* ============ CTA Revenir / Découvrir ============ */}
        <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-center gap-10">
          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) - 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{ opacity: current > 0 ? 1 : 0, pointerEvents: current > 0 ? "auto" : "none" }}
            tabIndex={current > 0 ? 0 : -1}
            aria-hidden={current === 0}
          >
            <ChevronUp className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">Revenir</span>
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
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">Découvrir</span>
          </button>
        </div>
      </section>
    </>
  );
};

export default Widgets;
