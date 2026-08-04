// Version "footer" du widget météo : bandeau fin, horizontal, full-width (desktop uniquement).
// Sur mobile, la page /embed/weather bascule automatiquement sur la carte verticale classique,
// la largeur y étant insuffisante pour rester lisible.
import {
  bgFor,
  iconToEmoji,
  formatDayLabel,
  compassLabel,
  type WeatherPayload,
} from "@/components/embed/EmbedWeatherWidget";

type Lang = "fr" | "en" | "ar";

export default function EmbedWeatherFooterBar({
  data,
  lang = "fr",
  days = 3,
  ink = "light",
}: {
  data: WeatherPayload;
  lang?: Lang;
  /** Nombre de jours de prévisions affichés dans le bandeau (3 par défaut). */
  days?: number;
  /** Encre du bandeau : "light" = texte clair sur dégradé (défaut). */
  ink?: "light" | "dark";
}) {
  const main = iconToEmoji(data.icon);
  const gradient = bgFor(data.icon);
  const forecast = (data.daily || []).slice(0, Math.max(1, days));
  const text = ink === "dark" ? "#171717" : "#FFFFFF";

  const L = {
    fr: { feels: "ressenti", wind: "Vent" },
    en: { feels: "feels like", wind: "Wind" },
    ar: { feels: "محسوسة", wind: "الرياح" },
  }[lang];

  return (
    <div
      className={`w-full bg-gradient-to-r ${gradient} px-4 md:px-8 py-3`}
      style={{ color: text }}
    >
      <div className="mx-auto max-w-[1400px] flex items-center gap-6">
        {/* Actuel */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-4xl leading-none select-none ${main.anim}`} aria-hidden>
            {main.emoji}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider opacity-80 truncate">
              {data.city_name}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold leading-none tracking-tight">{data.temp}°</span>
              <span className="text-[11px] opacity-85 capitalize truncate">{data.description}</span>
            </div>
          </div>
        </div>

        {/* Détails */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] opacity-90 whitespace-nowrap">
          <span>
            {L.feels} {data.feels_like}°
          </span>
          <span>↓ {data.temp_min}° ↑ {data.temp_max}°</span>
          <span>💧 {data.humidity}%</span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block leading-none"
              style={{ transform: `rotate(${(data.wind_direction ?? 0) + 180}deg)` }}
              aria-hidden
            >
              ➤
            </span>
            {data.wind_speed} km/h
            {data.wind_direction != null && (
              <span className="opacity-75">{compassLabel(data.wind_direction, lang)}</span>
            )}
          </span>
        </div>

        {/* Prévisions compactes */}
        <div className="ms-auto flex items-center gap-2 shrink-0">
          {forecast.map((d, i) => {
            const em = iconToEmoji(d.icon);
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur px-3 py-1.5 whitespace-nowrap"
              >
                <span className="text-[11px] font-medium opacity-85">
                  {formatDayLabel(d.date, lang)}
                </span>
                <span className={`text-xl leading-none ${em.anim}`} aria-hidden>
                  {em.emoji}
                </span>
                <span className="text-xs font-semibold">
                  {d.temp_max}° <span className="opacity-60 font-normal">/ {d.temp_min}°</span>
                </span>
              </div>
            );
          })}
          <a
            href="https://oneworldmorocco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:block text-[10px] tracking-wide opacity-70 hover:opacity-100 transition-opacity"
          >
            oneworldmorocco.com
          </a>
        </div>
      </div>
    </div>
  );
}
