import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedBusiness {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  slug: string;
  viewedAt: number;
}

const STORAGE_KEY = "recently_viewed_businesses";
const MAX_ENTRIES = 10;
const SYNC_EVENT = "recently-viewed-sync";

function getStored(): RecentlyViewedBusiness[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStored(entries: RecentlyViewedBusiness[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* quota */ }
}

export const useRecentlyViewedBusinesses = () => {
  const [businesses, setBusinesses] = useState<RecentlyViewedBusiness[]>(getStored);

  // Sync across hook instances
  useEffect(() => {
    const handler = () => setBusinesses(getStored());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const trackView = useCallback((biz: {
    id: string;
    name: string;
    images?: string[] | null;
    logo_url?: string | null;
    city?: string | null;
    slug: string;
  }) => {
    const current = getStored();
    const image = biz.images?.[0] || biz.logo_url || null;
    const entry: RecentlyViewedBusiness = {
      id: biz.id,
      name: biz.name,
      image,
      city: biz.city || null,
      slug: biz.slug,
      viewedAt: Date.now(),
    };
    const updated = [entry, ...current.filter((e) => e.id !== biz.id)].slice(0, MAX_ENTRIES);
    setStored(updated);
    setBusinesses(updated);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  return { recentBusinesses: businesses, trackView };
};
