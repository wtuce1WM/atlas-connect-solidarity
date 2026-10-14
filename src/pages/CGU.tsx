import { CGUContent } from "@/components/legal/CGUContent";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const CGU = () => {
  useSEO({
    title: "Conditions générales d'utilisation – One World Morocco",
    description:
      "Conditions générales d'utilisation du service One World Morocco : accès, compte Club, contenus, responsabilités.",
    canonical: "/cgu",
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      <main className="container mx-auto px-4 pt-32 pb-16">
        <CGUContent />
      </main>

      <Footer />
    </div>
  );
};

export default CGU;
