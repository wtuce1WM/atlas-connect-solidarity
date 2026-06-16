import logoGold from "@/assets/logoGOLDsimple.webp";
import { useState, useRef, Suspense } from "react";

import Header from "@/components/Header";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

const effects = [
  {
    name: "Zoom Out (actuel)",
    description: "Part très grand et réduit vers le centre",
    weight: "~0.2 KB",
    animation: "animate-[logoZoomOut_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]",
  },
  {
    name: "Zoom In",
    description: "Part petit et grandit avec éclat doré",
    weight: "~0.3 KB",
    css: `
      @keyframes demoZoomIn {
        0% { opacity: 0; transform: scale(0.3); filter: brightness(0.5); }
        60% { opacity: 1; transform: scale(1.1); filter: brightness(1.1) drop-shadow(0 0 20px hsla(43,75%,55%,0.5)); }
        100% { opacity: 1; transform: scale(1); filter: brightness(1) drop-shadow(0 0 8px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoZoomIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Spin & Fade",
    description: "Rotation avec apparition progressive",
    weight: "~0.2 KB",
    css: `
      @keyframes demoSpinFade {
        0% { opacity: 0; transform: rotate(-180deg) scale(0.5); }
        100% { opacity: 1; transform: rotate(0deg) scale(1); filter: drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoSpinFade 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  {
    name: "Pulse Glow",
    description: "Apparition avec pulsation dorée lumineuse",
    weight: "~0.4 KB",
    css: `
      @keyframes demoPulseGlow {
        0% { opacity: 0; transform: scale(0.8); filter: brightness(0.5); }
        40% { opacity: 1; transform: scale(1.05); filter: brightness(1.1) drop-shadow(0 0 25px hsla(43,75%,55%,0.6)); }
        70% { transform: scale(0.95); filter: brightness(0.95); }
        100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 12px hsla(43,75%,55%,0.4)); }
      }
    `,
    animationStyle: "demoPulseGlow 1s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Flip 3D",
    description: "Retournement 3D sur l'axe Y",
    weight: "~0.3 KB",
    css: `
      @keyframes demoFlip {
        0% { opacity: 0; transform: perspective(800px) rotateY(90deg) scale(0.8); }
        60% { opacity: 1; transform: perspective(800px) rotateY(-10deg) scale(1.05); filter: drop-shadow(0 0 15px hsla(43,75%,55%,0.4)); }
        100% { opacity: 1; transform: perspective(800px) rotateY(0deg) scale(1); filter: drop-shadow(0 0 6px hsla(43,75%,55%,0.2)); }
      }
    `,
    animationStyle: "demoFlip 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Slide Up + Fade",
    description: "Glisse du bas vers le centre avec fondu",
    weight: "~0.2 KB",
    css: `
      @keyframes demoSlideUp {
        0% { opacity: 0; transform: translateY(60px) scale(0.9); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); }
      }
    `,
    animationStyle: "demoSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Elastic Pop",
    description: "Effet élastique rebondissant",
    weight: "~0.3 KB",
    css: `
      @keyframes demoElastic {
        0% { opacity: 0; transform: scale(0); }
        50% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 20px hsla(43,75%,55%,0.5)); }
        70% { transform: scale(0.9); }
        85% { transform: scale(1.05); }
        100% { transform: scale(1); filter: drop-shadow(0 0 8px hsla(43,75%,55%,0.2)); }
      }
    `,
    animationStyle: "demoElastic 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  {
    name: "Blur Reveal",
    description: "Apparition depuis un flou intense",
    weight: "~0.3 KB",
    css: `
      @keyframes demoBlurReveal {
        0% { opacity: 0; filter: blur(30px) brightness(1.5); transform: scale(1.3); }
        60% { opacity: 1; filter: blur(2px) brightness(1.1); }
        100% { opacity: 1; filter: blur(0) brightness(1) drop-shadow(0 0 10px hsla(43,75%,55%,0.3)); transform: scale(1); }
      }
    `,
    animationStyle: "demoBlurReveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  {
    name: "Global Beam Sweep",
    description: "Rayon doré balayant horizontalement toute la carte",
    weight: "~0.3 KB",
    css: `
      @keyframes demoGlobalBeam {
        0% { opacity: 0; background-position: -100% 0; }
        10% { opacity: 1; }
        50% { background-position: 200% 0; }
        90% { opacity: 1; }
        100% { opacity: 0; background-position: 200% 0; }
      }
    `,
    animationStyle: "demoGlobalBeam 4.2s ease-in-out forwards",
    isFullWidth: true,
  },
  {
    name: "Circular Beam Glow",
    description: "Halo doré circulaire orbitant, synchronisé avec le logo",
    weight: "~0.5 KB",
    css: `
      @property --demo-beam-x {
        syntax: '<percentage>';
        inherits: false;
        initial-value: 50%;
      }
      @property --demo-beam-y {
        syntax: '<percentage>';
        inherits: false;
        initial-value: 40%;
      }
      @keyframes demoCircularGlow {
        0%   { --demo-beam-x: 20%; --demo-beam-y: 35%; opacity: 0; }
        10%  { opacity: 1; }
        25%  { --demo-beam-x: 70%; --demo-beam-y: 30%; }
        50%  { --demo-beam-x: 80%; --demo-beam-y: 45%; opacity: 0.7; }
        75%  { --demo-beam-x: 30%; --demo-beam-y: 40%; }
        90%  { opacity: 1; }
        100% { --demo-beam-x: 20%; --demo-beam-y: 35%; opacity: 0; }
      }
    `,
    animationStyle: "demoCircularGlow 4.2s ease-in-out forwards",
    isFullWidth: true,
    isCircular: true,
  },
  {
    name: "Stormy Lightning",
    description: "Ambiance orageuse avec éclairs multiples",
    weight: "~0.7 KB",
    css: `
      @keyframes stormFlash1 {
        0%, 100% { opacity: 0; }
        4% { opacity: 0.7; }
        6% { opacity: 0; }
        8% { opacity: 0.4; }
        9% { opacity: 0; }
      }
      @keyframes stormFlash2 {
        0%, 100% { opacity: 0; }
        30% { opacity: 0; }
        33% { opacity: 0.5; }
        34% { opacity: 0; }
        36% { opacity: 0.3; }
        37% { opacity: 0; }
        38% { opacity: 0.6; }
        39% { opacity: 0; }
      }
      @keyframes stormFlash3 {
        0%, 100% { opacity: 0; }
        60% { opacity: 0; }
        62% { opacity: 0.8; }
        63% { opacity: 0; }
        64% { opacity: 0.4; }
        65% { opacity: 0; }
      }
      @keyframes stormAmbient {
        0%, 100% { opacity: 0.15; }
        50% { opacity: 0.3; }
      }
    `,
    animationStyle: "none",
    isFullWidth: true,
    isStorm: true,
  },
];

const WeightBadge = ({ weight }: { weight: string }) => (
  <span className="absolute top-2 right-2 z-20 bg-muted/80 backdrop-blur-sm text-muted-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
    {weight}
  </span>
);

const EffectCard = ({ effect }: { effect: (typeof effects)[number] }) => {
  const [key, setKey] = useState(0);
  const weight = ('weight' in effect) ? (effect as any).weight : "0 KB";
  if ('isStorm' in effect && effect.isStorm) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-full aspect-square bg-card rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-sm cursor-pointer hover:border-gold/40 hover:shadow-md transition-all"
          onClick={() => setKey(k => k + 1)}
          title="Cliquez pour rejouer"
        >
          <WeightBadge weight={weight} />
          {effect.css && <style>{effect.css}</style>}
          {/* Storm ambient overlay */}
          <div key={`amb-${key}`} className="absolute inset-0" style={{
            background: "radial-gradient(ellipse at 50% 0%, hsla(220,30%,85%,0.6) 0%, hsla(220,20%,92%,0.3) 100%)",
            animation: "stormAmbient 3s ease-in-out infinite",
          }} />
          {/* Lightning flash 1 */}
          <div key={`f1-${key}`} className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 120px 200px at 25% 10%, hsla(43,75%,55%,0.6) 0%, hsla(43,75%,55%,0.2) 30%, transparent 60%)",
            animation: "stormFlash1 2.5s ease-in-out infinite",
          }} />
          {/* Lightning flash 2 */}
          <div key={`f2-${key}`} className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 100px 180px at 75% 15%, hsla(43,75%,55%,0.6) 0%, hsla(43,60%,50%,0.15) 35%, transparent 55%)",
            animation: "stormFlash2 3.2s ease-in-out infinite",
          }} />
          {/* Lightning flash 3 */}
          <div key={`f3-${key}`} className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 150px 250px at 50% 5%, hsla(43,75%,55%,0.7) 0%, hsla(43,60%,50%,0.2) 25%, transparent 50%)",
            animation: "stormFlash3 4s ease-in-out infinite",
          }} />
          <img src={logoGold} alt={effect.name} className="w-24 h-24 object-contain relative z-10 drop-shadow-[0_0_6px_hsla(43,75%,55%,0.4)]" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-foreground">{effect.name}</h3>
          <p className="text-xs text-muted-foreground">{effect.description}</p>
          <button onClick={() => setKey(k => k + 1)} className="mt-1 text-xs text-gold/60 hover:text-gold transition-colors">▶ Rejouer</button>
        </div>
      </div>
    );
  }

  if (effect.isFullWidth) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-full aspect-square bg-card rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-sm cursor-pointer hover:border-gold/40 hover:shadow-md transition-all"
          onClick={() => setKey(k => k + 1)}
          title="Cliquez pour rejouer"
        >
          <WeightBadge weight={weight} />
          {effect.css && <style>{effect.css}</style>}
          <div
            key={key}
            className="absolute inset-0"
            style={('isCircular' in effect && effect.isCircular) ? {
              background: "radial-gradient(ellipse 300px 200px at var(--demo-beam-x, 50%) var(--demo-beam-y, 40%), hsla(43,75%,55%,0.25) 0%, hsla(43,75%,55%,0.08) 30%, transparent 70%)",
              animation: effect.animationStyle,
              opacity: 0,
            } : {
              background: "linear-gradient(90deg, transparent 0%, transparent 35%, hsla(43,75%,55%,0.5) 48%, hsla(43,75%,65%,0.7) 50%, hsla(43,75%,55%,0.5) 52%, transparent 65%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: effect.animationStyle,
              opacity: 0,
            }}
          />
          <img src={logoGold} alt={effect.name} className="w-24 h-24 object-contain relative z-10" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-foreground">{effect.name}</h3>
          <p className="text-xs text-muted-foreground">{effect.description}</p>
          <button onClick={() => setKey(k => k + 1)} className="mt-1 text-xs text-gold/60 hover:text-gold transition-colors">▶ Rejouer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-square bg-card rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-sm cursor-pointer hover:border-gold/40 hover:shadow-md transition-all"
        onClick={() => setKey(k => k + 1)}
        title="Cliquez pour rejouer"
      >
        <WeightBadge weight={weight} />
        {effect.css && <style>{effect.css}</style>}
        <img
          key={key}
          src={logoGold}
          alt={effect.name}
          className={!effect.animationStyle ? `w-24 h-24 object-contain ${effect.animation}` : "w-24 h-24 object-contain"}
          style={effect.animationStyle ? {
            animation: effect.animationStyle,
            opacity: 0,
          } : undefined}
        />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-foreground">{effect.name}</h3>
        <p className="text-xs text-muted-foreground">{effect.description}</p>
        <button
          onClick={() => setKey(k => k + 1)}
          className="mt-1 text-xs text-gold/60 hover:text-gold transition-colors"
        >
          ▶ Rejouer
        </button>
      </div>
    </div>
  );
};

