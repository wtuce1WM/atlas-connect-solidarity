import { useState } from "react";
import { Crown, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const FloatingClubButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { language } = useLanguage();

  // Hide on staff/affiliate backoffice pages and on the club page itself
  const hiddenPaths = ["/staff/login", "/staff/backoffice", "/affiliates", "/affiliates/dashboard", "/club"];
  if (hiddenPaths.includes(location.pathname)) return null;

  const translations = {
    fr: {
      club: "Le Club",
      welcome: "Bienvenue dans",
      clubName: "le Club OWM",
      memberTitle: "Devenir membre",
      memberDesc: "Découvrez de nouvelles manières de profiter du meilleur du Maroc et accédez à des avantages exclusifs.",
      joinBtn: "Je m'inscris",
      alreadyMember: "Vous avez déjà un compte ?",
      login: "Connectez-vous",
    },
    en: {
      club: "The Club",
      welcome: "Welcome to",
      clubName: "the OWM Club",
      memberTitle: "Become a member",
      memberDesc: "Discover new ways to enjoy the best of Morocco and access exclusive benefits.",
      joinBtn: "Join now",
      alreadyMember: "Already have an account?",
      login: "Log in",
    },
    ar: {
      club: "النادي",
      welcome: "مرحباً بكم في",
      clubName: "نادي OWM",
      memberTitle: "كن عضواً",
      memberDesc: "اكتشف طرقاً جديدة للاستمتاع بأفضل ما في المغرب والحصول على مزايا حصرية.",
      joinBtn: "سجّل الآن",
      alreadyMember: "لديك حساب بالفعل؟",
      login: "سجّل الدخول",
    },
  };

  const t = translations[language] || translations.fr;

  const isHome = location.pathname === "/";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: "#6050DC" }}
        className={`fixed ${isHome ? "bottom-6" : "bottom-[76px] md:bottom-6"} left-4 md:left-6 z-50 flex items-center gap-2 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl hover:scale-105 active:scale-95`}
        aria-label={t.club}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <Crown className="h-5 w-5" />
            <span className="font-semibold text-sm">{t.club}</span>
          </>
        )}
      </button>

      {/* Panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed bottom-0 left-0 z-50 w-full max-w-md transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
        }`}
      >
        <div className="mx-4 mb-20 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div style={{ backgroundColor: "#6050DC" }} className="p-6 text-white relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>
            <p className="text-sm opacity-90">{t.welcome}</p>
            <h2 className="text-2xl font-bold mt-1 !font-sans !not-italic">{t.clubName}</h2>
          </div>

          {/* Body */}
          <div className="bg-card p-6 text-center">
            <h3 className="text-lg font-semibold text-card-foreground mb-3 !font-sans">{t.memberTitle}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{t.memberDesc}</p>

            <Link
              to="/club"
              onClick={() => setIsOpen(false)}
              style={{ backgroundColor: "#6050DC" }}
              className="inline-block rounded-full px-8 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md"
            >
              {t.joinBtn}
            </Link>

            <p className="mt-4 text-sm text-muted-foreground">
              {t.alreadyMember}{" "}
              <Link
                to="/club"
                onClick={() => setIsOpen(false)}
                style={{ color: "#6050DC" }}
                className="font-medium hover:underline"
              >
                {t.login}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingClubButton;
