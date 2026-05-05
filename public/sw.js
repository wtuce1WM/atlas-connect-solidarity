// ONE WORLD MOROCCO — Service Worker
// Two responsibilities:
//  1. Provide a fetch handler so Chromium accepts the install prompt.
//  2. Stale-while-revalidate caching for the homepage_cards_snapshots query.
//     → 2nd+ visits get vignettes from cache in ~0ms while a fresh copy is
//       fetched in the background and stored for the next visit.

const SNAPSHOT_CACHE = "oneworld-snapshot-v1";
const SNAPSHOT_PATH = "/rest/v1/homepage_cards_snapshots";

// Cities to prewarm at install time. Keep in sync with the cities that have
// a homepage snapshot. Navigation between these cities = instant (no network).
const PREWARM_CITIES = ["Marrakech", "Essaouira"];
const SUPABASE_BASE = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SNAPSHOT_CACHE);
      await Promise.all(PREWARM_CITIES.map(async (city) => {
        const url = `${SUPABASE_BASE}${SNAPSHOT_PATH}?select=payload&city=eq.${encodeURIComponent(city)}`;
        try {
          const res = await fetch(url, {
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Accept: "application/json" },
          });
          if (res && res.ok) {
            await cache.put(new Request(url, { method: "GET" }), res.clone());
          }
        } catch {}
      }));
    } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any older snapshot caches.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("oneworld-snapshot-") && k !== SNAPSHOT_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Match Supabase REST snapshot reads only.
  if (!url.pathname.includes(SNAPSHOT_PATH)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(SNAPSHOT_CACHE);
      // Cache key = url + city query (ignore Authorization header so cache is sharable).
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const cached = await cache.match(cacheKey);

      const networkPromise = fetch(req).then((res) => {
        if (res && res.ok) {
          // Clone before caching since the body is a one-shot stream.
          cache.put(cacheKey, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => null);

      // Return cached immediately if present, otherwise wait for the network.
      return cached || (await networkPromise) || new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })()
  );
});
