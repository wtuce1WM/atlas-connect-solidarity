import { ReactNode } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Popup Club bleu « Bienvenue dans le Club OWM » — source unique.
 * Utilisé par GenericVideoTimelineOverlay (viewer vidéo) et
 * BookOnlineSlidePanel (fiche business) : coquille bleue + header,
 * le contenu (auth ou sauvegarde) est passé en children.
 */
export const clubPopupTranslations = {
  fr: {
    club: "Le Club",
    welcome: "Bienvenue dans",
    clubName: "le Club OWM",
    memberTitle: "Sauvegardez vos coups de cœur",
    memberDesc: "Connectez-vous au Club OWM pour sauvegarder les lieux découverts dans cette vidéo et y revenir à tout moment.",
    memberDescGeneric: "Connectez-vous au Club OWM pour sauvegarder vos lieux préférés.",
    joinBtn: "Je m'inscris",
    alreadyMember: "Vous avez déjà un compte ?",
    login: "Connectez-vous",
    saveTitle: "Sauvegarder mes coups de cœur",
    saveDesc: "Ajoutez les lieux de cette vidéo à vos favoris.",
    saveAll: "Tout sauvegarder",
    saved: "Sauvegardé",
    noItems: "Aucun lieu à sauvegarder pour le moment.",
    saveBtn: "SAUVEGARDER",
    clubBtn: "LE CLUB",
    toastSaved: "Ajouté à vos favoris",
    toastAllSaved: "Tous les lieux ont été sauvegardés",
  },
  en: {
    club: "The Club",
    welcome: "Welcome to",
    clubName: "the OWM Club",
    memberTitle: "Save your favorites",
    memberDesc: "Sign in to the OWM Club to save the places you discover in this video and revisit them anytime.",
    memberDescGeneric: "Sign in to the OWM Club to save your favorite places.",
    joinBtn: "Join now",
    alreadyMember: "Already have an account?",
    login: "Log in",
    saveTitle: "Save your favorites",
    saveDesc: "Add the places from this video to your favorites.",
    saveAll: "Save all",
    saved: "Saved",
    noItems: "No places to save yet.",
    saveBtn: "SAVE",
    clubBtn: "THE CLUB",
    toastSaved: "Added to your favorites",
    toastAllSaved: "All places have been saved",
  },
  ar: {
    club: "النادي",
    welcome: "مرحباً بكم في",
    clubName: "نادي OWM",
    memberTitle: "احفظ أماكنك المفضلة",
    memberDesc: "سجّل الدخول إلى نادي OWM لحفظ الأماكن التي تكتشفها في هذا الفيديو والعودة إليها في أي وقت.",
    memberDescGeneric: "سجّل الدخول إلى نادي OWM لحفظ أماكنك المفضلة.",
    joinBtn: "سجّل الآن",
    alreadyMember: "لديك حساب بالفعل؟",
    login: "سجّل الدخول",
    saveTitle: "احفظ أماكنك المفضلة",
    saveDesc: "أضف أماكن هذا الفيديو إلى مفضلتك.",
    saveAll: "احفظ الكل",
    saved: "تم الحفظ",
    noItems: "لا توجد أماكن للحفظ بعد.",
    saveBtn: "احفظ",
    clubBtn: "النادي",
    toastSaved: "تمت الإضافة إلى مفضلتك",
    toastAllSaved: "تم حفظ جميع الأماكن",
  },
} as const;

interface Props {
  onClose: () => void;
  children: ReactNode;
}

const ClubBlueAuthPopup = ({ onClose, children }: Props) => {
  const { language } = useLanguage();
  const t = clubPopupTranslations[language as keyof typeof clubPopupTranslations] || clubPopupTranslations.fr;

  return (
    <div
      className="absolute inset-0 z-[90] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="club-popup-body w-full max-w-md max-h-[calc(100dvh-12rem)] md:max-h-[calc(100dvh-14rem)] lg:max-h-none overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-6 text-white relative bg-transparent">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs sm:text-sm opacity-90">{t.welcome}</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 !font-sans !not-italic">{t.clubName}</h2>
        </div>

        <style>{`
          @keyframes clubShimmerOnce {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(300%) skewX(-20deg); }
          }
          .club-popup-body { position: relative; overflow: hidden; background: linear-gradient(to bottom, #194CFF 0%, #6E8FFF 12%, #BED1FF 32%, #BED1FF 100%); }
          .club-popup-body::before {
            content: "";
            position: absolute;
            top: 0; bottom: 0;
            width: 50%;
            left: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.1) 80%, transparent 100%);
            transform: translateX(-150%) skewX(-20deg);
            animation: clubShimmerOnce 0.8s cubic-bezier(0.25, 1, 0.5, 1) 0.45s 1 forwards;
            pointer-events: none;
            z-index: 0;
          }
          .club-popup-body > * { position: relative; z-index: 1; }
        `}</style>
        {children}
      </div>
    </div>
  );
};

export default ClubBlueAuthPopup;
