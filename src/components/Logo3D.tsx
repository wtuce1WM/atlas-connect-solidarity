import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture, Float } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import logoGold from "@/assets/logoGOLD.webp";

const LogoPlane = () => {
  const texture = useTexture(logoGold);
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.2}
      floatIntensity={0.5}
    >
      <mesh ref={meshRef}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
    </Float>
  );
};

const Logo3D = () => {
  return (
    <div className="absolute inset-0 bg-black">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#d4a84b" />
        <Suspense fallback={null}>
          <LogoPlane />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Logo3D;
