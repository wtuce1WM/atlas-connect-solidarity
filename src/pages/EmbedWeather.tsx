// Standalone embeddable weather page: /embed/weather?city=Marrakech&lang=fr
// Designed to be loaded in an <iframe> from any external site (Claude Design, etc.).
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";
import { parseFit, fitFlags, applyEmbedBg } from "@/lib/embedFit";

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

  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(params.get("bg"));
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

  // Report our height to the host page so it can auto-resize the iframe.
  useEffect(() => {
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
  }, [data, loading, error]);


  return (
    <div
      ref={rootRef}
      className={`w-full p-2 flex justify-center bg-transparent ${fullHeight ? "h-screen min-h-screen items-stretch [&>div]:h-full" : "min-h-0 items-start"}`}
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
        <div className="w-full [&>div]:max-w-full">
          <EmbedWeatherWidget data={data} lang={lang} embedded={fullWidth} />
        </div>
      )}
    </div>
  );
}
