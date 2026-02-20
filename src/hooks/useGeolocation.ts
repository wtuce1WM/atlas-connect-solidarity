import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GeoCity {
  name_fr: string;
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  /** User's detected city (nearest from DB), or null */
  detectedCity: string | null;
  /** Whether geolocation is enabled by the user */
  isEnabled: boolean;
  /** Whether the consent banner should be shown */
  showBanner: boolean;
  /** Loading state while detecting */
  isDetecting: boolean;
  /** User's raw coords */
  coords: { lat: number; lng: number } | null;
  /** Accept geolocation */
  accept: () => void;
  /** Decline geolocation */
  decline: () => void;
  /** Toggle on/off after initial choice */
  toggle: () => void;
  /** Dismiss the banner without choosing (same as decline) */
  dismiss: () => void;
}

const STORAGE_KEY = "geo_preference";

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

export function useGeolocation(): GeolocationState {
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cities, setCities] = useState<GeoCity[]>([]);

  // Load cities with coordinates on mount
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
  }, []);

  // Check stored preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // First visit — show banner
      setShowBanner(true);
    } else if (stored === "enabled") {
      setIsEnabled(true);
      setShowBanner(false);
    } else {
      // "disabled"
      setIsEnabled(false);
      setShowBanner(false);
    }
  }, []);

  // Detect position when enabled
  useEffect(() => {
    if (!isEnabled || cities.length === 0) {
      if (!isEnabled) {
        setDetectedCity(null);
        setCoords(null);
      }
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Find nearest city
        let nearest: string | null = null;
        let minDist = Infinity;

        for (const city of cities) {
          if (city.latitude == null || city.longitude == null) continue;
          const dist = haversineDistance(latitude, longitude, city.latitude, city.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearest = city.name_fr;
          }
        }

        // Only set city if within 100km of a known city
        setDetectedCity(minDist <= 100 ? nearest : null);
        setIsDetecting(false);
      },
      () => {
        // User denied or error
        setIsDetecting(false);
        setDetectedCity(null);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [isEnabled, cities]);

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "enabled");
    setIsEnabled(true);
    setShowBanner(false);
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "disabled");
    setIsEnabled(false);
    setShowBanner(false);
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled) {
      localStorage.setItem(STORAGE_KEY, "disabled");
      setIsEnabled(false);
    } else {
      localStorage.setItem(STORAGE_KEY, "enabled");
      setIsEnabled(true);
    }
  }, [isEnabled]);

  const dismiss = useCallback(() => {
    decline();
  }, [decline]);

  return {
    detectedCity,
    isEnabled,
    showBanner,
    isDetecting,
    coords,
    accept,
    decline,
    toggle,
    dismiss,
  };
}
