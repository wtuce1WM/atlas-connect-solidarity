import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, Link2, Hotel, Building2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Mapping {
  id: string;
  liteapi_hotel_id: string;
  business_id: string;
  created_at: string;
  business_name?: string;
  business_city?: string;
}

const HotelMappingManagement = () => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add new mapping form
  const [newHotelId, setNewHotelId] = useState("");
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessResults, setBusinessResults] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [searchingBusiness, setSearchingBusiness] = useState(false);
  const [adding, setAdding] = useState(false);

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

    // Enrich with business names
    if (data && data.length > 0) {
      const bizIds = [...new Set(data.map((m) => m.business_id))];
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, city")
        .in("id", bizIds);

      const bizMap = new Map(businesses?.map((b) => [b.id, b]) || []);
      const enriched = data.map((m) => ({
        ...m,
        business_name: bizMap.get(m.business_id)?.name || "Inconnu",
        business_city: bizMap.get(m.business_id)?.city || undefined,
      }));
      setMappings(enriched);
    } else {
      setMappings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleSearchBusiness = async () => {
    if (!businessSearch.trim()) return;
    setSearchingBusiness(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city")
      .ilike("name", `%${businessSearch.trim()}%`)
      .eq("is_active", true)
      .limit(10);
    setBusinessResults(data || []);
    setSearchingBusiness(false);
  };

  const handleAdd = async (businessId: string) => {
    if (!newHotelId.trim()) {
      toast.error("Veuillez saisir un ID LiteAPI");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("hotel_api_mappings").upsert(
      { liteapi_hotel_id: newHotelId.trim(), business_id: businessId },
      { onConflict: "liteapi_hotel_id" }
    );
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Association créée");
      setNewHotelId("");
      setBusinessSearch("");
      setBusinessResults([]);
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

  const filtered = mappings.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.liteapi_hotel_id.toLowerCase().includes(q) ||
      m.business_name?.toLowerCase().includes(q) ||
      m.business_city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Mapping Hôtels LiteAPI
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Associez les hôtels de l'API LiteAPI à vos établissements internes
          </p>
        </div>
        <Badge variant="secondary">{mappings.length} association{mappings.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Add new mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle association
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Hotel className="h-3.5 w-3.5" />
                ID Hôtel LiteAPI
              </label>
              <Input
                placeholder="ex: lp3e599"
                value={newHotelId}
                onChange={(e) => setNewHotelId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Établissement interne
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher un établissement..."
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchBusiness()}
                />
                <Button size="sm" onClick={handleSearchBusiness} disabled={searchingBusiness}>
                  {searchingBusiness ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          {businessResults.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {businessResults.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => handleAdd(biz.id)}
                  disabled={adding || !newHotelId.trim()}
                  className="w-full text-left p-2.5 hover:bg-accent text-sm flex justify-between items-center disabled:opacity-50"
                >
                  <span className="font-medium">{biz.name}</span>
                  <div className="flex items-center gap-2">
                    {biz.city && <span className="text-xs text-muted-foreground">{biz.city}</span>}
                    <Badge variant="outline" className="text-[10px]">Associer</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search existing */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrer les associations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Hotel className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>{mappings.length === 0 ? "Aucune association configurée" : "Aucun résultat"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0">
                  <Badge variant="outline" className="font-mono text-xs">
                    {m.liteapi_hotel_id}
                  </Badge>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.business_name}</p>
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
    </div>
  );
};

export default HotelMappingManagement;
