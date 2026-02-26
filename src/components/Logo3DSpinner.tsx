import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import logoGold from "@/assets/logoGOLDsimple.webp";

const BeamLight = () => {
  const lightRef = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.position.x = Math.sin(t * 1.5) * 3;
      lightRef.current.position.y = 4;
      lightRef.current.position.z = 2;
      lightRef.current.intensity = 15 + Math.sin(t * 3) * 5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <spotLight
        ref={lightRef}
        color="#d4a84b"
        angle={0.3}
        penumbra={0.8}
        decay={1.5}
        intensity={15}
        position={[0, 4, 2]}
        castShadow
      />
    </>
  );
};

const LogoCoin = () => {
  const texture = useLoader(THREE.TextureLoader, logoGold);
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const duration = 1.2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Capture start time on first frame
    if (startTime.current === null) startTime.current = t;

    const elapsed = t - startTime.current;
    if (elapsed < duration) {
      const progress = elapsed / duration;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      meshRef.current.rotation.y = eased * Math.PI * 2;
    } else {
      meshRef.current.rotation.y = Math.PI * 2;
    }
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2.5, 2.5]} />
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

interface Logo3DSpinnerProps {
  className?: string;
}

const Logo3DSpinner = ({ className = "w-64 h-64" }: Logo3DSpinnerProps) => {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <BeamLight />
          <LogoCoin />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Logo3DSpinner;
