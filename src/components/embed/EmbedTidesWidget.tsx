// Immersive tides widget — Moroccan coastal cities (Essaouira, Agadir, Taghazout…).
// Data comes from the public `tides` edge function (Open-Meteo Marine, MSL-referenced).
import React from "react";
import EmbedWindView, { type WindPayload } from "./EmbedWindView";
import EmbedWeatherWidget, { type WeatherPayload } from "./EmbedWeatherWidget";
import EmbedWidgetSettings from "./EmbedWidgetSettings";

import { smoothPath } from "@/lib/smoothPath";
import { supabase } from "@/integrations/supabase/client";


export type TideExtreme = { time: string; type: "high" | "low"; height: number };
export type TideCurvePoint = { time: string; height: number };

export type TidesPayload = {
  city_slug: string;
  city_name: string;
  sea: "atlantic" | "mediterranean";
  timezone?: string;
  lat?: number | null;
  lon?: number | null;
  now: {
    height: number | null;
    trend: "rising" | "falling" | "slack";
    wave_height: number | null;
    wave_period: number | null;
    sea_temperature: number | null;
    wave_direction?: number | null;
  };
  wind?: WindPayload | null;
  previous_extreme: TideExtreme | null;
  extremes: TideExtreme[];
  curve: TideCurvePoint[];
  range: number | null;
  coefficient: number | null;
  datum?: string;
};

type Lang = "fr" | "en" | "ar";

const T: Record<Lang, Record<string, string>> = {
  fr: {
    tides: "Marées",
    now: "Maintenant",
    rising: "Marée montante",
    falling: "Marée descendante",
    slack: "Étale",
    high: "Pleine mer",
    low: "Basse mer",
    next: "Prochaines marées",
    coef: "Coefficient",
    range: "Marnage",
    water: "Eau",
    waves: "Houle",
    period: "Période",
    in: "dans",
    h: "h",
    min: "min",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    curve: "Niveau de la mer sur 24 h",
    note: "Niveau modélisé / niveau moyen — usage plage & loisirs.",
    unavailable: "Marées indisponibles",
  },
  en: {
    tides: "Tides",
    now: "Now",
    rising: "Rising tide",
    falling: "Falling tide",
    slack: "Slack water",
    high: "High tide",
    low: "Low tide",
    next: "Next tides",
    coef: "Coefficient",
    range: "Range",
    water: "Water",
    waves: "Swell",
    period: "Period",
    in: "in",
    h: "h",
    min: "min",
    today: "Today",
    tomorrow: "Tomorrow",
    curve: "Sea level over 24 h",
    note: "Modelled level vs mean sea level — beach & leisure use.",
    unavailable: "Tides unavailable",
  },
  ar: {
    tides: "المد والجزر",
    now: "الآن",
    rising: "المد صاعد",
    falling: "الجزر",
    slack: "ثبات",
    high: "المد العالي",
    low: "الجزر المنخفض",
    next: "المواعيد القادمة",
    coef: "المعامل",
    range: "الفرق",
    water: "الماء",
    waves: "الأمواج",
    period: "الدورة",
    in: "بعد",
    h: "س",
    min: "د",
    today: "اليوم",
    tomorrow: "غدًا",
    curve: "مستوى البحر خلال 24 ساعة",
    note: "مستوى تقديري بالنسبة للمتوسط — للاستعمال الشاطئي.",
    unavailable: "غير متاح",
  },
};

const localeOf = (lang: Lang) => (lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR");

function fmtTime(iso: string, lang: Lang, tz?: string): string {
  try {
    return new Date(iso).toLocaleTimeString(localeOf(lang), {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || "Africa/Casablanca",
    });
  } catch {
    return iso.slice(11, 16);
  }
}

function dayLabel(iso: string, lang: Lang, tz?: string): string {
  const L = T[lang];
  try {
    const zone = tz || "Africa/Casablanca";
    const key = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: zone });
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    if (key(d) === key(today)) return L.today;
    if (key(d) === key(tomorrow)) return L.tomorrow;
    return d.toLocaleDateString(localeOf(lang), { weekday: "short", day: "numeric", timeZone: zone });
  } catch {
    return "";
  }
}

