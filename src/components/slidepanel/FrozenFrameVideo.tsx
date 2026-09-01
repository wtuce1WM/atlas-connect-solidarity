import React, { useEffect, useRef, useState } from "react";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";
import { captureLastVideoFrame, getLastVideoFrame } from "@/lib/lastVideoFrame";


interface FrozenFrameVideoProps {
  /** Ref consommée par le moteur unique (usePanelVideoPlayback) : pointe toujours vers le buffer ACTIF. */
  videoRef: React.RefObject<HTMLVideoElement>;
  src: string;
  /** Clé logique de la vidéo (id ou url) — utilisée pour la détection de changement. */
  videoKey: string;
  className?: string;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * Double buffer A/B (technique TikTok/Reels) : deux éléments <video> persistants.
 * La vidéo suivante est chargée dans le buffer caché, puis on bascule l'opacité
 * dès qu'elle est prête → passage direct, sans écran noir ni remount.
 *
 * `videoRef.current` est réassigné vers le buffer actif : le moteur unique
 * (usePanelVideoPlayback) détecte le nouvel élément et reste la seule source de
 * vérité pour play/pause, mute et retries.
 */
const FrozenFrameVideo = React.memo(function FrozenFrameVideo({
  videoRef,
  src,
  videoKey,
  className = "w-full h-full bg-black object-cover",
  onLoadedMetadata,
  onTimeUpdate,
}: FrozenFrameVideoProps) {
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<0 | 1>(0);
  const activeRef = useRef<0 | 1>(0);
  const loadedKeyRef = useRef<string | null>(null);
  const { soundOn } = useVideoSoundPreference();
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  // Image gelée héritée du panneau précédent (transition sans écran noir au montage).
  const [poster, setPoster] = useState<string | null>(() => getLastVideoFrame());

  const getEl = (slot: 0 | 1) => (slot === 0 ? refA.current : refB.current);

  // Capture continue de l'image courante : sert de dernière image en cas de
  // démontage (chargement de la fiche suivante) — cf. src/lib/lastVideoFrame.ts
  useEffect(() => {
    const id = window.setInterval(() => {
      captureLastVideoFrame(getEl(activeRef.current));
    }, 700);
    return () => {
      captureLastVideoFrame(getEl(activeRef.current));
      window.clearInterval(id);
    };
  }, []);


  // Bascule / chargement initial
  useEffect(() => {
    if (!src) return;
    if (loadedKeyRef.current === videoKey) return;

    const first = loadedKeyRef.current === null;
    loadedKeyRef.current = videoKey;

    if (first) {
      const el = getEl(activeRef.current);
      if (el) {
        el.src = src;
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      }
      return;
    }

    const nextSlot: 0 | 1 = activeRef.current === 0 ? 1 : 0;
    const incoming = getEl(nextSlot);
    const outgoing = getEl(activeRef.current);
    if (!incoming) return;

    let done = false;
    const swap = () => {
      if (done) return;
      done = true;
      incoming.muted = !soundOnRef.current;
      if (!incoming.muted && incoming.volume === 0) incoming.volume = 1;
      incoming.play().catch(() => {});
      activeRef.current = nextSlot;
      setActive(nextSlot);
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = incoming;
      if (outgoing) {
        try {
          outgoing.pause();
          outgoing.muted = true;
        } catch {/* ignore */}
      }
    };

    try {
      incoming.muted = true; // préchargement silencieux du buffer caché
      incoming.src = src;
      incoming.currentTime = 0;
      incoming.load();
    } catch {/* ignore */}

    incoming.addEventListener("canplay", swap, { once: true });
    incoming.addEventListener("loadeddata", swap, { once: true });
    const fallback = window.setTimeout(swap, 1200);

    return () => {
      window.clearTimeout(fallback);
      incoming.removeEventListener("canplay", swap);
      incoming.removeEventListener("loadeddata", swap);
    };
  }, [src, videoKey, videoRef]);

  // Le buffer caché ne doit JAMAIS émettre de son (préchargement silencieux).
  useEffect(() => {
    const hidden = getEl(active === 0 ? 1 : 0);
    if (!hidden) return;
    try { hidden.muted = true; hidden.pause(); } catch {/* ignore */}
  }, [active]);

  // Sécurité : à la destruction, aucun buffer ne doit continuer à jouer,
  // et la source est libérée pour rendre la mémoire / couper le téléchargement.
  useEffect(() => {
    return () => {
      [refA.current, refB.current].forEach((el) => {
        if (!el) return;
        try {
          el.pause();
          el.muted = true;
          el.removeAttribute("src");
          el.load();
        } catch {/* ignore */}
      });
    };
  }, []);


  const buffer = (slot: 0 | 1, ref: React.RefObject<HTMLVideoElement>) => (
    <video
      ref={ref}
      className={`absolute inset-0 ${className} ${active === slot ? "opacity-100" : "opacity-0"}`}
      loop
      crossOrigin="anonymous"

      playsInline
      preload="auto"
      onLoadedMetadata={(e) => { if (activeRef.current === slot) onLoadedMetadata?.(e); }}
      onTimeUpdate={(e) => { if (activeRef.current === slot) onTimeUpdate?.(e); }}
      onPlaying={() => { if (activeRef.current === slot) setPoster(null); }}
      onCanPlay={() => { if (activeRef.current === slot) setPoster(null); }}
      onError={(e) => {
        // Filet : hébergeur sans en-têtes CORS → on rejoue sans crossOrigin
        // (on perd la capture d'image, jamais la lecture).
        const el = e.currentTarget;
        if (!el.crossOrigin) return;
        const url = el.src;
        el.removeAttribute("crossorigin");
        el.src = url;
        el.load();
        if (activeRef.current === slot) el.play().catch(() => {});
      }}
    />

  );

  return (
    <div className="relative w-full h-full bg-black">
      {buffer(0, refA)}
      {buffer(1, refB)}
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
    </div>
  );

});

export default FrozenFrameVideo;
