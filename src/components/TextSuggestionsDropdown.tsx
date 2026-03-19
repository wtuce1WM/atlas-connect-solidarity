import { Search, Clock, X } from "lucide-react";

interface Props {
  suggestions: string[];
  visible: boolean;
  onSelect: (text: string) => void;
  position?: "bottom" | "top";
  /** Recent search entries shown above suggestions */
  recentSearches?: { id: string; query: string }[];
  onDeleteRecent?: (id: string) => void;
  onClearRecent?: () => void;
  recentLabel?: string;
  clearLabel?: string;
}

const TextSuggestionsDropdown = ({
  suggestions,
  visible,
  onSelect,
  position = "bottom",
  recentSearches = [],
  onDeleteRecent,
  onClearRecent,
  recentLabel = "Recherches récentes",
  clearLabel = "Effacer",
}: Props) => {
  const hasRecent = recentSearches.length > 0;
  const hasSuggestions = suggestions.length > 0;
  if (!visible || (!hasRecent && !hasSuggestions)) return null;

  const positionClass = position === "top" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div className={`absolute left-0 right-0 ${positionClass} z-50 bg-white rounded-xl shadow-2xl border border-border overflow-hidden max-h-72 overflow-y-auto`}>
      {/* Recent searches section */}
      {hasRecent && (
        <>
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{recentLabel}</span>
            {onClearRecent && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onClearRecent(); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {clearLabel}
              </button>
            )}
          </div>
          {recentSearches.map((entry) => (
            <div key={entry.id} className="group flex items-center w-full hover:bg-muted/50 transition-colors">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(entry.query); }}
                className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left"
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">{entry.query}</span>
              </button>
              {onDeleteRecent && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onDeleteRecent(entry.id); }}
                  className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          ))}
          {hasSuggestions && <div className="border-t border-border" />}
        </>
      )}

      {/* Popular suggestions */}
      {suggestions.map((text, i) => (
        <button
          key={i}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(text);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{text}</span>
        </button>
      ))}
    </div>
  );
};

export default TextSuggestionsDropdown;
