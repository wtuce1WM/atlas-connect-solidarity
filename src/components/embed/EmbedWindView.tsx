// Vue "Vent" du widget marées : carte Google de la ville + rose des vents en surimpression.
import React from "react";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";

export type WindPayload = {
  speed: number | null;
  gusts: number | null;
  direction: number | null;
  air_temperature?: number | null;
  unit?: string;
  hourly?: { time: string; speed: number; direction: number; gusts: number | null }[];
};

type Lang = "fr" | "en" | "ar";

const T: Record<Lang, Record<string, string>> = {
  fr: {
    wind: "Vent",
    gusts: "Rafales",
    from: "Vent de",
    unavailable: "Vent indisponible",
    next: "Prochaines heures",
    beaufort: "Force",
    air: "Air",
  },
  en: {
    wind: "Wind",
    gusts: "Gusts",
    from: "Wind from",
    unavailable: "Wind unavailable",
    next: "Next hours",
    beaufort: "Force",
    air: "Air",
  },
  ar: {
    wind: "الريح",
    gusts: "هبات",
    from: "ريح من",
    unavailable: "غير متاح",
    next: "الساعات القادمة",
    beaufort: "القوة",
    air: "الهواء",
  },
};

const CARDINALS: Record<Lang, string[]> = {
  fr: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"],
  en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
  ar: ["ش", "شر", "شرق", "جش", "ج", "جغ", "غرب", "شغ"],
};

export const cardinalOf = (deg: number, lang: Lang = "fr") =>
  CARDINALS[lang][Math.round(((deg % 360) / 45)) % 8];

/** Échelle de Beaufort à partir d'une vitesse en km/h. */
export const beaufort = (kmh: number) => {
  const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  let b = 0;
  for (let i = 0; i < t.length; i++) if (kmh >= t[i]) b = i + 1;
  return b;
};

const colorForSpeed = (kmh: number) =>
  kmh < 12 ? "#5EEAD4" : kmh < 28 ? "#7DD3FC" : kmh < 45 ? "#FDE68A" : kmh < 62 ? "#FDBA74" : "#FCA5A5";

/** Rose des vents : cadran gradué + aiguille orientée dans le sens du vent. */
function WindRose({ direction, speed, gusts, lang }: { direction: number; speed: number; gusts: number | null; lang: Lang }) {
  const C = 100;
  const R = 88;
  const color = colorForSpeed(speed);
  // Direction météo = provenance ; l'aiguille pointe vers là où va le vent.
  const rot = (direction + 180) % 360;
  const cards = CARDINALS[lang];

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label={`${T[lang].from} ${cardinalOf(direction, lang)} ${Math.round(speed)} km/h`}>
      <defs>
        <radialGradient id="wrGlass" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="rgba(8,20,32,0.30)" />
          <stop offset="100%" stopColor="rgba(8,20,32,0.72)" />
        </radialGradient>
        <linearGradient id="wrNeedle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
        </linearGradient>
      </defs>

      <circle cx={C} cy={C} r={R} fill="url(#wrGlass)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={R - 14} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

      {/* Graduations 10° */}
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const major = i % 9 === 0;
        const r1 = R - 4;
        const r2 = R - (major ? 16 : i % 3 === 0 ? 11 : 7);
        return (
          <line
            key={i}
            x1={C + r1 * Math.sin(a)}
            y1={C - r1 * Math.cos(a)}
            x2={C + r2 * Math.sin(a)}
            y2={C - r2 * Math.cos(a)}
            stroke={major ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)"}
            strokeWidth={major ? 2 : 1}
          />
        );
      })}

      {/* Points cardinaux */}
      {[0, 2, 4, 6].map((idx) => {
        const a = ((idx * 45) * Math.PI) / 180;
        const r = R - 27;
        return (
          <text
            key={idx}
            x={C + r * Math.sin(a)}
            y={C - r * Math.cos(a) + 5}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="rgba(255,255,255,0.9)"
          >
            {cards[idx]}
          </text>
        );
      })}

      {/* Aiguille */}
      <g transform={`rotate(${rot} ${C} ${C})`} style={{ transition: "transform 700ms ease" }}>
        <path d={`M ${C} ${C - 62} L ${C + 13} ${C + 16} L ${C} ${C + 6} L ${C - 13} ${C + 16} Z`} fill="url(#wrNeedle)" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
      </g>

      {/* Centre : vitesse */}
      <circle cx={C} cy={C} r={34} fill="rgba(8,20,32,0.78)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      <text x={C} y={C - 1} textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">
        {Math.round(speed)}
      </text>
      <text x={C} y={C + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.75)" letterSpacing="1">
        km/h
      </text>
      {gusts != null && (
        <text x={C} y={C + 26} textAnchor="middle" fontSize="8.5" fill={color}>
          ↑ {Math.round(gusts)}
        </text>
      )}
    </svg>
  );
}

