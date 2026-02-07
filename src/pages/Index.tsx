import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CitiesSection from "@/components/CitiesSection";
import CategoriesSection from "@/components/CategoriesSection";
import RelaisChateauxSection from "@/components/RelaisChateauxSection";
import Footer from "@/components/Footer";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      <HeroSection />
      {/* CitiesSection - DISABLED
      <CitiesSection />
      */}
      {/* CategoriesSection - DISABLED
      <CategoriesSection />
      */}
      <RelaisChateauxSection />
      
      {/* Bottom decorative emblem */}
      <div 
        className="absolute bottom-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-15 pointer-events-none"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <Footer />
    </div>
  );
};

export default Index;
