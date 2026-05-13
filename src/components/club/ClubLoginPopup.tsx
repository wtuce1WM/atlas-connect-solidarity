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

const ClubLoginPopup = () => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = T[language as keyof typeof T] || T.fr;

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

  if (!open || userId) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[90%] max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ backgroundColor: "#6050DC" }} className="p-3 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs sm:text-sm opacity-90">{t.welcome}</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 !font-sans !not-italic">{t.clubName}</h2>
        </div>
        <div className="bg-card p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-card-foreground mb-1 sm:mb-2 !font-sans text-center">
            {t.title}
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 sm:mb-5 text-center">{t.desc}</p>
          <ClubAuthPanel
            redirectPath={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default ClubLoginPopup;
