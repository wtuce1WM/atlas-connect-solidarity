import { useState, useEffect, useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BrokenFilesMap {
  [businessId: string]: {
    brokenImages: number;
    brokenLogo: boolean;
    brokenPdf: boolean;
    brokenLabel: boolean;
    totalBroken: number;
  };
}

/**
 * Hook to check for broken file URLs across multiple businesses
 * Optimized to batch check URLs and cache results
 */
export const useBusinessBrokenFiles = (businesses: Business[]) => {
  const [brokenFilesMap, setBrokenFilesMap] = useState<BrokenFilesMap>({});
  const [isChecking, setIsChecking] = useState(false);

  // Extract all URLs to check
  const urlsToCheck = useMemo(() => {
    const urlMap: { [url: string]: { businessId: string; type: "image" | "logo" | "pdf" | "label" } } = {};
    
    businesses.forEach((business) => {
      // Images
      if (business.images && business.images.length > 0) {
        business.images.forEach((url) => {
          if (url) urlMap[url] = { businessId: business.id, type: "image" };
        });
      }
      // Logo
      if (business.logo_url) {
        urlMap[business.logo_url] = { businessId: business.id, type: "logo" };
      }
      // PDF
      if (business.pdf_url) {
        urlMap[business.pdf_url] = { businessId: business.id, type: "pdf" };
      }
      // Label
      if (business.label1_url) {
        urlMap[business.label1_url] = { businessId: business.id, type: "label" };
      }
    });

    return urlMap;
  }, [businesses]);

  useEffect(() => {
    const urls = Object.keys(urlsToCheck);
    if (urls.length === 0) {
      setBrokenFilesMap({});
      return;
    }

    setIsChecking(true);
    let mounted = true;

    const checkUrls = async () => {
      const results: { [url: string]: boolean } = {};

      // Check URLs in batches to avoid overwhelming the network
      const batchSize = 10;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const response = await fetch(url, { method: "HEAD" });
              results[url] = !response.ok;
            } catch {
              // Network error - try loading as image for images
              const info = urlsToCheck[url];
              if (info.type === "image" || info.type === "logo" || info.type === "label") {
                await new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    results[url] = false;
                    resolve();
                  };
                  img.onerror = () => {
                    results[url] = true;
                    resolve();
                  };
                  img.src = url;
                });
              } else {
                results[url] = true;
              }
            }
          })
        );
      }

      if (!mounted) return;

      // Build the broken files map per business
      const newMap: BrokenFilesMap = {};

      businesses.forEach((business) => {
        let brokenImages = 0;
        let brokenLogo = false;
        let brokenPdf = false;
        let brokenLabel = false;

        if (business.images) {
          business.images.forEach((url) => {
            if (url && results[url]) brokenImages++;
          });
        }
        if (business.logo_url && results[business.logo_url]) brokenLogo = true;
        if (business.pdf_url && results[business.pdf_url]) brokenPdf = true;
        if (business.label1_url && results[business.label1_url]) brokenLabel = true;

        const totalBroken = brokenImages + (brokenLogo ? 1 : 0) + (brokenPdf ? 1 : 0) + (brokenLabel ? 1 : 0);

        if (totalBroken > 0) {
          newMap[business.id] = {
            brokenImages,
            brokenLogo,
            brokenPdf,
            brokenLabel,
            totalBroken,
          };
        }
      });

      setBrokenFilesMap(newMap);
      setIsChecking(false);
    };

    checkUrls();

    return () => {
      mounted = false;
    };
  }, [urlsToCheck, businesses]);

  return { brokenFilesMap, isChecking };
};
