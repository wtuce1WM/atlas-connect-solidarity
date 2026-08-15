import React from "react";
import { palette, alpha, body } from "./tokens";

/**
 * Cadre navigateur desktop (paysage) — pendant de `PhoneFrame` pour la variante
 * « Mockup navigateur » de Promo business. Le contenu est rendu dans un viewport
 * 16:9 sous la barre de chrome.
 */
export const browserGeometry = (width: number) => {
  const radius = Math.round(width * 0.016);
  const bezel = Math.round(width * 0.006);
  const chromeH = Math.round(width * 0.042);
  const screenW = width - bezel * 2;
  const screenH = Math.round((screenW * 9) / 16);
  return { radius, bezel, chromeH, screenW, screenH, height: screenH + chromeH + bezel * 2 };
};

export const BrowserFrame: React.FC<{
  /** largeur totale du cadre en px */
  width: number;
  /** URL affichée dans la barre d'adresse */
  url?: string;
  children: React.ReactNode;
}> = ({ width, url = "oneworldmorocco.com", children }) => {
  const { radius, bezel, chromeH, screenW, screenH, height } = browserGeometry(width);
  const dot = Math.round(chromeH * 0.22);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        background: `linear-gradient(160deg, ${palette.ink}, ${palette.night})`,
        boxShadow: `0 ${Math.round(width * 0.012)}px ${Math.round(width * 0.03)}px ${alpha("black", 0.55)}, inset 0 0 0 1px ${alpha("bone", 0.18)}`,
        padding: bezel,
        position: "relative",
      }}
    >
      {/* Barre de chrome : pastilles + barre d'adresse */}
      <div
        style={{
          height: chromeH,
          display: "flex",
          alignItems: "center",
          gap: Math.round(dot * 0.9),
          paddingLeft: Math.round(chromeH * 0.4),
          paddingRight: Math.round(chromeH * 0.4),
        }}
      >
        {[0.42, 0.3, 0.22].map((o, i) => (
          <div
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: 999,
              background: alpha("bone", o),
            }}
          />
        ))}
        <div
          style={{
            flex: 1,
            marginLeft: Math.round(chromeH * 0.5),
            height: Math.round(chromeH * 0.52),
            borderRadius: 999,
            background: alpha("black", 0.45),
            display: "flex",
            alignItems: "center",
            paddingLeft: Math.round(chromeH * 0.4),
            color: alpha("bone", 0.6),
            fontFamily: body,
            fontSize: Math.round(chromeH * 0.32),
            letterSpacing: 0.5,
          }}
        >
          {url}
        </div>
      </div>
      <div
        style={{
          width: screenW,
          height: screenH,
          overflow: "hidden",
          position: "relative",
          background: palette.black,
          borderRadius: Math.round(radius * 0.4),
        }}
      >
        {children}
      </div>
    </div>
  );
};
