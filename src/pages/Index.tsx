import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";

import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Stormy Lightning effect */}
      <style>{`
        @keyframes stormFlash1 {
          0%, 100% { opacity: 0; }
          4% { opacity: 0.15; }
          6% { opacity: 0; }
          8% { opacity: 0.1; }
          9% { opacity: 0; }
        }
        @keyframes stormFlash2 {
          0%, 100% { opacity: 0; }
          30% { opacity: 0; }
          33% { opacity: 0.12; }
          34% { opacity: 0; }
          36% { opacity: 0.07; }
          37% { opacity: 0; }
          38% { opacity: 0.14; }
          39% { opacity: 0; }
        }
        @keyframes stormFlash3 {
          0%, 100% { opacity: 0; }
          60% { opacity: 0; }
          62% { opacity: 0.18; }
          63% { opacity: 0; }
          64% { opacity: 0.08; }
          65% { opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-[2]"
        style={{ background: "radial-gradient(ellipse 800px 1200px at 25% 10%, hsla(220,80%,90%,1) 0%, hsla(240,60%,70%,0.3) 30%, transparent 60%)", animation: "stormFlash1 2.5s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed inset-0 z-[2]"
        style={{ background: "radial-gradient(ellipse 600px 1000px at 75% 15%, hsla(200,90%,85%,1) 0%, hsla(220,70%,60%,0.2) 35%, transparent 55%)", animation: "stormFlash2 3.2s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed inset-0 z-[2]"
        style={{ background: "radial-gradient(ellipse 900px 1400px at 50% 5%, hsla(0,0%,100%,1) 0%, hsla(220,60%,80%,0.3) 25%, transparent 50%)", animation: "stormFlash3 4s ease-in-out infinite" }} />
      <Header />
      <HeroSection />
      <DynamicLabelSections pageType="home" />
      
      <Footer />
    </div>
  );
};

export default Index;
