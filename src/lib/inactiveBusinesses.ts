import { fetchAllRows } from "@/lib/fetchAllRows";

/**
 * Cache and helpers to hide content (videos, documents, YouTube shorts) attached
 * to businesses that have been deactivated (`businesses.is_active = false`).
 *
 * Rule (validated with the user): when a business is disabled in back-office,
 * NONE of its videos / documents / YouTube shorts should appear on the front,
 * anywhere (homepage vignettes, category/sub-category grids, search, fiches…).
 *
 * Implementation: a single small in-memory Set of inactive business ids,
 * fetched once per session (refreshable). Filtering helpers exclude any record
 * whose `business_id` (owner of the doc/video) is in this set.
 *
 * Note: we filter on `business_id` (the document owner). `linked_business_id`
 * is only a display redirection — when the owner is inactive, the asset must
 * disappear regardless of the linked business state.
 */

let inactiveIdsPromise: Promise<Set<string>> | null = null;

export const loadInactiveBusinessIds = (): Promise<Set<string>> => {
  if (inactiveIdsPromise) return inactiveIdsPromise;
  inactiveIdsPromise = (async () => {
    try {
      const rows = await fetchAllRows<{ id: string }>(
        () => supabase.from("businesses").select("id").eq("is_active", false) as any,
      );
      return new Set<string>(rows.map((r) => r.id));
    } catch (e) {
      console.warn("[inactiveBusinesses] failed to load", e);
      return new Set<string>();
    }
  })();
  return inactiveIdsPromise;
};

/** Force a reload on next call (e.g. after staff toggles is_active). */
export const invalidateInactiveBusinessesCache = () => {
  inactiveIdsPromise = null;
};

/** Filter an array of `business_documents`-shaped rows by owner activeness. */
export const filterActiveBusinessDocs = <T extends { business_id?: string | null }>(
  rows: T[],
  inactiveIds: Set<string>,
): T[] => rows.filter((r) => !r.business_id || !inactiveIds.has(r.business_id));

/** Same for `business_youtube_videos` rows. */
export const filterActiveYoutubeVideos = <T extends { business_id?: string | null }>(
  rows: T[],
  inactiveIds: Set<string>,
): T[] => rows.filter((r) => !r.business_id || !inactiveIds.has(r.business_id));
