import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Hotel, UtensilsCrossed, Check } from "lucide-react";
import { toast } from "sonner";

const PRICE_RANGES = [
  { label: "- 50€", min: 0, max: 50, color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { label: "50 à 100€", min: 50, max: 100, color: "bg-blue-100 text-blue-700 border-blue-300" },
  { label: "100 à 200€", min: 100, max: 200, color: "bg-amber-100 text-amber-700 border-amber-300" },
  { label: "200 à 500€", min: 200, max: 500, color: "bg-orange-100 text-orange-700 border-orange-300" },
  { label: "500 à 1000€", min: 500, max: 1000, color: "bg-rose-100 text-rose-700 border-rose-300" },
  { label: "+1000€", min: 1000, max: Infinity, color: "bg-purple-100 text-purple-700 border-purple-300" },
];

const getPriceRange = (price: number | null) => {
  if (price == null) return null;
  return PRICE_RANGES.find((r) => price >= r.min && price < r.max) || PRICE_RANGES[PRICE_RANGES.length - 1];
};

const getPriceRangeByLabel = (label: string | null) => {
  if (!label) return null;
  return PRICE_RANGES.find((r) => r.label === label) || null;
};

interface PriceRow {
  id: string;
  name: string;
  city: string;
  liteapi_price: number | null;
  serpapi_price: number | null;
  liteapi_currency: string | null;
  serpapi_currency: string | null;
  manual_price_range: string | null;
  min_price: number | null;
  hasApiPrice: boolean;
}

const MinPriceCell = ({ row, onSave }: { row: PriceRow; onSave: (id: string, value: number | null) => void }) => {
  const computedMin = Math.min(row.liteapi_price ?? Infinity, row.serpapi_price ?? Infinity);
  const hasComputed = computedMin !== Infinity;
  const displayValue = row.min_price ?? (hasComputed ? computedMin : null);
  const isFromApi = !row.min_price && hasComputed;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onSave(row.id, null);
    } else {
      const num = parseFloat(trimmed);
      if (isNaN(num) || num < 0) {
        toast.error("Prix invalide");
        return;
      }
      onSave(row.id, Math.round(num));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <Input
          type="number"
          min={0}
          className="h-7 w-20 text-xs text-right"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
        />
        <button onClick={handleSave} className="p-1 rounded hover:bg-muted">
          <Check className="h-3.5 w-3.5 text-green-600" />
        </button>
      </div>
    );
  }

  return (
    <span
      className={`font-mono cursor-pointer hover:underline ${isFromApi ? "text-muted-foreground italic" : row.min_price != null ? "font-bold text-foreground" : "text-muted-foreground/40"}`}
      onClick={() => { setDraft(displayValue != null ? String(displayValue) : ""); setEditing(true); }}
      title={isFromApi ? "Calculé depuis API (cliquer pour modifier)" : "Cliquer pour modifier"}
    >
      {displayValue != null ? `${displayValue}€` : "—"}
    </span>
  );
};

