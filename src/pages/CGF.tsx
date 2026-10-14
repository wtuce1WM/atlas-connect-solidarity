import { CGFContent } from "@/components/legal/CGFContent";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const CGF = () => {
  useSEO({
    title: "Conditions Générales de Fonctionnement",
    description: "Conditions générales de fonctionnement de la plateforme ONE WORLD MOROCCO.",
    canonical: "/cgf",
  });
  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <CGFContent />
      </main>
      <Footer />
    </div>
  );
};

export default CGF;
