/**
 * Returns the URL path for a business detail page.
 * Prefers slug for SEO-friendly URLs, falls back to id.
 */
export function businessUrl(business: { id: string; slug?: string | null }): string {
  const slug = (business as any).slug;
  return `/fiche/${slug || business.id}`;
}
/**
 * Build the canonical share URL for a business.
 * The site's static index.html exposes OG meta tags for social crawlers,
 * so we share the real page URL directly (no edge-function proxy).
 */
export function buildOgShareUrl(slug: string): string {
  return `https://oneworldmorocco.com/fiche/${encodeURIComponent(slug)}`;
}
