import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Trash2, Link2, Hotel, Building2, MapPin, Star, Image as ImageIcon, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Mapping {
  id: string;
  liteapi_hotel_id: string;
  business_id: string;
  created_at: string;
  business_name?: string;
  business_city?: string;
  business_image?: string | null;
  liteapi_name?: string;
  liteapi_photo?: string | null;
}

interface LiteApiHotel {
  hotelId: string;
  name: string;
  address: string;
  city: string;
  starRating: number | null;
  mainPhoto: string | null;
  latitude: number | null;
  longitude: number | null;
}

const CITIES = [
  { code: "Marrakech", label: "Marrakech" },
  { code: "Casablanca", label: "Casablanca" },
  { code: "Fez", label: "Fès" },
  { code: "Tangier", label: "Tanger" },
  { code: "Agadir", label: "Agadir" },
  { code: "Essaouira", label: "Essaouira" },
  { code: "Rabat", label: "Rabat" },
  { code: "Ouarzazate", label: "Ouarzazate" },
];

const HotelMappingManagement = () => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // LiteAPI browser
  const [selectedCity, setSelectedCity] = useState("");
  const [liteApiHotels, setLiteApiHotels] = useState<LiteApiHotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [hotelFilter, setHotelFilter] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<LiteApiHotel | null>(null);

  // Business search for association (auto-complete like KnowledgeBase)
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOptions, setBusinessOptions] = useState<{ id: string; name: string; city: string | null; is_active: boolean }[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Auto-complete business search (debounced)
  useEffect(() => {
    if (businessSearch.length < 2) { setBusinessOptions([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, is_active")
        .ilike("name", `%${businessSearch}%`)
        .limit(8);
      setBusinessOptions(data || []);
      setShowBusinessDropdown(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [businessSearch]);

  const fetchMappings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hotel_api_mappings")
      .select("id, liteapi_hotel_id, business_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des mappings");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const bizIds = [...new Set(data.map((m) => m.business_id))];
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, city, logo_url, images")
        .in("id", bizIds);

      const bizMap = new Map(businesses?.map((b) => [b.id, b]) || []);

      // Fetch LiteAPI hotel details for all mapped hotel IDs
      const hotelIds = [...new Set(data.map((m) => m.liteapi_hotel_id))];
      let liteApiMap: Record<string, { name: string; mainPhoto: string | null }> = {};
      try {
        const { data: liteData } = await supabase.functions.invoke("liteapi-hotel-lookup", {
          body: { hotelIds },
        });
        if (liteData?.data) {
          for (const h of liteData.data) {
            liteApiMap[h.hotelId] = { name: h.name, mainPhoto: h.mainPhoto };
          }
        }
      } catch {
        // Silently fail - we'll show IDs without names
      }

      const enriched = data.map((m) => {
        const biz = bizMap.get(m.business_id);
        const bizImage = biz?.logo_url || (biz?.images && biz.images.length > 0 ? biz.images[0] : null);
        const liteInfo = liteApiMap[m.liteapi_hotel_id];
        return {
          ...m,
          business_name: biz?.name || "Inconnu",
          business_city: biz?.city || undefined,
          business_image: bizImage || null,
          liteapi_name: liteInfo?.name || undefined,
          liteapi_photo: liteInfo?.mainPhoto || null,
        };
      });
      setMappings(enriched);
    } else {
      setMappings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleFetchLiteApiHotels = async () => {
    if (!selectedCity) return;
    setLoadingHotels(true);
    setLiteApiHotels([]);
    setSelectedHotel(null);

    try {
      const { data, error } = await supabase.functions.invoke("liteapi-hotel-lookup", {
        body: { cityName: selectedCity },
      });

      if (error) throw error;
      setLiteApiHotels(data?.data || []);
      if ((data?.data || []).length === 0) {
        toast.info("Aucun hôtel trouvé pour cette ville");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la recherche LiteAPI");
    } finally {
      setLoadingHotels(false);
    }
  };


  const handleAdd = async () => {
    if (!selectedHotel || !selectedBusinessId) {
      toast.error("Veuillez sélectionner un hôtel et un établissement");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("hotel_api_mappings").upsert(
      { liteapi_hotel_id: selectedHotel.hotelId, business_id: selectedBusinessId },
      { onConflict: "liteapi_hotel_id" }
    );
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Association créée: ${selectedHotel.name} → ${businessSearch}`);
      setSelectedHotel(null);
      setBusinessSearch("");
      setSelectedBusinessId(null);
      setBusinessOptions([]);
      fetchMappings();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette association ?")) return;
    const { error } = await supabase.from("hotel_api_mappings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Association supprimée");
      setMappings((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const filteredHotels = liteApiHotels.filter((h) => {
    if (!hotelFilter) return true;
    const q = hotelFilter.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q);
  });

  const filteredMappings = mappings.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.liteapi_hotel_id.toLowerCase().includes(q) ||
      m.business_name?.toLowerCase().includes(q) ||
      m.business_city?.toLowerCase().includes(q)
    );
  });

  // Check if a hotel is already mapped
  const mappedHotelIds = new Set(mappings.map((m) => m.liteapi_hotel_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Mapping Hôtels LiteAPI
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Parcourez les hôtels LiteAPI puis associez-les à vos établissements
          </p>
        </div>
        <Badge variant="secondary">{mappings.length} association{mappings.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Step 1: Browse LiteAPI Hotels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            1. Parcourir les hôtels LiteAPI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choisir une ville" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleFetchLiteApiHotels} disabled={!selectedCity || loadingHotels}>
              {loadingHotels ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Charger les hôtels
            </Button>
          </div>

          {liteApiHotels.length > 0 && (
            <>
              <Input
                placeholder="Filtrer par nom ou adresse..."
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="max-w-md"
              />
              <p className="text-xs text-muted-foreground">{filteredHotels.length} hôtel(s) — cliquez pour sélectionner</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredHotels.map((hotel) => {
                  const isMapped = mappedHotelIds.has(hotel.hotelId);
                  const isSelected = selectedHotel?.hotelId === hotel.hotelId;

                  return (
                    <button
                      key={hotel.hotelId}
                      onClick={() => setSelectedHotel(isSelected ? null : hotel)}
                      className={`text-left border rounded-lg overflow-hidden transition-all ${
                        isSelected
                          ? "ring-2 ring-primary border-primary"
                          : isMapped
                          ? "opacity-50 border-green-300 bg-green-50 dark:bg-green-950/20"
                          : "hover:shadow-md hover:border-primary/50"
                      }`}
                    >
                      {/* Photo */}
                      <div className="h-28 bg-muted relative overflow-hidden">
                        {hotel.mainPhoto ? (
                          <img
                            src={hotel.mainPhoto}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {isMapped && (
                          <Badge className="absolute top-1 right-1 text-[10px] bg-green-600">Déjà associé</Badge>
                        )}
                        {isSelected && (
                          <Badge className="absolute top-1 right-1 text-[10px] bg-primary">Sélectionné</Badge>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5 space-y-1">
                        <p className="font-medium text-sm leading-tight truncate">{hotel.name}</p>
                        {hotel.starRating && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: hotel.starRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        )}
                        {hotel.address && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{hotel.address}</span>
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground">ID: {hotel.hotelId}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Associate with internal business */}
      {selectedHotel && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              2. Associer « {selectedHotel.name} » à un établissement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
              {selectedHotel.mainPhoto && (
                <img src={selectedHotel.mainPhoto} alt="" className="h-12 w-16 object-cover rounded" />
              )}
              <div>
                <p className="font-medium text-sm">{selectedHotel.name}</p>
                <p className="text-xs text-muted-foreground">{selectedHotel.address}</p>
                <p className="text-[10px] font-mono text-muted-foreground">ID: {selectedHotel.hotelId}</p>
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Établissement interne</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Rechercher un établissement…"
                    value={businessSearch}
                    onChange={(e) => { setBusinessSearch(e.target.value); setSelectedBusinessId(null); }}
                    onFocus={() => businessOptions.length > 0 && setShowBusinessDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBusinessDropdown(false), 200)}
                  />
                  {showBusinessDropdown && businessOptions.length > 0 && (
                    <div className="absolute z-50 bg-popover border rounded-md shadow-md w-full mt-1 max-h-48 overflow-y-auto">
                      {businessOptions.map((b) => (
                        <button
                          key={b.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedBusinessId(b.id);
                            setBusinessSearch(b.name);
                            setShowBusinessDropdown(false);
                          }}
                        >
                          {b.name} {b.city && <span className="text-muted-foreground">— {b.city}</span>}
                          {!b.is_active && <span className="text-destructive ml-1 text-xs">(inactif)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedBusinessId && (
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedBusinessId(null); setBusinessSearch(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedBusinessId && <p className="text-xs text-green-600 mt-1">✓ Lié à : {businessSearch}</p>}
            </div>
            {selectedBusinessId && (
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Créer l'association
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing associations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Associations existantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer les associations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hotel className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>{mappings.length === 0 ? "Aucune association configurée" : "Aucun résultat"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMappings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* LiteAPI hotel thumbnail */}
                    <div className="shrink-0">
                      <button
                        onClick={() => m.liteapi_photo && setLightboxImage(m.liteapi_photo)}
                        className="relative group h-12 w-16 rounded overflow-hidden bg-muted border cursor-pointer"
                        disabled={!m.liteapi_photo}
                      >
                        {m.liteapi_photo ? (
                          <>
                            <img src={m.liteapi_photo} alt={m.liteapi_name || m.liteapi_hotel_id} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Hotel className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </button>
                    </div>
                    <div className="min-w-0 shrink-0">
                      <p className="font-medium text-sm truncate max-w-[140px]">{m.liteapi_name || m.liteapi_hotel_id}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{m.liteapi_hotel_id}</p>
                    </div>

                    <span className="text-muted-foreground shrink-0">→</span>

                    {/* Business thumbnail */}
                    <div className="shrink-0">
                      <button
                        onClick={() => m.business_image && setLightboxImage(m.business_image)}
                        className="relative group h-12 w-16 rounded overflow-hidden bg-muted border cursor-pointer"
                        disabled={!m.business_image}
                      >
                        {m.business_image ? (
                          <>
                            <img src={m.business_image} alt={m.business_name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </button>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.business_name}</p>
                      {m.business_city && (
                        <p className="text-xs text-muted-foreground">{m.business_city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {new Date(m.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightboxImage && (
            <img src={lightboxImage} alt="Vue agrandie" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelMappingManagement;
