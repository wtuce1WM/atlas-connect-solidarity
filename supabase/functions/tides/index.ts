// Public JSON tides endpoint for Moroccan coastal cities.
// GET /functions/v1/tides?city=Essaouira&days=3&lang=fr
// GET /functions/v1/tides?list=1   -> available coastal cities
//
// Data source: Open-Meteo Marine API (free, no API key, no quota).
// Values are MODELLED sea level relative to mean sea level (MSL) — suitable for
// beach / surf / walk planning, NOT for navigation.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=1800",
};

type Coast = {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  sea: "atlantic" | "mediterranean";
  /** Mean spring tidal range (m) used to estimate the French-style coefficient. */
  springRange: number;
  aliases?: string[];
};

const COASTAL_CITIES: Coast[] = [
  { slug: "essaouira", name: "Essaouira", lat: 31.5085, lon: -9.7595, sea: "atlantic", springRange: 3.0, aliases: ["mogador", "essaouria", "souira"] },
  { slug: "agadir", name: "Agadir", lat: 30.4202, lon: -9.6119, sea: "atlantic", springRange: 3.1 },
  { slug: "taghazout", name: "Taghazout", lat: 30.5450, lon: -9.7100, sea: "atlantic", springRange: 3.1, aliases: ["taghazoute", "tamraght"] },
  { slug: "casablanca", name: "Casablanca", lat: 33.6000, lon: -7.6200, sea: "atlantic", springRange: 3.4, aliases: ["casa", "dar el beida", "ain diab"] },
  { slug: "mohammedia", name: "Mohammedia", lat: 33.7180, lon: -7.4100, sea: "atlantic", springRange: 3.4 },
  { slug: "rabat", name: "Rabat", lat: 34.0300, lon: -6.8500, sea: "atlantic", springRange: 3.2, aliases: ["sale", "salé"] },
  { slug: "el-jadida", name: "El Jadida", lat: 33.2500, lon: -8.5200, sea: "atlantic", springRange: 3.4, aliases: ["mazagan", "jadida"] },
  { slug: "oualidia", name: "Oualidia", lat: 32.7350, lon: -9.0400, sea: "atlantic", springRange: 3.3, aliases: ["walidia"] },
  { slug: "safi", name: "Safi", lat: 32.3050, lon: -9.2600, sea: "atlantic", springRange: 3.2, aliases: ["asfi", "sidi bouzid"] },
  { slug: "larache", name: "Larache", lat: 35.1900, lon: -6.1600, sea: "atlantic", springRange: 2.8 },
  { slug: "asilah", name: "Asilah", lat: 35.4650, lon: -6.0400, sea: "atlantic", springRange: 2.6, aliases: ["arzila"] },
  { slug: "tanger", name: "Tanger", lat: 35.7900, lon: -5.8200, sea: "atlantic", springRange: 2.4, aliases: ["tangier", "tangér", "tanja"] },
  { slug: "sidi-ifni", name: "Sidi Ifni", lat: 29.3800, lon: -10.1800, sea: "atlantic", springRange: 2.9, aliases: ["legzira", "mirleft"] },
  { slug: "tarfaya", name: "Tarfaya", lat: 27.9400, lon: -12.9300, sea: "atlantic", springRange: 2.7 },
  { slug: "dakhla", name: "Dakhla", lat: 23.6850, lon: -15.9500, sea: "atlantic", springRange: 2.0 },
  { slug: "laayoune", name: "Laâyoune-Plage", lat: 27.1500, lon: -13.2100, sea: "atlantic", springRange: 2.4, aliases: ["laayoune plage", "foum el oued"] },
  { slug: "martil", name: "Martil", lat: 35.6180, lon: -5.2740, sea: "mediterranean", springRange: 0.6, aliases: ["tetouan", "tétouan", "mdiq", "m'diq", "cabo negro"] },
  { slug: "al-hoceima", name: "Al Hoceïma", lat: 35.2500, lon: -3.9300, sea: "mediterranean", springRange: 0.5, aliases: ["hoceima", "alhucemas"] },
  { slug: "saidia", name: "Saïdia", lat: 35.0930, lon: -2.2300, sea: "mediterranean", springRange: 0.5, aliases: ["saidia", "nador"] },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCoast(input: string): Coast | null {
  const q = normalize(input);
  if (!q) return null;
  for (const c of COASTAL_CITIES) {
    if (normalize(c.slug) === q || normalize(c.name) === q) return c;
  }
  for (const c of COASTAL_CITIES) {
    const pool = [c.slug, c.name, ...(c.aliases || [])].map(normalize);
    if (pool.some((p) => p === q || p.includes(q) || q.includes(p))) return c;
  }
  return null;
}

type Extreme = { time: string; type: "high" | "low"; height: number };

/** Local extrema of the hourly sea-level curve, refined by parabolic interpolation. */
function findExtremes(stamps: number[], heights: (number | null)[]): Extreme[] {
  const out: Extreme[] = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const a = heights[i - 1];
    const b = heights[i];
    const c = heights[i + 1];
    if (a == null || b == null || c == null) continue;
    const isMax = b > a && b >= c;
    const isMin = b < a && b <= c;
    if (!isMax && !isMin) continue;

    // Parabola through (-1,a) (0,b) (1,c): vertex offset in hours.
    const denom = a - 2 * b + c;
    let offset = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    if (!Number.isFinite(offset) || Math.abs(offset) > 1) offset = 0;
    const peak = b - 0.25 * (a - c) * offset;

    const refined = new Date(stamps[i] + offset * 3600 * 1000);

    out.push({
      time: refined.toISOString(),
      type: isMax ? "high" : "low",
      height: Math.round(peak * 100) / 100,
    });
  }
  return out;
}

