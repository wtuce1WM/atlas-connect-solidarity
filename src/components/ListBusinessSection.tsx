import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const ListBusinessSection = () => {
  const { language } = useLanguage();

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center max-w-4xl mx-auto">
          {language === "fr" 
            ? <>Listez votre <Link to="/devenir-affilie" className="text-gold hover:underline">entreprise</Link></>
            : language === "ar"
              ? <>أدرج <Link to="/devenir-affilie" className="text-gold hover:underline">شركتك</Link></>
              : <>List your <Link to="/devenir-affilie" className="text-gold hover:underline">business</Link></>}
        </h2>
      </div>
    </section>
  );
};

export default ListBusinessSection;
