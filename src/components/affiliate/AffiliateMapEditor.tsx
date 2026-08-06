import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HexColorField from "@/components/affiliate/HexColorField";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Map as MapIcon, Palette, MapPin, Layers } from "lucide-react";
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
  default_poi_is_master: boolean | null;
  kp_regroupement: string | null;
  kp_regroupement_2: string | null;
  kp_active: boolean | null;
  kp_active_2: boolean | null;
  kp_city: string | null;
  kp_city_2: string | null;
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

type KpMember = {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
};

type KpGroup = {
  slot: 1 | 2;
  code: string;
  title: string;
  count: number;
  members: KpMember[];
};

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
  const [kpGroups, setKpGroups] = useState<KpGroup[]>([]);
  const [kpActive, setKpActive] = useState(false);
  const [kpActive2, setKpActive2] = useState(false);
  const [kpCity, setKpCity] = useState<string>("");
  const [kpCity2, setKpCity2] = useState<string>("");
  const [kpView, setKpView] = useState<1 | 2 | null>(null);
  const [poiView, setPoiView] = useState(false);
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "terrain" | "satellite">("terrain");
  const dirtyRef = useRef(false);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      dirtyRef.current = false;
      setKpView(null);
      setPoiView(false);
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,name,city,neighborhood,latitude,longitude,images,poi_radius_km,map_bg_color,default_poi_business_id,kp_regroupement,kp_regroupement_2,kp_active,kp_active_2,kp_city,kp_city_2")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      const b = (data as Biz) ?? null;
      setBiz(b);
      setBg((b?.map_bg_color || "").toUpperCase());
      setDefaultPoiId(b?.default_poi_business_id || "");
      setKpActive(!!b?.kp_active);
      setKpActive2(!!b?.kp_active_2);
      setKpCity(b?.kp_city || "");
      setKpCity2(b?.kp_city_2 || "");

      // Regroupements KP (uniquement si > 1 établissement partage le même code)
      const kp1 = (b?.kp_regroupement || "").trim();
      const kp2 = (b?.kp_regroupement_2 || "").trim();
      const groups: KpGroup[] = [];
      if (kp1 || kp2) {
        const [c1, c2, m1, m2, titlesRes] = await Promise.all([
          kp1
            ? (supabase as any).from("businesses").select("id", { count: "exact", head: true })
                .eq("kp_regroupement", kp1).eq("is_active", true)
            : Promise.resolve({ count: 0 }),
          kp2
            ? (supabase as any).from("businesses").select("id", { count: "exact", head: true })
                .eq("kp_regroupement_2", kp2).eq("is_active", true)
            : Promise.resolve({ count: 0 }),
          kp1
            ? (supabase as any).from("businesses").select("id,name,city,neighborhood,latitude,longitude,images")
                .eq("kp_regroupement", kp1).eq("is_active", true)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [] }),
          kp2
            ? (supabase as any).from("businesses").select("id,name,city,neighborhood,latitude,longitude,images")
                .eq("kp_regroupement_2", kp2).eq("is_active", true)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [] }),
          (supabase as any).from("kp_group_titles").select("kp_code,kp_type,title"),
        ]);
        const titleMap = new Map<string, string>();
        ((titlesRes as any)?.data ?? []).forEach((t: any) =>
          titleMap.set(`${t.kp_type}:${t.kp_code}`, t.title || ""),
        );
        if (kp1 && Number((c1 as any)?.count || 0) > 1) {
          groups.push({
            slot: 1,
            code: kp1,
            title: titleMap.get(`kp1:${kp1}`) || kp1,
            count: Number((c1 as any).count),
            members: ((m1 as any)?.data ?? []) as KpMember[],
          });
        }
        if (kp2 && Number((c2 as any)?.count || 0) > 1) {
          groups.push({
            slot: 2,
            code: kp2,
            title: titleMap.get(`kp2:${kp2}`) || kp2,
            count: Number((c2 as any).count),
            members: ((m2 as any)?.data ?? []) as KpMember[],
          });
        }
      }
      if (!cancelled) setKpGroups(groups);

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
  /** Couleur forcée, sinon null → fond transparent (le widget prend le fond du site hôte). */
  const bgEffective = bgValid ? bg.toUpperCase() : null;
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
          kp_active: kpActive,
          kp_active_2: kpActive2,
          kp_city: kpCity || null,
          kp_city_2: kpCity2 || null,
        })
        .eq("id", businessId);
      setIsSaving(false);
      if (error) { toast.error(error.message); return; }
      setSavedAt(Date.now());
    }, 1000);
    return () => clearTimeout(t);
  }, [bg, bgValid, defaultPoiId, kpActive, kpActive2, kpCity, kpCity2, businessId, isLoading]);


  const nearbyPois = useMemo(() => {
    if (!biz?.latitude || !biz?.longitude) return [];
    return pois.filter(
      (p) => haversineKm(biz.latitude!, biz.longitude!, p.latitude!, p.longitude!) <= radiusKm,
    );
  }, [pois, biz, radiusKm]);

  /** Villes disponibles par regroupement (d'après les membres du groupe). */
  const kpCityOptions = useMemo(() => {
    const map = new Map<1 | 2, string[]>();
    kpGroups.forEach((g) => {
      const set = new Set<string>();
      g.members.forEach((m) => { if (m.city) set.add(m.city); });
      map.set(g.slot, Array.from(set).sort((a, b) => a.localeCompare(b)));
    });
    return map;
  }, [kpGroups]);

  const kpMembers = useMemo(() => {
    if (!kpView) return [];
    const g = kpGroups.find((x) => x.slot === kpView);
    const cityFilter = (kpView === 1 ? kpCity : kpCity2).trim();
    return (g?.members ?? []).filter(
      (m) =>
        m.id !== biz?.id &&
        Number(m.latitude) &&
        Number(m.longitude) &&
        (!cityFilter || (m.city || "") === cityFilter),
    );
  }, [kpView, kpGroups, biz?.id, kpCity, kpCity2]);


  const defaultPoi = useMemo(
    () => pois.find((p) => p.id === defaultPoiId) || null,
    [pois, defaultPoiId],
  );

  const poiDistanceKm = useMemo(() => {
    if (!defaultPoi || !biz?.latitude || !biz?.longitude) return null;
    return haversineKm(biz.latitude, biz.longitude, defaultPoi.latitude!, defaultPoi.longitude!);
  }, [defaultPoi, biz]);

  const fmtDist = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

  const mapItems: PoiMapItem[] = useMemo(() => {
    if (!biz?.latitude || !biz?.longitude) return [];
    const master = {
        id: `self-${biz.id}`,
        name: biz.name,
        latitude: biz.latitude,
        longitude: biz.longitude,
        images: biz.images,
        city: biz.city,
        neighborhood: biz.neighborhood,
        markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
      };
    if (poiView && defaultPoi) {
      return [
        master,
        {
          id: defaultPoi.id,
          name: defaultPoi.name,
          latitude: defaultPoi.latitude,
          longitude: defaultPoi.longitude,
          images: defaultPoi.images,
          city: defaultPoi.city,
          neighborhood: defaultPoi.neighborhood,
        },
      ];
    }
    if (kpView) {
      return [
        master,
        ...kpMembers.map((m) => ({
          id: m.id,
          name: m.name,
          latitude: m.latitude,
          longitude: m.longitude,
          images: m.images,
          city: m.city,
          neighborhood: m.neighborhood,
        })),
      ];
    }
    return [
      master,
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
  }, [biz, nearbyPois, kpView, kpMembers, poiView, defaultPoi]);

  // Flèche rouge animée Master → POI par défaut (mode POI uniquement).
  const connector = useMemo(() => {
    if (!poiView || !defaultPoi || !biz?.latitude || !biz?.longitude) return null;
    return {
      from: { lat: biz.latitude, lng: biz.longitude },
      to: { lat: Number(defaultPoi.latitude), lng: Number(defaultPoi.longitude) },
      label: poiDistanceKm !== null ? fmtDist(poiDistanceKm) : undefined,
    };
  }, [poiView, defaultPoi, biz, poiDistanceKm]);

  // En mode regroupement / POI, on élargit le zoom pour englober tous les marqueurs.
  const fitKm = useMemo(() => {
    if (!biz?.latitude || !biz?.longitude) return radiusKm;
    if (poiView && poiDistanceKm !== null) return Math.max(0.3, poiDistanceKm * 1.6);
    if (!kpView) return radiusKm;
    const max = kpMembers.reduce(
      (acc, m) => Math.max(acc, haversineKm(biz.latitude!, biz.longitude!, m.latitude!, m.longitude!)),
      0,
    );
    return Math.max(1, max * 1.15);
  }, [kpView, kpMembers, biz, radiusKm, poiView, poiDistanceKm]);

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
        <CardContent className="space-y-2">
          <HexColorField value={bg} onChange={setBg} />
          <p className="text-xs text-white/50">
            <span className="text-white/80 font-medium">Vide = fond transparent :</span> le widget prend le fond du site hôte. Format hexadécimal si vous forcez une couleur.
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

      {kpGroups.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Regroupements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpGroups.map((g) => (
              <div
                key={`${g.slot}-${g.code}`}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{g.title}</p>
                    <p className="text-xs text-white/50 font-mono truncate">
                      KP{g.slot} · {g.code} — {g.count} établissements
                    </p>
                  </div>
                  <Switch
                    checked={g.slot === 1 ? kpActive : kpActive2}
                    onCheckedChange={(v) => (g.slot === 1 ? setKpActive(v) : setKpActive2(v))}
                    aria-label={`Activer le regroupement ${g.title}`}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
                  <Label className="text-white/80 text-xs">Limiter à une ville</Label>
                  <Select
                    value={(g.slot === 1 ? kpCity : kpCity2) || "all"}
                    onValueChange={(v) =>
                      g.slot === 1 ? setKpCity(v === "all" ? "" : v) : setKpCity2(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9 text-sm text-white w-56">
                      <SelectValue placeholder="Toutes les villes" />
                    </SelectTrigger>
                    <SelectContent className="z-[90] max-h-72">
                      <SelectItem value="all" className="text-sm">Toutes les villes</SelectItem>
                      {(kpCityOptions.get(g.slot) ?? []).map((c) => (
                        <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {g.members.length > 0 && (
                  <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
                    {g.members.map((m) => {
                      const filter = (g.slot === 1 ? kpCity : kpCity2).trim();
                      const excluded = !!filter && (m.city || "") !== filter;
                      return (
                        <li
                          key={m.id}
                          className={`flex items-center justify-between gap-2 text-xs ${excluded ? "opacity-40" : ""}`}
                        >
                          <span className="text-white/90 truncate" title={m.name}>{m.name}</span>
                          <span className="text-white/50 shrink-0 text-right">
                            {[m.city, m.neighborhood].filter(Boolean).join(" — ") || "Ville non renseignée"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
            <p className="text-xs text-white/50">
              Actif = les établissements du même regroupement sont affichés/épinglés avec votre fiche. Désactivé par défaut.
              Une ville sélectionnée = seuls les marqueurs de cette ville s'affichent dans l'aperçu.
            </p>

          </CardContent>
        </Card>
      )}



      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" /> Aperçu de la carte
            <span className="text-xs font-normal text-white/50">
              {poiView && defaultPoi
                ? `${defaultPoi.name}${poiDistanceKm !== null ? ` — ${fmtDist(poiDistanceKm)}` : ""}`
                : kpView
                  ? `${kpMembers.length + 1} établissement${kpMembers.length ? "s" : ""} du regroupement KP${kpView}`
                  : `${nearbyPois.length} lieu${nearbyPois.length > 1 ? "x" : ""} dans ${radiusKm} km`}
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

          {(kpGroups.length > 0 || defaultPoi) && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setKpView(null); setPoiView(false); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  kpView === null && !poiView
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/15 text-white/70 hover:bg-white/10"
                }`}
              >
                À proximité
              </button>
              {kpGroups.map((g) => (
                <button
                  key={`cta-${g.slot}-${g.code}`}
                  type="button"
                  onClick={() => { setPoiView(false); setKpView(kpView === g.slot ? null : g.slot); }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    kpView === g.slot && !poiView
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/15 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {g.title}
                </button>
              ))}
              {defaultPoi && (
                <button
                  type="button"
                  onClick={() => { setKpView(null); setPoiView((v) => !v); }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    poiView
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/15 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {defaultPoi.name}
                </button>
              )}
            </div>
          )}


          {!biz?.latitude || !biz?.longitude ? (
            <p className="text-sm text-white/50">
              Renseignez les coordonnées GPS (onglet Contact) pour afficher la carte.
            </p>
          ) : (
            <div
              className="relative h-[460px] w-full overflow-hidden rounded-xl border border-white/10"
              style={{ background: bgEffective ?? "transparent" }}
            >
              <PoiGoogleMap
                key={`${bgEffective ?? "transparent"}-${poiView ? "fit-poi" : kpView ? `fit-kp${kpView}-${kpView === 1 ? kpCity : kpCity2}` : "master"}`}
                pois={mapItems}
                selectedPoiId={defaultPoiId || null}
                center={{ lat: biz.latitude, lng: biz.longitude }}
                {...(poiView || kpView
                  ? { fitToMarkers: true, fitPadding: { top: 70, right: 50, bottom: 50, left: 50 } }
                  : { centerAtBottomRatio: 0.4, fitRadiusKm: fitKm })}
                mapTypeId={mapTypeId}
                mapTheme={bgEffective ? "light" : "default-light"}
                baseColor={bgEffective ?? undefined}
                connector={connector}
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
