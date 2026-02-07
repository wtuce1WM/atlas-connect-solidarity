import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CitiesSection from "@/components/CitiesSection";
import CategoriesSection from "@/components/CategoriesSection";
import RelaisChateauxSection from "@/components/RelaisChateauxSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CitiesSection />
      <CategoriesSection />
      <RelaisChateauxSection />
      <Footer />
    </div>
  );
};

export default Index;
