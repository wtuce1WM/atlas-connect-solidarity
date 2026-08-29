// Immersive weather widget for /embed/ask — iOS-style hero card + 24h curve + 3-day strip.
import React from "react";
import { smoothPath } from "@/lib/smoothPath";


export type WeatherHourly = {
  hour: string;
  temp: number;
  description?: string;
  icon?: string;
  pop?: number;
  wind_speed?: number;
};
export type WeatherDaily = {
  date: string;
  temp_min: number;
  temp_max: number;
  description?: string;
  icon?: string;
  pop_max?: number;
};
export type WeatherDaily7 = {
  date: string;
  weather_code?: number | null;
  temp_min: number;
  temp_max: number;
  pop_max?: number;
  wind_speed?: number;
  wind_gust?: number;
  wind_direction?: number;
};
export type WeatherPayload = {
  city_name: string;
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure?: number | null;
  wind_speed: number;
  wind_direction?: number | null;
  wind_gust?: number | null;
  description: string;
  icon?: string;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  daily7?: WeatherDaily7[];
};


type Lang = "fr" | "en" | "ar";

// OpenWeather icon code → emoji + animation kind
export function iconToEmoji(icon: string | undefined): { emoji: string; anim: string } {
  const c = (icon || "").slice(0, 3);
  const isNight = (icon || "").endsWith("n");
  switch (c) {
    case "01d": return { emoji: "☀️", anim: "wx-sun" };
    case "01n": return { emoji: "🌙", anim: "wx-moon" };
    case "02d": return { emoji: "🌤️", anim: "wx-sun" };
    case "02n": return { emoji: "☁️", anim: "wx-cloud" };
    case "03d":
    case "03n": return { emoji: "⛅", anim: "wx-cloud" };
    case "04d":
    case "04n": return { emoji: "☁️", anim: "wx-cloud" };
    case "09d":
    case "09n": return { emoji: "🌧️", anim: "wx-rain" };
    case "10d": return { emoji: "🌦️", anim: "wx-rain" };
    case "10n": return { emoji: "🌧️", anim: "wx-rain" };
    case "11d":
    case "11n": return { emoji: "⛈️", anim: "wx-storm" };
    case "13d":
    case "13n": return { emoji: "🌨️", anim: "wx-snow" };
    case "50d":
    case "50n": return { emoji: "🌫️", anim: "wx-mist" };
    default: return { emoji: isNight ? "🌙" : "☀️", anim: "wx-sun" };
  }
}

// Gradient by primary condition
export function bgFor(icon: string | undefined): string {
  const c = (icon || "").slice(0, 3);
  const night = (icon || "").endsWith("n");
  if (c === "01d" || c === "02d") return "from-amber-300 via-orange-400 to-rose-500";
  if (c === "01n") return "from-indigo-950 via-slate-900 to-black";
  if (c === "02n" || c === "03n" || c === "04n") return "from-slate-800 via-slate-900 to-indigo-950";
  if (c === "03d" || c === "04d") return "from-sky-400 via-slate-400 to-slate-600";
  if (c === "09d" || c === "09n" || c === "10d" || c === "10n") return "from-slate-600 via-slate-700 to-blue-900";
  if (c === "11d" || c === "11n") return "from-slate-800 via-indigo-900 to-slate-950";
  if (c === "13d" || c === "13n") return "from-sky-200 via-slate-300 to-slate-500";
  if (c === "50d" || c === "50n") return "from-slate-400 via-slate-500 to-slate-600";
  return night ? "from-indigo-950 via-slate-900 to-black" : "from-amber-300 via-orange-400 to-rose-500";
}

export function formatDayLabel(dateStr: string, lang: Lang): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const iso = (x: Date) => x.toISOString().slice(0, 10);
    if (iso(d) === iso(today)) return lang === "en" ? "Today" : lang === "ar" ? "اليوم" : "Aujourd'hui";
    if (iso(d) === iso(tomorrow)) return lang === "en" ? "Tomorrow" : lang === "ar" ? "غدًا" : "Demain";
    const locale = lang === "en" ? "en-US" : lang === "ar" ? "ar-MA" : "fr-FR";
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

