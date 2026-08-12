// Filtre quartier déterministe pour les relances contextuelles.
//
// Règle unique (décidée avec le product owner) :
//  - le quartier doit exister EN BASE, dans la VILLE du périmètre courant (scopeCity) ;
//    « Bab Doukkala » (Marrakech) ne doit jamais filtrer un corpus d'Essaouira, et
//    « Médina » existe dans 9 villes → toujours résolu ville par ville ;
//  - matching accent-insensible / casse-insensible, sur name, name_en, name_ar et les
//    alias de recherche (keywords, keywords_en, keywords_ar) ;
//  - si aucun quartier de la ville n'est nommé dans la question → aucun filtre (null),
//    le moteur se comporte comme avant ;
//  - comportement STRICT : si le quartier est nommé mais que le corpus (pool) ne contient
//    aucune adresse dedans, on ne montre RIEN et on propose l'élargissement à la ville.
import { normalize } from "./routes/shared.ts";

export type NeighborhoodMatch = {
  /** Nom canonique en base (langue FR). */
  name: string;
  /** Ville de rattachement (nom canonique en base). */
  city: string;
  /** Le libellé réellement trouvé dans la question. */
  matched: string;
  /** Tous les libellés acceptés (nom + alias), normalisés. */
  aliases: string[];
};

function boundaryHit(haystackNorm: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n || n.length < 4) return false;
  const idx = haystackNorm.indexOf(n);
  if (idx < 0) return false;
  const before = idx === 0 ? " " : haystackNorm[idx - 1];
  const afterIdx = idx + n.length;
  const after = afterIdx >= haystackNorm.length ? " " : haystackNorm[afterIdx];
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

/**
 * Cherche dans le message un quartier appartenant à `cityName`.
 * Retourne null si la ville est inconnue ou si aucun quartier n'est nommé.
 */
export async function resolveNeighborhoodInMessage(
  admin: any,
  message: string,
  cityName: string | null | undefined,
): Promise<NeighborhoodMatch | null> {
  const city = String(cityName || "").trim();
  if (!city || !message) return null;
  const msg = normalize(message);
  if (!msg) return null;

  try {
    // `cities` n'a pas de colonne `name` : les libellés sont name_fr / name_en / name_ar.
    const { data: cities, error: cityErr } = await admin
      .from("cities")
      .select("id, name_fr, name_en, name_ar")
      .limit(1000);
    if (cityErr) { console.error("[neighborhood-filter] cities_error", cityErr.message); return null; }
    const cityRow = (cities || []).find((c: any) =>
      [c?.name_fr, c?.name_en, c?.name_ar]
        .filter(Boolean)
        .some((n: any) => normalize(String(n)) === normalize(city)),
    );
    if (!cityRow) return null;

    const { data: rows } = await admin
      .from("neighborhoods")
      .select("name, name_en, name_ar, keywords, keywords_en, keywords_ar")
      .eq("city_id", cityRow.id)
      .limit(500);

    let best: NeighborhoodMatch | null = null;
    for (const r of rows || []) {
      const labels = [
        r?.name, r?.name_en, r?.name_ar,
        ...(Array.isArray(r?.keywords) ? r.keywords : []),
        ...(Array.isArray(r?.keywords_en) ? r.keywords_en : []),
        ...(Array.isArray(r?.keywords_ar) ? r.keywords_ar : []),
      ].filter(Boolean).map((x: any) => String(x));
      const hit = labels.find((l) => boundaryHit(msg, l));
      if (!hit) continue;
      const candidate: NeighborhoodMatch = {
        name: String(r.name || ""),
        city: String(cityRow.name_fr || cityRow.name_en || city),
        matched: hit,
        aliases: [...new Set(labels.map((l) => normalize(l)).filter(Boolean))],
      };
      // Le libellé le plus long gagne (« Medina » vs « Medina Sud »).
      if (!best || normalize(hit).length > normalize(best.matched).length) best = candidate;
    }
    return best;
  } catch (e) {
    console.error("[neighborhood-filter] resolve_error", String(e));
    return null;
  }
}

/** Filtre un corpus (pool de relance) sur le quartier résolu. */
export function filterPoolByNeighborhood<T extends { neighborhood?: string | null; city?: string | null; address?: string | null }>(
  pool: T[],
  nb: NeighborhoodMatch,
): T[] {
  const wanted = new Set(nb.aliases);
  const cityNorm = normalize(nb.city);
  return (pool || []).filter((b) => {
    if (b?.city && normalize(String(b.city)) !== cityNorm) return false;
    const own = normalize(String(b?.neighborhood || ""));
    if (own && wanted.has(own)) return true;
    // Repli : le quartier peut n'apparaître que dans l'adresse.
    const addr = normalize(String(b?.address || ""));
    return !!addr && [...wanted].some((a) => a.length >= 4 && boundaryHit(addr, a));
  });
}

/** Message d'élargissement (mode strict, corpus vide après filtre). */
export function neighborhoodEmptyMessage(nb: NeighborhoodMatch, lang: "fr" | "en" | "ar"): string {
  if (lang === "en") {
    return `No address from this selection is located in ${nb.name} (${nb.city}). Want me to widen the search to all of ${nb.city}?`;
  }
  if (lang === "ar") {
    return `لا يوجد أي عنوان من هذه القائمة في ${nb.name} (${nb.city}). هل أوسّع البحث إلى كل ${nb.city}؟`;
  }
  return `Aucune adresse de cette sélection ne se trouve à ${nb.name} (${nb.city}). Veux-tu que j'élargisse la recherche à tout ${nb.city} ?`;
}
