import { useState } from "react";
import { ExternalLink } from "lucide-react";

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
    <button
      key={link.id}
      onClick={(e) => { e.stopPropagation(); handleClick(link); }}
      className="flex items-center justify-center rounded-lg bg-white/30 hover:bg-white/45 transition-colors overflow-hidden cursor-pointer"
    >
      {link.icon ? (
        <img
          src={link.icon}
          alt={link.name || link.url}
          title={link.name || ""}
          className="w-full h-full object-contain p-1.5"
          loading="lazy"
        />
      ) : (
        <ExternalLink className="w-5 h-5 text-white/40" />
      )}
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
  );
};

export default ExternalLinksFlipCard;
export type { ExternalLinkItem };
