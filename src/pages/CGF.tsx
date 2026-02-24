import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CGF = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Conditions Générales de Fonctionnement</h1>
        <p className="text-lg text-muted-foreground mb-10">One World Morocco</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Objet du Service</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            La plateforme One World Morocco est un espace numérique de mise en relation mettant en contact des prestataires de services (ci-après les « Affiliés ») et des utilisateurs (ci-après les « Internautes »).
          </p>
          <p className="text-muted-foreground leading-relaxed">
            One World Morocco intervient exclusivement en tant qu'intermédiaire technique et n'est en aucun cas partie aux transactions commerciales effectuées entre les Affiliés et les Internautes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Offre de Lancement : Indexation Gratuite</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Dans le cadre de son lancement, la plateforme propose une offre de bienvenue aux Affiliés :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Durée :</strong> Une période de trois (3) mois d'indexation et de visibilité gratuite sur la plateforme à compter de sa mise en ligne officielle.</li>
            <li><strong>Engagement :</strong> Cette période de test est sans engagement immédiat de la part de l'Affilié.</li>
            <li><strong>Suite du Service :</strong> À l'issue de ces 3 mois, un Contrat d'Affiliation formel sera adressé à l'Affilié. Ce contrat détaillera les conditions tarifaires et les modalités de collaboration pour le maintien du référencement. L'Affilié sera libre d'accepter ou de décliner la poursuite du partenariat.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Nature de la Relation (Mise en Relation)</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            L'activité de One World Morocco se limite à la présentation des offres des Affiliés. En conséquence :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>La plateforme n'agit ni comme agence de voyage, ni comme revendeur, ni comme mandataire des parties.</li>
            <li>Le contrat de vente ou de prestation de service est conclu directement entre l'Affilié et l'Internaute (B2C) ou entre deux Affiliés (B2B).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Limitation et Exclusion de Responsabilité</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            One World Morocco décline toute responsabilité concernant :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Litiges Commerciaux :</strong> Tout différend relatif à la qualité, la conformité, le prix ou le paiement des prestations fournies par l'Affilié.</li>
            <li><strong>Contenu des Fiches :</strong> L'exactitude des informations (textes, photos, tarifs) fournies par l'Affilié pour son indexation. L'Affilié garantit détenir les droits sur ces contenus.</li>
            <li><strong>Dommages Directs/Indirects :</strong> Tout préjudice résultant d'une relation commerciale nouée via la plateforme (B2B ou B2C).</li>
            <li><strong>Disponibilité :</strong> Les éventuelles interruptions techniques de la plateforme, bien que tout soit mis en œuvre pour assurer un service continu.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Obligations de l'Affilié</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Pendant la période d'indexation gratuite, l'Affilié s'engage à :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Fournir des informations sincères et conformes à la réalité de ses services.</li>
            <li>Respecter les lois et réglementations en vigueur au Maroc relatives à son secteur d'activité.</li>
            <li>Répondre avec professionnalisme aux sollicitations des Internautes issues de la plateforme.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Loi Applicable et Juridiction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les présentes conditions sont régies par le droit marocain. Tout litige relatif à leur interprétation ou leur exécution sera de la compétence exclusive des tribunaux de Marrakech.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CGF;
