import { useState } from "react";
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
}

const ExternalLinksFlipCard = ({
  links,
  animationDelay = "0ms",
  className = "",
  onOpenUrl,
}: ExternalLinksFlipCardProps) => {
  const [flipped, setFlipped] = useState(false);

  const deriveTitle = () => {
    const desc = links[0]?.description?.toLowerCase() || "";
    if (desc === "partenaires") return "Ils nous font confiance";
    if (desc === "recompenses") return "Nous sommes reconnus par :";
    if (desc === "certifications") return "Nous sommes certifiés par :";
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

  const frontLinks = links.slice(0, 9);
  const backLinks = links.slice(9);
  const hasBack = backLinks.length > 0;

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
            <span className="text-xs text-white/90 text-center normal-case leading-tight line-clamp-3" style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '0.02em' }}>
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

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`snap-start shrink-0 w-[20rem] h-[18em] md:h-[24em] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 ${className}`}
        style={{ perspective: "1000px", animationDelay, animationFillMode: "forwards" }}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 rounded-2xl p-4 text-white flex flex-col"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                <ExternalLink className="w-4 h-4" />
                {cardTitle}
              </h3>
              {hasBack && (
                <button
                  onClick={() => setFlipped(true)}
                  className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
                >
                  +{backLinks.length} →
                </button>
              )}
            </div>
            <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-1.5">
              {frontLinks.map(renderLinkButton)}
            </div>
          </div>

          {/* BACK */}
          {hasBack && (
            <div
              className="absolute inset-0 rounded-2xl p-4 text-white flex flex-col"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                  <ExternalLink className="w-4 h-4" />
                  {cardTitle}
                </h3>
                <button
                  onClick={() => setFlipped(false)}
                  className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
                >
                  ← Retour
                </button>
              </div>
              <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-1.5">
                {backLinks.map(renderLinkButton)}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ExternalLinksFlipCard;
export type { ExternalLinkItem };
