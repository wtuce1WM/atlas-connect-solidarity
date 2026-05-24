import HeroSection from "@/components/HeroSection";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import DynamicLabelSections from "@/components/DynamicLabelSections";

import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const Index = () => {
  useSEO({
    title: "ONE WORLD MOROCCO, première plateforme de e-commerce solidaire au Maroc",
    description: "Découvrez les meilleures adresses au Maroc : hôtels, restaurants, activités et services sélectionnés par ONE WORLD MOROCCO.",
    canonical: "/",
  });
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <HomeMindtripHeader />
      <HeroSection />

      <DynamicLabelSections pageType="home" />
      
      <Footer variant="verified" />
    </div>
  );
};

export default Index;
