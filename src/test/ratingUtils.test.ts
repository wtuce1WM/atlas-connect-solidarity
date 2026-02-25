import { describe, it, expect } from "vitest";
import {
  collectRatingSources,
  computeWeightedRatingOn20,
  computeWeightedRatingOn5,
  getTotalReviewCount,
  formatRating,
} from "@/lib/ratingUtils";

describe("collectRatingSources", () => {
  it("returns empty array for no ratings", () => {
    expect(collectRatingSources({})).toEqual([]);
  });

  it("ignores sources with null rating or count", () => {
    expect(collectRatingSources({ google_rating: 4.5, google_review_count: null })).toEqual([]);
    expect(collectRatingSources({ google_rating: null, google_review_count: 100 })).toEqual([]);
  });

  it("collects all valid sources", () => {
    const sources = collectRatingSources({
      google_rating: 4.5,
      google_review_count: 200,
      tripadvisor_rating: 4.0,
      tripadvisor_review_count: 100,
    });
    expect(sources).toHaveLength(2);
    expect(sources[0]).toEqual({ rating: 4.5, count: 200 });
    expect(sources[1]).toEqual({ rating: 4.0, count: 100 });
  });
});

describe("computeWeightedRatingOn20", () => {
  it("returns null for empty sources", () => {
    expect(computeWeightedRatingOn20([])).toBeNull();
  });

  it("computes single source correctly", () => {
    // 4.5/5 * 20 = 18
    expect(computeWeightedRatingOn20([{ rating: 4.5, count: 100 }])).toBe(18);
  });

  it("computes weighted average", () => {
    // Google: 4.5/5*20=18, weight 200 => 3600
    // TA: 4.0/5*20=16, weight 100 => 1600
    // Total: 5200/300 = 17.333... => 17.33
    const result = computeWeightedRatingOn20([
      { rating: 4.5, count: 200 },
      { rating: 4.0, count: 100 },
    ]);
    expect(result).toBe(17.33);
  });
});

describe("computeWeightedRatingOn5", () => {
  it("returns null for empty sources", () => {
    expect(computeWeightedRatingOn5([])).toBeNull();
  });

  it("computes weighted average on /5", () => {
    // (4.5*200 + 4.0*100) / 300 = (900+400)/300 = 4.333... => 4.33
    const result = computeWeightedRatingOn5([
      { rating: 4.5, count: 200 },
      { rating: 4.0, count: 100 },
    ]);
    expect(result).toBe(4.33);
  });
});

describe("getTotalReviewCount", () => {
  it("returns 0 for empty object", () => {
    expect(getTotalReviewCount({})).toBe(0);
  });

  it("sums all sources", () => {
    expect(getTotalReviewCount({
      google_review_count: 200,
      tripadvisor_review_count: 100,
      restaurant_guru_review_count: 50,
    })).toBe(350);
  });
});

describe("formatRating", () => {
  it("formats integer without decimals", () => {
    expect(formatRating(18)).toBe("18");
  });

  it("formats with minimal decimals", () => {
    expect(formatRating(17.5)).toBe("17.5");
  });

  it("rounds to 2 decimals", () => {
    expect(formatRating(17.333)).toBe("17.33");
  });
});
