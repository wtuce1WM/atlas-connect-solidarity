import { supabase } from "@/integrations/supabase/client";

/**
 * Lecture unique et mutualisée d'une fiche business pour les viewers.
 *
 * Avant : les slidepanels lançaient jusqu'à 5 requêtes `businesses` pour le
 * MÊME établissement (identité, description/hook, notes, médias), parfois en
 * doublon exact. Ici une seule requête ramène l'union des colonnes utilisées,
 * et le résultat est mémorisé (avec déduplication des requêtes en vol).
 *
 * Aucun mécanisme parallèle : c'est la source unique de ces lectures.
 */

export const BUSINESS_VIEWER_FIELDS = [
  "id",
  "slug",
  "name",
  "address",
  "latitude",
  "longitude",
  "phone",
  "city",
  "logo_url",
  "neighborhood",
  "whatsapp",
  "logo_bg",
  "is_poi",
  "youtube_url",
  "description",
  "description_fr",
  "description_en",
  "description_ar",
  "hook_fr",
  "hook_en",
  "hook_ar",

  "images",
  "prioritize_images",
  "show_videos",
  "matterport_url",
  "google_rating",
  "google_review_count",
  "tripadvisor_rating",
  "tripadvisor_review_count",
  "restaurant_guru_rating",
  "restaurant_guru_review_count",
  "getyourguide_rating",
  "getyourguide_review_count",
  "viator_rating",
  "viator_review_count",
  "avis_verifies_rating",
  "avis_verifies_review_count",
  "trustpilot_rating",
  "trustpilot_review_count",
  "kayak_rating",
  "kayak_review_count",
  "tourradar_rating",
  "tourradar_review_count",
].join(", ");

const cache = new Map<string, Promise<any | null>>();
const resolvedCache = new Map<string, any | null>();

/** Fiche business (colonnes viewer), mise en cache et dédupliquée par ID. */
export function fetchBusinessViewerRow(id: string): Promise<any | null> {
  const key = String(id);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (supabase as any)
    .from("businesses")
    .select(BUSINESS_VIEWER_FIELDS)
    .eq("id", key)
    .maybeSingle()
    .then(({ data }: any) => {
      const row = data || null;
      resolvedCache.set(key, row);
      return row;
    })
    .catch(() => {
      cache.delete(key);
      return null;
    });
  cache.set(key, p);
  return p;
}

/** Lecture synchrone d'une fiche déjà résolue, sans déclencher de requête. */
export function peekBusinessViewerRow(id: string | null | undefined): any | null | undefined {
  if (!id) return undefined;
  return resolvedCache.get(String(id));
}

/** Vide le cache (utilisé après une édition back-office éventuelle). */
export function clearBusinessViewerCache(id?: string) {
  if (id) {
    const key = String(id);
    cache.delete(key);
    resolvedCache.delete(key);
  } else {
    cache.clear();
    resolvedCache.clear();
  }
}
