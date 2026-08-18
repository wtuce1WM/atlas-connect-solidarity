import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import YouTubeChannelsTabContent from "@/pages/search/YouTubeChannelsTabContent";

const YouTubePage = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city");

  const t = (fr: string, en: string, ar?: string) =>
    language === "en" ? en : language === "ar" ? ar || en : fr;

  useSEO({
    title: t(
      "Chaînes YouTube des établissements au Maroc",
      "YouTube channels of Moroccan venues",
      "قنوات يوتيوب للمؤسسات في المغرب"
    ),
    description: t(
      "Découvrez en vidéo les riads, restaurants et lieux d'exception de Marrakech et Essaouira via leurs chaînes YouTube.",
      "Discover riads, restaurants and exceptional venues in Marrakech and Essaouira through their YouTube channels.",
      "اكتشف الرياضات والمطاعم والأماكن الاستثنائية في مراكش والصويرة عبر قنوات يوتيوب."
    ),
    canonical: "/youtube",
  });

  return (
    // Fond noir : le composant peint une vidéo YouTube en `fixed inset-0 z-0`.
    <div className="min-h-screen bg-black">
      <Header />

      {/* Titre superposé, sous le header et au-dessus du dégradé interne (z-20). */}
      <h1
        className="fixed left-0 right-0 top-16 md:top-20 z-[21] px-4 pointer-events-none text-base sm:text-xl md:text-2xl font-bold uppercase text-white drop-shadow-lg font-['Montserrat',sans-serif]"
      >
        {t("Le meilleur de YouTube sur le Maroc", "The best of YouTube about Morocco", "أفضل ما في يوتيوب عن المغرب")}
      </h1>

      {/* Pas de container ni de padding horizontal ici : le composant gère
          lui-même `px-4`, sa largeur max et son décalage quand le slidepanel
          droit est ouvert (lg:max-w-[50vw]). */}
      <main className="pt-10 sm:pt-12 md:pt-16">
        <YouTubeChannelsTabContent city={city} />
      </main>

      <div className="relative z-10 bg-background">
        <Footer />
      </div>
    </div>
  );
};

export default YouTubePage;
