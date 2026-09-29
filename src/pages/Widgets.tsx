import { Bot, MapPin, CloudSun, Waves, Star, ThumbsUp, LayoutPanelTop, Check, ArrowRight } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import WidgetsMenu, { WIDGET_ENTRIES } from "@/components/widgets/WidgetsMenu";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import { useRef } from "react";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";

export const SITE = "https://oneworldmorocco.com";
export const DEMO_SLUG = "riad-dar-najat";

/**
 * Les aperçus in-page sont chargés en URL RELATIVE : ils sont donc toujours
 * résolus sur le document courant (preview comme prod), sans dépendre du
 * domaine public ni d'une éventuelle restriction d'iframe cross-origin.
 */
export const toPreview = (url: string) => url.replace(SITE, "");

/* ---------------- Widgets secondaires (03 → 07) ---------------- */

export type SmallWidget = {
  n: number;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  price: string;
  url: string;
  height: number;
};

export const SMALL_WIDGETS: SmallWidget[] = [
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
    tagline: "Vos notes Google, TripAdvisor et RestaurantGuru réunies dans un bloc élégant.",
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
    icon: <LayoutPanelTop className="h-5 w-5" />,
    title: "Votre ID numérique (type Linktree)",
    tagline: "Tous vos canaux numériques rassemblés au même endroit.",
    price: "Prix : sur devis",
    url: `${SITE}/b/${DEMO_SLUG}?embed=1&lang=fr`,
    height: 720,
  },
];

