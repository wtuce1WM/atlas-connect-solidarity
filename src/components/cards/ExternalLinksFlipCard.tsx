import { useState } from "react";
import { ExternalLink, ChevronRight } from "lucide-react";

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

  const frontLinks = links.slice(0, 3);
  const backLinks = links.slice(3, 6);
  const hasBack = backLinks.length > 0;

  const handleClick = (link: ExternalLinkItem) => {
    if (onOpenUrl) {
      onOpenUrl(link.url, link.name || undefined);
    } else {
      window.open(link.url, "_blank", "noopener");
    }
  };

  const renderLink = (link: ExternalLinkItem) => (
    <button
      key={link.id}
      onClick={(e) => { e.stopPropagation(); handleClick(link); }}
      className="flex items-center w-full text-left rounded-xl bg-white/10 hover:bg-white/20 transition-colors overflow-hidden group cursor-pointer normal-case tracking-normal h-[4.5rem]"
    >
      {/* Left half: logo/icon */}
      <div className="w-1/2 h-full flex items-center justify-center bg-white/5 shrink-0">
        {link.icon ? (
          <img
            src={link.icon}
            alt=""
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <ExternalLink className="w-6 h-6 text-white/40" />
        )}
      </div>
      {/* Right half: title */}
      <div className="w-1/2 h-full flex items-center px-3">
        <span className="text-xs leading-tight text-white/90 group-hover:text-white line-clamp-3 flex-1" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
          {link.name || "Lien externe"}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0 ml-1" />
      </div>
    </button>
  );

  return (
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
          className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              <ExternalLink className="w-4 h-4" />
              {cardTitle}
            </h3>
            {hasBack && (
              <button
                onClick={() => setFlipped(true)}
                className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
              >
                +{backLinks.length} de plus →
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {frontLinks.map(renderLink)}
          </div>
        </div>

        {/* BACK */}
        {hasBack && (
          <div
            className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                <ExternalLink className="w-4 h-4" />
                + d'infos
              </h3>
              <button
                onClick={() => setFlipped(false)}
                className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
              >
                ← Retour
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {backLinks.map(renderLink)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExternalLinksFlipCard;
export type { ExternalLinkItem };
