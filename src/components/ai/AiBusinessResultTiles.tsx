import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Star, Clock, ChevronDown, ChevronUp, CalendarCheck } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import { AI_NAME_FONT } from "@/lib/aiTypography";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { haversineKm } from "@/lib/haversine";
import { formatDayHours, getMoroccoNow, isCurrentlyOpen, type DayHoursData } from "@/lib/formatOpeningHours";
import type { AiResultBusiness } from "@/components/ai/AiBusinessResultCards";

/**
 * Grille de miniatures carrées des résultats IA — même mécanique que la grille
 * de démo `/front` (miniatures `aspect-square`, colonnes qui se recalculent
 * quand le conteneur est redimensionné à l'ouverture du slidepanel vidéo).
 * Le hook est visible sur 2 lignes et se déplie dans la miniature via « … plus »,
 * comme la barre info du viewer.
 */

interface Props {
  businesses: AiResultBusiness[];
  origin?: { lat: number; lng: number } | null;
  lang?: string;
  rankOrder?: string | null;
  onOpen: (id: string, siblingIds: string[]) => void;
  onOpenBooking?: (url: string, label: string) => void;
  footer?: React.ReactNode;
  max?: number;
  compact?: boolean;
}

const L = {
  fr: { reviews: "avis", open: "Ouvert", closed: "Fermé", open24: "Ouvert 24h/24", more: "… plus", less: "Réduire", book: "Réservez" },
  en: { reviews: "reviews", open: "Open", closed: "Closed", open24: "Open 24/7", more: "… more", less: "Less", book: "Book" },
  ar: { reviews: "تقييم", open: "مفتوح", closed: "مغلق", open24: "مفتوح 24/24", more: "… المزيد", less: "إغلاق", book: "احجز" },
};

const PODIUM = [
  { medal: "🥇", label: "1er", color: "#D4AF37" },
  { medal: "🥈", label: "2e", color: "#B9BDC2" },
  { medal: "🥉", label: "3e", color: "#CD7F32" },
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

/** Colonnes déduites d'une largeur de conteneur (aucun état intermédiaire visible). */
function colsForWidth(w: number, compact: boolean) {
  const desktopViewport = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  return w < 640 ? (desktopViewport ? 2 : 1) : w < 1024 ? 2 : compact ? 2 : 4;
}

function useContainerColumns(ref: React.RefObject<HTMLDivElement>, compact: boolean) {
  // Estimation synchrone au premier rendu : la grille est peinte tout de suite
  // avec le bon nombre de colonnes, donc pas de masquage ni de saut visuel.
  const [cols, setCols] = useState(() => {
    const w = typeof window === "undefined" ? 0 : window.innerWidth;
    if (!w) return 2;
    return colsForWidth(w >= 768 ? (compact ? w / 2 : w) : w, compact);
  });
  const animate = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = (w: number) => {
      if (!w) return;
      const next = colsForWidth(w, compact);
      setCols((prev) => (prev === next ? prev : next));
    };
    compute(el.clientWidth);
    // Les changements ultérieurs (ouverture d'un panneau) peuvent s'animer.
    const raf = requestAnimationFrame(() => { animate.current = true; });
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) compute(e.contentRect.width);
    });
    ro.observe(el);
    const onResize = () => compute(el.clientWidth);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [ref, compact]);
  return { cols, measured: animate.current };
}


