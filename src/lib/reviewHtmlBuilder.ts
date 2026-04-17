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
  TripAdvisor: "https://static.tacdn.com/img2/brand_refresh/Tripadvisor_logoset_solid_green.svg",
  "Restaurant Guru": "https://www.restaurantguru.com/favicon.ico",
  Trustpilot: "https://cdn.trustpilot.net/brand-assets/4.1.0/logo-black.svg",
  GetYourGuide: "https://cdn.getyourguide.com/tf/assets/static/favicon.ico",
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
        ? `<img src="${logo}" alt="${p.name}" style="width:24px;height:24px;object-fit:contain;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'"/>`
        : "";
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:hsla(0,0%,100%,0.06);border-radius:8px;width:160px;height:44px;box-sizing:border-box">${logoImg}<span style="display:flex;flex-direction:column;line-height:1.15;min-width:0;flex:1"><strong style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</strong><span style="opacity:0.7;font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.rating}/5 — ${p.count?.toLocaleString("fr-FR")}</span></span></div>`;
    })
    .join("");

  const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="hsl(43,75%,55%)" stroke="hsl(43,75%,55%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const ratingBlock = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:12px;filter:drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))">${starSvg}<span style="font-family:'Josefin Sans',sans-serif;font-size:3rem;font-weight:900;color:hsl(43,75%,55%) !important">${avgOn20}<span style="font-size:1.5rem;font-weight:600;color:rgba(255,255,255,0.6) !important">/20</span></span></div></div>`;
  const scoreHtml = `${ratingBlock}<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${platformListHtml}</div>`;

  const textsHtml = texts.length > 0
    ? texts.slice(0, 10).map((r) => {
      const displayText = (language === "en" ? r.text_en : r.text_fr) || r.text || "";
      return `<blockquote style="margin-top:4px;font-family:'Josefin Sans',sans-serif;font-size:1rem;line-height:1.625"><p>${displayText}</p><footer style="font-family:'Roboto',sans-serif;font-size:1rem;font-style:normal">— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
    }).join("")
    : "";

  return scoreHtml + textsHtml;
}