// Wind direction (meteorological degrees = where wind comes FROM) → compass label
export function compassLabel(deg: number, lang: Lang): string {
  const fr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  const en = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return (lang === "fr" ? fr : en)[idx];
}

// Beaufort scale from km/h
export function beaufort(kmh: number): number {
  const bounds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  let b = 0;
  for (const v of bounds) if (kmh >= v) b++;
  return b;
}

// Open-Meteo WMO weather code → emoji
export function codeToEmoji(code: number | null | undefined): string {
  if (code == null) return "☀️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}


// SVG hourly curve
function HourlyCurve({ hourly }: { hourly: WeatherHourly[] }) {
  const pts = hourly.slice(0, 8);
  if (pts.length < 2) return null;
  const W = 720;
  const H = 130;
  const padX = 32;
  const padY = 34;
  const temps = pts.map((p) => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  const xAt = (i: number) => padX + (i * (W - padX * 2)) / (pts.length - 1);
  const yAt = (t: number) => padY + (1 - (t - min) / span) * (H - padY * 2);
  const path = smoothPath(pts.map((p, i) => ({ x: xAt(i), y: yAt(p.temp) })));
  const area = `${path} L ${xAt(pts.length - 1).toFixed(1)} ${H - 4} L ${xAt(0).toFixed(1)} ${H - 4} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[130px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wxArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wxArea)" />
      <path d={path} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const cx = xAt(i);
        const cy = yAt(p.temp);
        const { emoji } = iconToEmoji(p.icon);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3.5} fill="white" />
            <text x={cx} y={cy - 12} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{p.temp}°</text>
            <text x={cx} y={H - 18} textAnchor="middle" fontSize="14">{emoji}</text>
            <text x={cx} y={H - 4} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.85)">{p.hour}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function EmbedWeatherWidget({
  data,
  lang = "fr",
  embedded = false,
  surface = "",
  ink = "dark",
}: {
  data: WeatherPayload;
  lang?: Lang;
  /** When true, renders flush inside a host card (no max-width, no rounding/shadow). */
  embedded?: boolean;
  /** Forecast panel background: "" = transparent (host site), "#RRGGBB" = forced color. */
  surface?: string;
  /** Ink of the forecast panel, computed from the surface luminance. */
  ink?: "light" | "dark";
}) {
  const panelStyle = { background: surface || "transparent", color: ink === "dark" ? "#171717" : "#FAFAFA" };
  const tileBg = ink === "dark" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)";
  const main = iconToEmoji(data.icon);
  const gradient = bgFor(data.icon);
  const seven = data.daily7 || [];
  const [range, setRange] = React.useState<3 | 7>(3);
  const hasSeven = seven.length > 3;
  const days = (data.daily || []).slice(0, 3);
  const hasRain = /01d|01n|02/.test((data.icon || "").slice(0, 3)) === false && ((data.hourly || []).some((h) => (h.pop || 0) >= 20));

  const L = {
    fr: { feels: "ressenti", humidity: "Humidité", wind: "Vent", gust: "rafales", rain: "Pluie", next: "Prochaines heures", days: "3 prochains jours", days7: "7 prochains jours", d3: "3 jours", d7: "7 jours", beaufort: "Force" },
    en: { feels: "feels like", humidity: "Humidity", wind: "Wind", gust: "gusts", rain: "Rain", next: "Next hours", days: "Next 3 days", days7: "Next 7 days", d3: "3 days", d7: "7 days", beaufort: "Force" },
    ar: { feels: "محسوسة", humidity: "الرطوبة", wind: "الرياح", gust: "هبات", rain: "المطر", next: "الساعات القادمة", days: "الأيام الثلاثة القادمة", days7: "الأيام السبعة القادمة", d3: "3 أيام", d7: "7 أيام", beaufort: "القوة" },
  }[lang];


  return (
    <div className={embedded ? "w-full rounded-3xl overflow-hidden" : "w-full max-w-[560px] mx-auto rounded-3xl overflow-hidden shadow-xl"}>

      <style>{`
        @keyframes wxSunPulse { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 24px rgba(255,220,120,0.55)); } 50% { transform: scale(1.06); filter: drop-shadow(0 0 40px rgba(255,220,120,0.85)); } }
        @keyframes wxCloudDrift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        @keyframes wxRainShake { 0%,100% { transform: translateY(0); } 25% { transform: translateY(3px); } 75% { transform: translateY(-2px); } }
        @keyframes wxStormFlash { 0%,88%,100% { filter: drop-shadow(0 0 20px rgba(255,255,180,0.4)); } 90%,94% { filter: drop-shadow(0 0 60px rgba(255,255,180,1)); transform: scale(1.08); } }
        @keyframes wxMoonGlow { 0%,100% { filter: drop-shadow(0 0 24px rgba(200,220,255,0.5)); } 50% { filter: drop-shadow(0 0 40px rgba(200,220,255,0.85)); } }
        @keyframes wxDrop { 0% { transform: translateY(-10px); opacity: 0; } 20% { opacity: 0.85; } 100% { transform: translateY(90px); opacity: 0; } }
        .wx-sun { animation: wxSunPulse 3.2s ease-in-out infinite; }
        .wx-moon { animation: wxMoonGlow 4s ease-in-out infinite; }
        .wx-cloud { animation: wxCloudDrift 5s ease-in-out infinite; }
        .wx-rain { animation: wxRainShake 1.4s ease-in-out infinite; }
        .wx-storm { animation: wxStormFlash 3s ease-in-out infinite; }
        .wx-snow { animation: wxCloudDrift 6s ease-in-out infinite; }
        .wx-mist { animation: wxCloudDrift 8s ease-in-out infinite; }
        .wx-drop { position: absolute; width: 2px; height: 12px; background: linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0)); border-radius: 2px; animation: wxDrop 1.1s linear infinite; }
      `}</style>

      {/* HERO */}
      <div className={`relative bg-gradient-to-br ${gradient} px-6 pt-6 pb-5 text-white overflow-hidden`}>
        {/* Rain particles for rain/storm */}
        {(main.anim === "wx-rain" || main.anim === "wx-storm") && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="wx-drop"
                style={{ left: `${(i * 5.6) % 100}%`, top: `${(i * 13) % 40}%`, animationDelay: `${(i * 0.13).toFixed(2)}s`, animationDuration: `${(0.9 + (i % 5) * 0.12).toFixed(2)}s` }}
              />
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 relative z-[1]">
          <div className="min-w-0">
            <div className="text-sm/tight opacity-90">{data.city_name}</div>
            <div className="flex items-end gap-2 mt-1">
              <div className="text-6xl font-bold tracking-tight leading-none">{data.temp}°</div>
              <div className="pb-1.5 text-xs opacity-90">
                <div className="capitalize">{data.description}</div>
                <div>{L.feels} {data.feels_like}°</div>
              </div>
            </div>
            <div className="mt-2 text-xs opacity-90 flex items-center gap-3">
              <span>↓ {data.temp_min}°</span>
              <span>↑ {data.temp_max}°</span>
              <span>💧 {data.humidity}%</span>
              {hasRain && <span>☔️ {L.rain}</span>}
            </div>

            {/* Wind detail */}
            <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur px-2.5 py-1.5 text-xs">
              <span
                className="text-base leading-none"
                style={{ transform: `rotate(${(data.wind_direction ?? 0) + 180}deg)` }}
                aria-hidden
              >
                ➤
              </span>
              <span className="font-semibold">{data.wind_speed} km/h</span>
              {data.wind_direction != null && <span className="opacity-85">{compassLabel(data.wind_direction, lang)}</span>}
              <span className="opacity-75">· {L.beaufort} {beaufort(data.wind_speed)}</span>
              {data.wind_gust != null && data.wind_gust > data.wind_speed && (
                <span className="opacity-75">· {L.gust} {data.wind_gust} km/h</span>
              )}
            </div>

          </div>
          <div className={`text-7xl select-none ${main.anim}`} aria-hidden>{main.emoji}</div>
        </div>

        {/* Hourly curve */}
        {data.hourly && data.hourly.length >= 2 && (
          <div className="mt-4 -mx-2 relative z-[1]">
            <div className="text-[11px] uppercase tracking-wider opacity-80 mb-1 px-2">{L.next}</div>
            <HourlyCurve hourly={data.hourly} />
          </div>
        )}
      </div>

      {/* Forecast — 3 days (compact strip) or 7 days (rows with wind) */}
      {(days.length > 0 || hasSeven) && (
        <div className="px-4 py-3" style={panelStyle}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] uppercase tracking-wider opacity-60">{range === 7 ? L.days7 : L.days}</div>
            {hasSeven && (
              <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: tileBg }}>
                {([3, 7] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      range === r ? "shadow" : "opacity-60"
                    }`}
                    style={range === r ? { background: surface || (ink === "dark" ? "#FFFFFF" : "#171717") } : undefined}
                  >
                    {r === 3 ? L.d3 : L.d7}
                  </button>
                ))}
              </div>
            )}
          </div>

          {range === 7 ? (
            <div className="flex flex-col gap-1.5">
              {seven.slice(0, 7).map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2"
                  style={{ background: tileBg }}
                >
                  <div className="w-[72px] shrink-0 text-[11px] font-medium opacity-80 truncate">
                    {formatDayLabel(d.date, lang)}
                  </div>
                  <div className="text-xl leading-none" aria-hidden>{codeToEmoji(d.weather_code)}</div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {d.temp_max}° <span className="opacity-50 font-normal">/ {d.temp_min}°</span>
                  </div>
                  <div className="ms-auto flex items-center gap-2.5 text-[11px] opacity-75 whitespace-nowrap">
                    {(d.pop_max ?? 0) >= 20 && <span>💧 {d.pop_max}%</span>}
                    {d.wind_speed != null && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block leading-none"
                          style={{ transform: `rotate(${(d.wind_direction ?? 0) + 180}deg)` }}
                          aria-hidden
                        >
                          ➤
                        </span>
                        {d.wind_speed} km/h
                        {d.wind_direction != null && <span className="opacity-70">{compassLabel(d.wind_direction, lang)}</span>}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {days.map((d, i) => {
                const em = iconToEmoji(d.icon);
                return (
                  <div key={i} className="flex flex-col items-center justify-center rounded-2xl px-2 py-3" style={{ background: tileBg }}>
                    <div className="text-[11px] font-medium opacity-80">{formatDayLabel(d.date, lang)}</div>
                    <div className={`text-3xl mt-1 ${em.anim}`} aria-hidden>{em.emoji}</div>
                    <div className="mt-1 text-sm font-semibold">{d.temp_max}° <span className="opacity-50 font-normal">/ {d.temp_min}°</span></div>
                    {(d.pop_max ?? 0) >= 20 && (
                      <div className="mt-0.5 text-[10px] opacity-70">💧 {d.pop_max}%</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Signature (hidden when nested inside a host widget that already has one) */}
      {!embedded && (
        <div className="border-t border-black/10 px-4 py-2 flex items-center justify-center" style={panelStyle}>
          <a
            href="https://oneworldmorocco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-wide opacity-60 hover:text-primary transition-colors"
          >
            oneworldmorocco.com
          </a>
        </div>
      )}

    </div>
  );
}
