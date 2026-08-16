import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { palette, alpha } from "../tokens";

/**
 * Habillage UI du slidepanel 1WM reproduit à l'intérieur du cadre smartphone :
 * - CTAs du header (WhatsApp, Like, Share, Bookmark) en pastilles verre
 * - barre « liquid glass » du bas avec les CTAs principaux
 *
 * Purement décoratif : aucun calcul dynamique sur l'établissement / le slug,
 * les libellés sont des valeurs par défaut surchargées par le manifeste.
 */
export type PhoneUiChromeProps = {
  /** largeur de l'écran du mockup, en px du rendu final */
  screenW: number;
  /** hauteur de l'écran du mockup, en px du rendu final */
  screenH: number;
  /** libellé du CTA principal (blanc) */
  primaryLabel?: string;
  /** libellé du CTA secondaire (verre) */
  secondaryLabel?: string;
};

const Icon: React.FC<{ d: string; size: number; color: string; fill?: boolean }> = ({
  d,
  size,
  color,
  fill,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path
      d={d}
      fill={fill ? color : "none"}
      stroke={color}
      strokeWidth={fill ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PATH = {
  whatsapp:
    "M12 2a10 10 0 0 0-8.7 14.9L2 22l5.2-1.3A10 10 0 1 0 12 2Zm4.9 13.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.2a11 11 0 0 1-3.3-2 12 12 0 0 1-2.3-3c-.3-.6-.4-1.2-.2-1.8.1-.4.5-.9.8-1.1.2-.2.6-.2.8-.1.2.1.4.7.6 1.1.2.4.3.7.1 1-.2.3-.5.5-.4.8.3.7 1 1.5 1.6 2 .5.4 1.2.8 1.7.9.3.1.5-.2.8-.5.2-.2.5-.2.8 0 .4.2 1 .5 1.2.7.2.2.2.6.1.8Z",
  heart:
    "M20.8 6.6a5.5 5.5 0 0 0-7.8 0L12 7.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8Z",
  share:
    "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
};

export const PhoneUiChrome: React.FC<PhoneUiChromeProps> = ({
  screenW,
  screenH,
  primaryLabel = "Réserver en ligne",
  secondaryLabel = "Itinéraire",
}) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pad = Math.round(screenW * 0.04);
  const dot = Math.round(screenW * 0.108);
  const iconSize = Math.round(dot * 0.54);
  const barPad = Math.round(screenW * 0.035);
  const pillH = Math.round(screenW * 0.115);
  const font = Math.max(8, Math.round(screenW * 0.042));

  const glass: React.CSSProperties = {
    background: `linear-gradient(180deg, ${alpha("black", 0.25)}, ${alpha("black", 0.6)})`,
    border: `1px solid ${alpha("white", 0.14)}`,
  };

  const dotStyle = (bg?: string): React.CSSProperties => ({
    width: dot,
    height: dot,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg ?? alpha("black", 0.42),
    border: `1px solid ${alpha("white", bg ? 0 : 0.22)}`,
    boxShadow: `0 2px 8px ${alpha("black", 0.45)}`,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: appear,
      }}
    >
      {/* CTAs du header */}
      <div
        style={{
          position: "absolute",
          top: pad * 1.9,
          right: pad,
          display: "flex",
          gap: Math.round(pad * 0.55),
          transform: `translateY(${(1 - appear) * -pad}px)`,
        }}
      >
        <div style={dotStyle(palette.whatsapp)}>
          <Icon d={PATH.whatsapp} size={iconSize} color={palette.white} fill />
        </div>
        <div style={dotStyle()}>
          <Icon d={PATH.heart} size={iconSize} color={palette.white} />
        </div>
        <div style={dotStyle()}>
          <Icon d={PATH.share} size={iconSize} color={palette.white} />
        </div>
        <div style={dotStyle()}>
          <Icon d={PATH.bookmark} size={iconSize} color={palette.gold} />
        </div>
      </div>

      {/* Barre liquid glass du bas */}
      <div
        style={{
          position: "absolute",
          left: Math.round(screenW * 0.02),
          right: Math.round(screenW * 0.02),
          bottom: 0,
          borderTopLeftRadius: Math.round(screenW * 0.06),
          borderTopRightRadius: Math.round(screenW * 0.06),
          padding: barPad,
          paddingBottom: Math.round(barPad * 1.6),
          display: "grid",
          gap: Math.round(barPad * 0.7),
          transform: `translateY(${(1 - appear) * screenH * 0.08}px)`,
          ...glass,
        }}
      >
        <div
          style={{
            height: pillH,
            borderRadius: Math.round(pillH * 0.28),
            background: palette.white,
            color: palette.black,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.round(font * 0.5),
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: font,
            letterSpacing: 0.2,
          }}
        >
          <Icon d={PATH.calendar} size={Math.round(font * 1.15)} color={palette.black} />
          {primaryLabel}
        </div>
        <div
          style={{
            height: pillH,
            borderRadius: Math.round(pillH * 0.28),
            background: alpha("white", 0.14),
            border: `1px solid ${alpha("white", 0.22)}`,
            color: palette.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.round(font * 0.5),
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: font,
          }}
        >
          <Icon d={PATH.pin} size={Math.round(font * 1.15)} color={palette.white} />
          {secondaryLabel}
        </div>
      </div>
    </div>
  );
};
