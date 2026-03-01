import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";

import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <Header />
      <HeroSection />
      <DynamicLabelSections pageType="home" />
      
      <Footer variant="verified" />
    </div>
  );
};

export default Index;
