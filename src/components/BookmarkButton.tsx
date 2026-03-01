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
      toast({ title: t.login });
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        window.dispatchEvent(new CustomEvent("open-club-panel"));
      }
      return;
    }
    await toggle();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className={`${
        isBookmarked
          ? "bg-[#6050DC]/10 border-[#6050DC] text-[#6050DC] hover:bg-[#6050DC]/20"
          : variant === "gold"
            ? "border-[#6050DC]/30 text-[#6050DC] hover:bg-[#6050DC]/10"
            : "border-border text-[#6050DC]"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${isBookmarked ? "fill-[#6050DC]" : ""}`}
      />
    </Button>
  );
};

export default BookmarkButton;
