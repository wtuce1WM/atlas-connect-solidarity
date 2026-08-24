import { useRef, useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, ExternalLink, QrCode, Globe2, Mail, Bot, MapPin, Newspaper, Star, CloudSun, ThumbsUp, Waves, Loader2, Music2, AudioLines, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AffiliateArticleExport from "@/components/affiliate/AffiliateArticleExport";
import HexColorField from "@/components/affiliate/HexColorField";
import WidgetTester from "@/components/affiliate/WidgetTester";
import { fetchBusinessWidgetCommon, saveBusinessWidgetSettingsForAll } from "@/lib/widgetSettings";
import { FIT_OPTIONS, fitFlags, fitIframeStyle, fitIframeSnippet, fitParam,
  cardParam, autoHeightSnippet, SIZE_OPTIONS, sizeMaxWidth, type EmbedFit, type EmbedSize } from "@/lib/embedFit";


export type ToolsRights = {
  aiAssistant: boolean;
  blogExport: boolean;
  nearbyWidget: boolean;
  emailSignature: boolean;
};

interface Props {
  slug: string | null;
  businessName: string;
  businessId?: string | null;
  rights?: ToolsRights;
}

const SITE = "https://oneworldmorocco.com";

// Les codes à copier pointent toujours vers le domaine de production, mais les
// APERÇUS doivent être servis par l'origine courante (preview / staging) sinon on
// visualise la version publiée et non les réglages en cours.
const previewSrc = (url: string) =>
  typeof window !== "undefined" && window.location.origin !== SITE
    ? url.replace(SITE, window.location.origin)
    : url;

const REVIEW_PLATFORMS = [
  { key: "all" as const, label: "Synthèse" },
  { key: "google" as const, label: "Google" },
  { key: "tripadvisor" as const, label: "TripAdvisor" },
  { key: "restaurant-guru" as const, label: "Restaurant Guru" },
];
type ReviewPlatformKey = (typeof REVIEW_PLATFORMS)[number]["key"];

const RATE_PLATFORMS = [
  { key: "all" as const, label: "Google + TripAdvisor" },
  { key: "google" as const, label: "Google" },
  { key: "tripadvisor" as const, label: "TripAdvisor" },
];
type RatePlatformKey = (typeof RATE_PLATFORMS)[number]["key"];

const AffiliateToolsTab = ({ slug, businessName, businessId = null, rights = { aiAssistant: true, blogExport: true, nearbyWidget: true, emailSignature: true } }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("light");
  const [embedCard, setEmbedCard] = useState<"widget" | "transparent">("widget");
  const [embedLang, setEmbedLang] = useState<"fr" | "en" | "ar">("fr");
  const [embedHeight, setEmbedHeight] = useState<number>(640);
  const [assistantName, setAssistantName] = useState<string>("Zitoun IA");
  const [panelTabPos, setPanelTabPos] = useState<"top" | "middle" | "bottom">("middle");
  const [nearbyLang, setNearbyLang] = useState<"fr" | "en" | "ar">("fr");
  const [nearbyHeight, setNearbyHeight] = useState<number>(720);
  const [nearbyBg, setNearbyBg] = useState<string>("");
  const [reviewsPlatform, setReviewsPlatform] = useState<ReviewPlatformKey>("all");
  const [reviewsLang, setReviewsLang] = useState<"fr" | "en" | "ar">("fr");
  const [reviewsPreset, setReviewsPreset] = useState<string>("v-sm");
  const [reviewsCard, setReviewsCard] = useState<"dark" | "widget" | "transparent">("dark");
  const [rateCard, setRateCard] = useState<"dark" | "widget" | "transparent">("dark");

  const [ratePlatform, setRatePlatform] = useState<RatePlatformKey>("all");
  const [rateLang, setRateLang] = useState<"fr" | "en" | "ar">("fr");
  const [rateVariant, setRateVariant] = useState<"card" | "bar">("card");

  const [weatherCity, setWeatherCity] = useState<string>("Marrakech");
  const [weatherLang, setWeatherLang] = useState<"fr" | "en" | "ar">("fr");
  const [weatherSize, setWeatherSize] = useState<EmbedSize>("md");
  const [weatherCard, setWeatherCard] = useState<"transparent" | "widget" | "light" | "dark">("transparent");
  // Format d'affichage : carte verticale classique ou bandeau footer full-width (desktop).
  const [weatherLayout, setWeatherLayout] = useState<"card" | "footer">("card");
  const [weatherSticky, setWeatherSticky] = useState(false);

  const [tidesCity, setTidesCity] = useState<string>("Essaouira");
  const [ficheMaxWidth, setFicheMaxWidth] = useState<number>(380);
  const [ficheShowClub, setFicheShowClub] = useState<boolean>(true);
  // Widget Fiche 1WM (/embed/fiche/:slug)
  const [f1wmLang, setF1wmLang] = useState<"fr" | "en" | "ar">("fr");
  const [f1wmHeight, setF1wmHeight] = useState<number>(900);
  const [f1wmBgMode, setF1wmBgMode] = useState<"widget" | "transparent">("widget");

  const [tidesLang, setTidesLang] = useState<"fr" | "en" | "ar">("fr");

  // Widgets Réseaux & flux (Spotify / SoundCloud / Substack)
  const [socialUrls, setSocialUrls] = useState<{ spotify: string; soundcloud: string; substack: string }>({ spotify: "", soundcloud: "", substack: "" });
  const [spotifyBgMode, setSpotifyBgMode] = useState<"widget" | "transparent">("widget");
  const [spotifyCompact, setSpotifyCompact] = useState(false);
  const [scBgMode, setScBgMode] = useState<"widget" | "transparent">("widget");
  const [scVisual, setScVisual] = useState(true);
  const [subBgMode, setSubBgMode] = useState<"widget" | "transparent">("widget");
  const [subLang, setSubLang] = useState<"fr" | "en" | "ar">("fr");
  const [subLimit, setSubLimit] = useState<number>(3);

  // Ajustement de chaque widget dans son iframe (largeur / hauteur / les deux)
  const [fits, setFits] = useState<Record<string, EmbedFit>>({});
  const fitOf = (key: string): EmbedFit => fits[key] || "";

  // Rayon de proximité (businesses.poi_radius_km)
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [radiusLoading, setRadiusLoading] = useState<boolean>(true);
  const [radiusSaving, setRadiusSaving] = useState<boolean>(false);
  const [radiusSaved, setRadiusSaved] = useState<boolean>(false);

  // Couleur de fond des widgets — source unique : business_widget_settings
  // (repli sur les anciennes colonnes de la fiche le temps de la reprise).
  const [widgetBg, setWidgetBg] = useState<string>("");
  const [widgetBgSaving, setWidgetBgSaving] = useState<boolean>(false);
  const [widgetBgSaved, setWidgetBgSaved] = useState<boolean>(false);
  const widgetBgValid = /^#[0-9a-fA-F]{6}$/.test(widgetBg);
  // Couleur de fond des widgets dédiée au mode sombre.
  const [widgetBgDark, setWidgetBgDark] = useState<string>("");
  const [widgetBgDarkSaving, setWidgetBgDarkSaving] = useState<boolean>(false);
  const [widgetBgDarkSaved, setWidgetBgDarkSaved] = useState<boolean>(false);
  const widgetBgDarkValid = /^#[0-9a-fA-F]{6}$/.test(widgetBgDark);

  useEffect(() => {
    if (!businessId) { setRadiusLoading(false); return; }
    let cancelled = false;
    (async () => {
      setRadiusLoading(true);
      const [{ data }, common] = await Promise.all([
        (supabase as any)
          .from("businesses")
          .select("poi_radius_km, widget_bg_color, widget_bg_color_dark, widget_theme, spotify_url, soundcloud_url, substack_url")
          .eq("id", businessId)
          .maybeSingle(),
        fetchBusinessWidgetCommon(businessId).catch(() => ({ bgLight: "", bgDark: "", theme: null as null })),
      ]);
      if (cancelled) return;
      const v = Number((data as any)?.poi_radius_km);
      setRadiusKm(v > 0 ? v : 10);
      setSocialUrls({
        spotify: (data as any)?.spotify_url || "",
        soundcloud: (data as any)?.soundcloud_url || "",
        substack: (data as any)?.substack_url || "",
      });
      const wcolor = (common.bgLight || (data as any)?.widget_bg_color || "").toUpperCase();
      setWidgetBg(wcolor);
      setWidgetBgDark((common.bgDark || (data as any)?.widget_bg_color_dark || "").toUpperCase());
      const theme = common.theme || (data as any)?.widget_theme;
      if (theme === "light" || theme === "dark") setEmbedTheme(theme);

      // Widget « À proximité » : on pré-remplit le fond de carte avec la couleur
      // de fond des widgets de l'établissement quand elle est définie.
      if (/^#[0-9A-F]{6}$/.test(wcolor)) setNearbyBg((prev) => prev || wcolor);
      setRadiusLoading(false);

    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const saveRadius = async (v: string) => {
    const num = parseFloat(v);
    setRadiusKm(num);
    if (!businessId) return;
    setRadiusSaving(true);
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ poi_radius_km: num })
      .eq("id", businessId);
    setRadiusSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRadiusSaved(true);
  };

  const saveWidgetBg = async (raw: string) => {
    if (!businessId) return;
    const value = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : null;
    if (raw && !value) return;
    setWidgetBgSaving(true);
    setWidgetBgSaved(false);
    try {
      await saveBusinessWidgetSettingsForAll(businessId, { bg_light: value });
    } catch (e: any) {
      setWidgetBgSaving(false);
      toast({ title: "Erreur", description: e?.message || "Enregistrement impossible", variant: "destructive" });
      return;
    }
    setWidgetBgSaving(false);
    setWidgetBgSaved(true);
  };




  const saveWidgetBgDark = async (raw: string) => {
    if (!businessId) return;
    const value = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : null;
    if (raw && !value) return;
    setWidgetBgDarkSaving(true);
    setWidgetBgDarkSaved(false);
    try {
      await saveBusinessWidgetSettingsForAll(businessId, { bg_dark: value });
    } catch (e: any) {
      setWidgetBgDarkSaving(false);
      toast({ title: "Erreur", description: e?.message || "Enregistrement impossible", variant: "destructive" });
      return;
    }
    setWidgetBgDarkSaving(false);
    setWidgetBgDarkSaved(true);
  };


  /** Thème par défaut des widgets (sombre/clair) — persisté sur business_widget_settings. */
  const saveEmbedTheme = async (t: "dark" | "light") => {
    setEmbedTheme(t);
    if (!businessId) return;
    try {
      await saveBusinessWidgetSettingsForAll(businessId, { theme: t });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Enregistrement impossible", variant: "destructive" });
      return;
    }
    toast({ title: t === "dark" ? "Thème sombre enregistré" : "Thème clair enregistré" });
  };




  const fitRow = (key: string) => (
    <div className="space-y-1.5">
      <Label className="text-white/80 text-xs">Ajustement dans la page hôte</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {FIT_OPTIONS.map((o) => (
          <button
            key={o.value || "std"}
            type="button"
            onClick={() => setFits((prev) => ({ ...prev, [key]: o.value }))}
            className={`text-[11px] leading-tight py-1.5 px-2 rounded-md border ${
              fitOf(key) === o.value ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-white/50">
        « Toute la largeur / hauteur » étire le widget dans son conteneur pour éviter les scrolls
        internes et un affichage trop étroit.
      </p>
    </div>
  );

  if (!slug) {
    return (
      <div className="text-sm text-white/70">
        Enregistrez d'abord un slug (onglet Texte) pour générer les liens et le QR code.
      </div>
    );
  }

  // « Couleur du widget » = intérieur du widget coloré, page toujours transparente.
  const wbg = cardParam(widgetBgValid ? widgetBg : "");
  // Assistant IA : la couleur suit le mode d'affichage choisi (clair / sombre).
  const askBgColor =
    embedTheme === "dark" ? (widgetBgDarkValid ? widgetBgDark : widgetBg) : widgetBg;
  const askBgValid = /^#[0-9a-fA-F]{6}$/.test(askBgColor);
  const askCard = cardParam(askBgValid ? askBgColor : "");
  const publicUrl = `${SITE}/${slug}`;
  const shortUrl = `${SITE}/b/${slug}`;
  // Assistant IA : version « couleur de fond des widgets » (si définie) ou version transparente
  const embedBase = `${SITE}/embed/ask/${slug}?theme=${embedTheme}&lang=${embedLang}${fitParam(fitOf("embed"))}`;
  const embedUrlWidget = `${embedBase}${askCard}`;
  const embedUrlTransparent = `${embedBase}&bg=transparent`;
  const embedUrl = embedCard === "transparent" ? embedUrlTransparent : embedUrlWidget;
  const embedSnippet = useMemo(() => {
    const fit = fitOf("embed");
    const { fullHeight } = fitFlags(fit);
    if (!fullHeight) {
      return autoHeightSnippet({
        id: `owm-ask-${slug}`,
        msgType: "owm-ask-height",
        url: embedUrl,
        title: `Assistant IA — ${businessName}`,
        maxWidth: 420,
        height: embedHeight,
        radius: 16,
        allow: "clipboard-write; microphone",
      });
    }
    return `<iframe src="${embedUrl}" style="${fitIframeStyle(fit, { maxWidth: 420, height: embedHeight, radius: 16, extra: "box-shadow:0 4px 24px rgba(0,0,0,0.15)" })}" title="Assistant IA — ${businessName}" loading="lazy" allow="clipboard-write; microphone"></iframe>`;
  }, [embedUrl, embedHeight, businessName, fits]);

  // Panneau flottant : le volet reprend exactement la couleur du widget dans le
  // mode choisi (clair / sombre) pour éviter tout liseré blanc ou gris.
  const panelSurface = askBgValid ? askBgColor : embedTheme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const trimmedAssistantName = assistantName.trim();
  const panelUrl = `${embedUrlWidget}&panel=1${
    trimmedAssistantName ? `&name=${encodeURIComponent(trimmedAssistantName)}` : ""
  }`;
  const tabTopCss =
    panelTabPos === "top" ? "25%" : panelTabPos === "bottom" ? "75%" : "50%";
  const floatingSnippet = useMemo(
    () => `<!-- Assistant IA One World Morocco — ${businessName} -->
<style>
  #owm-embed-tab {
    position: fixed; top: ${tabTopCss}; right: max(16px, env(safe-area-inset-right));
    transform: translateY(-50%) rotate(-90deg); transform-origin: right center;
    background: #C04F17; color: #fff; padding: 14px 22px; border: none;
    border-radius: 8px 8px 0 0; font-family: Montserrat, sans-serif;
    font-weight: 600; font-size: 13px; letter-spacing: 0.05em; white-space: nowrap;
    cursor: pointer; z-index: 999998; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  #owm-embed-scrim {
    position: fixed; inset: 0; background: rgba(0,0,0,.55);
    opacity: 0; pointer-events: none; z-index: 999997;
    transition: opacity .35s ease;
  }
  #owm-embed-scrim.open { opacity: 1; pointer-events: auto; }
  #owm-embed-panel {
    position: fixed; top: 0; right: -70vw; width: 70vw; height: 100vh; height: 100dvh;
    background: ${panelSurface}; color-scheme: ${embedTheme};
    z-index: 999999; transition: right .35s ease;
    box-shadow: -8px 0 40px rgba(0,0,0,.25); display: flex; flex-direction: column;
  }
  #owm-embed-panel.open { right: 0; }
  #owm-embed-iframe { flex: 1; width: 100%; border: none; background: ${panelSurface}; }
  /* Scroll de l'hôte gelé pendant l'ouverture : la barre de défilement du
     navigateur disparaît, le volet couvre donc toute la droite du viewport. */
  html.owm-embed-lock, body.owm-embed-lock { overflow: hidden !important; overscroll-behavior: none; }
  @media (max-width: 768px) { #owm-embed-panel { width: 100vw; right: -100vw; } }


</style>

<button id="owm-embed-tab" aria-label="Ouvrir l&#39;assistant IA">${trimmedAssistantName || 'Assistant 1WM'}</button>
<div id="owm-embed-scrim" aria-hidden="true"></div>
<div id="owm-embed-panel" role="dialog" aria-hidden="true">
  <iframe id="owm-embed-iframe" src="${panelUrl}" title="Assistant IA — ${businessName}" allow="clipboard-write; geolocation; microphone" loading="lazy"></iframe>
</div>

<script>
  (function () {
    var tab = document.getElementById('owm-embed-tab');
    var panel = document.getElementById('owm-embed-panel');
    var scrim = document.getElementById('owm-embed-scrim');
    var frame = document.getElementById('owm-embed-iframe');
    // Le voile et le volet démarrent leur transition sur la même frame :
    // l'assombrissement suit exactement l'ouverture, jamais avant.
    var prevPadRight = '';
    function lock() {
      var sbw = window.innerWidth - document.documentElement.clientWidth;
      prevPadRight = document.body.style.paddingRight;
      if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
      document.documentElement.classList.add('owm-embed-lock');
      document.body.classList.add('owm-embed-lock');
    }
    function unlock() {
      document.documentElement.classList.remove('owm-embed-lock');
      document.body.classList.remove('owm-embed-lock');
      document.body.style.paddingRight = prevPadRight;
    }
    function open() {
      lock();
      requestAnimationFrame(function () {
        panel.classList.add('open');
        scrim.classList.add('open');
      });
      panel.setAttribute('aria-hidden', 'false');
      scrim.setAttribute('aria-hidden', 'false');
    }
    function shut() {
      panel.classList.remove('open');
      scrim.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      scrim.setAttribute('aria-hidden', 'true');
      unlock();
    }
    tab.addEventListener('click', open);
    scrim.addEventListener('click', shut);


    // La croix de fermeture est dans le widget (à gauche de l'avatar) : il nous
    // prévient par postMessage.
    window.addEventListener('message', function (e) {
      if (e && e.data && e.data.type === 'owm-embed-close') shut();
      if (e && e.data && e.data.type === 'owm-embed-theme' && /^#[0-9A-Fa-f]{6}$/.test(e.data.background || '')) {
        panel.style.background = e.data.background;
        frame.style.background = e.data.background;
        panel.style.colorScheme = e.data.theme === 'dark' ? 'dark' : 'light';
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
  })();
</script>`,
    [panelUrl, businessName, panelSurface, embedTheme, tabTopCss]
  );


  // Couleur forcée dans ce widget, sinon couleur de fond des widgets de l'établissement
  const effectiveNearbyBg = /^#[0-9a-fA-F]{6}$/.test(nearbyBg) ? nearbyBg : (widgetBgValid ? widgetBg : "");
  const nearbyBgValid = /^#[0-9a-fA-F]{6}$/.test(effectiveNearbyBg);
  const nearbyUrl = `${SITE}/embed/nearby/${slug}?lang=${nearbyLang}${nearbyBgValid ? `&bg=${effectiveNearbyBg.slice(1)}` : ""}${fitParam(fitOf("nearby"))}`;
  const nearbySnippet = useMemo(
    () =>
      `<iframe src="${nearbyUrl}" style="${fitIframeStyle(fitOf("nearby"), { height: nearbyHeight, radius: 16, extra: "box-shadow:0 4px 24px rgba(0,0,0,0.15)" })}" title="À proximité — ${businessName}" loading="lazy" allow="geolocation"></iframe>`,
    [nearbyUrl, nearbyHeight, businessName, fits]
  );

  const nearbyFloatingSnippet = useMemo(
    () => `<!-- À proximité One World Morocco — ${businessName} -->
<style>
  #owm-nearby-tab {
    position: fixed; top: 50%; left: max(16px, env(safe-area-inset-left));
    transform: translateY(-50%) rotate(90deg); transform-origin: left center;
    background: #0F172A; color: #fff; padding: 14px 22px; border: none;
    border-radius: 8px 8px 0 0; font-family: Montserrat, sans-serif;
    font-weight: 600; font-size: 13px; letter-spacing: 0.05em; white-space: nowrap;
    cursor: pointer; z-index: 999996; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  #owm-nearby-panel {
    position: fixed; top: 0; left: -100%; width: 60vw; height: 100vh;
    background: #fff; z-index: 999997; transition: left .35s ease;
    box-shadow: 8px 0 40px rgba(0,0,0,.25); display: flex; flex-direction: column;
  }
  #owm-nearby-panel.open { left: 0; }
  #owm-nearby-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 20px; background: #0F172A; color: #fff;
    font-family: Montserrat, sans-serif; font-weight: 600; font-size: 14px;
  }
  #owm-nearby-close { background: transparent; border: none; color: #fff; font-size: 22px; cursor: pointer; padding: 0 8px; }
  #owm-nearby-iframe { flex: 1; width: 100%; border: none; }
  @media (max-width: 768px) { #owm-nearby-panel { width: 100vw; } }
</style>

<button id="owm-nearby-tab" aria-label="Voir les lieux à proximité">À proximité</button>
<div id="owm-nearby-panel" role="dialog" aria-hidden="true">
  <div id="owm-nearby-header">
    <span>À proximité — ${businessName}</span>
    <button id="owm-nearby-close" aria-label="Fermer">&#10005;</button>
  </div>
  <iframe id="owm-nearby-iframe" data-src="${nearbyUrl}" title="À proximité — ${businessName}" allow="geolocation" loading="lazy"></iframe>
</div>

<script>
  (function () {
    var tab = document.getElementById('owm-nearby-tab');
    var panel = document.getElementById('owm-nearby-panel');
    var frame = document.getElementById('owm-nearby-iframe');
    var close = document.getElementById('owm-nearby-close');
    function open() {
      if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
      panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
    }
    function shut() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
    tab.addEventListener('click', open);
    close.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
  })();
</script>`,
    [nearbyUrl, businessName]
  );

  const REVIEW_PRESETS: Record<string, { label: string; ratio: string; size: string; w: number; h: number }> = {
    "v-sm": { label: "Vertical S", ratio: "vertical", size: "sm", w: 460, h: 560 },
    "v-lg": { label: "Vertical L", ratio: "vertical", size: "lg", w: 460, h: 1000 },
    "h-sm": { label: "Horizontal S", ratio: "horizontal", size: "sm", w: 760, h: 340 },
    "h-lg": { label: "Horizontal L", ratio: "horizontal", size: "lg", w: 900, h: 460 },
    "square": { label: "Carré", ratio: "square", size: "sm", w: 480, h: 480 },
  };
  const preset = REVIEW_PRESETS[reviewsPreset] || REVIEW_PRESETS["v-sm"];
  // « Transparent » : la page du widget est transparente (fond du site hôte) mais
  // l'intérieur de la carte d'avis prend la couleur de fond des widgets (`card=`).
  const reviewsBgParam =
    reviewsCard === "transparent"
      ? `&bg=transparent${widgetBgValid ? `&card=${widgetBg.slice(1)}` : ""}`
      : reviewsCard === "dark"
        ? ""
        : wbg;
  const reviewsUrl = `${SITE}/embed/reviews/${slug}?platform=${reviewsPlatform}&lang=${reviewsLang}&ratio=${preset.ratio}&size=${preset.size}${fitParam(fitOf("reviews"))}${reviewsBgParam}`;

  const reviewsSnippet = useMemo(
    () =>
      fitOf("reviews") === ""
        ? autoHeightSnippet({
            id: "owm-reviews",
            msgType: "owm-reviews-height",
            url: reviewsUrl,
            title: `Avis clients — ${businessName}`,
            maxWidth: preset.w,
            height: preset.h,
          })
        : `<iframe src="${reviewsUrl}" style="${fitIframeStyle(fitOf("reviews"), { maxWidth: preset.w, height: preset.h, radius: 20 })}" title="Avis clients — ${businessName}" loading="lazy"></iframe>`,
    [reviewsUrl, businessName, preset.w, preset.h, fits]
  );

  const rateW = rateVariant === "bar" ? 780 : 460;
  const rateH = rateVariant === "bar" ? 120 : 430;
  const rateBgParam =
    rateCard === "transparent" ? "&bg=transparent" : rateCard === "dark" ? "" : wbg;
  const rateBase = `${SITE}/embed/avis/${slug}?platform=${ratePlatform}&lang=${rateLang}&variant=${rateVariant}${fitParam(fitOf("rate"))}`;
  const rateUrlWidget = `${rateBase}${wbg}`;
  const rateUrlTransparent = `${rateBase}&bg=transparent`;
  const rateUrl = `${rateBase}${rateBgParam}`;
  const rateSnippet = useMemo(
    () =>
      fitOf("rate") === ""
        ? autoHeightSnippet({
            id: "owm-rate",
            msgType: "owm-rate-height",
            url: rateUrl,
            title: `Laisser un avis — ${businessName}`,
            maxWidth: rateW,
            height: rateH,
          })
        : `<iframe src="${rateUrl}" style="${fitIframeStyle(fitOf("rate"), { maxWidth: rateW, height: rateH, radius: 20 })}" title="Laisser un avis — ${businessName}" loading="lazy"></iframe>`,
    [rateUrl, rateW, rateH, businessName, fits]
  );

  // Version email-friendly (signature) : HTML statique en tableau, sans JS ni iframe
  const rateEmailUrl = `${SITE}/embed/avis/${slug}?platform=${ratePlatform}&lang=${rateLang}&variant=card&src=email`;
  const rateEmailSnippet = useMemo(() => {
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
    }[rateLang];
    const dir = rateLang === "ar" ? ' dir="rtl"' : "";
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${dir} style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;max-width:460px">
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
  }, [rateEmailUrl, rateLang, businessName]);



  const weatherBgParam =
    weatherCard === "widget"
      ? wbg
      : weatherCard === "light"
        ? "&bg=FFFFFF"
        : weatherCard === "dark"
          ? "&bg=1C1917"
          : "&bg=transparent";
  const isWeatherFooter = weatherLayout === "footer";
  const weatherUrl = isWeatherFooter
    ? `${SITE}/embed/weather?city=${encodeURIComponent(weatherCity || "Marrakech")}&lang=${weatherLang}&layout=footer&days=3${weatherBgParam}`
    : `${SITE}/embed/weather?city=${encodeURIComponent(weatherCity || "Marrakech")}&lang=${weatherLang}&size=${weatherSize}${fitParam(fitOf("weather"))}${weatherBgParam}`;
  const weatherMaxW = sizeMaxWidth(weatherSize);
  const weatherFooterSnippet = useMemo(
    () =>
      autoHeightSnippet({
        id: "owm-weather-footer",
        msgType: "owm-weather-height",
        url: weatherUrl,
        title: `Météo — ${weatherCity}`,
        height: 96,
        radius: 0,
        wrapperStyle: weatherSticky
          ? "position:fixed;left:0;right:0;bottom:0;z-index:2147483000;width:100%"
          : "width:100%",
      }),
    [weatherUrl, weatherCity, weatherSticky]
  );
  const weatherCardSnippet = useMemo(
    () =>
      fitOf("weather") === ""
        ? // Proportions conservées : la hauteur suit exactement le contenu (aucun scroll interne)
          autoHeightSnippet({
            id: "owm-weather",
            msgType: "owm-weather-height",
            url: weatherUrl,
            title: `Météo — ${weatherCity}`,
            maxWidth: weatherMaxW,
            height: 560,
          })
        : `<iframe src="${weatherUrl}" style="${fitIframeStyle(fitOf("weather"), { maxWidth: weatherMaxW, height: 560, radius: 20 })}" title="Météo — ${weatherCity}" loading="lazy"></iframe>`,
    [weatherUrl, weatherCity, weatherMaxW, fits]
  );
  const weatherSnippet = isWeatherFooter ? weatherFooterSnippet : weatherCardSnippet;


  const tidesUrl = `${SITE}/embed/tides?city=${encodeURIComponent(tidesCity || "Essaouira")}&lang=${tidesLang}${fitParam(fitOf("tides"))}${wbg}`;
  const tidesSnippet = useMemo(
    () =>
      fitOf("tides") === ""
        ? autoHeightSnippet({
            id: "owm-tides",
            msgType: "owm-tides-height",
            url: tidesUrl,
            title: `Marées — ${tidesCity}`,
            maxWidth: 520,
            height: 360,
          })
        : `<iframe src="${tidesUrl}" style="${fitIframeStyle(fitOf("tides"), { maxWidth: 520, height: 360, radius: 20 })}" title="Marées — ${tidesCity}" loading="lazy"></iframe>`,
    [tidesUrl, tidesCity, fits]
  );

  // Widget « Fiche complète » : /b/:slug en mode embed avec auto-resize
  const ficheUrl = `${SITE}/b/${slug ?? ""}?embed=1${ficheShowClub ? "" : "&club=0"}${fitParam(fitOf("fiche"))}${wbg}`;
  const ficheSnippet = useMemo(
    () =>
      `<div id="owm-fiche-wrap" style="${fitFlags(fitOf("fiche")).fullWidth ? "width:100%;" : `width:${ficheMaxWidth}px;max-width:100%;`}margin:0 auto">
  <iframe id="owm-fiche-frame" src="${ficheUrl}" style="${fitIframeStyle(fitOf("fiche"), { height: 1200, radius: 24, extra: "background:transparent" })}" title="Fiche — ${businessName}" loading="lazy" allow="clipboard-write"></iframe>
</div>
<script>
  (function () {
    var frame = document.getElementById('owm-fiche-frame');
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.type !== 'owm-fiche-height') return;
      if (frame.contentWindow !== e.source) return;
      frame.style.height = (e.data.height + 8) + 'px';
    });
  })();
</script>`,
    [ficheUrl, ficheMaxWidth, businessName, fits]
  );

  // Widget Fiche 1WM : /embed/fiche/:slug (BookOnlineSlidePanel embarqué)
  const f1wmBgParam =
    f1wmBgMode === "transparent" ? "&bg=transparent" : widgetBgValid ? `&bg=${widgetBg.slice(1)}` : "";
  const f1wmUrl = `${SITE}/embed/fiche/${slug ?? ""}?lang=${f1wmLang}${f1wmBgParam}${fitParam(fitOf("fiche1wm"))}`;
  const f1wmSnippet = useMemo(
    () =>
      `<iframe src="${f1wmUrl}" style="${fitIframeStyle(fitOf("fiche1wm"), { height: f1wmHeight, radius: 20, extra: "width:100%;background:transparent" })}" title="Fiche 1WM — ${businessName}" loading="lazy" allow="clipboard-write; geolocation"></iframe>`,
    [f1wmUrl, f1wmHeight, businessName, fits]
  );

  // Widgets Réseaux & flux
  const bgFor = (mode: "widget" | "transparent") =>
    mode === "transparent" ? "&bg=transparent" : widgetBgValid ? `&bg=${widgetBg.slice(1)}` : "";

  const spotifyUrl = `${SITE}/embed/spotify/${slug ?? ""}?theme=${embedTheme}${bgFor(spotifyBgMode)}${spotifyCompact ? "&compact=1" : ""}${fitParam(fitOf("spotify"))}`;
  const spotifyHeight = spotifyCompact ? 172 : 372;
  const spotifySnippet = `<iframe src="${spotifyUrl}" style="${fitIframeStyle(fitOf("spotify"), { maxWidth: 560, height: spotifyHeight, radius: 16, extra: "background:transparent" })}" title="Spotify — ${businessName}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;

  const scUrl = `${SITE}/embed/soundcloud/${slug ?? ""}?${scVisual ? "visual=1" : "visual=0"}${bgFor(scBgMode)}${fitParam(fitOf("soundcloud"))}`;
  const scHeight = scVisual ? 420 : 186;
  const scSnippet = `<iframe src="${scUrl}" style="${fitIframeStyle(fitOf("soundcloud"), { maxWidth: 560, height: scHeight, radius: 16, extra: "background:transparent" })}" title="SoundCloud — ${businessName}" loading="lazy" allow="autoplay"></iframe>`;

  const subUrl = `${SITE}/embed/substack/${slug ?? ""}?lang=${subLang}&limit=${subLimit}${bgFor(subBgMode)}${fitParam(fitOf("substack"))}`;
  const subHeight = 130 + subLimit * 96;
  const subSnippet = `<iframe src="${subUrl}" style="${fitIframeStyle(fitOf("substack"), { maxWidth: 560, height: subHeight, radius: 16, extra: "background:transparent" })}" title="Newsletter — ${businessName}" loading="lazy"></iframe>`;







  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  const downloadSvg = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr-${slug}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    img.src = url;
  };

  const renderUrlRow = (label: string, url: string, key: string) => (
    <div className="space-y-1.5">
      <Label className="text-white/80">{label}</Label>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => copy(url, key)} className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
          {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Globe2 className="h-4 w-4" /> Couleur de fond des widgets
        </h3>
        <p className="text-sm text-white/70 max-w-2xl">
          <span className="text-white font-medium">Vide = fond transparent.</span> Le fond de la page du widget reste
          toujours transparent (celui du site hôte) : la couleur saisie est appliquée à l'intérieur du widget.
          Une couleur par mode d'affichage : mode clair et mode sombre.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Mode clair</Label>
            <HexColorField
              value={widgetBg}
              onChange={setWidgetBg}
              onCommit={saveWidgetBg}
              disabled={radiusLoading || !businessId}
              saving={widgetBgSaving}
              saved={widgetBgSaved}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Mode sombre</Label>
            <HexColorField
              value={widgetBgDark}
              onChange={setWidgetBgDark}
              onCommit={saveWidgetBgDark}
              disabled={radiusLoading || !businessId}
              saving={widgetBgDarkSaving}
              saved={widgetBgDarkSaved}
            />
          </div>
        </div>
      </div>



      <div className="space-y-4">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Liens de partage
        </h3>
        {renderUrlRow("URL publique (fiche)", publicUrl, "public")}
        {renderUrlRow("CARTE DE VISITE DIGITALE", shortUrl, "short")}
      </div>


      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <QrCode className="h-4 w-4" /> QR Code
        </h3>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div ref={qrRef} className="bg-white p-3 rounded-lg shrink-0">
            <QRCodeSVG value={publicUrl} size={200} level="M" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/70 max-w-md">
              QR code pointant vers la fiche publique de <span className="font-semibold text-white">{businessName}</span>.
              Idéal pour vos supports imprimés (menu, vitrine, carte de visite).
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={downloadPng}>
                <Download className="h-4 w-4 mr-1" /> Télécharger PNG
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={downloadSvg} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <Download className="h-4 w-4 mr-1" /> Télécharger SVG
              </Button>
            </div>
          </div>
        </div>
      </div>
      {rights.aiAssistant && (
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Bot className="h-4 w-4" /> Assistant IA embarqué (iframe)
        </h3>
        <WidgetTester url={embedUrl} label="Assistant IA embarqué" />
        <p className="text-sm text-white/70">
          Copiez le code ci-dessous et collez-le dans le HTML de votre site (ou dans un bloc « Code »
          de votre CMS : WordPress, Squarespace, Wix, Webflow…). Vos visiteurs pourront poser des
          questions à l'assistant IA de <span className="font-semibold text-white">{businessName}</span>,
          qui les orientera aussi vers des adresses complémentaires à proximité.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Thème</Label>
            <div className="flex gap-1">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => saveEmbedTheme(t)}
                  className={`flex-1 text-xs py-1.5 rounded-md border ${embedTheme === t ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {t === "dark" ? "Sombre" : "Clair"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Langue par défaut</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setEmbedLang(l)}
                  className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${embedLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Hauteur (px)</Label>
            <input
              type="number"
              min={400}
              max={1200}
              step={20}
              value={embedHeight}
              onChange={(e) => setEmbedHeight(Math.max(400, Math.min(1200, Number(e.target.value) || 640)))}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Fond du widget</Label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: "widget", label: askBgValid ? `Couleur du widget ${askBgColor}` : "Couleur du widget (non définie)" },
              { key: "transparent", label: "Transparent" },
            ] as const).map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setEmbedCard(o.key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${embedCard === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            « Transparent » laisse apparaître le fond du site hôte. Les deux versions sont visibles ci-dessous.
          </p>
        </div>

        {/* Édition directe de la couleur utilisée par le mode d'affichage courant
            (clair / sombre) — évite de remonter à la section « Couleur de fond des widgets ». */}
        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">
            {embedTheme === "dark" ? "Couleur du widget — mode sombre" : "Couleur du widget — mode clair"}
          </Label>
          {embedTheme === "dark" ? (
            <>
              <HexColorField
                value={widgetBgDark}
                onChange={setWidgetBgDark}
                onCommit={saveWidgetBgDark}
                disabled={radiusLoading || !businessId}
                saving={widgetBgDarkSaving}
                saved={widgetBgDarkSaved}
              />
              {!widgetBgDarkValid && widgetBgValid && (
                <p className="text-[11px] text-white/50">
                  Aucune couleur sombre définie : la couleur du mode clair ({widgetBg}) est utilisée.
                </p>
              )}
            </>
          ) : (
            <HexColorField
              value={widgetBg}
              onChange={setWidgetBg}
              onCommit={saveWidgetBg}
              disabled={radiusLoading || !businessId}
              saving={widgetBgSaving}
              saved={widgetBgSaved}
            />
          )}
        </div>


        {fitRow("embed")}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code à copier</Label>
            <textarea
              readOnly
              value={embedSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={5}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(embedSnippet, "embed")}>
                {copied === "embed" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le code iframe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(embedUrl, "embed-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                {copied === "embed-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier l'URL seule
              </Button>
              <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">
                {askBgValid ? `Aperçu — intérieur du widget (${askBgColor}, fond transparent)` : "Aperçu — fond par défaut (aucune couleur définie)"}
              </Label>
              <div
                className="rounded-md overflow-hidden border border-white/20 flex justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%),linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              >
                <iframe
                  key={embedUrlWidget + embedHeight}
                  src={previewSrc(embedUrlWidget)}
                  style={{ width: "100%", maxWidth: fitFlags(fitOf("embed")).fullWidth ? undefined : 420, height: embedHeight, border: 0 }}
                  title="Aperçu — couleur du widget"
                  loading="lazy"
                  allow="microphone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Aperçu — fond transparent (fond du site hôte)</Label>
              <div
                className="rounded-md overflow-hidden border border-white/20 flex justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%),linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              >
                <iframe
                  key={embedUrlTransparent + embedHeight}
                  src={previewSrc(embedUrlTransparent)}
                  style={{ width: "100%", maxWidth: fitFlags(fitOf("embed")).fullWidth ? undefined : 420, height: embedHeight, border: 0 }}
                  title="Aperçu — fond transparent"
                  loading="lazy"
                  allow="microphone"
                />
              </div>
            </div>
          </div>
        </div>


        <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" /> Variante « panneau flottant » (onglet latéral + volet plein écran)
          </h4>
          <p className="text-sm text-white/70">
            Cette version ajoute un onglet vertical fixe sur le bord droit de votre site. Au clic, un
            volet s'ouvre par-dessus la page : 70 % de la largeur sur ordinateur, 100 % sur mobile, et le fond du site est assombri pendant l'ouverture.
            Contrairement au code iframe simple, il ne doit <strong>pas</strong> être collé dans un
            bloc « HTML / Embed » de la page (ces blocs sont eux-mêmes des iframes : le volet resterait
            prisonnier de la zone dessinée). Il doit être injecté dans le HTML global du site.
          </p>
          <div className="text-sm text-white/70 space-y-1.5">
            <p className="text-white/90 font-medium">Où le coller selon votre plateforme :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Wix / Wix Studio</strong> : Paramètres → <span className="font-mono">Custom Code</span> →
                « + Ajouter du code personnalisé » → position <span className="font-mono">Body – end</span>,
                appliquer à <span className="font-mono">Toutes les pages</span> (nécessite un forfait Premium).
              </li>
              <li>
                <strong>Site en HTML</strong> : juste avant la balise de fermeture{" "}
                <span className="font-mono">&lt;/body&gt;</span> du fichier{" "}
                <span className="font-mono">index.html</span> (ou du template/footer partagé).
              </li>
              <li>
                <strong>WordPress</strong> : Apparence → Éditeur de thème →{" "}
                <span className="font-mono">footer.php</span>, avant{" "}
                <span className="font-mono">&lt;/body&gt;</span> (ou un plugin type « Insert Headers and Footers »,
                section <em>Footer</em>).
              </li>
              <li>
                <strong>Squarespace</strong> : Paramètres → Avancé → Injection de code → champ{" "}
                <span className="font-mono">Footer</span>.
              </li>
              <li>
                <strong>Webflow</strong> : Paramètres du projet → Custom Code → champ{" "}
                <span className="font-mono">Footer Code</span> (avant <span className="font-mono">&lt;/body&gt;</span>).
              </li>
            </ul>
            <p className="text-white/60 text-xs">
              Le bloc contient déjà ses propres balises <span className="font-mono">&lt;style&gt;</span>,{" "}
              <span className="font-mono">&lt;button&gt;</span>, <span className="font-mono">&lt;iframe&gt;</span> et{" "}
              <span className="font-mono">&lt;script&gt;</span> : collez-le tel quel, sans rien ajouter autour.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Nom de l'assistant IA</Label>
              <Input
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="Zitoun IA"
                className="h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm"
              />
              <p className="text-[11px] text-white/50">
                Ce nom s'affiche en haut du volet, à la place du nom de l'établissement.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Position du CTA « {trimmedAssistantName || 'Assistant 1WM'} » (bord droit)</Label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { value: "top", label: "À 25 % du haut" },
                  { value: "middle", label: "Au milieu" },
                  { value: "bottom", label: "À 25 % du bas" },
                ] as const).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setPanelTabPos(o.value)}
                    className={`text-[11px] leading-tight py-1.5 px-2 rounded-md border ${
                      panelTabPos === o.value
                        ? "bg-white text-neutral-900 border-white"
                        : "text-white border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/50">
                Distance calculée sur la hauteur du viewport (25 % / 50 % / 75 %).
              </p>
            </div>
          </div>

          <textarea
            readOnly
            value={floatingSnippet}
            onFocus={(e) => e.currentTarget.select()}
            rows={8}
            className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
          />
          <Button type="button" size="sm" onClick={() => copy(floatingSnippet, "floating")}>
            {copied === "floating" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copier le code panneau flottant (Wix / Custom Code)
          </Button>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">
              Aperçu du volet ({embedTheme === "dark" ? "mode sombre" : "mode clair"}) — la croix de fermeture est en haut à gauche
            </Label>
            <div className="rounded-md overflow-hidden border border-white/20" style={{ background: panelSurface }}>
              <iframe
                key={panelUrl + embedHeight}
                src={previewSrc(panelUrl)}
                style={{ width: "100%", height: embedHeight, border: 0 }}
                title="Aperçu — panneau flottant"
                loading="lazy"
                allow="microphone"
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ---------- Export d'article de blog ---------- */}
      {rights.blogExport && (
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Vos articles de blog (code à copier)
        </h3>
        <p className="text-sm text-white/70">
          Reprenez sur votre propre site un article de blog rattaché à {businessName}. Le code HTML est
          autonome et les photos restent servies par One World Morocco.
        </p>
        <AffiliateArticleExport businessId={businessId} businessName={businessName} />
      </div>
      )}


      {/* ---------- Services optionnels manquants (domaine) ---------- */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Globe2 className="h-4 w-4" /> Redirection 301 depuis votre domaine (gratuit, DIY)
        </h3>
        <p className="text-sm text-white/70">
          Vous possédez déjà un nom de domaine (ex : <span className="font-mono">www.votresite.com</span>) ? La méthode la plus simple et la moins coûteuse est de le faire rediriger vers votre site vitrine 1WM via une <strong>redirection HTTP 301 permanente</strong>. Cela se configure chez votre registrar (OVH, Gandi, GoDaddy, Namecheap, IONOS, Cloudflare…) sans intervention de notre part.
        </p>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => copy(publicUrl, "redirect")} className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
            {copied === "redirect" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 p-3 text-xs text-white/70 space-y-2">
          <p className="font-semibold text-white/90">Étapes types chez votre registrar :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Connectez-vous à l'espace client de votre registrar.</li>
            <li>Cherchez la section « Redirection », « Web Forwarding » ou « URL Redirect ».</li>
            <li>Créez une redirection <strong>301 (permanente)</strong> depuis <span className="font-mono">votresite.com</span> et <span className="font-mono">www.votresite.com</span> vers l'URL ci-dessus.</li>
            <li>Enregistrez. La propagation DNS peut prendre jusqu'à quelques heures.</li>
          </ol>
          <p className="text-white/60">
            ⚠️ Évitez le « URL masking » ou « frame forwarding » : incompatible avec notre site et pénalisant pour le SEO.
            Une redirection 301 classique conserve la valeur SEO et transmet votre trafic vers votre page officielle 1WM.
          </p>
        </div>

        <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-white/90">Vrai domaine personnalisé (hébergement sous votre URL)</h5>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/60">Sur demande</span>
          </div>
          <p className="text-xs text-white/70">
            Si vous souhaitez que l'URL affichée dans le navigateur reste <span className="font-mono text-white/90">www.votresite.com</span> tout en servant le site vitrine 1WM, il faut un setup DNS/proxy manuel (reverse proxy + SSL). Ce n'est pas activé par défaut car il a un coût de mise en place et de maintenance.
          </p>
          <a
            href="mailto:info@oneworldmorocco.com?subject=Demande%20domaine%20personnalis%C3%A9%20-%20affili%C3%A9&body=Bonjour%2C%0A%0AJe%20souhaite%20faire%20servir%20mon%20site%20vitrine%201WM%20sous%20mon%20propre%20domaine.%0A%0ADomaine%20souhait%C3%A9%20%3A%20www................%0A%0ACe%20domaine%20est%20enregistr%C3%A9%20chez%20%3A%20................%0A%0AMerci%20de%20me%20pr%C3%A9ciser%20les%20%C3%A9tapes%20et%20le%20co%C3%BBt%20de%20setup.%0A%0ACordialement"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Mail className="h-3 w-3" /> Demander un devis pour un vrai domaine personnalisé
          </a>
        </div>
      </div>

      {/* ---------- Widget « À proximité » (overlay POI) ---------- */}
      {rights.nearbyWidget && (
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Widget « À proximité » (carte + établissements autour de vous)
        </h3>
        <WidgetTester url={nearbyUrl} label="Widget À proximité" />
        <p className="text-sm text-white/70">
          Ce widget reprend exactement l'overlay « À proximité » de votre fiche 1WM : la liste des
          établissements et lieux d'intérêt autour de {businessName}, les filtres par catégorie,
          sous-catégorie et distance, la carte Google avec marqueurs, et l'ouverture d'une fiche au clic
          (sans quitter le widget).
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-white/80 text-xs">Langue</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <Button
                  key={l}
                  type="button"
                  size="sm"
                  variant={nearbyLang === l ? "default" : "outline"}
                  onClick={() => setNearbyLang(l)}
                  className={nearbyLang === l ? "" : "text-white border-white/20 hover:bg-white/10 hover:text-white"}
                >
                  {l.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-white/80 text-xs">Fond de carte</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={nearbyBgValid ? nearbyBg : "#EFE6D8"}
                onChange={(e) => setNearbyBg(e.target.value.toUpperCase())}
                className="h-9 w-10 rounded-md bg-white/10 border border-white/20 p-1 cursor-pointer"
                aria-label="Couleur de fond de la carte"
              />
              <input
                type="text"
                placeholder="#EFE6D8"
                value={nearbyBg}
                onChange={(e) => setNearbyBg(e.target.value.toUpperCase())}
                className="w-28 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
              />
              {nearbyBg && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setNearbyBg("")}
                  className="text-white border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Défaut
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-white/80 text-xs">Hauteur (px)</Label>
            <input
              type="number"
              min={480}
              max={1200}
              step={20}
              value={nearbyHeight}
              onChange={(e) => setNearbyHeight(Number(e.target.value) || 720)}
              className="w-28 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2"
            />
          </div>
          <a
            href={nearbyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline pb-2"
          >
            <ExternalLink className="h-3 w-3" /> Ouvrir en plein écran
          </a>
        </div>

        <div className="rounded-md bg-white/5 border border-white/10 p-3 text-xs text-white/70 space-y-1.5">
          <p className="font-semibold text-white/90">Ce qu'il faut savoir avant de l'installer :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Hauteur fixe obligatoire</strong> : l'affichage est plein cadre, il ne s'adapte pas
              tout seul à son contenu. Comptez au minimum <span className="font-mono">640px</span> ;{" "}
              <span className="font-mono">720px</span> est le réglage recommandé sur ordinateur.
            </li>
            <li>
              <strong>Géolocalisation</strong> : l'attribut <span className="font-mono">allow="geolocation"</span>{" "}
              est indispensable pour que les filtres « Moins de 500 m / 1 km / 5 km » apparaissent. Sans lui
              (ou si le visiteur refuse la localisation), le widget fonctionne mais sans filtre de distance.
              La page hôte doit être en <span className="font-mono">https</span>.
            </li>
            <li>
              <strong>Recherche vocale</strong> : l'attribut <span className="font-mono">allow="microphone"</span>{" "}
              est indispensable pour que le bouton micro ouvre l'overlay vocal. Sans lui, le navigateur bloque
              le micro dans l'iframe. Page hôte en <span className="font-mono">https</span> requise.
            </li>


            <li>
              <strong>Contenu automatique</strong> : les établissements affichés proviennent de la base 1WM
              (mêmes règles que la fiche). Rien à saisir de votre côté, la liste se met à jour toute seule.
            </li>
            <li>
              <strong>Mobile</strong> : passez la largeur à 100 % et la hauteur à environ{" "}
              <span className="font-mono">560px</span> ; la carte reste tactile (zoom / déplacement).
            </li>
            <li>
              <strong>Vitesse</strong> : gardez <span className="font-mono">loading="lazy"</span> pour ne pas
              ralentir le chargement de votre page.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold text-sm">1. Version iframe inline (dans une zone de page)</h4>
          <p className="text-sm text-white/70">
            À coller dans un bloc « HTML / Embed / Code personnalisé » de la page où vous voulez l'afficher
            (Wix : élément <span className="font-mono">Embed HTML</span> ; WordPress : bloc{" "}
            <span className="font-mono">HTML personnalisé</span> ; Squarespace : bloc{" "}
            <span className="font-mono">Code</span> ; Webflow : composant{" "}
            <span className="font-mono">Embed</span>).
          </p>
          {fitRow("nearby")}
          <textarea
            readOnly
            value={nearbySnippet}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
          />
          <Button type="button" size="sm" onClick={() => copy(nearbySnippet, "nearby-inline")}>
            {copied === "nearby-inline" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copier le code iframe « À proximité »
          </Button>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30">
              <iframe
                key={nearbyUrl + nearbyHeight}
                src={previewSrc(nearbyUrl)}
                style={{ width: "100%", height: nearbyHeight, border: 0 }}
                title="Aperçu À proximité"
                loading="lazy"
                allow="geolocation"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold text-sm">2. Version panneau flottant (onglet latéral)</h4>
          <p className="text-sm text-white/70">
            Onglet vertical fixe sur le bord droit du site ; au clic, un volet plein écran s'ouvre avec la
            carte et les établissements à proximité. Comme pour l'assistant IA, ce bloc doit être injecté
            dans le HTML global du site (<span className="font-mono">Body – end</span> /{" "}
            <span className="font-mono">Footer</span>), <strong>pas</strong> dans un bloc Embed de page —
            sinon le volet reste prisonnier de la zone dessinée. Emplacements exacts : voir la liste par
            plateforme ci-dessus.
          </p>
          <textarea
            readOnly
            value={nearbyFloatingSnippet}
            onFocus={(e) => e.currentTarget.select()}
            rows={8}
            className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
          />
          <Button type="button" size="sm" onClick={() => copy(nearbyFloatingSnippet, "nearby-floating")}>
            {copied === "nearby-floating" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copier le code panneau flottant « À proximité »
          </Button>
        </div>
      </div>
      )}

      {/* ── Widget Avis clients ───────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Star className="h-4 w-4" /> Widget Avis clients (iframe)
        </h3>
        <WidgetTester url={reviewsUrl} label="Widget Avis clients" />
        <p className="text-sm text-white/70">
          Affichez vos avis Google, TripAdvisor et Restaurant Guru sur votre propre site : note /5,
          nombre d'avis, étoiles, avis détaillés (l'avis « par défaut » en premier, navigation au clic).
          La vue « Synthèse » ajoute le badge global /20 identique à celui de votre fiche 1WM.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-white/80 text-xs">Plateforme</Label>
            <div className="flex gap-1 flex-wrap">
              {REVIEW_PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setReviewsPlatform(p.key)}
                  className={`flex-1 min-w-[92px] text-xs py-1.5 px-2 rounded-md border ${reviewsPlatform === p.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Langue</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setReviewsLang(l)}
                  className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${reviewsLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Format d'affichage</Label>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(REVIEW_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setReviewsPreset(key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${reviewsPreset === key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {p.label} · {p.w}×{p.h}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            Le widget s'adapte aussi automatiquement à la taille de l'iframe : ces presets fixent simplement
            width/height et le format recommandé.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Fond de la carte d'avis</Label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: "dark", label: "Sombre (défaut)" },
              { key: "widget", label: widgetBgValid ? `Couleur du widget ${widgetBg}` : "Couleur du widget (non définie)" },
              { key: "transparent", label: "Transparent" },
            ] as const).map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setReviewsCard(o.key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${reviewsCard === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            « Transparent » et les fonds clairs passent automatiquement le texte du widget en encre sombre pour
            rester lisibles sur le site hôte.
          </p>
        </div>


        {fitRow("reviews")}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code à copier (inline)</Label>
            <textarea
              readOnly
              value={reviewsSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={5}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(reviewsSnippet, "reviews")}>
                {copied === "reviews" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le code iframe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(reviewsUrl, "reviews-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                {copied === "reviews-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier l'URL seule
              </Button>
              <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <a href={reviewsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center">
              <iframe
                key={reviewsUrl}
                src={previewSrc(reviewsUrl)}
                style={{ width: "100%", maxWidth: preset.w, height: preset.h, border: 0 }}
                title="Aperçu avis clients"
                loading="lazy"
              />

            </div>
          </div>
        </div>
      </div>

      {/* ── Widget Laisser un avis ────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <ThumbsUp className="h-4 w-4" /> Widget Laisser un avis (iframe)
        </h3>
        <WidgetTester url={rateUrl} label="Widget Laisser un avis" />
        <p className="text-sm text-white/70">
          Incitez vos clients satisfaits à publier un avis : les 5 étoiles cliquables ouvrent directement
          le formulaire « Rédiger un avis » de Google et la page d'avis TripAdvisor. Seules les
          plateformes dont le lien est renseigné sur votre fiche s'affichent.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Plateformes</Label>
            <div className="flex gap-1 flex-wrap">
              {RATE_PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setRatePlatform(p.key)}
                  className={`text-xs py-1.5 px-2 rounded-md border ${ratePlatform === p.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Format</Label>
            <div className="flex gap-1">
              {(["card", "bar"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRateVariant(v)}
                  className={`flex-1 text-xs py-1.5 rounded-md border ${rateVariant === v ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {v === "card" ? "Carte" : "Barre"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Langue</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setRateLang(l)}
                  className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${rateLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Fond de la carte</Label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: "dark", label: "Sombre (défaut)" },
              { key: "widget", label: widgetBgValid ? `Couleur du widget ${widgetBg}` : "Couleur du widget (non définie)" },
              { key: "transparent", label: "Transparent" },
            ] as const).map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setRateCard(o.key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${rateCard === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            « Transparent » et les fonds clairs passent automatiquement le texte en encre sombre pour rester
            lisibles sur le site hôte.
          </p>
        </div>

        {fitRow("rate")}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code à copier (inline)</Label>
            <textarea
              readOnly
              value={rateSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={5}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(rateSnippet, "rate")}>
                {copied === "rate" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le code iframe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(rateUrl, "rate-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                {copied === "rate-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier l'URL seule
              </Button>
              <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <a href={rateUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">
                {widgetBgValid ? `Aperçu — intérieur du widget (${widgetBg}, fond transparent)` : "Aperçu — fond par défaut (aucune couleur définie)"}
              </Label>
              <div
                className="rounded-md overflow-hidden border border-white/20 flex justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%),linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              >
                <iframe
                  key={rateUrlWidget}
                  src={previewSrc(rateUrlWidget)}
                  style={{ width: "100%", maxWidth: rateW, height: rateH, border: 0 }}
                  title="Aperçu laisser un avis — couleur du widget"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Aperçu — fond transparent (fond du site hôte)</Label>
              <div
                className="rounded-md overflow-hidden border border-white/20 flex justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%),linear-gradient(45deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.12) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              >
                <iframe
                  key={rateUrlTransparent}
                  src={previewSrc(rateUrlTransparent)}
                  style={{ width: "100%", maxWidth: rateW, height: rateH, border: 0 }}
                  title="Aperçu laisser un avis — fond transparent"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Signature email (HTML statique) ───────────────────── */}
      {rights.emailSignature && (
      <div className="space-y-3">

        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Mail className="h-4 w-4" /> Signature email « Laisser un avis » (HTML statique)
        </h3>
        <p className="text-sm text-white/70">
          Version compatible Gmail, Outlook, Apple Mail : pas d'iframe ni de JavaScript. Le bouton
          ouvre votre page d'avis (plateformes et langue selon les réglages ci-dessus). À coller dans
          la signature, le pied d'email de confirmation ou une relance après séjour.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code HTML à coller</Label>
            <textarea
              readOnly
              value={rateEmailSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={10}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(rateEmailSnippet, "rate-email")}>
                {copied === "rate-email" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le HTML signature
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(rateEmailUrl, "rate-email-url")}
                className="text-white border-white/20 hover:bg-white/10 hover:text-white"
              >
                {copied === "rate-email-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le lien seul
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu</Label>
            <div
              className="rounded-md border border-white/20 bg-white p-4"
              dangerouslySetInnerHTML={{ __html: rateEmailSnippet }}
            />
          </div>
        </div>
      </div>
      )}





      {/* ── Widget Météo ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <CloudSun className="h-4 w-4" /> Widget Météo (iframe)
        </h3>
        <WidgetTester url={weatherUrl} label="Widget Météo" />
        <p className="text-sm text-white/70">
          Météo du jour et prévisions pour votre ville, à intégrer sur votre site. Signature
          « oneworldmorocco.com » incluse.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Ville</Label>
            <input
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Langue</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setWeatherLang(l)}
                  className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${weatherLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Format d'affichage</Label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: "card", label: "Carte (défaut)" },
              { key: "footer", label: "Bandeau footer (desktop)" },
            ] as const).map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setWeatherLayout(o.key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${weatherLayout === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            Le bandeau footer occupe toute la largeur du viewport avec une hauteur minimale et 3 jours de
            prévisions. Sur mobile (&lt; 768px) il bascule automatiquement sur la carte verticale, seule
            lisible à cette largeur.
          </p>
        </div>
        {isWeatherFooter && (
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Position du bandeau</Label>
            <div className="flex gap-1 flex-wrap">
              {([
                { key: false, label: "Dans le flux de la page" },
                { key: true, label: "Fixé en bas de l'écran (sticky)" },
              ] as const).map((o) => (
                <button
                  key={String(o.key)}
                  type="button"
                  onClick={() => setWeatherSticky(o.key)}
                  className={`text-xs py-1.5 px-3 rounded-md border ${weatherSticky === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isWeatherFooter && (
        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Échelle du widget</Label>
          <div className="flex gap-1 flex-wrap">
            {SIZE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setWeatherSize(o.value)}
                className={`text-xs py-1.5 px-2.5 rounded-md border ${
                  weatherSize === o.value
                    ? "bg-white text-neutral-900 border-white"
                    : "text-white border-white/20 hover:bg-white/10"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            Largeur conseillée : {weatherMaxW}px. Compact ≈ mobile, Large ≈ desktop. Le fond reste
            transparent si aucune couleur n'est forcée.
          </p>
        </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-white/80 text-xs">Fond du bloc prévisions</Label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: "transparent", label: "Transparent (défaut)" },
              { key: "widget", label: widgetBgValid ? `Couleur du widget ${widgetBg}` : "Couleur du widget (non définie)" },
              { key: "light", label: "Blanc" },
              { key: "dark", label: "Sombre" },
            ] as const).map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setWeatherCard(o.key)}
                className={`text-xs py-1.5 px-3 rounded-md border ${weatherCard === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            Par défaut le bloc prévisions est transparent : il prend le fond du site hôte, et l'encre passe
            automatiquement en sombre ou clair selon la couleur choisie. « Couleur du widget » réutilise la
            couleur définie plus haut (Couleur de fond des widgets).
          </p>
        </div>
        {!isWeatherFooter && fitRow("weather")}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code à copier (inline)</Label>
            <textarea
              readOnly
              value={weatherSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={4}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(weatherSnippet, "weather")}>
                {copied === "weather" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le code iframe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(weatherUrl, "weather-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                {copied === "weather-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier l'URL seule
              </Button>
              <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <a href={weatherUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center">
              <iframe
                key={weatherUrl}
                src={previewSrc(weatherUrl)}
                style={isWeatherFooter ? { width: "100%", height: 110, border: 0 } : { width: "100%", maxWidth: weatherMaxW, height: 560, border: 0 }}
                title="Aperçu météo"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Widget Marées ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
          <Waves className="h-4 w-4" /> Widget Marées (iframe)
        </h3>
        <WidgetTester url={tidesUrl} label="Widget Marées, Vents & Météo" />
        <p className="text-sm text-white/70">
          Horaires des marées pour les villes côtières marocaines (Essaouira, Agadir, Sidi Kaouki…).
          Signature « oneworldmorocco.com » incluse.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Ville côtière</Label>
            <input
              value={tidesCity}
              onChange={(e) => setTidesCity(e.target.value)}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80 text-xs">Langue</Label>
            <div className="flex gap-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setTidesLang(l)}
                  className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${tidesLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {fitRow("tides")}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Code à copier (inline)</Label>
            <textarea
              readOnly
              value={tidesSnippet}
              onFocus={(e) => e.currentTarget.select()}
              rows={4}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={() => copy(tidesSnippet, "tides")}>
                {copied === "tides" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier le code iframe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(tidesUrl, "tides-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                {copied === "tides-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copier l'URL seule
              </Button>
              <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <a href={tidesUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center">
              <iframe
                key={tidesUrl}
                src={previewSrc(tidesUrl)}
                style={{ width: "100%", maxWidth: 520, height: 360, border: 0 }}
                title="Aperçu marées"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Widget Votre ID numérique type Linktree ─────────────────────────────── */}
      {slug && (
        <div className="space-y-3">
          <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
            <Globe2 className="h-4 w-4" /> Widget Votre ID numérique type Linktree (iframe)
          </h3>
          <WidgetTester url={ficheUrl} label={`Fiche complète — ${businessName}`} />
          <p className="text-sm text-white/70">
            Votre fiche publique <span className="font-mono">/b/{slug}</span> intégrée sur un site externe :
            logo, avis, hook, offres, réseaux sociaux et CTAs. Le code inclut un auto-resize
            (l'iframe s'ajuste automatiquement à la hauteur réelle du contenu).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Largeur max (px)</Label>
              <input
                type="number"
                min={320}
                max={900}
                value={ficheMaxWidth}
                onChange={(e) => setFicheMaxWidth(Number(e.target.value) || 480)}
                className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Bandeau « Compte One World Morocco »</Label>
              <div className="flex gap-1">
                {[
                  { v: true, l: "Afficher" },
                  { v: false, l: "Masquer" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setFicheShowClub(o.v)}
                    className={`flex-1 text-xs py-1.5 rounded-md border ${ficheShowClub === o.v ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {fitRow("fiche")}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Code à copier (iframe + auto-resize)</Label>
              <textarea
                readOnly
                value={ficheSnippet}
                onFocus={(e) => e.currentTarget.select()}
                rows={8}
                className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" onClick={() => copy(ficheSnippet, "fiche")}>
                  {copied === "fiche" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copier le code iframe
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => copy(ficheUrl, "fiche-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                  {copied === "fiche-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copier l'URL seule
                </Button>
                <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                  <a href={ficheUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                  </a>
                </Button>
              </div>
              <p className="text-xs text-white/50">
                Si votre éditeur n'autorise pas le JavaScript, collez uniquement la balise{" "}
                <span className="font-mono">&lt;iframe&gt;</span> et fixez une hauteur manuelle (1200px).
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Aperçu en direct</Label>
              <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center p-2">
                <iframe
                  key={ficheUrl}
                  src={previewSrc(ficheUrl)}
                  style={{ width: fitFlags(fitOf("fiche")).fullWidth ? "100%" : ficheMaxWidth, maxWidth: "100%", height: 900, border: 0 }}
                  title="Aperçu fiche"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Widget Fiche 1WM ─────────────────────────────────── */}
      {slug && (
        <div className="space-y-3">
          <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
            <Newspaper className="h-6 w-6 shrink-0" /> Widget Fiche 1WM (iframe)
          </h3>
          <WidgetTester url={f1wmUrl} label={`Fiche 1WM — ${businessName}`} />
          <p className="text-sm text-white/70">
            La fiche complète de <span className="font-semibold text-white">{businessName}</span> (photos, avis, offres,
            horaires, carte, CTAs) embarquée sur votre site, sans scroll vertical inutile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Langue</Label>
              <div className="flex gap-1">
                {(["fr", "en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setF1wmLang(l)}
                    className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${f1wmLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Hauteur (px)</Label>
              <input
                type="number"
                min={400}
                max={2000}
                value={f1wmHeight}
                onChange={(e) => setF1wmHeight(Number(e.target.value) || 900)}
                className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Fond du widget</Label>
              <div className="flex gap-1">
                {[
                  { key: "widget" as const, label: widgetBgValid ? `Couleur ${widgetBg}` : "Couleur (non définie)" },
                  { key: "transparent" as const, label: "Transparent" },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setF1wmBgMode(o.key)}
                    className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${f1wmBgMode === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {fitRow("fiche1wm")}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Code à copier</Label>
              <textarea
                readOnly
                value={f1wmSnippet}
                onFocus={(e) => e.currentTarget.select()}
                rows={4}
                className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" onClick={() => copy(f1wmSnippet, "fiche1wm")}>
                  {copied === "fiche1wm" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copier le code iframe
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => copy(f1wmUrl, "fiche1wm-url")} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                  {copied === "fiche1wm-url" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copier l'URL seule
                </Button>
                <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                  <a href={f1wmUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                  </a>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">Aperçu en direct</Label>
              <div className="rounded-md overflow-hidden border border-white/20 bg-black/30">
                <iframe
                  key={f1wmUrl}
                  src={previewSrc(f1wmUrl)}
                  style={{ width: "100%", height: f1wmHeight, border: 0, background: "transparent" }}
                  title="Aperçu Fiche 1WM"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Réseaux & flux : Spotify / SoundCloud / Substack ─── */}
      {slug && (socialUrls.spotify || socialUrls.soundcloud || socialUrls.substack) && (
        <div className="space-y-8">
          {socialUrls.spotify && (
            <div className="space-y-3">
              <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
                <Music2 className="h-6 w-6 shrink-0 text-[#1DB954]" /> Widget Spotify
              </h3>
              <WidgetTester url={spotifyUrl} label={`Spotify — ${businessName}`} />
              <p className="text-sm text-white/70">
                Votre playlist / album Spotify embarqué depuis le lien renseigné dans Liens → Web &amp; Socials.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Format du player</Label>
                  <div className="flex gap-1">
                    {[{ v: false, l: "Complet (352px)" }, { v: true, l: "Compact (152px)" }].map((o) => (
                      <button key={String(o.v)} type="button" onClick={() => setSpotifyCompact(o.v)}
                        className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${spotifyCompact === o.v ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Fond du widget</Label>
                  <div className="flex gap-1">
                    {[{ key: "widget" as const, label: widgetBgValid ? `Couleur ${widgetBg}` : "Couleur (non définie)" }, { key: "transparent" as const, label: "Transparent" }].map((o) => (
                      <button key={o.key} type="button" onClick={() => setSpotifyBgMode(o.key)}
                        className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${spotifyBgMode === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {fitRow("spotify")}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Code à copier</Label>
                  <textarea readOnly value={spotifySnippet} onFocus={(e) => e.currentTarget.select()} rows={4}
                    className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none" />
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" onClick={() => copy(spotifySnippet, "spotify")}>
                      {copied === "spotify" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copier le code iframe
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                      <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Ouvrir</a>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Aperçu en direct</Label>
                  <div className="rounded-md overflow-hidden border border-white/20 bg-black/30">
                    <iframe key={spotifyUrl} src={previewSrc(spotifyUrl)} title="Aperçu Spotify" loading="lazy"
                      style={{ width: "100%", height: spotifyHeight, border: 0, background: "transparent" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {socialUrls.soundcloud && (
            <div className="space-y-3">
              <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
                <AudioLines className="h-6 w-6 shrink-0 text-[#FF5500]" /> Widget SoundCloud
              </h3>
              <WidgetTester url={scUrl} label={`SoundCloud — ${businessName}`} />
              <p className="text-sm text-white/70">
                Votre piste / playlist SoundCloud embarquée depuis le lien renseigné dans Liens → Web &amp; Socials.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Format du player</Label>
                  <div className="flex gap-1">
                    {[{ v: true, l: "Visuel (pochette)" }, { v: false, l: "Bandeau compact" }].map((o) => (
                      <button key={String(o.v)} type="button" onClick={() => setScVisual(o.v)}
                        className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${scVisual === o.v ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Fond du widget</Label>
                  <div className="flex gap-1">
                    {[{ key: "widget" as const, label: widgetBgValid ? `Couleur ${widgetBg}` : "Couleur (non définie)" }, { key: "transparent" as const, label: "Transparent" }].map((o) => (
                      <button key={o.key} type="button" onClick={() => setScBgMode(o.key)}
                        className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${scBgMode === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {fitRow("soundcloud")}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Code à copier</Label>
                  <textarea readOnly value={scSnippet} onFocus={(e) => e.currentTarget.select()} rows={4}
                    className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none" />
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" onClick={() => copy(scSnippet, "soundcloud")}>
                      {copied === "soundcloud" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copier le code iframe
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                      <a href={scUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Ouvrir</a>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Aperçu en direct</Label>
                  <div className="rounded-md overflow-hidden border border-white/20 bg-black/30">
                    <iframe key={scUrl} src={previewSrc(scUrl)} title="Aperçu SoundCloud" loading="lazy"
                      style={{ width: "100%", height: scHeight, border: 0, background: "transparent" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {socialUrls.substack && (
            <div className="space-y-3">
              <h3 className="text-white font-bold text-3xl sm:text-4xl leading-tight flex items-center gap-2">
                <Rss className="h-6 w-6 shrink-0 text-[#FF6719]" /> Widget Newsletter (Substack)
              </h3>
              <WidgetTester url={subUrl} label={`Newsletter — ${businessName}`} />
              <p className="text-sm text-white/70">
                Vos derniers articles Substack, mis à jour automatiquement depuis le lien renseigné dans Liens → Web &amp; Socials.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Langue</Label>
                  <div className="flex gap-1">
                    {(["fr", "en", "ar"] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setSubLang(l)}
                        className={`flex-1 text-xs py-1.5 rounded-md border uppercase ${subLang === l ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Nombre d'articles</Label>
                  <input type="number" min={1} max={10} value={subLimit}
                    onChange={(e) => setSubLimit(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
                    className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-1.5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Fond du widget</Label>
                  <div className="flex gap-1">
                    {[{ key: "widget" as const, label: widgetBgValid ? `Couleur ${widgetBg}` : "Couleur (non définie)" }, { key: "transparent" as const, label: "Transparent" }].map((o) => (
                      <button key={o.key} type="button" onClick={() => setSubBgMode(o.key)}
                        className={`flex-1 text-[11px] py-1.5 px-2 rounded-md border ${subBgMode === o.key ? "bg-white text-neutral-900 border-white" : "text-white border-white/20 hover:bg-white/10"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {fitRow("substack")}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Code à copier</Label>
                  <textarea readOnly value={subSnippet} onFocus={(e) => e.currentTarget.select()} rows={4}
                    className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs px-3 py-2 font-mono resize-none" />
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" onClick={() => copy(subSnippet, "substack")}>
                      {copied === "substack" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copier le code iframe
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                      <a href={subUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Ouvrir</a>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 text-xs">Aperçu en direct</Label>
                  <div className="rounded-md overflow-hidden border border-white/20 bg-black/30">
                    <iframe key={subUrl} src={previewSrc(subUrl)} title="Aperçu Newsletter" loading="lazy"
                      style={{ width: "100%", height: subHeight, border: 0, background: "transparent" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AffiliateToolsTab;
