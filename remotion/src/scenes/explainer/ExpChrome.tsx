// Habillage commun des scènes de la vidéo explicative affiliés (16:9).
// Numérotation discrète 1/8, kicker, titre, message clé.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { palette, alpha, hexA } from "../../tokens/palette";
import { display, body } from "../../tokens/type";

export const BG = `linear-gradient(160deg, ${palette.slate} 0%, ${palette.ink} 55%, ${palette.night} 100%)`;

/** Fond commun : dégradé sombre + halo ocre + grain léger. */
export const ExpBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${50 + drift / 12}% 12%, ${alpha("terracotta", 0.24)} 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 12% 92%, ${alpha("majorelle", 0.18)} 0%, transparent 55%)`,
        }}
      />
    </AbsoluteFill>
  );
};

type HeaderProps = {
  index: number;
  total?: number;
  kicker: string;
  title: string;
};

/** En-tête de scène : 1/8 + kicker + titre, entrée en fondu-montée. */
export const ExpHeader: React.FC<HeaderProps> = ({ index, total = 8, kicker, title }) => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 22], [28, 0], { extrapolateRight: "clamp" });
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const bar = interpolate(frame, [8, 40], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        top: 84,
        opacity: fade,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          fontFamily: body,
          fontSize: 18,
          letterSpacing: "0.45em",
          color: alpha("cream", 0.55),
          marginBottom: 18,
        }}
      >
        {index}/{total} · {kicker.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 600,
          fontSize: 72,
          lineHeight: 1.02,
          color: palette.cream,
          letterSpacing: "-0.02em",
          maxWidth: 900,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 26,
          height: 3,
          width: 220 * bar,
          background: `linear-gradient(90deg, ${palette.terracotta}, ${palette.gold})`,
        }}
      />
    </div>
  );
};

/** Message clé bas d'écran, révélé par masque horizontal. */
export const ExpKeyMessage: React.FC<{ text: string; from?: number }> = ({ text, from = 60 }) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame - from, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 88,
        maxWidth: 1020,
        clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
      }}
    >
      <div
        style={{
          fontFamily: display,
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 40,
          lineHeight: 1.25,
          color: palette.gold,
        }}
      >
        « {text} »
      </div>
    </div>
  );
};

/** Cadre « navigateur » sombre pour insérer une capture réelle du produit. */
export const ExpBrowserFrame: React.FC<{
  src: string;
  width: number;
  height: number;
  label: string;
  /** Décalage vertical de la capture (px, pour simuler un scroll). */
  offsetY?: number;
  /** Facteur d'échelle de la capture dans le cadre. */
  imageScale?: number;
}> = ({ src, width, height, label, offsetY = 0, imageScale = 1 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      overflow: "hidden",
      background: palette.nearBlack,
      border: `1px solid ${hexA("cream", 0.14)}`,
      boxShadow: `0 40px 90px ${alpha("black", 0.55)}`,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        height: 46,
        flexShrink: 0,
        background: alpha("cream", 0.06),
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
      }}
    >
      {[palette.terracotta, palette.gold, palette.whatsapp].map((c) => (
        <div key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c, opacity: 0.75 }} />
      ))}
      <div
        style={{
          marginLeft: 14,
          fontFamily: body,
          fontSize: 15,
          letterSpacing: "0.16em",
          color: alpha("cream", 0.6),
        }}
      >
        {label}
      </div>
    </div>
    <div style={{ position: "relative", flex: 1, overflow: "hidden", background: palette.white }}>
      <img
        src={src}
        style={{
          position: "absolute",
          top: offsetY,
          left: 0,
          width: "100%",
          transform: `scale(${imageScale})`,
          transformOrigin: "top left",
          display: "block",
        }}
      />
    </div>
  </div>
);
