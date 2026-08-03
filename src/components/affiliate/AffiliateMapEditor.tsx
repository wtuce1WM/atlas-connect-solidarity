import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Map as MapIcon, Palette, MapPin } from "lucide-react";
import { toast } from "sonner";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import { haversineKm } from "@/lib/haversine";

interface Props {
  businessId: string;
}

type Biz = {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  poi_radius_km: number | null;
  map_bg_color: string | null;
  default_poi_business_id: string | null;
};

type PoiRow = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  city: string | null;
  neighborhood: string | null;
};

const DEFAULT_BG = "#EFE6D8";
const MAP_TYPES = [
  { id: "roadmap" as const, label: "Plan" },
  { id: "terrain" as const, label: "Relief" },
  { id: "satellite" as const, label: "Satellite" },
];

const AffiliateMapEditor = ({ businessId }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [pois, setPois] = useState<PoiRow[]>([]);
  const [bg, setBg] = useState<string>("");
  const [defaultPoiId, setDefaultPoiId] = useState<string>("");
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "terrain" | "satellite">("terrain");
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      dirtyRef.current = false;
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,name,city,neighborhood,latitude,longitude,images,poi_radius_km,map_bg_color,default_poi_business_id")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      const b = (data as Biz) ?? null;
      setBiz(b);
      setBg((b?.map_bg_color || "").toUpperCase());
      setDefaultPoiId(b?.default_poi_business_id || "");

      if (b?.city) {
        const { data: poiData } = await (supabase as any)
          .from("businesses")
          .select("id,name,latitude,longitude,images,city,neighborhood")
          .eq("is_poi", true)
          .eq("city", b.city)
          .order("name", { ascending: true });
        if (!cancelled) setPois(((poiData as PoiRow[]) ?? []).filter((p) => p.latitude && p.longitude));
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const bgValid = /^#[0-9A-F]{6}$/i.test(bg);
  const radiusKm = Number(biz?.poi_radius_km) > 0 ? Number(biz!.poi_radius_km) : 10;

  // Auto-save (debounce 1s)
  useEffect(() => {
    if (isLoading) return;
    if (!dirtyRef.current) { dirtyRef.current = true; return; }
    const t = setTimeout(async () => {
      setIsSaving(true);
      const { error } = await (supabase as any)
        .from("businesses")
        .update({
          map_bg_color: bgValid ? bg.toUpperCase() : null,
          default_poi_business_id: defaultPoiId || null,
        })
        .eq("id", businessId);
      setIsSaving(false);
      if (error) { toast.error(error.message); return; }
      setSavedAt(Date.now());
    }, 1000);
    return () => clearTimeout(t);
  }, [bg, bgValid, defaultPoiId, businessId, isLoading]);

  const nearbyPois = useMemo(() => {
    if (!biz?.latitude || !biz?.longitude) return [];
    return pois.filter(
      (p) => haversineKm(biz.latitude!, biz.longitude!, p.latitude!, p.longitude!) <= radiusKm,
    );
  }, [pois, biz, radiusKm]);

  const mapItems: PoiMapItem[] = useMemo(() => {
    if (!biz?.latitude || !biz?.longitude) return [];
    return [
      {
        id: `self-${biz.id}`,
        name: biz.name,
        latitude: biz.latitude,
        longitude: biz.longitude,
        images: biz.images,
        city: biz.city,
        neighborhood: biz.neighborhood,
        markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
      },
      ...nearbyPois.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        images: p.images,
        city: p.city,
        neighborhood: p.neighborhood,
      })),
    ];
  }, [biz, nearbyPois]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-primary" /> Map
          </h3>
          <p className="text-sm text-white/60 max-w-2xl">
            Réglez la couleur de fond de votre carte et le lieu d'intérêt affiché par défaut.
            L'aperçu reprend exactement la carte de l'overlay « À proximité » : votre établissement
            reste fixé à 40 % du bas, le rayon utilisé est celui de l'onglet Tools ({radiusKm} km).
            Enregistrement automatique.
          </p>
        </div>
        <span className="text-xs text-white/50 inline-flex items-center gap-1.5 shrink-0">
          {isSaving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
          ) : savedAt ? (
            <><Check className="h-3.5 w-3.5 text-emerald-400" /> Enregistré</>
          ) : null}
        </span>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Couleur de fond de la carte
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={bgValid ? bg : DEFAULT_BG}
            onChange={(e) => setBg(e.target.value.toUpperCase())}
            className="h-9 w-10 rounded-md bg-white/10 border border-white/20 p-1 cursor-pointer"
            aria-label="Couleur de fond de la carte"
          />
          <input
            type="text"
            placeholder={DEFAULT_BG}
            value={bg}
            onChange={(e) => setBg(e.target.value.toUpperCase())}
            className="w-32 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
          />
          {bg && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBg("")}
              className="text-white border-white/20 hover:bg-white/10 hover:text-white"
            >
              Défaut
            </Button>
          )}
          <p className="text-xs text-white/50 w-full">
            Format hexadécimal (ex. {DEFAULT_BG}). Vide = palette 1WM par défaut.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Lieu d'intérêt par défaut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pois.length === 0 ? (
            <p className="text-sm text-white/50">
              Aucun lieu d'intérêt disponible pour {biz?.city || "cette ville"}.
            </p>
          ) : (
            <>
              <Label className="text-white/80 text-xs">Lieu d'intérêt de {biz?.city}</Label>
              <Select value={defaultPoiId || "none"} onValueChange={(v) => setDefaultPoiId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-10 text-sm text-white max-w-md">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="z-[90] max-h-72">
                  <SelectItem value="none" className="text-sm">Aucun</SelectItem>
                  {pois.map((p) => {
                    const d = biz?.latitude && biz?.longitude
                      ? haversineKm(biz.latitude, biz.longitude, p.latitude!, p.longitude!)
                      : null;
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.name}{d !== null ? ` — ${d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" /> Aperçu de la carte
            <span className="text-xs font-normal text-white/50">
              {nearbyPois.length} lieu{nearbyPois.length > 1 ? "x" : ""} dans {radiusKm} km
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
            {MAP_TYPES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMapTypeId(m.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  mapTypeId === m.id ? "bg-primary text-primary-foreground" : "text-white/70 hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {!biz?.latitude || !biz?.longitude ? (
            <p className="text-sm text-white/50">
              Renseignez les coordonnées GPS (onglet Contact) pour afficher la carte.
            </p>
          ) : (
            <div className="relative h-[460px] w-full overflow-hidden rounded-xl border border-white/10">
              <PoiGoogleMap
                pois={mapItems}
                selectedPoiId={defaultPoiId || null}
                center={{ lat: biz.latitude, lng: biz.longitude }}
                centerAtBottomRatio={0.4}
                fitRadiusKm={radiusKm}
                mapTypeId={mapTypeId}
                mapTheme={bgValid ? "light" : "default-light"}
                baseColor={bgValid ? bg : null}
                onPoiClick={(id) => setDefaultPoiId(id.startsWith("self-") ? "" : id)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateMapEditor;