export default function EmbedWindView({
  wind,
  lat,
  lon,
  cityName,
  lang = "fr",
  compact = false,
}: {
  wind: WindPayload | null | undefined;
  lat?: number | null;
  lon?: number | null;
  cityName: string;
  lang?: Lang;
  compact?: boolean;
}) {
  const L = T[lang];

  if (!wind || wind.speed == null || wind.direction == null) {
    return (
      <div className="px-6 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">{L.unavailable}</div>
    );
  }

  const mapUrl =
    lat != null && lon != null && GOOGLE_MAPS_EMBED_KEY
      ? `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_EMBED_KEY}&center=${lat},${lon}&zoom=11&maptype=satellite`
      : null;

  const hourly = (wind.hourly || []).slice(0, compact ? 4 : 8);

  return (
    <div className="text-neutral-900 dark:text-neutral-100">
      {/* CARTE + ROSE DES VENTS */}
      <div className={`relative w-full ${compact ? "h-[240px]" : "h-[320px]"} bg-slate-900 overflow-hidden`}>
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${L.wind} — ${cityName}`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-slate-800 to-slate-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/10 to-slate-950/70 pointer-events-none" />

        {/* Rose des vents en surimpression */}
        <div className={`absolute ${compact ? "inset-y-4" : "inset-y-6"} left-1/2 -translate-x-1/2 aspect-square pointer-events-none drop-shadow-2xl`}>
          <WindRose direction={wind.direction} speed={wind.speed} gusts={wind.gusts} lang={lang} />
        </div>

        {/* Bandeau infos */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 text-white pointer-events-none">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-80">{L.wind}</div>
            <div className="text-base font-semibold leading-tight">{cityName}</div>
          </div>
          <div className="rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[11px] font-medium">
            {L.beaufort} {beaufort(wind.speed)}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white text-[11px] pointer-events-none">
          <span className="rounded-full bg-black/45 backdrop-blur px-2.5 py-1">
            {L.from} <strong>{cardinalOf(wind.direction, lang)}</strong> ({Math.round(wind.direction)}°)
          </span>
          {wind.gusts != null && (
            <span className="rounded-full bg-black/45 backdrop-blur px-2.5 py-1">
              {L.gusts} <strong>{Math.round(wind.gusts)} km/h</strong>
            </span>
          )}
        </div>
      </div>

      {/* PROCHAINES HEURES */}
      {hourly.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2">{L.next}</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {hourly.map((hh, i) => (
              <div
                key={i}
                className="shrink-0 w-[62px] rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-2 py-2 text-center"
              >
                <div className="text-[10px] opacity-60">
                  {new Date(hh.time).toLocaleTimeString(lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Casablanca",
                  })}
                </div>
                <div
                  className="mx-auto my-1 text-lg leading-none"
                  style={{ transform: `rotate(${(hh.direction + 180) % 360}deg)`, color: colorForSpeed(hh.speed) }}
                  aria-hidden
                >
                  ↑
                </div>
                <div className="text-[11px] font-semibold leading-none">{Math.round(hh.speed)}</div>
                <div className="text-[9px] opacity-55">km/h</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
