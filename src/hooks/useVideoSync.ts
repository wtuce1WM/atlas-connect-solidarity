import { useEffect, useState, RefObject } from "react";

/**
 * Synchronize video play/pause/mute state with a <video> element.
 * Replaces duplicated event-listener logic across panels.
 */
export function useVideoSync(
  videoRef: RefObject<HTMLVideoElement>,
  /** Re-sync when this value changes (e.g. currentMedia) */
  dependency?: unknown
) {
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setVideoPaused(false);
    const onPause = () => setVideoPaused(true);
    const onVol = () => setVideoMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    setVideoPaused(v.paused);
    setVideoMuted(v.muted);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
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
