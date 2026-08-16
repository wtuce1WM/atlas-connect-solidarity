import { MapPin, Star, Clock, MessageSquareQuote } from "lucide-react";
import { AI_NAME_FONT } from "@/lib/aiTypography";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { haversineKm } from "@/lib/haversine";
import { formatDayHours, getMoroccoNow, isCurrentlyOpen, type DayHoursData } from "@/lib/formatOpeningHours";

/**
 * Carte résultat unique des réponses IA — source de vérité unique de la présentation
 * d'un établissement cité par l'IA, sur les 3 surfaces (/club, /embed/ask, onglet IA de /search).
 * Format horizontal compact : image 1, nom, hook, quartier · ville, distance vs établissement
 * maître, note /20 + nombre d'avis, horaires du jour + statut ouvert/fermé, accès à tous les avis.
 * Le moteur n'écrit plus ces informations en markdown : elles viennent du payload SHOW_ON_MAP.
 */

export interface AiResultBusiness {
  id: string;
  slug?: string | null;
  name: string;
  city?: string | null;
  neighborhood?: string | null;
  images?: string[] | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hook_fr?: string | null;
  hook_en?: string | null;
  hook_ar?: string | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  opening_hours?: Record<string, DayHoursData> | null;
  is_open_24h?: boolean | null;
  show_opening_hours?: boolean | null;
  [key: string]: unknown;
}

interface Props {
  businesses: AiResultBusiness[];
  /** Établissement maître (hôte du widget / point de référence) pour la distance. */
  origin?: { lat: number; lng: number } | null;
  lang?: string;
  /** Encre claire (fond sombre) ou foncée (fond clair). */
  ink?: "light" | "dark";
  cardStyle?: React.CSSProperties;
  onOpen: (id: string, siblingIds: string[]) => void;
  onOpenReviews?: (id: string, siblingIds: string[]) => void;
  footer?: React.ReactNode;
  max?: number;
}

const L = {
  fr: { reviews: "avis", allReviews: "Voir tous les avis", open: "Ouvert", closed: "Fermé", open24: "Ouvert 24h/24" },
  en: { reviews: "reviews", allReviews: "See all reviews", open: "Open", closed: "Closed", open24: "Open 24/7" },
  ar: { reviews: "تقييم", allReviews: "عرض كل الآراء", open: "مفتوح", closed: "مغلق", open24: "مفتوح 24/24" },
};

const FR_TO_EN: Record<string, string> = {
  lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
  vendredi: "friday", samedi: "saturday", dimanche: "sunday",
};
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function todayHours(b: AiResultBusiness): { label: string | null; isOpen: boolean | null } {
  if (b.is_open_24h) return { label: null, isOpen: true };
  if (!b.show_opening_hours || !b.opening_hours || typeof b.opening_hours !== "object") {
    return { label: null, isOpen: null };
  }
  const normalized: Record<string, DayHoursData> = {};
  for (const [k, v] of Object.entries(b.opening_hours)) normalized[FR_TO_EN[k] || k] = v as DayHoursData;
  const key = DAYS[getMoroccoNow().dayOfWeek];
  const dh = key ? normalized[key] : null;
  if (!dh) return { label: null, isOpen: null };
  const label = formatDayHours(dh, { language: "fr", showContinuous: false });
  return { label: label === "—" ? null : label, isOpen: isCurrentlyOpen(dh) };
}

const AiBusinessResultCards = ({
  businesses, origin, lang = "fr", ink = "dark", cardStyle, onOpen, onOpenReviews, footer, max = 20,
}: Props) => {
  const t = L[(lang as keyof typeof L) in L ? (lang as keyof typeof L) : "fr"];
  const list = businesses.slice(0, max);
  if (!list.length) return null;
  const siblings = list.map((b) => b.id);
  const light = ink === "light" && !cardStyle;
  const shellClass = cardStyle
    ? "border-transparent"
    : light
    ? "border-white/15 bg-white/[0.06]"
    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
  const bodyInk = cardStyle ? "" : light ? "text-white" : "text-neutral-900 dark:text-neutral-100";

  return (
    <div className="w-full flex flex-col gap-2">
      {list.map((b) => {
        const img = (Array.isArray(b.images) && b.images[0]) || b.logo_url || null;
        const hook =
          lang === "en" ? b.hook_en || b.hook_fr : lang === "ar" ? b.hook_ar || b.hook_fr : b.hook_fr || b.hook_en;
        const loc = [b.neighborhood, b.city].filter(Boolean).join(" · ");
        const rating20 =
          b.computed_rating != null ? Number(b.computed_rating) : computeWeightedRatingOn20(collectRatingSources(b as never));
        const reviewCount = b.total_review_count ?? getTotalReviewCount(b as never) ?? 0;
        const dist =
          origin && b.latitude != null && b.longitude != null
            ? haversineKm(origin.lat, origin.lng, Number(b.latitude), Number(b.longitude))
            : null;
        const distStr = dist == null ? null : dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
        const hours = todayHours(b);
        const statusLabel = b.is_open_24h ? t.open24 : hours.isOpen == null ? null : hours.isOpen ? t.open : t.closed;

        return (
          <div
            key={b.id}
            className={`flex gap-0 rounded-xl border overflow-hidden ${shellClass} ${bodyInk}`}
            style={cardStyle}
          >
            <button
              type="button"
              onClick={() => onOpen(b.id, siblings)}
              className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
              aria-label={b.name}
            >
              {img ? (
                <img src={img} alt={b.name} loading="lazy" className="w-full h-full object-cover" />
              ) : null}
            </button>

            <div className="min-w-0 flex-1 p-2.5 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onOpen(b.id, siblings)}
                className="text-left font-bold text-[14px] leading-tight text-[#C24B3F] underline decoration-dotted underline-offset-2 hover:decoration-solid break-words"
                style={AI_NAME_FONT}
              >
                {b.name}
              </button>

              {hook ? <div className="text-[11.5px] leading-snug opacity-80 line-clamp-2">{hook}</div> : null}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] opacity-75">
                {loc ? (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{loc}</span>
                  </span>
                ) : null}
                {distStr ? <span className="shrink-0">· {distStr}</span> : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                {rating20 != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 shrink-0" style={{ color: "#D4AF37" }} fill="#D4AF37" />
                    <span className="font-semibold">{rating20.toFixed(1)}/20</span>
                    {reviewCount ? <span className="opacity-70">· {reviewCount} {t.reviews}</span> : null}
                  </span>
                ) : null}
                {statusLabel ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={
                      hours.isOpen
                        ? { background: "rgba(37,211,102,0.15)", color: "#1E9E52" }
                        : { background: "rgba(194,75,63,0.15)", color: "#C24B3F" }
                    }
                  >
                    <Clock className="w-2.5 h-2.5" /> {statusLabel}
                    {hours.label ? <span className="font-normal opacity-80">· {hours.label}</span> : null}
                  </span>
                ) : null}
              </div>

              {onOpenReviews && reviewCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenReviews(b.id, siblings)}
                  style={AI_NAME_FONT}
                  className="self-start inline-flex items-center gap-1 text-[11px] font-medium text-[#C24B3F] hover:underline"
                >
                  <MessageSquareQuote className="w-3 h-3" /> {t.allReviews} ({reviewCount})
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      {footer}
    </div>
  );
};

export default AiBusinessResultCards;
