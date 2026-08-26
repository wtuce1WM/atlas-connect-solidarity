import { supabase } from "@/integrations/supabase/client";

export type CityMap = Map<string, string[]>; // id -> ["Marrakech", "Essaouira", ...]

/**
 * Fetch multi-city associations for business_documents, generic_videos and/or
 * business_youtube_videos and return Maps of video id -> array of city names
 * (sorted alphabetically).
 *
 * Source of truth:
 *  - business_documents → business_document_cities (city_id)
 *  - generic_videos → generic_video_cities (city_id)
 *  - business_youtube_videos → business_youtube_video_cities (city_id)
 *
 * Pass null/undefined arrays to skip that source.
 */
export async function fetchVideoCities(opts: {
  businessDocumentIds?: string[] | null;
  genericVideoIds?: string[] | null;
  youtubeVideoIds?: string[] | null;
}): Promise<{ businessDocCities: CityMap; genericVideoCities: CityMap; youtubeVideoCities: CityMap }> {
  const businessDocCities: CityMap = new Map();
  const genericVideoCities: CityMap = new Map();
  const youtubeVideoCities: CityMap = new Map();

  // Load id -> name map once
  const { data: citiesData } = await supabase
    .from("cities")
    .select("id, name_fr");
  const cityNameMap = new Map<string, string>(
    (citiesData || []).map((c: any) => [c.id, c.name_fr])
  );

  const chunked = async <T,>(ids: string[], fn: (chunk: string[]) => Promise<T[]>): Promise<T[]> => {
    const out: T[] = [];
    const size = 500;
    for (let i = 0; i < ids.length; i += size) {
      out.push(...(await fn(ids.slice(i, i + size))));
    }
    return out;
  };

  const docIds = (opts.businessDocumentIds || []).filter(Boolean);
  if (docIds.length > 0) {
    const rows = await chunked(docIds, async (chunk) => {
      const { data } = await supabase
        .from("business_document_cities")
        .select("document_id, city_id")
        .in("document_id", chunk);
      return (data || []) as { document_id: string; city_id: string }[];
    });
    for (const r of rows) {
      const name = cityNameMap.get(r.city_id);
      if (!name) continue;
      const arr = businessDocCities.get(r.document_id) || [];
      if (!arr.includes(name)) arr.push(name);
      businessDocCities.set(r.document_id, arr);
    }
  }

  const genIds = (opts.genericVideoIds || []).filter(Boolean);
  if (genIds.length > 0) {
    const rows = await chunked(genIds, async (chunk) => {
      const { data } = await (supabase as any)
        .from("generic_video_cities")
        .select("generic_video_id, city_id")
        .in("generic_video_id", chunk);
      return (data || []) as { generic_video_id: string; city_id: string }[];
    });
    for (const r of rows) {
      const name = cityNameMap.get(r.city_id);
      if (!name) continue;
      const arr = genericVideoCities.get(r.generic_video_id) || [];
      if (!arr.includes(name)) arr.push(name);
      genericVideoCities.set(r.generic_video_id, arr);
    }
  }

  const ytIds = (opts.youtubeVideoIds || []).filter(Boolean);
  if (ytIds.length > 0) {
    const rows = await chunked(ytIds, async (chunk) => {
      const { data } = await (supabase as any)
        .from("business_youtube_video_cities")
        .select("youtube_video_id, city_id")
        .in("youtube_video_id", chunk);
      return (data || []) as { youtube_video_id: string; city_id: string }[];
    });
    for (const r of rows) {
      const name = cityNameMap.get(r.city_id);
      if (!name) continue;
      const arr = youtubeVideoCities.get(r.youtube_video_id) || [];
      if (!arr.includes(name)) arr.push(name);
      youtubeVideoCities.set(r.youtube_video_id, arr);
    }
  }

  // Sort each city list
  for (const arr of businessDocCities.values()) arr.sort((a, b) => a.localeCompare(b, "fr"));
  for (const arr of genericVideoCities.values()) arr.sort((a, b) => a.localeCompare(b, "fr"));
  for (const arr of youtubeVideoCities.values()) arr.sort((a, b) => a.localeCompare(b, "fr"));

  return { businessDocCities, genericVideoCities, youtubeVideoCities };
}

/**
 * Récupère une seule ville liée à une vidéo, quelle que soit sa source
 * (business_document, generic_video, youtube_video). Si plusieurs villes sont
 * liées, seule la première (triée alphabétiquement) est retournée.
 */
export async function fetchVideoCity(videoId: string): Promise<{ id: string; name: string } | null> {
  if (!videoId) return null;
  const [docRes, genRes, ytRes] = await Promise.all([
    supabase.from("business_document_cities").select("city_id").eq("document_id", videoId),
    (supabase as any).from("generic_video_cities").select("city_id").eq("generic_video_id", videoId),
    (supabase as any).from("business_youtube_video_cities").select("city_id").eq("youtube_video_id", videoId),
  ]);
  const ids = [
    ...(((docRes as any)?.data as any[]) || []),
    ...(((genRes as any)?.data as any[]) || []),
    ...(((ytRes as any)?.data as any[]) || []),
  ].map((r) => String(r.city_id)).filter(Boolean);
  if (!ids.length) return null;
  const { data } = await supabase.from("cities").select("id, name_fr").in("id", [...new Set(ids)]);
  const rows = ((data as any[]) || []).filter((c) => c?.name_fr);
  if (!rows.length) return null;
  rows.sort((a, b) => String(a.name_fr).localeCompare(String(b.name_fr), "fr"));
  return { id: String(rows[0].id), name: String(rows[0].name_fr) };
}
