import { useState, useEffect } from "react";

/**
 * Hook to filter out broken image URLs (404, network errors)
 * Returns only the URLs that are accessible
 */
export const useValidatedImages = (imageUrls: string[] | null) => {
  const [validImages, setValidImages] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(true);
  const [brokenCount, setBrokenCount] = useState(0);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setValidImages([]);
      setIsValidating(false);
      setBrokenCount(0);
      return;
    }

    setIsValidating(true);
    let mounted = true;

    const validateImages = async () => {
      const results = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            // Use fetch with HEAD to check if the image exists
            const response = await fetch(url, { method: "HEAD" });
            return response.ok ? url : null;
          } catch {
            // Network error or CORS issue - try loading as image
            return new Promise<string | null>((resolve) => {
              const img = new Image();
              img.onload = () => resolve(url);
              img.onerror = () => resolve(null);
              img.src = url;
            });
          }
        })
      );

      if (mounted) {
        const valid = results.filter((url): url is string => url !== null);
        setValidImages(valid);
        setBrokenCount(imageUrls.length - valid.length);
        setIsValidating(false);
      }
    };

    validateImages();

    return () => {
      mounted = false;
    };
  }, [imageUrls]);

  return { validImages, isValidating, brokenCount };
};

/**
 * Hook to check if a single URL (PDF, image, etc.) is accessible
 */
export const useValidatedUrl = (url: string | null) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!url) {
      setIsValid(false);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    let mounted = true;

    const validate = async () => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (mounted) {
          setIsValid(response.ok);
          setIsValidating(false);
        }
      } catch {
        if (mounted) {
          setIsValid(false);
          setIsValidating(false);
        }
      }
    };

    validate();

    return () => {
      mounted = false;
    };
  }, [url]);

  return { isValid, isValidating };
};
