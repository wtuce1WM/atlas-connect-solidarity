import { X, Maximize2, Minimize2 } from "lucide-react";

interface SlidePanelHeaderProps {
  onClose: () => void;
  /** If provided, shows Maximize2/Minimize2 toggle button */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** Optional center content (e.g. title text) */
  centerContent?: React.ReactNode;
  /** Close button style variant */
  closeVariant?: "dark" | "destructive";
  /** IDs for portal targets — defaults to slide-panel-toolbar-center / slide-panel-toolbar */
  toolbarCenterId?: string;
  toolbarRightId?: string;
}

const SlidePanelHeader = ({
  onClose,
  isExpanded,
  onToggleExpand,
  centerContent,
  closeVariant = "dark",
  toolbarCenterId = "slide-panel-toolbar-center",
  toolbarRightId = "slide-panel-toolbar",
}: SlidePanelHeaderProps) => {
  const closeClass =
    closeVariant === "destructive"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
      : "bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity";

  return (
    <div className="shrink-0 flex items-center px-4 py-2 bg-card border-b border-border z-40">
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        <button
          onClick={onClose}
          className={`h-9 w-9 flex items-center justify-center rounded-full ${closeClass}`}
          title="Fermer"
          aria-label="Fermer le panneau"
        >
          <X className="h-4 w-4" />
        </button>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-card text-foreground border-2 border-border shadow-sm hover:bg-muted transition-colors"
            title={isExpanded ? "Réduire" : "Agrandir"}
            aria-label={isExpanded ? "Réduire le panneau" : "Agrandir le panneau"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>
      {centerContent ? (
        <>
          <span className="flex-1 text-center font-semibold text-sm truncate">{centerContent}</span>
          <div className="w-9" />
        </>
      ) : (
        <>
          <div id={toolbarCenterId} className="flex-1 flex items-center justify-center gap-4" />
          <div id={toolbarRightId} className="flex items-center gap-3 shrink-0" />
        </>
      )}
    </div>
  );
};

export default SlidePanelHeader;