function interpolateAt(stamps: number[], heights: (number | null)[], target: number): number | null {
  for (let i = 0; i < stamps.length - 1; i++) {
    const t0 = stamps[i];
    const t1 = stamps[i + 1];
    if (target >= t0 && target <= t1) {
      const h0 = heights[i];
      const h1 = heights[i + 1];
      if (h0 == null || h1 == null) return h0 ?? h1 ?? null;
      const r = (target - t0) / (t1 - t0);
      return Math.round((h0 + (h1 - h0) * r) * 100) / 100;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    if (url.searchParams.get("list")) {
      return new Response(
        JSON.stringify({
          cities: COASTAL_CITIES.map(({ slug, name, sea, lat, lon }) => ({ slug, name, sea, lat, lon })),
        }),
        { headers: jsonHeaders },
      );
    }

    let cityInput = url.searchParams.get("city") || "";
    if (!cityInput && req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.city === "string") cityInput = body.city;
      } catch { /* ignore */ }
    }
    cityInput = cityInput.trim().slice(0, 80) || "Essaouira";

    const days = Math.min(5, Math.max(1, Number(url.searchParams.get("days") || 3) || 3));

    const coast = resolveCoast(cityInput);
    if (!coast) {
      return new Response(
        JSON.stringify({
          error: "Unknown coastal city",
          available: COASTAL_CITIES.map((c) => c.name),
        }),
        { status: 404, headers: jsonHeaders },
      );
    }

    const apiUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${coast.lat}&longitude=${coast.lon}` +
      `&hourly=sea_level_height_msl,wave_height,wave_period,sea_surface_temperature,wave_direction` +
      `&timezone=Africa%2FCasablanca&forecast_days=${days}&past_days=1`;

    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${coast.lat}&longitude=${coast.lon}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m` +
      `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&timezone=Africa%2FCasablanca&forecast_days=2`;

    const [res, windRes] = await Promise.all([
      fetch(apiUrl),
      fetch(windUrl).catch(() => null),
    ]);
    if (!res.ok) {
      const text = await res.text();
      console.error("Open-Meteo marine error:", res.status, text.slice(0, 300));
      return new Response(JSON.stringify({ error: "Tide data unavailable" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const raw = await res.json();

    // ---- Vent (API Forecast, gratuite sans clé) ----
    let wind: unknown = null;
    try {
      if (windRes && windRes.ok) {
        const wraw = await windRes.json();
        const cur = wraw?.current || {};
        const wh = wraw?.hourly || {};
        const wTimes: string[] = wh?.time || [];
        const wOffset = Number(wraw?.utc_offset_seconds || 0);
        const nowMs2 = Date.now();
        const hourly: { time: string; speed: number; direction: number; gusts: number | null }[] = [];
        for (let i = 0; i < wTimes.length; i++) {
          const t = Date.parse(wTimes[i] + ":00Z") - wOffset * 1000;
          if (t < nowMs2 - 3600 * 1000 || t > nowMs2 + 24 * 3600 * 1000) continue;
          const sp = wh.wind_speed_10m?.[i];
          const dir = wh.wind_direction_10m?.[i];
          if (sp == null || dir == null) continue;
          hourly.push({
            time: new Date(t).toISOString(),
            speed: Math.round(Number(sp) * 10) / 10,
            direction: Math.round(Number(dir)),
            gusts: wh.wind_gusts_10m?.[i] != null ? Math.round(Number(wh.wind_gusts_10m[i]) * 10) / 10 : null,
          });
        }
        wind = {
          speed: cur.wind_speed_10m != null ? Math.round(Number(cur.wind_speed_10m) * 10) / 10 : null,
          gusts: cur.wind_gusts_10m != null ? Math.round(Number(cur.wind_gusts_10m) * 10) / 10 : null,
          direction: cur.wind_direction_10m != null ? Math.round(Number(cur.wind_direction_10m)) : null,
          air_temperature: cur.temperature_2m != null ? Math.round(Number(cur.temperature_2m)) : null,
          unit: "km/h",
          hourly,
        };
      }
    } catch (e) {
      console.error("wind fetch error", e);
    }
    const h = raw?.hourly;
    const times: string[] = h?.time || [];
    const levels: (number | null)[] = h?.sea_level_height_msl || [];
    if (times.length < 4) {
      return new Response(JSON.stringify({ error: "Tide data unavailable" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const offsetSeconds = Number(raw?.utc_offset_seconds || 0);
    // Open-Meteo returns LOCAL naive timestamps; convert to real UTC epoch ms.
    const stamps = times.map((t) => Date.parse(t + ":00Z") - offsetSeconds * 1000);
    const allExtremes = findExtremes(stamps, levels);
    const nowMs = Date.now();

    // Present level + trend
    const currentLevel = interpolateAt(stamps, levels, nowMs);
    const level30 = interpolateAt(stamps, levels, nowMs + 30 * 60 * 1000);
    const trend: "rising" | "falling" | "slack" =
      currentLevel != null && level30 != null
        ? level30 - currentLevel > 0.03
          ? "rising"
          : currentLevel - level30 > 0.03
            ? "falling"
            : "slack"
        : "slack";

    const upcoming = allExtremes.filter((e) => new Date(e.time).getTime() > nowMs).slice(0, 8);
    const previous = allExtremes.filter((e) => new Date(e.time).getTime() <= nowMs).slice(-1)[0] || null;

    // Tidal range + estimated coefficient from the next high/low pair.
    const nextHigh = upcoming.find((e) => e.type === "high");
    const nextLow = upcoming.find((e) => e.type === "low");
    let range: number | null = null;
    if (nextHigh && nextLow) range = Math.round(Math.abs(nextHigh.height - nextLow.height) * 100) / 100;
    else if (previous && upcoming[0]) range = Math.round(Math.abs(upcoming[0].height - previous.height) * 100) / 100;

    const coefficient =
      range != null && coast.springRange > 0
        ? Math.max(20, Math.min(120, Math.round((range / coast.springRange) * 95)))
        : null;

    // Curve for the next 24h (host renders an SVG from this)
    const curve: { time: string; height: number }[] = [];
    for (let i = 0; i < stamps.length; i++) {
      const t = stamps[i];
      if (t < nowMs - 3 * 3600 * 1000 || t > nowMs + 24 * 3600 * 1000) continue;
      const v = levels[i];
      if (v == null) continue;
      curve.push({ time: new Date(t).toISOString(), height: v });
    }

    // Water conditions now
    const waveNow = interpolateAt(stamps, h?.wave_height || [], nowMs);
    const periodNow = interpolateAt(stamps, h?.wave_period || [], nowMs);
    const seaTempNow = interpolateAt(stamps, h?.sea_surface_temperature || [], nowMs);
    const waveDirNow = interpolateAt(stamps, h?.wave_direction || [], nowMs);

    return new Response(
      JSON.stringify({
        city_slug: coast.slug,
        city_name: coast.name,
        sea: coast.sea,
        lat: coast.lat,
        lon: coast.lon,
        timezone: raw.timezone,
        utc_offset_seconds: offsetSeconds,
        generated_at: new Date().toISOString(),
        now: {
          height: currentLevel,
          trend,
          wave_height: waveNow,
          wave_period: periodNow,
          sea_temperature: seaTempNow,
          wave_direction: waveDirNow != null ? Math.round(waveDirNow) : null,
        },
        wind,
        previous_extreme: previous,
        extremes: upcoming,
        curve,
        range,
        coefficient,
        spring_range_reference: coast.springRange,
        datum: "MSL",
        disclaimer:
          "Niveau de la mer modélisé (Open-Meteo Marine), référencé au niveau moyen. Usage loisir/plage — ne pas utiliser pour la navigation.",
        source: "One World Morocco",
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("tides endpoint error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch tide data" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
