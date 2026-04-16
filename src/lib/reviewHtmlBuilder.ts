/**
 * Builds HTML for the reviews overlay (sidebar variant).
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
  _variant: "sidebar" = "sidebar",
) {
  const reviewLabel = language === "en" ? "reviews" : "avis";
  const activePlats = platforms.filter((p) => p.rating && p.count);

  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
  const platformListHtml = activePlats
    .map((p) => {
      const logo = LOGO_MAP[p.name] || "";
      const logoSize = isMobileViewport ? "22px" : "28px";
      const logoImg = logo
        ? `<img src="${logo}" alt="${p.name}" style="width:${logoSize};height:${logoSize};object-fit:contain;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'"/>`
        : "";
      if (isMobileViewport) {
        return `<div style="display:flex;align-items:center;gap:5px;padding:0"><span style="display:flex;align-items:center;gap:5px">${logoImg}<span><strong style="font-size:0.85rem">${p.name}</strong><br/><span style="opacity:0.7;font-size:0.72rem">${p.rating}/5 — ${p.count?.toLocaleString("fr-FR")} ${reviewLabel}</span></span></span></div>`;
      }
      return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="display:flex;align-items:center;gap:6px">${logoImg}<strong style="font-size:1.05rem">${p.name}</strong></span> <span style="opacity:0.7;font-size:0.95rem">— ${p.rating}/5 (${p.count?.toLocaleString("fr-FR")} ${reviewLabel})</span></div>`;
    })
    .join("");

  const scoreFontSize = isMobileViewport ? "2rem" : "2.6rem";
  const scoreHtml = `<div style="display:flex;align-items:center;gap:${isMobileViewport ? "6" : "8"}px;margin-bottom:0"><div style="flex:1">${platformListHtml}</div><div style="text-align:center;padding-left:${isMobileViewport ? "8" : "12"}px;border-left:1px solid rgba(255,255,255,0.1)"><div style="font-size:${scoreFontSize};font-weight:bold;color:hsl(43,75%,55%)">${avgOn20}</div><div class="review-score-zoom-delayed" style="font-size:0.8rem;color:hsl(43,75%,55%)">/20</div><div class="review-score-zoom-delayed" style="font-size:0.7rem;opacity:0.7;margin-top:0">${totalReviewCount.toLocaleString("fr-FR")} ${reviewLabel}</div></div></div>`;

  const textsHtml = texts.length > 0
    ? `${isMobileViewport ? "" : "<hr/>"}` + texts.slice(0, 10).map((r) => {
      const displayText = (language === "en" ? r.text_en : r.text_fr) || r.text || "";
      return `<blockquote style="font-family:'Josefin Sans',sans-serif;font-size:1rem;line-height:1.625"><p>${displayText}</p><footer style="font-family:'Josefin Sans',sans-serif;font-size:1rem">— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
    }).join("")
    : "";

  return scoreHtml + textsHtml;
}
