/**
 * Helpers to identify external video sources (YouTube, Vimeo, Bunny, etc.)
 * Used to exclude external videos from staff "Vidéos" listings, which only
 * manage internally hosted/uploaded videos.
 */

const EXTERNAL_PATTERNS = [
  /youtube\.com/i,
  /youtu\.be/i,
  /youtube-nocookie\.com/i,
  /vimeo\.com/i,
  /player\.vimeo\.com/i,
  /iframe\.mediadelivery\.net/i, // Bunny
  /dailymotion\.com/i,
  /tiktok\.com/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /fb\.watch/i,
];

export function isExternalVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return EXTERNAL_PATTERNS.some((re) => re.test(url));
}

export function isInternalVideoUrl(url: string | null | undefined): boolean {
  return !!url && !isExternalVideoUrl(url);
}
