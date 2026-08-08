import { useMemo, useState } from "react";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { tripadvisorReviewUrl } from "@/lib/tripadvisorUrl";
import type { ReviewText } from "@/lib/reviewHtmlBuilder";

export interface InlineReviewPlatform {
  name: string;
  rating?: number | null;
  count?: number | null;
  url?: string | null;
  listingUrl?: string | null;
  leaveReviewUrl?: string | null;
}

const LOGO_MAP: Record<string, string> = {
  Google: "https://www.google.com/favicon.ico",
  TripAdvisor: "/review-logos/tripadvisor.webp",
  "Restaurant Guru": "/review-logos/restaurant-guru.webp",
  Trustpilot: "https://cdn.trustpilot.net/brand-assets/4.1.0/logo-black.svg",
  GetYourGuide: "/review-logos/getyourguide.webp",
  Viator: "https://www.viator.com/favicon.ico",
  "Avis Vérifiés": "https://www.avis-verifies.com/favicon.ico",
  TourRadar: "https://www.tourradar.com/favicon.ico",
  Kayak: "https://www.kayak.com/favicon.ico",
};

const L = {
  fr: { title: "Avis clients", reviews: "avis", leave: "Laisser un avis", more: (n: number) => `Voir les ${n} avis clients`, less: "Réduire les avis", anon: "Anonyme" },
  en: { title: "Customer reviews", reviews: "reviews", leave: "Leave a review", more: (n: number) => `See all ${n} reviews`, less: "Show less", anon: "Anonymous" },
  ar: { title: "آراء العملاء", reviews: "تقييم", leave: "اترك تقييماً", more: (n: number) => `عرض كل ${n} آراء`, less: "طيّ", anon: "مجهول" },
};

interface Props {
  texts: ReviewText[];
  platforms: InlineReviewPlatform[];
  avgOn20: number | null;
  totalReviewCount: number;
  language: string;
}

/**
 * Section « Avis clients » affichée en ligne dans l'overlay Full Description.
 * - Widgets « Laisser un avis » uniquement pour les plateformes réellement
 *   renseignées (URL présente) : pas de TripAdvisor sans URL TripAdvisor.
 * - Un seul avis visible par défaut (celui marqué par défaut, sinon le n°1),
 *   avec une incitation à déplier pour lire tous les avis.
 */
const InlineReviewsSection = ({ texts, platforms, avgOn20, totalReviewCount, language }: Props) => {
  const t = L[(language as keyof typeof L)] ?? L.fr;
  const [expanded, setExpanded] = useState(false);

  const activePlatforms = useMemo(
    () => platforms.filter((p) => !!p.rating && !!p.count && !!p.url),
    [platforms]
  );

  const ordered = useMemo(() => {
    const withText = texts.filter((r) => (r.text_fr || r.text_en || r.text_ar || r.text || "").trim());
    const idx = withText.findIndex((r) => r.is_default);
    if (idx > 0) {
      const copy = [...withText];
      const [d] = copy.splice(idx, 1);
      return [d, ...copy];
    }
    return withText;
  }, [texts]);

  const displayText = (r: ReviewText) =>
    language === "ar"
      ? r.text_ar || r.text_fr || r.text_en || r.text || ""
      : language === "en"
        ? r.text_en || r.text_fr || r.text || ""
        : r.text_fr || r.text || "";

  if (!avgOn20 && activePlatforms.length === 0 && ordered.length === 0) return null;

  const visible = expanded ? ordered.slice(0, 10) : ordered.slice(0, 1);
  const hiddenCount = Math.max(0, Math.min(ordered.length, 10) - 1);

  const LeaveReviewWidgets = () => (
    <div className="flex flex-wrap gap-2 justify-center">
      {activePlatforms.map((p) => {
        const logo = LOGO_MAP[p.name];
        let leaveHref: string | null = p.leaveReviewUrl || null;
        if (!leaveHref && p.name === "TripAdvisor") {
          leaveHref = tripadvisorReviewUrl(p.listingUrl || p.url);
        }
        if (!leaveHref) return null;
        return (
          <a
            key={p.name}
            href={leaveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground no-underline hover:brightness-110 font-['Montserrat',sans-serif] whitespace-nowrap"
          >
            {logo && (
              <img
                src={logo}
                alt={p.name}
                className="w-4 h-4 object-contain rounded shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            ✍️ {t.leave} {p.name}
          </a>
        );
      })}
    </div>
  );

  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <h2 className="text-lg md:text-xl font-bold uppercase mb-4 text-white font-['Montserrat',sans-serif]">
        {t.title}
      </h2>

      {avgOn20 !== null && avgOn20 > 0 && (
        <div className="flex items-center justify-center gap-3 mb-4 flex-nowrap" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" }}>
          <Star className="h-8 w-8 text-gold fill-gold shrink-0" />
          <span className="font-['Montserrat',sans-serif] text-4xl font-black text-gold whitespace-nowrap">
            {avgOn20}
            <span className="text-xl font-semibold text-white/60">/20</span>
          </span>
          {totalReviewCount > 0 && (
            <span className="font-['Montserrat',sans-serif] text-sm font-medium text-white/60 whitespace-nowrap">
              · {totalReviewCount.toLocaleString("fr-FR")} {t.reviews}
            </span>
          )}
        </div>
      )}

      {activePlatforms.length > 0 && <LeaveReviewWidgets />}

      {ordered.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-col gap-3">
            {visible.map((r, i) => (
              <blockquote
                key={`inline-review-${i}`}
                className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 border-l-4 border-l-gold/60"
              >
                <p className="text-sm md:text-base text-white/90 leading-relaxed font-['Montserrat',sans-serif] italic">
                  {displayText(r)}
                </p>
                <footer className="mt-2 text-xs text-white/60 font-['Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif]">
                  — {r.author_name || t.anon}
                  {r.source ? ` (${r.source})` : ""}
                </footer>
              </blockquote>
            ))}
            {expanded && activePlatforms.length > 0 && (
              <div className="pt-2">
                <LeaveReviewWidgets />
              </div>
            )}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-sm text-sm font-semibold text-gold transition-colors font-['Montserrat',sans-serif]"
            >
              {expanded ? (
                <>{t.less} <ChevronUp className="h-4 w-4" /></>
              ) : (
                <>{t.more(Math.min(ordered.length, 10))} <ChevronDown className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineReviewsSection;
