import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// In-memory cache shared across all component instances
let cachedDomains: Set<string> | null = null;
let fetchPromise: Promise<Set<string>> | null = null;

async function fetchBlockedDomains(): Promise<Set<string>> {
  const { data } = await (supabase as any).rpc("get_blocked_domains_list");
  return new Set(((data as string[]) || []).filter(Boolean));
}

function getBlockedDomains(): Promise<Set<string>> {
  if (cachedDomains) return Promise.resolve(cachedDomains);
  if (!fetchPromise) {
    fetchPromise = fetchBlockedDomains().then((set) => {
      cachedDomains = set;
      fetchPromise = null;
      return set;
    });
  }
  return fetchPromise;
}

/** Invalidate cache after a scan update */
export function invalidateBlockedDomainsCache() {
  cachedDomains = null;
  fetchPromise = null;
}

/** Check synchronously if a domain is blocked (returns false if cache not loaded yet) */
export function isDomainBlockedSync(url: string): boolean {
  if (!cachedDomains) return false;
  try {
    const hostname = new URL(url).hostname;
    return Array.from(cachedDomains).some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

/** Hook that returns the blocked domains set (async-loaded, cached) */
export function useBlockedDomains() {
  const [domains, setDomains] = useState<Set<string>>(cachedDomains || new Set());
  const [loaded, setLoaded] = useState(!!cachedDomains);

  useEffect(() => {
    getBlockedDomains().then((set) => {
      setDomains(set);
      setLoaded(true);
    });
  }, []);

  return { domains, loaded };
}

/** Check if a URL's domain is in the blocked set */
export function isDomainInSet(url: string, domains: Set<string>): boolean {
  try {
    const hostname = new URL(url).hostname;
    return Array.from(domains).some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}
