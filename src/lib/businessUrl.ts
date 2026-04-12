/**
 * Returns the URL path for a business detail page.
 * Prefers slug for SEO-friendly URLs, falls back to id.
 */
export function businessUrl(business: { id: string; slug?: string | null }): string {
  const slug = (business as any).slug;
  return `/fiche/${slug || business.id}`;
}
/**
 * Build the OG-proxy share URL for a business.
 * Social-media bots will read dynamic OG meta tags from this edge function,
 * then <meta http-equiv="refresh"> redirects human visitors to the real page.
 */
export function buildOgShareUrl(slug: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/og-image?slug=${encodeURIComponent(slug)}`;
}
