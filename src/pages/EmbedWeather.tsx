// Standalone embeddable weather page: /embed/weather?city=Marrakech&lang=fr
// Designed to be loaded in an <iframe> from any external site (Claude Design, etc.).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";
import { parseFit, fitFlags, applyEmbedBg, parseSize, sizeZoom, parseBg, resolveEmbedInk } from "@/lib/embedFit";
import { useEmbedFitScale } from "@/hooks/useEmbedFitScale";
import EmbedWeatherFooterBar from "@/components/embed/EmbedWeatherFooterBar";


type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; error: string }> = {
  fr: { loading: "Chargement de la météo…", error: "Météo indisponible" },
  en: { loading: "Loading weather…", error: "Weather unavailable" },
  ar: { loading: "جارٍ تحميل الطقس…", error: "الطقس غير متاح" },
};

export default function EmbedWeather() {
  const [params] = useSearchParams();
  const city = params.get("city")?.trim() || "Marrakech";
  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  const zoom = sizeZoom(parseSize(params.get("size")));
  // Fond : transparent par défaut (le widget prend le fond du site hôte).
  // ?bg=EFE6D8 force une couleur, l'encre du bloc prévisions suit sa luminance.
  // ?card=EFE6D8 : intérieur du widget coloré mais page transparente.
  const bgParamColor = parseBg(params.get("bg"));
  const cardColor = parseBg(params.get("card"));
  const bgColor = cardColor || bgParamColor;
  const ink = resolveEmbedInk(params.get("ink"), bgColor);
  // ?layout=footer : bandeau fin full-width réservé au desktop (>= 768px de large).
  // En dessous, on retombe sur la carte verticale, seule lisible sur mobile.
  const footerLayout = (params.get("layout") || "").toLowerCase() === "footer";
  const footerDays = Math.max(1, Math.min(5, Number(params.get("days")) || 3));
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.innerWidth >= 768));
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const asFooter = footerLayout && wide;


  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(cardColor ? "" : params.get("bg"));
  }, [lang, params]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke("get-weather", {
          body: { city },
        });
        if (!alive) return;
        if (fnError || !res || (res as any).error) {
          setError(true);
        } else {
          setData(res as WeatherPayload);
        }
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [city]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  // fit=h / fit=wh : aucun scroll interne — le contenu est mis à l'échelle
  // pour tenir exactement dans la hauteur de l'iframe hôte.
  const { innerRef, style: fitStyle } = useEmbedFitScale(fullHeight, [data, loading, error]);


  // Report our height to the host page so it can auto-resize the iframe.
  useEffect(() => {
    if (fullHeight && !asFooter) return;
    const post = () => {
      const h = rootRef.current?.getBoundingClientRect().height || 0;
      if (h < 40) return;
      window.parent?.postMessage({ type: "owm-weather-height", height: h }, "*");
    };
    post();
    const t = window.setTimeout(post, 300);
    window.addEventListener("resize", post);
    const el = rootRef.current;
    const ro = el ? new ResizeObserver(post) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", post);
      ro?.disconnect();
    };
  }, [data, loading, error, fullHeight, asFooter]);


  if (asFooter) {
    return (
      <div ref={rootRef} className="w-full bg-transparent">
        {loading && <div className="w-full h-[74px] bg-muted/40 animate-pulse" />}
        {!loading && (error || !data) && (
          <div className="w-full py-5 text-center text-sm text-muted-foreground">{L.error}</div>
        )}
        {!loading && !error && data && (
          <EmbedWeatherFooterBar data={data} lang={lang} days={footerDays} />
        )}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`w-full flex justify-center bg-transparent ${
        fullHeight ? "h-screen min-h-screen overflow-hidden items-start p-1" : "min-h-0 items-start p-2"
      } ${fullWidth ? "px-0" : ""}`}

    >
      {loading && (
        <div className="w-full rounded-3xl bg-muted/40 animate-pulse h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          {L.loading}
        </div>
      )}
      {!loading && (error || !data) && (
        <div className="w-full rounded-3xl border border-border p-6 text-center text-sm text-muted-foreground">
          {L.error}
        </div>
      )}
      {!loading && !error && data && (
        <div
          ref={innerRef}
          className="w-full [&>div]:max-w-full"
          style={{ ...(fitStyle || {}), ...(zoom !== 1 ? ({ zoom } as CSSProperties) : {}) }}
        >
          {/* `embedded` = pas de largeur bridée : la taille est pilotée par l'iframe hôte */}
          <EmbedWeatherWidget data={data} lang={lang} embedded surface={bgColor} ink={ink} />
        </div>
      )}

    </div>
  );
}

