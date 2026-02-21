import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, BedDouble, UtensilsCrossed, Mountain, Sparkles, ShoppingBag, Search, Mic, Loader2, MapPin, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoGoldOverlay from "@/assets/logoGOLDsimple.webp";
import heroBackground from "@/assets/hero-marrakech.jpg";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { toast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestionsDropdown from "@/components/SearchSuggestionsDropdown";

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions } = useSearchSuggestions(searchQuery);
  const heroRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const geo = useGeolocation();
  const navigateWithSlide = (url: string) => {
    setIsExiting(true);
    setTimeout(() => navigate(url), 350);
  };

  const voiceLang = language === "ar" ? "ar-MA" : language === "en" ? "en-US" : "fr-FR";
  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    lang: voiceLang,
    onTranscript: (keywords, spokenText, detectedCategory) => {
      const params = new URLSearchParams();
      params.set("q", keywords);
      if (spokenText !== keywords) params.set("spoken", spokenText);
      const cat = detectedCategory || (searchCategory !== "all" ? searchCategory : "");
      if (cat) params.set("category", cat);
      if (geo.isEnabled && geo.detectedCity) params.set("city", geo.detectedCity);
      navigateWithSlide(`/search?${params.toString()}`);
    },
    onError: (msg) => toast({ title: msg, variant: "destructive" }),
  });

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.bottom > 0) {
          setScrollY(window.scrollY);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (searchCategory !== "all") params.set("category", searchCategory);
    if (geo.isEnabled && geo.detectedCity) params.set("city", geo.detectedCity);
    if (params.toString()) {
      navigateWithSlide(`/search?${params.toString()}`);
    }
  };

  return (
    <section
      ref={heroRef}
      className={`relative w-full overflow-hidden transition-all duration-350 ease-in-out ${
        isExiting ? "opacity-0 -translate-y-16" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Hero Background Image — parallax + Ken Burns */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-[kenburns_25s_ease-in-out_infinite_alternate]"
        style={{
          backgroundImage: `url(${heroBackground})`,
          transform: `translateY(${scrollY * 0.35}px)`,
          willChange: "transform",
        }}
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

        {/* Titre dynamique selon l'onglet */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center max-w-4xl min-h-[4.5rem] md:min-h-[3rem]">
          {(() => {
            const texts: Record<string, { fr: string; fr2?: string; en: string; en2?: string; ar: string; ar2?: string }> = {
              all: {
                fr: "Que cherchez-vous ?",
                fr2: "Et où ?",
                en: "What are you looking for?",
                en2: "And where?",
                ar: "ماذا تبحث عنه؟",
                ar2: "وأين؟",
              },
              "Hôtellerie": {
                fr: "Trouvez les meilleurs hôtels & riads",
                en: "Find the best hotels & riads",
                ar: "ابحث عن أفضل الفنادق والرياضات",
              },
              "Restauration": {
                fr: "Trouvez un bon restaurant",
                en: "Find a good restaurant",
                ar: "ابحث عن مطعم جيد",
              },
              "Tourisme": {
                fr: "Amusez-vous",
                en: "Have fun",
                ar: "استمتعوا",
              },
              "Commerce": {
                fr: "Que voulez-vous",
                fr2: "acheter ?",
                en: "What do you want",
                en2: "to buy?",
                ar: "ماذا تريدون",
                ar2: "شراءه؟",
              },
              "Bien-être": {
                fr: "Prenez soin de vous",
                en: "Take care of yourself",
                ar: "اعتنوا بأنفسكم",
              },
            };
            const t = texts[searchCategory] || texts.all;
            const line1 = language === "ar" ? t.ar : language === "en" ? t.en : t.fr;
            const line2 = language === "ar" ? t.ar2 : language === "en" ? t.en2 : t.fr2;
            return line2 ? (
              <>
                {line1}<br className="md:hidden" />{" "}
                <span className="hidden md:inline">{line2}</span>
                <span className="md:hidden">{line2}</span>
              </>
            ) : line1;
          })()}
        </h1>

        {/* Search Bar + Tabs */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          {/* Category Tabs — une seule ligne, scroll si besoin */}
           <div
            ref={tabsRef}
            className="flex items-center w-full gap-4 md:gap-6 mb-6 md:justify-center overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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
                  onClick={(e) => {
                    setSearchCategory(key);
                    const btn = e.currentTarget;
                    const container = tabsRef.current;
                    if (container) {
                      const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
                      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
                    }
                  }}
                  className={`flex items-center gap-1.5 pb-2 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/40"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Desktop: input with inline button + voice */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={language === "fr" ? "Que cherchez-vous ?" : language === "ar" ? "ماذا تبحث عنه؟" : "What are you looking for?"}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full pl-14 pr-36 py-7 text-lg bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-black font-semibold rounded-full px-6 py-5 shadow-md border border-black"
                style={{ backgroundColor: "#15FF00" }}
              >
                {language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search"}
              </Button>
              <SearchSuggestionsDropdown
                suggestions={suggestions}
                visible={showSuggestions && suggestions.length > 0}
              />
            </div>
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all ${
                voiceStatus === "recording"
                  ? "bg-red-100 animate-pulse"
                  : voiceStatus === "processing"
                    ? "bg-white/70"
                    : "bg-white/90 hover:bg-white"
              }`}
              title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
            >
              {voiceStatus === "processing" ? (
                <Loader2 className="h-6 w-6 text-black animate-spin" />
              ) : (
                <Mic className={`h-6 w-6 ${voiceStatus === "recording" ? "text-red-600" : "text-black"}`} />
              )}
            </button>
          </div>

          {/* Mobile: input on top, buttons below */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={language === "fr" ? "Que cherchez-vous ?" : language === "ar" ? "ماذا تبحث عنه؟" : "What are you looking for?"}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full pl-14 pr-4 py-7 text-lg bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
              <SearchSuggestionsDropdown
                suggestions={suggestions}
                visible={showSuggestions && suggestions.length > 0}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="lg"
                className="flex-1 text-black font-semibold rounded-full py-6 shadow-md text-lg border border-black"
                style={{ backgroundColor: "#15FF00" }}
              >
                {language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search"}
              </Button>
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all ${
                  voiceStatus === "recording"
                    ? "bg-red-100 animate-pulse"
                    : voiceStatus === "processing"
                      ? "bg-white/70"
                      : "bg-white/90 hover:bg-white"
                }`}
                title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
              >
                {voiceStatus === "processing" ? (
                  <Loader2 className="h-6 w-6 text-black animate-spin" />
                ) : (
                  <Mic className={`h-6 w-6 ${voiceStatus === "recording" ? "text-red-600" : "text-black"}`} />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Geo toggle badge */}
        <button
          type="button"
          onClick={geo.toggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
            geo.isEnabled && geo.detectedCity
              ? "bg-gold/20 border-gold/50 text-gold"
              : geo.isEnabled
                ? "bg-white/10 border-white/20 text-white/60"
                : "bg-white/10 border-white/20 text-white/50"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {geo.isEnabled
            ? geo.isDetecting
              ? (language === "fr" ? "Détection..." : language === "ar" ? "جاري الكشف..." : "Detecting...")
              : geo.detectedCity
                ? `📍 ${geo.detectedCity}`
                : (language === "fr" ? "Aucune ville proche" : language === "ar" ? "لا توجد مدينة قريبة" : "No nearby city")
            : (language === "fr" ? "Position désactivée" : language === "ar" ? "الموقع معطل" : "Location off")}
        </button>

        {/* Listez votre entreprise */}
        <p className="text-2xl md:text-3xl text-white/80 font-medium mt-4">
          {language === "fr"
            ? <>Listez votre <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">entreprise</Link></>
            : language === "ar"
              ? <>أدرج <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">شركتك</Link></>
              : <>List your <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">business</Link></>}
        </p>

      </div>

      {/* Geolocation consent banner */}
      {geo.showBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl px-5 py-4 flex items-start gap-3 max-w-md w-[calc(100%-2rem)]">
          <MapPin className="h-5 w-5 text-gold mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {language === "fr" ? "Utiliser votre position pour affiner les résultats ?" : language === "ar" ? "استخدام موقعك لتحسين النتائج؟" : "Use your location to refine results?"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === "fr" ? "Vous pouvez changer ce choix à tout moment." : language === "ar" ? "يمكنك تغيير هذا الخيار في أي وقت." : "You can change this anytime."}
            </p>
            <div className="flex gap-2 mt-3 justify-end">
              <Button variant="ghost" size="sm" onClick={geo.decline}>
                {language === "fr" ? "Non merci" : language === "ar" ? "لا شكراً" : "No thanks"}
              </Button>
              <Button size="sm" onClick={geo.accept} className="bg-gold text-black hover:bg-gold/90">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {language === "fr" ? "Activer" : language === "ar" ? "تفعيل" : "Enable"}
              </Button>
            </div>
          </div>
          <button onClick={geo.dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
