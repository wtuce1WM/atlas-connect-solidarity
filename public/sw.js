// ONE WORLD MOROCCO — Service Worker
// Responsibilities:
//  1. Provide a fetch handler so Chromium accepts the install prompt.
//  2. Stale-while-revalidate caching for the homepage_cards_snapshots query.
//  3. Cache-first for Supabase Storage images (business-images bucket) + YouTube
//     thumbnails (i.ytimg.com / img.youtube.com). 2nd+ visits are instant.
//     Cache is capped via simple LRU eviction (~150 entries each).

const SNAPSHOT_CACHE = "oneworld-snapshot-v2";
const IMG_CACHE = "oneworld-images-v2";
const YT_CACHE = "oneworld-yt-thumbs-v2";
const SNAPSHOT_PATH = "/rest/v1/homepage_cards_snapshots";

const IMG_CACHE_MAX = 200;
const YT_CACHE_MAX = 200;

// Cities to prewarm at install time.
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
    // NOTE: do NOT skipWaiting here. We want the new SW to stay in "waiting"
    // so the homepage can prompt the user to install the update.
    // The page sends { type: "SKIP_WAITING" } when the user accepts.
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const validCaches = new Set([SNAPSHOT_CACHE, IMG_CACHE, YT_CACHE]);
    await Promise.all(
      keys
        .filter((k) => (k.startsWith("oneworld-") && !validCaches.has(k)))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Simple LRU eviction: keep cache below `max` entries, dropping the oldest first.
async function trimCache(cacheName, max) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= max) return;
    const overflow = keys.length - max;
    for (let i = 0; i < overflow; i++) {
      await cache.delete(keys[i]);
    }
  } catch {}
}

// Cache-first strategy: serve from cache if present, otherwise fetch + cache.
async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      cache.put(req, res.clone()).then(() => trimCache(cacheName, max)).catch(() => {});
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // 1. Homepage card snapshots — stale-while-revalidate
  if (url.pathname.includes(SNAPSHOT_PATH)) {
    event.respondWith((async () => {
      const cache = await caches.open(SNAPSHOT_CACHE);
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const cached = await cache.match(cacheKey);
      const networkPromise = fetch(req).then((res) => {
        if (res && res.ok) {
          cache.put(cacheKey, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => null);
      return cached || (await networkPromise) || new Response("[]", {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    })());
    return;
  }

  // 2. Supabase Storage images (business-images, sponsor-assets, etc.) — cache-first
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/")) {
    event.respondWith(cacheFirst(req, IMG_CACHE, IMG_CACHE_MAX));
    return;
  }

  // 3. YouTube thumbnails — cache-first
  if (url.hostname === "i.ytimg.com" || url.hostname === "img.youtube.com") {
    event.respondWith(cacheFirst(req, YT_CACHE, YT_CACHE_MAX));
    return;
  }
});
