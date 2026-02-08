import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CitiesSection from "@/components/CitiesSection";
import CategoriesSection from "@/components/CategoriesSection";
import RelaisChateauxSection from "@/components/RelaisChateauxSection";
import SponsorsSection from "@/components/SponsorsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      {/* CitiesSection - DISABLED
      <CitiesSection />
      */}
      {/* CategoriesSection - DISABLED
      <CategoriesSection />
      */}
      <SponsorsSection zone="Accueil" />
      <RelaisChateauxSection />
      <Footer />
    </div>
  );
};

export default Index;
