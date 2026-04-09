/**
 * Returns the URL path for a business detail page.
 * Prefers slug for SEO-friendly URLs, falls back to id.
 */
export function businessUrl(business: { id: string; slug?: string | null }): string {
  const slug = (business as any).slug;
  return `/fiche/${slug || business.id}`;
}
