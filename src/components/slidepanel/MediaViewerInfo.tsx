import React from "react";
import { MapPin, Star } from "lucide-react";

/**
 * Couche d'information « viewer vidéo » (style Instagram / TikTok) posée sur le média.
 * Remplace l'ancien Toggle Afficher/Masquer + bouton « + » :
 * TOUTE la zone est cliquable et ouvre l'overlay Full Description.
 */
interface MediaViewerInfoProps {
  name: string;
  city?: string | null;
  neighborhood?: string | null;
  avgOn20: number | null;
  totalReviewCount: number;
  /** Hook, sinon début de description en texte brut */
  teaser?: string | null;
  language?: string;
  onOpen: () => void;
  /** Drapeaux des langues (desktop) */
  flagsSlot?: React.ReactNode;
  /** Sans fond/bordure : le fond est fourni par le conteneur parent */
  bare?: boolean;
}


const MORE: Record<string, string> = { fr: "plus", en: "more", ar: "المزيد" };
const REVIEWS: Record<string, string> = { fr: "avis", en: "reviews", ar: "آراء" };
const OPEN_ARIA: Record<string, string> = {
  fr: "Ouvrir la description complète",
  en: "Open full description",
  ar: "افتح الوصف الكامل",
};

const MediaViewerInfo = ({
  name,
  city,
  neighborhood,
  avgOn20,
  totalReviewCount,
  teaser,
  language = "fr",
  onOpen,
  flagsSlot,
  bare = false,
}: MediaViewerInfoProps) => {
  const lang = (language in MORE ? language : "fr") as keyof typeof MORE;
  const place = [city, neighborhood].filter(Boolean).join(", ");
  // Tap = ouvrir ; swipe vertical = laissé au panneau (aucun stopPropagation)
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const moved = React.useRef(false);

  return (
    <div className="w-full shrink-0 pointer-events-auto relative z-30">
      {flagsSlot}
      <div
        role="button"
        tabIndex={0}
        aria-label={OPEN_ARIA[lang]}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpen(); }
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
          moved.current = false;
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t || !touchStart.current) return;
          if (Math.abs(t.clientY - touchStart.current.y) > 8 || Math.abs(t.clientX - touchStart.current.x) > 8) {
            moved.current = true;
          }
        }}
        onTouchEnd={(e) => {
          if (moved.current) return; // swipe : ne rien intercepter
          e.stopPropagation();
          e.preventDefault();
          onOpen();
        }}

        /* text-transform/letter-spacing forcés en inline : index.css impose uppercase sur [role="button"] */
        style={{ textTransform: "none", letterSpacing: "normal" }}
        className={`group w-full mx-auto cursor-pointer select-none px-3 py-2.5 md:px-4 md:py-3 text-left ${bare ? "" : "rounded-2xl bg-gradient-to-b from-black/25 to-black/55 backdrop-blur-[2px] border border-white/10 transition-colors hover:from-black/35 hover:to-black/65"}`}
      >
        <div
          className="text-[15px] md:text-lg !font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] truncate"
          style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
        >

          {name}
        </div>

        {(place || (avgOn20 != null && totalReviewCount > 0)) && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] md:text-xs text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {avgOn20 != null && totalReviewCount > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Star className="h-3.5 w-3.5 shrink-0 text-gold fill-gold" />
                <span className="!font-extrabold text-gold" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {avgOn20}<span className="font-bold text-gold/80">/20</span>
                </span>
                <span className="!font-bold text-gold/90 tabular-nums">{totalReviewCount.toLocaleString("fr-FR")}</span>
                <span className="text-gold/80 font-medium">{REVIEWS[lang]}</span>
              </span>
            )}
            {place && avgOn20 != null && totalReviewCount > 0 && <span className="text-white/40">·</span>}
            {place && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{place}</span>
              </span>
            )}
          </div>
        )}

        {teaser && (
          <div className="relative mt-1.5">
            <p
              className="text-xs md:text-sm text-white/95 leading-relaxed line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                maskImage: "linear-gradient(to bottom, #000 45%, rgba(0,0,0,0.15) 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 45%, rgba(0,0,0,0.15) 100%)",
              }}
            >
              {teaser}
            </p>
            <span className="mt-0.5 inline-block text-[11px] md:text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
              … {MORE[lang]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewerInfo;