const PricingManagement = () => {
  const [loading, setLoading] = useState(true);
  const [hotelPrices, setHotelPrices] = useState<PriceRow[]>([]);
  const [noPriceHotels, setNoPriceHotels] = useState<PriceRow[]>([]);
  const [unmappedHotels, setUnmappedHotels] = useState<PriceRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: cache } = await supabase
      .from("hotel_price_cache")
      .select("business_id, price_per_night, currency, source");

    const priceBusinessIds = new Set((cache || []).filter(r => r.price_per_night != null).map((r) => r.business_id));

    const [{ data: liteMap }, { data: serpMap }] = await Promise.all([
      supabase.from("hotel_api_mappings").select("business_id"),
      supabase.from("hotel_mappings").select("business_id"),
    ]);

    const allMappedIds = [...new Set([
      ...(liteMap || []).map(r => r.business_id),
      ...(serpMap || []).map(r => r.business_id),
    ])];

    // Fetch all hotel-category businesses for unmapped section
    const { data: allHotels } = await supabase
      .from("businesses")
      .select("id, name, city, manual_price_range, min_price")
      .eq("is_active", true)
      .or("main_category.ilike.%hôtel%,main_category.ilike.%hotel%,main_category.ilike.%hébergement%,main_category.ilike.%riad%");

    const { data: businesses } = allMappedIds.length > 0
      ? await supabase
          .from("businesses")
          .select("id, name, city, manual_price_range, min_price")
          .in("id", allMappedIds)
      : { data: [] };

    const bizMap = Object.fromEntries((businesses || []).map((b) => [b.id, b]));
    const mappedIdSet = new Set(allMappedIds);

    const grouped: Record<string, PriceRow> = {};
    for (const row of cache || []) {
      const biz = bizMap[row.business_id];
      if (!biz) continue;
      if (!grouped[row.business_id]) {
        grouped[row.business_id] = {
          id: row.business_id,
          name: biz.name,
          city: biz.city || "—",
          liteapi_price: null,
          serpapi_price: null,
          liteapi_currency: null,
          serpapi_currency: null,
          manual_price_range: biz.manual_price_range,
          min_price: (biz as any).min_price ?? null,
          hasApiPrice: false,
        };
      }
      if (row.source === "liteapi" && row.price_per_night != null) {
        grouped[row.business_id].liteapi_price = row.price_per_night;
        grouped[row.business_id].liteapi_currency = row.currency;
        grouped[row.business_id].hasApiPrice = true;
      } else if (row.source === "serpapi" && row.price_per_night != null) {
        grouped[row.business_id].serpapi_price = row.price_per_night;
        grouped[row.business_id].serpapi_currency = row.currency;
        grouped[row.business_id].hasApiPrice = true;
      }
    }

    const withPrices = Object.values(grouped).filter(r => r.hasApiPrice).sort((a, b) => {
      const minA = Math.min(a.liteapi_price ?? Infinity, a.serpapi_price ?? Infinity);
      const minB = Math.min(b.liteapi_price ?? Infinity, b.serpapi_price ?? Infinity);
      return minA - minB;
    });

    const withoutPrices: PriceRow[] = allMappedIds
      .filter(id => !priceBusinessIds.has(id) && bizMap[id])
      .map(id => {
        const biz = bizMap[id];
        return {
          id,
          name: biz.name,
          city: biz.city || "—",
          liteapi_price: null,
          serpapi_price: null,
          liteapi_currency: null,
          serpapi_currency: null,
          manual_price_range: biz.manual_price_range,
          min_price: (biz as any).min_price ?? null,
          hasApiPrice: false,
        };
      })
      .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

    // Unmapped hotels: hotels not in any mapping table
    const unmapped: PriceRow[] = (allHotels || [])
      .filter(h => !mappedIdSet.has(h.id))
      .map(h => ({
        id: h.id,
        name: h.name,
        city: h.city || "—",
        liteapi_price: null,
        serpapi_price: null,
        liteapi_currency: null,
        serpapi_currency: null,
        manual_price_range: h.manual_price_range,
        min_price: (h as any).min_price ?? null,
        hasApiPrice: false,
      }))
      .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

    setHotelPrices(withPrices);
    setNoPriceHotels(withoutPrices);
    setUnmappedHotels(unmapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleManualRangeChange = async (businessId: string, value: string) => {
    const rangeValue = value === "__clear__" ? null : value;
    const { error } = await supabase
      .from("businesses")
      .update({ manual_price_range: rangeValue } as any)
      .eq("id", businessId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success("Gamme de prix mise à jour");

    const updater = (rows: PriceRow[]) =>
      rows.map(r => r.id === businessId ? { ...r, manual_price_range: rangeValue } : r);
    setHotelPrices(updater);
    setNoPriceHotels(updater);
    setUnmappedHotels(updater);
  };

  const handleMinPriceSave = async (businessId: string, value: number | null) => {
    const { data, error } = await supabase.functions.invoke("update-business-min-price", {
      body: {
        businessId,
        minPrice: value,
      },
    });

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    if (!data?.success) {
      toast.error(data?.error || "Sauvegarde refusée");
      return;
    }

    const savedMinPrice = data.min_price ?? value;
    toast.success("Prix minimum mis à jour");

    const updater = (rows: PriceRow[]) =>
      rows.map(r => r.id === businessId ? { ...r, min_price: savedMinPrice } : r);
    setHotelPrices(updater);
    setNoPriceHotels(updater);
    setUnmappedHotels(updater);
  };

  const groupByCity = (rows: PriceRow[]) => {
    const map: Record<string, PriceRow[]> = {};
    for (const row of rows) {
      if (!map[row.city]) map[row.city] = [];
      map[row.city].push(row);
    }
    return map;
  };

  const citiesMap = groupByCity(hotelPrices);
  const sortedCities = Object.keys(citiesMap).sort();
  const noPriceCitiesMap = groupByCity(noPriceHotels);
  const noPriceSortedCities = Object.keys(noPriceCitiesMap).sort();
  const unmappedCitiesMap = groupByCity(unmappedHotels);
  const unmappedSortedCities = Object.keys(unmappedCitiesMap).sort();

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const PriceRangeSelect = ({ row }: { row: PriceRow }) => {
    const currentRange = row.manual_price_range;
    return (
      <Select
        value={currentRange || "__none__"}
        onValueChange={(v) => handleManualRangeChange(row.id, v === "__none__" ? "__clear__" : v)}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue>
            {currentRange ? (
              <Badge variant="outline" className={`${getPriceRangeByLabel(currentRange)?.color || ""} text-xs`}>
                {currentRange}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Choisir…</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">Aucune</span>
          </SelectItem>
          {PRICE_RANGES.map((r) => (
            <SelectItem key={r.label} value={r.label}>
              <Badge variant="outline" className={`${r.color} text-xs`}>{r.label}</Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Tabs defaultValue="hotels">
      <TabsList className="mb-4">
        <TabsTrigger value="hotels" className="gap-2">
          <Hotel className="h-4 w-4" />
          Hôtels
        </TabsTrigger>
        <TabsTrigger value="restaurants" className="gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          Restaurants
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hotels">
        <div className="space-y-6">
          {/* === HÔTELS MAPPÉS === */}
          <h3 className="text-lg font-semibold text-foreground border-b pb-2">Hôtels mappés</h3>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{hotelPrices.length} hôtels avec prix API</span>
            <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-300">LiteAPI</Badge>
            <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal-300">SerpAPI</Badge>
          </div>

          {sortedCities.map((city) => (
            <Card key={city}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{city} ({citiesMap[city].length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-[40%]">Établissement</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[15%]">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                            LiteAPI
                          </span>
                        </th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[15%]">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                            SerpAPI
                          </span>
                        </th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[15%]">Prix minimum</th>
                        <th className="text-center py-2 pl-4 font-medium text-muted-foreground w-[15%]">Gamme de prix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {citiesMap[city].map((row) => {
                        const minPrice = Math.min(row.liteapi_price ?? Infinity, row.serpapi_price ?? Infinity);
                        const autoRange = getPriceRange(minPrice === Infinity ? null : minPrice);
                        return (
                          <tr key={row.id} className="hover:bg-muted/50">
                            <td className="py-2 pr-4 font-medium truncate">{row.name}</td>
                            <td className="py-2 px-4 text-right">
                              {row.liteapi_price != null ? (
                                <span className={`font-mono ${row.liteapi_price === minPrice ? "font-bold text-violet-700" : "text-muted-foreground"}`}>
                                  {row.liteapi_price.toFixed(0)} {row.liteapi_currency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {row.serpapi_price != null ? (
                                <span className={`font-mono ${row.serpapi_price === minPrice ? "font-bold text-teal-700" : "text-muted-foreground"}`}>
                                  {row.serpapi_price.toFixed(0)} {row.serpapi_currency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <MinPriceCell row={row} onSave={handleMinPriceSave} />
                            </td>
                            <td className="py-2 pl-4 text-center">
                              {autoRange ? (
                                <Badge variant="outline" className={`${autoRange.color} text-xs`}>{autoRange.label}</Badge>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Hotels mapped but without prices */}
          {noPriceHotels.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-4">
                <span>{noPriceHotels.length} hôtels mappés sans prix API</span>
                <span>— assignez un prix minimum ou une gamme manuellement</span>
              </div>

              {noPriceSortedCities.map((city) => (
                <Card key={`no-price-${city}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{city} ({noPriceCitiesMap[city].length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-[60%]">Établissement</th>
                            <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[20%]">Prix minimum</th>
                            <th className="text-center py-2 pl-4 font-medium text-muted-foreground w-[20%]">Gamme de prix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {noPriceCitiesMap[city].map((row) => (
                            <tr key={row.id} className="hover:bg-muted/50">
                              <td className="py-2 pr-4 font-medium truncate">{row.name}</td>
                              <td className="py-2 px-4">
                                <div className="flex justify-end">
                                  <MinPriceCell row={row} onSave={handleMinPriceSave} />
                                </div>
                              </td>
                              <td className="py-2 pl-4">
                                <div className="flex justify-center">
                                  <PriceRangeSelect row={row} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* === HÔTELS NON MAPPÉS === */}
          {unmappedHotels.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-foreground border-b pb-2 mt-8">Hôtels non mappés</h3>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{unmappedHotels.length} hôtels</span>
                <span>— aucun lien API (LiteAPI / SerpAPI)</span>
              </div>

              {unmappedSortedCities.map((city) => (
                <Card key={`unmapped-${city}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{city} ({unmappedCitiesMap[city].length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-[60%]">Établissement</th>
                            <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[20%]">Prix minimum</th>
                            <th className="text-center py-2 pl-4 font-medium text-muted-foreground w-[20%]">Gamme de prix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {unmappedCitiesMap[city].map((row) => (
                            <tr key={row.id} className="hover:bg-muted/50">
                              <td className="py-2 pr-4 font-medium truncate">{row.name}</td>
                              <td className="py-2 px-4">
                                <div className="flex justify-end">
                                  <MinPriceCell row={row} onSave={handleMinPriceSave} />
                                </div>
                              </td>
                              <td className="py-2 pl-4">
                                <div className="flex justify-center">
                                  <PriceRangeSelect row={row} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="restaurants">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>Aucune donnée de prix pour les restaurants pour le moment.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PricingManagement;
