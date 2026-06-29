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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Dernière mise à jour : 29 juin 2026
          </p>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Responsable du traitement</h2>
              <p>
                La présente Politique de confidentialité s'applique au site et aux services
                One World Morocco accessibles depuis{" "}
                <a href="https://oneworldmorocco.com" className="text-primary hover:underline">
                  oneworldmorocco.com
                </a>{" "}
                (ci-après « OWM », « nous »).
              </p>
              <p className="mt-2">
                Contact : <a href="mailto:info@wtuce.org" className="text-primary hover:underline">info@wtuce.org</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Données que nous collectons</h2>
              <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Compte Club</strong> : email, nom, prénom, mot de passe haché, langue préférée, ville
                  d'intérêt. En cas d'inscription via Google, nous recevons votre email, votre nom et votre
                  photo de profil publique.
                </li>
                <li>
                  <strong>Contenus créés</strong> : voyages, favoris, conversations avec l'assistant IA,
                  établissements liés.
                </li>
                <li>
                  <strong>Données techniques</strong> : adresse IP, type d'appareil, logs anonymisés à des
                  fins de sécurité et de diagnostic.
                </li>
                <li>
                  <strong>Géolocalisation approximative</strong> : uniquement avec votre accord explicite,
                  pour proposer des résultats à proximité.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Finalités du traitement</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Création et gestion de votre compte Club ;</li>
                <li>Personnalisation des recommandations (IA, carte, favoris) ;</li>
                <li>Envoi d'emails transactionnels (confirmation, réinitialisation, notifications) ;</li>
                <li>Amélioration et sécurité de la plateforme.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Base légale</h2>
              <p>
                Le traitement repose sur votre <strong>consentement</strong> (inscription, cookies non
                essentiels), sur l'<strong>exécution du contrat</strong> de service (compte Club) et sur notre
                <strong> intérêt légitime</strong> à sécuriser et améliorer la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Sous-traitants et hébergement</h2>
              <p>Nous nous appuyons sur des prestataires techniques sélectionnés :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Lovable Cloud / Supabase</strong> : base de données, authentification, hébergement (UE).</li>
                <li><strong>Google</strong> : authentification OAuth, Google Maps.</li>
                <li><strong>Resend</strong> : envoi d'emails transactionnels.</li>
                <li><strong>ElevenLabs, Google Gemini</strong> : services d'IA (synthèse vocale, recherche).</li>
                <li><strong>YouTube</strong> : lecture de vidéos intégrées.</li>
              </ul>
              <p className="mt-2">
                Aucune donnée n'est revendue à des tiers à des fins publicitaires.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Durée de conservation</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Compte Club : tant que le compte est actif, puis 12 mois après inactivité ;</li>
                <li>Logs techniques : 12 mois maximum ;</li>
                <li>Conversations IA : conservées tant que vous ne les supprimez pas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Vos droits</h2>
              <p>
                Conformément au RGPD et à la loi marocaine 09-08, vous disposez d'un droit d'accès, de
                rectification, d'effacement, de portabilité, d'opposition et de limitation. Pour les exercer,
                écrivez à <a href="mailto:info@wtuce.org" className="text-primary hover:underline">info@wtuce.org</a>.
              </p>
              <p className="mt-2">
                Vous pouvez également supprimer votre compte directement depuis « Mon espace Club ».
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Cookies</h2>
              <p>
                Nous utilisons des cookies strictement nécessaires (session, sécurité) et, avec votre accord,
                des cookies de mesure d'audience anonymisée. Voir notre{" "}
                <a href="/cookies" className="text-primary hover:underline">page Cookies</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. Modifications</h2>
              <p>
                Toute évolution majeure de cette politique vous sera notifiée par email ou via une bannière
                sur le site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Contact</h2>
              <p>
                Pour toute question : <a href="mailto:info@wtuce.org" className="text-primary hover:underline">info@wtuce.org</a><br />
                Téléphone : <a href="tel:+212661439221" className="text-primary hover:underline">+212 661 439 221</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Confidentialite;
