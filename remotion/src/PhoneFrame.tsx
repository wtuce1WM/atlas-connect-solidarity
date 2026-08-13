import React from "react";
import { palette, alpha } from "./tokens";

/**
 * Cadre smartphone en styles inline (équivalent Remotion de PhoneMockupFrame.tsx
 * côté app : mêmes tokens, aucune classe Tailwind ni aspect-ratio CSS).
 * Le contenu est rendu dans un viewport 9:16 à l'intérieur du cadre.
 */
/** Géométrie du cadre, partagée avec le montage (mise à l'échelle du stage). */
export const phoneGeometry = (height: number) => {
  const bezel = Math.round(height * 0.011);
  const radius = Math.round(height * 0.055);
  const screenH = height - bezel * 2;
  const screenW = Math.round((screenH * 9) / 16);
  return { bezel, radius, screenH, screenW, width: screenW + bezel * 2 };
};

export const PhoneFrame: React.FC<{
  /** hauteur totale du cadre en px */
  height: number;
  children: React.ReactNode;
}> = ({ height, children }) => {
  const { bezel, radius, screenH, screenW, width } = phoneGeometry(height);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        padding: bezel,
        background: `linear-gradient(160deg, ${palette.ink}, ${palette.night})`,
        boxShadow: `0 ${Math.round(height * 0.03)}px ${Math.round(height * 0.06)}px ${alpha("black", 0.55)}, inset 0 0 0 1px ${alpha("bone", 0.18)}`,
        position: "relative",
      }}
    >
      <div
        style={{
          width: screenW,
          height: screenH,
          borderRadius: radius - bezel,
          overflow: "hidden",
          position: "relative",
          background: palette.black,
        }}
      >
        {children}
      </div>
      {/* Encoche */}
      <div
        style={{
          position: "absolute",
          top: bezel + Math.round(height * 0.012),
          left: "50%",
          transform: "translateX(-50%)",
          width: Math.round(screenW * 0.28),
          height: Math.round(height * 0.014),
          borderRadius: 999,
          background: palette.black,
        }}
      />
    </div>
  );
};
