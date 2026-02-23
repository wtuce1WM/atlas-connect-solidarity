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

const EffectCard = ({ effect }: { effect: typeof effects[0] }) => {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-square bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10 cursor-pointer hover:border-gold/40 transition-colors"
        onClick={() => setKey(k => k + 1)}
        title="Cliquez pour rejouer"
      >
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
        <h3 className="text-sm font-bold text-gold">{effect.name}</h3>
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
    <div className="min-h-screen bg-black">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-32">
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
            <EffectCard key={effect.name} effect={effect} />
          ))}
        </div>

        {/* 3D Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gold text-center mb-6" style={{ fontStyle: "normal" }}>Effet 3D — Pièce dorée</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Logo3DCard mode="spin" name="Rotation continue" description="La pièce tourne en boucle sur l'axe Y" />
            <Logo3DCard mode="flip" name="Flip dramatique" description="Retournement 3D avec rebond" />
            <Logo3DCard mode="float" name="Flottement orbital" description="Mouvement orbital doux avec oscillation" />
          </div>
        </div>

        {/* 3D Lighting Effects */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gold text-center mb-6" style={{ fontStyle: "normal" }}>Effet 3D — Lumière</h2>
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

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    if (mode === "spin") {
      meshRef.current.rotation.y = t * 2;
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    } else if (mode === "flip") {
      // Reset on trigger
      if (triggerKey > 0) {
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

  // Reset start time on trigger
  if (mode === "flip") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFrame((state) => {
      if (triggerKey > 0 && startTime.current === 0) {
        startTime.current = state.clock.elapsedTime;
      }
    });
  }

  return (
    <Float speed={mode === "float" ? 3 : 0} rotationIntensity={mode === "float" ? 0.3 : 0} floatIntensity={mode === "float" ? 0.4 : 0}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          metalness={0.4}
          roughness={0.3}
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
        className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-gold/40 transition-colors"
        onClick={() => setTriggerKey(k => k + 1)}
        title="Cliquez pour déclencher"
      >
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-3, -3, -3]} intensity={0.4} color="#d4a84b" />
          <Suspense fallback={null}>
            <LogoCoin mode={mode} triggerKey={triggerKey} />
          </Suspense>
        </Canvas>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-gold">{name}</h3>
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
      // Vertical beam sweeping left to right
      lightRef.current.position.x = Math.sin(t * 1.5) * 3;
      lightRef.current.position.y = 4;
      lightRef.current.position.z = 2;
      lightRef.current.intensity = 15 + Math.sin(t * 3) * 5;
    } else if (mode === "spotlight" && lightRef.current) {
      // Orbiting spotlight
      lightRef.current.position.x = Math.cos(t * 0.8) * 4;
      lightRef.current.position.y = 3 + Math.sin(t * 0.5);
      lightRef.current.position.z = Math.sin(t * 0.8) * 4;
      lightRef.current.intensity = 20;
    } else if (mode === "pulse-light" && pointRef.current) {
      // Pulsing golden light
      const pulse = (Math.sin(t * 2) + 1) / 2;
      pointRef.current.intensity = 2 + pulse * 8;
      pointRef.current.distance = 5 + pulse * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      {mode === "beam" && (
        <spotLight
          ref={lightRef}
          color="#d4a84b"
          angle={0.3}
          penumbra={0.8}
          decay={1.5}
          intensity={15}
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
            intensity={20}
            position={[4, 3, 4]}
            castShadow
          />
          <pointLight position={[0, -2, 1]} intensity={0.5} color="#1a1a2e" />
        </>
      )}
      {mode === "pulse-light" && (
        <>
          <pointLight
            ref={pointRef}
            position={[0, 0, 2]}
            color="#d4a84b"
            intensity={5}
            distance={8}
          />
          <pointLight position={[0, 3, -1]} intensity={0.3} color="#ffffff" />
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
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
};

const Logo3DLightCard = ({ mode, name, description }: { mode: string; name: string; description: string }) => {
  const [triggerKey, setTriggerKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-gold/40 transition-colors"
        onClick={() => setTriggerKey(k => k + 1)}
        title="Cliquez pour déclencher"
      >
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: false }} shadows>
          <color attach="background" args={["#050505"]} />
          <Suspense fallback={null}>
            <LightBeam mode={mode} key={triggerKey} />
            <LogoLightCoin mode={mode} />
          </Suspense>
        </Canvas>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-bold text-gold">{name}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default LogoEffectsDemo;
