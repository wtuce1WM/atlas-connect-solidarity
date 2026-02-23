import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";

import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Circular light glow — synced with logo beam */}
      <div
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: "radial-gradient(ellipse 600px 400px at var(--beam-x, 50%) var(--beam-y, 40%), hsla(43,75%,55%,0.08) 0%, hsla(43,75%,55%,0.03) 30%, transparent 70%)",
          animation: "circularBeamGlow 4.2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes circularBeamGlow {
          0%   { --beam-x: 20%; --beam-y: 35%; opacity: 0.5; }
          25%  { --beam-x: 70%; --beam-y: 30%; opacity: 1; }
          50%  { --beam-x: 80%; --beam-y: 45%; opacity: 0.7; }
          75%  { --beam-x: 30%; --beam-y: 40%; opacity: 1; }
          100% { --beam-x: 20%; --beam-y: 35%; opacity: 0.5; }
        }
        @property --beam-x {
          syntax: '<percentage>';
          inherits: false;
          initial-value: 50%;
        }
        @property --beam-y {
          syntax: '<percentage>';
          inherits: false;
          initial-value: 40%;
        }
      `}</style>
      <Header />
      <HeroSection />
      <DynamicLabelSections pageType="home" />
      
      <Footer />
    </div>
  );
};

export default Index;
