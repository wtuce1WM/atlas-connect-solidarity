/** Parse a video URL into embed info — shared across panels */

export interface VideoEmbedInfo {
  type: "youtube" | "vimeo" | "bunny" | "file";
  embedUrl: string;
  isVertical: boolean;
}

export function getVideoEmbed(url: string, origin: string, opts?: { background?: boolean; defaultSoundOn?: boolean }): VideoEmbedInfo {
  const bg = opts?.background ?? false;
  const defaultSoundOn = opts?.defaultSoundOn ?? true;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    const isShort = /\/shorts\//.test(url);
    const muteVal = bg ? (defaultSoundOn ? 0 : 1) : 1;
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=${muteVal}&loop=0&rel=0&controls=${bg ? 0 : 1}&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&disablekb=${bg ? 1 : 0}&fs=0&showinfo=0&autohide=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`,
      isVertical: isShort,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=0`,
      isVertical: false,
    };
  }
  const bunnyMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunnyMatch) {
    return {
      type: "bunny",
      embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyMatch[1]}/${bunnyMatch[2]}?autoplay=true&preload=true&loop=false&responsive=true`,
      isVertical: false,
    };
  }
  return { type: "file", embedUrl: url, isVertical: false };
}
