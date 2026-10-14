import { ConfidentialiteContent } from "@/components/legal/ConfidentialiteContent";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const Confidentialite = () => {
  useSEO({
    title: "Politique de confidentialité – One World Morocco",
    description:
      "Politique de confidentialité de One World Morocco : données collectées, finalités, durées de conservation, droits RGPD et contact DPO.",
    canonical: "/confidentialite",
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      <main className="container mx-auto px-4 pt-32 pb-16">
        <ConfidentialiteContent />
      </main>

      <Footer />
    </div>
  );
};

export default Confidentialite;
