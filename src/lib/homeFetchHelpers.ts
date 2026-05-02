// Supabase fetch helpers extracted from src/pages/Home.tsx.
// Mutualize chunked `.in()` calls and badge lookups that were duplicated 10+ times.
// Behavior MUST stay identical to the inlined versions: same chunk size (300),
// same column lists, same null-safety, same error-swallowing patterns.

import { supabase } from "@/integrations/supabase/client";

const CHUNK = 300;

/**
 * Canonical column list used everywhere we hydrate a business for a video card.
 * Kept identical (order + spelling) to the previous inlined `.select(...)` strings.
 */
export const BASE_BIZ_COLS =
  "id, name, images, logo_url, logo_bg, affiliate_id, instagram_url, tiktok_url, youtube_url, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status, hook_fr";

/**
 * Fetch businesses by id (chunked at 300) and return a Map<id, row>.
 * `extraCols` is appended to BASE_BIZ_COLS to cover the few call sites that
 * also need `is_poi`, `front_video_count`, `priority_score`, `google_rating`, etc.
 */
export async function fetchBusinessesByIds(
  ids: readonly string[],
  extraCols = "",
): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (!ids || ids.length === 0) return map;
  const cols = extraCols ? `${BASE_BIZ_COLS}, ${extraCols}` : BASE_BIZ_COLS;
  await chunked(ids, async (chunk) => {
    const { data } = await supabase.from("businesses").select(cols).in("id", chunk);
    ((data as any[]) || []).forEach((b: any) => map.set(b.id, b));
    return [];
  });
  return map;
}

/**
 * Generic chunked fetcher: runs `runChunk` over `ids` in batches of CHUNK
 * and concatenates results. Mirrors the `for (i; i+=300) .in(col, slice)` pattern.
 */
export async function chunked<TIn, TOut>(
  ids: readonly TIn[],
  runChunk: (chunk: TIn[]) => Promise<TOut[] | null | undefined>,
): Promise<TOut[]> {
  const out: TOut[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const data = await runChunk(ids.slice(i, i + CHUNK));
    if (data) out.push(...data);
  }
  return out;
}

/**
 * Fetch business_document_badges for the given document ids, returning a
 * `{ documentId: badgeIds[] }` map. Identical to the 5+ inlined versions.
 */
export async function fetchDocBadgesByDocId(
  docIds: readonly string[],
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  if (docIds.length === 0) return out;
  const filtered = docIds.filter(Boolean);
  await chunked(filtered, async (chunk) => {
    const { data } = await supabase
      .from("business_document_badges")
      .select("document_id, badge_id")
      .in("document_id", chunk);
    ((data as any[]) || []).forEach((r: any) => {
      (out[r.document_id] ||= []).push(r.badge_id);
    });
    return [];
  });
  return out;
}

/**
 * Fetch business_youtube_video_badges for the given youtube_video ids,
 * returning a `{ youtubeVideoId: badgeIds[] }` map.
 */
export async function fetchYtBadgesByVideoId(
  videoIds: readonly string[],
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  if (videoIds.length === 0) return out;
  const filtered = videoIds.filter(Boolean);
  await chunked(filtered, async (chunk) => {
    const { data } = await supabase
      .from("business_youtube_video_badges")
      .select("youtube_video_id, badge_id")
      .in("youtube_video_id", chunk);
    ((data as any[]) || []).forEach((r: any) => {
      (out[r.youtube_video_id] ||= []).push(r.badge_id);
    });
    return [];
  });
  return out;
}
