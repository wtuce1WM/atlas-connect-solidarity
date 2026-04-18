/**
 * Convert a TripAdvisor listing URL into the "Leave a review" (UserReviewEdit) URL.
 *
 * Examples:
 *   Attraction_Review-g293734-d25458197-Reviews-The_BURN_Marrakech-Marrakech_Marrakech_Safi.html
 * → UserReviewEdit-g293734-d25458197-The_BURN_Marrakech-Marrakech_Marrakech_Safi.html
 *
 * Works for Attraction_Review, Hotel_Review and Restaurant_Review.
 * Returns null if the URL doesn't match the expected pattern.
 */
export function tripadvisorReviewUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /^(https?:\/\/[^/]+\/)(?:Attraction|Hotel|Restaurant)_Review-(g\d+-d\d+)-Reviews-(.+\.html)(\?.*)?$/i,
  );
  if (!m) return null;
  return `${m[1]}UserReviewEdit-${m[2]}-${m[3]}${m[4] || ""}`;
}
