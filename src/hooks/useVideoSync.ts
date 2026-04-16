import { useEffect, useState, RefObject } from "react";

/**
 * Synchronize video play/pause/mute state with a <video> element.
 * Handles key-based remounts where the ref changes to a new DOM element.
 */
export function useVideoSync(
  videoRef: RefObject<HTMLVideoElement>,
  /** Re-sync when this value changes (e.g. currentMedia) */
  dependency?: unknown
) {
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  useEffect(() => {
    let lastEl: HTMLVideoElement | null = null;
    let cleanup: (() => void) | null = null;

    const attach = () => {
      const v = videoRef.current;
      if (v === lastEl) return;
      cleanup?.();
      cleanup = null;
      lastEl = v;
      if (!v) return;
      const onPlay = () => setVideoPaused(false);
      const onPause = () => setVideoPaused(true);
      const onVol = () => setVideoMuted(v.muted);
      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("volumechange", onVol);
      setVideoPaused(v.paused);
      setVideoMuted(v.muted);
      cleanup = () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("volumechange", onVol);
      };
    };

    attach();
    // Poll briefly to catch React key-based remounts
    const id = setInterval(attach, 200);
    return () => {
      clearInterval(id);
      cleanup?.();
    };
  }, [dependency]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Pause + mute the video (for overlay opens) */
  const pauseAndMute = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      setVideoPaused(true);
      setVideoMuted(true);
    }
  };

  return { videoPaused, videoMuted, pauseAndMute };
}
