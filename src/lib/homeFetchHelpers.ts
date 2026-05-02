// Supabase fetch helpers extracted from src/pages/Home.tsx.
// Mutualize chunked `.in()` calls and badge lookups that were duplicated 10+ times.
// Behavior MUST stay identical to the inlined versions: same chunk size (300),
// same column lists, same null-safety, same error-swallowing patterns.

import { supabase } from "@/integrations/supabase/client";

const CHUNK = 300;

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
