import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import type { SearchSuggestion } from "@/hooks/useSearchSuggestions";

interface Props {
  suggestions: SearchSuggestion[];
  visible: boolean;
  onSelect?: (suggestion: SearchSuggestion) => void;
  /** "bottom" = dropdown below input (default), "top" = above input */
  position?: "bottom" | "top";
}

const SearchSuggestionsDropdown = ({ suggestions, visible, onSelect, position = "bottom" }: Props) => {
  const navigate = useNavigate();

  if (!visible || suggestions.length === 0) return null;

  const handleClick = (s: SearchSuggestion) => {
    if (onSelect) {
      onSelect(s);
    } else {
      navigate(`/business/${s.id}`);
    }
  };

  const positionClass = position === "top"
    ? "bottom-full mb-1"
    : "top-full mt-1";

  return (
    <div className={`absolute left-0 right-0 ${positionClass} z-50 bg-white rounded-xl shadow-2xl border border-border overflow-hidden max-h-72 overflow-y-auto`}>
      {suggestions.map((s) => (
        <button
          key={s.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // prevent input blur before click fires
            handleClick(s);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        >
          {s.logo_url ? (
            <img
              src={s.logo_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0 bg-muted"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[s.main_category, s.city].filter(Boolean).join(" · ")}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default SearchSuggestionsDropdown;
