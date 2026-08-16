import React from "react";
import { MapPin } from "lucide-react";

export interface EmbedCardItem {
  key: string;
  image?: string | null;
  /** Icon shown when no image */
  fallbackIcon?: React.ReactNode;
  /** Top-right badge (e.g. distance "450 m" or date "12 août") */
  badge?: React.ReactNode;
  /** Small line above the bold title (e.g. event date + time) */
  overline?: React.ReactNode;
  /** Optional line above title, rendered inside the card (can contain a nested clickable) */
  titlePrefix?: React.ReactNode;
  /** Bold title */
  title: string;
  /** Optional subtitle line (neighborhood, city…) */
  subtitle?: string | null;
  /** Optional extra line under subtitle (e.g. rating row) */
  extra?: React.ReactNode;
  onClick?: () => void;
}

interface Props {
  items: EmbedCardItem[];
  footer?: React.ReactNode;
  limit?: number;
}

/**
 * Unified portrait carousel for /embed/ask — used by businesses, destinations
 * and events. Portrait 176×256 cards, image + dark gradient + top-right badge,
 * title + subtitle at bottom. Horizontal wheel scroll, hidden scrollbar.
 */
const CARD_H_MAX = 256;
const CARD_H_MIN = 168;

export default function EmbedCardCarousel({ items, footer, limit = 20 }: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  // Le verrou vertical ne s'active que lorsque les vignettes sont ENTIÈREMENT
  // visibles : sinon on laisserait le carrousel coupé en bas sans pouvoir le
  // faire remonter.
  const [fullyVisible, setFullyVisible] = React.useState(false);
  // Hauteur adaptée à l'espace visible du fil : les vignettes ne sont jamais
  // coupées en bas, même quand la zone de conversation est basse (widget embarqué).
  const [cardH, setCardH] = React.useState(CARD_H_MAX);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const viewport = el.closest(".overflow-y-auto") as HTMLElement | null;
    const fit = () => {
      const avail = viewport?.clientHeight ?? window.innerHeight;
      // marge pour le titre/CTA sous le carrousel
      setCardH(Math.max(CARD_H_MIN, Math.min(CARD_H_MAX, avail - 60)));
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro && viewport) ro.observe(viewport);
    window.addEventListener("resize", fit);
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => setFullyVisible(entries.some((e) => e.intersectionRatio >= 0.99)),
        { root: viewport ?? null, threshold: [0, 0.5, 0.99, 1] },
      );
      io.observe(el);
    }
    return () => { ro?.disconnect(); io?.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  // Amène le carrousel entièrement dans la vue dès qu'on interagit avec lui.
  const revealFully = () => {
    if (fullyVisible) return;
    scrollerRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };

  if (!items.length) return null;
  return (
    <div className="w-full max-w-full">
    <div
      ref={scrollerRef}
      className="w-full max-w-full overflow-x-auto overflow-y-visible scrollbar-hide -mx-1 px-1"
      // Le geste vertical est neutralisé sur le carrousel (touch-action: pan-x) et
      // la molette est convertie en défilement horizontal tant qu'on n'est pas
      // arrivé au bout : la page ne bouge qu'après la dernière vignette.
      style={{ overscrollBehavior: "contain", touchAction: fullyVisible ? "pan-x" : "auto" }}
      onPointerEnter={revealFully}
      onTouchStart={revealFully}
      onWheel={(e) => {
        if (e.deltaY === 0) return;
        if (!fullyVisible) { revealFully(); return; }
        const el = e.currentTarget;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        const atRight = el.scrollLeft >= maxScroll - 1;
        if (e.deltaY > 0 && atRight) return; // fin du scroll horizontal → la page reprend
        if (e.deltaY < 0 && el.scrollLeft <= 0) return; // début → la page remonte
        e.preventDefault();
        e.stopPropagation();
        const capped = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50);
        el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + capped));
      }}
    >



      <div className="flex gap-3 pb-1">
        {items.slice(0, limit).map((it) => (
          <div
            key={it.key}
            role="button"
            tabIndex={0}
            onClick={it.onClick}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && it.onClick) { e.preventDefault(); it.onClick(); } }}
            style={{ textTransform: "none", letterSpacing: "normal" }}
            className="shrink-0 w-44 text-left group cursor-pointer"

          >
            <div className="relative w-44 h-64 rounded-xl overflow-hidden bg-neutral-800">
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  {it.fallbackIcon ?? <MapPin className="w-10 h-10" />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 pointer-events-none" />
              {it.badge && (
                <div
                  className="absolute top-2 right-2 text-[11px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#D4AF37" }}
                >
                  {it.badge}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                {it.overline && (
                  <div
                    className="text-[11px] font-semibold text-[#D4AF37] mb-0.5 break-words"
                    style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                  >
                    {it.overline}
                  </div>
                )}
                {it.titlePrefix && (
                  <div className="mb-0.5">{it.titlePrefix}</div>
                )}
                <div
                  className="text-[13px] !font-bold text-white leading-tight break-words [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
                  style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                >
                  {it.title}
                </div>
                {it.subtitle && (
                  <div
                    className="text-[11px] text-white/85 mt-0.5 break-words"
                    style={{ textTransform: "none", letterSpacing: "normal" }}
                  >
                    {it.subtitle}
                  </div>
                )}
                {it.extra}
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
    {footer}
    </div>
  );
}
