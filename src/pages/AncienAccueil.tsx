import { useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DynamicLabelSections from "@/components/DynamicLabelSections";
import ListBusinessSection from "@/components/ListBusinessSection";
import Footer from "@/components/Footer";

const AncienAccueil = () => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !meta;
    const prev = meta?.content ?? "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
    return () => {
      if (created) meta?.remove();
      else if (meta) meta.content = prev;
    };
  }, []);

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
