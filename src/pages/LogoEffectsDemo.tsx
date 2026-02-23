import logoGold from "@/assets/logoGOLDsimple.webp";
import { useState } from "react";
import Header from "@/components/Header";

const effects = [
  {
    name: "Zoom Out (actuel)",
    description: "Part très grand et réduit vers le centre",
    animation: "animate-[logoZoomOut_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]",
  },
  {
    name: "Zoom In",
    description: "Part petit et grandit avec éclat doré",
    css: `
      @keyframes demoZoomIn {
        0% { opacity: 0; transform: scale(0.3); filter: brightness(0.5); }
        60% { opacity: 1; transform: scale(1.1); filter: brightness(1.3) drop-shadow(0 0 30px hsla(43,75%,55%,0.7)); }
        100% { opacity: 1; transform: scale(1); filter: brightness(1) drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoZoomIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Spin & Fade",
    description: "Rotation avec apparition progressive",
    css: `
      @keyframes demoSpinFade {
        0% { opacity: 0; transform: rotate(-180deg) scale(0.5); }
        100% { opacity: 1; transform: rotate(0deg) scale(1); filter: drop-shadow(0 0 15px hsla(43,75%,55%,0.4)); }
      }
    `,
    animationStyle: "demoSpinFade 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  {
    name: "Pulse Glow",
    description: "Apparition avec pulsation dorée lumineuse",
    css: `
      @keyframes demoPulseGlow {
        0% { opacity: 0; transform: scale(0.8); filter: brightness(0.5); }
        40% { opacity: 1; transform: scale(1.05); filter: brightness(1.5) drop-shadow(0 0 40px hsla(43,75%,55%,0.8)); }
        70% { transform: scale(0.95); filter: brightness(0.9) drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); }
        100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 20px hsla(43,75%,55%,0.5)); }
      }
    `,
    animationStyle: "demoPulseGlow 1s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Flip 3D",
    description: "Retournement 3D sur l'axe Y",
    css: `
      @keyframes demoFlip {
        0% { opacity: 0; transform: perspective(800px) rotateY(90deg) scale(0.8); }
        60% { opacity: 1; transform: perspective(800px) rotateY(-10deg) scale(1.05); filter: drop-shadow(0 0 25px hsla(43,75%,55%,0.6)); }
        100% { opacity: 1; transform: perspective(800px) rotateY(0deg) scale(1); filter: drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoFlip 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Slide Up + Fade",
    description: "Glisse du bas vers le centre avec fondu",
    css: `
      @keyframes demoSlideUp {
        0% { opacity: 0; transform: translateY(60px) scale(0.9); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: drop-shadow(0 0 15px hsla(43,75%,55%,0.4)); }
      }
    `,
    animationStyle: "demoSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Elastic Pop",
    description: "Effet élastique rebondissant",
    css: `
      @keyframes demoElastic {
        0% { opacity: 0; transform: scale(0); }
        50% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 30px hsla(43,75%,55%,0.7)); }
        70% { transform: scale(0.9); }
        85% { transform: scale(1.05); }
        100% { transform: scale(1); filter: drop-shadow(0 0 12px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoElastic 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  {
    name: "Blur Reveal",
    description: "Apparition depuis un flou intense",
    css: `
      @keyframes demoBlurReveal {
        0% { opacity: 0; filter: blur(30px) brightness(2); transform: scale(1.3); }
        60% { opacity: 1; filter: blur(2px) brightness(1.2); }
        100% { opacity: 1; filter: blur(0) brightness(1) drop-shadow(0 0 15px hsla(43,75%,55%,0.4)); transform: scale(1); }
      }
    `,
    animationStyle: "demoBlurReveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
];

const EffectCard = ({ effect, replay }: { effect: typeof effects[0]; replay: number }) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
        {effect.css && <style>{effect.css}</style>}
        <img
          key={replay}
          src={logoGold}
          alt={effect.name}
          className="w-24 h-24 object-contain"
          style={{
            animation: effect.animationStyle || undefined,
            opacity: effect.animationStyle ? 0 : undefined,
          }}
          {...(!effect.animationStyle && { className: `w-24 h-24 object-contain ${effect.animation}` })}
        />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-gold">{effect.name}</h3>
        <p className="text-xs text-muted-foreground">{effect.description}</p>
      </div>
    </div>
  );
};

const LogoEffectsDemo = () => {
  const [replay, setReplay] = useState(0);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gold mb-2" style={{ fontStyle: "normal" }}>Effets Logo — Démo</h1>
          <button
            onClick={() => setReplay(r => r + 1)}
            className="px-6 py-2 rounded-full bg-gold text-black font-semibold text-sm hover:bg-gold/80 transition-colors"
          >
            ▶ Rejouer toutes les animations
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {effects.map((effect) => (
            <EffectCard key={effect.name} effect={effect} replay={replay} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoEffectsDemo;
