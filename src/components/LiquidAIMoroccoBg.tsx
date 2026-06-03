import zelligeAsset from "@/assets/zellige2.webp.asset.json";

/**
 * Fond animé — IA × Maroc, calé sur la géométrie radiale du zellige.
 * - Motif zellige doucement zoomé en arrière-plan
 * - Onde radiale qui pulse depuis le cœur de l'étoile (rosace)
 * - Halo conique à 8 branches qui tourne lentement, écho de la symétrie zellige
 */
export default function LiquidAIMoroccoBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      <style>{`
        @keyframes lqm-pan { 0%,100%{transform:scale(1.15)} 50%{transform:scale(1.22)} }
        @keyframes lqm-pulse {
          0%   { transform:scale(0.6); opacity:0 }
          15%  { opacity:0.55 }
          100% { transform:scale(1.6); opacity:0 }
        }
        @keyframes lqm-spin { to { transform:rotate(360deg) } }
        .lqm-pan{animation:lqm-pan 22s ease-in-out infinite}
        .lqm-pulse{animation:lqm-pulse 6s cubic-bezier(.2,.7,.3,1) infinite;transform-origin:center}
        .lqm-spin{animation:lqm-spin 40s linear infinite;transform-origin:center}
      `}</style>

      {/* Motif zellige */}
      <div
        className="lqm-pan absolute inset-0 bg-center bg-cover opacity-30"
        style={{ backgroundImage: `url(${zelligeAsset.url})` }}
      />

      {/* Voile pour préserver la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/75 via-background/45 to-background/75" />

      {/* Halo conique 8 branches — symétrie du zellige */}
      <div
        className="lqm-spin absolute inset-[-25%] opacity-25 mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(var(--gold)/0.6) 12deg, transparent 45deg, transparent 90deg, hsl(var(--morocco-green)/0.5) 102deg, transparent 135deg, transparent 180deg, hsl(var(--gold)/0.6) 192deg, transparent 225deg, transparent 270deg, hsl(var(--morocco-green)/0.5) 282deg, transparent 315deg, transparent 360deg)",
          filter: "blur(40px)",
        }}
      />

      {/* Ondes radiales — pulsation depuis le cœur de la rosace */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="lqm-pulse absolute h-[140%] aspect-square rounded-full"
          style={{
            background:
              "radial-gradient(circle, transparent 38%, hsl(var(--gold)/0.35) 42%, transparent 46%)",
          }}
        />
        <div
          className="lqm-pulse absolute h-[140%] aspect-square rounded-full"
          style={{
            animationDelay: "2s",
            background:
              "radial-gradient(circle, transparent 38%, hsl(var(--primary)/0.3) 42%, transparent 46%)",
          }}
        />
        <div
          className="lqm-pulse absolute h-[140%] aspect-square rounded-full"
          style={{
            animationDelay: "4s",
            background:
              "radial-gradient(circle, transparent 38%, hsl(var(--morocco-green)/0.3) 42%, transparent 46%)",
          }}
        />
      </div>
    </div>
  );
}
