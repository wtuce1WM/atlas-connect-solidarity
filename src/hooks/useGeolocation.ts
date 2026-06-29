import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GeoCity {
  name_fr: string;
  latitude: number;
  longitude: number;
}

interface GeoNeighborhood {
  name: string;
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  /** User's detected city (nearest from DB), or null */
  detectedCity: string | null;
  /** User's detected neighborhood (nearest from DB), or null */
  detectedNeighborhood: string | null;
  /** Whether geolocation is enabled by the user */
  isEnabled: boolean;
  /** Whether the consent banner should be shown */
  showBanner: boolean;
  /** Loading state while detecting */
  isDetecting: boolean;
  /** User's raw coords */
  coords: { lat: number; lng: number } | null;
  /** The confirmed address label (from manual pick or auto-detect) */
  confirmedAddress: string | null;
  /** Accept geolocation */
  accept: () => void;
  /** Decline geolocation */
  decline: () => void;
  /** Toggle on/off after initial choice */
  toggle: () => void;
  /** Dismiss the banner without choosing (same as decline) */
  dismiss: () => void;
  /** Manually set coords + address (from location picker) */
  setManualLocation: (coords: { lat: number; lng: number }, address: string) => void;
  /** Manually set city by name (from city dropdown) */
  setManualCity: (cityName: string) => void;
}

const STORAGE_KEY = "geo_preference";
const MANUAL_COORDS_KEY = "geo_manual_coords";
const MANUAL_ADDRESS_KEY = "geo_manual_address";
const AUTO_COORDS_KEY = "geo_auto_coords";

interface InitialGeolocationSnapshot {
  isEnabled: boolean;
  showBanner: boolean;
  coords: { lat: number; lng: number } | null;
  confirmedAddress: string | null;
  isManual: boolean;
}

function readInitialGeolocationSnapshot(): InitialGeolocationSnapshot {
  if (typeof window === "undefined") {
    return { isEnabled: false, showBanner: false, coords: null, confirmedAddress: null, isManual: false };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const manualCoordsStr = localStorage.getItem(MANUAL_COORDS_KEY);
  const autoCoordsStr = localStorage.getItem(AUTO_COORDS_KEY);
  const manualAddr = localStorage.getItem(MANUAL_ADDRESS_KEY);
  let manualCoords: { lat: number; lng: number } | null = null;
  let autoCoords: { lat: number; lng: number } | null = null;

  if (manualCoordsStr) {
    try {
      manualCoords = JSON.parse(manualCoordsStr);
    } catch {
      manualCoords = null;
    }
  }

  if (autoCoordsStr) {
    try {
      autoCoords = JSON.parse(autoCoordsStr);
    } catch {
      autoCoords = null;
    }
  }

  if (manualCoords || manualAddr) {
    return { isEnabled: true, showBanner: false, coords: manualCoords, confirmedAddress: manualAddr || null, isManual: true };
  }


  return {
    isEnabled: stored === "enabled",
    showBanner: stored === null,
    coords: stored === "enabled" ? autoCoords : null,
    confirmedAddress: null,
    isManual: false,
  };
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find nearest neighborhood within 2km */
function findNearestNeighborhood(
  lat: number, lng: number,
  neighborhoods: GeoNeighborhood[]
): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const nh of neighborhoods) {
    if (nh.latitude == null || nh.longitude == null) continue;
    const dist = haversineDistance(lat, lng, nh.latitude, nh.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = nh.name;
    }
  }
  return minDist <= 2 ? nearest : null;
}

function findNearestCity(lat: number, lng: number, cities: GeoCity[]): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;

  for (const city of cities) {
    if (city.latitude == null || city.longitude == null) continue;
    const dist = haversineDistance(lat, lng, city.latitude, city.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = city.name_fr;
    }
  }

  return minDist <= 100 ? nearest : null;
}

