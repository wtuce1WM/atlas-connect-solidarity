import { X } from "lucide-react";

interface SlidePanelHeaderProps {
  onClose: () => void;
  /** Optional center content (e.g. title text) */
  centerContent?: React.ReactNode;
  /** Close button style variant */
  closeVariant?: "dark" | "destructive" | "inverse";
  /** IDs for portal targets — defaults to slide-panel-toolbar-center / slide-panel-toolbar */
  toolbarLeftId?: string;
  toolbarCenterId?: string;
  toolbarRightId?: string;
  /** On mobile/tablet, float over content with transparent bg (for immersive media panels) */
  mobileTransparent?: boolean;
  /** Always use dark/transparent style regardless of breakpoint */
  alwaysDark?: boolean;
  /** Extra classes on the close-button container (e.g. to shift it right to align over a logo) */
  closeButtonContainerClassName?: string;
  /** Apply glassmorphism effect on the close button (matches phone/whatsapp toolbar buttons) */
  glassClose?: boolean;
}

const SlidePanelHeader = ({
  onClose,
  centerContent,
  closeVariant = "dark",
  toolbarLeftId = "slide-panel-toolbar-left",
  toolbarCenterId = "slide-panel-toolbar-center",
  toolbarRightId = "slide-panel-toolbar",
  mobileTransparent = false,
  alwaysDark = false,
  closeButtonContainerClassName = "",
  glassClose = false,
}: SlidePanelHeaderProps) => {
  const closeClass = closeVariant === "destructive"
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
    : closeVariant === "inverse"
    ? "bg-black text-white shadow-2xl hover:bg-black/90 transition-colors"
    : "text-black shadow-2xl hover:opacity-90 transition-opacity";
  const closeStyle = closeVariant === "dark" ? { backgroundColor: "#F1F1F1" } : undefined;

  const baseClass = alwaysDark
    ? "absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] bg-transparent z-[75] overflow-visible"
    : mobileTransparent
    ? "absolute top-0 left-0 right-0 lg:relative flex items-center justify-between px-4 py-2 bg-transparent lg:bg-card lg:border-b lg:border-border z-[75] overflow-visible"
    : "shrink-0 flex items-center justify-between px-4 py-2 bg-card border-b border-border z-[75] relative overflow-visible";

  return (
    <div dir="ltr" className={baseClass}>

      <div className={`flex items-center gap-3 shrink-0 relative z-10 ${closeButtonContainerClassName}`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className={`h-9 w-9 flex items-center justify-center rounded-full touch-manipulation ${closeClass} ${glassClose ? "glass-toolbar-btn" : ""}`}
          style={closeStyle}
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
