// Standalone embeddable weather page: /embed/weather?city=Marrakech&lang=fr
// Designed to be loaded in an <iframe> from any external site (Claude Design, etc.).
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";

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

  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    // Transparent background so the widget blends into the host page.
    document.body.style.background = "transparent";
  }, [lang]);

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

  // Report our height to the host page so it can auto-resize the iframe.
  useEffect(() => {
    const post = () => {
      const h = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: "owm-weather-height", height: h }, "*");
    };
    post();
    const t = window.setTimeout(post, 300);
    window.addEventListener("resize", post);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", post);
    };
  }, [data, loading, error]);

  return (
    <div className="w-full min-h-0 p-2 flex items-start justify-center bg-transparent">
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
          <EmbedWeatherWidget data={data} lang={lang} />
        </div>
      )}
    </div>
  );
}
