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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Conditions générales d'utilisation
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : 29 juin 2026</p>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Objet</h2>
              <p>
                Les présentes CGU régissent l'utilisation du site One World Morocco (« OWM »), plateforme
                solidaire de découverte, recommandation et mise en relation autour des établissements du
                Maroc.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Accès au service</h2>
              <p>
                L'accès en consultation est libre et gratuit. Certaines fonctionnalités (Club, favoris,
                voyages, assistant IA) nécessitent la création d'un compte gratuit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Compte Club</h2>
              <p>
                Vous vous engagez à fournir des informations exactes et à protéger vos identifiants. Vous
                êtes seul responsable des actions effectuées depuis votre compte.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Contenus</h2>
              <p>
                Les fiches établissements, vidéos, articles et recommandations sont fournis à titre
                informatif. OWM s'efforce d'en garantir la fiabilité mais ne peut être tenu responsable des
                informations transmises par les établissements partenaires ou par des tiers (YouTube,
                TripAdvisor, etc.).
              </p>
              <p className="mt-2">
                Vous vous engagez à ne pas publier de contenu illicite, diffamatoire ou portant atteinte aux
                droits d'autrui via l'assistant IA ou les commentaires.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Propriété intellectuelle</h2>
              <p>
                La marque, le logo, la charte graphique et l'ensemble du contenu éditorial sont la propriété
                de One World Morocco. Toute reproduction sans autorisation écrite est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Assistant IA</h2>
              <p>
                Les réponses générées par l'assistant IA reposent sur des modèles de langage. Elles peuvent
                contenir des erreurs ou des informations obsolètes et ne constituent en aucun cas un conseil
                contractuel.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Responsabilité</h2>
              <p>
                OWM ne peut être tenu responsable des interruptions de service, pertes de données ou
                dommages indirects résultant de l'utilisation du site. La plateforme est fournie « en
                l'état ».
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Suppression du compte</h2>
              <p>
                Vous pouvez supprimer votre compte à tout moment depuis « Mon espace Club » ou en écrivant à{" "}
                <a href="mailto:info@wtuce.org" className="text-primary hover:underline">info@wtuce.org</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. Droit applicable</h2>
              <p>
                Les présentes CGU sont régies par le droit marocain. Tout litige relatif à leur
                interprétation ou exécution relève des tribunaux compétents de Marrakech.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Contact</h2>
              <p>
                Pour toute question : <a href="mailto:info@wtuce.org" className="text-primary hover:underline">info@wtuce.org</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CGU;