const LogoEffectsDemo = () => {
  const [replay, setReplay] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-32">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontStyle: "normal" }}>Effets Logo — Démo</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4 text-left space-y-1">
            Toutes les cartes sont sur fond blanc (<code className="text-xs bg-muted px-1 py-0.5 rounded">bg-card</code>) avec bordures et ombres légères. Les effets ont été retravaillés&nbsp;:
            <br />• <strong>Éclairs storm</strong>&nbsp;: halos dorés au lieu de blancs pour rester visibles sur fond clair
            <br />• <strong>Beam sweep</strong>&nbsp;: dégradé doré semi-transparent au lieu d'opaque blanc
            <br />• <strong>3D Canvas</strong>&nbsp;: fond <code className="text-xs bg-muted px-1 py-0.5 rounded">#faf8f5</code> (proche du background clair) avec éclairage ambiant renforcé
            <br />• <strong>Drop-shadows</strong>&nbsp;: intensités réduites pour ne pas saturer sur fond blanc
            <br />• <strong>Textes</strong>&nbsp;: <code className="text-xs bg-muted px-1 py-0.5 rounded">text-foreground</code> partout pour lisibilité
          </p>
          <button
            onClick={() => setReplay(r => r + 1)}
            className="px-6 py-2 rounded-full bg-gold text-black font-semibold text-sm hover:bg-gold/80 transition-colors"
          >
            ▶ Rejouer toutes les animations
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {effects.map((effect) => (
            <EffectCard key={effect.name} effect={effect} />
          ))}
        </div>


        {/* Three.js 3D Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground text-center mb-6" style={{ fontStyle: "normal" }}>Effet 3D — Pièce dorée (Three.js)</h2>
          <p className="text-center text-muted-foreground text-sm mb-4">Démo uniquement. ~250 KB de dépendances (three.js).</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Logo3DCard mode="spin" name="Rotation continue" description="La pièce tourne en boucle sur l'axe Y" />
            <Logo3DCard mode="single-spin" name="Rotation unique" description="Un seul tour complet sur l'axe Y puis s'arrête" />
            <Logo3DCard mode="flip" name="Flip dramatique" description="Retournement 3D avec rebond" />
            <Logo3DCard mode="float" name="Flottement orbital" description="Mouvement orbital doux avec oscillation" />
          </div>
        </div>

        {/* 3D Lighting Effects */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground text-center mb-6" style={{ fontStyle: "normal" }}>Effet 3D — Lumière</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Logo3DLightCard mode="beam" name="Rayon vertical" description="Faisceau lumineux vertical balayant le logo" />
            <Logo3DLightCard mode="spotlight" name="Spotlight dramatique" description="Projecteur tournant avec ombres dynamiques" />
            <Logo3DLightCard mode="pulse-light" name="Pulsation lumineuse" description="Lumière dorée qui pulse et irradie" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- 3D Components ---- */

const LogoCoin = ({ mode, triggerKey }: { mode: string; triggerKey: number }) => {
  const texture = useLoader(THREE.TextureLoader, logoGold);
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(0);
  const singleSpinStart = useRef<number | null>(null);
  const prevTrigger = useRef(triggerKey);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    if (triggerKey !== prevTrigger.current) {
      prevTrigger.current = triggerKey;
      if (mode === "single-spin") singleSpinStart.current = t;
      if (mode === "flip") startTime.current = t;
    }

    if (mode === "spin") {
      meshRef.current.rotation.y = t * 2;
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    } else if (mode === "single-spin") {
      const duration = 1.2;
      if (singleSpinStart.current !== null) {
        const elapsed = t - singleSpinStart.current;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const eased = 1 - Math.pow(1 - progress, 3);
          meshRef.current.rotation.y = eased * Math.PI * 2;
        } else {
          meshRef.current.rotation.y = Math.PI * 2;
        }
      } else {
        meshRef.current.rotation.y = 0;
      }
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
    } else if (mode === "flip") {
      if (startTime.current > 0) {
        const elapsed = t - startTime.current;
        if (elapsed < 1.5) {
          const progress = Math.min(elapsed / 1.2, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          meshRef.current.rotation.y = eased * Math.PI * 2;
          meshRef.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.3);
        } else {
          meshRef.current.rotation.y += 0.005;
        }
      } else {
        meshRef.current.rotation.y += 0.005;
      }
    } else if (mode === "float") {
      meshRef.current.rotation.y = Math.sin(t * 0.8) * 0.4;
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
      meshRef.current.position.y = Math.sin(t * 1.2) * 0.15;
    }
  });

  return (
    <Float speed={mode === "float" ? 3 : 0} rotationIntensity={mode === "float" ? 0.3 : 0} floatIntensity={mode === "float" ? 0.4 : 0}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          metalness={0.2}
          roughness={0.5}
        />
      </mesh>
    </Float>
  );
};

