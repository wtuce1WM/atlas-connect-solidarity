import zelligeAsset from "@/assets/zellige2.webp.asset.json";

/**
 * Fond animé Liquid — IA × Maroc.
 * - Motif zellige en arrière-plan, doucement zoomé/rotaté
 * - Traînée IA dorée (étoile filante) qui balaie la carte
 * - Liseré liquide « shimmer » sur les bords
 */
export default function LiquidAIMoroccoBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      <style>{`
        @keyframes lqm-pan { 0%,100%{transform:scale(1.15) rotate(0deg)} 50%{transform:scale(1.25) rotate(3deg)} }
        @keyframes lqm-sweep { 0%{transform:translate(-30%,120%) rotate(-20deg);opacity:0} 12%{opacity:1} 55%{opacity:1} 100%{transform:translate(130%,-30%) rotate(-20deg);opacity:0} }
        @keyframes lqm-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .lqm-pan{animation:lqm-pan 18s ease-in-out infinite}
        .lqm-sweep{animation:lqm-sweep 5.5s cubic-bezier(.6,.05,.3,1) infinite}
        .lqm-shimmer{
          background:linear-gradient(110deg,transparent 30%,hsl(var(--gold)/0.35) 50%,transparent 70%);
          background-size:200% 100%;
          animation:lqm-shimmer 6s linear infinite;
          mix-blend-mode:overlay;
        }
      `}</style>

      {/* Motif zellige */}
      <div
        className="lqm-pan absolute inset-0 bg-center bg-cover opacity-25"
        style={{ backgroundImage: `url(${zelligeAsset.url})` }}
      />

      {/* Voile sombre pour préserver la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/40 to-background/70" />

      {/* Liseré liquide doré */}
      <div className="lqm-shimmer absolute inset-0" />

      {/* Étoile filante IA */}
      <div className="lqm-sweep absolute -left-20 top-0 h-[2px] w-[60%] bg-gradient-to-r from-transparent via-gold to-transparent blur-[1px]" />
      <div
        className="lqm-sweep absolute -left-20 top-0 h-[1px] w-[40%] bg-gradient-to-r from-transparent via-white/80 to-transparent"
        style={{ animationDelay: "0.15s" }}
      />
    </div>
  );
}
