import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ServiceFilter {
  id: string;
  keyword: string;
  required_service: string;
  is_active: boolean;
}

const ServiceFilterManagement = () => {
  const [filters, setFilters] = useState<ServiceFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newService, setNewService] = useState("");

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("search_service_filters")
      .select("id, keyword, required_service, is_active")
      .order("keyword");
    setFilters((data as ServiceFilter[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addFilter = async () => {
    if (!newKeyword.trim() || !newService.trim()) return;
    const { error } = await supabase.from("search_service_filters").insert({
      keyword: newKeyword.trim(),
      required_service: newService.trim(),
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewKeyword("");
      setNewService("");
      load();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("search_service_filters").update({ is_active }).eq("id", id);
    setFilters(f => f.map(x => x.id === id ? { ...x, is_active } : x));
  };

  const deleteFilter = async (id: string) => {
    await supabase.from("search_service_filters").delete().eq("id", id);
    setFilters(f => f.filter(x => x.id !== id));
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filtres de services obligatoires
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Quand un mot-clé est détecté dans la recherche, seuls les établissements ayant le service requis seront affichés.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Mot-clé</label>
            <Input
              placeholder="ex: domicile"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Service requis</label>
            <Input
              placeholder="ex: Massage à domicile"
              value={newService}
              onChange={e => setNewService(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={addFilter} disabled={!newKeyword.trim() || !newService.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>

        {/* List */}
        {filters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun filtre configuré</p>
        ) : (
          <div className="space-y-2">
            {filters.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                <Switch checked={f.is_active} onCheckedChange={v => toggleActive(f.id, v)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">"{f.keyword}"</span>
                  <span className="text-xs text-muted-foreground mx-2">→</span>
                  <span className="text-sm text-primary">{f.required_service}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFilter(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceFilterManagement;
