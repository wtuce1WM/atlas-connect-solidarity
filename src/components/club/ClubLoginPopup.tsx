import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ClubAuthPanel from "./ClubAuthPanel";

const T = {
  fr: { welcome: "Bienvenue dans", clubName: "le Club OWM", title: "Sauvegardez vos coups de cœur", desc: "Connectez-vous au Club OWM pour sauvegarder vos lieux préférés." },
  en: { welcome: "Welcome to", clubName: "the OWM Club", title: "Save your favorites", desc: "Sign in to the OWM Club to save your favorite places." },
  ar: { welcome: "مرحباً بكم في", clubName: "نادي OWM", title: "احفظ أماكنك المفضلة", desc: "سجّل الدخول إلى نادي OWM لحفظ أماكنك المفضلة." },
} as const;

const registry: object[] = [];

const ClubLoginPopup = () => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const { language } = useLanguage();
  const t = T[language as keyof typeof T] || T.fr;

  // Une seule instance visible à la fois : plusieurs surfaces montent ce popup
  // (SearchPage, HomeBottomBar, viewer vidéo…). La dernière montée gagne — c'est
  // celle du panneau ouvert (slide panel), variante préférée.
  useEffect(() => {
    const token = {};
    registry.push(token);
    const sync = () => setIsOwner(registry[registry.length - 1] === token);
    sync();
    window.dispatchEvent(new Event("club-popup-registry"));
    window.addEventListener("club-popup-registry", sync);
    return () => {
      const i = registry.indexOf(token);
      if (i >= 0) registry.splice(i, 1);
      window.removeEventListener("club-popup-registry", sync);
      window.dispatchEvent(new Event("club-popup-registry"));
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) setOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-generic-club-popup", handler);
    return () => window.removeEventListener("open-generic-club-popup", handler);
  }, []);

  const visible = open && !userId && isOwner;

  // Notifie les surfaces hôtes (chips badges du viewer…) pour qu'elles s'effacent.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("club-popup-state", { detail: { open: visible } }));
    return () => {
      window.dispatchEvent(new CustomEvent("club-popup-state", { detail: { open: false } }));
    };
  }, [visible]);

  if (!visible) return null;


  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-[98%] sm:w-[90%] max-w-lg bg-[#ECD6B8]/60 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-neutral-100 text-black shadow-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 stroke-[2.5]" />
        </button>
        <p className="text-xs sm:text-sm text-white/90 text-center">{t.welcome}</p>
        <h2 className="text-xl sm:text-2xl font-bold mt-0.5 mb-2 !font-sans !not-italic text-center text-white">{t.clubName}</h2>
        <h3 className="text-sm sm:text-base font-semibold text-white mb-1 !font-sans text-center">
          {t.title}
        </h3>
        <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-5 text-center">{t.desc}</p>
        <ClubAuthPanel
          redirectPath={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"}
          onSuccess={() => setOpen(false)}
        />
      </div>
    </div>
  );
};

export default ClubLoginPopup;
