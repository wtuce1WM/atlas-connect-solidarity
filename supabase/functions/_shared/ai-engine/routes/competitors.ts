// Garde-fou « pas de concurrents directs de l'hôte » (surface embed).
// Règle métier historique de embed-ai-chat v1, réintroduite dans le moteur v2 :
// sur un widget embarqué chez un établissement, on ne présente jamais un
// établissement de la MÊME catégorie principale ni partageant une sous-catégorie
// avec l'hôte. Un hôtel/riad ne doit pas afficher d'autres hôtels/riads.

import { normalize } from "./shared.ts";

export interface CompetitorGuard {
  /** true si le candidat est un concurrent direct de l'hôte. */
  isCompetitor: (candidate: any) => boolean;
  /** Filtre une liste (l'hôte lui-même est aussi retiré). */
  filterOut: <T extends { id: string }>(list: T[]) => T[];
  /** Vrai si un garde-fou est réellement actif (hôte connu). */
  active: boolean;
  /** Nombre d'établissements écartés par le garde-fou dans ce tour. */
  filtered: number;
  /** Incrémente le compteur d'écartés (appelé par les routes curatées). */
  markFiltered: (n: number) => void;
}

export async function buildCompetitorGuard(admin: any, host: any): Promise<CompetitorGuard> {
  if (!host?.id) {
    return { isCompetitor: () => false, filterOut: (l) => l, active: false, filtered: 0, markFiltered: () => {} };
  }
  let filtered = 0;

  const hostMainCat = normalize(host.main_category);
  const hostCats = new Set<string>(
    [...(Array.isArray(host.categories) ? host.categories : []), host.main_category]
      .map(normalize)
      .filter(Boolean),
  );

  const { data: hostSubs } = await admin
    .from("business_subcategories")
    .select("subcategory_id")
    .eq("business_id", host.id);
  const hostSubIds = new Set<string>(
    (hostSubs ?? []).map((r: any) => r.subcategory_id).filter(Boolean),
  );

  // Sous-catégories des candidats : résolues à la demande, en un seul appel par lot.
  const subsCache = new Map<string, Set<string>>();
  const loadSubs = async (ids: string[]) => {
    const missing = ids.filter((id) => !subsCache.has(id));
    if (!missing.length) return;
    const { data } = await admin
      .from("business_subcategories")
      .select("business_id, subcategory_id")
      .in("business_id", missing.slice(0, 200));
    for (const id of missing) subsCache.set(id, new Set());
    for (const row of (data ?? []) as any[]) {
      subsCache.get(row.business_id)?.add(row.subcategory_id);
    }
  };

  const isCompetitor = (candidate: any): boolean => {
    if (!candidate) return false;
    if (candidate.id === host.id) return true;
    const cMain = normalize(candidate.main_category);
    if (cMain && hostMainCat && cMain === hostMainCat) return true;
    if (cMain && hostCats.has(cMain)) return true;
    const cCats = (Array.isArray(candidate.categories) ? candidate.categories : []).map(normalize);
    if (cCats.some((c: string) => c && hostCats.has(c))) return true;
    const subs = subsCache.get(String(candidate.id));
    if (subs && hostSubIds.size) {
      for (const s of subs) if (hostSubIds.has(s)) return true;
    }
    return false;
  };

  const filterOut = <T extends { id: string }>(list: T[]): T[] =>
    list.filter((b) => !isCompetitor(b));

  return {
    isCompetitor,
    filterOut,
    active: true,
    // Chargement paresseux exposé via une propriété non typée : utilisé par les appelants
    // qui veulent le filtre sous-catégories (sinon seule la catégorie est comparée).
    ...({ loadSubs } as any),
  } as CompetitorGuard;
}
