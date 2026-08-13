// Standalone embeddable tides page: /embed/tides?city=Essaouira&lang=fr&picker=1
// Designed to be loaded in an <iframe> from any external site.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmbedTidesWidget, { type TidesPayload } from "@/components/embed/EmbedTidesWidget";
import { parseFit, fitFlags, applyEmbedBg } from "@/lib/embedFit";
import { useEmbedFitScale } from "@/hooks/useEmbedFitScale";
import { useWidgetTracking } from "@/hooks/useWidgetTracking";
import { useWidgetParams } from "@/hooks/useWidgetParams";

type Lang = "fr" | "en" | "ar";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tides`;

const MESSAGES: Record<Lang, { loading: string; error: string; pick: string }> = {
  fr: { loading: "Chargement des marées…", error: "Marées indisponibles", pick: "Ville côtière" },
  en: { loading: "Loading tides…", error: "Tides unavailable", pick: "Coastal city" },
  ar: { loading: "جارٍ تحميل المد والجزر…", error: "غير متاح", pick: "مدينة ساحلية" },
};

type CityOption = { slug: string; name: string; sea: string };

export default function EmbedTides() {
  const { params, businessId: widgetBusinessId } = useWidgetParams("tides", {});
  useWidgetTracking("tides", widgetBusinessId, params.get("lang") || undefined);
  const initialCity = params.get("city")?.trim() || "Essaouira";
  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const showPicker = params.get("picker") === "1" || params.get("picker") === "true";
  const compact = params.get("compact") === "1";
  const L = MESSAGES[lang];
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  const capW = fullWidth ? "" : "max-w-[520px]";

  const [city, setCity] = useState(initialCity);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [data, setData] = useState<TidesPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { innerRef: fitInnerRef, style: fitStyle } = useEmbedFitScale(fullHeight, [data, loading, error, showPicker]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(params.get("bg"));
  }, [lang, params]);

  useEffect(() => {
    if (!showPicker) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?list=1`);
        const json = await res.json();
        if (alive && Array.isArray(json?.cities)) setCities(json.cities);
      } catch { /* ignore */ }
    })();
    return () => {
      alive = false;
    };
  }, [showPicker]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`${FN_URL}?city=${encodeURIComponent(city)}&lang=${lang}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || json?.error) setError(true);
        else setData(json as TidesPayload);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [city, lang]);

  // Report height so the host page can auto-resize the iframe.
  // On mesure le conteneur du widget (et non documentElement) pour éviter toute
  // boucle de croissance quand l'hôte redimensionne l'iframe.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || fullHeight) return;
    const post = () => {
      window.parent?.postMessage(
        { type: "owm-tides-height", height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, loading, error, showPicker, fullHeight]);

  return (
    <div
      ref={rootRef}
      className={`w-full mx-auto flex flex-col items-center gap-2 bg-transparent ${capW} ${fullHeight ? "h-screen min-h-screen overflow-hidden p-1" : "min-h-0 p-2"}`}
    >

      {showPicker && cities.length > 0 && (
        <div className={`w-full ${capW}`}>
          <label className="sr-only" htmlFor="owm-tide-city">
            {L.pick}
          </label>
          <select
            id="owm-tide-city"
            value={cities.find((c) => c.name.toLowerCase() === city.toLowerCase())?.slug || city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className={`w-full ${capW} rounded-3xl bg-muted/40 animate-pulse h-[300px] flex items-center justify-center text-sm text-muted-foreground`}>
          {L.loading}
        </div>
      )}
      {!loading && (error || !data) && (
        <div className={`w-full ${capW} rounded-3xl border border-border p-6 text-center text-sm text-muted-foreground`}>
          {L.error}
        </div>
      )}
      {!loading && !error && data && (
        <div
          ref={fitInnerRef}
          className="w-full flex justify-center [&>div]:max-w-full"
          style={fitStyle}
        >
          <EmbedTidesWidget data={data} lang={lang} compact={compact} fullWidth={fullWidth} onCityChange={setCity} />
        </div>
      )}
    </div>
  );
}