const AiBusinessResultTiles = ({
  businesses, origin, lang = "fr", rankOrder, onOpen, onOpenBooking, footer, max = 20, compact = false,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { cols, measured } = useContainerColumns(wrapRef, compact);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const t = L[(lang as keyof typeof L) in L ? (lang as keyof typeof L) : "fr"];
  const list = businesses.slice(0, max);
  const siblings = list.map((b) => b.id);
  const ranked = !!rankOrder;

  return (
    <div ref={wrapRef} className="w-full flex flex-col gap-2">
      <div
        className={cn("grid gap-3", measured && "transition-[grid-template-columns] duration-500")}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
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
          const statusLabel = b.is_open_24h ? t.open24 : hours.isOpen == null ? null : hours.isOpen ? t.open : t.closed;
          const isOpenText = !!expanded[b.id];
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
          const bookingLabel = (b.booking_label || "").trim() || t.book;

          return (
            <div
              key={b.id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-white/10"
              style={podium ? { boxShadow: `0 0 0 2px ${podium.color}` } : undefined}
            >
              <button
                type="button"
                onClick={() => onOpen(b.id, siblings)}
                className="absolute inset-0 h-full w-full text-left"
                aria-label={b.name}
              >
                {img ? (
                  <img
                    src={img}
                    alt={b.name}
                    loading="lazy"
                    decoding="async"
                    draggable={false}

                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
              </button>

              {ranked ? (
                <span
                  className="pointer-events-none absolute left-2 top-2 z-[3] inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold leading-none shadow-lg"
                  style={podium ? { background: podium.color, color: "#1b1b1b" } : { background: "rgba(0,0,0,0.65)", color: "#fff" }}
                >
                  {podium ? <><span aria-hidden="true">{podium.medal}</span>{podium.label}</> : `N°${idx + 1}`}
                </span>
              ) : null}

              {!isOpenText && (waHref || bookingUrl) ? (
                <div className="pointer-events-none absolute inset-x-0 top-2 z-[4] flex justify-center px-1.5">
                  <div className="pointer-events-auto flex items-center gap-1.5">

                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
                        style={{ backgroundColor: "#25D366", ...AI_NAME_FONT }}
                      >
                        <WhatsAppIcon className="h-3 w-3" /> WhatsApp
                      </a>
                    ) : null}
                    {bookingUrl ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBooking
                            ? onOpenBooking(bookingUrl, bookingLabel)
                            : window.open(bookingUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
                        style={{ backgroundColor: "#C04F17", ...AI_NAME_FONT }}
                      >
                        <CalendarCheck className="h-3 w-3" /> {bookingLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Bloc info bas : nom, méta, hook 2 lignes + « … plus » (déplie dans la miniature). */}
              <div
                className={`absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1 p-2.5 text-white ${
                  isOpenText ? "top-0 overflow-y-auto bg-black/80 backdrop-blur-sm" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpen(b.id, siblings)}
                  className={`text-left font-bold leading-tight underline decoration-dotted underline-offset-2 ${
                    isOpenText ? "text-[17px]" : "text-[13.5px] line-clamp-2"
                  }`}
                  style={AI_NAME_FONT}
                >
                  {b.name}
                </button>

                <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-90 ${isOpenText ? "text-[13px]" : "text-[10.5px]"}`}>
                  {rating20 != null ? (
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: "#D4AF37" }}>
                      <Star className={isOpenText ? "h-4 w-4" : "h-3 w-3"} style={{ color: "#D4AF37" }} fill="#D4AF37" />
                      {rating20.toFixed(1)}<span className={isOpenText ? "text-[11px] opacity-80" : "text-[9px] opacity-80"}>/20</span>
                      {reviewCount ? <span className="font-normal text-white/80">· {reviewCount} {t.reviews}</span> : null}
                    </span>
                  ) : null}
                  {statusLabel ? (
                    <span className="inline-flex items-center gap-1" style={{ color: hours.isOpen ? "#25D366" : "#E4897F" }}>
                      <Clock className={isOpenText ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} /> {statusLabel}
                      {isOpenText && hours.label ? <span className="text-white/80">· {hours.label}</span> : null}
                    </span>
                  ) : null}
                </div>

                {loc || distStr ? (
                  <div className={`flex items-center gap-1 opacity-85 min-w-0 ${isOpenText ? "text-[13px]" : "text-[10.5px]"}`}>
                    <MapPin className={isOpenText ? "h-4 w-4 shrink-0" : "h-3 w-3 shrink-0"} />
                    <span className={isOpenText ? "" : "truncate"}>{[loc, distStr].filter(Boolean).join(" · ")}</span>
                  </div>
                ) : null}

                {hook ? (
                  <>
                    <p className={`text-white/90 ${isOpenText ? "text-[15px] leading-relaxed" : "text-[12.5px] leading-snug line-clamp-2"}`}>{hook}</p>
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => ({ ...s, [b.id]: !s[b.id] }))}
                      className={`self-start inline-flex items-center gap-1 font-semibold text-white/90 underline underline-offset-2 ${isOpenText ? "text-[13px]" : "text-[11px]"}`}
                      style={AI_NAME_FONT}
                    >
                      {isOpenText ? <><ChevronUp className="h-3 w-3" /> {t.less}</> : <><ChevronDown className="h-3 w-3" /> {t.more}</>}
                    </button>
                  </>
                ) : null}


              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
};

export default AiBusinessResultTiles;
