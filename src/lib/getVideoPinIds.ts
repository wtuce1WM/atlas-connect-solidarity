import { supabase } from "@/integrations/supabase/client";
import { getCityAliases } from "@/lib/homeHelpers";

/**
 * Source of truth: résout la liste ordonnée des `business_id` correspondant
 * aux vidéos (business_documents + business_youtube_videos) portant un badge
 * donné dans une ville donnée.
 *
 * Règles :
 *  - Filtre badge sur `business_document_badges` + `business_youtube_video_badges`.
 *  - Filtre ville (si fournie) sur les tables multi-cities (source de vérité),
 *    en incluant les alias homepage (ex: Marrakech ⇢ [Marrakech, Agafay]).
 *  - Ne garde que les vidéos dont `business_is_active = true`.
 *  - Ordre : par `front_sort_order` (puis `sort_order`), dedupliqué sur business_id.
 */
export async function getBusinessIdsFromBadgeAndCity(
  badgeId: string,
  cityName: string | null | undefined
): Promise<string[]> {
  // 1) Résoudre les city_id (ville + alias homepage) depuis le nom
  let cityIds: string[] = [];
  if (cityName) {
    const aliasNames = getCityAliases(cityName);
    const { data: cityRows } = await supabase
      .from("cities")
      .select("id")
      .in("name_fr", aliasNames);
    cityIds = ((cityRows as any[]) || []).map((r) => r.id);
  }

  // 2) IDs vidéos portant le badge
  const [docBadgeRes, ytBadgeRes] = await Promise.all([
    supabase.from("business_document_badges").select("document_id").eq("badge_id", badgeId),
    supabase.from("business_youtube_video_badges").select("youtube_video_id").eq("badge_id", badgeId),
  ]);
  let docIds = (docBadgeRes.data || []).map((r: any) => r.document_id);
  let ytIds = (ytBadgeRes.data || []).map((r: any) => r.youtube_video_id);

  // 3) Filtrage ville (source de vérité = tables multi-cities, alias inclus)
  if (cityIds.length > 0) {
    const [docCityRes, ytCityRes] = await Promise.all([
      docIds.length
        ? supabase.from("business_document_cities").select("document_id").in("city_id", cityIds).in("document_id", docIds)
        : Promise.resolve({ data: [] as any[] }),
      ytIds.length
        ? supabase.from("business_youtube_video_cities").select("youtube_video_id").in("city_id", cityIds).in("youtube_video_id", ytIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    docIds = (docCityRes.data || []).map((r: any) => r.document_id);
    ytIds = (ytCityRes.data || []).map((r: any) => r.youtube_video_id);
  }

  if (docIds.length === 0 && ytIds.length === 0) return [];

  // 4) Charger vidéos (business actif) avec ordre
  const [docsRes, ytsRes] = await Promise.all([
    docIds.length
      ? supabase
          .from("business_documents")
          .select("business_id, front_sort_order, sort_order")
          .in("id", docIds)
          .eq("business_is_active", true)
      : Promise.resolve({ data: [] as any[] }),
    ytIds.length
      ? supabase
          .from("business_youtube_videos")
          .select("business_id, sort_order")
          .in("id", ytIds)
          .eq("business_is_active", true)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  type Row = { business_id: string | null; front_sort_order?: number | null; sort_order: number | null };
  const all: Row[] = [
    ...((docsRes.data as Row[]) || []),
    ...((ytsRes.data as Row[]) || []),
  ].filter((r) => !!r.business_id);

  all.sort((a, b) => {
    const fa = a.front_sort_order ?? Number.MAX_SAFE_INTEGER;
    const fb = b.front_sort_order ?? Number.MAX_SAFE_INTEGER;
    if (fa !== fb) return fa - fb;
    const sa = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sb = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of all) {
    const id = r.business_id!;
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
}
