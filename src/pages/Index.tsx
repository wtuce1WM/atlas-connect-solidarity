import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import BusinessSearch from "@/components/BusinessSearch";
import HotelSearch from "@/components/HotelSearch";
import GoogleHotelReviews from "@/components/GoogleHotelReviews";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ServicesSection />
      <BusinessSearch />
      <HotelSearch />
      <GoogleHotelReviews />
      <Footer />
    </div>
  );
};

export default Index;
