import { useRef, useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, ExternalLink, QrCode, Globe2, Mail, Bot, MapPin, Newspaper, Star, CloudSun, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import AffiliateArticleExport from "@/components/affiliate/AffiliateArticleExport";

interface Props {
  slug: string | null;
  businessName: string;
  businessId?: string | null;
}

const SITE = "https://oneworldmorocco.com";

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

const AffiliateToolsTab = ({ slug, businessName, businessId = null }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [embedLang, setEmbedLang] = useState<"fr" | "en" | "ar">("fr");
  const [embedHeight, setEmbedHeight] = useState<number>(640);
  const [nearbyLang, setNearbyLang] = useState<"fr" | "en" | "ar">("fr");
  const [nearbyHeight, setNearbyHeight] = useState<number>(720);
  const [nearbyBg, setNearbyBg] = useState<string>("");
  const [reviewsPlatform, setReviewsPlatform] = useState<ReviewPlatformKey>("all");
  const [reviewsLang, setReviewsLang] = useState<"fr" | "en" | "ar">("fr");
  const [reviewsPreset, setReviewsPreset] = useState<string>("v-sm");
  const [ratePlatform, setRatePlatform] = useState<RatePlatformKey>("all");
  const [rateLang, setRateLang] = useState<"fr" | "en" | "ar">("fr");
  const [rateVariant, setRateVariant] = useState<"card" | "bar">("card");

  const [weatherCity, setWeatherCity] = useState<string>("Marrakech");
  const [weatherLang, setWeatherLang] = useState<"fr" | "en" | "ar">("fr");

  if (!slug) {
    return (
      <div className="text-sm text-white/70">
        Enregistrez d'abord un slug (onglet Texte) pour générer les liens et le QR code.
      </div>
    );
  }

  const publicUrl = `${SITE}/${slug}`;
  const shortUrl = `${SITE}/b/${slug}`;
  const embedUrl = `${SITE}/embed/ask/${slug}?theme=${embedTheme}&lang=${embedLang}`;
  const embedSnippet = useMemo(
    () =>
      `<iframe src="${embedUrl}" style="width:100%;max-width:420px;height:${embedHeight}px;border:0;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.15)" title="Assistant IA — ${businessName}" loading="lazy" allow="clipboard-write"></iframe>`,
    [embedUrl, embedHeight, businessName]
  );

  const floatingSnippet = useMemo(
    () => `<!-- Assistant IA One World Morocco — ${businessName} -->
<style>
  #owm-embed-tab {
    position: fixed; top: 50%; right: max(16px, env(safe-area-inset-right));
    transform: translateY(-50%) rotate(-90deg); transform-origin: right center;
    background: #C04F17; color: #fff; padding: 14px 22px; border: none;
    border-radius: 8px 8px 0 0; font-family: Montserrat, sans-serif;
    font-weight: 600; font-size: 13px; letter-spacing: 0.05em; white-space: nowrap;
    cursor: pointer; z-index: 999998; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  #owm-embed-panel {
    position: fixed; top: 0; right: -100%; width: 50vw; height: 100vh;
    background: #fff; z-index: 999999; transition: right .35s ease;
    box-shadow: -8px 0 40px rgba(0,0,0,.25); display: flex; flex-direction: column;
  }
  #owm-embed-panel.open { right: 0; }
  #owm-embed-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 20px; background: #0F172A; color: #fff;
    font-family: Montserrat, sans-serif; font-weight: 600; font-size: 14px;
  }
  #owm-embed-close { background: transparent; border: none; color: #fff; font-size: 22px; cursor: pointer; padding: 0 8px; }
  #owm-embed-iframe { flex: 1; width: 100%; border: none; }
  @media (max-width: 768px) { #owm-embed-panel { width: 100vw; } }
</style>

<button id="owm-embed-tab" aria-label="Ouvrir l&#39;assistant IA">Assistant 1WM</button>
<div id="owm-embed-panel" role="dialog" aria-hidden="true">
  <div id="owm-embed-header">
    <span>Assistant — ${businessName}</span>
    <button id="owm-embed-close" aria-label="Fermer">&#10005;</button>
  </div>
  <iframe id="owm-embed-iframe" src="${embedUrl}" title="Assistant IA — ${businessName}" allow="clipboard-write; geolocation" loading="lazy"></iframe>
</div>

<script>
  (function () {
    var tab = document.getElementById('owm-embed-tab');
    var panel = document.getElementById('owm-embed-panel');
    var close = document.getElementById('owm-embed-close');
    function open() { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
    function shut() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
    tab.addEventListener('click', open);
    close.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
  })();
</script>`,
    [embedUrl, businessName]
  );

  const nearbyBgValid = /^#[0-9a-fA-F]{6}$/.test(nearbyBg);
  const nearbyUrl = `${SITE}/embed/nearby/${slug}?lang=${nearbyLang}${nearbyBgValid ? `&bg=${nearbyBg.slice(1)}` : ""}`;
  const nearbySnippet = useMemo(
    () =>
      `<iframe src="${nearbyUrl}" style="width:100%;height:${nearbyHeight}px;border:0;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.15)" title="À proximité — ${businessName}" loading="lazy" allow="geolocation"></iframe>`,
    [nearbyUrl, nearbyHeight, businessName]
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
  const reviewsUrl = `${SITE}/embed/reviews/${slug}?platform=${reviewsPlatform}&lang=${reviewsLang}&ratio=${preset.ratio}&size=${preset.size}`;
  const reviewsSnippet = useMemo(
    () =>
      `<iframe src="${reviewsUrl}" style="width:100%;max-width:${preset.w}px;height:${preset.h}px;border:0;border-radius:20px" title="Avis clients — ${businessName}" loading="lazy"></iframe>`,
    [reviewsUrl, businessName, preset.w, preset.h]
  );

  const rateW = rateVariant === "bar" ? 780 : 460;
  const rateH = rateVariant === "bar" ? 120 : 430;
  const rateUrl = `${SITE}/embed/avis/${slug}?platform=${ratePlatform}&lang=${rateLang}&variant=${rateVariant}`;
  const rateSnippet = useMemo(
    () =>
      `<iframe src="${rateUrl}" style="width:100%;max-width:${rateW}px;height:${rateH}px;border:0;border-radius:20px" title="Laisser un avis — ${businessName}" loading="lazy"></iframe>`,
    [rateUrl, rateW, rateH, businessName]
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



  const weatherUrl = `${SITE}/embed/weather?city=${encodeURIComponent(weatherCity || "Marrakech")}&lang=${weatherLang}`;
  const weatherSnippet = useMemo(
    () =>
      `<iframe src="${weatherUrl}" style="width:100%;max-width:420px;height:320px;border:0;border-radius:20px" title="Météo — ${weatherCity}" loading="lazy"></iframe>`,
    [weatherUrl, weatherCity]
  );


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
      <div className="space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Liens de partage
        </h3>
        {renderUrlRow("URL publique (fiche)", publicUrl, "public")}
        {renderUrlRow("CARTE DE VISITE DIGITALE", shortUrl, "short")}
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
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
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4" /> Assistant IA embarqué (iframe)
        </h3>
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
                  onClick={() => setEmbedTheme(t)}
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
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center">
              <iframe
                key={embedUrl + embedHeight}
                src={embedUrl}
                style={{ width: "100%", maxWidth: 420, height: embedHeight, border: 0 }}
                title="Aperçu"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" /> Variante « panneau flottant » (onglet latéral + volet plein écran)
          </h4>
          <p className="text-sm text-white/70">
            Cette version ajoute un onglet vertical fixe sur le bord droit de votre site. Au clic, un
            volet s'ouvre par-dessus la page : 50 % de la largeur sur ordinateur, 100 % sur mobile.
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
        </div>
      </div>

      {/* ---------- Export d'article de blog ---------- */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Vos articles de blog (code à copier)
        </h3>
        <p className="text-sm text-white/70">
          Reprenez sur votre propre site un article de blog rattaché à {businessName}. Le code HTML est
          autonome et les photos restent servies par One World Morocco.
        </p>
        <AffiliateArticleExport businessId={businessId} businessName={businessName} />
      </div>


      {/* ---------- Widget « À proximité » (overlay POI) ---------- */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Widget « À proximité » (carte + établissements autour de vous)
        </h3>
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
                src={nearbyUrl}
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

      {/* ── Widget Avis clients ───────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Star className="h-4 w-4" /> Widget Avis clients (iframe)
        </h3>
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
                src={reviewsUrl}
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
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ThumbsUp className="h-4 w-4" /> Widget Laisser un avis (iframe)
        </h3>
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
          <div className="space-y-2">
            <Label className="text-white/80 text-xs">Aperçu en direct</Label>
            <div className="rounded-md overflow-hidden border border-white/20 bg-black/30 flex justify-center">
              <iframe
                key={rateUrl}
                src={rateUrl}
                style={{ width: "100%", maxWidth: rateW, height: rateH, border: 0 }}
                title="Aperçu laisser un avis"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Signature email (HTML statique) ───────────────────── */}
      <div className="space-y-3">

        <h3 className="text-white font-semibold flex items-center gap-2">
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





      {/* ── Widget Météo ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <CloudSun className="h-4 w-4" /> Widget Météo (iframe)
        </h3>
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
                src={weatherUrl}
                style={{ width: "100%", maxWidth: 420, height: 320, border: 0 }}
                title="Aperçu météo"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>


      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
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

    </div>
  );
};

export default AffiliateToolsTab;
