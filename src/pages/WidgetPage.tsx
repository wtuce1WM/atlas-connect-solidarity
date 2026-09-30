import { useState } from "react";
import { useParams } from "react-router-dom";
import { Bot, MapPin, Check, ExternalLink, Copy, ClipboardCheck } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import WidgetsMenu, { WIDGET_ENTRIES } from "@/components/widgets/WidgetsMenu";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  SITE,
  DEMO_SLUG,
  SMALL_WIDGETS,
  SMALL_WIDGETS_EN,
  COMPATIBLE,
  COMPATIBLE_EN,
  INCOMPATIBLE,
  INCOMPATIBLE_EN,
  glass,
  PriceTag,
  WidgetFrame,
  toPreview,
} from "./Widgets";

/** Correspondance id de page → numéro interne SMALL_WIDGETS. */
const SMALL_BY_ID: Record<string, number> = {
  "avis-clients": 5,
  "laisser-un-avis": 6,
  "id-numerique": 7,
  meteo: 3,
  marees: 4,
};

/** postMessage de hauteur émis par l'embed → iframe auto-ajustée (pas de scroll interne). */
const HEIGHT_MSG: Record<string, string> = {
  meteo: "owm-weather-height",
  marees: "owm-tides-height",
};

const WidgetPage = () => {
  const { widgetId = "" } = useParams();
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const en = language === "en";
  const lang = en ? "en" : "fr";
  const entry = WIDGET_ENTRIES.find((w) => w.id === widgetId);
  const idx = WIDGET_ENTRIES.findIndex((w) => w.id === widgetId);
  const prev = idx > 0 ? WIDGET_ENTRIES[idx - 1] : null;
  const next = idx >= 0 && idx < WIDGET_ENTRIES.length - 1 ? WIDGET_ENTRIES[idx + 1] : null;

  useSEO({
    title: `${entry ? (en ? entry.en : entry.fr) : "Widgets"} — One World Morocco`,
    description: en ? "Embed this One World Morocco widget on your website." : "Intégrez ce widget One World Morocco sur votre site.",
    canonical: `/widgets/${widgetId}`,
  });

  const openLink = (url: string) => (
    <a
      href={toPreview(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-1.5 font-roboto text-sm text-[#E4C877] hover:underline"
    >
      {en ? "Open full screen" : "Ouvrir en plein écran"} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );

  /** Bloc code à copier/coller pour intégration sur site externe. */
  const EmbedCode = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-[#F4ECDF]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {en ? "Embed code" : "Code d'intégration"}
        </h2>
        <p className="mt-2 font-roboto text-[13.5px] text-white/70">
          {en
            ? "Copy and paste this code into your website (custom HTML block). Adjust the height to fit your layout."
            : "Copiez-collez ce code dans votre site (bloc HTML personnalisé). Ajustez la hauteur selon votre mise en page."}
        </p>
        <div className="mt-3 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-2xl border border-white/12 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/85">
            {code}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#C6A046]/60 bg-[#C6A046]/10 px-4 py-2.5 font-roboto text-[12.5px] text-[#E4C877] hover:bg-[#C6A046]/20"
          >
            {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? (en ? "Copied" : "Copié") : en ? "Copy" : "Copier"}
          </button>
        </div>
      </div>
    );
  };

  const header = (icon: React.ReactNode, price?: string) => (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C6A046]/15 text-[#E4C877]">{icon}</span>
      {entry?.n && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C6A046]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          WIDGET {entry.n}
        </span>
      )}
      {price && <PriceTag price={price} />}
    </div>
  );

  const title = (text: string) => (
    <h1 className="mt-4 text-[clamp(24px,3.6vw,42px)] leading-[1.12] text-[#F4ECDF]" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
      {text}
    </h1>
  );

  let body: React.ReactNode;
  if (!entry) {
    body = <p className="font-roboto text-white/85">{en ? "Widget not found." : "Widget introuvable."}</p>;
  } else if (widgetId === "assistant-ia") {
    const url = `${SITE}/embed/ask/${DEMO_SLUG}?lang=${lang}&bg=transparent`;
    body = (
      <div className="grid gap-8 md:grid-cols-[1fr_minmax(300px,420px)] md:items-start">
        <div>
          {header(<Bot className="h-5 w-5" />, en ? "Price: on request" : "Prix : sur devis")}
          {title(en ? entry.en : entry.fr)}
          <p className="mt-3 font-roboto text-[16px] leading-relaxed text-white/90">
            {en
              ? "A smart local advisor embedded in your page. It answers by text or voice, illustrates every featured place with immersive vertical video, and retains all app functions: map, directions and booking."
              : "Un conseiller local intelligent, greffé à votre page. Il répond au clavier comme au micro, illustre chaque adresse citée en vidéo verticale immersive, et garde toutes les fonctions de l'App : carte, itinéraires, réservation."}
          </p>
          {openLink(url)}
        </div>
        <div className={`${glass} p-3`}>
          <WidgetFrame src={url} title={en ? entry.en : entry.fr} height={600} />
        </div>
      </div>
    );
  } else if (widgetId === "carte") {
    const url = `${SITE}/embed/nearby/${DEMO_SLUG}?lang=${lang}&bg=ECD6B8`;
    body = (
      <div>
        {header(<MapPin className="h-5 w-5" />, en ? "Price: on request" : "Prix : sur devis")}
        {title(en ? entry.en : entry.fr)}
        <p className="mt-3 max-w-3xl font-roboto text-[16px] leading-relaxed text-white/90">
          {en
            ? "The best places around any location, displayed on a native Google Maps map with immersive videos — updated automatically from the One World Morocco database."
            : "Les meilleures adresses autour d'un point, sur une carte Google Maps native, en mode vidéos immersives — mis à jour automatiquement depuis la base One World Morocco."}
        </p>
        {openLink(url)}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/12">
          <iframe src={toPreview(url)} title={en ? entry.en : entry.fr} loading="lazy" className="h-[75vh] w-full" style={{ border: 0 }} />
        </div>
      </div>
    );
  } else if (widgetId === "compatibilite") {
    const lists: [string, React.ReactNode, [string, string][]][] = [
      [en ? "Compatible platforms" : "Plateformes compatibles", <Check className="h-5 w-5 text-[#25D366]" />, en ? COMPATIBLE_EN : COMPATIBLE],
      [en ? "Incompatible platforms" : "Plateformes non compatibles", <span className="text-lg leading-none text-[#C04F17]">×</span>, en ? INCOMPATIBLE_EN : INCOMPATIBLE],
    ];
    body = (
      <div>
        {title(en ? entry.en : entry.fr)}
        <p className="mt-3 max-w-3xl font-roboto text-[16px] leading-relaxed text-white/90">
          {en
            ? "The rule is simple: if the platform allows custom HTML code, the widgets will work."
            : "La règle est simple : si la plateforme permet d'insérer un code HTML libre, les widgets fonctionnent."}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {lists.map(([label, icon, rows]) => (
            <div key={label} className={`${glass} p-5`}>
              <h2 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-[#F4ECDF]">{icon} {label}</h2>
              <ul className="space-y-3">
                {rows.map(([name, how]) => (
                  <li key={name}>
                    <p className="font-roboto text-[13.5px] font-semibold text-white">{name}</p>
                    <p className="font-roboto text-[13px] text-white/70">{how}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const base = SMALL_WIDGETS.find((w) => w.n === SMALL_BY_ID[widgetId])!;
    const w = { ...base, ...(en ? SMALL_WIDGETS_EN[base.n] : {}), url: base.url.replace("lang=fr", `lang=${lang}`) };
    const embedSnippet = `<iframe src="${w.url}" width="100%" height="${w.height}" style="border:0;background:transparent" loading="lazy" title="${w.title}"></iframe>`;
    body = (
      <div>
        <div className="grid gap-8 md:grid-cols-[1fr_minmax(320px,480px)] md:items-start">
          <div>
            {header(w.icon, w.price)}
            {title(w.title)}
            <p className="mt-3 font-roboto text-[16px] leading-relaxed text-white/90">{w.tagline}</p>
            {openLink(w.url)}
          </div>
          <div className={`${glass} p-3`}>
            <WidgetFrame src={w.url} title={w.title} height={w.height} heightMessage={HEIGHT_MSG[widgetId]} />
          </div>
        </div>
        {(widgetId === "meteo" || widgetId === "marees") && <EmbedCode code={embedSnippet} />}
      </div>
    );
  }

  const navBtn = (e: (typeof WIDGET_ENTRIES)[number] | null, label: string) =>
    e ? (
      <button
        type="button"
        onClick={() => navigate(`/widgets/${e.id}`)}
        className="rounded-full border border-[#C6A046]/60 px-5 py-2.5 font-roboto text-[13px] text-[#E4C877] hover:bg-[#C6A046]/10"
      >
        {label} {en ? e.en : e.fr}
      </button>
    ) : (
      <span />
    );

  return (
    <div className="min-h-[100dvh] bg-[hsl(0_0%_4%)]">
      {/* Bande opaque sous le header : le contenu disparaît plus tôt au scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-32 bg-gradient-to-b from-[hsl(0_0%_4%)] from-70% to-transparent md:h-36" />
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <WidgetsMenu />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-36 md:px-10 md:pt-40">
        {body}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          {navBtn(prev, "←")}
          {navBtn(next, "→")}
        </div>
      </main>
    </div>
  );
};

export default WidgetPage;
