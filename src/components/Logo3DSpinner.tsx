import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import logoGold from "@/assets/logoGOLDsimple.webp";


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
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-3, -3, -3]} intensity={0.4} color="#d4a84b" />
        <Suspense fallback={null}>
          <LogoCoin />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Logo3DSpinner;