export const COMPATIBLE: [string, string][] = [
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

export const INCOMPATIBLE: [string, string][] = [
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

export const SMALL_WIDGETS_EN: Record<number, Pick<SmallWidget, "title" | "tagline" | "price">> = {
  3: { title: "Weather", tagline: "Live weather for any Moroccan city, with no API key required.", price: "Free" },
  4: { title: "Tides, Wind & Weather", tagline: "Tides, wind, forecasts and alerts for Morocco's 19 coastal cities.", price: "Free" },
  5: { title: "Customer reviews", tagline: "Your Google, TripAdvisor and RestaurantGuru ratings combined in one elegant block.", price: "Price: on request" },
  6: { title: "Leave a review", tagline: "A block that turns a satisfied customer into a public review.", price: "Price: on request" },
  7: { title: "Your digital ID (Linktree-style)", tagline: "All your digital channels brought together in one place.", price: "Price: on request" },
};

export const COMPATIBLE_EN: [string, string][] = [
  ["WordPress", "Custom HTML block or iframe plugin"],
  ["Wix / Wix Studio", "Embed Code element / HTML iframe"],
  ["Squarespace", "Code block (Business plans and above)"],
  ["Webflow", "Embed component"],
  ["Shopify", "Custom HTML section or page"],
  ["Framer", "Embed component (iframe)"],
  ["Duda, Jimdo, Site123", "HTML / iframe widget"],
  ["Ghost", "HTML card"],
  ["Drupal, Joomla, PrestaShop", "Custom HTML block"],
  ["HubSpot CMS", "Rich HTML module"],
  ["Notion (published pages)", "Embed block via URL"],
  ["Google Sites", "Insert > Embed > By URL"],
  ["Custom website (React, Vue, static HTML…)", "Standard iframe tag"],
];

export const INCOMPATIBLE_EN: [string, string][] = [
  ["Claude Artifacts / AI sandbox", "The sandbox CSP blocks all third-party iframes"],
  ["Wix Free (ADI without code)", "HTML blocks are unavailable without a paid plan"],
  ["Squarespace Personal", "Code blocks are reserved for higher-tier plans"],
  ["WordPress.com Free / Personal", "Custom HTML is disabled"],
  ["Facebook, Instagram, TikTok, LinkedIn", "Posts do not support HTML"],
  ["Google Docs, Slides, Gmail, newsletters", "Email clients ignore iframes"],
  ["Medium, Substack (article body)", "Embeds are limited to an allowlist"],
  ["Amazon, marketplaces, Airbnb, Booking", "Third-party HTML is prohibited by their terms"],
  ["Native mobile apps", "Requires a WebView rather than an iframe"],
  ["Sites with a strict CSP and no frame-src", "The administrator must allow oneworldmorocco.com"],
];

export const glass =
  "rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]";

export const PriceTag = ({ price }: { price: string }) =>
  price === "Gratuit" || price === "Free" ? (
    <span className="rounded-full bg-[#25D366] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-black">
      {price}
    </span>
  ) : (
    <span className="rounded-full border border-[#C6A046]/60 bg-[#C6A046]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E4C877]">
      {price}
    </span>
  );

/** Aperçu de widget sur fond transparent, sans cadre opaque. */
export const WidgetFrame = ({ src, title, height }: { src: string; title: string; height: number }) => (
  <div className="overflow-hidden rounded-2xl border border-white/12 bg-transparent">
    <iframe
      src={toPreview(src)}
      title={title}
      loading="lazy"
      style={{ width: "100%", height, border: 0, background: "transparent" }}
    />
  </div>
);

/** Correspondance id de page → numéro interne SMALL_WIDGETS. */
const SMALL_BY_ID: Record<string, number> = {
  "avis-clients": 5,
  "laisser-un-avis": 6,
  "id-numerique": 7,
  meteo: 3,
  marees: 4,
};

/** Cartes des widgets principaux (01, 02) et de la compatibilité. */
const MAIN_CARDS: Record<string, { icon: React.ReactNode; taglineFr: string; taglineEn: string }> = {
  "assistant-ia": {
    icon: <Bot className="h-5 w-5" />,
    taglineFr: "Un conseiller local intelligent, greffé à votre page : réponses au clavier ou au micro, vidéos immersives, carte et réservation.",
    taglineEn: "A smart local advisor on your page: text or voice answers, immersive videos, map and booking.",
  },
  carte: {
    icon: <MapPin className="h-5 w-5" />,
    taglineFr: "Les meilleures adresses autour d'un point, sur une carte Google Maps native, synchronisée en temps réel.",
    taglineEn: "The best places around any location on a native Google Maps map, synced in real time.",
  },
  compatibilite: {
    icon: <Check className="h-5 w-5" />,
    taglineFr: "La règle est simple : si la plateforme permet d'insérer un code HTML libre, les widgets fonctionnent.",
    taglineEn: "The rule is simple: if the platform allows custom HTML code, the widgets will work.",
  },
};

const Widgets = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const isEnglish = language === "en";
  useSEO({
    title: isEnglish ? "One World Morocco widgets & iframes to embed" : "Widgets & iframes One World Morocco à intégrer",
    description: isEnglish
      ? "Voice AI assistant, nearby places map, weather, tides and customer reviews: embed One World Morocco widgets on your website."
      : "Assistant IA vocal, carte des adresses à proximité, météo, marées, avis clients : intégrez les widgets One World Morocco sur votre site.",
    canonical: "/widgets",
    ogImage: `${SITE}/og/widgets.jpg`,
  });

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const cards = WIDGET_ENTRIES.map((entry) => {
    const smallN = SMALL_BY_ID[entry.id];
    const small = smallN ? SMALL_WIDGETS.find((w) => w.n === smallN) : undefined;
    const main = MAIN_CARDS[entry.id];
    return {
      id: entry.id,
      n: entry.n,
      title: isEnglish ? entry.en : entry.fr,
      tagline: main ? (isEnglish ? main.taglineEn : main.taglineFr) : (isEnglish ? SMALL_WIDGETS_EN[small!.n].tagline : small!.tagline),
      price: main
        ? entry.id === "compatibilite"
          ? null
          : isEnglish ? "Price: on request" : "Prix : sur devis"
        : isEnglish ? SMALL_WIDGETS_EN[small!.n].price : small!.price,
      icon: main ? main.icon : small!.icon,
    };
  });

  return (
    <div className="min-h-[100dvh] bg-[hsl(0_0%_4%)]">
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <WidgetsMenu />

      {/* ============ Hero ============ */}
      <section className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-40 text-center md:px-12 md:pt-48">
        <video
          ref={bgVideoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={landscapeVideoAsset.url}
          poster={landscapeVideoPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{ filter: "brightness(0.6)" }}
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.66) 0%, rgba(6,5,4,.5) 35%, rgba(6,5,4,.86) 75%, hsl(0_0%_4%) 100%)",
          }}
        />
        <div className="relative z-10">
          <p
            className="mb-6 text-[12px] font-medium uppercase tracking-[0.32em] text-[#C6A046] md:text-[14px]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {isEnglish ? "Open ecosystem" : "Écosystème ouvert"}
          </p>
          <h1
            className="max-w-4xl text-[28px] leading-[1.15] text-[#F4ECDF] sm:text-[2.4rem] md:text-[3.2rem]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {isEnglish ? "The " : "Les widgets "}
            <span className="font-bold text-[#C6A046]">One World Morocco</span>
            {isEnglish ? " widgets" : ""}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-roboto text-[15px] leading-relaxed text-white/90 md:text-[1.06rem]">
            {isEnglish
              ? "Voice AI assistant, nearby places map, weather, tides, customer reviews and digital ID: every part of the platform can be embedded on your website through a public URL. No installation, API key or maintenance — data stays synced in real time."
              : "Assistant IA vocal, carte des adresses à proximité, météo, marées, avis clients, ID numérique : chaque brique de la plateforme s'intègre à votre site depuis une URL publique. Aucune installation, aucune clé API, aucune maintenance — les données restent synchronisées en temps réel."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#widgets-list"
              className="inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {isEnglish ? "View widgets" : "Voir les widgets"}
            </a>
            <a
              href={isEnglish ? "/en/contact" : "/contact"}
              className="inline-flex items-center gap-3 rounded-full border border-[#C6A046]/70 bg-[#C6A046]/10 px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#E4C877] backdrop-blur-md transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {isEnglish ? "Custom integration" : "Intégration sur mesure"}
            </a>
          </div>
        </div>
      </section>

      {/* ============ Cartes — 1 carte = 1 widget = 1 page ============ */}
      <section id="widgets-list" className="mx-auto w-full max-w-6xl scroll-mt-28 px-5 pb-20 md:px-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(`/widgets/${card.id}`)}
              className={`${glass} group flex flex-col items-start p-6 text-left transition-transform hover:-translate-y-1`}
            >
              <div className="flex w-full items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C6A046]/15 text-[#E4C877]">
                  {card.icon}
                </span>
                {card.n && (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C6A046]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    WIDGET {card.n}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-[18px] font-semibold leading-snug text-[#F4ECDF]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {card.title}
              </h2>
              <p className="mt-2 flex-1 font-roboto text-[13.5px] leading-relaxed text-white/75">{card.tagline}</p>
              <div className="mt-4 flex w-full items-center justify-between gap-2">
                {card.price ? <PriceTag price={card.price} /> : <span />}
                <ArrowRight className="h-4 w-4 text-[#C6A046] transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Widgets;
