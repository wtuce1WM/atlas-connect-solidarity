/** Parse a video URL into embed info — shared across panels */

export interface VideoEmbedInfo {
  type: "youtube" | "vimeo" | "bunny" | "file";
  embedUrl: string;
  isVertical: boolean;
}

export function getVideoEmbed(url: string, origin: string, opts?: { background?: boolean; defaultSoundOn?: boolean; autoplay?: boolean; controls?: boolean }): VideoEmbedInfo {
  const bg = opts?.background ?? false;
  const defaultSoundOn = opts?.defaultSoundOn ?? true;
  const autoplay = opts?.autoplay ?? true;
  const showControls = opts?.controls ?? true;
  const ap = autoplay ? 1 : 0;

  // Parse start timestamp from URL: supports ?t=90, ?t=90s, ?t=1h2m3s, ?start=90, #t=90
  const parseStartSeconds = (u: string): number => {
    const m = u.match(/[?&#](?:t|start)=([^&#]+)/i);
    if (!m) return 0;
    const raw = m[1];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    const hms = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
    if (hms) {
      const h = parseInt(hms[1] || "0", 10);
      const m2 = parseInt(hms[2] || "0", 10);
      const s = parseInt(hms[3] || "0", 10);
      return h * 3600 + m2 * 60 + s;
    }
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  };
  const startSec = parseStartSeconds(url);

  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    const isShort = /\/shorts\//.test(url);
    const muteVal = bg ? (defaultSoundOn ? 0 : 1) : 1;
    const startParam = startSec > 0 ? `&start=${startSec}` : "";
    // In background mode, route through our local yt-player.html which uses the
    // YT IFrame API with controls:0 — guarantees no native YouTube chrome ever shows.
    // It also relays postMessage commands so external play/pause/mute controls keep working.
    if (bg) {
      const tParam = startSec > 0 ? `&t=${startSec}` : "";
      return {
        type: "youtube",
        embedUrl: `/yt-player.html?id=${ytMatch[1]}&autoplay=${ap}&mute=${muteVal}${tParam}`,
        isVertical: isShort,
      };
    }
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=${ap}&mute=${muteVal}&loop=0&rel=0&controls=${showControls ? 1 : 0}&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&disablekb=0&fs=0&showinfo=0&autohide=1&enablejsapi=1&origin=${encodeURIComponent(origin)}${startParam}`,
      isVertical: isShort,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const startParam = startSec > 0 ? `#t=${startSec}s` : "";
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${ap}&muted=1&loop=0${startParam}`,
      isVertical: false,
    };
  }
  const bunnyMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunnyMatch) {
    return {
      type: "bunny",
      embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyMatch[1]}/${bunnyMatch[2]}?autoplay=${autoplay ? "true" : "false"}&preload=true&loop=false&responsive=true`,
      isVertical: false,
    };
  }
  return { type: "file", embedUrl: url, isVertical: false };
}
