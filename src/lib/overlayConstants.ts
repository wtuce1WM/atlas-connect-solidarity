/** Shared constants for overlay panels (POI, Destination, SlidePanel) */
export const GOLD = { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" } as const;

/** Extract YouTube/Vimeo/file video info from a URL */
export function getVideoInfo(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return { type: "youtube" as const, id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: "vimeo" as const, id: vimeoMatch[1], thumbnail: `https://vumbnail.com/${vimeoMatch[1]}.jpg` };
  }
  return { type: "file" as const, id: null, thumbnail: null };
}

/** Play the woosh sound effect */
export function playWoosh(sfxUrl: string) {
  try { new Audio(sfxUrl).play(); } catch {}
}
