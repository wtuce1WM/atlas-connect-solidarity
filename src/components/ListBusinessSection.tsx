import { useLanguage } from "@/contexts/LanguageContext";

const ListBusinessSection = () => {
  const { language, t } = useLanguage();

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center max-w-4xl mx-auto">
          {language === "fr" 
            ? "Listez votre entreprise"
            : language === "ar"
              ? "أدرج شركتك"
              : "List your business"}
        </h2>
      </div>
    </section>
  );
};

export default ListBusinessSection;
