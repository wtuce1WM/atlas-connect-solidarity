import { useState } from "react";
import { Star, ExternalLink, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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
  reviewTexts,
  language,
  animationDelay = "0ms",
  className = "",
}: ReviewsFlipCardProps) => {
  const [flipped, setFlipped] = useState(false);
  const [translatedTexts, setTranslatedTexts] = useState<string[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleFlipToReviews = async () => {
    setFlipped(true);
    const targetLang = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
    const needsTranslation = reviewTexts.some((r) => r.language && r.language !== targetLang);
    if (needsTranslation && !translatedTexts) {
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("translate-reviews", {
          body: {
            reviews: reviewTexts.filter((r) => r.text).map((r) => ({ text: r.text })),
            targetLanguage: targetLang,
          },
        });
        if (!error && data?.translations?.length) {
          setTranslatedTexts(data.translations);
        }
      } catch (e) {
        console.error("Translation error:", e);
      }
      setIsTranslating(false);
    }
  };

  const activePlatforms = platforms.filter((p) => p.rating && p.count);

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
        {/* FRONT — Platform ratings */}
        <div
          className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-2">
            {language === "en" ? "Reviews" : "Avis clients"}
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-gold fill-gold" />
            <span className="text-2xl font-bold text-white">{avgOn20}</span>
            <span className="text-sm text-white/60">/20</span>
            {totalReviewCount > 0 && (
              <span className="text-xs text-white/50 ml-1">
                ({totalReviewCount.toLocaleString("fr-FR")} avis)
              </span>
            )}
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
          {reviewTexts.length > 0 && (
            <button
              onClick={handleFlipToReviews}
              className="mt-3 w-full text-center text-xs text-gold hover:text-white transition-colors uppercase tracking-wider font-semibold py-1.5 border-t border-white/10"
            >
              <MessageCircle className="h-3 w-3 inline mr-1" />
              {language === "en" ? "Read reviews" : "Lire les avis"}
            </button>
          )}
        </div>

        {/* BACK — Translated review texts */}
        <div
          className="absolute inset-0 rounded-2xl p-4 text-white overflow-y-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">
              {language === "en" ? "Reviews" : "Avis clients"}
            </p>
            <button
              onClick={() => setFlipped(false)}
              className="text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider"
            >
              ← {language === "en" ? "Back" : "Retour"}
            </button>
          </div>
          {isTranslating ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-t border-white/10 pt-2 space-y-1">
                  <Skeleton className="h-3 w-24 bg-white/10" />
                  <Skeleton className="h-3 w-full bg-white/10" />
                  <Skeleton className="h-3 w-3/4 bg-white/10" />
                </div>
              ))}
              <p className="text-[10px] text-white/40 text-center mt-2">
                {language === "en" ? "Translating…" : "Traduction en cours…"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewTexts.slice(0, 3).map((review, i) => {
                const displayText = translatedTexts?.[i] || review.text;
                return (
                  <div key={i} className="border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageCircle className="h-3 w-3 text-white/40" />
                      <span className="text-xs font-medium text-white/70">
                        {review.author_name || review.source}
                      </span>
                      {review.rating && (
                        <span className="text-xs text-gold ml-auto">
                          {"★".repeat(Math.round(review.rating))}
                        </span>
                      )}
                    </div>
                    {displayText && <p className="text-xs text-white/70 line-clamp-4">{displayText}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsFlipCard;

export type { ReviewSource, ReviewText };
