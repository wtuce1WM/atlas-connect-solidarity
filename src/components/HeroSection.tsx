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
  const [isLoading, setIsLoading] = useState(false);
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

      {/* Centered Gold Logo Overlay */}
      <div className="absolute inset-x-0 top-32 flex flex-col items-center pointer-events-none">
        <img 
          src={logoGoldOverlay} 
          alt="" 
          className="object-contain opacity-100 w-1/2 max-w-xs"
        />
      </div>

      {/* Search Bar below logo - positioned relative in content flow */}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pt-[22rem] md:pt-[30rem]">
        {/* Logo/Title - DISABLED
        <div className="mb-12 text-center">
          <h1 className="mb-2 font-serif text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
            <span className="text-gold">ONE WORLD</span> MOROCCO
          </h1>
          <p className="text-lg text-white/90 md:text-xl">
            {t("hero.subtitle")}
          </p>
        </div>
        */}

        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-8 max-w-4xl">
          {language === "fr" 
            ? <>Bienvenue sur la 1<sup>ère</sup> place de marché <a href="#mission" className="text-gold hover:underline">solidaire</a></>
            : language === "ar"
              ? <>مرحبًا بكم في أول سوق <a href="#mission" className="text-gold hover:underline">تضامني</a></>
              : <>Welcome to the 1<sup>st</sup> <a href="#mission" className="text-gold hover:underline">solidarity</a> marketplace</>
          }
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-10">
          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gold text-black shadow-md"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
              className="w-full md:w-auto bg-gold hover:bg-gold/90 text-black font-semibold rounded-full px-6 py-6 shadow-lg"
            >
              <Search className="h-5 w-5 md:mr-2" />
              <span className="inline md:inline">
                {language === "fr" ? "Rechercher" : language === "ar" ? "بحث" : "Search"}
              </span>
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <div className="w-full max-w-5xl space-y-10">

            {/* Sponsors Section - DISABLED
            {sponsors.length > 0 && (
              <div className="w-full pb-4">
                <h2 className="text-center text-white font-bold text-3xl mb-4">Sponsors</h2>
                <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <div className="flex items-center justify-center min-w-max gap-0">
                  {sponsors.map((sponsor, index) => {
                    const url = getSponsorUrl(sponsor);
                    const logo = getSponsorLogo(sponsor);

                    if (!logo) return null;

                    const logoElement = (
                      <img
                        src={logo}
                        alt={sponsor.name_fr}
                        className="w-[200px] md:w-[300px] lg:w-[400px] h-auto object-contain opacity-100 hover:opacity-80 transition-opacity"
                      />
                    );

                    if (url) {
                      return (
                        <a
                          key={sponsor.id}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          {logoElement}
                        </a>
                      );
                    }

                    return (
                      <div key={sponsor.id} className="flex-shrink-0">
                        {logoElement}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            )}
            */}

            {/* Relais & Châteaux Section - MOVED TO SEPARATE COMPONENT */}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;

/* ============================================
   DISABLED SEARCH FUNCTIONALITY
   The following code is preserved but not used.
   To re-enable, restore the original imports and component logic.
   ============================================

import { Search, Loader2, BadgeCheck, Navigation, Building2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAvailableMainCategories } from "@/hooks/useAvailableMainCategories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoGold from "@/assets/logoGOLDsimple.webp";

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  services: string[];
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  wtuce_status: "verified" | "pending";
  priority_score: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  distance_km: number | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
}

const CATEGORY_LABELS: Record<string, { fr: string; en: string; ar: string }> = {
  "Hôtellerie": { fr: "Hôtellerie", en: "Hospitality", ar: "فندقة" },
  "Restauration": { fr: "Restauration", en: "Restaurants", ar: "مطاعم" },
  // ... rest of category labels
};

============================================ */
