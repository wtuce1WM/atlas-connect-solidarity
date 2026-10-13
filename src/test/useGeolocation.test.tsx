import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "@/hooks/useGeolocation";
import { KOUTOUBIA_COORDS } from "@/lib/supportedGeoRegion";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => {
    const query = {
      select: () => query, eq: () => query, not: () => query,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [
        { name_fr: "Marrakech", name: "Gueliz", latitude: 31.63, longitude: -7.99 },
      ] }).then(resolve),
    };
    return query;
  } },
}));

let success: PositionCallback;
const watchPosition = vi.fn((callback: PositionCallback) => { success = callback; return 42; });
const clearWatch = vi.fn();
const fix = (lat: number, lng: number) => act(() => {
  success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true, value: { watchPosition, clearWatch },
  });
});
afterEach(cleanup);

describe("GPS location source", () => {
  it("shares one watch and moves every consumer after a GPS confirmation", async () => {
    const a = renderHook(() => useGeolocation());
    const b = renderHook(() => useGeolocation());
    act(() => a.result.current.setManualLocation({ lat: 31.63, lng: -7.99 }, "Ma position", "gps"));
    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
    fix(31.635, -7.985);
    expect(a.result.current.userMarkerCoords).toEqual({ lat: 31.635, lng: -7.985 });
    expect(b.result.current.userMarkerCoords).toEqual({ lat: 31.635, lng: -7.985 });
    expect(b.result.current.isGpsTracking).toBe(true);
    expect(localStorage.getItem("geo_manual_coords")).toBeNull();
    a.unmount();
    expect(clearWatch).not.toHaveBeenCalled();
    b.unmount();
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it("stops GPS when a fixed address replaces it, and resumes after Ma position", async () => {
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.setManualLocation({ lat: 31.63, lng: -7.99 }, "GPS", "gps"));
    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
    act(() => result.current.setManualLocation({ lat: 31.62, lng: -7.98 }, "Adresse fixe"));
    expect(result.current.isGpsTracking).toBe(false);
    expect(result.current.coords).toEqual({ lat: 31.62, lng: -7.98 });
    expect(clearWatch).toHaveBeenCalledWith(42);
    act(() => result.current.setManualLocation({ lat: 31.64, lng: -7.97 }, "GPS", "gps"));
    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(2));
    fix(31.65, -7.96);
    expect(result.current.coords).toEqual({ lat: 31.65, lng: -7.96 });
    act(() => result.current.decline());
    expect(clearWatch).toHaveBeenCalledTimes(2);
    expect(result.current.userMarkerCoords).toBeNull();
  });

  it("restores GPS tracking after reload without turning it into a manual address", async () => {
    localStorage.setItem("geo_preference", "enabled");
    localStorage.setItem("geo_auto_coords", JSON.stringify({ lat: 31.63, lng: -7.99 }));
    localStorage.setItem("geo_auto_raw_coords", JSON.stringify({ lat: 31.63, lng: -7.99 }));
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
    fix(31.65, -7.98);
    expect(result.current.userMarkerCoords).toEqual({ lat: 31.65, lng: -7.98 });
  });

  it("keeps real GPS distinct from the regional catalog fallback", async () => {
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.setManualLocation({ lat: 33.57, lng: -7.59 }, "GPS", "gps"));
    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
    fix(33.58, -7.58);
    expect(result.current.coords).toEqual(KOUTOUBIA_COORDS);
    expect(result.current.gpsCoords).toEqual({ lat: 33.58, lng: -7.58 });
    expect(result.current.userMarkerCoords).toEqual({ lat: 33.58, lng: -7.58 });
    fix(48.85, 2.35);
    expect(result.current.userMarkerCoords).toBeNull();
    expect(result.current.gpsCoords).toEqual({ lat: 48.85, lng: 2.35 });
  });
});