import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CitiesSection from "@/components/CitiesSection";
import CategoriesSection from "@/components/CategoriesSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import ListBusinessSection from "@/components/ListBusinessSection";
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
      <DynamicLabelSections pageType="home" />
      <ListBusinessSection />
      <Footer />
    </div>
  );
};

export default Index;
