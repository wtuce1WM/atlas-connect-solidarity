import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha } from "../tokens";

/**
 * Révélation d'un logo transparent (webp/png), même grammaire que les logos
 * de marque du Studio Vidéo : aucune boîte, aucun cadre, aucun masque carré.
 * Le logo entre en ressort, dérive lentement, et sa lumière vient d'un
 * `drop-shadow` + halo radial diffus qui suit sa silhouette détourée.
 */
export const PromoLogo: React.FC<{
  src: string;
  /** largeur cible du logo en px (cadre de référence de la scène) */
  size: number;
  /** décalage de démarrage de l'animation, en frames */
  delay?: number;
  /** halo diffus derrière le logo */
  glow?: boolean;
  /** couleur de la lumière (défaut : or de la charte) */
  color?: string;
}> = ({ src, size, delay = 0, glow = true, color = palette.gold }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delay);

  const pop = spring({ frame: local, fps, config: { damping: 20, stiffness: 90, mass: 1 } });
  const scale = interpolate(pop, [0, 1], [1.18, 1]);
  const opacity = interpolate(local, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  // Dérive et respiration lentes : le logo n'est jamais figé, sans jamais sortir du cadre.
  const drift = Math.sin((local / fps) * 0.55) * size * 0.012;
  const breathe = 1 + Math.sin((local / fps) * 0.9) * 0.008;
  const lift = interpolate(pop, [0, 1], [size * 0.05, 0]);
  const glowPulse = 0.28 + 0.16 * Math.sin((local / fps) * 1.6);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        opacity,
        transform: `translateY(${lift + drift}px) scale(${scale * breathe})`,
      }}
    >
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: -size * 0.45,
            background: `radial-gradient(closest-side, ${alpha("gold", glowPulse)} 0%, transparent 72%)`,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      )}
      <Img
        src={src}
        style={{
          position: "relative",
          width: size,
          height: "auto",
          display: "block",
          filter: `drop-shadow(0 0 ${Math.round(size * 0.09)}px ${color}88) drop-shadow(0 ${Math.round(
            size * 0.03,
          )}px ${Math.round(size * 0.07)}px rgba(0,0,0,0.55))`,
        }}
      />
    </div>
  );
};

export const promoLogoRule: React.CSSProperties = {
  width: 96,
  height: 4,
  background: palette.gold,
  borderRadius: 999,
};
