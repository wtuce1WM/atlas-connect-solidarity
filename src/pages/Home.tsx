import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomepageCardsFront from "@/components/HomepageCardsFront";
import { useSEO } from "@/hooks/useSEO";

/**
 * Future homepage (route /test).
 *
 * Minimaliste par design : Header + grille de cartes vidéo (snapshot
 * pré-calculé via `homepage_cards_snapshots`) + Footer.
 *
 * Aucune requête Supabase autre que la lecture du snapshot (~1 fetch).
 * La ville est lue depuis `?city=` (défaut Marrakech), aucun sélecteur UI
 * (la sélection de ville est gérée ailleurs ou via le lien d'entrée).
 *
 * L'ancienne version riche (1900 lignes, badges/events/popular searches/panels)
 * est conservée dans `src/pages/HomeFull.tsx` pour référence.
 */
const Home = () => {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city");
  const city = useMemo(() => {
    const raw = (cityParam || "Marrakech").trim();
    // Capitalize first letter to match snapshot keys (Marrakech / Essaouira)
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }, [cityParam]);

  useSEO({
    title: "ONE WORLD MOROCCO, première plateforme de e-commerce solidaire au Maroc",
    description: "Découvrez les meilleures adresses au Maroc : hôtels, restaurants, activités et services sélectionnés par ONE WORLD MOROCCO.",
    canonical: "/test",
  });

  // Track city change as a soft analytics signal (no blocking I/O)
  useEffect(() => {
    try {
      (window as any).gtag?.("event", "homepage_view", { city });
    } catch {}
  }, [city]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-7xl mx-auto w-full">
        <HomepageCardsFront city={city} />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
