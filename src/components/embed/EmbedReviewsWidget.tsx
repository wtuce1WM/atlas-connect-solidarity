// Embeddable customer-reviews widget (Google / TripAdvisor / Restaurant Guru / synthèse).
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star, ExternalLink } from "lucide-react";

export type ReviewPlatformKey = "google" | "tripadvisor" | "restaurant-guru" | "all";
export type ReviewsRatio = "auto" | "vertical" | "horizontal" | "square";
export type ReviewsSize = "auto" | "sm" | "lg";
type Lang = "fr" | "en" | "ar";

export interface EmbedReviewItem {
  id: string;
  source: string | null;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  text_fr?: string | null;
  text_en?: string | null;
  text_ar?: string | null;
  is_default?: boolean | null;
}

export interface EmbedReviewsBusiness {
  name: string;
  slug: string | null;
  computed_rating: number | null;
  total_review_count: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_reviews_url: string | null;
  google_maps_url: string | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  tripadvisor_url: string | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  restaurant_guru_url: string | null;
}

const LABELS: Record<Lang, Record<string, string>> = {
  fr: {
    reviews: "avis",
    customerReviews: "Avis clients",
    noReview: "Aucun avis à afficher pour le moment.",
    anonymous: "Anonyme",
    prev: "Avis précédent",
    next: "Avis suivant",
    seeAll: "Voir sur",
  },
  en: {
    reviews: "reviews",
    customerReviews: "Customer reviews",
    noReview: "No review to display yet.",
    anonymous: "Anonymous",
    prev: "Previous review",
    next: "Next review",
    seeAll: "See on",
  },
  ar: {
    reviews: "آراء",
    customerReviews: "آراء العملاء",
    noReview: "لا توجد آراء لعرضها حالياً.",
    anonymous: "مجهول",
    prev: "السابق",
    next: "التالي",
    seeAll: "اطلع على",
  },
};

const PLATFORMS: Record<
  Exclude<ReviewPlatformKey, "all">,
  { name: string; logo: string; sources: string[] }
