import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedBusiness {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  slug: string;
  viewedAt: number;
  isYoutubeChannel?: boolean;
}

const STORAGE_KEY = "recently_viewed_businesses";
const MAX_ENTRIES = 10;
const SYNC_EVENT = "recently-viewed-sync";
const TRACK_EVENT = "track-business-view";

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

function trackViewInternal(detail: { id: string; name: string; images?: string[] | null; logo_url?: string | null; city?: string | null; slug: string; isYoutubeChannel?: boolean }) {
  const current = getStored();
  const image = detail.images?.[0] || detail.logo_url || null;
  const entry: RecentlyViewedBusiness = {
    id: detail.id,
    name: detail.name,
    image,
    city: detail.city || null,
    slug: detail.slug,
    viewedAt: Date.now(),
    isYoutubeChannel: detail.isYoutubeChannel || false,
  };
  const updated = [entry, ...current.filter((e) => e.id !== detail.id)].slice(0, MAX_ENTRIES);
  setStored(updated);
  window.dispatchEvent(new Event(SYNC_EVENT));
}

// Global listener — tracks views from any component dispatching "track-business-view"
if (typeof window !== "undefined") {
  let listenerAttached = false;
  if (!listenerAttached) {
    window.addEventListener(TRACK_EVENT, ((e: CustomEvent) => {
      trackViewInternal(e.detail);
      // GA4 event — visibilité produit sur les fiches ouvertes
      try {
        import("@/lib/analytics").then(({ trackEvent, trackAhaMoment, trackVirtualPageView }) => {
          trackEvent("view_business", {
            business_id: e.detail?.id,
            business_name: e.detail?.name,
            city: e.detail?.city ?? undefined,
            is_youtube_channel: !!e.detail?.isYoutubeChannel,
          });
          // page_view virtuel : le slide-panel réécrit l'URL via replaceState,
          // GA4 ne verrait sinon jamais l'ouverture de fiche.
          if (e.detail?.slug) {
            trackVirtualPageView(
              `/fiche/${e.detail.slug}`,
              e.detail?.name ? `${e.detail.name} | One World Morocco` : undefined,
              { business_id: e.detail?.id, city: e.detail?.city ?? undefined },
            );
          }
          trackAhaMoment("first_view_business", { business_id: e.detail?.id });
        });

        // Internal business_events log (dashboard partenaire)
        import("@/lib/businessAnalytics").then(({ trackBusinessEvent }) => {
          if (e.detail?.id) trackBusinessEvent(e.detail.id, "view");
        });
      } catch {
        /* noop */
      }


    }) as EventListener);
    listenerAttached = true;
  }
}


export const useRecentlyViewedBusinesses = () => {
  const [businesses, setBusinesses] = useState<RecentlyViewedBusiness[]>(getStored);

  useEffect(() => {
    const handler = () => setBusinesses(getStored());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  return { recentBusinesses: businesses };
};
