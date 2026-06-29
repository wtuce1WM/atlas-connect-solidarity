import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookmark } from "@/hooks/useBookmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
  businessId: string;
  variant?: "gold" | "dark";
  onLoginRequired?: () => void;
}

const BookmarkButton = ({ businessId, variant = "dark", onLoginRequired }: BookmarkButtonProps) => {
  const { isBookmarked, isLoading, isLoggedIn, toggle } = useBookmark(businessId);
  const { language } = useLanguage();

  const labels = {
    fr: { save: "Sauvegarder", saved: "Sauvegardé", login: "Connectez-vous au Club pour sauvegarder" },
    en: { save: "Save", saved: "Saved", login: "Sign in to Club to save" },
    ar: { save: "حفظ", saved: "تم الحفظ", login: "سجل الدخول للنادي للحفظ" },
  };
  const t = labels[language as keyof typeof labels] || labels.fr;

  const handleClick = async () => {
    if (!isLoggedIn) {
      if (onLoginRequired) onLoginRequired();
      else window.dispatchEvent(new CustomEvent("open-club-panel"));
      return;
    }
    const wasBookmarked = isBookmarked;
    await toggle();
    import("@/lib/analytics").then(({ trackEvent, trackAhaMoment }) => {
      trackEvent(wasBookmarked ? "bookmark_remove" : "bookmark_add", { business_id: businessId });
      if (!wasBookmarked) trackAhaMoment("first_bookmark", { business_id: businessId });
    }).catch(() => {});
    import("@/lib/businessAnalytics").then(({ trackBusinessEvent }) => {
      trackBusinessEvent(businessId, wasBookmarked ? "bookmark_remove" : "bookmark_add");
    }).catch(() => {});


  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
      aria-label={isBookmarked ? t.saved : t.save}
    >
      <Heart
        className={`h-4 w-4 text-[#6050DC] ${isBookmarked ? "fill-[#6050DC]" : ""}`}
        strokeWidth={2.5}
      />
    </button>
  );
};

export default BookmarkButton;
