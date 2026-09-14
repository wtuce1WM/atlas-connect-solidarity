/**
 * Garde-fou de pression du stockage local.
 *
 * Les caches applicatifs (`swr:v1:*`, `home:videos:*`) peuvent remplir le quota
 * localStorage (~5 Mo) et faire échouer l'écriture du jeton d'authentification
 * (`sb-*-auth-token`) → « Erreur de connexion : Setting the value of
 * 'sb-…-auth-token' exceeded the quota ».
 *
 * Règle : les caches sont jetables, le jeton d'auth ne l'est pas. On purge donc
 * les caches (les plus anciens d'abord) au démarrage si l'occupation dépasse le
 * seuil, et à la demande quand une écriture lève QuotaExceededError.
 */

const CACHE_PREFIXES = ["swr:v1:", "home:videos:"];
/** Au-delà, on purge : laisse ~1,5 Mo libres pour l'auth et le reste. */
const PRESSURE_BYTES = 3_500_000;
/** Cible après purge. */
const TARGET_BYTES = 2_000_000;

type Entry = { key: string; size: number; t: number };

function scan(): { total: number; caches: Entry[] } {
  let total = 0;
  const caches: Entry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const size = key.length + (localStorage.getItem(key)?.length ?? 0);
    total += size;
    if (CACHE_PREFIXES.some((p) => key.startsWith(p))) {
      let t = 0;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "{}") as { t?: number };
        t = typeof parsed?.t === "number" ? parsed.t : 0;
      } catch { /* entrée illisible → purgée en priorité */ }
      caches.push({ key, size, t });
    }
  }
  return { total, caches };
}

/**
 * Purge les caches applicatifs (plus anciens d'abord) jusqu'à revenir sous la
 * cible. Retourne le nombre d'octets libérés.
 */
export function pruneAppCaches(force = false): number {
  try {
    const { total, caches } = scan();
    if (!force && total < PRESSURE_BYTES) return 0;
    caches.sort((a, b) => a.t - b.t);
    let current = total;
    let freed = 0;
    for (const e of caches) {
      if (current <= TARGET_BYTES) break;
      localStorage.removeItem(e.key);
      current -= e.size;
      freed += e.size;
    }
    return freed;
  } catch {
    return 0;
  }
}

/** Écriture localStorage tolérante au quota : purge puis réessaie une fois. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    if (pruneAppCaches(true) <= 0) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}
