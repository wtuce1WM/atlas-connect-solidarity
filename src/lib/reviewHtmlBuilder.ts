/**
 * Builds HTML for the reviews overlay (card variant with centered star score).
 */

import { tripadvisorReviewUrl } from "./tripadvisorUrl";

interface ReviewPlatform {
  name: string;
  rating: number | null;
  count: number | null;
  url: string | null;
  /** Optional: original listing URL used to derive a "leave a review" link */
  listingUrl?: string | null;
  /** Optional: explicit "leave a review" URL (e.g. Google review URL) */
  leaveReviewUrl?: string | null;
}

export interface ReviewText {
  text: string | null;
  author_name: string | null;
  source: string;
  text_fr?: string | null;
  text_en?: string | null;
  text_ar?: string | null;
  is_default?: boolean;
  /** Extrait mis en avant (jaune, gras) */
  highlight?: string | null;
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

  const leaveReviewLabel = language === "en" ? "Leave a review" : "Laisser un avis";

  const platformListHtml = activePlats
    .map((p) => {
      const logo = LOGO_MAP[p.name] || "";
      const logoImg = logo
        ? `<img src="${logo}" alt="${p.name}" class="rv-logo" onerror="this.style.display='none'"/>`
        : "";
      const cardInner = `${logoImg}<span class="rv-card-text"><strong class="rv-card-name">${p.name}</strong><span class="rv-card-meta">${p.rating}/5 — ${p.count?.toLocaleString("fr-FR")}</span></span>`;
      const card = p.url
        ? `<a class="rv-card" href="${p.url}" target="_blank" rel="noopener noreferrer">${cardInner}</a>`
        : `<div class="rv-card">${cardInner}</div>`;

      // Determine "leave a review" link: explicit > derived (TripAdvisor only)
      let reviewHref: string | null = p.leaveReviewUrl || null;
      if (!reviewHref && p.name === "TripAdvisor") {
        reviewHref = tripadvisorReviewUrl(p.listingUrl || p.url);
      }
      const leaveBtn = reviewHref
        ? `<a class="rv-leave" href="${reviewHref}" target="_blank" rel="noopener noreferrer">✍️ ${leaveReviewLabel}</a>`
        : "";

      return `<div class="rv-card-wrap">${card}${leaveBtn}</div>`;
    })
    .join("");

  const responsiveCss = `<style>
.rv-card-wrap{display:flex;flex-direction:column;gap:4px;width:160px}
.rv-card{display:flex;align-items:center;gap:8px;padding:6px 10px;background:hsla(0,0%,100%,0.06);border-radius:8px;width:100%;height:44px;box-sizing:border-box;text-decoration:none;color:inherit}
a.rv-card:hover{background:hsla(0,0%,100%,0.12)}
.rv-leave{display:flex;align-items:center;justify-content:center;gap:4px;font-size:0.7rem;padding:4px 6px;background:#C04F17;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;white-space:nowrap;font-family:'Montserrat',sans-serif}
.rv-leave:hover{filter:brightness(1.1)}
.rv-logo{width:24px;height:24px;object-fit:contain;border-radius:4px;flex-shrink:0}
.rv-card-text{display:flex;flex-direction:column;line-height:1.15;min-width:0;flex:1}
.rv-card-name{font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rv-card-meta{opacity:0.7;font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:640px){
  .rv-card-wrap{width:auto;flex:1 1 calc(50% - 6px);min-width:0}
  .rv-card{padding:5px 8px;gap:6px;height:40px}
  .rv-logo{width:20px;height:20px}
  .rv-card-name{font-size:0.72rem}
  .rv-card-meta{font-size:0.62rem}
  .rv-leave{font-size:0.62rem;padding:3px 5px}
}
</style>`;

  const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="hsl(43,75%,55%)" stroke="hsl(43,75%,55%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const reviewCountInline = totalReviewCount > 0
    ? `<span style="font-family:'Montserrat',sans-serif;font-size:1rem;font-weight:500;color:rgba(255,255,255,0.6) !important;white-space:nowrap">· ${totalReviewCount.toLocaleString("fr-FR")} ${reviewLabel}</span>`
    : "";
  const ratingBlock = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap;justify-content:center;filter:drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))">${starSvg}<span style="font-family:'Montserrat',sans-serif;font-size:3rem;font-weight:900;color:hsl(43,75%,55%) !important;white-space:nowrap">${avgOn20}<span style="font-size:1.5rem;font-weight:600;color:rgba(255,255,255,0.6) !important">/20</span></span>${reviewCountInline}</div></div>`;
  const scoreHtml = `${responsiveCss}${ratingBlock}<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${platformListHtml}</div>`;

  const textsHtml = texts.length > 0
    ? texts.slice(0, 10).map((r) => {
      let displayText = "";
      if (language === "ar") {
        displayText = r.text_ar || r.text_fr || r.text_en || r.text || "";
      } else if (language === "en") {
        displayText = r.text_en || r.text_fr || r.text || "";
      } else {
        displayText = r.text_fr || r.text || "";
      }
      return `<blockquote style="margin-top:4px;font-family:'Montserrat',sans-serif;font-size:1rem;line-height:1.625"><p>${displayText}</p><footer style="font-family:'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif;font-size:1rem;font-style:normal">— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
    }).join("")
    : "";

  return scoreHtml + textsHtml;
}
