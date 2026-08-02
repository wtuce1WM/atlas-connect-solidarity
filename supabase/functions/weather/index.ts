// Public JSON weather endpoint (GET /functions/v1/weather?city=Marrakech)
// Ouvert à tous les domaines : conçu pour être appelé en fetch() depuis un site tiers.
import { resolveCityCoords } from "../_shared/resolve-city-coords.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!apiKey) throw new Error("Weather API key not configured");

    const url = new URL(req.url);
    let city = url.searchParams.get("city") || "";
    const lang = (url.searchParams.get("lang") || "fr").slice(0, 2);

    if (!city && req.method === "POST") {
      try {
        const body = await req.json();
        city = typeof body?.city === "string" ? body.city : "";
      } catch { /* ignore */ }
    }

    city = city.trim().slice(0, 80);
    if (!city) {
      return new Response(JSON.stringify({ error: "Query param 'city' is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},MA&appid=${apiKey}&units=metric&lang=${lang}`;
    let response = await fetch(weatherUrl);
    let data = await response.json();

    if (!response.ok) {
      const resolved = await resolveCityCoords(city);
      if (resolved) {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${resolved.lat}&lon=${resolved.lon}&appid=${apiKey}&units=metric&lang=${lang}`;
        response = await fetch(weatherUrl);
        data = await response.json();
        if (response.ok) data.name = resolved.name;
      }
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.message || "Weather data not available" }), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    const lat = data.coord?.lat;
    const lon = data.coord?.lon;
    let hourly: any[] = [];
    let daily: any[] = [];

    if (lat != null && lon != null) {
      try {
        const fRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${lang}`,
        );
        if (fRes.ok) {
          const fData = await fRes.json();
          const list: any[] = fData.list || [];
          hourly = list.slice(0, 8).map((it) => ({
            time: it.dt_txt,
            hour: new Date(it.dt * 1000).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Casablanca",
            }),
            temp: Math.round(it.main.temp),
            feels_like: Math.round(it.main.feels_like),
            description: it.weather?.[0]?.description || "",
            icon: it.weather?.[0]?.icon || "",
            wind_speed: Math.round((it.wind?.speed || 0) * 3.6),
            pop: Math.round((it.pop || 0) * 100),
          }));

          const byDay = new Map<string, any[]>();
          for (const it of list) {
            const d = new Date(it.dt * 1000).toLocaleDateString("fr-CA", { timeZone: "Africa/Casablanca" });
            if (!byDay.has(d)) byDay.set(d, []);
            byDay.get(d)!.push(it);
          }
          daily = Array.from(byDay.entries()).slice(0, 5).map(([date, items]) => {
            const temps = items.map((i) => i.main.temp);
            const noon = items.find((i) => i.dt_txt.includes("12:00:00")) || items[Math.floor(items.length / 2)];
            return {
              date,
              temp_min: Math.round(Math.min(...temps)),
              temp_max: Math.round(Math.max(...temps)),
              description: noon.weather?.[0]?.description || "",
              icon: noon.weather?.[0]?.icon || "",
              pop_max: Math.round(Math.max(...items.map((i) => (i.pop || 0) * 100))),
            };
          });
        }
      } catch (e) {
        console.error("Forecast fetch failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        city_name: data.name,
        temp: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        temp_min: Math.round(data.main.temp_min),
        temp_max: Math.round(data.main.temp_max),
        humidity: data.main.humidity,
        description: data.weather?.[0]?.description || "",
        icon: data.weather?.[0]?.icon || "",
        icon_url: data.weather?.[0]?.icon
          ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
          : null,
        wind_speed: Math.round((data.wind?.speed || 0) * 3.6),
        hourly,
        daily,
        source: "One World Morocco",
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("weather endpoint error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch weather data" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
