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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold uppercase text-foreground font-['Montserrat',sans-serif] mb-6">
            {t("Chaînes YouTube", "YouTube channels", "قنوات يوتيوب")}
          </h1>
          <YouTubeChannelsTabContent city={city} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default YouTubePage;
