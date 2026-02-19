import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import CategoriesCarouselSection from "@/components/CategoriesCarouselSection";
import ListBusinessSection from "@/components/ListBusinessSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <DynamicLabelSections pageType="home" />
      <CategoriesCarouselSection />
      <ListBusinessSection />
      <Footer />
    </div>
  );
};

export default Index;
