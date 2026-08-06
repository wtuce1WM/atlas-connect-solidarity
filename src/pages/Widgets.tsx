import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import HScroll from "@/components/HScroll";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, CloudSun, MessageSquare, MapPin, Sparkles, Star, Newspaper, Waves, LayoutPanelTop, ExternalLink, ThumbsUp, Mail } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "@/hooks/use-toast";
import widgetsHero from "@/assets/widgets-hero.jpg";
import widgetsHeroVertical from "@/assets/widgets-hero-vertical.jpg";


const SITE = "https://oneworldmorocco.com";
const DEMO_SLUG = "riad-dar-najat";

/** Les codes à copier pointent vers le domaine public ; les aperçus in-page
 *  utilisent l'origine courante (preview/prod) pour rester toujours valides. */
const PREVIEW_ORIGIN = typeof window !== "undefined" ? window.location.origin : SITE;
const toPreview = (url: string) => url.replace(SITE, PREVIEW_ORIGIN);

const CopyBlock = ({ code, id, previewLines, disableCopy }: { code: string; id: string; previewLines?: number; disableCopy?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const shown =
    previewLines && previewLines > 0
      ? code.split("\n").slice(0, previewLines).join("\n") +
        (code.split("\n").length > previewLines ? "\n…" : "")
      : code;
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast({ title: "Code copié" });
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez le code manuellement." });
    }
  };
  return (
    <div className="relative rounded-xl border border-border bg-muted/40 p-4">
      <pre className="overflow-x-auto text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
        <code>{shown}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        onClick={doCopy}
        disabled={disableCopy}
        className="mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Copier le code ${id}`}
      >
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copié" : "Copier le code"}
      </Button>
    </div>
  );
};

/** Aperçu sans scroll vertical : la hauteur suit la hauteur réelle du widget
 *  (les pages /embed/* publient leur hauteur via postMessage). */
