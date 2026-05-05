// ONE WORLD MOROCCO — Service Worker
// Two responsibilities:
//  1. Provide a fetch handler so Chromium accepts the install prompt.
//  2. Stale-while-revalidate caching for the homepage_cards_snapshots query.
//     → 2nd+ visits get vignettes from cache in ~0ms while a fresh copy is
//       fetched in the background and stored for the next visit.

const SNAPSHOT_CACHE = "oneworld-snapshot-v1";
const SNAPSHOT_PATH = "/rest/v1/homepage_cards_snapshots";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
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
