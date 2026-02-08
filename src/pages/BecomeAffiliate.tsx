import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const BecomeAffiliate = () => {
  const { language } = useLanguage();

  const translations = {
    fr: {
      title: "Devenir affilié",
      subtitle: "Rejoignez notre réseau de partenaires",
      description: "Développez votre visibilité au sein de la première place de marché solidaire du Maroc.",
    },
    en: {
      title: "Become an affiliate",
      subtitle: "Join our partner network",
      description: "Grow your visibility within Morocco's first solidarity marketplace.",
    },
    ar: {
      title: "كن شريكًا",
      subtitle: "انضم إلى شبكة شركائنا",
      description: "طور رؤيتك ضمن أول سوق تضامني في المغرب.",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t.title}
            </h1>
            <p className="text-xl md:text-2xl text-gold mb-8">
              {t.subtitle}
            </p>
            <p className="text-lg text-white/80">
              {t.description}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BecomeAffiliate;