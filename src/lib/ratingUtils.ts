/**
 * Shared rating calculation utilities.
 * All ratings from sources (Google, TripAdvisor, Restaurant Guru) are on a /5 scale.
 * We normalize to /20 and compute a weighted average by review count, rounded to 2 decimals.
 */

export interface RatingSource {
  rating: number;  // on /5 scale
  count: number;   // number of reviews
}

/**
 * Build rating sources from a business-like object.
 */
export function collectRatingSources(business: {
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_rating?: number | null;
  restaurant_guru_review_count?: number | null;
  getyourguide_rating?: number | null;
  getyourguide_review_count?: number | null;
  viator_rating?: number | null;
  viator_review_count?: number | null;
}): RatingSource[] {
  const sources: RatingSource[] = [];
  if (business.google_rating && business.google_review_count) {
    sources.push({ rating: business.google_rating, count: business.google_review_count });
  }
  if (business.tripadvisor_rating && business.tripadvisor_review_count) {
    sources.push({ rating: business.tripadvisor_rating, count: business.tripadvisor_review_count });
  }
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) {
    sources.push({ rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count });
  }
  if (business.getyourguide_rating && business.getyourguide_review_count) {
    sources.push({ rating: business.getyourguide_rating, count: business.getyourguide_review_count });
  }
  if (business.viator_rating && business.viator_review_count) {
    sources.push({ rating: business.viator_rating, count: business.viator_review_count });
  }
  return sources;
}

/**
 * Compute weighted average rating on /20 scale, rounded to 2 decimal places.
 * Returns null if no sources.
 */
export function computeWeightedRatingOn20(sources: RatingSource[]): number | null {
  if (sources.length === 0) return null;
  const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
  if (totalCount === 0) return null;
  const weightedSum = sources.reduce((sum, s) => sum + (s.rating / 5) * 20 * s.count, 0);
  return Math.round((weightedSum / totalCount) * 100) / 100;
}

/**
 * Compute weighted average rating on /5 scale, rounded to 2 decimal places.
 * Returns null if no sources.
 */
export function computeWeightedRatingOn5(sources: RatingSource[]): number | null {
  if (sources.length === 0) return null;
  const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
  if (totalCount === 0) return null;
  const weightedSum = sources.reduce((sum, s) => sum + s.rating * s.count, 0);
  return Math.round((weightedSum / totalCount) * 100) / 100;
}

/**
 * Total review count across all sources.
 */
export function getTotalReviewCount(business: {
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
  getyourguide_review_count?: number | null;
  viator_review_count?: number | null;
}): number {
  return (business.google_review_count || 0) + (business.tripadvisor_review_count || 0) + (business.restaurant_guru_review_count || 0) + (business.getyourguide_review_count || 0) + (business.viator_review_count || 0);
}

/**
 * Format a rating for display: uses comma as decimal separator for French locale.
 * Shows up to 2 decimal places, removing trailing zeros.
 */
export function formatRating(value: number): string {
  // Round to 2 decimals
  const rounded = Math.round(value * 100) / 100;
  // Format: remove unnecessary trailing zeros
  const str = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return str;
}
