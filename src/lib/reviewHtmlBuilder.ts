/**
 * Builds HTML for the reviews overlay.
 * Extracted from BookOnlineSlidePanel to avoid recreating on every render.
 */

interface ReviewPlatform {
  name: string;
  rating: number | null;
  count: number | null;
  url: string | null;
}

interface ReviewText {
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
  variant: "card" | "sidebar" = "card",
) {
  const reviewLabel = language === "en" ? "reviews" : "avis";
  const activePlats = platforms.filter((p) => p.rating && p.count);

  if (variant === "sidebar") {
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

  // "card" variant (used by the flip card click)
  const platformListHtml = activePlats
    .map((p) => {
      const logo = LOGO_MAP[p.name] || "";
      const logoImg = logo
        ? `<img src="${logo}" alt="${p.name}" style="width:28px;height:28px;object-fit:contain;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'"/>`
        : "";
      return `<div style="display:flex;align-items:center;gap:6px;padding:1px 0"><span style="display:flex;align-items:center;gap:6px">${logoImg}<span><strong style="font-size:1rem">${p.name}</strong><br/><span style="opacity:0.7;font-size:0.82rem">${p.rating}/5 — ${p.count?.toLocaleString("fr-FR")} ${reviewLabel}</span></span></span></div>`;
    })
    .join("");

  const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="hsl(43,75%,55%)" stroke="hsl(43,75%,55%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const ratingBlock = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:12px;filter:drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))">${starSvg}<span style="font-family:'Josefin Sans',sans-serif;font-size:3rem;font-weight:900;color:hsl(43,75%,55%) !important">${avgOn20}<span style="font-size:1.5rem;font-weight:600;color:rgba(255,255,255,0.6) !important">/20</span></span></div></div>`;
  const scoreHtml = `${ratingBlock}<div style="display:flex;flex-direction:column;gap:4px">${platformListHtml}</div>`;

  const textsHtml = texts.length > 0
    ? texts.slice(0, 10).map((r) => {
      const displayText = (language === "en" ? r.text_en : r.text_fr) || r.text || "";
      return `<blockquote style="margin-top:4px;font-family:'Josefin Sans',sans-serif;font-size:1rem;line-height:1.625"><p>${displayText}</p><footer style="font-family:'Roboto',sans-serif;font-size:1rem;font-style:normal">— ${r.author_name || (language === "en" ? "Anonymous" : "Anonyme")}${r.source ? ` (${r.source})` : ""}</footer></blockquote>`;
    }).join("")
    : "";
  return scoreHtml + textsHtml;
}
