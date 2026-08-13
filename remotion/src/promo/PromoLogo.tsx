import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha } from "../tokens";

/**
 * Révélation animée d'un logo transparent (webp/png) :
 * apparition ressort + flou qui se dissipe + halo doré pulsé + balayage
 * lumineux diagonal. Aucun calibrage spécifique à un établissement : tout est
 * dérivé de `size` et du fps de la composition.
 */
export const PromoLogo: React.FC<{
  src: string;
  /** largeur cible du logo en px (cadre 1080 de référence) */
  size: number;
  /** décalage de démarrage de l'animation, en frames */
  delay?: number;
  /** halo derrière le logo */
  glow?: boolean;
}> = ({ src, size, delay = 0, glow = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delay);

  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
  const scale = interpolate(pop, [0, 1], [0.72, 1]);
  const opacity = interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const blur = interpolate(local, [0, 18], [16, 0], { extrapolateRight: "clamp" });
  const halo = 0.35 + 0.25 * Math.sin((local / fps) * 2.2);
  const sweep = interpolate(local, [10, 46], [-140, 240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: size,
        opacity,
        transform: `scale(${scale})`,
        filter: `blur(${blur}px)`,
      }}
    >
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: -size * 0.28,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha("gold", halo)}, transparent 68%)`,
          }}
        />
      )}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <Img src={src} style={{ width: size, height: "auto", display: "block" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sweep}%`,
            width: "35%",
            background: `linear-gradient(100deg, transparent, ${alpha("cream", 0.55)}, transparent)`,
            mixBlendMode: "screen",
          }}
        />
      </div>
    </div>
  );
};

export const promoLogoRule: React.CSSProperties = {
  width: 96,
  height: 4,
  background: palette.gold,
  borderRadius: 999,
};
