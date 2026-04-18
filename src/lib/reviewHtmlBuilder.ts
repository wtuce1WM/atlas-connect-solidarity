/**
 * Builds HTML for the reviews overlay (card variant with centered star score).
 */

interface ReviewPlatform {
  name: string;
  rating: number | null;
  count: number | null;
  url: string | null;
}

export interface ReviewText {
  text: string | null;
  author_name: string | null;
  source: string;
  text_fr?: string | null;
  text_en?: string | null;
  is_default?: boolean;
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

export function buildReviewHtml(
  texts: ReviewText[],
  platforms: ReviewPlatform[],
  avgOn20: number | null,
  totalReviewCount: number,
  language: string,
) {
  const reviewLabel = language === "en" ? "reviews" : "avis";
  const activePlats = platforms.filter((p) => p.rating && p.count);

  const platformListHtml = activePlats
    .map((p) => {
      const logo = LOGO_MAP[p.name] || "";
      const logoImg = logo
        ? `<img src="${logo}" alt="${p.name}" class="rv-logo" onerror="this.style.display='none'"/>`
        : "";
      return `<div class="rv-card">${logoImg}<span class="rv-card-text"><strong class="rv-card-name">${p.name}</strong><span class="rv-card-meta">${p.rating}/5 — ${p.count?.toLocaleString("fr-FR")}</span></span></div>`;
    })
    .join("");

  const responsiveCss = `<style>
.rv-card{display:flex;align-items:center;gap:8px;padding:6px 10px;background:hsla(0,0%,100%,0.06);border-radius:8px;width:160px;height:44px;box-sizing:border-box}
.rv-logo{width:24px;height:24px;object-fit:contain;border-radius:4px;flex-shrink:0}
.rv-card-text{display:flex;flex-direction:column;line-height:1.15;min-width:0;flex:1}
.rv-card-name{font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rv-card-meta{opacity:0.7;font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:640px){
  .rv-card{width:auto;flex:1 1 calc(50% - 6px);min-width:0;padding:5px 8px;gap:6px;height:40px}
  .rv-logo{width:20px;height:20px}
  .rv-card-name{font-size:0.72rem}
  .rv-card-meta{font-size:0.62rem}
}
</style>`;

  const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="hsl(43,75%,55%)" stroke="hsl(43,75%,55%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const reviewCountInline = totalReviewCount > 0
    ? `<span style="font-family:'Josefin Sans',sans-serif;font-size:1rem;font-weight:500;color:rgba(255,255,255,0.6) !important;white-space:nowrap">· ${totalReviewCount.toLocaleString("fr-FR")} ${reviewLabel}</span>`
    : "";
  const ratingBlock = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap;justify-content:center;filter:drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))">${starSvg}<span style="font-family:'Josefin Sans',sans-serif;font-size:3rem;font-weight:900;color:hsl(43,75%,55%) !important;white-space:nowrap">${avgOn20}<span style="font-size:1.5rem;font-weight:600;color:rgba(255,255,255,0.6) !important">/20</span></span>${reviewCountInline}</div></div>`;
  const scoreInner = `${ratingBlock}<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${platformListHtml}</div>`;
  const scoreHtml = `${responsiveCss}<section style="padding:16px;border-radius:12px;background:hsla(0,0%,100%,0.04);margin-bottom:16px">${scoreInner}</section>`;

  const defaultReview = texts.find((r) => r.is_default);
  const otherReviews = texts.filter((r) => !r.is_default).slice(0, 10 - (defaultReview ? 1 : 0));

  const renderBlockquote = (r: ReviewText, highlighted = false) => {
    const displayText = (language === "en" ? r.text_en : r.text_fr) || r.text || "";
    const style = highlighted
      ? "margin:0;font-family:'Josefin Sans',sans-serif;font-size:1.05rem;line-height:1.625;font-weight:500"
      : "margin-top:4px;font-family:'Josefin Sans',sans-serif;font-size:1rem;line-height:1.625";
    return `<blockquote style="${style}"><p>${displayText}</p><footer style="font-family:'Roboto',sans-serif;font-size:1rem;font-style:normal;opacity:0.85">— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
  };

  const defaultHtml = defaultReview
    ? `<section style="padding:16px;border-radius:12px;background:hsla(43,75%,55%,0.12);border:1px solid hsla(43,75%,55%,0.35);margin-bottom:16px">${renderBlockquote(defaultReview, true)}</section>`
    : "";

  const othersHtml = otherReviews.length > 0
    ? `<section style="padding:16px;border-radius:12px;background:hsla(0,0%,100%,0.04)">${otherReviews.map((r) => renderBlockquote(r)).join("")}</section>`
    : "";

  return scoreHtml + defaultHtml + othersHtml;
}
