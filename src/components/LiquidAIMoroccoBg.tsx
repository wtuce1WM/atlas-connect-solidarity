/**
 * Animation Liquid en fond de carte — IA × Maroc.
 * - 3 blobs liquides (rouge Maroc, vert Maroc, or) qui fondent ensemble via SVG goo filter
 * - Étoile IA filante qui balaie diagonalement
 * - Étoile marocaine en filigrane pulsée
 * Léger, GPU-friendly, sans JS.
 */
export default function LiquidAIMoroccoBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      <style>{`
        @keyframes lqm-blob-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.15)} }
        @keyframes lqm-blob-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,40px) scale(1.2)} }
        @keyframes lqm-blob-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,30px) scale(0.9)} }
        @keyframes lqm-sweep { 0%{transform:translate(-30%,120%) rotate(-20deg);opacity:0} 15%{opacity:1} 60%{opacity:1} 100%{transform:translate(130%,-30%) rotate(-20deg);opacity:0} }
        @keyframes lqm-star { 0%,100%{transform:scale(1);opacity:.35} 50%{transform:scale(1.08);opacity:.55} }
        .lqm-blob-a{animation:lqm-blob-a 9s ease-in-out infinite}
        .lqm-blob-b{animation:lqm-blob-b 11s ease-in-out infinite}
        .lqm-blob-c{animation:lqm-blob-c 7s ease-in-out infinite}
        .lqm-sweep{animation:lqm-sweep 5.5s cubic-bezier(.6,.05,.3,1) infinite}
        .lqm-star{animation:lqm-star 4s ease-in-out infinite;transform-origin:center}
      `}</style>

      {/* Goo filter pour fusion liquide */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id="lqm-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Blobs liquides */}
      <div className="absolute inset-0 opacity-60" style={{ filter: "url(#lqm-goo)" }}>
        <div className="lqm-blob-a absolute -left-10 -top-10 h-56 w-56 rounded-full bg-[hsl(var(--morocco-red))] mix-blend-screen blur-2xl" />
        <div className="lqm-blob-b absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(var(--morocco-green))] mix-blend-screen blur-2xl" />
        <div className="lqm-blob-c absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-gold mix-blend-screen blur-2xl" />
      </div>

      {/* Étoile marocaine en filigrane */}
      <svg
        viewBox="0 0 200 200"
        className="lqm-star absolute -right-8 -bottom-8 h-48 w-48 text-[hsl(var(--morocco-green))]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <polygon points="100,15 130,75 195,75 142,115 162,180 100,140 38,180 58,115 5,75 70,75" />
        <polygon
          points="100,15 130,75 195,75 142,115 162,180 100,140 38,180 58,115 5,75 70,75"
          transform="rotate(36 100 100)"
        />
      </svg>

      {/* Trace IA — étoile filante dorée */}
      <div className="lqm-sweep absolute -left-20 top-0 h-[2px] w-[60%] bg-gradient-to-r from-transparent via-gold to-transparent blur-[1px]" />
      <div className="lqm-sweep absolute -left-20 top-0 h-[1px] w-[40%] bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animationDelay: "0.15s" }} />
    </div>
  );
}
