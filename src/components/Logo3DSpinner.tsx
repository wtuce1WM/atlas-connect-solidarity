import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import logoGold from "@/assets/logoGOLDsimple.webp";

const PulsingLight = () => {
  const pointRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (pointRef.current) {
      const t = state.clock.elapsedTime;
      const pulse = (Math.sin(t * 2) + 1) / 2;
      pointRef.current.intensity = 2 + pulse * 8;
      pointRef.current.distance = 5 + pulse * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight
        ref={pointRef}
        position={[0, 0, 2]}
        color="#d4a84b"
        intensity={5}
        distance={8}
      />
      <pointLight position={[0, 3, -1]} intensity={0.3} color="#ffffff" />
    </>
  );
};

const LogoCoin = () => {
  const texture = useLoader(THREE.TextureLoader, logoGold);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      meshRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;
    }
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
          <PulsingLight />
          <LogoCoin />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Logo3DSpinner;
