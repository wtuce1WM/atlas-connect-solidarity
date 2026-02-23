import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";

import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Global light beam sweep — synced with logo beam */}
      <div
        className="pointer-events-none fixed inset-0 z-[2] opacity-[0.07]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, transparent 35%, #d4a84b 48%, #fff8e7 50%, #d4a84b 52%, transparent 65%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "globalBeamSweep 4.2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes globalBeamSweep {
          0% { background-position: -100% 0; }
          50% { background-position: 200% 0; }
          100% { background-position: -100% 0; }
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
