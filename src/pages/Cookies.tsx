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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Politique de cookies
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : 29 juin 2026</p>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Qu'est-ce qu'un cookie ?</h2>
              <p>
                Un cookie est un petit fichier déposé sur votre appareil par votre navigateur lorsque vous
                visitez un site. Il permet notamment de mémoriser une session, vos préférences ou de mesurer
                l'audience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Cookies utilisés</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Cookies strictement nécessaires</strong> : session d'authentification (Lovable
                  Cloud / Supabase), préférences de langue. Ces cookies ne nécessitent pas votre
                  consentement.
                </li>
                <li>
                  <strong>Cookies fonctionnels</strong> : mémorisation de la dernière ville consultée, état
                  audio des vidéos.
                </li>
                <li>
                  <strong>Cookies tiers</strong> : Google (authentification OAuth, Maps), YouTube (lecture
                  vidéo intégrée). Ces services peuvent déposer leurs propres cookies, soumis à leurs
                  politiques respectives.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Gérer les cookies</h2>
              <p>
                Vous pouvez à tout moment configurer votre navigateur pour bloquer ou supprimer les cookies.
                Attention : la désactivation des cookies strictement nécessaires empêche le fonctionnement
                normal du site (impossible de se connecter au Club).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Contact</h2>
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

export default Cookies;