export function useGeolocation(): GeolocationState {
  const initialRef = useRef<InitialGeolocationSnapshot | null>(null);
  if (initialRef.current === null) initialRef.current = readInitialGeolocationSnapshot();
  const initial = initialRef.current;

  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedNeighborhood, setDetectedNeighborhood] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled);
  const [showBanner, setShowBanner] = useState(initial.showBanner);
  const [isDetecting, setIsDetecting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial.coords);
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(initial.confirmedAddress);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<GeoNeighborhood[]>([]);
  const [isManual, setIsManual] = useState(initial.isManual);

  // Load cities and neighborhoods with coordinates on mount
  useEffect(() => {
    supabase
      .from("cities")
      .select("name_fr, latitude, longitude")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .then(({ data }) => {
        if (data) setCities(data as GeoCity[]);
      });

    supabase
      .from("neighborhoods")
      .select("name, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .then(({ data }) => {
        if (data) setNeighborhoods(data as GeoNeighborhood[]);
      });
  }, []);

  // Restore manual location from localStorage (initial mount + cross-instance sync)
  const hydrateFromStorage = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const manualCoordsStr = localStorage.getItem(MANUAL_COORDS_KEY);
    const manualAddr = localStorage.getItem(MANUAL_ADDRESS_KEY);

    if (stored === null) {
      setShowBanner(true);
    } else if (stored === "enabled") {
      setIsEnabled(true);
      setShowBanner(false);
    } else {
      setIsEnabled(false);
      setShowBanner(false);
    }

    if (manualCoordsStr || manualAddr) {
      try {
        const parsed = manualCoordsStr ? JSON.parse(manualCoordsStr) : null;
        setCoords(parsed);
        setConfirmedAddress(manualAddr || null);
        setIsManual(true);
        setIsEnabled(true);
        setShowBanner(false);
      } catch {
        // ignore parse errors
      }
    } else {
      // No manual location stored — clear any stale local state
      setIsManual(false);
      setConfirmedAddress(null);
    }
  }, []);

  useEffect(() => {
    hydrateFromStorage();
    const onChange = () => hydrateFromStorage();
    window.addEventListener("geo:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("geo:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [hydrateFromStorage]);

  // Detect neighborhood when coords and neighborhoods are available
  useEffect(() => {
    if (!coords || neighborhoods.length === 0) {
      setDetectedNeighborhood(null);
      return;
    }
    setDetectedNeighborhood(findNearestNeighborhood(coords.lat, coords.lng, neighborhoods));
  }, [coords, neighborhoods]);

  // Restore the city for manually confirmed locations after navigation/reload.
  useEffect(() => {
    if (!isManual || cities.length === 0) return;

    const exactCity = confirmedAddress
      ? cities.find((city) => city.name_fr.trim().toLowerCase() === confirmedAddress.trim().toLowerCase())
      : null;

    if (exactCity) {
      setDetectedCity(exactCity.name_fr);
      return;
    }

    if (coords) {
      setDetectedCity(findNearestCity(coords.lat, coords.lng, cities));
    }
  }, [isManual, confirmedAddress, coords, cities]);

  // Detect position when enabled (only if not manual)
  useEffect(() => {
    if (!isEnabled || cities.length === 0 || isManual) {
      if (!isEnabled && !isManual) {
        setDetectedCity(null);
        setDetectedNeighborhood(null);
        setCoords(null);
        setConfirmedAddress(null);
      }
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem(AUTO_COORDS_KEY, JSON.stringify({ lat: latitude, lng: longitude }));
        setCoords({ lat: latitude, lng: longitude });

        setDetectedCity(findNearestCity(latitude, longitude, cities));
        setIsDetecting(false);
        import("@/lib/analytics").then(({ trackEvent }) =>
          trackEvent("geolocation_granted", { source: "browser" })
        ).catch(() => {});
      },
      (err) => {
        // User denied or error
        setIsDetecting(false);
        setDetectedCity(null);
        import("@/lib/analytics").then(({ trackEvent }) =>
          trackEvent("geolocation_denied", { code: err?.code, message: err?.message?.slice(0, 120) })
        ).catch(() => {});
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [isEnabled, cities, isManual]);

  const broadcast = () => {
    try { window.dispatchEvent(new CustomEvent("geo:changed")); } catch { /* noop */ }
  };

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "enabled");
    localStorage.removeItem(MANUAL_COORDS_KEY);
    localStorage.removeItem(MANUAL_ADDRESS_KEY);
    localStorage.removeItem(AUTO_COORDS_KEY);
    setIsManual(false);
    setConfirmedAddress(null);
    setIsEnabled(true);
    setShowBanner(false);
    broadcast();
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "disabled");
    setIsEnabled(false);
    setShowBanner(false);
    broadcast();
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled) {
      localStorage.setItem(STORAGE_KEY, "disabled");
      localStorage.removeItem(AUTO_COORDS_KEY);
      setIsEnabled(false);
    } else {
      localStorage.setItem(STORAGE_KEY, "enabled");
      localStorage.removeItem(MANUAL_COORDS_KEY);
      localStorage.removeItem(MANUAL_ADDRESS_KEY);
      localStorage.removeItem(AUTO_COORDS_KEY);
      setIsManual(false);
      setConfirmedAddress(null);
      setIsEnabled(true);
    }
    broadcast();
  }, [isEnabled]);

  const dismiss = useCallback(() => {
    decline();
  }, [decline]);

  const setManualLocation = useCallback((newCoords: { lat: number; lng: number }, address: string) => {
    localStorage.setItem(STORAGE_KEY, "enabled");
    localStorage.setItem(MANUAL_COORDS_KEY, JSON.stringify(newCoords));
    localStorage.setItem(MANUAL_ADDRESS_KEY, address);
    setCoords(newCoords);
    setConfirmedAddress(address);
    setIsManual(true);
    setIsEnabled(true);
    setShowBanner(false);

    // Eagerly detect neighborhood from new coords
    if (neighborhoods.length > 0) {
      setDetectedNeighborhood(findNearestNeighborhood(newCoords.lat, newCoords.lng, neighborhoods));
    }

    // Find nearest city for the manual coords
    if (cities.length > 0) {
      let nearest: string | null = null;
      let minDist = Infinity;
      for (const city of cities) {
        if (city.latitude == null || city.longitude == null) continue;
        const dist = haversineDistance(newCoords.lat, newCoords.lng, city.latitude, city.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearest = city.name_fr;
        }
      }
      setDetectedCity(minDist <= 100 ? nearest : null);
    }
    broadcast();
  }, [cities, neighborhoods]);

  const setManualCity = useCallback((cityName: string) => {
    localStorage.setItem(STORAGE_KEY, "enabled");
    // Find city coords if available
    const city = cities.find((c) => c.name_fr === cityName);
    if (city?.latitude != null && city?.longitude != null) {
      const newCoords = { lat: city.latitude, lng: city.longitude };
      localStorage.setItem(MANUAL_COORDS_KEY, JSON.stringify(newCoords));
      localStorage.setItem(MANUAL_ADDRESS_KEY, cityName);
      setCoords(newCoords);
    } else {
      localStorage.removeItem(MANUAL_COORDS_KEY);
      localStorage.setItem(MANUAL_ADDRESS_KEY, cityName);
      setCoords(null);
    }
    setConfirmedAddress(cityName);
    setDetectedCity(cityName);
    setIsManual(true);
    setIsEnabled(true);
    setShowBanner(false);
    broadcast();
  }, [cities]);

  return {
    detectedCity,
    detectedNeighborhood,
    isEnabled,
    showBanner,
    isDetecting,
    coords,
    confirmedAddress,
    accept,
    decline,
    toggle,
    dismiss,
    setManualLocation,
    setManualCity,
  };
}
