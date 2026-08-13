// Hauteur d'une iframe de widget embarqué, pilotée par le `postMessage` que la
// page /embed/* publie déjà (`owm-reviews-height`, `owm-rate-height`, …).
// Source unique de vérité côté hôte : aucune hauteur magique en dur, donc aucun
// scroll interne quand le contenu du widget change.
import { useEffect, useState } from "react";

export function useEmbedIframeHeight(messageType: string, fallback: number) {
  const [height, setHeight] = useState(fallback);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; height?: number } | null;
      if (!data || data.type !== messageType) return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > 40) setHeight(Math.ceil(h));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [messageType]);

  return height;
}
