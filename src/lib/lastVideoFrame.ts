// Mémoire courte de la dernière image vidéo affichée dans un slidepanel.
// Sert uniquement à la transition visuelle : quand la fiche suivante est en
// cours de chargement (démontage temporaire du fond vidéo), on affiche cette
// image au lieu d'un écran noir / squelette, puis la nouvelle vidéo la remplace.

let frame: string | null = null;
let capturedAt = 0;

/** Fraîcheur maximale d'une image gelée réutilisable (ms). */
const MAX_AGE_MS = 4000;

export function captureLastVideoFrame(video: HTMLVideoElement | null): void {
  if (!video || video.readyState < 2 || !video.videoWidth) return;
  try {
    const w = 320;
    const h = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    frame = canvas.toDataURL("image/jpeg", 0.6);
    capturedAt = Date.now();
  } catch {
    /* vidéo cross-origin non capturable : on garde l'ancien comportement */
  }
}

/** Retourne l'image gelée si elle est encore fraîche, sinon null. */
export function getLastVideoFrame(): string | null {
  if (!frame) return null;
  if (Date.now() - capturedAt > MAX_AGE_MS) return null;
  return frame;
}

export function clearLastVideoFrame(): void {
  frame = null;
  capturedAt = 0;
}