function countdown(iso: string, lang: Lang): string {
  const L = T[lang];
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "";
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours <= 0) return `${L.in} ${mins} ${L.min}`;
  return `${L.in} ${hours} ${L.h} ${String(mins).padStart(2, "0")}`;
}

function coefLabel(coef: number, lang: Lang): string {
  if (lang === "en") {
    if (coef >= 100) return "Spring tide";
    if (coef >= 80) return "Strong";
    if (coef >= 55) return "Average";
    return "Neap tide";
  }
  if (lang === "ar") {
    if (coef >= 100) return "مد قوي جدًا";
    if (coef >= 80) return "قوي";
    if (coef >= 55) return "متوسط";
    return "ضعيف";
  }
  if (coef >= 100) return "Grande marée";
  if (coef >= 80) return "Forte";
  if (coef >= 55) return "Moyenne";
  return "Morte-eau";
}

/** Smooth sea-level SVG curve — shared Catmull-Rom → cubic Bézier helper. */


function TideCurve({ curve, extremes, lang, tz }: { curve: TideCurvePoint[]; extremes: TideExtreme[]; lang: Lang; tz?: string }) {
  if (!curve || curve.length < 3) return null;
  const W = 720;
  const H = 150;
  const padX = 18;
  const padTop = 26;
  const padBottom = 26;

  const t0 = new Date(curve[0].time).getTime();
  const t1 = new Date(curve[curve.length - 1].time).getTime();
  const span = Math.max(1, t1 - t0);
  const hs = curve.map((c) => c.height);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const vSpan = Math.max(0.4, max - min);

  const xAt = (iso: string) => padX + ((new Date(iso).getTime() - t0) / span) * (W - padX * 2);
  const yAt = (v: number) => padTop + (1 - (v - min) / vSpan) * (H - padTop - padBottom);

  const pts = curve.map((c) => ({ x: xAt(c.time), y: yAt(c.height) }));
  const path = smoothPath(pts);
  const area = `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;

  const nowMs = Date.now();
  const nowX = nowMs >= t0 && nowMs <= t1 ? padX + ((nowMs - t0) / span) * (W - padX * 2) : null;

  const marks = extremes.filter((e) => {
    const t = new Date(e.time).getTime();
    return t >= t0 && t <= t1;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[150px]" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="tdArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tdArea)" />
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {nowX != null && (
        <g>
          <line x1={nowX} y1={10} x2={nowX} y2={H} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeDasharray="4 4" />
          <circle
            cx={nowX}
            cy={yAt(curve.reduce((acc, c) => (Math.abs(new Date(c.time).getTime() - nowMs) < Math.abs(new Date(acc.time).getTime() - nowMs) ? c : acc), curve[0]).height)}
            r={5}
            fill="#fff"
          />
        </g>
      )}

      {marks.map((m, i) => {
        const x = xAt(m.time);
        const y = yAt(m.height);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.5} fill={m.type === "high" ? "#FFD98A" : "rgba(255,255,255,0.85)"} />
            <text
              x={Math.min(W - 30, Math.max(30, x))}
              y={m.type === "high" ? Math.max(14, y - 10) : Math.min(H - 6, y + 16)}
              textAnchor="middle"
              fontSize="16"
              fill="rgba(255,255,255,0.92)"
              fontWeight="600"
            >
              {fmtTime(m.time, lang, tz)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function EmbedTidesWidget({
  data,
  lang = "fr",
  compact = false,
  fullWidth = false,
  onCityChange,
}: {
  data: TidesPayload;
  lang?: Lang;
  compact?: boolean;
  /** Étire le widget sur toute la largeur disponible (pas de cap 520px). */
  fullWidth?: boolean;
  onCityChange?: (slug: string) => void;
}) {
  const L = T[lang];
  const hasWind = !!(data.wind && data.wind.speed != null && data.wind.direction != null);
  const [view, setView] = React.useState<"tides" | "wind" | "weather">("tides");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const windLabel = lang === "en" ? "Wind" : lang === "ar" ? "الريح" : "Vent";
  const weatherLabel = lang === "en" ? "Weather" : lang === "ar" ? "الطقس" : "Météo";
  const settingsLabel = lang === "en" ? "Settings" : lang === "ar" ? "الإعدادات" : "Paramètres";

  // Lazy-loaded weather for the same city (reuses the Weather widget payload).
  const [weather, setWeather] = React.useState<WeatherPayload | null>(null);
  const [weatherError, setWeatherError] = React.useState(false);
  React.useEffect(() => {
    if (view !== "weather" || weather || weatherError) return;
    let alive = true;
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("get-weather", {
          body: { city: data.city_name, lang },
        });
        if (!alive) return;
        if (error || !res || (res as any).error || typeof (res as any).temp !== "number") setWeatherError(true);
        else setWeather(res as WeatherPayload);
      } catch {
        if (alive) setWeatherError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [view, weather, weatherError, data.city_name, lang]);

  const tz = data.timezone;
  const trendLabel = L[data.now.trend] || L.slack;
  const trendIcon = data.now.trend === "rising" ? "▲" : data.now.trend === "falling" ? "▼" : "◆";
  const next = data.extremes?.[0];
  const upcoming = (data.extremes || []).slice(0, 4);

  const gradient =
    data.now.trend === "rising"
      ? "from-cyan-500 via-sky-700 to-indigo-950"
      : data.now.trend === "falling"
        ? "from-teal-600 via-slate-700 to-slate-950"
        : "from-sky-600 via-slate-700 to-slate-950";

  return (
    <div className={`w-full ${fullWidth ? "" : "max-w-[520px]"} overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-neutral-900`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{`
        @keyframes tdWave { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-18px) } }
        @keyframes tdPulse { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.08) } }
        .td-wave { animation: tdWave 7s ease-in-out infinite }
        .td-pulse { animation: tdPulse 2.6s ease-in-out infinite }
      `}</style>

      {/* TOGGLE Marées / Vent / Météo */}
      <div className="flex items-center gap-1 p-1.5 bg-neutral-100 dark:bg-neutral-800">
        {(hasWind ? (["tides", "wind", "weather"] as const) : (["tides", "weather"] as const)).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`flex-1 rounded-2xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === v
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {v === "tides" ? `🌊 ${L.tides}` : v === "wind" ? `🧭 ${windLabel}` : `☀️ ${weatherLabel}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSettingsOpen((s) => !s)}
          aria-pressed={settingsOpen}
          aria-label={settingsLabel}
          title={settingsLabel}
          className={`shrink-0 rounded-2xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            settingsOpen
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          ⚙️
        </button>
      </div>

      {settingsOpen && (
        <EmbedWidgetSettings
          lang={lang}
          citySlug={data.city_slug}
          cityName={data.city_name}
          onCityChange={onCityChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {view === "weather" ? (

        weather ? (
          <EmbedWeatherWidget data={weather} lang={lang} embedded ink="light" />
        ) : (
          <div className="px-4 py-10 text-center text-xs text-neutral-500 dark:text-neutral-400">
            {weatherError
              ? lang === "en"
                ? "Weather unavailable"
                : lang === "ar"
                  ? "الطقس غير متاح"
                  : "Météo indisponible"
              : lang === "en"
                ? "Loading weather…"
                : lang === "ar"
                  ? "جار التحميل…"
                  : "Chargement de la météo…"}
          </div>
        )
      ) : view === "wind" && hasWind ? (
        <EmbedWindView
          wind={data.wind!}
          lat={data.lat}
          lon={data.lon}
          cityName={data.city_name}
          lang={lang}
          compact={compact}
        />
      ) : (

      <>
      {/* HERO */}
      <div className={`relative bg-gradient-to-br ${gradient} px-6 pt-6 pb-4 text-white overflow-hidden`}>
        <div className="absolute inset-x-0 bottom-0 h-24 opacity-20 pointer-events-none td-wave" aria-hidden>
          <svg viewBox="0 0 800 100" className="w-[130%] h-full" preserveAspectRatio="none">
            <path d="M0 60 Q 100 20 200 60 T 400 60 T 600 60 T 800 60 V100 H0 Z" fill="#fff" />
          </svg>
        </div>

        <div className="relative z-[1] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">{L.tides}</div>
            <div className="text-lg font-semibold leading-tight mt-0.5">{data.city_name}</div>
            <div className="mt-3 flex items-end gap-2">
              <div className="text-5xl font-bold leading-none tracking-tight">
                {data.now.height != null ? `${data.now.height > 0 ? "+" : ""}${data.now.height.toFixed(2)}` : "—"}
                <span className="text-xl font-medium opacity-70 ml-1">m</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="td-pulse">{trendIcon}</span>
              <span className="font-medium">{trendLabel}</span>
              {next && (
                <span className="opacity-80">
                  · {next.type === "high" ? L.high : L.low} {fmtTime(next.time, lang, tz)}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {data.coefficient != null && (
              <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider opacity-80">{L.coef}</div>
                <div className="text-2xl font-bold leading-none">{data.coefficient}</div>
                <div className="text-[10px] opacity-85 mt-0.5">{coefLabel(data.coefficient, lang)}</div>
              </div>
            )}
            {data.range != null && (
              <div className="mt-2 text-[11px] opacity-85">
                {L.range} {data.range.toFixed(2)} m
              </div>
            )}
          </div>
        </div>

        {!compact && data.curve?.length >= 3 && (
          <div className="relative z-[1] mt-3 -mx-2">
            <div className="px-2 text-[11px] uppercase tracking-wider opacity-75 mb-1">{L.curve}</div>
            <TideCurve curve={data.curve} extremes={data.extremes || []} lang={lang} tz={tz} />
          </div>
        )}
      </div>

      {/* NEXT TIDES */}
      {upcoming.length > 0 && (
        <div className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
          <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2">{L.next}</div>
          <div className="grid grid-cols-2 gap-2">
            {upcoming.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2.5"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    e.type === "high"
                      ? "bg-amber-400/20 text-amber-600 dark:text-amber-300"
                      : "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                  }`}
                  aria-hidden
                >
                  {e.type === "high" ? "▲" : "▼"}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] opacity-60 truncate">
                    {e.type === "high" ? L.high : L.low} · {dayLabel(e.time, lang, tz)}
                  </div>
                  <div className="text-sm font-semibold leading-tight">
                    {fmtTime(e.time, lang, tz)}
                    <span className="ml-1.5 text-[11px] font-normal opacity-60">
                      {e.height > 0 ? "+" : ""}
                      {e.height.toFixed(2)} m
                    </span>
                  </div>
                  {i === 0 && <div className="text-[10px] opacity-55">{countdown(e.time, lang)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WATER CONDITIONS */}
      {(data.now.sea_temperature != null || data.now.wave_height != null) && (
        <div className="px-4 pb-3 text-neutral-900 dark:text-neutral-100">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2.5 text-xs">
            {data.now.sea_temperature != null && (
              <span>
                🌊 {L.water} <strong>{Math.round(data.now.sea_temperature)}°C</strong>
              </span>
            )}
            {data.now.wave_height != null && (
              <span>
                〰️ {L.waves} <strong>{data.now.wave_height.toFixed(1)} m</strong>
              </span>
            )}
            {data.now.wave_period != null && (
              <span>
                ⏱ {L.period} <strong>{Math.round(data.now.wave_period)} s</strong>
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">{L.note}</p>
        </div>
      )}
      </>
      )}

      {/* SIGNATURE */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex items-center justify-center">
        <a
          href="https://oneworldmorocco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] tracking-wide text-neutral-500 dark:text-neutral-400 hover:text-primary transition-colors"
        >
          oneworldmorocco.com
        </a>
      </div>
    </div>
  );
}
