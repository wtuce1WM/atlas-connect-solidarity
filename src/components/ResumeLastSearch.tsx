import { useNavigate } from "react-router-dom";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, X } from "lucide-react";
import { useState } from "react";

/**
 * Small chip/banner suggesting to resume the last search.
 * Renders nothing if no history.
 */
const ResumeLastSearch = () => {
  const { history } = useSearchHistory();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || history.length === 0) return null;

  const last = history[0];
  const label =
    language === "fr" ? "Reprendre :" :
    language === "ar" ? "متابعة:" :
    "Resume:";

  const handleClick = () => {
    const params = new URLSearchParams({ q: last.query });
    if (last.city) params.set("city", last.city);
    if (last.category) params.set("category", last.category);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <button
        type="button"
        onClick={handleClick}
        className="group flex items-center gap-2 px-4 py-2 bg-muted/60 hover:bg-muted border border-border rounded-full text-sm transition-all shadow-sm"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground group-hover:underline">{last.query}</span>
        {last.city && (
          <span className="text-muted-foreground">· {last.city}</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-1 p-1 rounded-full hover:bg-muted transition-colors"
        title={language === "fr" ? "Fermer" : "Close"}
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default ResumeLastSearch;
