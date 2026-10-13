export type LocationSource = "gps" | "manual";
export type GpsCoords = { lat: number; lng: number };

// One browser watch shared by every mounted map/position consumer.
const listeners = new Set<(coords: GpsCoords | null) => void>();
let watchId: number | null = null;
let latest: GpsCoords | null = null;
let heading: number | null = null;

/** Last known travel direction in degrees (0 = north), or null if unknown. */
export function getGpsHeading(): number | null { return heading; }

function bearing(a: GpsCoords, b: GpsCoords): number {
  const r = Math.PI / 180, dl = (b.lng - a.lng) * r;
  const y = Math.sin(dl) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}
let lastFix: GpsCoords | null = null;

export function subscribeGps(listener: (coords: GpsCoords | null) => void): () => void {
  listeners.add(listener);
  if (latest) listener(latest);
  if (watchId === null && navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        latest = { lat: coords.latitude, lng: coords.longitude };
        if (coords.heading != null && !Number.isNaN(coords.heading) && (coords.speed ?? 1) > 0.5) {
          heading = coords.heading;
          lastFix = latest;
        } else if (!lastFix) {
          lastFix = latest;
        } else {
          const dy = (latest.lat - lastFix.lat) * 111320;
          const dx = (latest.lng - lastFix.lng) * 111320 * Math.cos(latest.lat * Math.PI / 180);
          if (Math.hypot(dx, dy) >= 8) { heading = bearing(lastFix, latest); lastFix = latest; }
        }
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
      heading = null;
      lastFix = null;
    }
  };
}