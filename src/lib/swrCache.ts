/**
 * Simple stale-while-revalidate cache backed by localStorage.
 *
 * Pattern:
 *   const data = await swrFetch("home:badges", () => supabase.from("badges").select(...), {
 *     onFresh: (data) => setBadges(data),
 *   });
 *
 * - Returns the cached value synchronously via `getCached()` when available.
 * - Always re-runs the fetcher in the background and calls `onFresh` if data changed.
 * - Cache is keyed by string and capped at ~1MB per entry to stay safe.
 */

const PREFIX = "swr:v1:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days hard cap

type CacheEntry<T> = { t: number; v: T };

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, value: T): void {
  try {
    const payload = JSON.stringify({ t: Date.now(), v: value } satisfies CacheEntry<T>);
    if (payload.length > 1_000_000) return; // skip oversized payloads
    localStorage.setItem(PREFIX + key, payload);
  } catch {
    // Quota exceeded or serialization issue — silently ignore.
  }
}

/**
 * Fire-and-forget background revalidation.
 * Calls `onFresh` only when the new value differs from the cached one (shallow JSON compare).
 */
export async function revalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  onFresh: (value: T) => void
): Promise<void> {
  try {
    const fresh = await fetcher();
    if (fresh === undefined || fresh === null) return;
    const prev = getCached<T>(key);
    const same = prev !== null && JSON.stringify(prev) === JSON.stringify(fresh);
    setCached(key, fresh);
    if (!same) onFresh(fresh);
  } catch {
    // Network / runtime errors are non-fatal — keep stale data on screen.
  }
}
