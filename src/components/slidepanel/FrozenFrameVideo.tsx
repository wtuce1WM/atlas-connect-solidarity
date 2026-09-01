import React, { useEffect, useRef, useState } from "react";

interface FrozenFrameVideoProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  src: string;
  /** Clé de remount (souvent l'id ou l'url) */
  videoKey: string;
  className?: string;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * Vidéo de fond avec transition "frame gelée" :
 * la dernière image de la vidéo précédente reste affichée en surimpression
 * jusqu'à ce que la nouvelle vidéo commence réellement à jouer.
 * Cela supprime le flash noir lors du swipe vertical entre deux fiches.
 */
const FrozenFrameVideo = React.memo(function FrozenFrameVideo({
  videoRef,
  src,
  videoKey,
  className = "w-full h-full bg-black object-cover",
  onLoadedMetadata,
  onTimeUpdate,
}: FrozenFrameVideoProps) {
  const snapshotRef = useRef<string | null>(null);
  const prevSrcRef = useRef<string | null>(null);
  const [frozen, setFrozen] = useState<string | null>(null);

  // Capture périodique (basse résolution) de l'image courante.
  useEffect(() => {
    const capture = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      try {
        const w = 320;
        const h = Math.max(1, Math.round((v.videoHeight / v.videoWidth) * w));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, w, h);
        snapshotRef.current = canvas.toDataURL("image/jpeg", 0.7);
      } catch {
        /* canvas tainted (cross-origin) : on renonce silencieusement */
      }
    };
    const id = window.setInterval(capture, 500);
    return () => window.clearInterval(id);
  }, [videoRef]);

  // Au changement de source : on gèle la dernière image connue.
  useEffect(() => {
    const changed = prevSrcRef.current !== null && prevSrcRef.current !== src;
    prevSrcRef.current = src;
    if (!changed) return;
    if (snapshotRef.current) setFrozen(snapshotRef.current);

    const v = videoRef.current;
    const clear = () => setFrozen(null);
    const timeout = window.setTimeout(clear, 2000);
    if (v) {
      v.addEventListener("playing", clear, { once: true });
      v.addEventListener("loadeddata", clear, { once: true });
    }
    return () => {
      window.clearTimeout(timeout);
      if (v) {
        v.removeEventListener("playing", clear);
        v.removeEventListener("loadeddata", clear);
      }
    };
  }, [src, videoRef]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        key={videoKey}
        src={src}
        className={className}
        loop
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
      />
      {frozen && (
        <img
          src={frozen}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
    </div>
  );
});

export default FrozenFrameVideo;
