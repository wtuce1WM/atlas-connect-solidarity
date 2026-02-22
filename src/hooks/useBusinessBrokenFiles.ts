import { useState, useCallback, useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BrokenFilesMap {
  [businessId: string]: {
    brokenImages: number;
    brokenLogo: boolean;
    brokenPdf: boolean;
    brokenPdf2: boolean;
    brokenLabel: boolean;
    totalBroken: number;
  };
}

/**
 * Hook to check for broken file URLs across multiple businesses
 * Triggered manually via checkBrokenFiles()
 */
export const useBusinessBrokenFiles = (businesses: Business[]) => {
  const [brokenFilesMap, setBrokenFilesMap] = useState<BrokenFilesMap>({});
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Extract all URLs to check
  const urlsToCheck = useMemo(() => {
    const urlMap: { [url: string]: { businessId: string; type: "image" | "logo" | "pdf" | "label" } } = {};
    
    businesses.forEach((business) => {
      if (business.images && business.images.length > 0) {
        business.images.forEach((url) => {
          if (url) urlMap[url] = { businessId: business.id, type: "image" };
        });
      }
      if (business.logo_url) {
        urlMap[business.logo_url] = { businessId: business.id, type: "logo" };
      }
      if (business.pdf_url) {
        urlMap[business.pdf_url] = { businessId: business.id, type: "pdf" };
      }
      if ((business as any).pdf_2_url) {
        urlMap[(business as any).pdf_2_url] = { businessId: business.id, type: "pdf" };
      }
      if (business.label1_url) {
        urlMap[business.label1_url] = { businessId: business.id, type: "label" };
      }
    });

    return urlMap;
  }, [businesses]);

  const checkBrokenFiles = useCallback(async () => {
    const urls = Object.keys(urlsToCheck);
    if (urls.length === 0) {
      setBrokenFilesMap({});
      setHasChecked(true);
      return;
    }

    setIsChecking(true);

    const results: { [url: string]: boolean } = {};

    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const response = await fetch(url, { method: "HEAD" });
            results[url] = !response.ok;
          } catch {
            const info = urlsToCheck[url];
            if (info.type === "image" || info.type === "logo" || info.type === "label") {
              await new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => { results[url] = false; resolve(); };
                img.onerror = () => { results[url] = true; resolve(); };
                img.src = url;
              });
            } else {
              results[url] = true;
            }
          }
        })
      );
    }

    const newMap: BrokenFilesMap = {};

    businesses.forEach((business) => {
      let brokenImages = 0;
      let brokenLogo = false;
      let brokenPdf = false;
      let brokenPdf2 = false;
      let brokenLabel = false;

      if (business.images) {
        business.images.forEach((url) => {
          if (url && results[url]) brokenImages++;
        });
      }
      if (business.logo_url && results[business.logo_url]) brokenLogo = true;
      if (business.pdf_url && results[business.pdf_url]) brokenPdf = true;
      if ((business as any).pdf_2_url && results[(business as any).pdf_2_url]) brokenPdf2 = true;
      if (business.label1_url && results[business.label1_url]) brokenLabel = true;

      const totalBroken = brokenImages + (brokenLogo ? 1 : 0) + (brokenPdf ? 1 : 0) + (brokenPdf2 ? 1 : 0) + (brokenLabel ? 1 : 0);

      if (totalBroken > 0) {
        newMap[business.id] = { brokenImages, brokenLogo, brokenPdf, brokenPdf2, brokenLabel, totalBroken };
      }
    });

    setBrokenFilesMap(newMap);
    setIsChecking(false);
    setHasChecked(true);
  }, [urlsToCheck, businesses]);

  return { brokenFilesMap, isChecking, hasChecked, checkBrokenFiles };
};
