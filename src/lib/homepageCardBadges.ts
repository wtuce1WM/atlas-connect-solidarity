import { supabase } from "@/integrations/supabase/client";

export interface HomepageCardBadgeRow {
  city: string;
  item_type: "entry" | "extra";
  item_id: string;
  badge_id: string;
  sort_order: number;
}

export const cardKey = (type: "entry" | "extra", id: string) => `${type}:${id}`;

/** Loads badge assignments for a city, keyed by `entry:<id>` / `extra:<id>`. */
export async function fetchHomepageCardBadges(city: string): Promise<Record<string, string[]>> {
  const { data } = await (supabase as any)
    .from("front_structure_homepage_card_badges")
    .select("city, item_type, item_id, badge_id, sort_order")
    .eq("city", city)
    .order("sort_order", { ascending: true });
  const map: Record<string, string[]> = {};
  ((data as HomepageCardBadgeRow[]) || []).forEach((r) => {
    (map[cardKey(r.item_type, r.item_id)] ||= []).push(r.badge_id);
  });
  return map;
}

export function deriveThumbnail(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const intersect = (a: string[], b: Set<string>) => a.filter((id) => b.has(id));

/**
 * Resolves the video of a homepage card from its badges.
 * AND semantics: the video must carry EVERY selected badge.
 * Restricted to the city when `cityDocIds` / `cityGenericIds` are provided.
 */
export async function resolveVideoByBadges(
  badgeIds: string[],
  cityDocIds: Set<string> | null,
  cityGenericIds: Set<string> | null,
): Promise<any | null> {
  if (badgeIds.length === 0) return null;

  // ---- internal videos (business_documents) ----
  let docIds: string[] | null = null;
  for (const badgeId of badgeIds) {
    const { data } = await supabase
      .from("business_document_badges")
      .select("document_id")
      .eq("badge_id", badgeId);
    const ids = ((data as any[]) || []).map((r) => r.document_id as string);
    if (docIds === null) docIds = ids;
    else docIds = intersect(docIds, new Set(ids));
    if (docIds.length === 0) break;
  }
  let candidates = docIds || [];
  if (cityDocIds) candidates = candidates.filter((id) => cityDocIds.has(id));
  if (candidates.length > 0) {
    let best: any = null;
    for (let i = 0; i < candidates.length; i += 300) {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, thumbnail_url, business_id, poi_id, linked_business_id, sort_order")
        .eq("type", "video")
        .in("id", candidates.slice(i, i + 300))
        .order("sort_order", { ascending: true })
        .limit(1);
      const row = (data && data[0]) || null;
      if (row && (!best || (row.sort_order ?? 0) < (best.sort_order ?? 0))) best = row;
    }
    if (best) return best;
  }

  // ---- generic videos ----
  let genIds: string[] | null = null;
  for (const badgeId of badgeIds) {
    const { data } = await (supabase as any)
      .from("generic_video_badges")
      .select("video_id, generic_video_id")
      .eq("badge_id", badgeId);
    const ids = ((data as any[]) || []).map((r) => (r.generic_video_id || r.video_id) as string).filter(Boolean);
    if (genIds === null) genIds = ids;
    else genIds = intersect(genIds, new Set(ids));
    if (genIds.length === 0) break;
  }
  let genCandidates = genIds || [];
  if (cityGenericIds) genCandidates = genCandidates.filter((id) => cityGenericIds.has(id));
  if (genCandidates.length === 0) return null;
  const { data: gvs } = await (supabase as any)
    .from("generic_videos")
    .select("id, url, thumbnail_url")
    .in("id", genCandidates.slice(0, 300))
    .limit(1);
  const gv = (gvs && gvs[0]) || null;
  if (!gv) return null;
  return {
    id: gv.id,
    url: gv.url,
    thumbnail_url: gv.thumbnail_url,
    business_id: null,
    poi_id: null,
    linked_business_id: null,
    sort_order: 0,
    __generic: true,
  };
}
