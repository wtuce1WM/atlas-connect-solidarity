import { haversineKm } from "@/lib/haversine";
import { parseSerpAmount } from "@/lib/parseSerpAmount";

interface Hotel {
  serpPrice?: unknown;
  dbBusiness?: { latitude?: unknown; longitude?: unknown; min_price?: unknown };
}

/** The same filtered collection drives the count, tiles and pagination. */
export function getHotelResultView<T extends Hotel>(
  hotels: T[],
  options: {
    coords?: { lat: number; lng: number } | null;
    radiusKm?: number;
    sort?: "price" | "distance";
    shown?: number;
  } = {},
) {
  const distance = (hotel: T) => {
    const lat = Number(hotel.dbBusiness?.latitude);
    const lng = Number(hotel.dbBusiness?.longitude);
    if (!options.coords || !Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return Infinity;
    return haversineKm(options.coords.lat, options.coords.lng, lat, lng);
  };
  const price = (hotel: T) => parseSerpAmount(hotel.serpPrice) ?? parseSerpAmount(hotel.dbBusiness?.min_price) ?? Infinity;
  const filtered = options.coords && options.radiusKm !== undefined
    ? hotels.filter((hotel) => distance(hotel) <= Number(options.radiusKm))
    : hotels;
  const ordered = options.sort
    ? [...filtered].sort((a, b) => options.sort === "price" ? price(a) - price(b) : distance(a) - distance(b))
    : filtered;
  const shown = options.shown ?? 4;
  return { ordered, visible: ordered.slice(0, shown), total: ordered.length, remaining: Math.max(0, ordered.length - shown) };
}