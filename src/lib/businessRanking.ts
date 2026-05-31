/**
 * Shared ranking logic — same as SearchPage.
 *
 * Order:
 *   1. WTUCE verified businesses first (sorted by priority_score desc).
 *   2. Then non-verified by priority_score desc.
 *   3. Then by effective rating desc, IGNORING any business with < 10 reviews
 *      (those go to the end with rating = -1).
 *
 * Used on every catalog/listing page (Category, Subcategory, Neighborhood,
 * Destination, Home badge grid). The Homepage itself is JSON-driven and does
 * NOT use this ranking.
 */
export const getEffectiveRatingForRank = (b: any): number | null => {
  return b?.computed_rating ?? (b?.rating ? Number(b.rating) : null);
};

export const sortWtuceAndRating = (a: any, b: any): number => {
  const aVerified = a?.wtuce_status === "verified" ? 0 : 1;
  const bVerified = b?.wtuce_status === "verified" ? 0 : 1;
  if (aVerified !== bVerified) return aVerified - bVerified;

  // Verified > priority_score desc > rating desc (ignore <10 reviews)
  const aPrio = (a?.priority_score) || 0;
  const bPrio = (b?.priority_score) || 0;
  if (aPrio !== bPrio) return bPrio - aPrio;

  const aCount = a?.total_review_count ?? 0;
  const bCount = b?.total_review_count ?? 0;
  const aRating = aCount >= 10 ? (getEffectiveRatingForRank(a) ?? -1) : -1;
  const bRating = bCount >= 10 ? (getEffectiveRatingForRank(b) ?? -1) : -1;
  return bRating - aRating;
};
