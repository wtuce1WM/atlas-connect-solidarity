import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, BedDouble, UtensilsCrossed, Mountain, Sparkles, ShoppingBag, MapPin, X } from "lucide-react";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

import logoGoldOverlay from "@/assets/logoGOLDsimple.webp";

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
import heroVideoAsset from "@/assets/hero-video.mp4.asset.json";
import heroHomeAsset from "@/assets/hero-home.webp.asset.json";
import iphoneMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";

const HS_T = {
  fr: { useLocationQ: "Utiliser votre position pour affiner les résultats ?", changeAnytime: "Vous pouvez changer ce choix à tout moment.", noThanks: "Non merci", enable: "Activer" },
  en: { useLocationQ: "Use your location to refine results?", changeAnytime: "You can change this anytime.", noThanks: "No thanks", enable: "Enable" },
  ar: { useLocationQ: "استخدام موقعك لتحسين النتائج؟", changeAnytime: "يمكنك تغيير هذا الخيار في أي وقت.", noThanks: "لا شكراً", enable: "تفعيل" },
} as const;

const HeroSection = () => {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const { t, language } = useLanguage();
  const T = (HS_T as any)[language] || HS_T.fr;

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
  const { status: voiceStatus, toggleRecording, finishRecording, liveTranscript, audioLevel, micReady } = useVoiceSearch({
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
      {/* Hero Image — affichée intégralement sous le header, sans coupe latérale */}
      <img
        src={heroHomeAsset.url}
        alt=""
        className="block w-full h-auto"
        loading="eager"
      />



      {/* Content */}
      <style>{`
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-gentle {
          animation: float-gentle 4.5s ease-in-out infinite;
        }
      `}</style>
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-16">
          
          {/* Left Side: Titre + Texte + Search */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full max-w-2xl">
            <p className="text-lg md:text-base text-foreground/70 font-medium tracking-wide">
              {language === "ar" ? "أول منصة تجارة إلكترونية تضامنية في المغرب" : language === "en" ? "1st solidarity e-commerce platform in Morocco" : "1ère plateforme de e-commerce solidaire au Maroc"}
            </p>

            {/* Titre dynamique — masqué sur mobile, visible tablette+ */}
            <h1 className="hidden md:block text-3xl md:text-4xl lg:text-5xl font-bold text-black max-w-xl">
              {(() => {
                const texts = {
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
                return line2 ? <>{line1}<br />{line2}</> : line1;
              })()}
            </h1>

            {/* Search Bar + Tabs */}
            <div className="w-full" ref={searchContainerRef}>
              {/* Category Tabs — une seule ligne, scroll si besoin */}
              <div
                ref={tabsRef}
                className="flex items-center w-full justify-start md:justify-start gap-4 md:gap-6 mb-6 overflow-x-auto scrollbar-hide pb-1 px-1 md:px-0"
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
                const placeholders = {
                  all: { fr: "Inspirez-vous", en: "Get inspired", ar: "استلهم" },
                  "Hôtellerie": { fr: "Trouvez les meilleurs hôtels & riads", en: "Find the best hotels & riads", ar: "اعثر على أفضل الفنادق والرياضات" },
                  "Restauration": { fr: "Trouvez un bon restaurant", en: "Find a great restaurant", ar: "اعثر على مطعم جيد" },
                  "Tourisme": { fr: "Trouvez une activité inoubliable", en: "Find an unforgettable activity", ar: "اعثر على نشاط لا يُنسى" },
                  "Commerce": { fr: "Trouvez les meilleures boutiques", en: "Find the best shops", ar: "اعثر على أفضل المتاجر" },
                  "Bien-être": { fr: "Trouvez un spa ou hammam", en: "Find a spa ou hammam", ar: "اعثر على سبا أو حمام" },
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

              {/* Play video CTA */}
              <div className="mt-20 md:mt-5 flex justify-center md:justify-start">
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="inline-flex items-center gap-3 text-black hover:opacity-80 transition-opacity"
                  aria-label="Play video"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-full bg-black text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="text-base font-medium">
                    {language === "ar" ? "تشغيل الفيديو" : language === "en" ? "Play video" : "Voir la vidéo"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Image with floating effect (visible on md/lg) */}
          {/* <div className="hidden md:block w-[260px] lg:w-[320px] shrink-0 relative animate-float-gentle select-none pointer-events-none">
            <img
              src={iphoneMockupAsset.url}
              alt="iPhone Mockup"
              className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              loading="eager"
            />
          </div> */}

        </div>

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
      </div>

      {/* Video lightbox */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setVideoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setVideoOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          <video
            src={heroVideoAsset.url}
            className="max-w-full max-h-full"
            autoPlay
            controls
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Geolocation consent banner */}

      {geo.showBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl px-5 py-4 flex items-start gap-3 max-w-md w-[calc(100%-2rem)]">
          <MapPin className="h-5 w-5 text-gold mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {T.useLocationQ}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {T.changeAnytime}
            </p>
            <div className="flex gap-2 mt-3 justify-end">
              <Button variant="ghost" size="sm" onClick={geo.decline}>
                {T.noThanks}
              </Button>
              <Button size="sm" onClick={geo.accept} className="bg-gold text-black hover:bg-gold/90">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {T.enable}
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
        audioLevel={audioLevel}
        micReady={micReady}
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
