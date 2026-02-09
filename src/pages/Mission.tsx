import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BusinessSearch from "@/components/BusinessSearch";
import { useLanguage } from "@/contexts/LanguageContext";

const Mission = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
            {t("footer.ourMission")}
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              ONE WORLD MOROCCO est une plateforme dédiée à la promotion et à la mise en valeur 
              des établissements d'excellence au Maroc. Notre mission est de connecter les visiteurs 
              avec les meilleurs services et expériences que le royaume a à offrir.
            </p>
            
            <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">
              Notre Vision
            </h2>
            <p>
              Nous croyons en un Maroc ouvert sur le monde, où l'excellence et l'authenticité 
              se rencontrent pour offrir des expériences uniques. Notre plateforme vise à être 
              le pont entre les établissements de qualité et une clientèle internationale exigeante.
            </p>
            
            <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">
              Nos Valeurs
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Excellence et qualité de service</li>
              <li>Authenticité et respect des traditions</li>
              <li>Innovation et modernité</li>
              <li>Transparence et confiance</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">
              Notre Engagement
            </h2>
            <p>
              Chaque établissement référencé sur notre plateforme est sélectionné avec soin 
              pour garantir une expérience de qualité. Nous nous engageons à maintenir des 
              standards élevés et à accompagner nos partenaires dans leur développement.
            </p>
          </div>
        </div>
      </main>

      <BusinessSearch />
      
      <Footer />
    </div>
  );
};

export default Mission;
