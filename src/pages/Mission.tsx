import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

const Mission = () => {
  const { t } = useLanguage();
  useSEO({
    title: "Notre mission – L'excellence éthique au meilleur prix",
    description: "Découvrez la mission de ONE WORLD MOROCCO : promouvoir l'excellence éthique et les meilleures adresses au Maroc.",
    canonical: "/mission",
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              One World Morocco : L'Excellence Éthique au Meilleur Prix
            </h1>
            <ShareButton variant="dark" className="mt-2 shrink-0" />
          </div>
          
          <p className="text-xl text-primary font-semibold mb-4">
            Bien plus qu'une plateforme, un nouveau paradigme de consommation solidaire.
          </p>

          <p className="text-lg text-muted-foreground mb-12">
            Pourquoi passer par One World Morocco pour vos achats de biens et services ? Voici les 6 piliers qui garantissent une expérience unique, avantageuse et engagée.
          </p>

          <div className="space-y-10 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. La 1ère Plateforme de E-Commerce 100% Solidaire</h2>
              <p>Faites de chaque achat un acte de générosité. Nous sommes la seule plateforme où l'engagement est inscrit dans notre ADN : 20% du montant de chaque cotisation est directement reversé à des actions humanitaires et de solidarité concrètes sur le terrain. Vous consommez, nous agissons ensemble.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Une Sélection Élite : La Garantie du 15/20</h2>
              <p>Oubliez les mauvaises surprises. Nous avons fait le tri pour vous. Chaque professionnel listé sur notre plateforme subit une sélection rigoureuse et doit justifier d'une note globale minimale de 15/20. Nous ne gardons que la crème de la crème pour garantir votre satisfaction.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Le Prix le Plus Bas du Marché (Garanti -5%)</h2>
              <p>Le pouvoir d'achat est au cœur de notre promesse. Grâce à notre modèle unique, nous vous garantissons les meilleurs tarifs : profitez systématiquement de 5% de réduction supplémentaire sur les prix les plus bas constatés ailleurs en ligne.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Contact Direct & Instantané</h2>
              <p>Pas d'intermédiaires, pas de barrières. Nous facilitons la relation humaine en vous donnant un accès direct aux professionnels. Vous pouvez les contacter en un clic via leur site web officiel ou directement par WhatsApp pour une réponse immédiate et personnalisée.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Modèle "Zéro Commission" pour les Pros</h2>
              <p>Pourquoi nos prix sont-ils si compétitifs ? Contrairement aux plateformes classiques, nous ne prélevons aucune commission sur les ventes des professionnels. Cette économie massive leur permet de vous répercuter directement le meilleur coût sans sacrifier leur marge.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Une Charte Éthique et Sociale Stricte</h2>
              <p className="mb-4">Achetez l'esprit tranquille. Chaque partenaire de One World Morocco s'engage sur une dimension éthique minimale :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Transparence sociale :</strong> Déclaration systématique de tous les employés.</li>
                <li><strong>Responsabilité :</strong> Un sens de l'éthique professionnelle vérifié.</li>
                <li><strong>Impact Local :</strong> Un soutien actif à l'économie marocaine responsable.</li>
              </ul>
            </section>

            <blockquote className="border-l-4 border-gold pl-6 py-4 text-lg italic text-foreground font-medium mt-12">
              "Consommer avec One World Morocco, c'est choisir l'excellence pour soi tout en offrant un avenir meilleur aux autres."
            </blockquote>
          </div>
        </div>
      </main>

      
      
      <Footer />
    </div>
  );
};

export default Mission;
