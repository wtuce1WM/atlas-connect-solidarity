// « Hors les murs » (nomad scope) — périmètre /embed/ask uniquement.
//
// Règle de qualification (décidée avec le product owner) :
//   UNE SEULE sous-catégorie de la fiche avec `subcategories.show_google_map = false`
//   suffit à qualifier l'établissement comme « hors les murs » (ex. Taxi / Chauffeur
//   privé, Excursions, Livraison, Conciergerie…). Savoir où il se trouve n'a aucun
//   intérêt : il travaille en déplacement.
//
// Conséquences dans /embed/ask :
//   - aucune coordonnée émise → absent de la Google Map et des tris par distance/podium ;
//   - aucun quartier affiché dans la carte résultat (on n'affiche RIEN à la place) ;
//   - exempté du filtre quartier (il reste dans le corpus, il n'est simplement pas
//     rattaché à une géographie).
//
// Le cache est volontairement « opt-in » : tant que `warmNomadScope()` n'a pas été
// appelé (embed-ai-chat-v2), les helpers sont inertes → aucun impact sur /search,
// /club ou les autres fonctions.

import { normalize } from "./routes/shared.ts";

let NOMAD_SUBCATS: Set<string> | null = null;

/** Charge (une fois par instance) les sous-catégories Maps désactivée. */
export async function warmNomadScope(admin: any): Promise<void> {
  if (NOMAD_SUBCATS) return;
  try {
    const { data } = await admin
      .from("subcategories")
      .select("name_fr, name_en, name_ar, show_google_map")
      .eq("show_google_map", false);
    const set = new Set<string>();
    for (const r of (Array.isArray(data) ? data : []) as any[]) {
      for (const n of [r?.name_fr, r?.name_en, r?.name_ar]) {
        const k = normalize(n);
        if (k) set.add(k);
      }
    }
    NOMAD_SUBCATS = set;
    console.log("[nomad-scope] loaded", JSON.stringify({ subcategories: set.size }));
  } catch (e) {
    console.error("[nomad-scope] load_error", String(e));
    NOMAD_SUBCATS = new Set<string>();
  }
}

/** `true` si au moins une sous-catégorie de la fiche a Maps désactivée. */
export function isNomadBusiness(b: any): boolean {
  if (!NOMAD_SUBCATS || !NOMAD_SUBCATS.size || !b) return false;
  const cats = Array.isArray(b?.categories) ? b.categories : [];
  for (const c of cats) {
    if (NOMAD_SUBCATS.has(normalize(c))) return true;
  }
  return false;
}

/** Retire géo + quartier d'une fiche « hors les murs » (copie, pas de mutation). */
export function scrubNomadRow<T extends Record<string, any>>(b: T): T {
  if (!isNomadBusiness(b)) return b;
  return { ...b, latitude: null, longitude: null, neighborhood: null, no_geo: true } as T;
}

export function scrubNomadRows<T extends Record<string, any>>(rows: T[]): T[] {
  if (!NOMAD_SUBCATS || !NOMAD_SUBCATS.size || !Array.isArray(rows)) return rows;
  return rows.map((r) => scrubNomadRow(r));
}
