import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";

/**
 * Moteur UNIQUE de lecture/son des vidéos natives des panneaux
 * (VideoSlidePanel + BookOnlineSlidePanel / MediaBackground).
 *
 * Règles dures — elles suppriment les sources de vérité concurrentes qui
 * provoquaient les pauses automatiques et les conflits du CTA Play/Mute :
 *  1. `video.muted` n'est JAMAIS piloté par un attribut React : uniquement ici,
 *     de façon impérative.
 *  2. La préférence son globale n'est écrite QUE par `toggleMute()` (le CTA).
 *     Aucun listener `volumechange` ne la met à jour (plus de boucle de
 *     rétroaction préférence → re-render → mute → préférence).
 *  3. Aucun listener global `pointerdown/touchstart` de démutage : le geste du
 *     CTA n'est plus intercepté par un second moteur.
 *  4. La pause explicite de l'utilisateur (`togglePlay`) est balisée et la
 *     logique de reprise autoplay ne la contredit jamais.
 */
export function usePanelVideoPlayback({
  videoRef,
  mediaKey,
  enabled = true,
  blocked = false,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  /** Change à chaque nouvelle vidéo (URL / id) : relance le moteur. */
  mediaKey: string | null | undefined;
  /** Faux quand le panneau est fermé ou que le média n'est pas une vidéo native. */
  enabled?: boolean;
  /** Vrai quand un overlay couvre la vidéo : pause + mute technique. */
  blocked?: boolean;
}) {
  const { soundOn, setSoundOn } = useVideoSoundPreference();
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  // ── État d'INTENTION (jamais l'état DOM transitoire du double buffer).
  // Les CTA affichent l'intention : autoplay sauf pause explicite, et son selon
  // la préférence globale. Les micro-états du buffer entrant (préchargement
  // muet, pause avant play()) ne doivent JAMAIS faire clignoter les icônes.
  const [userPaused, setUserPaused] = useState(false);
  const paused = blocked ? true : userPaused;
  const muted = !soundOn;
  // Incrémenté dès qu'un NOUVEL élément <video> est détecté (remount par `key`) :
  // garantit que le moteur de lecture se relance même si mediaKey n'a pas changé.
  const [elVersion, setElVersion] = useState(0);

  // ── Détection du buffer actif uniquement (aucun reflet d'état ici)
  useEffect(() => {
    let el: HTMLVideoElement | null = null;
    const attach = () => {
      const v = videoRef.current;
      if (v === el) return;
      el = v;
      if (!v) return;
      setElVersion((n) => n + 1);
    };
    attach();
    // Les panneaux remontent l'élément via `key` : on récupère la nouvelle ref.
    const id = window.setInterval(attach, 200);
    return () => window.clearInterval(id);
  }, [videoRef, mediaKey, enabled]);

  // Nouvelle vidéo : l'intention revient à « autoplay ».
  useEffect(() => { setUserPaused(false); }, [mediaKey]);


  // ── Lecture : un seul moteur, un seul endroit qui écrit `muted`
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !enabled) return;

    if (blocked) {
      v.muted = true;
      v.pause();
      return;
    }

    let disposed = false;
    delete v.dataset.owmUserPaused;
    v.muted = !soundOnRef.current;
    if (!v.muted && v.volume === 0) v.volume = 1;

    const attemptPlay = () => {
      if (disposed) return;
      const p = v.play();
      if (!p || typeof p.catch !== "function") return;
      p.catch((error: unknown) => {
        if (disposed) return;
        const name = (error as { name?: string })?.name;
        // Swipe rapide : la source est remplacée pendant que play() est pendant.
        // Ce n'est pas un refus d'autoplay, on retente sans toucher au son.
        if (name === "AbortError") {
          window.setTimeout(attemptPlay, 120);
          return;
        }
        if (name !== "NotAllowedError" && name !== "SecurityError") return;
        // Vrai blocage navigateur : démarrer muté puis rétablir le son demandé.
        v.muted = true;
        v.play().then(() => {
          if (disposed || !soundOnRef.current) return;
          v.muted = false;
          v.volume = 1;
        }).catch(() => {});
      });
    };
    attemptPlay();

    // iOS met parfois la vidéo en pause lors d'un changement de source rapide.
    const recover = () => {
      if (disposed) return;
      if (v.dataset.owmUserPaused === "1") return;
      if (!v.paused) return;
      attemptPlay();
    };
    v.addEventListener("canplay", recover);
    v.addEventListener("loadeddata", recover);
    const timers = [300, 900, 2000].map((ms) => window.setTimeout(recover, ms));

    return () => {
      disposed = true;
      v.removeEventListener("canplay", recover);
      v.removeEventListener("loadeddata", recover);
      timers.forEach((t) => window.clearTimeout(t));
      // Arrêter l'élément réellement démonté/remplacé : son audio ne doit pas
      // continuer après fermeture du panneau ou changement de fiche.
      v.pause();
    };
  }, [videoRef, mediaKey, enabled, blocked, elVersion]);

  // ── CTA : seuls points d'écriture volontaires
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      delete v.dataset.owmUserPaused;
      v.play().catch(() => {});
    } else {
      v.dataset.owmUserPaused = "1";
      v.pause();
    }
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    const nextMuted = v ? !v.muted : !muted;
    if (v) {
      if (!nextMuted && v.volume === 0) v.volume = 1;
      v.muted = nextMuted;
    }
    setMuted(nextMuted);
    setSoundOn(!nextMuted); // unique écriture de la préférence globale
  }, [videoRef, muted, setSoundOn]);

  /** Applique la préférence son courante (ex. reprise après overlay). */
  const applySoundPreference = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundOnRef.current;
    if (!v.muted && v.volume === 0) v.volume = 1;
  }, [videoRef]);

  return { paused, muted, soundOn, togglePlay, toggleMute, applySoundPreference };
}
