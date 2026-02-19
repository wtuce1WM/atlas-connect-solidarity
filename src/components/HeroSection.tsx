import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, BedDouble, UtensilsCrossed, Mountain, Sparkles, ShoppingBag, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoGoldOverlay from "@/assets/logoGOLDsimple.webp";
import heroBackground from "@/assets/hero-marrakech.jpg";

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (searchCategory !== "all") params.set("category", searchCategory);
    if (params.toString()) {
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <section className="relative min-h-[120vh] w-full overflow-hidden">
      {/* Hero Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />

      {/* Overlay with gradient to black at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />

      {/* Content — logo puis titre puis recherche dans l'ordre naturel */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-24 pb-16 gap-8">

        {/* Logo */}
        <img
          src={logoGoldOverlay}
          alt=""
          className="object-contain w-1/2 max-w-xs"
        />

        {/* Titre */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center max-w-4xl">
          {language === "fr"
            ? <>Bienvenue sur la 1<sup>ère</sup> place de marché <a href="#mission" className="text-gold hover:underline">solidaire</a></>
            : language === "ar"
              ? <>مرحبًا بكم في أول سوق <a href="#mission" className="text-gold hover:underline">تضامني</a></>
              : <>Welcome to the 1<sup>st</sup> <a href="#mission" className="text-gold hover:underline">solidarity</a> marketplace</>
          }
        </h1>

        {/* Search Bar + Tabs */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          {/* Category Tabs — une seule ligne, scroll si besoin */}
          <div
            className="flex items-center w-full gap-2 mb-4"
          >
            {[
              { key: "all", labelFr: "Tout", labelEn: "All", labelAr: "الكل", Icon: LayoutGrid },
              { key: "Hôtellerie", labelFr: "Hôtels", labelEn: "Hotels", labelAr: "فنادق", Icon: BedDouble },
              { key: "Restauration", labelFr: "Restaurants", labelEn: "Restaurants", labelAr: "مطاعم", Icon: UtensilsCrossed },
              { key: "Tourisme", labelFr: "Activités", labelEn: "Activities", labelAr: "أنشطة", Icon: Mountain },
              { key: "Commerce", labelFr: "Commerce", labelEn: "Shopping", labelAr: "تسوق", Icon: ShoppingBag },
              { key: "Bien-être", labelFr: "Bien-être", labelEn: "Wellness", labelAr: "رفاهية", Icon: Sparkles },
            ].map(({ key, labelFr, labelEn, labelAr, Icon }) => {
              const isActive = searchCategory === key;
              const label = language === "en" ? labelEn : language === "ar" ? labelAr : labelFr;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSearchCategory(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gold text-black shadow-md"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={language === "fr" ? "Que cherchez-vous ?" : language === "ar" ? "ماذا تبحث عنه؟" : "What are you looking for?"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full md:w-auto bg-green-300 hover:bg-green-400 text-green-900 font-semibold rounded-full px-6 py-6 shadow-lg"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </form>

      </div>
    </section>
  );
};

export default HeroSection;
