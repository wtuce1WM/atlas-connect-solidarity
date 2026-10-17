import { describe, expect, it } from "vitest";
import { getHotelResultView } from "@/lib/hotelResultView";

const coords = { lat: 31.63, lng: -7.99 };
const hotels = Array.from({ length: 17 }, (_, i) => ({
  businessId: String(i),
  serpPrice: 100 + i,
  dbBusiness: { latitude: coords.lat + (i < 3 ? 0.001 : 0.1), longitude: coords.lng },
}));

describe("hotel radius and pagination", () => {
  it("counts only the 3 hotels within a selected 1 km radius, out of 17", () => {
    const view = getHotelResultView(hotels, { coords, radiusKm: 1 });
    expect(view.total).toBe(3);
    expect(view.visible).toHaveLength(3);
    expect(view.remaining).toBe(0);
  });
  it("returns zero count and no more results when all hotels are outside the radius", () => {
    const view = getHotelResultView(hotels.slice(3), { coords, radiusKm: 1 });
    expect(view.total).toBe(0);
    expect(view.visible).toEqual([]);
    expect(view.remaining).toBe(0);
  });
  it("does not inherit another search's explicit radius", () => {
    getHotelResultView(hotels, { coords, radiusKm: 1 });
    const nextSearch = getHotelResultView(hotels, { coords });
    expect(nextSearch.total).toBe(17);
    expect(nextSearch.remaining).toBe(13);
  });
  it("shows 4 more from the filtered collection and stops at its end", () => {
    const view = getHotelResultView(hotels, { coords, radiusKm: 20, shown: 8 });
    expect(view.visible).toHaveLength(8);
    expect(view.remaining).toBe(9);
    expect(getHotelResultView(hotels, { coords, radiusKm: 20, shown: 20 }).remaining).toBe(0);
  });
  it("combines price and distance sorting with the radius before slicing", () => {
    const view = getHotelResultView([...hotels].reverse(), { coords, radiusKm: 1, sort: "price", shown: 2 });
    expect(view.visible.map((h) => h.businessId)).toEqual(["0", "1"]);
    const nearest = getHotelResultView([hotels[3], hotels[0]], { coords, sort: "distance" });
    expect(nearest.ordered.map((h) => h.businessId)).toEqual(["0", "3"]);
  });
});