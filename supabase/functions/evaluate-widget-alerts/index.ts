// Daily evaluation of widget alerts (Marées & Vents) for coastal cities.
// Reads subscribers from `widget_alert_subscribers`, evaluates tomorrow's
// conditions from Open-Meteo (marine + wind), and sends one grouped email per
// subscriber via `send-transactional-email`. Deduplicated by
// (email, city, alert_type, target_date) in `widget_alert_sends`.
//
// POST /functions/v1/evaluate-widget-alerts        -> real run
// POST { dry_run: true }                           -> evaluate only, no email
// POST { city: "essaouira", force: true }          -> ignore dedupe, single city
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { sendAndLog } from '../_shared/email-send-log.ts';

type AlertType = "spring_tide" | "surf" | "kitesurf" | "wingfoil" | "fishing";

const COLUMN: Record<AlertType, string> = {
  spring_tide: "alert_spring_tide",
  surf: "alert_surf",
  kitesurf: "alert_kitesurf",
  wingfoil: "alert_wingfoil",
  fishing: "alert_fishing",
};

const TITLES: Record<AlertType, string> = {
  spring_tide: "Grande marée",
  surf: "Conditions idéales pour le surf",
  kitesurf: "Conditions idéales pour le kitesurf",
  wingfoil: "Conditions idéales pour le wingfoil",
  fishing: "Marée parfaite pour la pêche",
};

// Mean spring tidal range per city (m) — mirrors the `tides` function table.
const SPRING_RANGE: Record<string, number> = {
  essaouira: 3.0, agadir: 3.1, taghazout: 3.1, casablanca: 3.4, mohammedia: 3.4,
  rabat: 3.2, "el-jadida": 3.4, oualidia: 3.3, safi: 3.2, larache: 2.8,
  asilah: 2.6, tanger: 2.4, "sidi-ifni": 2.9, tarfaya: 2.7, dakhla: 2.0,
  laayoune: 2.4, martil: 0.6, "al-hoceima": 0.5, saidia: 0.5,
};

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const dirLabel = (deg: number) => DIRS[Math.round(((deg % 360) / 22.5)) % 16];
const fmt = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

type Hour = {
  t: number;
  hour: number;
  level: number | null;
  wave: number | null;
  period: number | null;
  wind: number | null;
  gust: number | null;
  dir: number | null;
};

async function fetchCityHours(slug: string, lat: number, lon: number) {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=sea_level_height_msl,wave_height,wave_period` +
    `&timezone=Africa%2FCasablanca&forecast_days=3`;
  const windUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&timezone=Africa%2FCasablanca&forecast_days=3`;

  const [mr, wr] = await Promise.all([fetch(marineUrl), fetch(windUrl).catch(() => null)]);
  if (!mr.ok) throw new Error(`marine ${mr.status}`);
  const marine = await mr.json();
  const wind = wr && wr.ok ? await wr.json() : null;

  const times: string[] = marine?.hourly?.time || [];
  const windTimes: string[] = wind?.hourly?.time || [];
  const windIndex = new Map<string, number>();
  windTimes.forEach((t, i) => windIndex.set(t, i));

  const hours: Hour[] = times.map((t, i) => {
    const wi = windIndex.get(t);
    return {
      t: new Date(`${t}:00`).getTime(),
      hour: Number(t.slice(11, 13)),
      level: marine.hourly.sea_level_height_msl?.[i] ?? null,
      wave: marine.hourly.wave_height?.[i] ?? null,
      period: marine.hourly.wave_period?.[i] ?? null,
      wind: wi != null ? wind.hourly.wind_speed_10m?.[wi] ?? null : null,
      gust: wi != null ? wind.hourly.wind_gusts_10m?.[wi] ?? null : null,
      dir: wi != null ? wind.hourly.wind_direction_10m?.[wi] ?? null : null,
    };
  });

  // Tomorrow, in Africa/Casablanca (UTC+1 all year).
  const nowCasa = new Date(Date.now() + 3600_000);
  const tomorrowKey = new Date(nowCasa.getTime() + 86_400_000).toISOString().slice(0, 10);
  const dayHours = times
    .map((t, i) => ({ t, i }))
    .filter((x) => x.t.slice(0, 10) === tomorrowKey)
    .map((x) => hours[x.i]);

  return { dayHours, tomorrowKey, springRange: SPRING_RANGE[slug] ?? 3.0 };
}

