import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VideoIdSearchInputProps {
  /** Array of all video IDs currently displayed */
  videoIds: string[];
  /** Optional class */
  className?: string;
}

/**
 * Small search input that highlights and scrolls to a video card by ID.
 * Video card DOM elements must have `data-video-id={id}` attribute.
 */
const VideoIdSearchInput = ({ videoIds, className }: VideoIdSearchInputProps) => {
  const [query, setQuery] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearHighlight = useCallback(() => {
    document.querySelectorAll("[data-video-highlight]").forEach((el) => {
      el.removeAttribute("data-video-highlight");
      (el as HTMLElement).style.removeProperty("outline");
      (el as HTMLElement).style.removeProperty("outline-offset");
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      clearHighlight();
      setMatchId(null);
      return;
    }

    const q = query.trim().toLowerCase();
    const found = videoIds.find((id) => id.toLowerCase().includes(q));
    setMatchId(found || null);

    clearHighlight();

    if (found) {
      const el = document.querySelector(`[data-video-id="${found}"]`) as HTMLElement | null;
      if (el) {
        el.setAttribute("data-video-highlight", "true");
        el.style.outline = "3px solid hsl(var(--primary))";
        el.style.outlineOffset = "2px";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [query, videoIds, clearHighlight]);

  // Cleanup on unmount
  useEffect(() => () => clearHighlight(), [clearHighlight]);

  const clear = () => {
    setQuery("");
    setMatchId(null);
    clearHighlight();
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Coller un ID vidéo…"
        className={cn(
          "h-7 pl-7 pr-7 text-xs font-mono w-[320px]",
          query && !matchId && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {query && (
        <button
          onClick={clear}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default VideoIdSearchInput;
