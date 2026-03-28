import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Hotel, UtensilsCrossed } from "lucide-react";

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

interface PriceRow {
  name: string;
  city: string;
  liteapi_price: number | null;
  serpapi_price: number | null;
  liteapi_currency: string | null;
  serpapi_currency: string | null;
}

const PricingManagement = () => {
  const [loading, setLoading] = useState(true);
  const [hotelPrices, setHotelPrices] = useState<PriceRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Get all price cache entries
      const { data: cache } = await supabase
        .from("hotel_price_cache")
        .select("business_id, price_per_night, currency, source");

      // Get business names + cities for those
      const ids = [...new Set((cache || []).map((r) => r.business_id))];
      if (ids.length === 0) { setLoading(false); return; }

      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, city")
        .in("id", ids);

      const bizMap = Object.fromEntries((businesses || []).map((b) => [b.id, b]));

      // Group by business_id
      const grouped: Record<string, PriceRow> = {};
      for (const row of cache || []) {
        const biz = bizMap[row.business_id];
        if (!biz) continue;
        if (!grouped[row.business_id]) {
          grouped[row.business_id] = {
            name: biz.name,
            city: biz.city || "—",
            liteapi_price: null,
            serpapi_price: null,
            liteapi_currency: null,
            serpapi_currency: null,
          };
        }
        if (row.source === "liteapi") {
          grouped[row.business_id].liteapi_price = row.price_per_night;
          grouped[row.business_id].liteapi_currency = row.currency;
        } else if (row.source === "serpapi") {
          grouped[row.business_id].serpapi_price = row.price_per_night;
          grouped[row.business_id].serpapi_currency = row.currency;
        }
      }

      // Sort by lowest price first
      const sorted = Object.values(grouped).sort((a, b) => {
        const minA = Math.min(a.liteapi_price ?? Infinity, a.serpapi_price ?? Infinity);
        const minB = Math.min(b.liteapi_price ?? Infinity, b.serpapi_price ?? Infinity);
        return minA - minB;
      });

      setHotelPrices(sorted);
      setLoading(false);
    };
    fetch();
  }, []);

  // Group by city
  const citiesMap: Record<string, PriceRow[]> = {};
  for (const row of hotelPrices) {
    if (!citiesMap[row.city]) citiesMap[row.city] = [];
    citiesMap[row.city].push(row);
  }
  const sortedCities = Object.keys(citiesMap).sort();

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{hotelPrices.length} hôtels avec prix</span>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Établissement</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                            LiteAPI
                          </span>
                        </th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                            SerpAPI
                          </span>
                        </th>
                        <th className="text-center py-2 pl-4 font-medium text-muted-foreground">Gamme de prix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {citiesMap[city].map((row, i) => {
                        const minPrice = Math.min(row.liteapi_price ?? Infinity, row.serpapi_price ?? Infinity);
                        return (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="py-2 pr-4 font-medium">{row.name}</td>
                            <td className="py-2 px-4 text-right">
                              {row.liteapi_price != null ? (
                                <span className={`font-mono ${row.liteapi_price === minPrice ? "font-bold text-violet-700" : "text-muted-foreground"}`}>
                                  {row.liteapi_price.toFixed(0)} {row.liteapi_currency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="py-2 pl-4 text-right">
                              {row.serpapi_price != null ? (
                                <span className={`font-mono ${row.serpapi_price === minPrice ? "font-bold text-teal-700" : "text-muted-foreground"}`}>
                                  {row.serpapi_price.toFixed(0)} {row.serpapi_currency}
                                </span>
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