const Logo3DCard = ({ mode, name, description }: { mode: string; name: string; description: string }) => {
  const [triggerKey, setTriggerKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-square bg-card rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:border-gold/40 hover:shadow-md transition-all"
        onClick={() => setTriggerKey(k => k + 1)}
        title="Cliquez pour déclencher"
      >
        <WeightBadge weight="~250 KB" />
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={["#ffffff"]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
          <directionalLight position={[-3, 2, 4]} intensity={0.4} color="#d4a84b" />
          <pointLight position={[0, -2, 3]} intensity={0.3} color="#f5e6c8" />
          <Suspense fallback={null}>
            <LogoCoin mode={mode} triggerKey={triggerKey} />
          </Suspense>
        </Canvas>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        <button
          onClick={() => setTriggerKey(k => k + 1)}
          className="mt-1 text-xs text-gold/60 hover:text-gold transition-colors"
        >
          ▶ Rejouer
        </button>
      </div>
    </div>
  );
};

/* ---- 3D Light Effects ---- */

const LightBeam = ({ mode }: { mode: string }) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const pointRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (mode === "beam" && lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 1.5) * 3;
      lightRef.current.position.y = 4;
      lightRef.current.position.z = 2;
      lightRef.current.intensity = 10 + Math.sin(t * 3) * 4;
    } else if (mode === "spotlight" && lightRef.current) {
      lightRef.current.position.x = Math.cos(t * 0.8) * 4;
      lightRef.current.position.y = 3 + Math.sin(t * 0.5);
      lightRef.current.position.z = Math.sin(t * 0.8) * 4;
      lightRef.current.intensity = 15;
    } else if (mode === "pulse-light" && pointRef.current) {
      const pulse = (Math.sin(t * 2) + 1) / 2;
      pointRef.current.intensity = 2 + pulse * 6;
      pointRef.current.distance = 5 + pulse * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      {mode === "beam" && (
        <spotLight
          ref={lightRef}
          color="#d4a84b"
          angle={0.3}
          penumbra={0.8}
          decay={1.5}
          intensity={10}
          position={[0, 4, 2]}
          target-position={[0, 0, 0]}
          castShadow
        />
      )}
      {mode === "spotlight" && (
        <>
          <spotLight
            ref={lightRef}
            color="#d4a84b"
            angle={0.4}
            penumbra={0.6}
            decay={1.5}
            intensity={15}
            position={[4, 3, 4]}
            castShadow
          />
          <pointLight position={[0, -2, 1]} intensity={0.3} color="#e8e0d0" />
        </>
      )}
      {mode === "pulse-light" && (
        <>
          <pointLight
            ref={pointRef}
            position={[0, 0, 2]}
            color="#d4a84b"
            intensity={4}
            distance={8}
          />
          <pointLight position={[0, 3, -1]} intensity={0.5} color="#ffffff" />
        </>
      )}
    </>
  );
};

const LogoLightCoin = ({ mode }: { mode: string }) => {
  const texture = useLoader(THREE.TextureLoader, logoGold);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
    meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshStandardMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        metalness={0.2}
        roughness={0.4}
      />
    </mesh>
  );
};

const Logo3DLightCard = ({ mode, name, description }: { mode: string; name: string; description: string }) => {
  const [triggerKey, setTriggerKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-square bg-card rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:border-gold/40 hover:shadow-md transition-all"
        onClick={() => setTriggerKey(k => k + 1)}
        title="Cliquez pour déclencher"
      >
        <WeightBadge weight="~250 KB" />
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: false }} shadows>
          <color attach="background" args={["#ffffff"]} />
          <Suspense fallback={null}>
            <LightBeam mode={mode} key={triggerKey} />
            <LogoLightCoin mode={mode} />
          </Suspense>
        </Canvas>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default LogoEffectsDemo;
