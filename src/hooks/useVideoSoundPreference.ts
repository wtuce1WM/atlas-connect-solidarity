import { useCallback, useEffect, useState } from "react";

/**
 * Persists the user's "sound on/off" preference for video playback across
 * the whole app and across sessions (localStorage). All hook instances stay
 * in sync via a custom window event so toggling on one panel updates others.
 *
 * Default is `false` (muted) because browsers block autoplay-with-sound until
 * the user has interacted with the document at least once. Once the user
 * unmutes a video, that choice is remembered and applied to all subsequent
 * videos automatically.
 */
const STORAGE_KEY = "videoSoundPreference"; // "on" | "off"
const EVENT_NAME = "video-sound-preference-change";

const readPref = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
};

const writePref = (soundOn: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, soundOn ? "on" : "off");
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: soundOn }));
  } catch {
    /* ignore */
  }
};

export function useVideoSoundPreference(): {
  soundOn: boolean;
  setSoundOn: (next: boolean) => void;
} {
  const [soundOn, setSoundOnState] = useState<boolean>(() => readPref());

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      setSoundOnState(!!next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSoundOnState(e.newValue === "on");
    };
    window.addEventListener(EVENT_NAME, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setSoundOn = useCallback((next: boolean) => {
    setSoundOnState(next);
    writePref(next);
  }, []);

  return { soundOn, setSoundOn };
}
