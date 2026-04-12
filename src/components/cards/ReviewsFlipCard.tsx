import { useState } from "react";
import { Star, ExternalLink } from "lucide-react";

interface ReviewSource {
  name: string;
  rating: number | null;
  count: number | null;
  url: string | null;
}

interface ReviewText {
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  language?: string | null;
}

interface ReviewsFlipCardProps {
  avgOn20: number;
  totalReviewCount: number;
  platforms: ReviewSource[];
  reviewTexts: ReviewText[];
  language: string;
  animationDelay?: string;
  className?: string;
}

const ReviewsFlipCard = ({
  avgOn20,
  totalReviewCount,
  platforms,
  language,
  animationDelay = "0ms",
  className = "",
}: ReviewsFlipCardProps) => {
  const [flipped, setFlipped] = useState(false);

  const activePlatforms = platforms.filter((p) => p.rating && p.count);
  const backHeight = Math.max(15, 4 + activePlatforms.length * 2.8);

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 transition-[height] duration-500 ease-in-out ${className}`}
      style={{
        perspective: "1000px",
        animationDelay,
        animationFillMode: "forwards",
        height: flipped ? `${backHeight}em` : "7em",
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT — Compact global rating */}
        <div
          className="absolute inset-0 rounded-2xl px-4 text-white flex items-center justify-between cursor-pointer"
          style={{ backfaceVisibility: "hidden" }}
          onClick={() => activePlatforms.length > 0 && setFlipped(true)}
        >
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-gold fill-gold" />
            <span className="text-2xl font-bold text-white">{avgOn20}</span>
            <span className="text-sm text-white/60">/20</span>
            {totalReviewCount > 0 && (
              <span className="text-xs text-white/50 ml-1">
                ({totalReviewCount.toLocaleString("fr-FR")} {language === "en" ? "reviews" : "avis"})
              </span>
            )}
          </div>
          {activePlatforms.length > 0 && (
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              {language === "en" ? "Details ›" : "Détail ›"}
            </span>
          )}
        </div>

        {/* BACK — Platform breakdown */}
        <div
          className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto overscroll-contain"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">
              {language === "en" ? "By platform" : "Détail par plateforme"}
            </p>
            <button
              onClick={() => setFlipped(false)}
              className="text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider"
            >
              ← {language === "en" ? "Back" : "Retour"}
            </button>
          </div>
          <div className="space-y-2">
            {activePlatforms.map((p) => (
              <a
                key={p.name}
                href={p.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between text-sm border-t border-white/10 pt-2 ${
                  p.url ? "hover:text-gold transition-colors" : "pointer-events-none"
                }`}
              >
                <span className="text-white/80 font-medium">{p.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-gold font-semibold">{p.rating}/5</span>
                  <span className="text-white/50 text-xs">({p.count?.toLocaleString("fr-FR")})</span>
                  {p.url && <ExternalLink className="h-3 w-3 text-white/40" />}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsFlipCard;

export type { ReviewSource, ReviewText };
