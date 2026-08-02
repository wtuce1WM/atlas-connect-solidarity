// Embeddable customer-reviews widget (Google / TripAdvisor / Restaurant Guru / synthèse).
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star, ExternalLink } from "lucide-react";

export type ReviewPlatformKey = "google" | "tripadvisor" | "restaurant-guru" | "all";
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
}: {
  logo: string;
  name: string;
  rating: number;
  count: number | null;
  url: string | null;
  lang: Lang;
}) {
  const L = LABELS[lang];
  const inner = (
    <>
      <img
        src={logo}
        alt={name}
        className="h-7 w-7 rounded object-contain shrink-0"
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white truncate">{name}</span>
        <span className="flex items-center gap-1.5 flex-wrap">
          <Stars rating={rating} />
          <span dir="ltr" className="text-xs font-semibold text-gold">
            {rating.toFixed(1)}/5
          </span>
          {count ? (
            <span className="text-xs text-white/60">
              · {count.toLocaleString("fr-FR")} {L.reviews}
            </span>
          ) : null}
        </span>
      </span>
      {url ? <ExternalLink className="h-3.5 w-3.5 text-white/40 shrink-0" /> : null}
    </>
  );
  const cls =
    "flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 transition-colors";
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-white/10`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function EmbedReviewsWidget({
  business,
  reviews,
  platform,
  lang = "fr",
}: {
  business: EmbedReviewsBusiness;
  reviews: EmbedReviewItem[];
  platform: ReviewPlatformKey;
  lang?: Lang;
}) {
  const L = LABELS[lang];

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

  return (
    <div
      className="w-full max-w-[460px] mx-auto rounded-3xl border border-white/15 bg-neutral-900/95 p-4 sm:p-5 space-y-4 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.15em] text-white/50">{L.customerReviews}</p>
        <h2 className="text-base font-bold leading-tight">{business.name}</h2>
      </div>

      {showSynthesis && avgOn20 != null && avgOn20 > 0 && (
        <div
          dir="ltr"
          className="relative flex items-center justify-center gap-2.5 py-1.5 px-4 rounded-full border border-white/30 backdrop-blur-2xl bg-black/40 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.3)] flex-wrap"
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-white/5" />
          <Star className="h-6 w-6 text-gold fill-gold" />
          <span className="text-3xl font-black text-gold whitespace-nowrap">
            {avgOn20}
            <span className="text-base font-semibold text-white/60">/20</span>
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-white/60 font-medium whitespace-nowrap">
              · {totalCount.toLocaleString("fr-FR")} {L.reviews}
            </span>
          )}
        </div>
      )}

      {platformRows.length > 0 && (
        <div className="space-y-2">
          {platformRows.map((p) => (
            <PlatformRow key={p.key} {...p} lang={lang} />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 min-h-[132px] flex flex-col">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{current.author_name || L.anonymous}</p>
                {current.rating ? <Stars rating={current.rating} size={13} /> : null}
              </div>
              <span className="text-[11px] text-white/40 shrink-0">
                {Math.min(index + 1, list.length)}/{list.length}
              </span>
            </div>
            <blockquote className="text-sm leading-relaxed text-white/85 flex-1">{text}</blockquote>
            {list.length > 1 && (
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  aria-label={L.prev}
                  onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={L.next}
                  onClick={() => setIndex((i) => (i + 1) % list.length)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-white/50 m-auto text-center">{L.noReview}</p>
        )}
      </div>

      <div className="pt-1 text-center">
        <a
          href="https://oneworldmorocco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-white/45 hover:text-white/80 transition-colors"
        >
          oneworldmorocco.com
        </a>
      </div>
    </div>
  );
}
