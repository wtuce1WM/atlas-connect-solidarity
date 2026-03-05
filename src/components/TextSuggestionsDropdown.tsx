import { Search } from "lucide-react";

interface Props {
  suggestions: string[];
  visible: boolean;
  onSelect: (text: string) => void;
  position?: "bottom" | "top";
}

const TextSuggestionsDropdown = ({ suggestions, visible, onSelect, position = "bottom" }: Props) => {
  if (!visible || suggestions.length === 0) return null;

  const positionClass = position === "top" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div className={`absolute left-0 right-0 ${positionClass} z-50 bg-white rounded-xl shadow-2xl border border-border overflow-hidden max-h-72 overflow-y-auto`}>
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
