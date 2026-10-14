import { CookiesContent } from "@/components/legal/CookiesContent";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const Cookies = () => {
  useSEO({
    title: "Politique de cookies – One World Morocco",
    description: "Quels cookies utilise One World Morocco et comment les gérer.",
    canonical: "/cookies",
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      <main className="container mx-auto px-4 pt-32 pb-16">
        <CookiesContent />
      </main>

      <Footer />
    </div>
  );
};

export default Cookies;
