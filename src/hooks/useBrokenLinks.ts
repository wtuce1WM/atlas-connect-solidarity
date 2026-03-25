import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type BrokenLinkEntry = { url: string; business_id: string; field_name: string };

// In-memory cache shared across all component instances
let cachedBrokenUrls: Set<string> | null = null;
let fetchPromise: Promise<Set<string>> | null = null;

async function fetchBrokenUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await (supabase as any)
      .from("broken_links")
      .select("url")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    for (const r of data) urls.add(r.url);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return urls;
}

function getBrokenUrls(): Promise<Set<string>> {
  if (cachedBrokenUrls) return Promise.resolve(cachedBrokenUrls);
  if (!fetchPromise) {
    fetchPromise = fetchBrokenUrls().then((set) => {
      cachedBrokenUrls = set;
      fetchPromise = null;
      return set;
    });
  }
  return fetchPromise;
}

/** Invalidate cache (e.g. after a scan) */
export function invalidateBrokenLinksCache() {
  cachedBrokenUrls = null;
  fetchPromise = null;
}

/** Check synchronously if a URL is known broken (returns false if cache not loaded yet) */
export function isUrlBrokenSync(url: string): boolean {
  if (!cachedBrokenUrls) return false;
  return cachedBrokenUrls.has(url);
}

/** Hook that returns the broken URLs set (async-loaded, cached) */
export function useBrokenLinks() {
  const [urls, setUrls] = useState<Set<string>>(cachedBrokenUrls || new Set());
  const [loaded, setLoaded] = useState(!!cachedBrokenUrls);

  useEffect(() => {
    getBrokenUrls().then((set) => {
      setUrls(set);
      setLoaded(true);
    });
  }, []);

  return { brokenUrls: urls, loaded };
}
