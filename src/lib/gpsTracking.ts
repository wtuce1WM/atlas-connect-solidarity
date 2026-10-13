export type LocationSource = "gps" | "manual";
export type GpsCoords = { lat: number; lng: number };

// One browser watch shared by every mounted map/position consumer.
const listeners = new Set<(coords: GpsCoords | null) => void>();
let watchId: number | null = null;
let latest: GpsCoords | null = null;

export function subscribeGps(listener: (coords: GpsCoords | null) => void): () => void {
  listeners.add(listener);
  if (latest) listener(latest);
  if (watchId === null && navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        latest = { lat: coords.latitude, lng: coords.longitude };
        listeners.forEach((notify) => notify(latest));
      },
      () => listeners.forEach((notify) => notify(null)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
      watchId = null;
      latest = null;
    }
  };
}