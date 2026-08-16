import { useEffect, useState } from "react";
import { MapPin, Star, Clock, CalendarCheck } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
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
  whatsapp?: string | null;
  booking_url?: string | null;
  booking_label?: string | null;
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
  /**
   * Ordre de classement (`rating`, `reviews`, `distance`, `opening`…) : affiche un
   * badge de rang générique sur chaque carte, avec podium (or/argent/bronze) sur le Top 3.
   */
  rankOrder?: string | null;
  onOpen: (id: string, siblingIds: string[]) => void;
  onOpenReviews?: (id: string, siblingIds: string[]) => void;
  /** Ouvre l'overlay de réservation interne (sinon nouvel onglet). */
  onOpenBooking?: (url: string, label: string) => void;
  footer?: React.ReactNode;
  max?: number;
}

const L = {
  fr: { reviews: "avis", allReviews: "Avis clients", open: "Ouvert", closed: "Fermé", open24: "Ouvert 24h/24", whatsapp: "WhatsApp", book: "Réservez" },
  en: { reviews: "reviews", allReviews: "Reviews", open: "Open", closed: "Closed", open24: "Open 24/7", whatsapp: "WhatsApp", book: "Book" },
  ar: { reviews: "تقييم", allReviews: "آراء العملاء", open: "مفتوح", closed: "مغلق", open24: "مفتوح 24/24", whatsapp: "واتساب", book: "احجز" },
};

/** Podium Top 3 : médaille + couleur de rang. Au-delà, badge de rang neutre. */
const PODIUM = [
  { medal: "🥇", label: "1er", color: "#D4AF37", tint: "rgba(212,175,55,0.14)" },
  { medal: "🥈", label: "2e", color: "#B9BDC2", tint: "rgba(185,189,194,0.16)" },
  { medal: "🥉", label: "3e", color: "#CD7F32", tint: "rgba(205,127,50,0.14)" },
];


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
  businesses, origin, lang = "fr", ink = "dark", cardStyle, rankOrder, onOpen, onOpenReviews, onOpenBooking, footer, max = 20,
}: Props) => {
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 800);
    return () => clearTimeout(t);
  }, []);

  const t = L[(lang as keyof typeof L) in L ? (lang as keyof typeof L) : "fr"];
  const list = businesses.slice(0, max);
  if (!list.length) return null;
  const siblings = list.map((b) => b.id);
  const light = ink === "light" && !cardStyle;
  const ranked = !!rankOrder;
  const shellClass = cardStyle
    ? "border-transparent"
    : light
    ? "border-white/15 bg-white/[0.06]"
    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
  const bodyInk = cardStyle ? "" : light ? "text-white" : "text-neutral-900 dark:text-neutral-100";

  return (
    <div className="w-full flex flex-col gap-2">
      {ranked && list.length === 3 ? (
        <div className={`flex items-center gap-2 py-1 ${animateIn ? "ai-podium-heading" : "opacity-0"}`} aria-label="Podium des trois établissements les mieux notés">
          <span className="h-px flex-1 bg-current opacity-20" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest" style={AI_NAME_FONT}>
            <span aria-hidden="true">🏆</span> Top 3
          </span>
          <span className="h-px flex-1 bg-current opacity-20" />
        </div>
      ) : null}
      {list.map((b, idx) => {
        const podium = ranked && idx < 3 ? PODIUM[idx] : null;

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
        const waHref = b.whatsapp
          ? whatsappUrl(
              String(b.whatsapp),
              lang === "en"
                ? `Hello ${b.name}, I found you on One World Morocco.`
                : lang === "ar"
                ? `مرحبا ${b.name}`
                : `Bonjour ${b.name}, je vous ai trouvé sur One World Morocco.`,
            )
          : null;
        const bookingUrl = b.booking_url || null;
        const bookingLabel = t.book;
        const statusLabel = b.is_open_24h ? t.open24 : hours.isOpen == null ? null : hours.isOpen ? t.open : t.closed;

        return (
          <div
            key={b.id}
            className={`relative flex gap-0 rounded-xl border-2 overflow-hidden ${shellClass} ${bodyInk} ${
              podium ? (animateIn ? "ai-podium-card" : "opacity-0") : ""
            }`}
            style={
              podium
                ? {
                    ...cardStyle,
                    borderColor: podium.color,
                    backgroundImage: `linear-gradient(90deg, ${podium.tint}, transparent 48%)`,
                    boxShadow: `0 0 0 1px ${podium.color}66, 0 8px 24px ${podium.color}38`,
                    animationDelay: `${animateIn ? idx * 180 : 0}ms`,
                    animationFillMode: "backwards",
                  }
                : cardStyle
            }
          >
            <button
              type="button"
              onClick={() => onOpen(b.id, siblings)}
              className="relative shrink-0 self-stretch w-24 sm:w-28 min-h-24 sm:min-h-28 bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
              aria-label={b.name}
            >
              {img ? (
                <img src={img} alt={b.name} loading="lazy" className="w-full h-full object-cover" />
              ) : null}
              {ranked ? (
                <span
                  className={`absolute top-2 left-2 inline-flex items-center justify-center gap-1 rounded-full font-extrabold leading-none shadow-lg ${
                    podium ? `${animateIn ? "ai-podium-medal" : "opacity-0"} min-w-12 px-2 py-1.5 text-[13px]` : "px-1.5 py-0.5 text-[11px]"
                  }`}
                  style={
                    podium
                      ? { background: podium.color, color: "#1b1b1b" }
                      : { background: "rgba(0,0,0,0.65)", color: "#fff" }
                  }
                >
                  {podium ? <><span className="text-base" aria-hidden="true">{podium.medal}</span>{podium.label}</> : `N°${idx + 1}`}
                </span>
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
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(212,175,55,0.15)" }}
                  >
                    <Star className="w-3.5 h-3.5 shrink-0" style={{ color: "#D4AF37" }} fill="#D4AF37" />
                    <span className="font-bold text-[13px]" style={{ color: "#D4AF37" }}>
                      {rating20.toFixed(1)}<span className="text-[10px] font-semibold opacity-80">/20</span>
                    </span>
                    {reviewCount ? <span className="opacity-75 text-[10.5px]">· {reviewCount} {t.reviews}</span> : null}
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

              {(waHref || bookingUrl) ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      <WhatsAppIcon className="w-3 h-3" /> {t.whatsapp}
                    </a>
                  ) : null}
                  {bookingUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBooking
                          ? onOpenBooking(bookingUrl, bookingLabel)
                          : window.open(bookingUrl, "_blank", "noopener,noreferrer")
                      }
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: "#C24B3F" }}
                    >
                      <CalendarCheck className="w-3 h-3" /> {bookingLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}

            </div>
          </div>
        );
      })}
      {footer}
      <style>{`
        @keyframes aiPodiumEnter {
          0% { opacity: 0; transform: translateY(22px) scale(.94); }
          65% { opacity: 1; transform: translateY(-3px) scale(1.012); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiPodiumMedal {
          0% { transform: scale(0) rotate(-18deg); }
          70% { transform: scale(1.16) rotate(3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .ai-podium-heading { animation: aiPodiumEnter .45s cubic-bezier(.16,1,.3,1) both; }
        .ai-podium-card { animation: aiPodiumEnter .62s cubic-bezier(.16,1,.3,1) both; }
        .ai-podium-medal { animation: aiPodiumMedal .55s cubic-bezier(.16,1,.3,1) .2s both; }
        @media (prefers-reduced-motion: reduce) {
          .ai-podium-heading, .ai-podium-card, .ai-podium-medal { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default AiBusinessResultCards;