function evaluate(dayHours: Hour[], springRange: number) {
  const found: { type: AlertType; detail: string }[] = [];
  if (!dayHours.length) return found;

  const levels = dayHours.map((h) => h.level).filter((v): v is number => v != null);
  const day = dayHours.filter((h) => h.hour >= 8 && h.hour <= 19);
  const window = day.length ? day : dayHours;

  // --- Grande marée: estimated coefficient from tomorrow's full range.
  if (levels.length > 3) {
    const range = Math.max(...levels) - Math.min(...levels);
    const coef = Math.max(20, Math.min(120, Math.round((range / springRange) * 95)));
    if (coef >= 95) {
      found.push({
        type: "spring_tide",
        detail: `Coefficient estimé ${coef} — marnage ${fmt(range, 2)} m. Basses mers très dégagées, prudence à la remontée.`,
      });
    }
    // --- Pêche: fort marnage + vent modéré.
    const winds = window.map((h) => h.wind).filter((v): v is number => v != null);
    const maxWind = winds.length ? Math.max(...winds) : null;
    if (coef >= 85 && maxWind != null && maxWind <= 25) {
      found.push({
        type: "fishing",
        detail: `Marnage ${fmt(range, 2)} m (coef. ${coef}) et vent faible (max ${Math.round(maxWind)} km/h) : fenêtre favorable autour de la basse mer.`,
      });
    }
  }

  const best = (pred: (h: Hour) => boolean) => {
    const ok = window.filter(pred);
    if (ok.length < 2) return null;
    const from = Math.min(...ok.map((h) => h.hour));
    const to = Math.max(...ok.map((h) => h.hour));
    const avgWind = ok.reduce((s, h) => s + (h.wind || 0), 0) / ok.length;
    const maxGust = Math.max(...ok.map((h) => h.gust || 0));
    const dir = ok[Math.floor(ok.length / 2)].dir;
    const avgWave = ok.reduce((s, h) => s + (h.wave || 0), 0) / ok.length;
    const avgPeriod = ok.reduce((s, h) => s + (h.period || 0), 0) / ok.length;
    return { from, to, avgWind, maxGust, dir, avgWave, avgPeriod, count: ok.length };
  };

  // --- Surf: houle formée, période longue, vent contenu.
  const surf = best((h) => (h.wave ?? 0) >= 1.2 && (h.wave ?? 0) <= 3.2 && (h.period ?? 0) >= 9 && (h.wind ?? 99) <= 20);
  if (surf) {
    found.push({
      type: "surf",
      detail: `Houle ${fmt(surf.avgWave)} m / période ${Math.round(surf.avgPeriod)} s, vent ${Math.round(surf.avgWind)} km/h, de ${surf.from}h à ${surf.to}h.`,
    });
  }

  // --- Kitesurf: vent soutenu.
  const kite = best((h) => (h.wind ?? 0) >= 18 && (h.wind ?? 0) <= 42);
  if (kite) {
    found.push({
      type: "kitesurf",
      detail: `Vent ${Math.round(kite.avgWind)} km/h (rafales ${Math.round(kite.maxGust)}) de secteur ${kite.dir != null ? dirLabel(kite.dir) : "—"}, de ${kite.from}h à ${kite.to}h.`,
    });
  }

  // --- Wingfoil: plage plus large et plus basse.
  const wing = best((h) => (h.wind ?? 0) >= 15 && (h.wind ?? 0) <= 36);
  if (wing) {
    found.push({
      type: "wingfoil",
      detail: `Vent ${Math.round(wing.avgWind)} km/h (rafales ${Math.round(wing.maxGust)}) de secteur ${wing.dir != null ? dirLabel(wing.dir) : "—"}, de ${wing.from}h à ${wing.to}h. Houle ${fmt(wing.avgWave)} m.`,
    });
  }

  return found;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cron sends minimal bodies */ }
  const dryRun = body.dry_run === true;
  const force = body.force === true;
  const onlyCity = typeof body.city === "string" ? body.city : null;

  try {
    let q = admin
      .from("widget_alert_subscribers")
      .select("id, city_slug, city_name, email, nickname, lang, unsubscribe_token, alert_spring_tide, alert_surf, alert_kitesurf, alert_wingfoil, alert_fishing")
      .or("alert_spring_tide.eq.true,alert_surf.eq.true,alert_kitesurf.eq.true,alert_wingfoil.eq.true,alert_fishing.eq.true");
    if (onlyCity) q = q.eq("city_slug", onlyCity);
    const { data: subs, error } = await q;
    if (error) throw error;
    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, subscribers: 0, emails: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Coastal city coordinates (from the public tides endpoint).
    const listRes = await fetch(`${supabaseUrl}/functions/v1/tides?list=1`);
    const list = await listRes.json();
    const coords = new Map<string, { name: string; lat: number; lon: number }>();
    for (const c of list?.cities || []) coords.set(c.slug, { name: c.name, lat: c.lat, lon: c.lon });

    const citySlugs = [...new Set(subs.map((s) => s.city_slug))].filter((s) => coords.has(s));
    const perCity = new Map<string, { alerts: { type: AlertType; detail: string }[]; date: string }>();

    for (const slug of citySlugs) {
      const c = coords.get(slug)!;
      try {
        const { dayHours, tomorrowKey, springRange } = await fetchCityHours(slug, c.lat, c.lon);
        perCity.set(slug, { alerts: evaluate(dayHours, springRange), date: tomorrowKey });
      } catch (e) {
        console.error("alert eval failed", slug, e instanceof Error ? e.message : e);
      }
    }

    let emails = 0;
    const report: Record<string, unknown>[] = [];

    for (const sub of subs) {
      const city = perCity.get(sub.city_slug);
      if (!city || !city.alerts.length) continue;

      const wanted = city.alerts.filter((a) => (sub as Record<string, unknown>)[COLUMN[a.type]] === true);
      if (!wanted.length) continue;

      let toSend = wanted;
      if (!force) {
        const { data: already } = await admin
          .from("widget_alert_sends")
          .select("alert_type")
          .eq("city_slug", sub.city_slug)
          .eq("target_date", city.date)
          .ilike("email", sub.email);
        const done = new Set((already || []).map((r) => r.alert_type));
        toSend = wanted.filter((a) => !done.has(a.type));
      }
      if (!toSend.length) continue;

      report.push({ email: sub.email, city: sub.city_slug, date: city.date, alerts: toSend.map((a) => a.type) });
      if (dryRun) continue;

      try {
        await sendAndLog(
          () =>
            sendTemplateEmail("widget-alert", sub.email, {
              templateData: {
                cityName: sub.city_name || coords.get(sub.city_slug)?.name || sub.city_slug,
                nickname: sub.nickname || "",
                dateLabel: "demain",
                alerts: toSend.map((a) => ({ title: TITLES[a.type], detail: a.detail })),
                widgetUrl: "https://oneworldmorocco.com/widgets",
                unsubscribeUrl: `${supabaseUrl}/functions/v1/widget-alerts-unsubscribe?token=${sub.unsubscribe_token}`,
              },
              idempotencyKey: `widget-alert-${sub.city_slug}-${city.date}-${sub.id}-${toSend.map((a) => a.type).join("-")}`,
            }),
          "widget-alert",
          sub.email,
        );
      } catch (sendErr) {
        console.error("send failed", sub.email, sendErr instanceof Error ? sendErr.message : sendErr);
        continue;
      }
      emails++;
      await admin.from("widget_alert_sends").insert(
        toSend.map((a) => ({
          subscriber_id: sub.id,
          city_slug: sub.city_slug,
          email: sub.email,
          alert_type: a.type,
          target_date: city.date,
          details: { detail: a.detail },
        })),
      );
    }

    return new Response(
      JSON.stringify({ ok: true, subscribers: subs.length, cities: citySlugs.length, emails, dry_run: dryRun, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-widget-alerts error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
