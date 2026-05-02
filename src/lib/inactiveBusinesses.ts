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
        "businesses",
        "id",
        "id",
      );
      // fetchAllRows doesn't filter; we need only inactive ones, so query directly.
      const { supabase } = await import("@/integrations/supabase/client");
      const inactive = new Set<string>();
      // Paginate is_active=false directly to keep payload small.
      let offset = 0;
      const PAGE = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("is_active", false)
          .range(offset, offset + PAGE - 1);
        if (error) break;
        const arr = (data as any[]) || [];
        for (const r of arr) inactive.add(r.id);
        if (arr.length < PAGE) break;
        offset += PAGE;
      }
      // rows fallback unused; keep linter happy
      void rows;
      return inactive;
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
