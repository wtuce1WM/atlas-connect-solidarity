/**
 * Transform a Supabase Storage public URL into an optimized render URL.
 * Uses the Supabase image transformation endpoint to:
 *  - resize to the requested width (height auto, ratio preserved)
 *  - apply lossy compression (quality)
 *  - serve WebP automatically when the browser sends Accept: image/webp
 *  - return a 1-year Cache-Control header (vs no-cache on the raw object)
 *
 * Falls back to the original URL if it's not a Supabase Storage public URL
 * (e.g. img.youtube.com, i.ytimg.com, Vimeo CDN, etc.).
 *
 * Example:
 *  in : https://xxx.supabase.co/storage/v1/object/public/business-images/thumbs/foo.jpg
 *  out: https://xxx.supabase.co/storage/v1/render/image/public/business-images/thumbs/foo.jpg?width=400&quality=70
 */
export function optimizeSupabaseImage(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" } = {},
): string | null {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/public/")) return url;

  const { width, height, quality = 70, resize } = options;
  const optimized = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const params = new URLSearchParams();
  if (width) params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("quality", String(quality));
  // Only set resize when both dimensions are provided (otherwise Supabase crops to square)
  if (resize && width && height) params.set("resize", resize);
  return `${optimized}?${params.toString()}`;
}
