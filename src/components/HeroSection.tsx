import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, BedDouble, UtensilsCrossed, Mountain, Sparkles, ShoppingBag, MapPin, X } from "lucide-react";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

import logoGoldOverlay from "@/assets/logoGOLDsimple.webp";
import LogoCSSSpinner from "@/components/LogoCSSSpinner";
import heroBackground from "@/assets/hero-marrakech.jpg";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import ResumeLastSearch from "@/components/ResumeLastSearch";
import { toast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getTimeGreeting, extractTimeSlot } from "@/lib/timeSlots";
import HeroLocationSelector from "@/components/HeroLocationSelector";
import LocationPickerDialog from "@/components/LocationPickerDialog";

const HeroSection = () => {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [searchCategory, setSearchCategory] = useState("all");
  const searchContainerRef = useRef<HTMLDivElement>(null);
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
  const { status: voiceStatus, toggleRecording, finishRecording, liveTranscript } = useVoiceSearch({
    lang: voiceLang,
    onTranscript: (keywords, spokenText, detectedCategory, timeKeyword) => {
      const params = new URLSearchParams();
      params.set("q", keywords);
      if (spokenText !== keywords) params.set("spoken", spokenText);
      const cat = detectedCategory || (searchCategory !== "all" ? searchCategory : "");
      if (cat) params.set("category", cat);
      if (geo.isEnabled && geo.detectedCity) params.set("city", geo.detectedCity);
      // Handle temporal keyword from voice
      if (timeKeyword) {
        const timeResult = extractTimeSlot(timeKeyword);
        if (timeResult) {
          params.set("timeStart", String(timeResult.timeSlot.startHour));
          params.set("timeEnd", String(timeResult.timeSlot.endHour));
          params.set("timeDayOffset", String(timeResult.timeSlot.dayOffset));
          if (timeResult.timeSlot.dayOfWeek !== null) params.set("timeDayOfWeek", String(timeResult.timeSlot.dayOfWeek));
        }
      }
      navigateWithSlide(`/search?${params.toString()}`);
    },
    onError: (msg) => toast({ title: msg, variant: "destructive" }),
  });

  // Close suggestions on click outside

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

  return (
    <section
      ref={heroRef}
      className={`relative w-full transition-all duration-350 ease-in-out ${
        isExiting ? "opacity-0 -translate-y-16" : "opacity-100"
      }`}
    >
      {/* Hero Background Image — full bleed from top */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/hero_magical_realism_v1.jpg')`,
          transform: `translateY(${scrollY * 0.35}px)`,
          willChange: "transform",
        }}
      />

      {/* Overlay with gradient to white at bottom for content legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/70 to-white" />


      {/* Logo CSS — single spin + float */}
      <div className="absolute inset-0 z-[20] lg:z-[90] flex items-start justify-center pt-24 pointer-events-none">
        <LogoCSSSpinner className="w-56 h-56 md:w-80 md:h-80" replayKey={0} />
      </div>

      {/* Content — text layer above logo */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-24 pb-16 gap-8">

        {/* Spacer for logo */}
        <div className="w-56 h-56 mb-2 md:mb-0 md:w-80 md:h-80" />

        <p className="text-lg md:text-base text-foreground/70 font-medium tracking-wide text-center -mt-4">
          {language === "ar" ? "أول منصة تجارة إلكترونية تضامنية في المغرب" : language === "en" ? "1st solidarity e-commerce platform in Morocco" : "1ère plateforme de e-commerce solidaire au Maroc"}
        </p>

        {/* Titre dynamique — masqué sur mobile, visible tablette+ */}
        <h1 className="hidden md:block text-3xl md:text-4xl lg:text-5xl font-bold text-black text-center max-w-5xl">
          {(() => {
            const texts: Record<string, { fr: string; fr2?: string; en: string; en2?: string; ar: string; ar2?: string }> = {
              all: { fr: "Que cherchez-vous ?", fr2: "Et où ?", en: "What are you looking for?", en2: "And where?", ar: "ماذا تبحث عنه؟", ar2: "وأين؟" },
              "Hôtellerie": { fr: "Trouvez les meilleurs hôtels & riads", en: "Find the best hotels & riads", ar: "ابحث عن أفضل الفنادق والرياضات" },
              "Restauration": { fr: "Trouvez un bon restaurant", en: "Find a good restaurant", ar: "ابحث عن مطعم جيد" },
              "Tourisme": { fr: "Amusez-vous", en: "Have fun", ar: "استمتعوا" },
              "Commerce": { fr: "Que voulez-vous", fr2: "acheter ?", en: "What do you want", en2: "to buy?", ar: "ماذا تريدون", ar2: "شراءه؟" },
              "Bien-être": { fr: "Prenez soin de vous", en: "Take care of yourself", ar: "اعتنوا بأنفسكم" },
            };
            const t = texts[searchCategory] || texts.all;
            const line1 = language === "ar" ? t.ar : language === "en" ? t.en : t.fr;
            const line2 = language === "ar" ? t.ar2 : language === "en" ? t.en2 : t.fr2;
            return line2 ? <>{line1} {line2}</> : line1;
          })()}
        </h1>


        {/* Search Bar + Tabs */}
        <div className="w-full max-w-2xl" ref={searchContainerRef}>
          {/* Category Tabs — une seule ligne, scroll si besoin */}
           <div
            ref={tabsRef}
            className="flex items-center w-full justify-start gap-4 md:gap-6 mb-6 overflow-x-auto scrollbar-hide pb-1 px-1 md:px-0"
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
                      const containerRect = container.getBoundingClientRect();
                      const btnRect = btn.getBoundingClientRect();
                      const targetScroll = container.scrollLeft + (btnRect.left - containerRect.left) - (containerRect.width / 2) + (btnRect.width / 2);
                      container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
                    }
                  }}
                  className={`flex items-center gap-1.5 pb-2 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? "border-black text-black"
                      : "border-transparent text-black/60 hover:text-black hover:border-black/40"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          {(() => {
            const placeholders: Record<string, { fr: string; en: string; ar: string }> = {
              all: { fr: "Que cherchez-vous ? Et où ?", en: "What are you looking for? And where?", ar: "ماذا تبحث عنه؟ وأين؟" },
              "Hôtellerie": { fr: "Trouvez les meilleurs hôtels & riads", en: "Find the best hotels & riads", ar: "اعثر على أفضل الفنادق والرياضات" },
              "Restauration": { fr: "Trouvez un bon restaurant", en: "Find a great restaurant", ar: "اعثر على مطعم جيد" },
              "Tourisme": { fr: "Trouvez une activité inoubliable", en: "Find an unforgettable activity", ar: "اعثر على نشاط لا يُنسى" },
              "Commerce": { fr: "Trouvez les meilleures boutiques", en: "Find the best shops", ar: "اعثر على أفضل المتاجر" },
              "Bien-être": { fr: "Trouvez un spa ou hammam", en: "Find a spa or hammam", ar: "اعثر على سبا أو حمام" },
            };
            const p = placeholders[searchCategory] || placeholders.all;
            const placeholder = language === "ar" ? p.ar : language === "en" ? p.en : p.fr;
            return (
              <HeroInlineSearch
                placeholder={placeholder}
                onSearch={(params) => {
                  const qs = new URLSearchParams(params).toString();
                  if (qs) navigateWithSlide(`/search?${qs}`);
                }}
                onBusinessSelect={(businessId) => navigateWithSlide(`/search?openBusiness=${businessId}`)}
              />
            );
          })()}


          {/* Resume last search chip — disabled on homepage */}
        </div>

        {/* Restaurant Guru-style location selector — disabled
        <HeroLocationSelector
          detectedCity={geo.detectedCity}
          confirmedAddress={geo.confirmedAddress}
          isEnabled={geo.isEnabled}
          isDetecting={geo.isDetecting}
          onAcceptGeo={geo.accept}
          onSelectCity={(city) => {
            geo.setManualCity(city);
          }}
          onOpenMap={() => setLocationDialogOpen(true)}
        />
        */}

        {/* Location Picker Dialog */}
        <LocationPickerDialog
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
          coords={geo.coords}
          detectedCity={geo.detectedCity}
          isEnabled={geo.isEnabled}
          isDetecting={geo.isDetecting}
          onUseCurrentPosition={geo.accept}
          onConfirm={(coords, address) => geo.setManualLocation(coords, address)}
          onDisableGeo={geo.decline}
        />

        {/* Listez votre entreprise — disabled
        <p className="text-2xl md:text-3xl text-black/80 font-medium mt-4">
          {language === "fr"
            ? <>Listez votre <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">entreprise</Link></>
            : language === "ar"
              ? <>أدرج <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">شركتك</Link></>
              : <>List your <Link to="/devenir-affilie" className="text-gold hover:underline font-bold">business</Link></>}
        </p>
        */}

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

      {/* Google-style voice search overlay */}
      <VoiceSearchOverlay
        isOpen={voiceStatus === "recording" || voiceStatus === "processing"}
        liveTranscript={liveTranscript}
        onClose={() => toggleRecording()}
        onFinish={() => finishRecording()}
      />

      {/* Full-screen search overlay (same as BookOnlineSlidePanel) */}
      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        onSearch={(params) => {
          setMobileSearchOpen(false);
          const qs = new URLSearchParams(params).toString();
          if (qs) navigateWithSlide(`/search?${qs}`);
        }}
        onBusinessSelect={(businessId) => {
          setMobileSearchOpen(false);
          navigateWithSlide(`/search?openBusiness=${businessId}`);
        }}
        onVoiceStart={() => {
          setMobileSearchOpen(false);
          toggleRecording();
        }}
        geoState={{
          isEnabled: geo.isEnabled,
          isDetecting: geo.isDetecting,
          detectedCity: geo.detectedCity,
          detectedNeighborhood: geo.detectedNeighborhood,
          confirmedAddress: geo.confirmedAddress,
          accept: geo.accept,
          toggle: geo.toggle,
          setManualCity: geo.setManualCity,
        }}
      />
    </section>
  );
};

export default HeroSection;
