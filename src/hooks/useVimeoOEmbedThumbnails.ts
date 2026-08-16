import { useEffect, useState } from "react";
import { fetchVimeoThumbnail } from "@/lib/videoThumbnail";

/**
 * Resolve Vimeo oEmbed thumbnails for a list of video URLs.
 * Returns a map url -> thumbnail_url for Vimeo URLs that don't already
 * have a stored thumbnail. Non-Vimeo URLs are ignored.
 */
export function useVimeoOEmbedThumbnails(urls: string[]) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const vimeoUrls = urls.filter((u) => /vimeo\.com/i.test(u));
    if (vimeoUrls.length === 0) {
      setMap({});
      return;
    }

    (async () => {
      const entries = await Promise.all(
        vimeoUrls.map(async (url) => {
          try {
            const thumb = await fetchVimeoThumbnail(url);
            return thumb ? { url, thumb } : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const e of entries) {
        if (e) next[e.url] = e.thumb;
      }
      setMap(next);
    })();

    return () => { cancelled = true; };
  }, [urls.join(",")]);

  return map;
}
