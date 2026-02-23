import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import logoGold from "@/assets/logoGOLDsimple.webp";

const SpinningCoin = () => {
  const texture = useLoader(THREE.TextureLoader, logoGold);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.5, 2.5]} />
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

interface Logo3DSpinnerProps {
  className?: string;
}

const Logo3DSpinner = ({ className = "w-64 h-64" }: Logo3DSpinnerProps) => {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-3, -3, -3]} intensity={0.4} color="#d4a84b" />
        <Suspense fallback={null}>
          <SpinningCoin />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Logo3DSpinner;
