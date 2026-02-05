import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import BusinessSearch from "@/components/BusinessSearch";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <BusinessSearch />
      <ServicesSection />
      <Footer />
    </div>
  );
};

export default Index;
