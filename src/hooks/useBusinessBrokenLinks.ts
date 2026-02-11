import { useState, useCallback, useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BrokenLinksResult {
  businessId: string;
  businessName: string;
  brokenUrls: { field: string; url: string }[];
}

const URL_FIELDS: { key: keyof Business; label: string }[] = [
  { key: "website", label: "Site web" },
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "youtube_url", label: "YouTube" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "twitter_url", label: "Twitter/X" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "pinterest_url", label: "Pinterest" },
  { key: "vimeo_url", label: "Vimeo" },
  { key: "tripadvisor_url", label: "TripAdvisor" },
  { key: "restaurant_guru_url", label: "Restaurant Guru" },
  { key: "google_maps_url", label: "Google Maps" },
  { key: "google_reviews_url", label: "Google Reviews" },
  { key: "tripadvisor_review_url", label: "TripAdvisor Reviews" },
  { key: "booking_url", label: "Booking" },
  { key: "airbnb_url", label: "Airbnb" },
  { key: "hotels_com_url", label: "Hotels.com" },
  { key: "trivago_url", label: "Trivago" },
  { key: "reserve_now_url", label: "Réservation" },
  { key: "online_shop_url", label: "Boutique en ligne" },
  { key: "menu_url", label: "Menu" },
  { key: "other_booking_url", label: "Autre réservation" },
  { key: "video_1_url", label: "Vidéo" },
];

export const useBusinessBrokenLinks = (businesses: Business[]) => {
  const [brokenLinks, setBrokenLinks] = useState<BrokenLinksResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });

  // Build a deduplicated map of all URLs to check
  const urlMap = useMemo(() => {
    const map: Map<string, { businessId: string; businessName: string; field: string }[]> = new Map();

    businesses.forEach((b) => {
      URL_FIELDS.forEach(({ key, label }) => {
        const url = b[key] as string | null;
        if (url && typeof url === "string" && url.startsWith("http")) {
          if (!map.has(url)) map.set(url, []);
          map.get(url)!.push({ businessId: b.id, businessName: b.name, field: label });
        }
      });
    });

    return map;
  }, [businesses]);

  const checkBrokenLinks = useCallback(async () => {
    const urls = Array.from(urlMap.keys());
    if (urls.length === 0) {
      setBrokenLinks([]);
      setHasChecked(true);
      return;
    }

    setIsChecking(true);
    setProgress({ checked: 0, total: urls.length });

    const brokenUrls = new Set<string>();
    const batchSize = 5;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(url, {
              method: "HEAD",
              mode: "no-cors",
              signal: controller.signal,
            });
            clearTimeout(timeout);
            // In no-cors mode, opaque responses (type === "opaque") are expected and mean the URL is reachable
            if (response.type !== "opaque" && !response.ok) {
              brokenUrls.add(url);
            }
          } catch {
            // Network error or timeout = broken
            brokenUrls.add(url);
          }
        })
      );
      setProgress({ checked: Math.min(i + batchSize, urls.length), total: urls.length });
    }

    // Build results grouped by business
    const resultMap: Map<string, BrokenLinksResult> = new Map();

    brokenUrls.forEach((url) => {
      const entries = urlMap.get(url);
      if (!entries) return;
      entries.forEach(({ businessId, businessName, field }) => {
        if (!resultMap.has(businessId)) {
          resultMap.set(businessId, { businessId, businessName, brokenUrls: [] });
        }
        resultMap.get(businessId)!.brokenUrls.push({ field, url });
      });
    });

    setBrokenLinks(Array.from(resultMap.values()));
    setIsChecking(false);
    setHasChecked(true);
  }, [urlMap]);

  return { brokenLinks, isChecking, hasChecked, progress, checkBrokenLinks };
};
