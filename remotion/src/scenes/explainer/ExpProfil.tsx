// Scène 1/8 — PROFIL DIGITAL ENRICHI
// Les visuels et les données viennent réellement de One World Morocco
// (photos + logo + note calculée de Lola Sky Lounge).
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha, hexA } from "../../tokens/palette";
import { display, body } from "../../tokens/type";
import { ExpBackground, ExpHeader, ExpKeyMessage } from "./ExpChrome";

export const PROFIL_FRAMES = 260;

const PHOTOS = ["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg", "p5.jpg", "p6.jpg"];

const CHIPS = [
  "Horaires",
  "Itinéraire GPS",
  "WhatsApp",
  "Réserver",
  "Services",
  "Offres",
  "Réseaux sociaux",
  "Recherche IA",
];

export const ExpProfil: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 90 } });
  const cardY = interpolate(cardIn, [0, 1], [70, 0]);

  return (
    <AbsoluteFill>
      <ExpBackground />
      <ExpHeader index={1} kicker="Profil digital enrichi" title={"Une fiche qui se construit\nen direct"} />

      {/* Colonne droite : la fiche */}
      <div
        style={{
          position: "absolute",
          right: 110,
          top: 120,
          width: 700,
          opacity: cardIn,
          transform: `translateY(${cardY}px)`,
        }}
      >
        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            background: alpha("black", 0.55),
            border: `1px solid ${hexA("cream", 0.16)}`,
            boxShadow: `0 50px 110px ${alpha("black", 0.6)}`,
          }}
        >
          {/* Mosaïque de photos réelles : chaque tuile apparaît en cascade */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, height: 380 }}>
            {PHOTOS.map((p, i) => {
              const t = spring({ frame: frame - 26 - i * 7, fps, config: { damping: 20, stiffness: 120 } });
              const zoom = interpolate(frame, [30, PROFIL_FRAMES], [1.04, 1.14]);
              return (
                <div key={p} style={{ overflow: "hidden", opacity: t, gridRow: i === 0 ? "span 2" : undefined }}>
                  <Img
                    src={staticFile(`explainer/lola/${p}`)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `scale(${zoom + (1 - t) * 0.06})`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ padding: "30px 34px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Img
                src={staticFile("explainer/lola/logo.webp")}
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: `1px solid ${hexA("gold", 0.4)}`,
                  opacity: spring({ frame: frame - 40, fps, config: { damping: 18 } }),
                }}
              />
              <div>
                <div style={{ fontFamily: display, fontWeight: 600, fontSize: 40, color: palette.cream }}>
                  Lola Sky Lounge
                </div>
                <div style={{ fontFamily: body, fontSize: 22, color: alpha("cream", 0.62), marginTop: 4 }}>
                  Marrakech · Hivernage
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 38, color: palette.gold }}>15.2/20</div>
                <div style={{ fontFamily: body, fontSize: 18, color: alpha("cream", 0.5) }}>412 avis</div>
              </div>
            </div>

            {/* Attributs qui se remplissent un par un */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
              {CHIPS.map((c, i) => {
                const t = spring({ frame: frame - 70 - i * 9, fps, config: { damping: 22, stiffness: 140 } });
                return (
                  <div
                    key={c}
                    style={{
                      fontFamily: body,
                      fontSize: 19,
                      letterSpacing: "0.06em",
                      color: palette.cream,
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: `1px solid ${hexA("gold", 0.35)}`,
                      background: alpha("gold", 0.08 * t),
                      opacity: t,
                      transform: `translateY(${(1 - t) * 14}px)`,
                    }}
                  >
                    {c}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Comparatif discret à gauche */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 470,
          opacity: interpolate(frame, [95, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {[
          ["Fiche Google", "nom · adresse · horaires"],
          ["Fiche One World Morocco", "photos · vidéos · services · offres · IA"],
        ].map(([t, s], i) => (
          <div key={t} style={{ marginBottom: 30 }}>
            <div
              style={{
                fontFamily: body,
                fontSize: 17,
                letterSpacing: "0.28em",
                color: i === 1 ? palette.terracotta : alpha("cream", 0.4),
              }}
            >
              {t.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: display,
                fontSize: 30,
                color: i === 1 ? palette.cream : alpha("cream", 0.35),
                marginTop: 8,
              }}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      <ExpKeyMessage text="Une fiche bien plus riche qu'une simple fiche Google." from={150} />
    </AbsoluteFill>
  );
};