> = {
  google: { name: "Google", logo: "https://www.google.com/favicon.ico", sources: ["google"] },
  tripadvisor: { name: "TripAdvisor", logo: "/review-logos/tripadvisor.webp", sources: ["tripadvisor"] },
  "restaurant-guru": {
    name: "Restaurant Guru",
    logo: "/review-logos/restaurant-guru.webp",
    sources: ["restaurant_guru", "restaurant-guru", "restaurantguru"],
  },
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const bonus = rating - full >= 0.75 ? 1 : 0;
  return (
    <span dir="ltr" className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const isFull = idx <= full + bonus;
        const isHalf = !isFull && half && idx === full + 1;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-gold/30" style={{ width: size, height: size }} />
            {(isFull || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? size / 2 : size }}
              >
                <Star className="text-gold fill-gold" style={{ width: size, height: size }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function PlatformRow({
  logo,
  name,
  rating,
  count,
  url,
  lang,
  compact,
  dark,
}: {
  logo: string;
  name: string;
  rating: number;
  count: number | null;
  url: string | null;
  lang: Lang;
  compact?: boolean;
  dark?: boolean;
}) {
  const L = LABELS[lang];
  const inner = (
    <>
      <img
        src={logo}
        alt={name}
        className={`${compact ? "h-6 w-6" : "h-7 w-7"} rounded object-contain shrink-0`}
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block ${compact ? "text-[12px]" : "text-sm"} font-semibold ${
            dark ? "text-black" : "text-white"
          } truncate`}
        >
          {name}
        </span>
        <span className="flex items-center gap-1.5 flex-wrap">
          <Stars rating={rating} size={compact ? 12 : 14} />
          <span dir="ltr" className="text-xs font-semibold text-gold">
            {rating.toFixed(1)}/5
          </span>
          {count ? (
            <span className={`text-xs ${dark ? "text-black/60" : "text-white/60"}`}>
              · {count.toLocaleString("fr-FR")} {L.reviews}
            </span>
          ) : null}
        </span>
      </span>
      {url ? (
        <ExternalLink className={`h-3.5 w-3.5 ${dark ? "text-black/40" : "text-white/40"} shrink-0`} />
      ) : null}
    </>
  );
  const cls = `flex items-center gap-3 rounded-xl border ${
    dark ? "border-black/10 bg-black/[0.03]" : "border-white/15 bg-white/5"
  } ${compact ? "px-2.5 py-2" : "px-3 py-2.5"} transition-colors`;
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} ${dark ? "hover:bg-black/[0.06]" : "hover:bg-white/10"}`}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}


/** Auto-detect frame shape/size from the viewport (iframe) dimensions. */
function useResolvedFrame(ratio: ReviewsRatio, size: ReviewsSize) {
  const read = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 420;
    const h = typeof window !== "undefined" ? window.innerHeight : 560;
    const r: Exclude<ReviewsRatio, "auto"> =
      ratio !== "auto"
        ? ratio
        : w >= 600 && w / Math.max(h, 1) >= 1.25
          ? "horizontal"
          : w >= 420 && Math.abs(w / Math.max(h, 1) - 1) <= 0.28
            ? "square"
            : "vertical";
    const s: Exclude<ReviewsSize, "auto"> =
      size !== "auto" ? size : h >= 620 || w >= 820 ? "lg" : "sm";
    return { r, s };
  };
  const [frame, setFrame] = useState(read);
  useEffect(() => {
    const on = () => setFrame(read());
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, size]);
  return frame;
}

export default function EmbedReviewsWidget({
  business,
  reviews,
  platform,
  lang = "fr",
  ratio = "auto",
  size = "auto",
  fullWidth = false,
  surface,
  ink = "light",
  frameless = false,
  hideReviewText = false,
}: {

  business: EmbedReviewsBusiness;
  reviews: EmbedReviewItem[];
  platform: ReviewPlatformKey;
  lang?: Lang;
  ratio?: ReviewsRatio;
  size?: ReviewsSize;
  /** Étire le widget sur toute la largeur disponible (pas de cap). */
  fullWidth?: boolean;
  /** Fond de la carte : `#RRGGBB` forcé, ou `null`/"" = transparent (fond du site hôte). */
  surface?: string | null;
  /** Encre du contenu : `light` (fond sombre) ou `dark` (fond clair/transparent). */
  ink?: "light" | "dark";
  /** Supprime le cadre extérieur (bordure, ombre, padding, fond) → fusion parfaite avec la section hôte. */
  frameless?: boolean;
  /** Masque la carte « détail de l'avis » (redondance quand l'hôte liste déjà les avis en texte). */
  hideReviewText?: boolean;

}) {


  const L = LABELS[lang];
  const { r: shape, s: density } = useResolvedFrame(ratio, size);
  const large = density === "lg";
  const dark = ink === "dark";
  const cMuted = dark ? "text-black/50" : "text-white/50";
  const cSoft = dark ? "text-black/60" : "text-white/60";
  const cBody = dark ? "text-black/80" : "text-white/85";
  const cPanel = dark ? "border-black/10 bg-black/[0.03]" : "border-white/10 bg-white/5";
  const cBtn = dark ? "border-black/20 hover:bg-black/[0.06]" : "border-white/20 hover:bg-white/10";

  const platformRows = useMemo(() => {
    const rows: { key: string; logo: string; name: string; rating: number; count: number | null; url: string | null }[] = [];
    const push = (
      key: Exclude<ReviewPlatformKey, "all">,
      rating: number | null,
      count: number | null,
      url: string | null,
    ) => {
      if (!rating) return;
      rows.push({ key, logo: PLATFORMS[key].logo, name: PLATFORMS[key].name, rating, count, url });
    };
    if (platform === "all" || platform === "google")
      push("google", business.google_rating, business.google_review_count, business.google_reviews_url || business.google_maps_url);
    if (platform === "all" || platform === "tripadvisor")
      push("tripadvisor", business.tripadvisor_rating, business.tripadvisor_review_count, business.tripadvisor_url);
    if (platform === "all" || platform === "restaurant-guru")
      push("restaurant-guru", business.restaurant_guru_rating, business.restaurant_guru_review_count, business.restaurant_guru_url);
    return rows;
  }, [business, platform]);

  const list = useMemo(() => {
    const allowed =
      platform === "all"
        ? null
        : new Set(PLATFORMS[platform].sources.map((s) => s.toLowerCase()));
    const filtered = reviews.filter((r) => {
      const src = (r.source || "").toLowerCase().replace(/\s+/g, "_");
      if (allowed && !allowed.has(src)) return false;
      const t = r.text_fr || r.text_en || r.text_ar || r.text;
      return !!(t && t.trim());
    });
    return filtered.sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
  }, [reviews, platform]);

  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, Math.max(list.length - 1, 0))];
  const text = current
    ? (lang === "ar"
        ? current.text_ar || current.text_fr || current.text_en || current.text
        : lang === "en"
          ? current.text_en || current.text_fr || current.text
          : current.text_fr || current.text) || ""
    : "";

  const showSynthesis = platform === "all";
  const avgOn20 = business.computed_rating;
  const totalCount = business.total_review_count || 0;
  const compactRows = shape === "square" || (!large && shape === "horizontal");

  const header = (
    <div className="space-y-1">
      <p className={`text-[11px] uppercase tracking-[0.15em] ${cMuted}`}>{L.customerReviews}</p>
      <h2 className={`${large ? "text-lg" : "text-base"} font-bold leading-tight`}>{business.name}</h2>
    </div>
  );

  const badge =
    showSynthesis && avgOn20 != null && avgOn20 > 0 ? (
      <div
        dir="ltr"
        className={`relative flex items-center justify-center gap-2.5 ${
          large ? "py-2 px-5" : "py-1.5 px-4"
        } rounded-full border ${
          dark
            ? "border-black/15 bg-black/[0.04] shadow-none"
            : "border-white/30 backdrop-blur-2xl bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.3)]"
        } overflow-hidden flex-wrap`}
      >
        {!dark && (
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-white/5" />
        )}
        <Star className={`${large ? "h-7 w-7" : "h-6 w-6"} text-gold fill-gold`} />
        <span className={`${large ? "text-4xl" : "text-3xl"} font-black text-gold whitespace-nowrap`}>
          {avgOn20}
          <span className={`text-base font-semibold ${cSoft}`}>/20</span>
        </span>
        {totalCount > 0 && (
          <span className={`text-xs ${cSoft} font-medium whitespace-nowrap`}>
            · {totalCount.toLocaleString("fr-FR")} {L.reviews}
          </span>
        )}
      </div>
    ) : null;

  const rows =
    platformRows.length > 0 ? (
      <div className={shape === "square" ? "grid grid-cols-1 gap-1.5" : "space-y-2"}>
        {platformRows.map((p) => (
          <PlatformRow key={p.key} {...p} lang={lang} compact={compactRows} dark={dark} />
        ))}
      </div>
    ) : null;

  const reviewCard = (
    <div
      className={`rounded-2xl border ${cPanel} ${large ? "p-4" : "p-3.5"} flex flex-col ${
        shape === "horizontal" ? "h-full" : ""
      }`}
      style={{ minHeight: large ? 200 : shape === "square" ? 104 : 132 }}
    >
      {current ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{current.author_name || L.anonymous}</p>
              {current.rating ? <Stars rating={current.rating} size={13} /> : null}
            </div>
            <span className={`text-[11px] ${dark ? "text-black/40" : "text-white/40"} shrink-0`}>
              {Math.min(index + 1, list.length)}/{list.length}
            </span>
          </div>
          <blockquote
            className={`${large ? "text-[15px]" : "text-sm"} leading-relaxed ${cBody} flex-1 overflow-y-auto overscroll-contain pr-1`}
            style={{
              maxHeight: large ? 260 : shape === "square" ? 120 : 180,
              scrollbarWidth: "thin",
            }}
          >
            {text}
          </blockquote>

          {list.length > 1 && (
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                aria-label={L.prev}
                onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-full border ${cBtn}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={L.next}
                onClick={() => setIndex((i) => (i + 1) % list.length)}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-full border ${cBtn}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className={`text-sm ${cMuted} m-auto text-center`}>{L.noReview}</p>
      )}
    </div>
  );

  // TripAdvisor / Restaurant Guru: no full-text reviews stored → dedicated visual treatment
  const singlePlatform = platform !== "all" ? PLATFORMS[platform] : null;
  const singleRow = singlePlatform ? platformRows[0] : null;
  const showcaseCopy = {
    fr: { note: "Note vérifiée", cta: "Lire les avis sur" },
    en: { note: "Verified rating", cta: "Read reviews on" },
    ar: { note: "تقييم موثّق", cta: "اقرأ الآراء على" },
  }[lang];

  const platformShowcase =
    singlePlatform && singleRow ? (
      <div
        className={`relative overflow-hidden rounded-2xl border border-gold/25 ${large ? "p-5" : "p-4"} flex ${
          shape === "horizontal" ? "h-full" : ""
        } flex-col items-center justify-center text-center gap-2.5`}
        style={{
          minHeight: large ? 220 : shape === "square" ? 130 : 160,
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(212,175,55,0.18) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.35) 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full blur-2xl"
          style={{ background: "rgba(212,175,55,0.22)" }}
        />
        <img
          src={singlePlatform.logo}
          alt={singlePlatform.name}
          className={`${large ? "h-14" : "h-11"} w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]`}
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">{showcaseCopy.note}</p>
        <div dir="ltr" className="flex items-baseline gap-1.5">
          <span className={`${large ? "text-5xl" : "text-4xl"} font-black text-gold leading-none`}>
            {singleRow.rating.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-white/60">/5</span>
        </div>
        <Stars rating={singleRow.rating} size={large ? 18 : 15} />
        {singleRow.count ? (
          <p className="text-xs text-white/65">
            {singleRow.count.toLocaleString("fr-FR")} {L.reviews}
          </p>
        ) : null}
        {singleRow.url ? (
          <a
            href={singleRow.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/20 transition-colors"
          >
            {showcaseCopy.cta} {singlePlatform.name}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    ) : null;

  const mainCard = list.length === 0 && platformShowcase ? platformShowcase : reviewCard;



  const signature = (
    <div className="pt-1 text-center">
      <a
        href="https://oneworldmorocco.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`text-[11px] ${dark ? "text-black/45 hover:text-black/80" : "text-white/45 hover:text-white/80"} transition-colors`}
      >
        oneworldmorocco.com
      </a>
    </div>
  );

  const maxW = shape === "horizontal" ? 900 : shape === "square" ? 520 : 460;
  const hasSurfaceProp = surface !== undefined;
  const surfaceColor = (surface || "").trim();
  const transparent = hasSurfaceProp && !surfaceColor;

  return (
    <div
      data-owm-ink={ink}
      className={`w-full mx-auto ${
        frameless
          ? "border-0 bg-transparent p-0"
          : `rounded-3xl border ${dark ? "border-black/10" : "border-white/15"} ${
              hasSurfaceProp ? "" : "bg-neutral-900/95"
            } ${large ? "p-5 sm:p-6" : "p-4 sm:p-5"} ${
              transparent || dark ? "" : "shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
            }`
      } ${dark ? "text-black" : "text-white"} flex flex-col`}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        maxWidth: fullWidth ? undefined : maxW,
        ...(!frameless && hasSurfaceProp ? { background: surfaceColor || "transparent" } : null),
      }}
    >


      {shape === "horizontal" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start flex-1">
            <div className="space-y-3 min-w-0">
              {header}
              {badge}
              {rows}
            </div>
            <div className="min-w-0 h-full">{mainCard}</div>
          </div>
          {signature}
        </>
      ) : (
        <div className="space-y-3 flex-1 flex flex-col">
          {header}
          {badge}
          {rows}
          {mainCard}
          {signature}
        </div>
      )}
    </div>
  );
}
