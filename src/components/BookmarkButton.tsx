import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookmark } from "@/hooks/useBookmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BookmarkButtonProps {
  businessId: string;
  variant?: "gold" | "dark";
}

const BookmarkButton = ({ businessId, variant = "dark" }: BookmarkButtonProps) => {
  const { isBookmarked, isLoading, isLoggedIn, toggle } = useBookmark(businessId);
  const { language } = useLanguage();
  const navigate = useNavigate();

  const labels = {
    fr: { save: "Sauvegarder", saved: "Sauvegardé", login: "Connectez-vous au Club pour sauvegarder" },
    en: { save: "Save", saved: "Saved", login: "Sign in to Club to save" },
    ar: { save: "حفظ", saved: "تم الحفظ", login: "سجل الدخول للنادي للحفظ" },
  };
  const t = labels[language as keyof typeof labels] || labels.fr;

  const handleClick = async () => {
    if (!isLoggedIn) {
      toast({ title: t.login });
      navigate("/club");
      return;
    }
    await toggle();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={`gap-1.5 ${
        isBookmarked
          ? "bg-gold/10 border-gold text-gold hover:bg-gold/20"
          : variant === "gold"
            ? "border-gold/30 text-gold hover:bg-gold/10"
            : "border-border"
      }`}
    >
      <Bookmark
        className={`h-4 w-4 ${isBookmarked ? "fill-gold" : ""}`}
      />
      <span className="hidden sm:inline">{isBookmarked ? t.saved : t.save}</span>
    </Button>
  );
};

export default BookmarkButton;
