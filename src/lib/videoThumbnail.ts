import { supabase } from "@/integrations/supabase/client";

export const isYouTubeOrVimeoUrl = (url: string) => /youtube\.com|youtu\.be|vimeo\.com/i.test(url);

export const getYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

export const getVimeoId = (url: string): string | null => {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
};

export const fetchVimeoThumbnail = async (url: string): Promise<string | null> => {
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.thumbnail_url as string) || null;
  } catch {
    return null;
  }
};

/** Capture a JPEG thumbnail from a hosted (mp4/webm) video URL via canvas. */
export function captureHostedVideoThumbnail(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = videoUrl;

    const timeout = setTimeout(() => { video.remove(); resolve(null); }, 12000);

    const handleSeeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = video.videoWidth || 1280;
        c.height = video.videoHeight || 720;
        const ctx = c.getContext("2d");
        if (!ctx) { clearTimeout(timeout); video.remove(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, c.width, c.height);
        c.toBlob((blob) => { clearTimeout(timeout); video.remove(); resolve(blob); }, "image/jpeg", 0.8);
      } catch {
        clearTimeout(timeout); video.remove(); resolve(null);
      }
    };
    video.addEventListener("loadeddata", () => { video.currentTime = Math.min(3, (video.duration || 6) * 0.25); });
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", () => { clearTimeout(timeout); video.remove(); resolve(null); });
  });
}

/**
 * Resolve a thumbnail URL for a given video URL.
 * - YouTube → img.youtube.com
 * - Vimeo → oEmbed
 * - Hosted (mp4/webm) → capture a frame & upload to `business-images/thumbs/`
 * Returns null if it can't resolve one (e.g. CORS-blocked external host).
 */
export async function resolveVideoThumbnailUrl(url: string, ownerKey: string): Promise<string | null> {
  if (!url) return null;

  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

  if (getVimeoId(url)) {
    return await fetchVimeoThumbnail(url);
  }

  // Hosted video — capture client-side
  try {
    const blob = await captureHostedVideoThumbnail(url);
    if (!blob) return null;
    const path = `thumbs/${ownerKey}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const { error } = await supabase.storage
      .from("business-images")
      .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("business-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
