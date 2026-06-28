/**
 * Lazy-load the YouTube IFrame API (`https://www.youtube.com/iframe_api`)
 * and return the `YT` global object once it is ready.
 */

type YTPlayer = {
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy?(): void;
};

type YTPlayerConstructor = new (
  element: HTMLElement | string,
  options: {
    events?: {
      onReady?: (event: { target: YTPlayer }) => void;
      onStateChange?: (event: { data: number }) => void;
    };
  },
) => YTPlayer;

type YTApi = {
  Player: YTPlayerConstructor;
};

let loadPromise: Promise<YTApi> | null = null;

export function loadYouTubeApi(): Promise<YTApi> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("loadYouTubeApi can only be called in a browser"));
      return;
    }

    const win = window as unknown as { YT?: YTApi; onYouTubeIframeAPIReady?: () => void };

    if (win.YT && win.YT.Player) {
      resolve(win.YT);
      return;
    }

    const prev = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(win.YT!);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

