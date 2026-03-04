import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Phone, ExternalLink, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

// Fix leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapBusiness {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  main_category?: string | null;
  categories?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wtuce_status?: string | null;
  logo_url?: string | null;
  neighborhood?: string | null;
}

interface BusinessMapProps {
  /** If provided, only these businesses are shown. Otherwise, all active businesses are fetched. */
  businesses?: MapBusiness[];
  /** Optional: center the map on these coordinates */
  center?: { lat: number; lng: number };
  /** Optional: initial zoom level */
  zoom?: number;
  /** Optional: height of the map container */
  height?: string;
  /** Optional: show a loading state */
  isLoading?: boolean;
}

// Custom marker icons
const createMarkerIcon = (isVerified: boolean) => {
  const color = isVerified ? "#D4AF37" : "#3b82f6";
  const borderColor = isVerified ? "#B8860B" : "#2563eb";
  const badge = isVerified
    ? `<circle cx="20" cy="6" r="6" fill="#D4AF37" stroke="white" stroke-width="1.5"/><text x="20" y="9" text-anchor="middle" fill="white" font-size="8" font-weight="bold">✓</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <defs>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M14 0 C6.268 0 0 6.268 0 14 C0 24.5 14 40 14 40 S28 24.5 28 14 C28 6.268 21.732 0 14 0Z" 
          fill="${color}" stroke="${borderColor}" stroke-width="1" filter="url(#shadow)"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    ${badge}
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "custom-map-marker",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
};

const BusinessMap = ({
  businesses: externalBusinesses,
  center,
  zoom = 6,
  height = "500px",
  isLoading: externalLoading,
}: BusinessMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const [internalBusinesses, setInternalBusinesses] = useState<MapBusiness[]>([]);
  const [internalLoading, setInternalLoading] = useState(!externalBusinesses);

  const businesses = externalBusinesses || internalBusinesses;
  const isLoading = externalLoading ?? internalLoading;

  // Fetch all businesses if none provided externally
  useEffect(() => {
    if (externalBusinesses) return;

    const fetchAll = async () => {
      setInternalLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, address, phone, whatsapp, main_category, categories, latitude, longitude, wtuce_status, logo_url, neighborhood")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (data) setInternalBusinesses(data as MapBusiness[]);
      setInternalLoading(false);
    };
    fetchAll();
  }, [externalBusinesses]);

  const geoBusinesses = useMemo(
    () => businesses.filter((b) => b.latitude != null && b.longitude != null),
    [businesses]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center ? [center.lat, center.lng] : [31.63, -7.98],
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when businesses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    // Remove previous cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const hasVerified = cluster.getAllChildMarkers().some(
          (m: any) => m.options.isVerified
        );
        const size = count < 10 ? "small" : count < 50 ? "medium" : "large";
        const sizeMap = { small: 36, medium: 44, large: 52 };
        const dim = sizeMap[size];

        return L.divIcon({
          html: `<div style="
            width: ${dim}px; height: ${dim}px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            background: ${hasVerified ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "linear-gradient(135deg, #3b82f6, #2563eb)"};
            color: white; font-weight: 700; font-size: ${size === "large" ? 14 : 12}px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: [dim, dim],
        });
      },
    });

    for (const b of geoBusinesses) {
      const isVerified = b.wtuce_status === "verified";
      const marker = L.marker([b.latitude!, b.longitude!], {
        icon: createMarkerIcon(isVerified),
        isVerified, // custom option for cluster detection
      } as any);

      const subcategory = b.categories?.[0] || b.main_category || "";
      const verifiedBadge = isVerified
        ? `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:9999px;background:#D4AF37;color:white;font-size:10px;font-weight:600;">✓ Vérifié</span>`
        : "";

      marker.bindPopup(
        `<div style="min-width:180px;max-width:240px;font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:start;gap:8px;margin-bottom:6px;">
            ${b.logo_url ? `<img src="${b.logo_url}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'" />` : ""}
            <div>
              <a href="/business/${b.id}" style="font-weight:600;font-size:13px;color:#1a1a1a;text-decoration:none;">${b.name}</a>
              ${verifiedBadge}
            </div>
          </div>
          <div style="font-size:11px;color:#666;space-y:2px;">
            ${subcategory ? `<div style="color:#D4AF37;font-weight:500;margin-bottom:2px;">${subcategory}</div>` : ""}
            <div>📍 ${b.city}${b.neighborhood ? ` · ${b.neighborhood}` : ""}${b.address ? ` — ${b.address}` : ""}</div>
            ${b.phone ? `<div style="margin-top:2px;"><a href="tel:${b.phone}" style="color:#3b82f6;text-decoration:none;">📞 ${b.phone}</a></div>` : ""}
          </div>
          <div style="margin-top:6px;display:flex;gap:6px;">
            <a href="/business/${b.id}" style="font-size:11px;color:#D4AF37;font-weight:500;text-decoration:none;">Voir la fiche →</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}" target="_blank" style="font-size:11px;color:#3b82f6;font-weight:500;text-decoration:none;">Itinéraire →</a>
          </div>
        </div>`,
        { closeButton: true, maxWidth: 260 }
      );

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Fit bounds if there are markers
    if (geoBusinesses.length > 0 && !center) {
      const bounds = L.latLngBounds(
        geoBusinesses.map((b) => [b.latitude!, b.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (center) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [geoBusinesses, isLoading, center, zoom]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Stats bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md border border-border">
        <span className="text-gold font-semibold">{geoBusinesses.length}</span> établissements sur la carte
        {geoBusinesses.filter((b) => b.wtuce_status === "verified").length > 0 && (
          <span className="ml-2">
            · <span className="text-gold">★</span>{" "}
            {geoBusinesses.filter((b) => b.wtuce_status === "verified").length} vérifiés
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-muted-foreground shadow-md border border-border flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#D4AF37" }} />
          Vérifié WTUCE
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3b82f6" }} />
          Standard
        </span>
      </div>

      <div ref={mapContainerRef} style={{ height, width: "100%" }} />

      {/* Global CSS for markers */}
      <style>{`
        .custom-map-marker { background: none !important; border: none !important; }
        .custom-cluster-icon { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; }
        .leaflet-popup-tip { box-shadow: none !important; }
      `}</style>
    </div>
  );
};

export default BusinessMap;