const AutoHeightIframe = ({
  src,
  title,
  minHeight,
  maxWidth,
}: {
  src: string;
  title: string;
  minHeight: number;
  maxWidth?: number;
}) => {
  const [height, setHeight] = useState(minHeight);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setHeight(minHeight);
    const onMsg = (e: MessageEvent) => {
      // Ne réagir qu'aux messages émis par CE widget (évite le mélange entre aperçus).
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (!d || typeof d.type !== "string" || !d.type.endsWith("-height")) return;
      if (typeof d.height === "number" && d.height > 80 && d.height < 2400) {
        setHeight(Math.ceil(d.height) + 8);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [src, minHeight]);

  return (
    <iframe
      key={src}
      ref={frameRef}
      src={src}
      title={title}
      loading="lazy"
      scrolling="no"
      style={{ width: "100%", maxWidth, height, border: 0, borderRadius: 20, overflow: "hidden" }}
      className="bg-card shadow-lg"
    />

  );
};

/* ---------------- Marketing push : compteur géolocalisé ---------------- */
const GEO_MARRAKECH = 1178;
const GEO_ESSAOUIRA = 339;

function formatCount(n: number) {
  return n.toLocaleString("fr-FR").replace(/\s/g, "\u00A0");
}

function useAnimatedCount(target: number, duration = 2200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(easeOutQuint(progress) * target));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const GeoMarketingBanner = () => {
  const marrakech = useAnimatedCount(GEO_MARRAKECH);
  const essaouira = useAnimatedCount(GEO_ESSAOUIRA);
  const marrakechDone = marrakech === GEO_MARRAKECH;
  const essaouiraDone = essaouira === GEO_ESSAOUIRA;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/40 p-6 sm:p-8 lg:p-10 animate-glow-pulse" style={{ background: "var(--gradient-morocco)" }}>
      {/* Shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Floating decorative rings */}
      <div className="pointer-events-none absolute right-8 top-6 h-24 w-24 rounded-full border border-white/20 animate-float" />
      <div className="pointer-events-none absolute left-10 bottom-4 h-16 w-16 rounded-full border border-white/20 animate-float [animation-delay:1.2s]" />
      <div className="pointer-events-none absolute right-1/4 bottom-8 h-10 w-10 rounded-full border border-gold/30 animate-float [animation-delay:2.4s]" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Carte vivante One World Morocco
          </div>
          <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
            Des centaines d'adresses géolocalisées autour de vos visiteurs
          </h3>
          <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Le widget Map & App affiche en temps réel les établissements actifs situés autour d'un point de référence — restaurants, riads, activités, commerces — avec fiches, itinéraires et contact direct.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Marrakech counter */}
          <div className="relative flex min-w-[11rem] flex-col items-center rounded-xl bg-black/20 px-5 py-4 text-center backdrop-blur-sm">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="relative flex items-center justify-center">
                <MapPin className="relative z-10 h-5 w-5 text-gold" fill="currentColor" />
                <span className="absolute inline-flex h-8 w-8 animate-pin-pulse rounded-full bg-gold/40" />
                <span className="absolute inline-flex h-8 w-8 animate-pin-pulse rounded-full bg-gold/25 [animation-delay:0.7s]" />
              </div>
            </div>
            <span
              className={`mt-3 text-4xl font-bold tracking-tight text-gold sm:text-5xl ${marrakechDone ? "animate-count-pop" : ""}`}
              key={marrakechDone ? "marrakech-done" : "marrakech-running"}
            >
              {formatCount(marrakech)}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/90">Marrakech · Imlil · Agafay</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-white/60">GPS renseigné</span>
          </div>

          {/* Essaouira counter */}
          <div className="relative flex min-w-[11rem] flex-col items-center rounded-xl bg-black/20 px-5 py-4 text-center backdrop-blur-sm">
            <span
              className={`text-4xl font-bold tracking-tight text-white sm:text-5xl ${essaouiraDone ? "animate-count-pop" : ""}`}
              key={essaouiraDone ? "essaouira-done" : "essaouira-running"}
            >
              {formatCount(essaouira)}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/90">Essaouira</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-white/60">& littoral</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 text-xs font-medium text-white/80 sm:text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-gold animate-pulse" />
          Mise à jour automatique depuis la base One World Morocco
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
          Intégration iframe en 1 ligne de code
        </span>
      </div>
    </div>
  );
};
/* ---------------- Marketing push : Assistant IA & Vocal ---------------- */
const AiMarketingBanner = () => (
  <div
    className="relative overflow-hidden rounded-2xl border border-gold/40 p-6 sm:p-8 animate-glow-pulse"
    style={{ background: "var(--gradient-morocco)" }}
  >
    <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    <div className="pointer-events-none absolute right-10 top-5 h-20 w-20 rounded-full border border-white/20 animate-float" />
    <div className="pointer-events-none absolute left-8 bottom-4 h-14 w-14 rounded-full border border-gold/30 animate-float [animation-delay:1.4s]" />

    <div className="relative z-10 space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        Conseiller local augmenté
      </div>
      <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
        Il écoute, il répond, il fait voyager — <span className="text-gold">à la voix comme au clavier</span>
      </h3>
      <p className="max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
        Un assistant qui parle la langue de vos visiteurs, se pilote au micro, illustre ses réponses
        avec des vidéos immersives et transforme une simple question en envie de réserver.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Vocal", v: "Question posée au micro, réponse lue à voix haute" },
          { k: "Vidéos immersives", v: "Chaque adresse citée s'anime en vidéo verticale" },
          { k: "Inspirationnel", v: "Suggestions et relances qui donnent des idées, pas des listes" },
          { k: "L'App dans l'embed", v: "Carte, itinéraires, réservation : tout reste actif dans le widget" },
        ].map((f) => (
          <div key={f.k} className="rounded-xl bg-black/20 px-4 py-3 backdrop-blur-sm">
            <div className="text-sm font-bold text-gold">{f.k}</div>
            <div className="mt-1 text-[12.5px] leading-snug text-white/80">{f.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-white/80 sm:text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-gold animate-pulse" />
          Réponses ancrées sur nos données réelles
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
          Intégration iframe en 1 ligne de code
        </span>
      </div>
    </div>
  </div>
);



interface WidgetSectionProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  price: string;
  params?: { name: string; value: string }[];
  previewUrl?: string;
  previewNode?: React.ReactNode;
  previewHeight?: number;
  previewMaxWidth?: number;
  /** Hauteur pilotée par le widget (postMessage) → aucun scroll vertical interne. */
  autoHeight?: boolean;
  /** Aperçu sur toute la largeur, code d'intégration en dessous. */
  fullWidthPreview?: boolean;
  snippet: string;
  snippetPreviewLines?: number;
  extra?: React.ReactNode;
  /** Bloc affiché juste sous le titre du widget. */
  banner?: React.ReactNode;
}

const WidgetSection = ({
  index,
  icon,
  title,
  tagline,
  description,
  price,
  params,
  previewUrl,
  previewNode,
  previewHeight,
  previewMaxWidth,
  autoHeight,
  fullWidthPreview,
  snippet,
  snippetPreviewLines,
  extra,
  banner,
}: WidgetSectionProps) => (

  <section className="scroll-mt-32 border-t border-border pt-16">
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Widget {String(index).padStart(2, "0")}
      </span>
    </div>

    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-3">
      <span>{title}</span>
      {price === "Gratuit" && (
        <span className="rounded-xl bg-whatsapp px-3 py-0.5 text-whatsapp-foreground leading-tight">
          Gratuit
        </span>
      )}
    </h2>
    {banner && <div className="mb-6">{banner}</div>}
    <p className="text-lg text-primary font-medium mb-4">{tagline}</p>
    {price !== "Gratuit" && <Badge className="mb-5">{price}</Badge>}
    <p className="text-base text-muted-foreground max-w-3xl mb-8">{description}</p>

    {params && (
      <div className="flex flex-wrap gap-2 mb-10">
        {params.map((p) => (
          <Badge key={p.name} variant="outline" className="font-normal">
            <span className="font-semibold mr-1">{p.name}</span>
            {p.value}
          </Badge>
        ))}
      </div>
    )}

    <div className={fullWidthPreview ? "space-y-10" : "grid gap-10 lg:grid-cols-2 items-start"}>
      <div>
        {previewNode ? (
          previewNode
        ) : (
          <>
            {autoHeight ? (
              <AutoHeightIframe
                src={previewUrl!}
                title={title}
                minHeight={previewHeight || 320}
                maxWidth={fullWidthPreview ? undefined : previewMaxWidth}
              />
            ) : (
              <iframe
                src={previewUrl}
                title={title}
                loading="lazy"
                style={{
                  width: "100%",
                  maxWidth: fullWidthPreview ? undefined : previewMaxWidth,
                  height: previewHeight,
                  border: 0,
                  borderRadius: 20,
                }}
                className="bg-card shadow-lg"
              />
            )}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Code d'intégration
        </h3>
        <CopyBlock code={snippet} id={title} previewLines={snippetPreviewLines} disableCopy={price !== "Gratuit"} />
        {extra}
      </div>
    </div>

  </section>
);

/* ---------------- Widget Adresses à proximité (sélecteur d'établissement) ---------------- */

const NEARBY_DEMO_NAMES = [
  "Riad Dar Najat",
  "La Mamounia",
  "Royal Mansour Marrakech",
  "Aéroport international Marrakech-Ménara",
  "Aéroport d'Essaouira-Mogador",
  "Délégation Régionale Du Tourisme Marrakech",
  "Le Bistro Arabe",
  "Carré Eden Shopping Center",
  "Côté Bougie M Avenue",
  "La Sultana Marrakech",
  "La Table by Madada",
  "Lacoste Carre Eden",
  "M Avenue",
  "Maison Brummell Majorelle",
  "The Farasha Farmhouse",
];

type NearbyDemoBiz = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
};

const NearbyWidgetSection = ({ index }: { index: number }) => {
  const [items, setItems] = useState<NearbyDemoBiz[]>([]);
  const [slug, setSlug] = useState(DEMO_SLUG);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,images")
        .in("name", NEARBY_DEMO_NAMES);
      if (cancelled) return;
      const rows = (data as NearbyDemoBiz[]) ?? [];
      const ordered = NEARBY_DEMO_NAMES
        .map((n) => rows.find((r) => r.name === n))
        .filter((r): r is NearbyDemoBiz => !!r && !!r.slug);
      setItems(ordered);
    })();
    return () => { cancelled = true; };
  }, []);

  const url = `${SITE}/embed/nearby/${slug}?lang=fr`;
  const activeName = items.find((i) => i.slug === slug)?.name || "Riad Dar Najat";

  return (
    <WidgetSection
      index={index}
      icon={<MapPin className="h-5 w-5" />}
      title="Widget Map & App"
      banner={<GeoMarketingBanner />}
      tagline="Les meilleures adresses autour d'un point sur une carte en mode vidéos immersives & inspirationelles avec fonctions avancées."
      price="Prix : sur devis"
      description="Reprend l'expérience de découverte de la plateforme : établissements actifs situés autour du point de référence, classés par catégorie, avec carte Google Maps native, fiches détaillées et contact direct. La carte s'affiche immédiatement, sans média d'introduction. Vous pouvez optionnellement adapter la couleur de fond de la carte."
      params={[
        { name: "slug", value: "établissement de référence" },
        { name: "lang", value: "fr | en | ar" },
        { name: "bg", value: "couleur de fond optionnelle (hex sans #)" },
      ]}
      fullWidthPreview
      previewNode={
        <>
          <HScroll className="flex gap-3 overflow-x-auto scrollbar-hide pb-3">
            {items.map((b) => {
              const active = b.slug === slug;
              const img = b.images?.[0] || null;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSlug(b.slug!)}
                  className={`relative shrink-0 w-40 h-40 rounded-2xl overflow-hidden text-left ring-2 transition-shadow ${
                    active ? "ring-primary shadow-lg" : "ring-transparent hover:ring-primary/40"
                  }`}
                >
                  {img ? (
                    <img src={img} alt={b.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <div className="text-[12.5px] font-bold leading-tight text-white break-words">{b.name}</div>
                    <div className="text-[11px] text-white/80 mt-0.5 break-words">
                      {[b.city, b.neighborhood].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              );
            })}
          </HScroll>
          <iframe
            src={toPreview(url)}
            title={`Adresses à proximité — ${activeName}`}
            loading="lazy"
            style={{ width: "100%", height: 620, border: 0, borderRadius: 20 }}
            className="bg-card shadow-lg"
          />
          <a
            href={toPreview(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </>
      }
      snippet={`<iframe src="${url}" style="width:100%;height:620px;border:0;border-radius:20px" title="Adresses à proximité" loading="lazy"></iframe>`}
    />
  );
};

/* ---------------- Widget Marées (configurateur ville / langue) ---------------- */


const TIDE_CITIES: { slug: string; name: string; sea: "atlantic" | "mediterranean" }[] = [
  { slug: "essaouira", name: "Essaouira", sea: "atlantic" },
  { slug: "agadir", name: "Agadir", sea: "atlantic" },
  { slug: "taghazout", name: "Taghazout", sea: "atlantic" },
  { slug: "casablanca", name: "Casablanca", sea: "atlantic" },
  { slug: "mohammedia", name: "Mohammedia", sea: "atlantic" },
  { slug: "rabat", name: "Rabat", sea: "atlantic" },
  { slug: "el-jadida", name: "El Jadida", sea: "atlantic" },
  { slug: "oualidia", name: "Oualidia", sea: "atlantic" },
  { slug: "safi", name: "Safi", sea: "atlantic" },
  { slug: "larache", name: "Larache", sea: "atlantic" },
  { slug: "asilah", name: "Asilah", sea: "atlantic" },
  { slug: "tanger", name: "Tanger", sea: "atlantic" },
  { slug: "sidi-ifni", name: "Sidi Ifni", sea: "atlantic" },
  { slug: "tarfaya", name: "Tarfaya", sea: "atlantic" },
  { slug: "laayoune", name: "Laâyoune-Plage", sea: "atlantic" },
  { slug: "dakhla", name: "Dakhla", sea: "atlantic" },
  { slug: "martil", name: "Martil", sea: "mediterranean" },
  { slug: "al-hoceima", name: "Al Hoceïma", sea: "mediterranean" },
  { slug: "saidia", name: "Saïdia", sea: "mediterranean" },
];

const TidesWidgetSection = ({ index }: { index: number }) => {
  const [city, setCity] = useState("essaouira");
  const [lang, setLang] = useState<"fr" | "en" | "ar">("fr");
  const [picker, setPicker] = useState(false);

  const url = `${SITE}/embed/tides?city=${city}&lang=${lang}${picker ? "&picker=1" : ""}`;
  const height = picker ? 620 : 560;
  const snippet = `<iframe src="${url}" style="width:100%;max-width:520px;height:${height}px;border:0;border-radius:20px" title="Marées ${
    TIDE_CITIES.find((c) => c.slug === city)?.name || ""
  }" loading="lazy"></iframe>`;

  const atlantic = TIDE_CITIES.filter((c) => c.sea === "atlantic");
  const med = TIDE_CITIES.filter((c) => c.sea === "mediterranean");

  return (
    <section className="scroll-mt-32 border-t border-border pt-16">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Waves className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Widget {String(index).padStart(2, "0")}
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-3">
        <span>Widget Marées, Vents & Météo</span>
        <span className="rounded-xl bg-whatsapp px-3 py-0.5 text-whatsapp-foreground leading-tight">
          Gratuit
        </span>
      </h2>
      <p className="text-lg text-primary font-medium mb-4">
        Marées, vents, météo et alertes personnalisées pour les 19 villes côtières du Maroc — en un seul widget.
      </p>
      <div className="text-base text-muted-foreground max-w-3xl mb-8 space-y-4">
        <p>
          Un outil complet et gratuit pour les amateurs de mer, de surf, de kitesurf, de wingfoil, de pêche ou
          simplement de plage. Il réunit en un seul endroit les prévisions de marées, la direction et la force du
          vent, la météo locale et un système d'alertes automatiques qui vous prévient dès que les conditions sont
          réunies pour votre activité.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Marées en temps réel :</strong> niveau de la mer, sens de la marée (montante / descendante),
            coefficient estimé, marnage et courbe lissée sur 24 heures, plus les quatre prochaines pleines et basses
            mers avec horaires locaux.
          </li>
          <li>
            <strong>Vent et rose des vents :</strong> direction, force moyenne et rafales, échelle de Beaufort, et
            carte satellite centrée sur la ville avec surimpression de la rose des vents.
          </li>
          <li>
            <strong>Météo sur 7 jours :</strong> température, ensoleillement, précipitations, humidité et vent à
            J+7, avec courbes lissées pour lire d'un coup d'œil l'évolution de la semaine.
          </li>
          <li>
            <strong>Alertes automatiques par email :</strong> grande marée, conditions surf, kitesurf, wingfoil ou
            pêche — configurez votre ville, votre email et votre pseudonyme, et recevez une alerte le jour précédent
            quand les conditions se confirment.
          </li>
          <li>
            <strong>19 villes couvertes :</strong> tout le littoral atlantique et méditerranéen marocain, du Nord au
            Sud (Essaouira, Agadir, Taghazout, Casablanca, Mohammedia, Rabat, El Jadida, Oualidia, Safi, Larache,
            Asilah, Tanger, Sidi Ifni, Tarfaya, Laâyoune-Plage, Dakhla, Martil, Al Hoceïma, Saïdia).
          </li>
          <li>
            <strong>Personnalisation facile :</strong> ville par défaut, langue (FR / EN / AR), sélecteur de ville
            affiché ou masqué, et upload d'un avatar pour les alertes.
          </li>
          <li>
            <strong>Zéro clé API, zéro frais :</strong> le widget s'intègre comme une iframe classique, sans
            inscription technique, sans publicité, sans limitation d'affichage.
          </li>
        </ul>
        <p>
          Session de surf à Essaouira, journée à Oualidia, sortie paddle, partie de pêche ou balade jusqu'aux îles
          Purpuraires : ce widget devient rapidement indispensable pour anticiper la mer et le vent au Maroc.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Ville côtière
          </p>
          <div className="flex flex-wrap gap-2">
            {atlantic.map((c) => (
              <Button
                key={c.slug}
                size="sm"
                variant={city === c.slug ? "default" : "outline"}
                onClick={() => setCity(c.slug)}
              >
                {c.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 mb-2">Méditerranée (faible marnage)</p>
          <div className="flex flex-wrap gap-2">
            {med.map((c) => (
              <Button
                key={c.slug}
                size="sm"
                variant={city === c.slug ? "default" : "outline"}
                onClick={() => setCity(c.slug)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Langue
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {(["fr", "en", "ar"] as const).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? "default" : "outline"}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Sélecteur de ville
          </p>
          <Button size="sm" variant={picker ? "default" : "outline"} onClick={() => setPicker((v) => !v)}>
            {picker ? "Affiché" : "Masqué"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Laisse le visiteur changer de ville dans le widget.
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 items-start">
        <div>
          <AutoHeightIframe
            src={toPreview(url)}
            title="Widget Marées"
            minHeight={height}
            maxWidth={520}
          />

          <a
            href={toPreview(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Code d'intégration
          </h3>
          <CopyBlock code={snippet} id="tides" />
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Données brutes (JSON)
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Pour un affichage entièrement sur-mesure, l'API renvoie le niveau courant, les extrema, la
              courbe 24 h, la houle, le vent et les conditions de mer.
            </p>
            <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs text-foreground mb-3">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/tides?city=Essaouira&days=3&lang=fr
            </code>
            <p className="text-xs text-muted-foreground">
              Endpoint public avec CORS. Remplacez <code className="text-foreground">city</code>,{" "}
              <code className="text-foreground">days</code> et <code className="text-foreground">lang</code>
              (fr, en, ar). <code className="text-foreground">GET ?list=1</code> retourne la liste des 19 villes
              côtières.
            </p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Niveau de la mer modélisé, référencé au niveau moyen (source Open-Meteo Marine). Précision
            adaptée aux usages plage et loisirs — ne remplace pas un annuaire officiel des marées pour la
            navigation.
          </p>
        </div>
      </div>
    </section>
  );
};




const COMPATIBLE = [
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
  ["Site sur-mesure (React, Vue, HTML statique…)", "Balise <iframe> classique"],
];

const INCOMPATIBLE = [
  ["Claude Artifacts / sandbox IA", "CSP du bac à sable qui bloque tout iframe tiers"],
  ["Wix Free (ADI sans code)", "Bloc HTML indisponible sans plan payant"],
  ["Squarespace Personal", "Bloc Code réservé aux plans supérieurs"],
  ["WordPress.com plan gratuit / Personal", "HTML arbitraire désactivé"],
  ["Facebook, Instagram, TikTok, LinkedIn (publications)", "Pas de HTML dans les posts"],
  ["Google Docs, Slides, Gmail, newsletters e-mail", "Les clients e-mail ignorent les iframes"],
  ["Medium, Substack (corps d'article)", "Embeds limités à une liste blanche"],
  ["Amazon, marketplaces, Airbnb, Booking", "HTML tiers interdit par les CGU"],
  ["Applications mobiles natives", "Nécessite une WebView, pas un iframe"],
  ["Sites en CSP stricte sans frame-src", "L'administrateur doit autoriser oneworldmorocco.com"],
];

const REVIEW_PRESETS: Record<string, { label: string; ratio: string; size: string; w: number; h: number }> = {
  "v-sm": { label: "Vertical S", ratio: "vertical", size: "sm", w: 460, h: 560 },
  "v-lg": { label: "Vertical L", ratio: "vertical", size: "lg", w: 460, h: 1000 },
  "h-sm": { label: "Horizontal S", ratio: "horizontal", size: "sm", w: 760, h: 340 },
  "h-lg": { label: "Horizontal L", ratio: "horizontal", size: "lg", w: 900, h: 460 },
  square: { label: "Carré", ratio: "square", size: "sm", w: 480, h: 480 },
};

const ALL_REVIEW_PLATFORMS = [
  { key: "all", label: "Synthèse", field: "computed_rating" },
  { key: "google", label: "Google", field: "google_rating" },
  { key: "tripadvisor", label: "TripAdvisor", field: "tripadvisor_rating" },
  { key: "restaurant-guru", label: "Restaurant Guru", field: "restaurant_guru_rating" },
] as const;

const chip = (active: boolean) =>
  `text-xs py-1.5 px-3 rounded-md border transition-colors ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:bg-muted"
  }`;

const ReviewsWidgetSection = ({ index }: { index: number }) => {
  const [available, setAvailable] = useState<string[]>(["all"]);
  const [platform, setPlatform] = useState<string>("all");
  const [lang, setLang] = useState<"fr" | "en" | "ar">("fr");
  const [presetKey, setPresetKey] = useState<string>("v-sm");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("computed_rating,google_rating,tripadvisor_rating,restaurant_guru_rating")
        .eq("slug", DEMO_SLUG)
        .maybeSingle();
      if (!alive || !data) return;
      const keys = ALL_REVIEW_PLATFORMS.filter(
        (p) => Number((data as Record<string, number | null>)[p.field] ?? 0) > 0,
      ).map((p) => p.key as string);
      setAvailable(keys.length ? keys : ["all"]);
      if (!keys.includes(platform)) setPlatform(keys[0] || "all");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preset = REVIEW_PRESETS[presetKey];
  const url = `${SITE}/embed/reviews/${DEMO_SLUG}?platform=${platform}&lang=${lang}&ratio=${preset.ratio}&size=${preset.size}`;
  const snippet = `<iframe src="${url}" style="width:100%;max-width:${preset.w}px;height:${preset.h}px;border:0;border-radius:20px" title="Avis clients" loading="lazy"></iframe>`;

  return (
    <section className="scroll-mt-32 border-t border-border pt-16">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Star className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Widget {String(index).padStart(2, "0")}
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-3">
        <span>Widget Avis clients</span>
        <span className="rounded-xl bg-whatsapp px-3 py-0.5 text-whatsapp-foreground leading-tight">
          Gratuit
        </span>
      </h2>
      <p className="text-lg text-primary font-medium mb-4">
        Google, TripAdvisor, Restaurant Guru — réunis et notés sur 20.
      </p>
      <p className="text-base text-muted-foreground max-w-3xl mb-8">
        Note sur 5, nombre d'avis et étoiles par plateforme, avis mis en avant en premier puis navigation
        dans l'intégralité des avis avec l'auteur. Les plateformes sans avis rédigés (TripAdvisor,
        Restaurant Guru) s'affichent sous forme de bloc note certifiée avec leur logo et un lien vers la
        plateforme. Le mode Synthèse ajoute le badge global noté sur 20. Cinq gabarits sont disponibles et
        le widget s'adapte automatiquement à la largeur de son cadre.
      </p>

      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Plateforme
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_REVIEW_PLATFORMS.filter((p) => available.includes(p.key)).map((p) => (
              <button key={p.key} type="button" onClick={() => setPlatform(p.key)} className={chip(platform === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Seules les plateformes réellement renseignées pour l'établissement sont proposées.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Langue</p>
          <div className="flex gap-2">
            {(["fr", "en", "ar"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`${chip(lang === l)} uppercase`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Format d'affichage
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(REVIEW_PRESETS).map(([key, p]) => (
            <button key={key} type="button" onClick={() => setPresetKey(key)} className={chip(presetKey === key)}>
              {p.label} · {p.w}×{p.h}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <iframe
            key={url}
            src={toPreview(url)}
            title="Avis clients"
            loading="lazy"
            style={{ width: "100%", maxWidth: preset.w, height: preset.h, border: 0, borderRadius: 20 }}
            className="bg-card shadow-lg"
          />
          <a
            href={toPreview(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Code d'intégration
          </h3>
          <CopyBlock code={snippet} id="reviews" />
        </div>
      </div>

    </section>
  );
};

const RATE_PLATFORMS = [
  { key: "all", label: "Google + TripAdvisor" },
  { key: "google", label: "Google" },
  { key: "tripadvisor", label: "TripAdvisor" },
] as const;

const RateUsWidgetSection = ({ index }: { index: number }) => {
  const [platform, setPlatform] = useState<string>("all");
  const [lang, setLang] = useState<"fr" | "en" | "ar">("fr");
  const [variant, setVariant] = useState<"card" | "bar">("card");

  const url = `${SITE}/embed/avis/${DEMO_SLUG}?platform=${platform}&lang=${lang}&variant=${variant}`;
  const w = variant === "bar" ? 780 : 460;
  const h = variant === "bar" ? 120 : 430;
  const snippet = `<iframe src="${url}" style="width:100%;max-width:${w}px;height:${h}px;border:0;border-radius:20px" title="Laisser un avis" loading="lazy"></iframe>`;

  return (
    <section className="scroll-mt-32 border-t border-border pt-16">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ThumbsUp className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Widget {String(index).padStart(2, "0")}
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-3">
        <span>Widget Laisser un avis</span>
        <span className="rounded-xl bg-whatsapp px-3 py-0.5 text-whatsapp-foreground leading-tight">
          Gratuit
        </span>
      </h2>
      <p className="text-lg text-primary font-medium mb-4">
        Transformez vos clients satisfaits en avis Google et TripAdvisor.
      </p>
      <p className="text-base text-muted-foreground max-w-3xl mb-8">
        Cinq étoiles cliquables ouvrent directement le formulaire d'avis de la plateforme : lien
        « Rédiger un avis » Google (généré depuis l'identifiant de fiche Google) et page d'avis
        TripAdvisor. Seules les plateformes pour lesquelles le lien existe réellement s'affichent. Deux
        formats : carte verticale (page contact, fin de séjour, e-mail de remerciement) ou barre
        horizontale discrète à placer en pied de page.
      </p>

      <div className="grid gap-5 sm:grid-cols-3 mb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Plateformes
          </p>
          <div className="flex flex-wrap gap-2">
            {RATE_PLATFORMS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPlatform(p.key)} className={chip(platform === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Format</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setVariant("card")} className={chip(variant === "card")}>
              Carte
            </button>
            <button type="button" onClick={() => setVariant("bar")} className={chip(variant === "bar")}>
              Barre
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Langue</p>
          <div className="flex gap-2">
            {(["fr", "en", "ar"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`${chip(lang === l)} uppercase`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 items-start">
        <div>
          <AutoHeightIframe key={url} src={toPreview(url)} title="Laisser un avis" minHeight={h} maxWidth={w} />
          <a
            href={toPreview(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Code d'intégration
          </h3>
          <CopyBlock code={snippet} id="rate-us" />
        </div>
      </div>
    </section>
  );
};


const EmailSignatureWidgetSection = ({ index }: { index: number }) => {
  const [platform, setPlatform] = useState<string>("all");
  const [lang, setLang] = useState<"fr" | "en" | "ar">("fr");

  const businessName = "Riad Dar Najat";
  const rateEmailUrl = `${SITE}/embed/avis/${DEMO_SLUG}?platform=${platform}&lang=${lang}&variant=card&src=email`;

  const t = {
    fr: {
      title: "Votre avis compte pour nous",
      sub: "Un mot sur votre expérience aide énormément notre équipe.",
      cta: "Laisser un avis ★★★★★",
    },
    en: {
      title: "Your review matters to us",
      sub: "A few words about your stay help our team enormously.",
      cta: "Leave a review ★★★★★",
    },
    ar: {
      title: "رأيك يهمنا",
      sub: "كلمة عن تجربتك تساعد فريقنا كثيرًا.",
      cta: "اترك تقييمًا ★★★★★",
    },
  }[lang];

  const dir = lang === "ar" ? ' dir="rtl"' : "";
  const snippet = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${dir} style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;max-width:460px">
  <tr>
    <td style="padding:14px 16px;background:#111111;border-radius:12px;color:#ffffff">
      <div style="font-size:15px;font-weight:bold;color:#ffffff">${businessName}</div>
      <div style="font-size:14px;color:#ffffff;padding-top:4px">${t.title}</div>
      <div style="font-size:12px;color:#cccccc;padding-top:2px">${t.sub}</div>
      <div style="padding-top:10px">
        <a href="${rateEmailUrl}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:9px 16px;border-radius:8px">${t.cta}</a>
      </div>
      <div style="font-size:10px;color:#888888;padding-top:8px">oneworldmorocco.com</div>
    </td>
  </tr>
</table>`;

  return (
    <section className="scroll-mt-32 border-t border-border pt-16">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Widget {String(index).padStart(2, "0")}
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-3">
        <span>Signature email « Laisser un avis »</span>
      </h2>
      <p className="text-lg text-primary font-medium mb-4">
        Version email statique, sans iframe ni JavaScript.
      </p>
      <p className="text-base text-muted-foreground max-w-3xl mb-8">
        Un bandeau HTML compatible Gmail, Outlook et Apple Mail qui invite le client à laisser un avis
        Google ou TripAdvisor. Il se colle dans la signature d'email, le pied de confirmation de
        réservation, ou la relance après séjour. Le bouton vert ouvre la page d'avis correspondant à la
        plateforme et à la langue choisies.
      </p>
      <Badge className="mb-5">Prix : inclus dans l'abonnement</Badge>

      <div className="grid gap-5 sm:grid-cols-3 mb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Plateformes
          </p>
          <div className="flex flex-wrap gap-2">
            {RATE_PLATFORMS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPlatform(p.key)} className={chip(platform === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Langue</p>
          <div className="flex gap-2">
            {(["fr", "en", "ar"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`${chip(lang === l)} uppercase`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 items-start">
        <div>
          <div
            className="rounded-xl border border-border bg-white p-6 shadow-lg inline-block"
            dangerouslySetInnerHTML={{ __html: snippet }}
          />
          <a
            href={rateEmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Ouvrir la page d'avis <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Code HTML à copier
          </h3>
          <CopyBlock code={snippet} id="email-signature" previewLines={2} disableCopy />
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Où le coller
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Signature email du propriétaire / GM / conciergerie.</li>
              <li>Pied d'email de confirmation après réservation.</li>
              <li>Relance post-séjour (72 h après le départ).</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const Widgets = () => {
  useSEO({
    title: "Widgets & iframes One World Morocco à intégrer",
    description:
      "Météo, marées, assistant IA, adresses à proximité, avis clients, articles : intégrez les widgets One World Morocco sur votre site ou celui de vos partenaires.",
    canonical: "/widgets",
  });

  const weatherUrl = `${SITE}/embed/weather?city=Marrakech&lang=fr`;
  const askUrl = `${SITE}/embed/ask/${DEMO_SLUG}?theme=light&lang=fr`;
  
  const ficheUrl = `${SITE}/b/${DEMO_SLUG}?embed=1&lang=fr`;

  const floatingSnippet = useMemo(
    () => `<!-- Panneau flottant One World Morocco -->
<style>
  #owm-tab{position:fixed;right:0;top:38%;z-index:99998;background:#B85C38;color:#fff;border:0;
    padding:14px 10px;border-radius:12px 0 0 12px;font:600 13px/1.2 system-ui;cursor:pointer;
    writing-mode:vertical-rl;letter-spacing:.06em}
  #owm-panel{position:fixed;top:0;right:0;height:100%;width:min(460px,100%);z-index:99999;
    background:#111;transform:translateX(100%);transition:transform .35s ease;box-shadow:-20px 0 60px rgba(0,0,0,.45)}
  #owm-panel.owm-open{transform:translateX(0)}
  #owm-panel iframe{width:100%;height:100%;border:0}
  #owm-close{position:absolute;left:-44px;top:14px;width:36px;height:36px;border:0;border-radius:50%;
    background:#fff;color:#111;font-size:18px;cursor:pointer}
</style>
<button id="owm-tab" aria-label="Ouvrir le widget One World Morocco">DÉCOUVRIR</button>
<div id="owm-panel" aria-hidden="true">
  <button id="owm-close" aria-label="Fermer">&times;</button>
  <iframe src="${askUrl}" title="Assistant One World Morocco" loading="lazy"></iframe>
</div>
<script>
(function(){
  var tab=document.getElementById('owm-tab'),panel=document.getElementById('owm-panel'),
      close=document.getElementById('owm-close');
  tab.addEventListener('click',function(){panel.classList.add('owm-open');panel.setAttribute('aria-hidden','false');});
  close.addEventListener('click',function(){panel.classList.remove('owm-open');panel.setAttribute('aria-hidden','true');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close.click();});
})();
</script>`,
    [askUrl]
  );

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      <main className="container mx-auto px-4 pt-32 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Intro */}
          <header className="mb-20">
            <picture>
              <source media="(min-width: 768px)" srcSet={widgetsHero} />
              <img
                src={widgetsHeroVertical}
                alt="Widgets One World Morocco : assistant IA vocal, carte des adresses à proximité et avis clients"
                width={1920}
                height={960}
                className="mb-10 w-full rounded-2xl border border-gold/30 object-cover"
              />
            </picture>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-5">

              Écosystème ouvert
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-8">
              Les widgets One World Morocco
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-6">
              Météo locale, marées des villes côtières, assistant IA conversationnel, adresses à proximité, avis clients vérifiés,
              articles éditoriaux : chaque brique de la plateforme est disponible sous forme de widget
              accessible depuis une URL publique.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Ces widgets sont <strong className="text-foreground">intégrables à votre site web ou à celui
              de vos partenaires numériques, sous réserve de compatibilité technologique</strong> : la
              plateforme d'accueil doit autoriser l'insertion d'un code HTML libre (balise
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">iframe</code>) et ne pas
              bloquer les contenus tiers par une politique de sécurité restrictive.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Aucune installation, aucune clé API, aucune maintenance : vous collez un extrait de code,
              le contenu reste synchronisé en temps réel avec nos données.
            </p>
          </header>

          {/* Widgets */}
          <div className="space-y-20">
            <WidgetSection
              index={1}
              icon={<MessageSquare className="h-5 w-5" />}
              title="Widget Assistant IA & Vocal"
              banner={<AiMarketingBanner />}
              tagline="Un conseiller local intelligent, greffé à votre page."
              price="Prix : sur devis"
              description="L'assistant répond aux questions des visiteurs sur un établissement et son environnement en mode texte et vocal : que faire à proximité, rooftops, horaires, réservation en ligne, menus, articles liés. Les suggestions de départ et les relances sont pilotées depuis notre back-office. L'App peut être consultée à partir des réponses de l'assistant IA et garde toutes ses fonctionnalités (itinéraires, réservation...)."

              params={[
                { name: "slug", value: "identifiant de l'établissement" },
                { name: "theme", value: "light | dark" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={toPreview(askUrl)}
              previewHeight={620}
              previewMaxWidth={520}
              snippet={`<iframe src="${askUrl}" style="width:100%;max-width:520px;height:620px;border:0;border-radius:20px" title="Assistant One World Morocco" loading="lazy"></iframe>`}
              extra={
                <div className="mt-8">
                  <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Variante : panneau flottant
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Un onglet fixé sur le bord droit de l'écran ouvre l'assistant en plein hauteur, sans
                    occuper d'espace dans votre mise en page. À coller avant la balise de fermeture
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5">body</code> (Wix : Custom Code).
                  </p>
                  <CopyBlock code={floatingSnippet} id="floating" previewLines={4} disableCopy />
                </div>
              }
            />

            <NearbyWidgetSection index={2} />

            <WidgetSection
              index={3}
              icon={<LayoutPanelTop className="h-5 w-5" />}
              title="Widget Votre ID numérique type Linktree"
              tagline="Tous vos canaux numériques rassemblés au même endroit."
              price="Prix : sur devis"
              description="La fiche publique complète : galerie photo, badge d'avis, présentation, horaires, blocs à la une, boutons de contact et de réservation, adresses à proximité. Fond transparent, coins arrondis, et hauteur automatique — le widget communique sa hauteur réelle à votre page, sans barre de défilement interne."
              params={[
                { name: "slug", value: "identifiant de l'établissement" },
                { name: "embed", value: "1 (mode widget)" },
                { name: "club", value: "0 pour masquer le bandeau Club" },
              ]}
              previewUrl={toPreview(ficheUrl)}
              autoHeight
              previewHeight={720}
              fullWidthPreview
              snippet={`<!-- Fiche complète One World Morocco -->
<iframe id="owm-fiche" src="${ficheUrl}"
  style="width:100%;max-width:900px;height:900px;border:0;border-radius:24px"
  title="Fiche One World Morocco" loading="lazy"></iframe>
<script>
window.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'owm-fiche-height') return;
  var f = document.getElementById('owm-fiche');
  if (f) f.style.height = e.data.height + 'px';
});
</script>`}
            />

            <WidgetSection
              index={4}
              icon={<CloudSun className="h-5 w-5" />}
              title="Widget Météo"
              tagline="La météo d'une ville marocaine, en direct et sans clé API."
              price="Gratuit"
              description="Températures actuelles, conditions et prévisions pour Marrakech, Essaouira ou toute autre ville couverte. Compact, sobre, signé oneworldmorocco.com. Une version JSON de l'API est également disponible pour un affichage entièrement sur-mesure."

              params={[
                { name: "city", value: "Marrakech, Essaouira…" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={toPreview(weatherUrl)}
              autoHeight
              previewHeight={420}
              previewMaxWidth={420}

              snippet={`<iframe src="${weatherUrl}" style="width:100%;max-width:420px;height:560px;border:0;border-radius:20px" title="Météo Marrakech" loading="lazy"></iframe>`}

            />

            <TidesWidgetSection index={5} />

            <ReviewsWidgetSection index={6} />

            <RateUsWidgetSection index={7} />

            <EmailSignatureWidgetSection index={8} />

            <WidgetSection
              index={9}
              icon={<Newspaper className="h-5 w-5" />}
              title="Export d'article de blog"
              tagline="Votre article éditorial, republié sur votre propre domaine."
              price="Prix : sur devis"
              description="Ce n'est pas un iframe : depuis l'espace affilié (onglet Outils > « Vos articles de blog »), vous choisissez l'article et la langue, puis vous copiez le code HTML complet ou téléchargez le fichier. Mise en page complète, médias servis depuis oneworldmorocco.com, et panneau latéral autonome (CSS + JS inclus) qui ouvre les fiches des établissements cités avec navigation par balayage vertical. Rien à maintenir de votre côté."
              previewNode={
                <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    Comment récupérer le code
                  </p>
                  <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5">
                    <li>Espace affilié &gt; <strong className="text-foreground">Présence</strong> &gt; onglet <strong className="text-foreground">Outils</strong>.</li>
                    <li>Section <strong className="text-foreground">« Vos articles de blog (code à copier) »</strong>.</li>
                    <li>Sélectionnez l'article rattaché à votre établissement et la langue (FR / EN / AR).</li>
                    <li><strong className="text-foreground">Copier le code de l'article</strong> ou <strong className="text-foreground">Télécharger le fichier HTML</strong>.</li>
                    <li>Collez-le dans une page de votre CMS, ou déposez le fichier sur votre hébergement.</li>
                  </ol>
                  <a
                    href="/affiliates/presence"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Ouvrir l'espace affilié <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              }
              snippet={`<!-- Structure du fichier généré (extrait) -->
<article class="owm-article">
  <h1>…titre de l'article…</h1>
  <img src="https://oneworldmorocco.com/…/photo.webp" alt="…">
  <a class="owm-open" data-owm-slug="riad-dar-najat">Riad Dar Najat</a>
</article>

<!-- Panneau latéral embarqué (CSS + JS autonomes, déjà inclus dans l'export) -->
<div id="owm-side-panel"><iframe title="Fiche One World Morocco"></iframe></div>

<!-- Code complet : /affiliates/presence > Outils > Vos articles de blog -->`}
            />

          </div>

          {/* Compatibilité */}
          <section className="mt-24 border-t border-border pt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Compatibilité des plateformes
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mb-12">
              La règle est simple : si la plateforme permet d'insérer un code HTML libre, les widgets
              fonctionnent. Voici l'état des lieux des principaux environnements.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Plateformes compatibles
                </h3>
                <ul className="space-y-4">
                  {COMPATIBLE.map(([name, how]) => (
                    <li key={name}>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-sm text-muted-foreground">{how}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <span className="text-destructive text-lg leading-none">×</span>
                  Plateformes non compatibles
                </h3>
                <ul className="space-y-4">
                  {INCOMPATIBLE.map(([name, why]) => (
                    <li key={name}>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-sm text-muted-foreground">{why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Aide */}
          <section className="mt-20 rounded-3xl border border-border bg-card p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Besoin d'une intégration sur mesure ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Les établissements partenaires génèrent leurs propres codes, adaptés à leur fiche, depuis
              l'onglet Outils de leur espace. Pour un format spécifique ou un accès aux données en JSON,
              écrivez-nous.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href="/affiliates/presence">Espace partenaire</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/contact">Nous contacter</a>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Widgets;
