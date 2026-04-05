import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all rows from a Supabase table using range-based pagination.
 * PostgREST limits responses to 1000 rows regardless of the `limit` param,
 * so we paginate with `.range()` to get everything.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  select: string = "*",
  orderColumn: string = "sort_order",
  batchSize: number = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await (supabase
      .from(table as any)
      .select(select)
      .order(orderColumn)
      .order("id")
      .range(offset, offset + batchSize - 1) as any);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
