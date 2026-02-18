import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import ListBusinessSection from "@/components/ListBusinessSection";
import Footer from "@/components/Footer";

const AncienAccueil = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <DynamicLabelSections pageType="home" />
      <ListBusinessSection />
      <Footer />
    </div>
  );
};

export default AncienAccueil;
