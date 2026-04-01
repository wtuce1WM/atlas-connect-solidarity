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
  const deriveTitle = () => {
    const desc = links[0]?.description?.toLowerCase() || "";
    if (desc === "partenaires") return "Ils nous font confiance";
    if (desc === "presse" || desc === "media") return "Ils parlent de nous";
    return "+ d'infos";
  };
  const cardTitle = deriveTitle();

  const handleClick = (link: ExternalLinkItem) => {
    if (onOpenUrl) {
      onOpenUrl(link.url, link.name || undefined);
    } else {
      window.open(link.url, "_blank", "noopener");
    }
  };

  // Determine grid: up to 10 items, use a 2-col x 5-row grid
  const cols = links.length <= 4 ? 2 : links.length <= 6 ? 3 : links.length <= 8 ? 4 : 5;

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] h-[18em] md:h-[24em] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 ${className}`}
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex flex-col h-full p-4 text-white">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5 normal-case tracking-normal" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            <ExternalLink className="w-4 h-4" />
            {cardTitle}
          </h3>
        </div>
        <div
          className="flex-1 grid gap-1.5 auto-rows-fr"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {links.map((link) => (
            <button
              key={link.id}
              onClick={(e) => { e.stopPropagation(); handleClick(link); }}
              className="flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors overflow-hidden cursor-pointer"
            >
              {link.icon ? (
                <img
                  src={link.icon}
                  alt={link.name || ""}
                  className="w-full h-full object-contain p-1.5"
                  loading="lazy"
                />
              ) : (
                <ExternalLink className="w-5 h-5 text-white/40" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExternalLinksFlipCard;
export type { ExternalLinkItem };
