import React, { useEffect, useState } from "react";
import { AbsoluteFill, Img, continueRender, delayRender, interpolate, staticFile } from "remotion";
import type { FeedManifest, FeedStep } from "../FeedTemplate";

/**
 * Fond d'écran « feed in-app » réutilisant une capture Playwright existante
 * (manifest produit par capture_feed.py). Les frames vidéo de chaque résultat
 * défilent, avec un swipe vertical entre étapes — sans la UI détourée, puisqu'il
 * s'agit d'un décor derrière le logo / le hook.
 */

const pad = (n: number) => String(n).padStart(4, "0");

const frameSrc = (m: FeedManifest, step: FeedStep, i: number) =>
  staticFile(`${m.base}/${step.frameDir}/${pad(Math.min(Math.max(i, 0), Math.max(step.frameCount, 1) - 1) + 1)}.jpg`);

export const useFeedManifest = (manifestPath?: string | null) => {
  const [manifest, setManifest] = useState<FeedManifest | null>(null);
  useEffect(() => {
    if (!manifestPath) return;
    const handle = delayRender(`manifest ${manifestPath}`);
    fetch(staticFile(manifestPath))
      .then((r) => r.json())
      .then((j) => setManifest(j as FeedManifest))
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [manifestPath]);
  return manifest;
};

/** Décor plein cadre : swipe vertical continu sur les frames des étapes. */
export const FeedBackdrop: React.FC<{
  manifest: FeedManifest;
  frame: number;
  /** durée d'un résultat à l'écran, en frames */
  holdFrames?: number;
  /** durée du swipe entre deux résultats, en frames */
  swipeFrames?: number;
}> = ({ manifest, frame, holdFrames = 60, swipeFrames = 14 }) => {
  const steps = (manifest.steps || []).filter((s) => (s.frameCount ?? 0) > 0 && !!s.frameDir);
  if (steps.length === 0) return null;

  const cycle = holdFrames + swipeFrames;
  const slot = Math.floor(frame / cycle);
  const local = frame % cycle;
  const current = steps[slot % steps.length];
  const next = steps[(slot + 1) % steps.length];

  const inSwipe = local >= holdFrames;
  const t = inSwipe ? (local - holdFrames) / swipeFrames : 0;
  const shift = interpolate(t, [0, 1], [0, -100]);

  const plate = (step: FeedStep, offset: number) => {
    const idx = (frame + offset * 7) % Math.max(step.frameCount, 1);
    return (
      <div style={{ position: "absolute", inset: 0, top: `${shift + offset * 100}%` }} key={`${step.index}-${offset}`}>
        <Img src={frameSrc(manifest, step, idx)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {plate(current, 0)}
      {inSwipe && plate(next, 1)}
    </AbsoluteFill>
  );
};
