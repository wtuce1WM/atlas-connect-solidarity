import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExternalLinkItem {
  id: string;
  name: string | null;
  url: string;
  icon: string | null;
  description: string | null;
}

interface ExternalLinksFlipCardProps {
  links: ExternalLinkItem[];
  animationDelay?: string;
  className?: string;
  onOpenUrl?: (url: string, title?: string) => void;
  /** Called when the whole card is clicked (carousel mode) */
  onClick?: () => void;
  /** "carousel" = compact 2-logo card; "overlay" = full grid with all logos */
  variant?: "carousel" | "overlay";
}

const ExternalLinksFlipCard = ({
  links,
  animationDelay = "0ms",
  className = "",
  onOpenUrl,
  onClick,
  variant = "carousel",
}: ExternalLinksFlipCardProps) => {

  const deriveTitle = () => {
    const desc = links[0]?.description?.toLowerCase() || "";
    if (desc === "partenaires") return "Ils nous font confiance";
    if (desc === "recompenses") return "Nous sommes reconnus par :";
    if (desc === "certifications") return "Nous sommes certifiés par :";
    if (desc === "en_savoir_plus") return "En savoir plus";
    if (desc === "presse" || desc === "media") return "Ils parlent de nous";
    return "+ d'infos";
  };
  const cardTitle = deriveTitle();

  const handleClick = (link: ExternalLinkItem) => {
    if (!link.url || link.url === "#" || link.url === "*") return;
    if (onOpenUrl) {
      onOpenUrl(link.url, link.name || undefined);
    } else {
      window.open(link.url, "_blank", "noopener");
    }
  };

  const displayLinks = variant === "carousel" ? links.slice(0, 2) : links;

  const renderLinkButton = (link: ExternalLinkItem) => (
    <Tooltip key={link.id}>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(link); }}
          className={`flex items-center justify-center rounded-lg transition-colors overflow-hidden cursor-pointer ${link.icon ? "bg-white/30 hover:bg-white/45" : "bg-white/10 hover:bg-white/20 flex-col gap-1 px-2 py-2"}`}
        >
          {link.icon ? (
            <img
              src={link.icon}
              alt={link.name || link.url}
              className="w-full h-full object-contain p-1.5"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-white/90 text-center normal-case leading-tight line-clamp-3" style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", letterSpacing: '0.02em' }}>
              {link.name || new URL(link.url).hostname.replace('www.', '')}
            </span>
          )}
        </button>
      </TooltipTrigger>
      {link.icon && link.name && (
        <TooltipContent side="bottom" align="center" sideOffset={4} className="max-w-[150px] text-center text-xs z-[9999]">
          {link.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  if (variant === "overlay") {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className={`w-full max-w-[42rem] rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 ${className}`}
        >
          <div className="rounded-2xl p-4 text-white flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <ExternalLink className="w-4 h-4" />
                {cardTitle}
              </h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5" style={{ gridAutoRows: "3.5rem" }}>
              {displayLinks.map(renderLinkButton)}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`snap-start shrink-0 w-[16rem] h-[6.5em] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ animationDelay, animationFillMode: "forwards" }}
        onClick={onClick}
      >
        <div className="h-full rounded-2xl p-3 text-white flex flex-col pointer-events-none">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              <ExternalLink className="w-4 h-4" />
              {cardTitle}
            </h3>
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5">
            {displayLinks.map(renderLinkButton)}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ExternalLinksFlipCard;
export type { ExternalLinkItem };