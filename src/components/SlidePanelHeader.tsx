import { X } from "lucide-react";

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
  toolbarLeftId?: string;
  toolbarCenterId?: string;
  toolbarRightId?: string;
}

const SlidePanelHeader = ({
  onClose,
  isExpanded,
  onToggleExpand,
  centerContent,
  closeVariant = "dark",
  toolbarLeftId = "slide-panel-toolbar-left",
  toolbarCenterId = "slide-panel-toolbar-center",
  toolbarRightId = "slide-panel-toolbar",
}: SlidePanelHeaderProps) => {
  const closeClass =
    closeVariant === "destructive"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
      : "bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity";

  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-card border-b border-border z-40 relative">
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        <button
          type="button"
          onClick={onClose}
          className={`h-9 w-9 flex items-center justify-center rounded-full ${closeClass}`}
          title="Fermer"
          aria-label="Fermer le panneau"
        >
          <X className="h-4 w-4" />
        </button>
        <div id={toolbarLeftId} className="flex items-center gap-3" />
      </div>
      {centerContent ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-semibold text-sm truncate pointer-events-auto">{centerContent}</span>
          </div>
          <div className="w-9 shrink-0" />
        </>
      ) : (
        <>
          <div id={toolbarCenterId} className="absolute inset-0 flex items-center justify-center pointer-events-none [&>*]:pointer-events-auto" />
          <div id={toolbarRightId} className="flex items-center gap-3 shrink-0 relative z-10" />
        </>
      )}
    </div>
  );
};

export default SlidePanelHeader;
