// Widget marées piloté par l'Assistant IA : reçoit une ville (slug ou nom),
// charge la fonction publique `tides` et rend le widget marées/vent/météo.
import React from "react";
import EmbedTidesWidget, { type TidesPayload } from "./EmbedTidesWidget";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tides`;

type Lang = "fr" | "en" | "ar";

export default function AiTidesWidget({ city, lang = "fr" }: { city: string; lang?: Lang }) {
  const [current, setCurrent] = React.useState(city);
  const [data, setData] = React.useState<TidesPayload | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => setCurrent(city), [city]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setError(false);
      try {
        const res = await fetch(`${FN_URL}?city=${encodeURIComponent(current)}&lang=${lang}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || json?.error) setError(true);
        else setData(json as TidesPayload);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [current, lang]);

  if (error) return null;
  if (!data) {
    return (
      <div className="text-xs opacity-70">
        {lang === "en" ? "Loading tides…" : lang === "ar" ? "جارٍ تحميل المد والجزر…" : "Chargement des marées…"}
      </div>
    );
  }
  return <EmbedTidesWidget data={data} lang={lang} fullWidth onCityChange={setCurrent} />;
}
